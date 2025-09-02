import { getPotentialMetaFileNames } from "./file-meta-naming";
import { isMetadataFile, parseFileName } from "./file-name-parser";
import { LogFunction } from "./prep-store";
import {
	AlbumFolder,
	FileOfFolder,
	fileOfFolderIdentifier,
	FileWithConnectedFiles,
} from "./types";

export async function fileMetaMatch(
	foldersOfAlbum: AlbumFolder[],
	onProgress: (progress: number) => void,
	addLogEntry: LogFunction,
): Promise<FileWithConnectedFiles[]> {
	const files: FileWithConnectedFiles[] = [];
	let albumIndex = 0;
	for (const folder of foldersOfAlbum) {
		onProgress(albumIndex / foldersOfAlbum.length);
		const foldersOfAlbumSelfFirst = [
			folder,
			...foldersOfAlbum.filter((f) => f !== folder),
		];

		for await (const [name, handle] of folder.handle.entries()) {
			if (handle.kind !== "file" || isMetadataFile(name)) {
				continue;
			}
			// actual image/video file. Possibly sth else, but not a metadata file nor folder
			const fileNameMeta = parseFileName(name);

			// const possibleMetaNames = [
			// 	// file name, when Google takeout did add the number e.g. (1)
			// 	`${fileNameMeta.baseName}.${fileNameMeta.ext}.supplemental-metadata${fileNameMeta.dup}.json`,
			// 	// file name, when (1) was already part of the file name, when uploaded to Google Photos
			// 	`${fileNameMeta.baseName}${fileNameMeta.dup}.${fileNameMeta.ext}.supplemental-metadata.json`,
			// ];
			const possibleMetaNames = getPotentialMetaFileNames(name);

			let metaHandle: FileOfFolder | null = null;
			for (const otherFolder of foldersOfAlbumSelfFirst) {
				if (metaHandle) break;
				for (const possibleMetaName of possibleMetaNames) {
					if (metaHandle) break;
					try {
						metaHandle = {
							handle: await otherFolder.handle.getFileHandle(
								possibleMetaName,
							),
							folder: otherFolder,
						};
					} catch (ex) {
						if (
							ex instanceof DOMException &&
							ex.name === "NotFoundError"
						) {
							// not found, try next
						} else {
							// unexpected rethrow
							throw ex;
						}
					}
				}
			}
			files.push({
				file: { handle, folder },
				meta: metaHandle,
				liveVideo: null,
			});
		}
		albumIndex++;
	}

	// check if all meta files where used
	const usedMetaFiles = new Set(
		files.map((f) => (f.meta ? fileOfFolderIdentifier(f.meta) : null)),
	);
	for (const folder of foldersOfAlbum) {
		for await (const [name, handle] of folder.handle.entries()) {
			if (handle.kind !== "file" || !isMetadataFile(name)) {
				continue;
			}
			if (name === "Metadata.json" || name === "Metadaten.json") {
				// TODO might be nice to copy these metadata files to the
				// output folder.
				continue;
			}

			if (
				!usedMetaFiles.has(fileOfFolderIdentifier({ handle, folder }))
			) {
				console.warn(
					"Unused metadata file:",
					fileOfFolderIdentifier({ handle, folder }),
				);
				addLogEntry(
					"warning",
					"Unused metadata file: " +
						fileOfFolderIdentifier({ handle, folder }),
				);
			}
		}
	}
	onProgress(1);

	return files;
}
