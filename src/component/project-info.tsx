import { JSXElement } from "solid-js";

const FeatureItem = (props: { children: JSXElement; title: string }) => {
	return (
		<li class="list-disc py-1 px-2 ml-4 w-fit rounded-xl">
			<b class="font-bold">{props.title}</b> <br />
			{props.children}
		</li>
	);
};

export const ProjectInfo = () => {
	return (
		<>
			<p>
				This tool prepares a{" "}
				<a href="https://takeout.google.com/" class="underline">
					Google Photos
				</a>{" "}
				export for easy re-import into other tools. The main features
				are:
			</p>
			<ul>
				<FeatureItem title="No files leave your device">
					Works without any of your files being uploaded to any
					server.
				</FeatureItem>
				<FeatureItem title="Single folder structure">
					Combines multiple Google Photo takeout .zip files into a
					single folder structure. With each album being a single
					folder.
				</FeatureItem>
				<FeatureItem title="Duplicate file name resolution">
					File duplication suffixes, like (1) (2), are replaced with
					_1 _2 suffixes. Including metadata files, and live video
					counter parts. (This avoids some matching issues where live
					photos might be matched with an incorrect video, or
					incorrect metadata).
				</FeatureItem>
				<FeatureItem title="Live Photos conflicts are resolved">
					Using a bunch of tools (like exiftool) to extract and match
					them by their creation date.
				</FeatureItem>
			</ul>
			<p>
				It mainly was developed to be used for importing into{" "}
				<a href="https://ente.io" class="underline">
					Ente Photos
				</a>
				. <br />
				It is not developed, nor endorsed by Ente nor Google.
			</p>
			<p>
				Checkout the{" "}
				<a href="TODO" class="underline">
					Readme
				</a>{" "}
				for more details.
			</p>
		</>
	);
};
