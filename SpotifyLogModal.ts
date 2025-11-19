import { processCurrentlyPlayingResponse } from "api";
import { App, Modal, Setting } from "obsidian";

export class SpotifyLogModal extends Modal {
	constructor(
		app: App,
		currentlyPlaying,
		onSubmit: (result: string) => void,
	) {
		super(app);

		const songInfo = processCurrentlyPlayingResponse(currentlyPlaying);
		const title = `${songInfo.artists} - ${songInfo.name}`;
		this.setTitle(title);

		let input = "";

		// use text or textArea?
		const inputSetting = new Setting(this.contentEl).addText((text) => {
			text.inputEl.addClass("spotify-log-modal-input");
			text.inputEl.addEventListener("keydown", (event) => {
				if (!event.isComposing && event.key === "Enter") {
					event.preventDefault();
					onSubmit(input);
					this.close();
				}
			});
			text.onChange((value) => {
				input = value;
			});
		});

		inputSetting.settingEl.addClass("spotify-log-modal-input-container");
		inputSetting.settingEl.createEl("div", {
			text: songInfo.progress,
			cls: "spotify-log-modal-progress",
		});

		// remove because prevents text area from taking full width
		inputSetting.infoEl.remove();

		new Setting(this.contentEl).addButton((btn) =>
			btn
				.setButtonText("Save")
				.setCta() // "set call to action" (changes button style)
				.onClick(() => {
					onSubmit(input);
					this.close();
				}),
		);
	}
}
