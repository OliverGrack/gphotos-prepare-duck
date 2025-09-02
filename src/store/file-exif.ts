import { parseMetadata } from "@uswriting/exiftool";
import exifr from "exifr";
import MediaInfoFactory from "mediainfo.js";
import * as MP4Box from "mp4box";
import { nameAndExtension } from "./file-meta-naming";
import { LogFunction } from "./prep-store";
import { FileOfFolder, fileOfFolderIdentifier } from "./types";

// extensions taken from ente.io source code:
// https://github.com/ente-io/ente/blob/main/web/packages/media/live-photo.ts
const imageExtensions = [
	"heic",
	"heif",
	"jpeg",
	"jpg",
	"png",
	"gif",
	"bmp",
	"tiff",
	"webp",
];
const videoExtensions = [
	"mov",
	"mp4",
	"m4v",
	"avi",
	"wmv",
	"flv",
	"mkv",
	"webm",
	"3gp",
	"3g2",
	"avi",
	"ogv",
	"mpg",
	"mp",
];

export function fileTypeFromName(name: string): "image" | "video" | "other" {
	const ext = nameAndExtension(name)[1]?.toLocaleLowerCase();
	if (ext) {
		if (imageExtensions.includes(ext)) {
			return "image";
		} else if (videoExtensions.includes(ext)) {
			return "video";
		}
	}
	return "other";
}

const mediaInfo = await MediaInfoFactory({
	format: "object",
	locateFile: (path: string, prefix: string) => {
		if (path.endsWith(".wasm")) {
			// tell it to load from the root where viteStaticCopy placed it
			return "/" + path;
		}
		return prefix + path;
	},
});

async function getExifrCreationDate(fileObject: File): Promise<Date | null> {
	// Use exifr for images
	const metadata = await exifr.parse(fileObject);
	// console.log("Image metadata:", metadata);

	if (metadata && metadata.CreateDate instanceof Date) {
		return metadata.CreateDate;
	}
	return null;
}

async function getMediaInfoCreationDate(
	file: FileOfFolder,
	fileObject: File,
): Promise<Date | null> {
	try {
		const result = await mediaInfo.analyzeData(
			() => fileObject.size,
			async (chunkSize, offset) => {
				const chunk = fileObject.slice(offset, offset + chunkSize);
				return new Uint8Array(await chunk.arrayBuffer());
			},
		);

		const tracks = result.media?.track ?? [];

		// general track - encoded date
		const general = tracks.find((t) => t["@type"] === "General");
		if (general?.Encoded_Date) {
			const dateStr = general.Encoded_Date.replace(/^UTC\s*/, "");
			const date = new Date(dateStr);
			if (!isNaN(date.getTime())) return date;
		}

		// general track - tagged date
		if (general?.Tagged_Date) {
			const dateStr = general.Tagged_Date.replace(/^UTC\s*/, "");
			const date = new Date(dateStr);
			if (!isNaN(date.getTime())) return date;
		}

		// quick time - not working?
		// const qtTrack = tracks.find((t) => {
		// 	t["@type"] === "Other" &&
		// 		(t["com.apple.quicktime.creationdate"] ||
		// 			t["CreationDate"] ||
		// 			t["CreateDate"]);
		// });
		// if (qtTrack) {
		// 	const raw =
		// 		qtTrack["com.apple.quicktime.creationdate"] ??
		// 		qtTrack["CreationDate"] ??
		// 		qtTrack["CreateDate"];
		// 	if (raw) {
		// 		const qtDate = new Date(raw.replace(/^UTC\s*/, ""));
		// 		if (!isNaN(qtDate.getTime())) return qtDate;
		// 	}
		// }
	} catch (error) {
		console.warn("MediaInfo error:", file.handle.name, error);
	}

	return null;
}

