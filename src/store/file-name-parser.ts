// Detect if filename is a supplemental metadata file
export function isMetadataFile(fileName: string) {
	return /.json$/i.test(fileName);
}

export interface FileNameMeta {
	baseName: string;
	dup: string;
	ext: string;
}

// Parse a normal file (like IMG_0012(1).HEIC)
export function parseFileName(fileName: string): FileNameMeta {
	const regex = /^(.+?)(\(\d+\))?(?:\.([^.]+))$/;
	const match = fileName.match(regex);

	if (!match) {
		return { baseName: fileName, dup: "", ext: "" };
	}

	return {
		baseName: match[1],
		dup: match[2] ?? "",
		ext: match[3] ?? "",
	};
}
