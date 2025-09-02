import { For, Show, type Component } from "solid-js";
import { FileListComponent, Folder } from "./component/folder-structure";
import { LogMessageDisplay } from "./component/log-display";
import { ProjectInfo } from "./component/project-info";
import { Step, StepButtons } from "./component/step";
import { createPrepStore, PrepStoreContext } from "./store/prep-store";
import { Button } from "./ui/components/ui/button";
import {
	Progress,
	ProgressLabel,
	ProgressValueLabel,
} from "./ui/components/ui/progress";
import {
	RadioGroup,
	RadioGroupItem,
	RadioGroupItemLabel,
} from "./ui/components/ui/radio-group";

const App: Component = () => {
	const store = createPrepStore();

	return (
		<PrepStoreContext.Provider value={store}>
			<div class="max-w-[90ch] mx-auto p-4 flex flex-col gap-2">
				<h1 class="text-2xl font-black">GPhoto-Prepare-Duck 🦆</h1>
				<Show when={store.step() === 1}>
					<ProjectInfo />
				</Show>
				<Show
					when={store.browserSupportsApi}
					fallback={
						<div class="border-red-500 border-2 p-4 rounded-2xl">
							<p class="text-red-500">
								Your browser currently does not support the file
								system access api. Please use Brave, Chrome or a
								different Chromium based browser.
							</p>
							<p>
								In Brave you may need to enable this feature
								here manually. Open:{" "}
								brave://flags/#file-system-access-api
							</p>
						</div>
					}
				>
					<Step
						step={1}
						title="Download your images from Google as .zip files"
						hasNextButton={true}
					>
						Use{" "}
						<a href="https://takeout.google.com/" class="underline">
							Google Takeout
						</a>{" "}
						to download your images. You should get multiple .zip
						files. If your Photo library is small you may just have
						one. Place all .zip files in a folder.
					</Step>
					<Step
						step={2}
						title="Extract each .zip file"
						hasNextButton={true}
					>
						<p>
							Extract each .zip file into its own folder. The
							exact takeout folder names are not important. Each
							takeout folder may either directly contain a folder
							for each album, or may contain a single folder (e.g.
							"Google Photos") that contains all albums.
						</p>
						<FileListComponent>
							<Folder name="Export">
								<Folder name="Takeout 1 (from the first .zip file)">
									<Folder name="Google Photos">
										<Folder name="Album 1"></Folder>
										<Folder name="Album 2"></Folder>
										<Folder name="Album 3"></Folder>
									</Folder>
								</Folder>

								<Folder name="Takeout 2 (from the second .zip file)">
									<Folder name="Album 2"></Folder>
									<Folder name="Album 3"></Folder>
									<Folder name="Album 4"></Folder>
								</Folder>
								<Folder name="..."></Folder>
							</Folder>
						</FileListComponent>

						<div class="border-2 border-red-500 rounded-2xl p-4 my-4">
							<p class="text-red-500 pb-2">
								DON'T: Place albums directly inside the root
								folder. There must be takeout folders wrapping
								the albums.
							</p>
							<FileListComponent>
								<Folder name="Export">
									<Folder name="Album 1"></Folder>
									<Folder name="Album 2"></Folder>
								</Folder>
							</FileListComponent>
						</div>
					</Step>
					<Step
						step={3}
						title="Select the folder containing all takeout folders"
					>
						<StepButtons>
							<Button onClick={store.startViaSelectFolder}>
								Select Google Photos import
							</Button>
						</StepButtons>
					</Step>

					<Step step={4} title="Confirm found folders">
						<Show
							when={store.finishedLoadingFolders()}
							fallback={<p>Loading albums...</p>}
						>
							<p>
								These are your takeout folders? One per .zip
								file?
							</p>
							<FileListComponent>
								<For each={store.takeoutFolders()}>
									{(folder) => <Folder name={folder} />}
								</For>
							</FileListComponent>
							<p>These are all your albums?</p>
							<FileListComponent>
								<For each={store.albums()}>
									{(folder) => <Folder name={folder} />}
								</For>
							</FileListComponent>

							<StepButtons>
								<Button onClick={store.confirmFoldersStart}>
									Confirm
								</Button>
							</StepButtons>
						</Show>
					</Step>
					<Step
						step={5}
						title="Grouping files. Matching live photos with videos..."
					>
						<Progress
							value={store.progress()}
							minValue={0}
							maxValue={100}
							getValueLabel={({ value, max }) =>
								`${value}% completed`
							}
							class="w-full space-y-1"
						>
							<div class="flex justify-between">
								<ProgressLabel>Total Progress</ProgressLabel>
								<ProgressValueLabel />
							</div>
						</Progress>
						<Progress
							value={store.albumProgress()}
							minValue={0}
							maxValue={100}
							getValueLabel={({ value, max }) =>
								`${value}% completed`
							}
							class="w-full space-y-1"
						>
							<div class="flex justify-between">
								<ProgressLabel>
									Album Progress:{" "}
									{store.albumProgressMessage()}
								</ProgressLabel>
								<ProgressValueLabel />
							</div>
						</Progress>
					</Step>
					<Step step={6} title="Grouping finished. Start export?">
						<RadioGroup
							value={store.exportMode()}
							class="mt-4"
							onChange={store.setExportMode}
						>
							<RadioGroupItem value="all" id="radio-all">
								<RadioGroupItemLabel>
									All photos and videos
								</RadioGroupItemLabel>
							</RadioGroupItem>
							<RadioGroupItem
								value="live-and-confusing"
								id="radio-live-and-confusing"
							>
								<RadioGroupItemLabel>
									Live photos and files with same names as
									live photos (I.e. all files that might have
									been confused in a previous import)
								</RadioGroupItemLabel>
							</RadioGroupItem>
							<RadioGroupItem value="live" id="radio-live">
								<RadioGroupItemLabel>
									Live photos only
								</RadioGroupItemLabel>
							</RadioGroupItem>
						</RadioGroup>

						<StepButtons>
							<Button onClick={store.writeFiles}>
								Start Export
							</Button>
						</StepButtons>
					</Step>
					<Step step={7} title="Export running...">
						<Progress
							value={store.progress()}
							minValue={0}
							maxValue={100}
							getValueLabel={({ value, max }) =>
								`${value}% completed`
							}
							class="w-full space-y-1"
						>
							<div class="flex justify-between">
								<ProgressLabel>
									{store.progressMessage()}
								</ProgressLabel>
								<ProgressValueLabel />
							</div>
						</Progress>
					</Step>
					<Step step={8} title="Export Complete!">
						<p>
							Your photos have been successfully exported! Find
							them in the ./Prepared_Photos/ folder located inside
							the previously selected Google Photos takeout
							folder. You can drop this ./Prepared_Photos/ folder
							into Ente Photos to import it.
						</p>
					</Step>
				</Show>
				<Show when={store.recentLog().length > 0}>
					<div class="flex flex-col gap-2">
						<h2 class="text-lg font-semibold">
							Recent Log Messages
						</h2>
						<p>
							For the full log see the
							'gphoto-prepare-duck-log.txt' file inside the
							selected folder.
						</p>
						<For each={store.recentLog()}>
							{(logMessage) => (
								<LogMessageDisplay logMessage={logMessage} />
							)}
						</For>
					</div>
				</Show>
			</div>
		</PrepStoreContext.Provider>
	);
};

export default App;
