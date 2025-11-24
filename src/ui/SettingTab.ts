import { App, PluginSettingTab, Setting } from "obsidian";
import { FolderSuggest } from "src/ui/FolderSuggest";
import { getAuthUrl } from "src/api";
import SpotifyLogger from "src/main";

export class SettingTab extends PluginSettingTab {
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
				})
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
