import {
	App,
	ButtonComponent,
	Modal,
	TextComponent,
	normalizePath,
	TFile,
} from "obsidian";
import { appendInput, createAlbumFile, createTrackFile } from "src/Scrobbler";
import { ItemFormatted } from "types";
import {
	generateBlockID,
	itemAsString,
	parseItemAsWikilink,
	reloadOFMT,
	requireAuth,
	showNotice,
} from "src/utils";
import { SearchModal } from "./SearchModal";
import { scrobbleDefaultSettings } from "src/settings";

export class ScrobbleModal extends Modal {
	public app: App;
	private settings: scrobbleDefaultSettings;
	private folderPath: string;
	private onSubmit: (input: string, blockId?: string) => void;
	private blockId: string | null;
	private item: ItemFormatted;
	private input = "";
	private pendingItems: ItemFormatted[];
	private handleSubmit = async () => {
		await this.updateFiles();
		this.onSubmit(this.input, this.blockId ?? undefined);
		this.blockId = null;
		this.pendingItems = [];
		// without this, Obsidian Front Matter Title won't know new files
		// were created, since active leaf may not have changed
		reloadOFMT(this.app);
		this.close();
	};
	private updateFiles = async () => {
		this.blockId = generateBlockID(6);
		while (this.pendingItems.length > 0) {
			const item = this.pendingItems.pop()!;
			let file: TFile;

			if (item.type === "Track") {
				file = await createTrackFile(this.app, this.settings, item);
			}

			if (item.type === "Album") {
				file = await createAlbumFile(this.app, this.settings, item);
			}

			const curBlockMdLink = parseItemAsWikilink(
				this.item,
				true,
				this.blockId,
			);

			const curTrackMdLink = parseItemAsWikilink(this.item);

			let progress;
			if ("progress" in this.item) {
				progress = this.item.progress;
			}

			await appendInput(
				this.app,
				file!.path,
				curBlockMdLink,
				progress,
				undefined,
				curTrackMdLink,
			);
		}
	};

	private handleChooseSuggestion = (
		item: ItemFormatted,
		textComponent: TextComponent,
	) => {
		if (this.item.id === item.id) {
			showNotice("Cannot reference self", true);
			return;
		}

		this.pendingItems.push(item);
		const refTrackMdLink = parseItemAsWikilink(item);
		textComponent.setValue(textComponent.getValue() + refTrackMdLink);
		this.input = textComponent.getValue();
	};

	constructor(
		app: App,
		settings: scrobbleDefaultSettings,
		item: ItemFormatted,
		onSubmit: (input: string, blockId?: string) => void,
	) {
		super(app);
		this.app = app;
		this.settings = settings;
		this.folderPath = settings.folderPath;
		this.item = item;
		this.onSubmit = onSubmit;
		this.pendingItems = [];

		const folder = this.app.vault.getFolderByPath(
			normalizePath(this.folderPath),
		);

		if (folder == null) {
			throw new Error(
				"Invalid folder path, please check the defined folder path in settings.",
			);
		}

		const title = itemAsString(this.item);
		this.setTitle(title);

		this.contentEl.addClass("scrobble-modal-content-container");

		const textComponent = new TextComponent(this.contentEl);
		textComponent.inputEl.addClass("scrobble-modal-input");
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
			text: this.item.type === "Track" ? this.item.progress : "",
			cls: "scrobble-modal-progress",
		});

		const buttonContainer = this.contentEl.createDiv(
			"scrobble-modal-button-container",
		);

		const onChooseSuggestionCb = async (item: ItemFormatted) => {
			this.handleChooseSuggestion(item, textComponent);
		};

		const openSearchModal = requireAuth(async () => {
			new SearchModal(
				this.app,
				this.item.type,
				onChooseSuggestionCb,
			).open();
		});

		const searchButton = new ButtonComponent(buttonContainer)
			.setButtonText(
				`Search ${this.item.type === "Track" ? "songs" : "albums"}`,
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
