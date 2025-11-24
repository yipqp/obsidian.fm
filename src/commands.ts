import { Notice } from "obsidian";
import { SpotifyLogModal } from "./ui/SpotifyLogModal";
import { logSong } from "src/SpotifyLogger";
import { SpotifySearchModal } from "./ui/SpotifySearchModal";
import { getAuthUrl, getCurrentlyPlayingTrack, isAuthenticated } from "./api";
import SpotifyLogger from "./main";

export function registerCommands(plugin: SpotifyLogger) {
	plugin.addCommand({
		id: "log-currently-playing-track",
		name: "Log current playing track",
		callback: async () => {
			try {
				const currentlyPlaying = await getCurrentlyPlayingTrack();
				new SpotifyLogModal(
					plugin.app,
					currentlyPlaying,
					plugin.settings.spotifyLoggerFolderPath,
					async (input: string, blockId: string) => {
						await logSong(
							plugin.app,
							plugin.settings.spotifyLoggerFolderPath,
							input,
							currentlyPlaying,
							blockId
						);
					}
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
			new SpotifySearchModal(plugin.app).open(); //TODO: REMOVE THIS OR ADD THE SECOND PARAM
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
