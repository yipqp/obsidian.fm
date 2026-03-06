import { ScrobbleModal } from "./ui/ScrobbleModal";
import { scrobbleItem } from "src/Scrobbler";
import { SearchModal } from "./ui/SearchModal";
import {
	getAuthUrl,
	getCurrentlyPlayingTrack,
	getRecentlyPlayed,
	processCurrentlyPlayingResponse,
	processRecentlyPlayed,
} from "./api";
import { ItemFormatted, ItemType } from "types";
import { RecentSongsModal } from "./ui/RecentSongsModal";
import { requireAuth, showNotice } from "./utils";
import Scrobble from "./main";

export function registerCommands(plugin: Scrobble) {
	const scrobbleSearchedSong = async (item: ItemFormatted) => {
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
		} catch (err) {
			showNotice(err.message, true);
		}
	};

	const scrobbleCurrentlyPlaying = async (itemType: ItemType) => {
		try {
			const currentlyPlayingJson = await getCurrentlyPlayingTrack(
				plugin.app,
			);
			const currentlyPlaying = await processCurrentlyPlayingResponse(
				plugin.app,
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
		} catch (err) {
			showNotice(err.message, true);
		}
	};

	plugin.addCommand({
		id: "scrobble-currently-playing-track",
		name: "Scrobble currently playing song",
		callback: requireAuth(plugin.app, async () => {
			await scrobbleCurrentlyPlaying("Track");
		}),
	});

	plugin.addCommand({
		id: "scrobble-currently-playing-album",
		name: "Scrobble currently playing album",
		callback: requireAuth(plugin.app, async () => {
			await scrobbleCurrentlyPlaying("Album");
		}),
	});

	plugin.addCommand({
		id: "connect-spotify",
		name: "Connect Spotify",
		callback: async () => {
			const authUrl = await getAuthUrl(plugin.app);
			window.open(authUrl);
		},
	});

	plugin.addCommand({
		id: "search-track",
		name: "Search songs",
		callback: requireAuth(plugin.app, async () => {
			new SearchModal(plugin.app, "Track", scrobbleSearchedSong).open();
		}),
	});

	plugin.addCommand({
		id: "search-album",
		name: "Search albums",
		callback: requireAuth(plugin.app, async () => {
			new SearchModal(plugin.app, "Album", scrobbleSearchedSong).open();
		}),
	});

	plugin.addCommand({
		id: "search-recent-tracks",
		name: "Search recent songs",
		callback: requireAuth(plugin.app, async () => {
			// TODO: change requireAuth callbacks ..
			const recentlyPlayed = await getRecentlyPlayed(plugin.app);
			const recentlyPlayedFormatted =
				processRecentlyPlayed(recentlyPlayed);
			new RecentSongsModal(
				plugin.app,
				recentlyPlayedFormatted,
				scrobbleSearchedSong,
			).open();
		}),
	});
}
