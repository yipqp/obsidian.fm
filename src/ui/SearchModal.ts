import { App, debounce, Debouncer, Notice, SuggestModal } from "obsidian";
import {
	processAlbum,
	processTrack,
	searchItem,
	callEndpoint,
	processSimplifiedAlbum,
} from "src/api";
import { showNotice } from "src/utils";
import {
	PlayingType,
	Track,
	TrackFormatted,
	AlbumFormatted,
	SimplifiedAlbum,
	MinimalItem,
} from "types";

export class SearchModal extends SuggestModal<MinimalItem> {
	isLoading: boolean;
	lastQuery: string;
	searchDebouncer: Debouncer<
		[query: string, cb: (items: MinimalItem[]) => void],
		void
	>;
	cb: (item: TrackFormatted | AlbumFormatted) => Promise<void>;
	type: PlayingType;

	constructor(
		app: App,
		type: PlayingType,
		cb: (item: MinimalItem) => Promise<void>,
	) {
		super(app);
		this.isLoading = false;
		this.lastQuery = "";
		this.cb = cb;
		this.type = type;
		this.searchDebouncer = debounce(
			async (query: string, cb: (items: MinimalItem[]) => void) => {
				if (query === "" || query === this.lastQuery) {
					return Promise.resolve([]);
				}

				this.lastQuery = query;

				const data = await searchItem(query, this.type);

				if (!data) {
					return Promise.resolve([]);
				}

				let itemsFormatted;

				if (this.type === "Track") {
					itemsFormatted = data.tracks.items.map((track: Track) =>
						processTrack(track),
					);
				} else if (this.type === "Album") {
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
		this.inputEl.placeholder = `Search ${this.type === "Track" ? "songs" : "albums"}...`;
	}

	// called when input is changed
	// reference: https://github.com/bbawj/obsidian-semantic-search/blob/45e2cc2e10b78bcc357287a4abc22a81df7ce36d/src/ui/linkSuggest.ts#L45
	async getSuggestions(query: string): Promise<MinimalItem[]> {
		this.isLoading = true;
		return new Promise((resolve) => {
			this.searchDebouncer(query, (query) => {
				resolve(query);
			});
		});
	}

	renderSuggestion(item: MinimalItem, el: HTMLElement) {
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

	async onChooseSuggestion(
		item: MinimalItem,
		_evt: MouseEvent | KeyboardEvent,
	) {
		showNotice(`Selected ${item.name}`);
		let resolved: TrackFormatted | AlbumFormatted;

		if (item.type === "Album") {
			if (!item.href) {
				throw new Error("Album href missing");
			}
			const fetchedAlbum = await callEndpoint(item.href);
			resolved = processAlbum(fetchedAlbum) as AlbumFormatted;
		} else {
			resolved = item as TrackFormatted;
		}
		await this.cb(resolved);
	}
}