async function getMp4BoxQuickTimeCreationDate(
	file: FileOfFolder,
	fileObject: File,
): Promise<Date | null> {
	return new Promise((resolve) => {
		const mp4boxFile = MP4Box.createFile();

		mp4boxFile.onReady = (info) => {
			try {
				if (info.created) {
					resolve(info.created);
					return;
				}
				resolve(null);
				// }

				// let creationTime: number | null = null;

				// console.log(info);

				// // Movie header (mvhd)
				// if (info?.mvhd?.creation_time)
				// 	creationTime = info.mvhd.creation_time;

				// // Track-level (tkhd)
				// if (info?.tracks) {
				// 	for (const track of info.tracks) {
				// 		const trackCreation = track.tkhd?.creation_time;
				// 		if (
				// 			trackCreation &&
				// 			(!creationTime || trackCreation < creationTime)
				// 		) {
				// 			creationTime = trackCreation;
				// 		}
				// 	}
				// }

				// // QuickTime metadata atoms (udta/meta)
				// const quickTimeAtoms = info?.moov?.udta?.meta?.keys || {};
				// for (const key of Object.keys(quickTimeAtoms)) {
				// 	if (/creation|©day/i.test(key)) {
				// 		const val = quickTimeAtoms[key]?.data?.toString?.();
				// 		if (val) {
				// 			const parsed = new Date(val);
				// 			if (!isNaN(parsed.getTime())) {
				// 				resolve(parsed); // Prefer metadata atom date if exists
				// 				return;
				// 			}
				// 		}
				// 	}
				// }

				// // Convert mvhd/tkhd seconds since 1904 to JS Date
				// if (creationTime) {
				// 	const date = new Date((creationTime - 2082844800) * 1000);
				// 	resolve(date);
				// } else {
				// 	resolve(null);
				// }
			} catch (error) {
				console.warn("MP4Box error:", file.handle.name, error);
				resolve(null);
			}
		};

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const arrayBuffer = e.target?.result as ArrayBuffer;
				const buf = arrayBuffer.slice(
					0,
				) as unknown as MP4Box.MP4BoxBuffer;
				buf.fileStart = 0;
				(buf as any).fileStart = 0;
				mp4boxFile.appendBuffer(buf);
				mp4boxFile.flush();
			} catch (error) {
				console.warn("MP4Box error:", fileObject.name, error);
				resolve(null);
			}
		};
		reader.readAsArrayBuffer(fileObject);
	});
}

function parseExifDate(
	file: FileOfFolder,
	dateStr: string | null | undefined,
	addLogEntry: LogFunction,
): Date | null {
	if (!dateStr) return null;

	const isoStr = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
	const date = new Date(isoStr);

	if (!isNaN(date.getTime())) return date;

	const dateNativeParse = new Date(dateStr);
	if (!isNaN(dateNativeParse.getTime())) return dateNativeParse;

	console.log(
		"Could not parse date",
		fileOfFolderIdentifier(file),
		": ",
		dateStr,
	);
	addLogEntry(
		"warning",
		"Could not parse date " + fileOfFolderIdentifier(file) + ": " + dateStr,
	);
	return null;
}

async function getExifToolCreationDate(
	file: FileOfFolder,
	fileObject: File,
	addLogEntry: LogFunction,
): Promise<Date | null> {
	try {
		const meta = await parseMetadata(fileObject, {
			args: ["-json", "-n"],
			transform: (data) => JSON.parse(data),
			// fetch: fetchCachedZeroperl as any,
		});

		if (!meta.success) {
			console.warn(
				"ExifTool unsuccessful error:",
				file.handle.name,
				meta.error,
			);
			return null;
		}

		const result =
			parseExifDate(file, meta.data[0]?.CreationDate, addLogEntry) ??
			parseExifDate(file, meta.data[0]?.CreateDate, addLogEntry) ??
			parseExifDate(file, meta.data[0]?.DateTimeOriginal, addLogEntry) ??
			null;
		// console.log("exiftool date:", result);
		if (!result) console.log("Could not get exiftool date:", meta.data);
		return result;
	} catch (error) {
		console.warn("ExifTool throw error:", file.handle.name, error);
		return null;
	}
}

export async function getCreationDate(
	file: FileOfFolder,
	addLogEntry: LogFunction,
): Promise<Date | null> {
	let result: Date | null = null;

	// first use a few file type specific methods to extract the creation date
	// these may fail, or extract a invalid date.
	// See fallback below.
	const fileObject = await file.handle.getFile();
	try {
		const extension = fileObject.name.split(".").pop()?.toLowerCase();

		const exifrTypes = [
			"jpg",
			"jpeg",
			"tif",
			"tiff",
			"png",
			"heic",
			"webp",
		];

		const mediaInfoTypes = ["mp4", "mov", "mkv", "avi", "webm"];

		if (extension && exifrTypes.includes(extension)) {
			result = await getExifrCreationDate(fileObject);
		} else if (extension && mediaInfoTypes.includes(extension)) {
			// const mediaInfoCreationDate = await getMediaInfoCreationDate(
			// 	file,
			// 	fileObject,
			// );
			// if (mediaInfoCreationDate) {
			// 	result = mediaInfoCreationDate;
			// } else {
			const mp4BoxCreationDate = await getMp4BoxQuickTimeCreationDate(
				file,
				fileObject,
			);
			if (mp4BoxCreationDate) result = mp4BoxCreationDate;
			// }
		}
	} catch (error) {
		console.warn(
			`Error while parsing create date for ${file.handle.name}. Fallback to exiftool:`,
			error,
		);
	}

	// FALLBACK. Exiftool.
	// Currently this library has a flaw were (at least in my environment) zeroperl is loaded for each call (from the browser cache).
	// Thats still around 40ms per call. So it is only used as a last resort.
	// Also rather early dates are likely incorrect (esp. if epoch start).
	if (!result || result < new Date("1972-01-01")) {
		result = await getExifToolCreationDate(file, fileObject, addLogEntry);
		if (result) return result;
	}
	return result;
}
