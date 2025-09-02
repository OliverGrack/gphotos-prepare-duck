export interface AlbumFolder {
	handle: FileSystemDirectoryHandle;
	parents: FileSystemDirectoryHandle[];
}

export interface FileOfFolder {
	handle: FileSystemFileHandle;
	folder: AlbumFolder;
}

export interface FileWithConnectedFiles {
	file: FileOfFolder;
	meta: FileOfFolder | null;
	liveVideo: FileOfFolder | null;
}

export function albumFolderIdentifier(folder: AlbumFolder): string {
	return (
		folder.parents.map((p) => p.name).join("/") + "/" + folder.handle.name
	);
}

export function fileOfFolderIdentifier(file: FileOfFolder): string {
	return `${albumFolderIdentifier(file.folder)}/${file.handle.name}`;
}
