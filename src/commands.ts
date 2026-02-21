import { Notice } from "obsidian";
import { SpotifyLogModal } from "./ui/SpotifyLogModal";
import { logPlaying } from "src/SpotifyLogger";
import { SpotifySearchModal } from "./ui/SpotifySearchModal";
import {
	getAuthUrl,
	getCurrentlyPlayingTrack,
	isAuthenticated,
	processCurrentlyPlayingResponse,
} from "./api";
import SpotifyLogger from "./main";
import { PlayingTypeFormatted, PlayingType } from "types";

export function registerCommands(plugin: SpotifyLogger) {
	const searchItemCb = async (item: PlayingTypeFormatted) => {
		try {
			new SpotifyLogModal(
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
			const message = `[Spotify Logger] Error: ${err.message}`;
			new Notice(`${message}`, 3000);
		}
	};

	const logCurrentlyPlayingCb = async (playingType: PlayingType) => {
		try {
			const currentlyPlayingJson = await getCurrentlyPlayingTrack();
			const currentlyPlaying = (await processCurrentlyPlayingResponse(
				currentlyPlayingJson,
				playingType,
			)) as PlayingTypeFormatted;
			new SpotifyLogModal(
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
			const message = `[Spotify Logger] Error: ${err.message}`;
			new Notice(`${message}`, 3000);
		}
	};

	plugin.addCommand({
		id: "log-currently-playing-track",
		name: "Log currently playing track",
		callback: async () => {
			await logCurrentlyPlayingCb("Track");
		},
	});

	plugin.addCommand({
		id: "log-currently-playing-album",
		name: "Log currently playing album",
		callback: async () => {
			await logCurrentlyPlayingCb("Album");
		},
	});

	plugin.addCommand({
		id: "connect-spotify",
		name: "Connect Spotify",
		callback: async () => {
			const authUrl = await getAuthUrl();
			if (!authUrl) {
				// do something
				console.log("Error: auth url missing?");
				return;
			}
			window.open(authUrl);
		},
	});

	plugin.addCommand({
		id: "search-track",
		name: "Search track",
		callback: async () => {
			if (!isAuthenticated()) {
				new Notice("Please connect your Spotify account", 3000);
				return;
			}
			new SpotifySearchModal(plugin.app, "Track", searchItemCb).open();
		},
	});

	plugin.addCommand({
		id: "search-album",
		name: "Search album",
		callback: async () => {
			if (!isAuthenticated()) {
				new Notice("Please connect your Spotify account", 3000);
				return;
			}
			new SpotifySearchModal(plugin.app, "Album", searchItemCb).open();
		},
	});

	plugin.addCommand({
		id: "temp",
		name: "test",
		callback: () => {
			// const curFile = plugin.app.workspace.getActiveFile();
			// if (!curFile) return;
			// updateAlbumFrontmatter(plugin.app, curFile, "replaceMe");
		},
	});
}
