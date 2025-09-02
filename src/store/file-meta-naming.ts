// Largely taken from ente.io source code:
// https://github.com/ente-io/ente/blob/2f1d4b9f1a38170dfdd544234bca8bcc303852a2/web/packages/gallery/services/upload/metadata-json.ts

/**
 * The two parts of a file name - the name itself, and an (optional) extension.
 *
 * The extension does not include the dot.
 */
type FileNameComponents = [name: string, extension: string | undefined];

/**
 * Split a filename into its components - the name itself, and the extension (if
 * any) - returning both. The dot is not included in either.
 *
 * For example, `foo-bar.png` will be split into ["foo-bar", "png"].
 *
 * See {@link fileNameFromComponents} for the inverse operation.
 */
export const nameAndExtension = (fileName: string): FileNameComponents => {
	const i = fileName.lastIndexOf(".");
	// No extension
	if (i == -1) return [fileName, undefined];
	// A hidden file without an extension, e.g. ".gitignore"
	if (i == 0) return [fileName, undefined];
	// Both components present, just omit the dot.
	return [fileName.slice(0, i), fileName.slice(i + 1)];
};

const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });

type SliceFunction = (str: string, start: number, end: number) => string;

const nativeSlice: SliceFunction = (str: string, start: number, end: number) =>
	str.slice(start, end);
const segmenterSlice: SliceFunction = (
	str: string,
	start: number,
	end: number,
) =>
	[...segmenter.segment(str)]
		.slice(start, end)
		.map((s) => s.segment)
		.join("");

export const getPotentialMetaFileNames = (fileName: string): string[] => {
	// Break the fileName down into its components.
	let [name, extension] = nameAndExtension(fileName);
	if (extension) {
		extension = "." + extension;
	}

	const nameNormalized = name.normalize("NFC");

	let numberedSuffix = "";
	const endsWithNumberedSuffixWithBrackets = /\(\d+\)$/.exec(name);
	if (endsWithNumberedSuffixWithBrackets) {
		name = name.slice(0, -1 * endsWithNumberedSuffixWithBrackets[0].length);
		numberedSuffix = endsWithNumberedSuffixWithBrackets[0];
	}

	const maxGoogleFileNameLength = 46;
	const supplSuffix = ".supplemental-metadata";

	function variant1(): string {
		let baseFileName = `${name}${extension}`;
		return `${baseFileName}${numberedSuffix}.json`;
	}

	function variant2(slice: SliceFunction): string {
		let baseFileName = `${name}${extension}`;
		return `${slice(baseFileName, 0, maxGoogleFileNameLength)}${numberedSuffix}.json`;
	}

	function variant3(slice: SliceFunction): string {
		const baseFileNameWithSupplSuffix = `${name}${extension}${supplSuffix}`;
		return `${slice(baseFileNameWithSupplSuffix, 0, maxGoogleFileNameLength)}${numberedSuffix}.json`;
	}

	function variant4(slice: SliceFunction): string {
		const baseFileNameWithNumberedSuffixAndSupplSuffix = `${name}${numberedSuffix}${extension}${supplSuffix}`;
		return `${slice(baseFileNameWithNumberedSuffixAndSupplSuffix, 0, maxGoogleFileNameLength)}.json`;
	}

	return [
		variant1(),
		variant2(nativeSlice),
		variant2(segmenterSlice),
		variant3(nativeSlice),
		variant3(segmenterSlice),
		variant4(nativeSlice),
		variant4(segmenterSlice),
	];
};

// TODO remove:

(window as any).getPotentialMetaFileNames = getPotentialMetaFileNames;
