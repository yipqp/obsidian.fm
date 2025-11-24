import { Plugin } from "obsidian";
import { handleAuth } from "src/api";
import { DEFAULT_SETTINGS, defaultSettings } from "./settings";
import { registerCommands } from "./commands";
import { SettingTab } from "./ui/SettingTab";

export default class SpotifyLogger extends Plugin {
	settings: defaultSettings;

	async onload() {
		await this.loadSettings();
		this.registerObsidianProtocolHandler("spotify-auth", async (e) => {
			handleAuth(e);
		});
		registerCommands(this);
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
