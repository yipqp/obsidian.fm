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
import {
	generateBlockID,
	nowPlayingAsString,
	parsePlayingAsWikilink,
} from "src/utils";
import { SearchModal } from "./SearchModal";
import { obsidianfmDefaultSettings } from "src/settings";

export class LogModal extends Modal {
	public app: App;
	private settings: obsidianfmDefaultSettings;
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
		item: TrackFormatted | AlbumFormatted,
		textComponent: TextComponent,
	) => {
		if (!this.playing) return;
		if (this.playing.id === item.id) {
			new Notice("Error: cannot reference self");
			return;
		}

		let file: TFile;

		if (item.type === "Track") {
			file = await createTrackFile(this.app, this.settings, item);
		}

		if (item.type === "Album") {
			file = await createAlbumFile(this.app, this.settings, item);
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
		settings: obsidianfmDefaultSettings,
		currentlyPlaying: TrackFormatted | AlbumFormatted,
		onSubmit: (input: string, blockId?: string) => void,
	) {
		super(app);
		this.app = app;
		this.settings = settings;
		this.folderPath = settings.folderPath;
		this.playing = currentlyPlaying;
		this.onSubmit = onSubmit;

		if (!this.playing) {
			throw new Error("current track not supported");
		}

		const folder = this.app.vault.getFolderByPath(
			normalizePath(this.folderPath),
		);

		if (folder == null) {
			throw new Error(
				"invalid folder path, please check the defined folder path in settings.",
			);
		}

		const title = nowPlayingAsString(this.playing);
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
			new SearchModal(
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
				`Search ${this.playing.type === "Track" ? "songs" : "albums"}`,
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
