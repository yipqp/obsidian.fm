import {
	App,
	ButtonComponent,
	Modal,
	TextComponent,
	normalizePath,
	TFile,
} from "obsidian";
import { appendInput, createAlbumFile, createTrackFile } from "src/Scrobbler";
import { ItemFormattedType } from "types";
import {
	generateBlockId,
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
	private onSubmit: (input: string, blockId?: string) => Promise<void>;
	private blockId: string | undefined;
	private item: ItemFormattedType;
	private input = "";
	private pendingReferences: ItemFormattedType[];
	private handleSubmit = async () => {
		try {
			// createReferences first to generate a blockId
			await this.createReferences();
			await this.onSubmit(this.input, this.blockId);
		} catch (e) {
			if (e instanceof Error) {
				showNotice(e.message, true);
				console.error(e);
			}
		}

		this.blockId = undefined;
		this.pendingReferences = [];

		// without this, Obsidian Front Matter Title won't know new files
		// were created, since active leaf may not have changed
		reloadOFMT(this.app);

		this.close();
	};
	private createReferences = async () => {
		if (this.pendingReferences.length === 0) {
			return;
		}

		const { wikilinkShowArtists } = this.settings;

		// only generate blockId if there is at least one valid pending
		// reference, and only generate blockId once per scrobble
		let blockIdGenerated = false;

		while (this.pendingReferences.length > 0) {
			const item = this.pendingReferences.pop()!;
			const itemMdLink = parseItemAsWikilink(item, wikilinkShowArtists);

			// check if user changed their mind about including this item as a
			// reference
			if (!this.input.includes(itemMdLink)) {
				continue;
			}

			if (!blockIdGenerated) {
				this.blockId = generateBlockId(6);
				blockIdGenerated = true;
			}

			let file: TFile;

			if (item.type === "track") {
				file = await createTrackFile(this.app, this.settings, item);
			}

			if (item.type === "album") {
				file = await createAlbumFile(this.app, this.settings, item);
			}

			const curBlockMdLink = parseItemAsWikilink(
				this.item,
				wikilinkShowArtists,
				true,
				this.blockId,
			);

			const curTrackMdLink = parseItemAsWikilink(
				this.item,
				wikilinkShowArtists,
			);

			const progress =
				"progress" in this.item ? this.item.progress : undefined;

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
		item: ItemFormattedType,
		textComponent: TextComponent,
	) => {
		if (this.item.id === item.id) {
			showNotice("Cannot reference self", true);
			return;
		}

		const { wikilinkShowArtists } = this.settings;

		this.pendingReferences.push(item);
		const refTrackMdLink = parseItemAsWikilink(item, wikilinkShowArtists);
		textComponent.setValue(textComponent.getValue() + refTrackMdLink);
		this.input = textComponent.getValue();
	};

	constructor(
		app: App,
		settings: scrobbleDefaultSettings,
		item: ItemFormattedType,
		onSubmit: (input: string, blockId?: string) => Promise<void>,
	) {
		super(app);
		this.app = app;
		this.settings = settings;
		this.folderPath = settings.folderPath;
		this.item = item;
		this.onSubmit = onSubmit;
		this.pendingReferences = [];

		const folder = this.app.vault.getFolderByPath(
			normalizePath(this.folderPath),
		);

		if (folder == null) {
			throw new Error(
				"Invalid folder path, please check the defined folder path in settings.",
			);
		}

		const title = itemAsString(this.item, true);
		this.setTitle(title);

		this.contentEl.addClass("scrobble-modal-content-container");

		const textComponent = new TextComponent(this.contentEl);
		textComponent.inputEl.addClass("scrobble-modal-input");
		textComponent.inputEl.addEventListener("keydown", (event) => {
			if (!event.isComposing && event.key === "Enter") {
				event.preventDefault();
				void this.handleSubmit();
			}
		});

		textComponent.onChange((value) => {
			this.input = value;
		});

		this.contentEl.createEl("div", {
			text: this.item.type === "track" ? this.item.progress : "",
			cls: "scrobble-modal-progress",
		});

		const buttonContainer = this.contentEl.createDiv(
			"scrobble-modal-button-container",
		);

		const onChooseSuggestionCb = (item: ItemFormattedType) => {
			this.handleChooseSuggestion(item, textComponent);
		};

		const openSearchModal = requireAuth(this.app, async () => {
			new SearchModal(
				this.app,
				this.item.type,
				onChooseSuggestionCb,
			).open();
		});

		// search button
		new ButtonComponent(buttonContainer)
			.setButtonText(
				`Search ${this.item.type === "track" ? "songs" : "albums"}`,
			)
			.onClick(openSearchModal);

		// save button
		new ButtonComponent(buttonContainer)
			.setButtonText("Save")
			.setCta()
			.onClick(async () => {
				await this.handleSubmit();
			});
	}
}
