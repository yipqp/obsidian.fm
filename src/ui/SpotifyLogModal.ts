import { processCurrentlyPlayingResponse, isAuthenticated } from "src/api";
import { App, ButtonComponent, Modal, TextComponent, Notice } from "obsidian";
import { appendInput, createSongFile } from "src/SpotifyLogger";
import { PlaybackState, TrackFormatted } from "types";
import { generateBlockID, parseTrackAsWikilink } from "src/utils";
import { SpotifySearchModal } from "./SpotifySearchModal";

export class SpotifyLogModal extends Modal {
	public app: App;
	private currentlyPlaying: PlaybackState;
	private folderPath: string;
	private onSubmit: (input: string, blockId?: string) => void;
	private blockId: string | null;
	private track: TrackFormatted | null;
	private input = "";
	private handleSubmit = () => {
		this.onSubmit(this.input, this.blockId ?? undefined);
		this.blockId = null;
		this.close();
	};
	private handleChooseSuggestion = async (
		track: TrackFormatted,
		textComponent: TextComponent
	) => {
		if (!this.track || !this.track.progress) {
			//TODO: better handling
			console.log("cur track not available");
			return;
		}

		console.log("searching from log modal");

		const songFile = await createSongFile(this.app, this.folderPath, track);

		const refTrackMdLink = parseTrackAsWikilink(track);

		textComponent.setValue(textComponent.getValue() + refTrackMdLink);
		this.input = textComponent.getValue();

		this.blockId = generateBlockID(6);

		const curBlockMdLink = parseTrackAsWikilink(
			this.track,
			true,
			this.blockId
		);

		const curTrackMdLink = parseTrackAsWikilink(this.track);

		appendInput(
			this.app,
			songFile.path,
			curBlockMdLink,
			this.track.progress,
			"",
			curTrackMdLink
		);
	};
	constructor(
		app: App,
		currentlyPlaying: PlaybackState,
		folderPath: string,
		onSubmit: (input: string, blockId?: string) => void
	) {
		super(app);
		this.app = app;
		this.currentlyPlaying = currentlyPlaying;
		this.folderPath = folderPath;
		this.onSubmit = onSubmit;
		this.track = processCurrentlyPlayingResponse(this.currentlyPlaying);

		if (!this.track) {
			console.log("is episode"); //TODO: Handle episode
			return;
		}

		const title = `${this.track.artists} - ${this.track.name}`;
		this.setTitle(title);

		this.contentEl.addClass("spotify-log-modal-content-container");

		const textComponent = new TextComponent(this.contentEl);
		textComponent.inputEl.addClass("spotify-log-modal-input");
		textComponent.inputEl.addEventListener("keydown", (event) => {
			if (!event.isComposing && event.key === "Enter") {
				event.preventDefault();
				this.handleSubmit();
			}
		});

		textComponent.onChange((value) => {
			this.input = value;
		});

		this.contentEl.createEl("div", {
			text: this.track.progress,
			cls: "spotify-log-modal-progress",
		});

		const buttonContainer = this.contentEl.createDiv(
			"spotify-log-modal-button-container"
		);

		const onChooseSuggestionCb = async (track: TrackFormatted) => {
			await this.handleChooseSuggestion(track, textComponent);
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
				this.handleSubmit();
			});
	}
}
