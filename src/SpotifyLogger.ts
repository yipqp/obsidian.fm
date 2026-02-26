import { App, moment, TFile } from "obsidian";
import { AlbumFormatted, TrackFormatted } from "types";
import { tracksAsWikilinks } from "./api";
import { obsidianfmDefaultSettings } from "./settings";
import {
	generateIDFromTrack,
	getFile,
	getFilePath,
	parsePlayingAsWikilink,
	showNotice,
} from "./utils";

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
		throw new Error(`File ${filePath} could not be found`);
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
		showNotice(e.message, true);
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
		showNotice(e.message, true);
	}
};

// create new album file in folder path if not exist, and return it
export const createAlbumFile = async (
	app: App,
	settings: obsidianfmDefaultSettings,
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

	try {
		app.fileManager.processFrontMatter(file, (frontmatter) => {
			// use https://github.com/snezhig/obsidian-front-matter-title to display
			// frontmatter["name"] as the filename
			frontmatter["name"] = playing.name;
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
		showNotice(e.message, true);
	}

	return file;
};

// create new track file in folder path if not exist, and return it
export const createTrackFile = async (
	app: App,
	settings: obsidianfmDefaultSettings,
	playing: TrackFormatted,
) => {
	const { folderPath, showTags, showType, showDuration } = settings;

	if (!playing.id) {
		// playing from local file
		playing.id = await generateIDFromTrack(playing);
	}

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
			frontmatter["name"] = playing.name;
			frontmatter["artists"] = playing.artists;
			showType && (frontmatter["type"] = playing.type);
			frontmatter["album"] = albumWikilink || playing.album;
			showDuration && (frontmatter["duration"] = playing.duration);
			showTags && (frontmatter["tags"] = "");
			frontmatter["aliases"] = playing.name;
		});
	} catch (e) {
		showNotice(e.message, true);
	}

	return file;
};

export const logPlaying = async (
	app: App,
	settings: obsidianfmDefaultSettings,
	input: string,
	playing: TrackFormatted | AlbumFormatted | undefined,
	blockId?: string,
) => {
	if (!playing) {
		throw new Error("Playback state not supported");
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
		await app.workspace.getLeaf("tab").openFile(file!);
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
