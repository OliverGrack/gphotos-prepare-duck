import { fileTypeFromName, getCreationDate } from "./file-exif";
import { LogFunction } from "./prep-store";
import { FileOfFolder, FileWithConnectedFiles } from "./types";

async function videoSizeGroup(
	file: FileOfFolder,
): Promise<"possibly-live" | "large"> {
	// limit taken from ente.io source
	// https://github.com/ente-io/ente/blob/d78fa3f27d4b78f44cb7ec293ec66a6862632133/web/packages/gallery/services/upload/upload-service.ts#L380
	const maxAssetSize = 20 * 1024 * 1024; /* 20MB */
	const size = (await file.handle.getFile()).size;
	return size < maxAssetSize ? "possibly-live" : "large";
}

async function groupVideosBySize(
	videos: FileWithConnectedFiles[],
): Promise<Map<"possibly-live" | "large", FileWithConnectedFiles[]>> {
	const groups = new Map<
		"possibly-live" | "large",
		FileWithConnectedFiles[]
	>();

	for (const video of videos) {
		const sizeGroup = await videoSizeGroup(video.file);
		if (!groups.has(sizeGroup)) {
			groups.set(sizeGroup, []);
		}
		groups.get(sizeGroup)!.push(video);
	}

	return groups;
}

async function resolveBaseNameGroup(
	files: FileWithConnectedFiles[],
	addLogEntry: LogFunction,
): Promise<FileWithConnectedFiles[]> {
	const filesByType = Map.groupBy(files, (f) =>
		fileTypeFromName(f.file.handle.name),
	);

	const videos = filesByType.get("video") ?? [];
	const images = filesByType.get("image") ?? [];
	const others = filesByType.get("other") ?? [];

	if (videos.length === 0 || images.length === 0) {
		// no videos or images --> no possible live photo combination
		return files;
	}

	const videoGroups = await groupVideosBySize(videos);
	const videosShort = videoGroups.get("possibly-live") ?? [];
	const videosLarge = videoGroups.get("large") ?? [];

	if (videosShort.length === 0) {
		// no short videos --> no possible live photos
		return files;
	}

	// TODO resolve
	const MATCH_THRESHOLD_MS = 1000 * 60 * 60 * 24; // 24 hours

	// 1. Get creation dates for all potential files
	const videoDates = await Promise.all(
		videosShort.map((v) => getCreationDate(v.file, addLogEntry)),
	);
	const imageDates = await Promise.all(
		images.map((i) => getCreationDate(i.file, addLogEntry)),
	);

	// 2. Calculate the time difference for all possible pairs
	type FilePair = {
		video: FileWithConnectedFiles;
		image: FileWithConnectedFiles;
		diff: number;
	};
	const potentialPairs: FilePair[] = [];

	videosShort.forEach((video, vIndex) => {
		const videoDate = videoDates[vIndex];
		if (!videoDate) return;
		images.forEach((image, iIndex) => {
			const imageDate = imageDates[iIndex];
			if (!imageDate) return;
			const diff = Math.abs(videoDate.getTime() - imageDate.getTime());
			potentialPairs.push({ video, image, diff });
		});
	});

	// 3. Sort pairs by the smallest difference first
	potentialPairs.sort((a, b) => a.diff - b.diff);

	// console.log(
	// 	files[0].file.handle.name,
	// 	JSON.stringify(
	// 		{
	// 			potentialPairs,
	// 			videosShort,
	// 			images,
	// 			videoDates,
	// 			imageDates,
	// 		},
	// 		null,
	// 		2,
	// 	),
	// );

	let shortVideosPairedRemoved = new Set(videosShort);

	// 4. Iterate through sorted pairs and connect the best available matches
	const matchedVideos = new Set<FileWithConnectedFiles>();
	const matchedImages = new Set<FileWithConnectedFiles>();

	for (const pair of potentialPairs) {
		if (pair.diff > MATCH_THRESHOLD_MS) break; // No more valid matches

		// If neither file has been matched yet, form the connection
		if (!matchedVideos.has(pair.video) && !matchedImages.has(pair.image)) {
			pair.image.liveVideo = pair.video.file;
			shortVideosPairedRemoved.delete(pair.video);

			// pair.video.connectedFiles.push(pair.image.file);
			// pair.image.connectedFiles.push(pair.video.file);
			matchedVideos.add(pair.video);
			matchedImages.add(pair.image);
		}
	}

	return [...shortVideosPairedRemoved, ...images, ...others, ...videosLarge];
}

export async function resolveBaseNameGroups(
	groups: Map<string, FileWithConnectedFiles[]>,
	onProgress: (progress: number) => void,
	addLogEntry: LogFunction,
): Promise<Map<string, FileWithConnectedFiles[]>> {
	const resolved: Map<string, FileWithConnectedFiles[]> = new Map();
	const entries = Array.from(groups.entries());

	let index = 0;
	let finished = 0;

	const length = entries.length;

	async function worker() {
		while (index < length) {
			const i = index++;
			const [baseName, files] = entries[i];
			const resolvedFiles = await resolveBaseNameGroup(
				files,
				addLogEntry,
			);
			if (resolvedFiles) {
				resolved.set(baseName, resolvedFiles);
			}
			finished++;
			onProgress(finished / length);
		}
	}

	// create N workers that process in parallel
	const workers = Array.from({ length: 128 }, () => worker());
	await Promise.all(workers);

	return resolved;
}
