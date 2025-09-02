import { nameAndExtension } from "./file-meta-naming";
import { FileWithConnectedFiles } from "./types";

async function copyFileTo(
	sourceFile: FileSystemFileHandle,
	destFileHandle: FileSystemFileHandle,
) {
	const originalFile = await sourceFile.getFile();
	const readable = originalFile.stream();
	const writable = await destFileHandle.createWritable();

	await readable.pipeTo(writable);
}

export type ExportMode = "all" | "live" | "live-and-confusing";

export interface ExportOptions {
	exportMode: ExportMode;
}

function filterResolvedGroups(
	resolvedGroups: Map<string, Map<string, FileWithConnectedFiles[]>>,
	options: ExportOptions,
) {
	if (options.exportMode === "all") {
		return resolvedGroups;
	}

	const liveAndConfusing = new Map(
		[...resolvedGroups.entries()]
			.map(
				([album, fileGroups]) =>
					[
						album,
						new Map(
							[...fileGroups.entries()].filter(
								([_baseName, files]) =>
									files.some((it) => it.liveVideo),
							),
						),
					] as const,
			)
			.filter(([_album, groups]) => groups.size > 0),
	);

	if (options.exportMode === "live-and-confusing") {
		return liveAndConfusing;
	}

	return new Map(
		[...liveAndConfusing.entries()]
			.map(
				([album, fileGroups]) =>
					[
						album,
						new Map(
							[...fileGroups.entries()].map(
								([baseName, files]) => [
									baseName,
									files.filter((it) => it.liveVideo),
								],
							),
						),
					] as const,
			)
			.filter(([_album, groups]) => groups.size > 0),
	);
}

export async function writeExportFiles(
	rootDirHandle: FileSystemDirectoryHandle,
	resolvedGroups: Map<string, Map<string, FileWithConnectedFiles[]>>,
	onProgress: (progress: number) => void,
	options: ExportOptions,
) {
	const outputFolder = await rootDirHandle.getDirectoryHandle(
		"Prepared_Photos",
		{ create: true },
	);

	const filteredGroups = filterResolvedGroups(resolvedGroups, options);

	let groupCount = 0;
	for (const [_album, fileGroups] of filteredGroups) {
		groupCount += fileGroups.size;
	}

	let finishedGroups = 0;

	// Implementation goes here
	for (const [album, fileGroups] of filteredGroups) {
		const albumOutputFolder = await outputFolder.getDirectoryHandle(album, {
			create: true,
		});

		const fileBaseNames = Array.from(fileGroups.keys());

		let i = 0;

		async function worker() {
			while (i < fileBaseNames.length) {
				const index = i++;
				const fileBaseName = fileBaseNames[index];
				const files = fileGroups.get(fileBaseName);
				if (files) {
					await writeExportFilesOfFileGroup(
						albumOutputFolder,
						fileBaseName,
						files,
					);
					finishedGroups++;
					onProgress(finishedGroups / groupCount);
				}
			}
		}

		const workers = Array.from({ length: 16 }, () => worker());
		await Promise.all(workers);
	}
}

async function writeExportFilesOfFileGroup(
	albumOutputFolder: FileSystemDirectoryHandle,
	fileBaseName: string,
	files: FileWithConnectedFiles[],
) {
	// Write each file to the appropriate location
	let fileOfBaseNameIndex = 0;
	for (const file of files) {
		const extension = nameAndExtension(file.file.handle.name)[1];
		const newBaseName =
			fileOfBaseNameIndex === 0
				? `${fileBaseName}`
				: `${fileBaseName}_${fileOfBaseNameIndex}`;
		const newFileName = `${newBaseName}.${extension}`;

		const newFileHandle = await albumOutputFolder.getFileHandle(
			newFileName,
			{
				create: true,
			},
		);
		await copyFileTo(file.file.handle, newFileHandle);

		if (file.meta != null) {
			// this is (I think. At least for my export) not quite how google slices it in case of umlauts (see file-name-parser.ts).
			// However, this is what ente expects atm.
			// Possibly it needs to be changed, if ente changes their algorithm.
			// https://github.com/ente-io/ente/blob/6478b08a19abc9310833d96ab0f96e4d816b08f5/web/packages/gallery/services/upload/metadata-json.ts#L103
			const maxGoogleFileNameLength = 46;
			const metaFileName =
				`${newFileName}.supplemental-metadata`.slice(
					0,
					maxGoogleFileNameLength,
				) + ".json";

			const newMetaFileHandle = await albumOutputFolder.getFileHandle(
				metaFileName,
				{
					create: true,
				},
			);
			await copyFileTo(file.meta.handle, newMetaFileHandle);
		}

		if (file.liveVideo != null) {
			const videoExtensions = nameAndExtension(
				file.liveVideo.handle.name,
			)[1];
			const newVideoFileName = `${newBaseName}.${videoExtensions}`;

			const newVideoFileHandle = await albumOutputFolder.getFileHandle(
				newVideoFileName,
				{
					create: true,
				},
			);
			await copyFileTo(file.liveVideo.handle, newVideoFileHandle);
		}
		fileOfBaseNameIndex++;
	}
}
