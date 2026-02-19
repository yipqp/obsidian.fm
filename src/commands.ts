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
import { AlbumFormatted, TrackFormatted } from "types";

export function registerCommands(plugin: SpotifyLogger) {
	const searchItemCb = async (item: TrackFormatted | AlbumFormatted) => {
		try {
			new SpotifyLogModal(
				plugin.app,
				item,
				plugin.settings.spotifyLoggerFolderPath,
				async (input: string, blockId: string) => {
					await logPlaying(
						plugin.app,
						plugin.settings.spotifyLoggerFolderPath,
						input,
						item,
						plugin.settings.logAlbumAlwaysCreateNewTrackFiles,
						blockId,
					);
				},
				plugin.settings.logAlbumAlwaysCreateNewTrackFiles,
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
			try {
				const currentlyPlaying = await getCurrentlyPlayingTrack();
				const track = (await processCurrentlyPlayingResponse(
					currentlyPlaying,
					"Track",
				)) as TrackFormatted;
				new SpotifyLogModal(
					plugin.app,
					track,
					plugin.settings.spotifyLoggerFolderPath,
					async (input: string, blockId: string) => {
						await logPlaying(
							plugin.app,
							plugin.settings.spotifyLoggerFolderPath,
							input,
							track,
							plugin.settings.logAlbumAlwaysCreateNewTrackFiles,
							blockId,
						);
					},
					plugin.settings.logAlbumAlwaysCreateNewTrackFiles,
				).open();
			} catch (err) {
				const message = `[Spotify Logger] Error: ${err.message}`;
				new Notice(`${message}`, 3000);
			}
		},
	});

	plugin.addCommand({
		id: "log-currently-playing-album",
		name: "Log currently playing album",
		callback: async () => {
			try {
				const currentlyPlaying = await getCurrentlyPlayingTrack();
				const album = (await processCurrentlyPlayingResponse(
					currentlyPlaying,
					"Album",
				)) as AlbumFormatted;
				new SpotifyLogModal(
					plugin.app,
					album,
					plugin.settings.spotifyLoggerFolderPath,
					async (input: string, blockId: string) => {
						await logPlaying(
							plugin.app,
							plugin.settings.spotifyLoggerFolderPath,
							input,
							album,
							plugin.settings.logAlbumAlwaysCreateNewTrackFiles,
							blockId,
						);
					},
					plugin.settings.logAlbumAlwaysCreateNewTrackFiles,
				).open();
			} catch (err) {
				const message = `[Spotify Logger] Error: ${err.message}`;
				new Notice(`${message}`, 3000);
			}
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
			const curFile = plugin.app.workspace.getActiveFile();
			if (!curFile) return;
			console.log(plugin.app.metadataCache.getFileCache(curFile));
		},
	});
}
