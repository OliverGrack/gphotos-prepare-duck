# GPhoto-Prepare-Duck

GPhoto-Prepare-Duck is a little tool that prepares a [Google Photos Takout](https://support.google.com/accounts/answer/9666875?hl=en) so it can be used from other tools with fewer issues. It maintly was developed to be used for Google Photos exports that are later imported to [Ente Photos](https://ente.io/de/). However, may also be of used in other scenarios. It is not supported nor endorsed by Ente nor Google.

## What it does

- Combines multiple Google Photo takeout .zip files into a single folder structure.
- In the outputted structure each album has a single folder
- File duplication suffixes, like `(1)` `(2)`, are replaced with `_1` `_2` suffixes. Including metadata files, and live video counter parts. (This avoids some matching issues that may arise otherwise).
- Live Photos are matched with their Video files by using a bunch of tools (like exiftool) to extract and match them by their creation date.

## How to use

No need to install anything, the tool works in the browser.
Visit TODO and follow the onscreen instructions. You will need to use a browser that supports the file system [File System Access API](https://caniuse.com/native-filesystem-api). Currently that means a Chromium based browser.

## Current Ente Photos import shortcomings

Ente Photos already offers a import of Google Photos out of the box, however, it does currently have a few edge cases, which this prepare tool tries to solve. Most of these shortcomings only occur when importing relatively large Google Photo libraries. Especially if you only have a single exported .zip file (your library is small enough), many of these shortcomings do not effect you.

These scenarios can create problems when importing

- Since the Google Export can sometimes place the image file, live photo and metadata files in different takeout zip files. Uploading each .zip individually makes some live photos missing / some metadata not import
- Sometimes matching a image and video file into a single live photo fails when 2 images share the same name within an album (e.g. 2 files called IMG_0010.HEIC, or one named IMG_0010.HEIC, one IMG_0010(1).HEIC and one IMG_0010.JPG). Ente Photos tries to resolve these by creation date, but fails to do so in some cases.
- Manually merging of .zip files into a single folder does not help. As it may rename some of the files by adding suffix like `(1)` depending on your operating system, further creating difficulties when importing as metadata and live photo files. These may not reflect the same name anymore.

## How GPhoto-Prepare-Duck tries to solve these issues

GPhoto-Prepare-Duck combines all your .zip files into a single folder structure. While maintaining most of the structure of a Google Photos export. Allowing usage of Ente Photo's import.

Files with shared names are renamed to minimize conflicts with live photos and metadata. E.g. when these 3 photos and their related files are all located in the same album, possibly over a few .zip files:

- `IMG_0010.HEIC`
- `IMG_0010.JPG`
- `IMG_0010(1).HEIC`
- `IMG_0010.HEIC.supplemental-metadata(1).json` Metadata of `IMG_0010(1).HEIC`
- `IMG_0010.MP4` Live photo of `IMG_0010(1).HEIC`

They are renamed and copied into a single album folder:

- `IMG_0010.HEIC` the first file keeps the original name
- `IMG_0010_1.JPG`
- `IMG_0010_2.MP4`
- `IMG_0010_2.HEIC.supplemental-metadata.json`
- `IMG_0010_2.HEIC`

Additionally matched live photos and metadata files are renamed accordingly. While the matching of live photos and metadata happens between the .zip files, and has a few extra fallbacks on how the creation date is read.

## Current shortcomings of GPhoto-Prepare-Duck

1. Currently when 2 live photos with the same name occur within a 24 hour time-span, incorrect videos may be matched to their image counter part. To form a incorrect live photo. This should be extremely rare.
2. This tool has not been extensively tested on photo libraries created with phones of various manufacturers.
3. The browser may decide that this tool is not allowed to create so many images, and may prevent file creation. In Chromium browsers this should mainly be an issue, if you have little storage available.
4. This tool currently mostly just works in Chromium browsers, since most other browsers do not support some required file apis.
5. The metadata matching could theoretically be improved by using the metadata dates. However, it was not necessary in my tests.
