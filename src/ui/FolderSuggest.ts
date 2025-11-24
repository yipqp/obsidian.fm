// reference: https://forum.obsidian.md/t/how-to-make-file-location-selector-for-plugins-settings-page/95325/3

import { App, AbstractInputSuggest } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<string> {
	private folders: string[];

	constructor(app: App, textInputEl: HTMLInputElement | HTMLDivElement) {
		super(app, textInputEl);
		this.folders = this.app.vault
			.getAllFolders(true) // includeRoot = true
			.map((folder) => folder.path);
	}

	protected getSuggestions(query: string): string[] | Promise<string[]> {
		const lowerCaseQuery = query.toLowerCase();
		return this.folders.filter((folder) =>
			folder.toLowerCase().includes(lowerCaseQuery),
		);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		this.setValue(value);
		super.selectSuggestion(value, evt); // need this to invoke the onSelect callback
		this.close();
	}
}
