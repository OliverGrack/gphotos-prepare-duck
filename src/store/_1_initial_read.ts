import { AlbumFolder } from "./types";

export function isIgnoredHandle(
	file: FileSystemDirectoryHandle | FileSystemFileHandle,
) {
	return (
		file.name === ".DS_Store" || // macOS system file
		file.name === "Thumbs.db" || // Windows system file
		file.name === ".dtrash" // DigiKam data
	);
}

export async function listTakeoutFolders(dirHandle: FileSystemDirectoryHandle) {
	const folders = [];

	for await (const entry of dirHandle.values()) {
		if (entry.kind === "directory" && !isIgnoredHandle(entry)) {
			folders.push(entry);
		}
	}

	return folders;
}

export async function findAlbumsPerTakeoutFolder(
	takeoutFolders: FileSystemDirectoryHandle[],
) {
	async function recursivelyFindAlbums(
		parentChain: FileSystemDirectoryHandle[],
		dirHandle: FileSystemDirectoryHandle,
	): Promise<AlbumFolder[]> {
		const albums: AlbumFolder[] = [];
		let selfIsAlbum = false;
		for await (const entry of dirHandle.values()) {
			if (isIgnoredHandle(entry)) continue;
			if (entry.kind === "directory") {
				const subAlbums = await recursivelyFindAlbums(
					[...parentChain, dirHandle],
					entry,
				);
				albums.push(...subAlbums);
			} else if (!selfIsAlbum) {
				selfIsAlbum = true;
				albums.push({
					handle: dirHandle,
					parents: parentChain,
				});
			}
		}
		return albums;
	}

	return Promise.all(
		takeoutFolders.map(async (takeoutFolder) => {
			const albums = await recursivelyFindAlbums([], takeoutFolder);
			return { takeoutFolder, albums };
		}),
	);
}

export async function findAlbumFoldersGroupedByAlbum(
	takeoutFolders: FileSystemDirectoryHandle[],
): Promise<Map<string, AlbumFolder[]>> {
	const albumsPerTakeoutFolder =
		await findAlbumsPerTakeoutFolder(takeoutFolders);

	return Map.groupBy(
		albumsPerTakeoutFolder.flatMap((it) => it.albums),
		(item) => item.handle.name,
	);
}

export type AlbumFolderGroups = Map<string, AlbumFolder[]>;
