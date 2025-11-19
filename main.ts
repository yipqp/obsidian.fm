import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import {
	getAuthUrl,
	getCurrentlyPlayingTrack,
	handleAuth,
	isAuthenticated,
} from "api";
import { FolderSuggest } from "FolderSuggest";
import { SpotifyLogModal } from "SpotifyLogModal";
import { logSong } from "SpotifyLogger";
import { SpotifySearchModal } from "SpotifySearchModal";

interface defaultSettings {
	spotifyLoggerFolderPath: string;
}

const DEFAULT_SETTINGS: defaultSettings = {
	spotifyLoggerFolderPath: "songs/",
};

export default class SpotifyLogger extends Plugin {
	settings: defaultSettings;

	async onload() {
		await this.loadSettings();
		this.registerObsidianProtocolHandler("spotify-auth", async (e) => {
			handleAuth(e);
		});

		this.addCommand({
			id: "log-currently-playing-track",
			name: "Log current playing track",
			callback: async () => {
				try {
					const currentlyPlaying = await getCurrentlyPlayingTrack();
					new SpotifyLogModal(
						this.app,
						currentlyPlaying,
						async (result: string) => {
							await logSong(
								this.app,
								this.settings.spotifyLoggerFolderPath,
								result,
								currentlyPlaying,
							);
						},
					).open();
				} catch (err) {
					const message = `[Spotify Logger] Error: ${err.message}`;
					new Notice(`${message}`, 3000);
				}
			},
		});

		this.addCommand({
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

		this.addCommand({
			id: "search-track",
			name: "Search track",
			callback: async () => {
				if (!isAuthenticated()) {
					new Notice("Please connect your Spotify account", 3000);
					return;
				}
				new SpotifySearchModal(this.app).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: SpotifyLogger;

	constructor(app: App, plugin: SpotifyLogger) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Connect Spotify")
			.addButton((button) =>
				button.setButtonText("Connect").onClick(async () => {
					const authUrl = await getAuthUrl();
					if (!authUrl) {
						// do something
					}
					window.open(authUrl);
				}),
			);

		new Setting(containerEl).setName("Folder path").addSearch((search) => {
			const saveFolderPath = async (value: string) => {
				this.plugin.settings.spotifyLoggerFolderPath = value;
				await this.plugin.saveSettings();
			};

			/* user can ignore folder suggestions and input nonexisting folder
			 * keep this to trust that user will eventually create the folder
			 * but need to check when before adding new song log if folder exists
			 */

			search
				.setPlaceholder("Enter folder path")
				.setValue(this.plugin.settings.spotifyLoggerFolderPath)
				.onChange(saveFolderPath); // ignores folder suggestion

			const fs = new FolderSuggest(this.app, search.inputEl);

			fs.onSelect(async () => await saveFolderPath(search.getValue()));
		});
	}
}
