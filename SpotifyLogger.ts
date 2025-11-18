import { App, normalizePath, moment } from "obsidian";
import { formatMs } from "utils";

const formatInput = (input: String, progressMs: string) => {
	const date = moment().format("D MMM YYYY, h:mma");
	const progress = formatMs(progressMs);
	const surroundChar = "**";
	const formattedinput = `${surroundChar}${date}${surroundChar}

${input}
*${progress}*

---

`;
	return formattedinput;
};

const appendInput = async (
	app: App,
	filePath: string,
	input: string,
	progressMs: string,
) => {
	const file = app.vault.getFileByPath(filePath);
	if (!file) {
		console.log(`Error: file ${filePath} could not be found`);
		return;
	}
	const formattedinput = formatInput(input, progressMs);
	app.vault.append(file, formattedinput);

	// const view = app.workspace.getActiveViewOfType(MarkdownView);
	// if (view) {
	// 	const editor = view.editor;
	// 	editor.replaceRange(formattedinput, {
	// 		line: editor.lastLine() + 1,
	// 		ch: 0,
	// 	});
	// 	editor.setCursor(editor.lastLine() - 1);
	// }
};

// creates new song file in folder path if not exist
// returns the song file
export const createSongFile = async (app: App, folderPath: string, song) => {
	const album = song.album.name;
	const albumid = song.album.id;
	const artists = song.artists.map((artist) => artist.name).join(", ");
	const id = song.id; // file name
	const name = song.name;
	const duration = formatMs(song.duration_ms);

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
				frontmatter["duration"] = duration;
				// frontmatter["log count"] = 1;
				frontmatter["aliases"] = name;
			});
		} catch (e) {
			console.log(`Error: ${e}`);
		}
	} // else {
	// 	try {
	// 		app.fileManager.processFrontMatter(
	// 			file,
	// 			(frontmatter) => (frontmatter["log count"] += 1),
	// 		);
	// 		await new Promise((r) => setTimeout(r, 10)); // TODO: find a different workaround?? this was added to prevent "note modified externally, merging changes automatically"
	// 	} catch (e) {
	// 		console.log(`Error: ${e}`);
	// 	}
	// }

	return file;
};

export const logSong = async (
	app: App,
	folderPath: string,
	input: string,
	currentlyPlaying,
) => {
	const song = currentlyPlaying.item;
	const progressMs = currentlyPlaying.progress_ms;

	const file = await createSongFile(app, folderPath, song);
	const filePath = file.path;

	await appendInput(app, filePath, input, progressMs);

	// if file is currently active, don't open file
	const activeFile = app.workspace.getActiveFile();

	if (!activeFile || activeFile.path != filePath) {
		await app.workspace.getLeaf().openFile(file);
	}
};
