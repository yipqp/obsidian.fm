import { Plugin } from "obsidian";
import { handleAuth, setCodeVerifier } from "src/api";
import { registerCommands } from "./commands";
import { SettingTab } from "./ui/SettingTab";
import { SCROBBLE_DEFAULT_SETTINGS, scrobbleDefaultSettings } from "./settings";

export default class Scrobble extends Plugin {
	settings: scrobbleDefaultSettings;

	async onload() {
		await this.loadSettings();
		this.registerObsidianProtocolHandler(
			"scrobble-spotify-auth",
			async (e) => {
				await handleAuth(this.app, this.settings.clientID, e);
			},
		);
		registerCommands(this);
		this.addSettingTab(new SettingTab(this.app, this));
		setCodeVerifier(this.app);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			SCROBBLE_DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<scrobbleDefaultSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
