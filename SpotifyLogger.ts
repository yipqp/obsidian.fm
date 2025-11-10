import { App, MarkdownView, normalizePath, moment } from "obsidian";

const appendDate = async (app: App) => {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	const formattedDate = moment().format("D MMM YYYY, h:mma");
	const surroundChar = "*";

	const replacement = surroundChar + formattedDate + surroundChar + "\n\n\n"; // TODO: make customizable
	if (view) {
		const editor = view.editor;
		editor.replaceRange(replacement, {
			line: editor.lastLine() + 1,
			ch: 0,
		});
		editor.setCursor(editor.lastLine() - 2);
	}
};

export const logSong = async (app: App, folderPath: string, song) => {
	const album = song.album.name;
	const albumid = song.album.id;
	const artists = song.artists.map((artist) => artist.name).join(", ");
	const id = song.id; // file name
	const name = song.name;

	// check if file exists
	const filePath = normalizePath(folderPath + "/" + id + ".md");

	let file = app.vault.getFileByPath(filePath);

	if (!file) {
		file = await app.vault.create(filePath, "");
		/* edit frontmatter for https://github.com/snezhig/obsidian-front-matter-title
		 * this is to change the file display title, since the title is a unique spotify id
		 */
		try {
			app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter["title"] = name; // TODO: let user change which frontmatter should reflect display title?
				frontmatter["artists"] = artists;
				frontmatter["album"] = album;
				frontmatter["log count"] = 1;
				frontmatter["aliases"] = name;
			});
		} catch (e) {
			console.log(`Error: ${e}`);
		}
	} else {
		try {
			app.fileManager.processFrontMatter(
				file,
				(frontmatter) => (frontmatter["log count"] += 1),
			);
			await new Promise((r) => setTimeout(r, 10)); // TODO: find a different workaround?? this was added to prevent "note modified externally, merging changes automatically"
		} catch (e) {
			console.log(`Error: ${e}`);
		}
	}

	// if file is currently active, don't open file
	const activeFile = app.workspace.getActiveFile();

	if (!activeFile || activeFile.path != filePath) {
		await app.workspace.getLeaf().openFile(file);
	}

	appendDate(app);
	// Make sure the user is editing a Markdown file.
};
