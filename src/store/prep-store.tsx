import { createContext, createSignal, useContext } from "solid-js";
import {
	AlbumFolderGroups,
	findAlbumFoldersGroupedByAlbum,
	listTakeoutFolders,
} from "./_1_initial_read";
import { groupAllFiles } from "./_2_data_grouping";
import { ExportMode, writeExportFiles } from "./_3_data_writing";
import { FileWithConnectedFiles } from "./types";

export interface LogMessage {
	message: string;
	type: "warning" | "error";
}

export type LogFunction = (type: "error" | "warning", value: any) => void;

export function createPrepStore() {
	const browserSupportsApi = "showDirectoryPicker" in window;

	const [step, setStep] = createSignal(1);
	const [finishedLoadingFolders, setFinishedLoadingFolders] =
		createSignal(false);
	const [takeoutFolders, setTakeoutFolders] = createSignal<string[] | null>(
		null,
	);
	const [albums, setAlbums] = createSignal<string[] | null>(null);
	const [recentLog, setLog] = createSignal<LogMessage[]>([]);

	const [progress, setProgress] = createSignal(0);
	const [progressMessage, setProgressMessage] = createSignal("");
	const [albumProgress, setAlbumProgress] = createSignal(0);
	const [albumProgressMessage, setAlbumProgressMessage] = createSignal("");

	const [exportMode, setExportMode] = createSignal<ExportMode>("all");
	let albumGroups: AlbumFolderGroups | null = null;
	let rootDirHandle: FileSystemDirectoryHandle | null = null;

	let logFileHandle: FileSystemFileHandle | null = null;
	let logFileWriteable: FileSystemWritableFileStream | null = null;

	async function startViaSelectFolder() {
		setLog([]);
		logFileHandle = null;
		setFinishedLoadingFolders(false);
		try {
			const dirHandle = await window.showDirectoryPicker();
			rootDirHandle = dirHandle;
			nextStep();

			logFileHandle = await dirHandle.getFileHandle(
				"GPhotos-Prepare-Duck-log.txt",
				{ create: true },
			);
			await openWriteable();

			const takeoutFolders = await listTakeoutFolders(dirHandle);
			setTakeoutFolders(takeoutFolders.map((f) => f.name));

			const albums = await findAlbumFoldersGroupedByAlbum(takeoutFolders);
			albumGroups = albums;
			setAlbums([...albums.keys()].sort());
			setFinishedLoadingFolders(true);
		} catch (error) {
			console.error(error);
			addLogEntry("error", error);
		} finally {
			await closeWriteable();
		}
	}

	let resolvedGroups: Map<
		string,
		Map<string, FileWithConnectedFiles[]>
	> | null = null;

	async function confirmFoldersStart() {
		try {
			await openWriteable();
			setProgress(0);
			setProgressMessage("Initializing...");
			setAlbumProgress(0);
			setAlbumProgressMessage("...");
			nextStep();
			resolvedGroups = await groupAllFiles(
				rootDirHandle!,
				albumGroups!,
				setProgress,
				setProgressMessage,
				setAlbumProgress,
				setAlbumProgressMessage,
				addLogEntry,
			);
			nextStep();
		} catch (error) {
			console.error(error);
			addLogEntry("error", error);
		} finally {
			await closeWriteable();
		}
	}

	async function writeFiles() {
		try {
			await openWriteable();
			setProgress(0);
			setProgressMessage("Exporting...");
			setAlbumProgress(0);
			setAlbumProgressMessage("...");

			nextStep();
			await writeExportFiles(
				rootDirHandle!,
				resolvedGroups!,
				(p) => setProgress(Math.round(p * 100)),
				{
					exportMode: exportMode(),
				},
			);
			nextStep();
		} catch (error) {
			console.error(error);
			addLogEntry("error", error);
		} finally {
			await closeWriteable();
		}
	}

	function nextStep() {
		setStep((s) => s + 1);
	}

	async function openWriteable() {
		logFileWriteable =
			(await logFileHandle?.createWritable({
				keepExistingData: true,
			})) ?? null;
	}

	async function closeWriteable() {
		await logFileWriteable?.close();
	}

	const addLogEntry: LogFunction = async (
		type: "error" | "warning",
		message: any,
	) => {
		let messageString: string;

		if (typeof message === "string") {
			messageString = message;
		} else if (message instanceof Error) {
			messageString = message.message;
		} else {
			messageString = String(message);
		}

		const logEntry: LogMessage = { message: messageString, type };

		// only keep 25 newest errors:
		setLog((log) => [logEntry, ...log].slice(0, 25));
		// add time after type
		logFileWriteable?.write(
			type +
				" at " +
				new Date().toISOString() +
				": " +
				messageString +
				"\n",
		);
	};

	return {
		startViaSelectFolder,
		browserSupportsApi,
		takeoutFolders,
		step,
		nextStep,
		confirmFoldersStart,
		albums,
		finishedLoadingFolders,
		progress,
		progressMessage,
		writeFiles,
		albumProgress,
		albumProgressMessage,

		exportMode,
		setExportMode,
		recentLog,
		addLogEntry,
	};
}

export type PrepStore = ReturnType<typeof createPrepStore>;
export const PrepStoreContext = createContext<PrepStore>();
export function usePrepStore() {
	const store = useContext(PrepStoreContext);
	if (!store) {
		throw new Error("usePrepStore must be used within a PrepStoreProvider");
	}
	return store;
}
