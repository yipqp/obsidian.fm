import { isAuthenticated } from "src/api";
import {
	App,
	ButtonComponent,
	Modal,
	TextComponent,
	Notice,
	normalizePath,
	TFile,
} from "obsidian";
import {
	appendInput,
	createAlbumFile,
	createTrackFile,
} from "src/SpotifyLogger";
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
	private logAlbumAlwaysCreateNewTrackFiles: boolean;
	private handleSubmit = () => {
		this.onSubmit(this.input, this.blockId ?? undefined);
		this.blockId = null;
		this.close();
	};
	private handleChooseSuggestion = async (
		item: TrackFormatted | AlbumFormatted,
		textComponent: TextComponent,
	) => {
		if (!this.playing) return;
		if (this.playing.id === item.id) {
			new Notice("Error: cannot reference self");
			return;
		}

		console.log("searching from log modal");

		let file: TFile;

		if (item.type === "Track") {
			file = await createTrackFile(this.app, this.folderPath, item);
		}

		if (item.type === "Album") {
			file = await createAlbumFile(
				this.app,
				this.folderPath,
				item,
				this.logAlbumAlwaysCreateNewTrackFiles,
			);
		}

		const refTrackMdLink = parsePlayingAsWikilink(item);

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
			file!.path,
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
		logAlbumAlwaysCreateNewTrackFiles: boolean,
	) {
		super(app);
		this.app = app;
		this.playing = currentlyPlaying;
		this.folderPath = folderPath;
		this.onSubmit = onSubmit;
		this.logAlbumAlwaysCreateNewTrackFiles =
			logAlbumAlwaysCreateNewTrackFiles;

		if (!this.playing) {
			console.log("is episode"); //TODO: Handle episode
			return;
		}

		const folder = this.app.vault.getFolderByPath(
			normalizePath(this.folderPath),
		);

		if (folder == null) {
			throw new Error(
				"invalid folder path, please check the defined folder path in settings.",
			);
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

		const onChooseSuggestionCb = async (
			item: TrackFormatted | AlbumFormatted,
		) => {
			await this.handleChooseSuggestion(item, textComponent);
		};

		const openSearchModal = () => {
			if (!isAuthenticated()) {
				new Notice("Please connect your Spotify account", 3000);
				return;
			}
			new SpotifySearchModal(
				this.app,
				this.playing!.type,
				onChooseSuggestionCb,
			).open();
		};

		this.modalEl.addEventListener("keydown", (e) => {
			if (e.metaKey && e.key === "p") {
				e.preventDefault();
				openSearchModal();
			}
		});

		const searchButton = new ButtonComponent(buttonContainer)
			.setButtonText(
				`Seach ${this.playing.type === "Track" ? "track" : "album"}`,
			)
			.onClick(openSearchModal);

		const saveButton = new ButtonComponent(buttonContainer)
			.setButtonText("Save")
			.setCta()
			.onClick(() => {
				this.handleSubmit();
			});
	}
}
