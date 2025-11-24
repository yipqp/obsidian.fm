import { processCurrentlyPlayingResponse } from "src/api";
import { App, normalizePath, moment } from "obsidian";
import { PlaybackState, TrackFormatted } from "types";

const formatInput = (
	input: String,
	progress: string,
	blockId?: string,
	referenceLink?: string
) => {
	const date = moment().format("D MMM YYYY, h:mma");
	const surroundChar = "**";
	const formattedinput = `${surroundChar}${date}${surroundChar}

${input} ${blockId ? `^${blockId}` : ""}

*${referenceLink ? `${referenceLink}, ` : ""}${progress}*

---

`;
	return formattedinput;
};

export const appendInput = async (
	app: App,
	filePath: string,
	input: string,
	progress: string,
	blockId?: string,
	referenceLink?: string
) => {
	const file = app.vault.getFileByPath(filePath);
	if (!file) {
		console.log(`Error: file ${filePath} could not be found`);
		return;
	}
	const formattedinput = formatInput(input, progress, blockId, referenceLink);
	await app.vault.append(file, formattedinput);
};

// creates new song file in folder path if not exist
// returns the song file
export const createSongFile = async (
	app: App,
	folderPath: string,
	track: TrackFormatted
) => {
	const filePath = normalizePath(folderPath + "/" + track.id + ".md");

	// check if file exists
	let file = app.vault.getFileByPath(filePath);

	if (!file) {
		console.log("song file not exist, creating");
		file = await app.vault.create(filePath, "");
		/* edit frontmatter for https://github.com/snezhig/obsidian-front-matter-title
		 * this is to change the file display title, since the title is a unique spotify id
		 */
		try {
			app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter["title"] = track.name; // TODO: let user change which frontmatter should reflect display title?
				frontmatter["artists"] = track.artists;
				frontmatter["album"] = track.album;
				frontmatter["duration"] = track.duration;
				// frontmatter["log count"] = 1;
				frontmatter["aliases"] = track.name;
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
	currentlyPlaying: PlaybackState,
	blockId?: string
) => {
	const track = processCurrentlyPlayingResponse(currentlyPlaying);

	if (!track) {
		console.log("error processing playback state");
		return null;
	}

	if (!track.progress) {
		console.log("no track progress?");
		track.progress = ""; //TODO: handle no progress (not currently playing)
	}

	const file = await createSongFile(app, folderPath, track);
	const filePath = file.path;

	await appendInput(app, filePath, input, track.progress, blockId);

	// if file is currently active, don't open
	const activeFile = app.workspace.getActiveFile();

	if (!activeFile || activeFile.path != filePath) {
		await app.workspace.getLeaf().openFile(file); //TODO: move this to different file?
	}

	const editor = app.workspace.activeEditor?.editor;

	if (editor) {
		// if the file to log is the currently active file
		// then editor.lastLine() will not be updated in time even after we append
		// after await read(file) or sleep(10), the line count will be correct
		// unaware of better solution
		await app.vault.cachedRead(file);
		editor.setCursor({ line: editor.lastLine(), ch: 0 });
	}
};
