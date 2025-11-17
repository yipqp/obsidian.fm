import { App, debounce, Debouncer, Notice, SuggestModal } from "obsidian";
import { searchTrack } from "api";

//TODO: move types to new file
interface Song {
	name: string;
	artists: string[];
	id: string;
	image: Image;
}

export interface Image {
	url: string;
	height: number;
	width: number;
}

const img: Image = {
	url: "https://i.scdn.co/image/ab67616d000048510dea455846b0633093676c60",
	height: 50,
	width: 50,
};

const CONST_SONGS: Song[] = [
	{ name: "Stereo Boy", artists: ["FKA twigs"], id: "temp", image: img },
	{ name: "Video", artists: ["Jane Remover"], id: "temp", image: img },
	{ name: "Jaded", artists: ["Malibu"], id: "temp", image: img },
	{ name: "Another High", artists: ["Malibu"], id: "temp", image: img },
	{ name: "Amnesia", artists: ["fakemink"], id: "temp", image: img },
	{ name: "Hoover", artists: ["Yung Lean"], id: "temp", image: img },
	{ name: "Gnaw", artists: ["Alex G"], id: "temp", image: img },
	{ name: "choke enough", artists: ["Oklou"], id: "temp", image: img },
	{ name: "x w x", artists: ["yeule"], id: "temp", image: img },
];

export class SpotifySearchModal extends SuggestModal<Song> {
	isLoading: boolean;
	lastQuery: string;
	searchDebouncer: Debouncer<
		[query: string, cb: (songs: Song[]) => void],
		void
	>;

	constructor(app: App) {
		super(app);
		this.isLoading = false;
		this.lastQuery = "";
		this.searchDebouncer = debounce(
			async (query: string, cb: (songs: Song[]) => void) => {
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

				const items = data.tracks.items;
				const songs: Song[] = items.map((item) => {
					const images = item.album.images;
					const smallest = images[images.length - 1];
					return {
						name: item.name,
						artists: item.artists.map((artist) => artist.name),
						id: item.id,
						image: smallest,
					};
				});

				// console.log(JSON.stringify(songs, null, 2));
				this.isLoading = false;
				cb(songs);
			},
			300,
			true,
		);
	}

	// called when input is changed
	// reference: https://github.com/bbawj/obsidian-semantic-search/blob/45e2cc2e10b78bcc357287a4abc22a81df7ce36d/src/ui/linkSuggest.ts#L45
	async getSuggestions(query: string): Promise<Song[]> {
		//TODO: handle not authenticated. ideally in main before opening this modal?
		this.isLoading = true;
		return new Promise((resolve) => {
			this.searchDebouncer(query, (query) => {
				resolve(query);
			});
		});
	}

	renderSuggestion(song: Song, el: HTMLElement) {
		el.addClass("song-container");
		const imageEl = el.createEl("img", { cls: "song-img" });
		imageEl.src = song.image.url;
		imageEl.width = 50 || song.image.width; // TODO: figure out best way to handle img sizing
		imageEl.height = 50 || song.image.height;
		const songTextContainer = el.createDiv("song-text-container");
		songTextContainer.createEl("div", {
			text: song.name,
			cls: "song-title",
		});
		songTextContainer.createEl("small", { text: song.artists.toString() });
	}

	onChooseSuggestion(song: Song, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${song.name}`);
	}
}
