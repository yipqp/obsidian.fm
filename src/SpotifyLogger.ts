import { App, moment, TFile } from "obsidian";
import { AlbumFormatted, TrackFormatted } from "types";
import { tracksAsWikilinks } from "./api";
import { defaultSettings } from "./settings";
import { getFile, getFilePath, parsePlayingAsWikilink } from "./utils";

const formatInput = (
	input: String,
	progress: string,
	blockId?: string,
	referenceLink?: string,
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

const formatInputNoTimestamp = (
	input: String,
	blockId?: string,
	referenceLink?: string,
) => {
	const date = moment().format("D MMM YYYY, h:mma");
	const surroundChar = "**";
	const formattedinput = `${surroundChar}${date}${surroundChar}

${input} ${blockId ? `^${blockId}` : ""}
${referenceLink ? `\n${referenceLink}\n` : ""}
---

`;
	return formattedinput;
};

export const appendInput = async (
	app: App,
	filePath: string,
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
	let formattedinput = "";
	if (progress) {
		formattedinput = formatInput(input, progress, blockId, referenceLink);
	} else {
		formattedinput = formatInputNoTimestamp(input, blockId, referenceLink);
	}
	await app.vault.append(file, formattedinput);
};

export const updateTrackFrontmatter = (
	app: App,
	trackFile: TFile,
	album: AlbumFormatted,
) => {
	try {
		app.fileManager.processFrontMatter(trackFile, (frontmatter) => {
			const albumWikilink = parsePlayingAsWikilink(album);
			frontmatter["album"] = albumWikilink;
		});
	} catch (e) {
		console.error("error occurred", e);
	}
};

export const updateAlbumFrontmatter = (
	app: App,
	albumFile: TFile,
	track: TrackFormatted,
) => {
	try {
		app.fileManager.processFrontMatter(albumFile, (frontmatter) => {
			const tracks = frontmatter["tracks"];
			const trackName = track.name;
			const trackWikilink = parsePlayingAsWikilink(track);
			const index = tracks.indexOf(trackName);

			if (index !== -1) {
				tracks[index] = trackWikilink;
			}
		});
	} catch (e) {
		console.error("error occurred", e);
	}
};

// create new album file in folder path if not exist, and return it
export const createAlbumFile = async (
	app: App,
	settings: defaultSettings,
	playing: AlbumFormatted,
) => {
	const {
		folderPath,
		logAlbumAlwaysCreateNewTrackFiles,
		showTags,
		showType,
		showDuration,
		showAlbumReleaseDate,
	} = settings;
	let file = getFile(app, folderPath, playing.id);

	if (file) {
		return file;
	}

	const filePath = getFilePath(folderPath, playing.id);

	file = await app.vault.create(filePath, "");
	/* edit frontmatter for https://github.com/snezhig/obsidian-front-matter-title
	 * this is to change the file display title, since the title is a unique spotify id
	 */

	try {
		app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter["title"] = playing.name;
			frontmatter["artists"] = playing.artists;
			showType && (frontmatter["type"] = playing.type);
			showAlbumReleaseDate &&
				(frontmatter["release date"] = playing.releaseDate);
			showDuration && (frontmatter["duration"] = playing.duration);
			frontmatter["tracks"] = tracksAsWikilinks(
				app,
				folderPath,
				playing.tracks,
				playing,
				logAlbumAlwaysCreateNewTrackFiles,
			);
			showTags && (frontmatter["tags"] = "");
			frontmatter["aliases"] = playing.name;
		});
	} catch (e) {
		console.log(`Error: ${e}`);
	}

	return file;
};

// create new track file in folder path if not exist, and return it
export const createTrackFile = async (
	app: App,
	settings: defaultSettings,
	playing: TrackFormatted,
) => {
	const { folderPath, showTags, showType, showDuration } = settings;
	let file = getFile(app, folderPath, playing.id);

	if (file) {
		return file;
	}

	const filePath = getFilePath(folderPath, playing.id);

	file = await app.vault.create(filePath, "");

	// check: if album exists, then frontmatter[album] should link back to that album
	let albumWikilink: string = "";
	const albumFile = getFile(app, folderPath, playing.albumid);
	if (albumFile) {
		albumWikilink = `[[${playing.albumid}|${playing.album}]]`;
		updateAlbumFrontmatter(app, albumFile, playing);
	}

	try {
		app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter["title"] = playing.name; // TODO: let user change which frontmatter should reflect display title?
			frontmatter["artists"] = playing.artists;
			showType && (frontmatter["type"] = playing.type);
			frontmatter["album"] = albumWikilink || playing.album;
			showDuration && (frontmatter["duration"] = playing.duration);
			showTags && (frontmatter["tags"] = "");
			frontmatter["aliases"] = playing.name;
		});
	} catch (e) {
		console.log(`Error: ${e}`);
	}

	return file;
};

export const logPlaying = async (
	app: App,
	settings: defaultSettings,
	input: string,
	playing: TrackFormatted | AlbumFormatted | undefined,
	blockId?: string,
) => {
	if (!playing) {
		console.log("error processing playback state");
		return null;
	}

	const { logAlbumAlwaysCreateNewTrackFiles } = settings;

	let file: TFile;

	if (playing.type === "Track") {
		file = await createTrackFile(app, settings, playing);
	}

	if (playing.type === "Album") {
		file = await createAlbumFile(app, settings, playing);

		if (logAlbumAlwaysCreateNewTrackFiles) {
			for (const track of playing.tracks) {
				await createTrackFile(app, settings, track);
			}
		}
	}

	const filePath = file!.path;

	const progress = "progress" in playing ? playing.progress : undefined;

	await appendInput(app, filePath, input, progress, blockId);

	// if file is currently active, don't open
	const activeFile = app.workspace.getActiveFile();

	if (!activeFile || activeFile.path != filePath) {
		await app.workspace.getLeaf().openFile(file!); //TODO: move this to different file?
	}

	const editor = app.workspace.activeEditor?.editor;

	if (editor) {
		// if the file to log is the currently active file
		// then editor.lastLine() will not be updated in time even after we append
		// after await read(file) or sleep(10), the line count will be correct
		// unaware of better solution
		await app.vault.cachedRead(file!);
		editor.setCursor({ line: editor.lastLine(), ch: 0 });
	}
};
