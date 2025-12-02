import { App, normalizePath, moment } from "obsidian";
import { AlbumFormatted, TrackFormatted, PlayingType } from "types";
import { tracksAsWikilinks } from "./api";

const formatInput = (
	input: String,
	type: PlayingType,
	progress?: string,
	blockId?: string,
	referenceLink?: string,
) => {
	const date = moment().format("D MMM YYYY, h:mma");
	const surroundChar = "**";
	const trackBottomLine = `\n*${referenceLink ? `${referenceLink}, ` : ""}${progress ?? ""}*\n`;
	const formattedinput = `${surroundChar}${date}${surroundChar}

${input} ${blockId ? `^${blockId}` : ""}
${type === "Track" ? trackBottomLine : ""}
---

`;
	return formattedinput;
};

export const appendInput = async (
	app: App,
	filePath: string,
	type: PlayingType,
	input: string,
	progress?: string,
	blockId?: string,
	referenceLink?: string,
) => {
	const file = app.vault.getFileByPath(filePath);
	if (!file) {
		console.log(`Error: file ${filePath} could not be found`);
		return;
	}
	const formattedinput = formatInput(
		input,
		type,
		progress,
		blockId,
		referenceLink,
	);
	await app.vault.append(file, formattedinput);
};

// creates new track / album file in folder path if not exist, and return it
export const createPlayingFile = async (
	app: App,
	folderPath: string,
	playing: TrackFormatted | AlbumFormatted,
) => {
	const filePath = normalizePath(folderPath + "/" + playing.id + ".md");

	// check if file exists
	let file = app.vault.getFileByPath(filePath);
	if (file) {
		return file;
	}

	console.log("file does not exist, creating");
	file = await app.vault.create(filePath, "");
	/* edit frontmatter for https://github.com/snezhig/obsidian-front-matter-title
	 * this is to change the file display title, since the title is a unique spotify id
	 */
	try {
		if (playing.type === "Track") {
			app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter["title"] = playing.name; // TODO: let user change which frontmatter should reflect display title?
				frontmatter["artists"] = playing.artists;
				frontmatter["type"] = playing.type;
				frontmatter["album"] = playing.album;
				frontmatter["duration"] = playing.duration;
				frontmatter["aliases"] = playing.name;
			});
		}
		if (playing.type === "Album") {
			app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter["title"] = playing.name;
				frontmatter["artists"] = playing.artists;
				frontmatter["type"] = playing.type;
				frontmatter["release date"] = playing.releaseDate;
				frontmatter["duration"] = playing.duration;
				frontmatter["tracks"] = tracksAsWikilinks(playing.tracks);
				frontmatter["aliases"] = playing.name;
			});
		}
	} catch (e) {
		console.log(`Error: ${e}`);
	}

	return file;
};

export const logPlaying = async (
	app: App,
	folderPath: string,
	input: string,
	playing: TrackFormatted | AlbumFormatted | undefined,
	blockId?: string,
) => {
	if (!playing) {
		console.log("error processing playback state");
		return null;
	}

	const file = await createPlayingFile(app, folderPath, playing);
	if (playing.type === "Album") {
		for (const track of playing.tracks) {
			createPlayingFile(app, folderPath, track);
		}
	}
	const filePath = file.path;

	let progress;
	if ("progress" in playing) {
		progress = playing.progress;
	} else {
		progress = undefined;
	}

	await appendInput(app, filePath, playing.type, input, progress, blockId);

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
