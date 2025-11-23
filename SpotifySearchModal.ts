import { App, debounce, Debouncer, Notice, SuggestModal } from "obsidian";
import { processTrack, searchTrack } from "api";
import { Image, Track, TrackFormatted, Tracks } from "types";

export class SpotifySearchModal extends SuggestModal<TrackFormatted> {
	isLoading: boolean;
	lastQuery: string;
	searchDebouncer: Debouncer<
		[query: string, cb: (tracks: TrackFormatted[]) => void],
		void
	>;
	cb: (track: TrackFormatted) => Promise<void>;

	constructor(app: App, cb: (track: TrackFormatted) => Promise<void>) {
		super(app);
		this.isLoading = false;
		this.lastQuery = "";
		this.cb = cb;
		this.searchDebouncer = debounce(
			async (query: string, cb: (tracks: TrackFormatted[]) => void) => {
				if (query === "" || query === this.lastQuery) {
					return Promise.resolve([]);
				}

				this.lastQuery = query;

				console.log("calling search api");

				let data;

				try {
					data = await searchTrack(query);
				} catch (err) {
					throw err;
				}

				if (!data) {
					console.log("no data");
					return Promise.resolve([]);
				}

				const tracks: TrackFormatted[] = data.tracks.items.map(
					(track: Track) => processTrack(track),
				);

				// console.log(JSON.stringify(tracks, null, 2));
				this.isLoading = false;
				cb(tracks);
			},
			300,
			true,
		);
	}

	// called when input is changed
	// reference: https://github.com/bbawj/obsidian-semantic-search/blob/45e2cc2e10b78bcc357287a4abc22a81df7ce36d/src/ui/linkSuggest.ts#L45
	async getSuggestions(query: string): Promise<TrackFormatted[]> {
		//TODO: handle not authenticated. ideally in main before opening this modal?
		this.isLoading = true;
		return new Promise((resolve) => {
			this.searchDebouncer(query, (query) => {
				resolve(query);
			});
		});
	}

	renderSuggestion(track: TrackFormatted, el: HTMLElement) {
		el.addClass("track-container");
		const imageEl = el.createEl("img", { cls: "track-img" });

		imageEl.src = track.image.url;
		imageEl.width = 50 || track.image.width; // TODO: figure out best way to handle img sizing
		imageEl.height = 50 || track.image.height;

		const trackTextContainer = el.createDiv("track-text-container");
		trackTextContainer.createEl("div", {
			text: track.name,
			cls: "track-title",
		});
		trackTextContainer.createEl("small", {
			text: track.artists.toString(),
		});
	}

	async onChooseSuggestion(
		track: TrackFormatted,
		evt: MouseEvent | KeyboardEvent,
	) {
		new Notice(`Selected ${track.name}`);
		await this.cb(track);
	}
}
