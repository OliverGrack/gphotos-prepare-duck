import { LogMessage } from "src/store/prep-store";
import { cn } from "src/ui/lib/utils";

export const LogMessageDisplay = (props: { logMessage: LogMessage }) => {
	return (
		<div
			class={cn(
				"p-2 border rounded-xl ",
				props.logMessage.type === "error"
					? "bg-red-100 border-red-400 text-red-700"
					: "bg-yellow-100 border-yellow-400 text-yellow-700",
			)}
		>
			{props.logMessage.type === "error" ? "Error: " : "Warning: "}
			{props.logMessage.message}
		</div>
	);
};
