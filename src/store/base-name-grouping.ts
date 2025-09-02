import { parseFileName } from "./file-name-parser";
import { FileWithConnectedFiles } from "./types";

export function groupFilesByBaseName(
	files: FileWithConnectedFiles[],
): Map<string, FileWithConnectedFiles[]> {
	const groups = new Map<string, FileWithConnectedFiles[]>();

	for (const file of files) {
		const baseName = parseFileName(file.file.handle.name).baseName;
		if (!groups.has(baseName)) {
			groups.set(baseName, []);
		}
		groups.get(baseName)!.push(file);
	}

	return groups;
}
