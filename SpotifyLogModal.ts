import {
	processCurrentlyPlayingResponse,
	isAuthenticated,
	processTrack,
} from "api";
import {
	App,
	ButtonComponent,
	Modal,
	Setting,
	TextComponent,
	Notice,
	SearchComponent,
} from "obsidian";
import { appendInput, createSongFile } from "SpotifyLogger";
import { SpotifySearchModal } from "SpotifySearchModal";
import { PlaybackState, Song, Track, TrackFormatted } from "types";
import { generateBlockID, parseTrackAsWikilink } from "utils";

export class SpotifyLogModal extends Modal {
	private blockId: string;
	private track: TrackFormatted | null;
	constructor(
		public app: App,
		readonly currentlyPlaying: PlaybackState,
		readonly folderPath: string,
		readonly onSubmit: (input: string, blockId?: string) => void,
	) {
		super(app);

		this.track = processCurrentlyPlayingResponse(this.currentlyPlaying);
		if (!this.track) {
			console.log("is episode"); //TODO: Handle episode
			return;
		}

		const title = `${this.track.artists} - ${this.track.name}`;
		this.setTitle(title);

		let input = "";

		this.contentEl.addClass("spotify-log-modal-content-container");

		const textComponent = new TextComponent(this.contentEl);

		//TODO: is there a better design?
		const onSubmitWrapper = (input) => {
			console.log(`submitting. blockid: ${this.blockId}`);
			this.onSubmit(input, this.blockId);
			this.blockId = "";
			this.close();
		};

		textComponent.inputEl.addClass("spotify-log-modal-input");
		textComponent.inputEl.addEventListener("keydown", (event) => {
			if (!event.isComposing && event.key === "Enter") {
				event.preventDefault();
				onSubmitWrapper(input);
			}
		});

		textComponent.onChange((value) => {
			input = value;
		});

		this.contentEl.createEl("div", {
			text: this.track.progress,
			cls: "spotify-log-modal-progress",
		});

		const buttonContainer = this.contentEl.createDiv(
			"spotify-log-modal-button-container",
		);

		const onChooseSuggestionCb = async (track: TrackFormatted) => {
			if (!this.track || !this.track.progress) {
				//TODO: better handling
				console.log("cur track not available");
				return;
			}

			console.log("searching from log modal");

			const songFile = await createSongFile(
				this.app,
				this.folderPath,
				track,
			);

			const refTrackMdLink = parseTrackAsWikilink(track);

			textComponent.setValue(textComponent.getValue() + refTrackMdLink);
			input = textComponent.getValue();

			this.blockId = generateBlockID(6); // TODO: make sure to clear after using. better design?

			const curBlockMdLink = parseTrackAsWikilink(
				this.track,
				true,
				this.blockId,
			);

			const curTrackMdLink = parseTrackAsWikilink(this.track);

			appendInput(
				app,
				songFile.path,
				curBlockMdLink,
				this.track.progress,
				"",
				curTrackMdLink,
			);
		};

		const openSearchModal = () => {
			if (!isAuthenticated()) {
				new Notice("Please connect your Spotify account", 3000);
				return;
			}
			new SpotifySearchModal(this.app, onChooseSuggestionCb).open();
		};

		this.modalEl.addEventListener("keydown", (e) => {
			if (e.metaKey && e.key === "p") {
				e.preventDefault();
				openSearchModal();
			}
		});

		const searchButton = new ButtonComponent(buttonContainer)
			.setButtonText("Search song")
			.onClick(openSearchModal);

		const saveButton = new ButtonComponent(buttonContainer)
			.setButtonText("Save")
			.setCta()
			.onClick(() => {
				onSubmitWrapper(input);
			});
	}
}
