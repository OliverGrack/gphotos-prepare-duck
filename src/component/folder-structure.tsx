import { JSXElement, ParentProps, Show } from "solid-js";

export function Folder(props: ParentProps<{ name: JSXElement }>) {
	return (
		<li class="before:content-['📂'] before:pr-2">
			{props.name}
			<Show when={props.children}>
				<FileListComponent>{props.children}</FileListComponent>
			</Show>
		</li>
	);
}

export function FileListComponent(props: ParentProps) {
	return <ul class="pl-6">{props.children}</ul>;
}
