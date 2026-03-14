import { ScrobbleModal } from "./ui/ScrobbleModal";
import { scrobbleItem } from "src/Scrobbler";
import { SearchModal } from "./ui/SearchModal";
import {
	getAuthUrl,
	getCurrentlyPlayingTrack,
	getRecentlyPlayed,
	isAuthenticated,
	processCurrentlyPlayingResponse,
	processRecentlyPlayed,
} from "./api";
import { ItemFormattedType, ItemType } from "types";
import { RecentSongsModal } from "./ui/RecentSongsModal";
import { showNotice } from "./utils";
import Scrobble from "./main";

export function registerCommands(plugin: Scrobble) {
	const scrobbleSearchedSong = (item: ItemFormattedType) => {
		try {
			new ScrobbleModal(
				plugin.app,
				plugin.settings,
				item,
				async (input: string, blockId: string) => {
					await scrobbleItem(
						plugin.app,
						plugin.settings,
						input,
						item,
						blockId,
					);
				},
			).open();
		} catch (e) {
			if (e instanceof Error) {
				showNotice(e.message, true);
			}
		}
	};

	const scrobbleCurrentlyPlaying = async (itemType: ItemType) => {
		try {
			const currentlyPlayingJson = await getCurrentlyPlayingTrack(
				plugin.app,
				plugin.settings.clientID,
			);
			const currentlyPlaying = await processCurrentlyPlayingResponse(
				plugin.app,
				plugin.settings.clientID,
				currentlyPlayingJson,
				itemType,
			);
			new ScrobbleModal(
				plugin.app,
				plugin.settings,
				currentlyPlaying,
				async (input: string, blockId: string) => {
					await scrobbleItem(
						plugin.app,
						plugin.settings,
						input,
						currentlyPlaying,
						blockId,
					);
				},
			).open();
		} catch (e) {
			if (e instanceof Error) {
				showNotice(e.message, true);
			}
		}
	};

	plugin.addCommand({
		id: "log-currently-playing-track",
		name: "Scrobble currently playing song",
		checkCallback: (checking: boolean) => {
			if (isAuthenticated(plugin.app)) {
				if (!checking) {
					void scrobbleCurrentlyPlaying("track");
				}
				return true;
			}
			return false;
		},
	});

	plugin.addCommand({
		id: "log-currently-playing-album",
		name: "Scrobble currently playing album",
		checkCallback: (checking: boolean) => {
			if (isAuthenticated(plugin.app)) {
				if (!checking) {
					void scrobbleCurrentlyPlaying("album");
				}
				return true;
			}
			return false;
		},
	});

	plugin.addCommand({
		id: "connect-spotify",
		name: "Connect Spotify",
		callback: async () => {
			const authUrl = await getAuthUrl(
				plugin.app,
				plugin.settings.clientID,
			);
			window.open(authUrl);
		},
	});

	plugin.addCommand({
		id: "search-track",
		name: "Search songs",
		checkCallback: (checking: boolean) => {
			if (isAuthenticated(plugin.app)) {
				if (!checking) {
					new SearchModal(
						plugin.app,
						plugin.settings.clientID,
						"track",
						scrobbleSearchedSong,
					).open();
				}
				return true;
			}
			return false;
		},
	});

	plugin.addCommand({
		id: "search-album",
		name: "Search albums",
		checkCallback: (checking: boolean) => {
			if (isAuthenticated(plugin.app)) {
				if (!checking) {
					new SearchModal(
						plugin.app,
						plugin.settings.clientID,
						"album",
						scrobbleSearchedSong,
					).open();
				}
				return true;
			}
			return false;
		},
	});

	plugin.addCommand({
		id: "search-recent-tracks",
		name: "Search recent songs",
		checkCallback: (checking: boolean) => {
			if (isAuthenticated(plugin.app)) {
				if (!checking) {
					void (async () => {
						try {
							const recentlyPlayed = await getRecentlyPlayed(
								plugin.app,
								plugin.settings.clientID,
							);
							const recentlyPlayedFormatted =
								processRecentlyPlayed(recentlyPlayed);
							new RecentSongsModal(
								plugin.app,
								recentlyPlayedFormatted,
								scrobbleSearchedSong,
							).open();
						} catch (e) {
							if (e instanceof Error) {
								showNotice(e.message, true);
							}
						}
					})();
				}
				return true;
			}
			return false;
		},
	});
}
