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
				}),
			);

		new Setting(containerEl).setName("Folder path").addSearch((search) => {
			const saveFolderPath = async (value: string) => {
				this.plugin.settings.folderPath = value;
				await this.plugin.saveSettings();
			};

			/* user can ignore folder suggestions and input nonexisting folder
			 * keep this to trust that user will eventually create the folder
			 * but need to check when before adding new song log if folder exists
			 */

			search
				.setPlaceholder("Enter folder path")
				.setValue(this.plugin.settings.folderPath)
				.onChange(saveFolderPath); // ignores folder suggestion

			const fs = new FolderSuggest(this.app, search.inputEl);

			fs.onSelect(async () => await saveFolderPath(search.getValue()));
		});

		new Setting(containerEl)
			.setName("Create new file for each track when logging albums")
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.logAlbumAlwaysCreateNewTrackFiles,
					)
					.onChange(async (value) => {
						this.plugin.settings.logAlbumAlwaysCreateNewTrackFiles =
							value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName("New File Frontmatter Preferences")
			.setHeading();

		new Setting(containerEl)
			.setName("type (ex. type: Album | Track)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showType)
					.onChange(async (value) => {
						this.plugin.settings.showType = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl).setName("duration").addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.showDuration)
				.onChange(async (value) => {
					this.plugin.settings.showDuration = value;
					await this.plugin.saveSettings();
					this.display();
				}),
		);

		new Setting(containerEl)
			.setName("album release date")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showAlbumReleaseDate)
					.onChange(async (value) => {
						this.plugin.settings.showAlbumReleaseDate = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl).setName("tags").addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.showTags)
				.onChange(async (value) => {
					this.plugin.settings.showTags = value;
					await this.plugin.saveSettings();
					this.display();
				}),
		);
	}
}
