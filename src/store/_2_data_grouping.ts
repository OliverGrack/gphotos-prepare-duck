import { resolveBaseNameGroups } from "./base-name-group-resolver";
import { groupFilesByBaseName } from "./base-name-grouping";
import { fileMetaMatch } from "./file-meta-match";
import { LogFunction } from "./prep-store";
import { AlbumFolder, FileWithConnectedFiles } from "./types";

async function countItemsAsync(iterable: AsyncIterable<any>) {
	let count = 0;
	for await (const _ of iterable) {
		count++;
	}
	return count;
}

// async function filesWithMetaFromFolder(
// 	folderHandle: FileSystemDirectoryHandle,
// ): Promise<FileWithMetaFile[]> {
// 	const images = new Map<string, FileWithMetaFile>();
// 	for await (const [name, handle] of folderHandle.entries()) {
// 		if (handle.kind !== "file") continue;
// 		if (isMetadataFile(name)) {
// 			const nameMeta = parseMetadataFileName(name);
// 			const identifier = fileNameMetaIdentifier(nameMeta);
// 			console.log(name, identifier);

// 			const existing = images.get(identifier);
// 			if (existing) {
// 				if (existing.metaHandle) {
// 					throw new Error(
// 						"Found multiple metadata files for the same image " +
// 							identifier,
// 					);
// 				}
// 				existing.metaHandle = handle;
// 			} else {
// 				images.set(identifier, {
// 					fileHandle: null,
// 					metaHandle: handle,
// 				});
// 			}
// 		} else {
// 			const nameMeta = parseFileName(name);
// 			const identifier = fileNameMetaIdentifier(nameMeta);
// 			console.log(name, identifier);

// 			const existing = images.get(identifier);
// 			if (existing) {
// 				if (existing.fileHandle) {
// 					throw new Error(
// 						"Found multiple image files for the same metadata " +
// 							identifier,
// 					);
// 				}
// 				existing.fileHandle = handle;
// 			} else {
// 				images.set(identifier, {
// 					fileHandle: handle,
// 					metaHandle: null,
// 				});
// 			}
// 		}
// 	}

// 	const result = Array.from(images.values());

// 	const metaFilesWithoutImages = result.filter(
// 		(it) => it.fileHandle === null,
// 	);

// 	console.log(result);
// 	console.log(metaFilesWithoutImages);

// 	return result;
// }

// function matchFilesWithMetaBetweenFolders(
// 	filesOfFolders: FileWithMetaFile[][],
// ): FileWithMetaFile[] {
// 	const flat = filesOfFolders.flat();

// 	const withBoth = flat.filter(
// 		(it) => it.fileHandle !== null && it.metaHandle !== null,
// 	);
// 	const withoutMeta = flat.filter((it) => it.metaHandle === null);
// 	const withoutFile = Map.groupBy(
// 		flat.filter((it) => it.fileHandle === null),
// 		(it) => it.identifier,
// 	);

// 	const duplicatedIdentifiers = [
// 		...withoutFile
// 			.values()
// 			.filter((arr) => arr.length > 1)
// 			.map((it) => it[0].identifier),
// 	];
// 	if (duplicatedIdentifiers.length > 0) {
// 		throw new Error(
// 			"Some metadata files are duplicated. " +
// 				duplicatedIdentifiers.join(", "),
// 		);
// 	}

// 	for (const file of withoutMeta) {
// 		const meta = withoutFile.get(file.identifier);
// 		if (meta) {
// 			file.metaHandle = meta[0]!.metaHandle;
// 			withoutFile.delete(file.identifier);
// 		}
// 	}

// 	if (withoutFile.size > 0) {
// 		throw new Error(
// 			"Some metadata files are missing image/video files. " +
// 				[...withoutFile.values()]
// 					.map((it) => it[0].identifier)
// 					.join(", "),
// 		);
// 	}
// 	return [...withBoth, ...withoutMeta];
// }

export async function groupAllFiles(
	rootDirHandle: FileSystemDirectoryHandle,
	albumFolderGroups: Map<string, AlbumFolder[]>,
	onProgress: (progress: number) => void,
	onProgressMessage: (message: string) => void,
	setAlbumProgress: (progress: number) => void,
	setAlbumProgressMessage: (message: string) => void,
	addLogEntry: LogFunction,
): Promise<Map<string, Map<string, FileWithConnectedFiles[]>>> {
	onProgress(0);
	onProgressMessage("Initializing...");
	const outputFolder = await rootDirHandle.getDirectoryHandle(
		"Prepared_Photos",
		{ create: true },
	);

	if ((await countItemsAsync(outputFolder.entries())) > 0) {
		throw new Error("Output folder 'Prepared_Photos' is not empty");
	}

	let finishedAlbums = 0;
	let finishedAlbums01 = 0;

	const resolvedGroupsPerAlbum = new Map<
		string,
		Map<string, FileWithConnectedFiles[]>
	>();

	for (const [albumName, folderHandles] of albumFolderGroups) {
		setAlbumProgress(0);
		console.log("Processing album:", albumName);

		setAlbumProgressMessage(albumName + ": Matching files with metadata");
		const files = await fileMetaMatch(
			folderHandles,
			(progress) => setAlbumProgress(Math.round(progress * 0.3 * 100)),
			addLogEntry,
		);
		console.log("after metadata merge", files);

		setAlbumProgressMessage(
			albumName + ": Grouping files with similar names",
		);
		const baseNameGroups = groupFilesByBaseName(files);
		console.log("after base name grouping", baseNameGroups);

		setAlbumProgressMessage(
			albumName + ": Matching live photos with videos",
		);
		const resolvedBaseNameGroups = await resolveBaseNameGroups(
			baseNameGroups,
			(progress) =>
				setAlbumProgress(Math.round((0.3 + progress * 0.7) * 100)),
			addLogEntry,
		);
		console.log("after live photo matching", resolvedBaseNameGroups);

		finishedAlbums++;
		finishedAlbums01 = finishedAlbums / albumFolderGroups.size;
		onProgress(Math.round(finishedAlbums01 * 100));

		resolvedGroupsPerAlbum.set(albumName, resolvedBaseNameGroups);
	}

	return resolvedGroupsPerAlbum;
}
