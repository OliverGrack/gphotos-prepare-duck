import { JSXElement, ParentProps, Show } from "solid-js";
import { usePrepStore } from "src/store/prep-store";
import { Button } from "src/ui/components/ui/button";

export function Step(
	props: ParentProps<{
		title: JSXElement;
		step: number;
		hasNextButton?: boolean;
	}>,
) {
	const store = usePrepStore();
	return (
		<Show when={store.step() == props.step}>
			<div class="shadow rounded-2xl p-4 border">
				<h2 class="text-xl font-bold pb-2">
					{props.step}/8. {props.title}
				</h2>
				{props.children}
				<Show when={props.hasNextButton}>
					<StepButtons>
						<NextStepButton />
					</StepButtons>
				</Show>
			</div>
		</Show>
	);
}

export function StepButtons(props: ParentProps) {
	return <div class="pt-2">{props.children}</div>;
}

export function NextStepButton(props: { title?: JSXElement }) {
	const store = usePrepStore();
	return <Button onClick={store.nextStep}>{props.title ?? "Next"}</Button>;
}
