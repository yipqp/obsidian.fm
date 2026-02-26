import { LogModal } from "./ui/LogModal";
import { logPlaying } from "src/SpotifyLogger";
import { SearchModal } from "./ui/SearchModal";
import {
	getAuthUrl,
	getCurrentlyPlayingTrack,
	getRecentlyPlayed,
	processCurrentlyPlayingResponse,
	processRecentlyPlayed,
} from "./api";
import { PlayingTypeFormatted, PlayingType } from "types";
import { RecentSongsModal } from "./ui/RecentSongsModal";
import { requireAuth, showNotice } from "./utils";
import ObsidianFM from "./main";

export function registerCommands(plugin: ObsidianFM) {
	const logSearchedSong = async (item: PlayingTypeFormatted) => {
		try {
			new LogModal(
				plugin.app,
				plugin.settings,
				item,
				async (input: string, blockId: string) => {
					await logPlaying(
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

	const logCurrentlyPlayingCb = async (playingType: PlayingType) => {
		try {
			const currentlyPlayingJson = await getCurrentlyPlayingTrack();
			const currentlyPlaying = await processCurrentlyPlayingResponse(
				currentlyPlayingJson,
				playingType,
			);
			new LogModal(
				plugin.app,
				plugin.settings,
				currentlyPlaying,
				async (input: string, blockId: string) => {
					await logPlaying(
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
		id: "log-currently-playing-track",
		name: "Log currently playing song",
		callback: requireAuth(async () => {
			await logCurrentlyPlayingCb("Track");
		}),
	});

	plugin.addCommand({
		id: "log-currently-playing-album",
		name: "Log currently playing album",
		callback: requireAuth(async () => {
			await logCurrentlyPlayingCb("Album");
		}),
	});

	plugin.addCommand({
		id: "connect-spotify",
		name: "Connect Spotify",
		callback: async () => {
			const authUrl = await getAuthUrl();
			window.open(authUrl);
		},
	});

	plugin.addCommand({
		id: "search-track",
		name: "Search songs",
		callback: requireAuth(async () => {
			new SearchModal(plugin.app, "Track", logSearchedSong).open();
		}),
	});

	plugin.addCommand({
		id: "search-album",
		name: "Search albums",
		callback: requireAuth(async () => {
			new SearchModal(plugin.app, "Album", logSearchedSong).open();
		}),
	});

	plugin.addCommand({
		id: "search-recent-tracks",
		name: "Search recent songs",
		callback: requireAuth(async () => {
			const recentlyPlayed = await getRecentlyPlayed();
			const recentlyPlayedFormatted =
				processRecentlyPlayed(recentlyPlayed);
			new RecentSongsModal(
				plugin.app,
				recentlyPlayedFormatted,
				logSearchedSong,
			).open();
		}),
	});
}
