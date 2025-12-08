import { isAuthenticated } from "src/api";
import { App, ButtonComponent, Modal, TextComponent, Notice } from "obsidian";
import { appendInput, createPlayingFile } from "src/SpotifyLogger";
import { AlbumFormatted, TrackFormatted } from "types";
import { generateBlockID, parsePlayingAsWikilink } from "src/utils";
import { SpotifySearchModal } from "./SpotifySearchModal";

export class SpotifyLogModal extends Modal {
	public app: App;
	private folderPath: string;
	private onSubmit: (input: string, blockId?: string) => void;
	private blockId: string | null;
	private playing: TrackFormatted | AlbumFormatted | null;
	private input = "";
	private handleSubmit = () => {
		this.onSubmit(this.input, this.blockId ?? undefined);
		this.blockId = null;
		this.close();
	};
	private handleChooseSuggestion = async (
		track: TrackFormatted, // TODO: edit to handle albums
		textComponent: TextComponent,
	) => {
		if (!this.playing) return;
		if (this.playing.id === track.id) {
			new Notice("Error: cannot reference self");
			return;
		}
		console.log("searching from log modal");

		const songFile = await createPlayingFile(
			this.app,
			this.folderPath,
			track,
		);

		const refTrackMdLink = parsePlayingAsWikilink(track);

		textComponent.setValue(textComponent.getValue() + refTrackMdLink);
		this.input = textComponent.getValue();

		this.blockId = generateBlockID(6);

		const curBlockMdLink = parsePlayingAsWikilink(
			this.playing,
			true,
			this.blockId,
		);

		const curTrackMdLink = parsePlayingAsWikilink(this.playing);

		let progress;
		if ("progress" in this.playing) {
			progress = this.playing.progress;
		}

		await appendInput(
			this.app,
			songFile.path,
			curBlockMdLink,
			progress,
			undefined,
			curTrackMdLink,
		);
	};
	constructor(
		app: App,
		currentlyPlaying: TrackFormatted | AlbumFormatted,
		folderPath: string,
		onSubmit: (input: string, blockId?: string) => void,
	) {
		super(app);
		this.app = app;
		this.playing = currentlyPlaying;
		this.folderPath = folderPath;
		this.onSubmit = onSubmit;

		if (!this.playing) {
			console.log("is episode"); //TODO: Handle episode
			return;
		}

		const title = `${this.playing.artists} - ${this.playing.name}`;
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
			text: this.playing.type === "Track" ? this.playing.progress : "",
			cls: "spotify-log-modal-progress",
		});

		const buttonContainer = this.contentEl.createDiv(
			"spotify-log-modal-button-container",
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
