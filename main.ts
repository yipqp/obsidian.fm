import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { getAuthUrl, handleAuth, getCurrentlyPlayingTrack } from "api";
import { FolderSuggest } from "FolderSuggest";
import { logSong } from "SpotifyLogger";

interface MyPluginSettings {
	spotifyLoggerFolderPath: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	spotifyLoggerFolderPath: "songs/",
};

export default class SpotifyLogger extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerObsidianProtocolHandler("spotify-auth", async (e) => {
			handleAuth(e);
		});

		this.addCommand({
			id: "log-currently-playing-track",
			name: "Log current playing track",
			callback: async () => {
				console.log("log current playing track");
				const data = await getCurrentlyPlayingTrack();
				console.log(data);
				logSong(this.app, this.settings.spotifyLoggerFolderPath, data);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

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

class SampleSettingTab extends PluginSettingTab {
	plugin: SpotifyLogger;

	constructor(app: App, plugin: SpotifyLogger) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Authenticate Spotify")
			.setDesc("Connect Spotify Account")
			.addButton((button) =>
				button.setButtonText("Authorize").onClick(async () => {
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
				.onChange(saveFolderPath); // <-- ignores folder suggestion

			const fs = new FolderSuggest(this.app, search.inputEl);

			fs.onSelect(async () => await saveFolderPath(search.getValue()));
		});
	}
}
