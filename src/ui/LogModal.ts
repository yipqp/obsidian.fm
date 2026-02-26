import {
	App,
	ButtonComponent,
	Modal,
	TextComponent,
	normalizePath,
	TFile,
} from "obsidian";
import {
	appendInput,
	createAlbumFile,
	createTrackFile,
} from "src/SpotifyLogger";
import { AlbumFormatted, PlayingTypeFormatted, TrackFormatted } from "types";
import {
	generateBlockID,
	nowPlayingAsString,
	parsePlayingAsWikilink,
	reloadOFMT,
	requireAuth,
	showNotice,
} from "src/utils";
import { SearchModal } from "./SearchModal";
import { obsidianfmDefaultSettings } from "src/settings";

export class LogModal extends Modal {
	public app: App;
	private settings: obsidianfmDefaultSettings;
	private folderPath: string;
	private onSubmit: (input: string, blockId?: string) => void;
	private blockId: string | null;
	private playing: PlayingTypeFormatted;
	private input = "";
	private handleSubmit = async () => {
		await this.updateFiles();
		this.onSubmit(this.input, this.blockId ?? undefined);
		this.blockId = null;
		this.close();
	};
	private pendingPlayings: PlayingTypeFormatted[];
	private updateFiles = async () => {
		while (this.pendingPlayings.length > 0) {
			const playing = this.pendingPlayings.pop()!;
			let file: TFile;

			if (playing.type === "Track") {
				file = await createTrackFile(this.app, this.settings, playing);
			}

			if (playing.type === "Album") {
				file = await createAlbumFile(this.app, this.settings, playing);
			}

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

			// without this, Obsidian Front Matter Title won't know new files
			// were created since active leaf has not changed
			reloadOFMT(this.app);
		}
	};

	private handleChooseSuggestion = (
		item: TrackFormatted | AlbumFormatted,
		textComponent: TextComponent,
	) => {
		if (this.playing.id === item.id) {
			showNotice("Cannot reference self", true);
			return;
		}

		this.pendingPlayings.push(item);
		const refTrackMdLink = parsePlayingAsWikilink(item);
		textComponent.setValue(textComponent.getValue() + refTrackMdLink);
		this.input = textComponent.getValue();
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
		this.pendingPlayings = [];

		const folder = this.app.vault.getFolderByPath(
			normalizePath(this.folderPath),
		);

		if (folder == null) {
			throw new Error(
				"Invalid folder path, please check the defined folder path in settings.",
			);
		}

		const title = nowPlayingAsString(this.playing);
		this.setTitle(title);

		this.contentEl.addClass("spotify-log-modal-content-container");

		const textComponent = new TextComponent(this.contentEl);
		textComponent.inputEl.addClass("spotify-log-modal-input");
		textComponent.inputEl.addEventListener("keydown", async (event) => {
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

		const onChooseSuggestionCb = async (item: PlayingTypeFormatted) => {
			this.handleChooseSuggestion(item, textComponent);
		};

		const openSearchModal = requireAuth(async () => {
			new SearchModal(
				this.app,
				this.playing.type,
				onChooseSuggestionCb,
			).open();
		});

		const searchButton = new ButtonComponent(buttonContainer)
			.setButtonText(
				`Search ${this.playing.type === "Track" ? "songs" : "albums"}`,
			)
			.onClick(openSearchModal);

		const saveButton = new ButtonComponent(buttonContainer)
			.setButtonText("Save")
			.setCta()
			.onClick(async () => {
				await this.handleSubmit();
			});
	}
}
