import { App, PluginSettingTab, Setting } from "obsidian";
import { FolderSuggest } from "src/ui/FolderSuggest";
import { getAuthUrl } from "src/api";
import Scrobble from "src/main";

export class SettingTab extends PluginSettingTab {
	plugin: Scrobble;

	constructor(app: App, plugin: Scrobble) {
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
			.setName("Create new note for each track when scrobbling albums")
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings
							.scrobbleAlbumAlwaysCreatesNewTrackFiles,
					)
					.onChange(async (value) => {
						this.plugin.settings.scrobbleAlbumAlwaysCreatesNewTrackFiles =
							value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName("New note frontmatter preferences")
			.setHeading();

		new Setting(containerEl)
			.setName("Type")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showType)
					.onChange(async (value) => {
						this.plugin.settings.showType = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.setDesc(`Insert "type" property, e.g. "Album" or "Track"`);

		new Setting(containerEl)
			.setName("Duration")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showDuration)
					.onChange(async (value) => {
						this.plugin.settings.showDuration = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.setDesc(`Insert "duration" property, e.g. 5:20`);

		new Setting(containerEl)
			.setName("Album release date")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showAlbumReleaseDate)
					.onChange(async (value) => {
						this.plugin.settings.showAlbumReleaseDate = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.setDesc(`Insert "release date" property, e.g. 08/30/2011 or 2001`);

		new Setting(containerEl)
			.setName("Tags")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showTags)
					.onChange(async (value) => {
						this.plugin.settings.showTags = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.setDesc(`Insert empty "tags" property`);

		new Setting(containerEl)
			.setName("Aliases: Show artists")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.aliasShowArtists)
					.onChange(async (value) => {
						this.plugin.settings.aliasShowArtists = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.setDesc(`//TODO`);

		new Setting(containerEl) //TODO: move to diff header?
			.setName("Wikilinks: Show artists")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.wikilinkShowArtists)
					.onChange(async (value) => {
						this.plugin.settings.wikilinkShowArtists = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.setDesc(`//TODO`);
	}
}
