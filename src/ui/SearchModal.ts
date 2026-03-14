import { App, debounce, Debouncer, SuggestModal } from "obsidian";
import {
	processAlbum,
	processTrack,
	searchItem,
	callEndpoint,
	processSimplifiedAlbum,
} from "src/api";
import { showNotice } from "src/utils";
import { ItemType, Track, SimplifiedAlbum, ItemFormatted, Album } from "types";

export class SearchModal extends SuggestModal<ItemFormatted> {
	isLoading: boolean;
	lastQuery: string;
	searchDebouncer: Debouncer<
		[query: string, cb: (items: ItemFormatted[]) => void],
		void
	>;
	clientID: string;
	type: ItemType;
	cb: (item: ItemFormatted) => void;

	constructor(
		app: App,
		clientID: string,
		type: ItemType,
		cb: (item: ItemFormatted) => void,
	) {
		super(app);
		this.isLoading = false;
		this.lastQuery = "";
		this.clientID = clientID;
		this.type = type;
		this.cb = cb;
		this.searchDebouncer = debounce(
			async (query: string, cb: (items: ItemFormatted[]) => void) => {
				if (query === "" || query === this.lastQuery) {
					return Promise.resolve([]);
				}

				this.lastQuery = query;

				const data = await searchItem(
					this.app,
					this.clientID,
					query,
					this.type,
				);

				if (!data) {
					return Promise.resolve([]);
				}

				let itemsFormatted;

				if (this.type === "track") {
					itemsFormatted = data.tracks.items.map((track: Track) =>
						processTrack(track),
					);
				} else {
					// is Album
					itemsFormatted = data.albums.items.map(
						(album: SimplifiedAlbum) =>
							processSimplifiedAlbum(album),
					);
				}

				this.isLoading = false;
				cb(itemsFormatted);
			},
			300,
			true,
		);
		this.inputEl.placeholder = `Search ${this.type === "track" ? "songs" : "albums"}...`;
	}

	// called when input is changed
	// reference: https://github.com/bbawj/obsidian-semantic-search/blob/45e2cc2e10b78bcc357287a4abc22a81df7ce36d/src/ui/linkSuggest.ts#L45
	async getSuggestions(query: string): Promise<ItemFormatted[]> {
		this.isLoading = true;
		return new Promise((resolve) => {
			this.searchDebouncer(query, (query) => {
				resolve(query);
			});
		});
	}

	renderSuggestion(item: ItemFormatted, el: HTMLElement) {
		el.addClass("track-container");
		const imageEl = el.createEl("img", { cls: "track-img" });

		imageEl.src = item.image.url;

		const trackTextContainer = el.createDiv("track-text-container");
		trackTextContainer.createEl("div", {
			text: item.name,
			cls: "item-title",
		});
		trackTextContainer.createEl("small", {
			text: item.artists.toString(),
		});
	}

	onChooseSuggestion(item: ItemFormatted, _evt: MouseEvent | KeyboardEvent) {
		// wrap async function in IIFE because onChooseSuggestion in superclass isn't async
		(async () => {
			showNotice(`Selected ${item.name}`);
			let resolved: ItemFormatted;

			if (item.type === "album") {
				if (!item.href) {
					throw new Error("Album href missing");
				}
				const fetchedAlbum = (await callEndpoint(
					this.app,
					this.clientID,
					item.href,
				)) as Album;
				resolved = processAlbum(fetchedAlbum);
			} else {
				resolved = item;
			}
			this.cb(resolved);
		})().catch((e) => {
			if (e instanceof Error) {
				showNotice(e.message, true);
			}
		});
	}
}
