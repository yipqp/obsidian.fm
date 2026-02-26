import {
	App,
	FuzzyMatch,
	FuzzySuggestModal,
	Notice,
	renderResults,
} from "obsidian";
import { showNotice } from "src/utils";
import { TrackFormatted } from "types";

export class RecentSongsModal extends FuzzySuggestModal<TrackFormatted> {
	cb: (item: TrackFormatted) => Promise<void>;
	recentSongs: TrackFormatted[];

	constructor(
		app: App,
		recentSongs: TrackFormatted[],
		cb: (item: TrackFormatted) => Promise<void>,
	) {
		super(app);
		this.recentSongs = recentSongs;
		this.cb = cb;
		this.inputEl.placeholder = "Search recent songs...";
	}

	getItems(): TrackFormatted[] {
		return this.recentSongs;
	}

	getItemText(item: TrackFormatted): string {
		return item.name + " " + item.artists;
	}

	async onChooseItem(item: TrackFormatted, _evt: MouseEvent | KeyboardEvent) {
		showNotice(`Selected ${item.name}`);
		await this.cb(item);
	}

	renderSuggestion(match: FuzzyMatch<TrackFormatted>, el: HTMLElement): void {
		el.addClass("track-container");

		const imageEl = el.createEl("img", { cls: "track-img" });
		imageEl.src = match.item.image.url;

		const trackTextContainer = el.createDiv("track-text-container");

		const trackTitle = trackTextContainer.createEl("div", {
			cls: "item-title",
		});
		renderResults(trackTitle, match.item.name, match.match);

		const trackArtists = trackTextContainer.createEl("small");

		// https://docs.obsidian.md/Plugins/User+interface/Modals#Custom%20rendering%20of%20fuzzy%20search%20results
		// without offset, the rendered match for artists will make no sense
		const offset = -(match.item.name.length + 1);
		renderResults(trackArtists, match.item.artists, match.match, offset);
	}
}
