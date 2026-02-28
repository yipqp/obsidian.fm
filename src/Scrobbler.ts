import { App, moment, TFile } from "obsidian";
import { AlbumFormatted, ItemFormatted, TrackFormatted } from "types";
import { tracksAsWikilinks } from "./api";
import {
	generateIdFromTrack,
	getFile,
	getFilePath,
	parseItemAsWikilink,
	showNotice,
} from "./utils";
import { scrobbleDefaultSettings } from "./settings";

const formatInput = (
	input: string,
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
	input: string,
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
			const albumWikilink = parseItemAsWikilink(album);
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
			const trackWikilink = parseItemAsWikilink(track);
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
	settings: scrobbleDefaultSettings,
	album: AlbumFormatted,
) => {
	const {
		folderPath,
		scrobbleAlbumAlwaysCreatesNewTrackFiles,
		showTags,
		showType,
		showDuration,
		showAlbumReleaseDate,
	} = settings;
	let file = getFile(app, folderPath, album.id);

	if (file) {
		return file;
	}

	const filePath = getFilePath(folderPath, album.id);

	file = await app.vault.create(filePath, "");

	try {
		app.fileManager.processFrontMatter(file, (frontmatter) => {
			// use https://github.com/snezhig/obsidian-front-matter-title to display
			// frontmatter["name"] as the filename
			frontmatter["name"] = album.name;
			frontmatter["artists"] = album.artists;
			showType && (frontmatter["type"] = album.type);
			showAlbumReleaseDate &&
				(frontmatter["release date"] = album.releaseDate);
			showDuration && (frontmatter["duration"] = album.duration);
			frontmatter["tracks"] = tracksAsWikilinks(
				app,
				folderPath,
				album.tracks,
				album,
				scrobbleAlbumAlwaysCreatesNewTrackFiles,
			);
			showTags && (frontmatter["tags"] = "");
			frontmatter["aliases"] = `${album.artists} - ${album.name}`;
		});
	} catch (e) {
		showNotice(e.message, true);
	}

	return file;
};

// create new track file in folder path if not exist, and return it
export const createTrackFile = async (
	app: App,
	settings: scrobbleDefaultSettings,
	track: TrackFormatted,
) => {
	const { folderPath, showTags, showType, showDuration } = settings;

	if (!track.id) {
		// playing from local file
		track.id = await generateIdFromTrack(track);
	}

	let file = getFile(app, folderPath, track.id);

	if (file) {
		return file;
	}

	const filePath = getFilePath(folderPath, track.id);

	file = await app.vault.create(filePath, "");

	// check: if album exists, then frontmatter[album] should link back to that album
	let albumWikilink = "";
	const albumFile = getFile(app, folderPath, track.albumid);
	if (albumFile) {
		albumWikilink = `[[${track.albumid}|${track.album}]]`;
		updateAlbumFrontmatter(app, albumFile, track);
	}

	try {
		app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter["name"] = track.name;
			frontmatter["artists"] = track.artists;
			showType && (frontmatter["type"] = track.type);
			frontmatter["album"] = albumWikilink || track.album;
			showDuration && (frontmatter["duration"] = track.duration);
			showTags && (frontmatter["tags"] = "");
			frontmatter["aliases"] = `${track.artists} - ${track.name}`;
		});
	} catch (e) {
		showNotice(e.message, true);
	}

	return file;
};

export const scrobbleItem = async (
	app: App,
	settings: scrobbleDefaultSettings,
	input: string,
	item: ItemFormatted | undefined,
	blockId?: string,
) => {
	if (!item) {
		throw new Error("Playback state not supported");
	}

	const { scrobbleAlbumAlwaysCreatesNewTrackFiles } = settings;

	let file: TFile;

	if (item.type === "Track") {
		file = await createTrackFile(app, settings, item);
	}

	if (item.type === "Album") {
		file = await createAlbumFile(app, settings, item);

		if (scrobbleAlbumAlwaysCreatesNewTrackFiles) {
			for (const track of item.tracks) {
				await createTrackFile(app, settings, track);
			}
		}
	}

	const filePath = file!.path;

	const progress = "progress" in item ? item.progress : undefined;

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
