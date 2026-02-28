import { App, normalizePath, Notice, TFile } from "obsidian";
import {
	ItemFormatted,
	MinimalItem,
	SimplifiedTrack,
	TrackFormatted,
} from "types";
import { isAuthenticated } from "./api";

export const generateRandomString = (length: number) => {
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const values = crypto.getRandomValues(new Uint8Array(length));
	return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

export const sha256 = async (plain: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest("SHA-256", data);
};

export const base64encode = (input: ArrayBuffer) => {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
};

export const formatMs = (ms: number) => {
	const totalSeconds = Math.floor(ms / 1000);

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const paddedSeconds = seconds.toString().padStart(2, "0");

	if (hours >= 1) {
		const paddedMinutes = minutes.toString().padStart(2, "0");
		return `${hours}:${paddedMinutes}:${paddedSeconds}`;
	}

	return `${minutes}:${paddedSeconds}`;
};

// obsidian's unique block id generation isn't exposed in api as of late 2025
export const generateBlockId = (idLen: number): string => {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let id = "";

	for (let i = 0; i < idLen; i++) {
		id += chars[Math.floor(Math.random() * chars.length)];
	}

	return id;
};

// generate id from track to use as filename
// for local files without Spotify ids
export const generateIdFromTrack = async (
	track: TrackFormatted,
): Promise<string> => {
	const plain = `${track.artists} - ${track.name}`;
	const hashBuffer = await sha256(plain);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 22); // arbitrarily chose 22, it's the length of Spotify ID
};

export const parseItemAsWikilink = (
	item: MinimalItem | SimplifiedTrack,
	embedLinkedContent?: boolean,
	blockId?: string,
): string => {
	const prefix = embedLinkedContent ? "!" : "";
	const blockIdFormatted = blockId ? `#^${blockId}` : "";
	return `${prefix}[[${item.id}${blockIdFormatted}|${item.name}]]`;
};

export const getFilePath = (folderPath: string, id: string): string => {
	return normalizePath(folderPath + "/" + id + ".md");
};

export const getFile = (
	app: App,
	folderPath: string,
	id: string,
): TFile | null => {
	const filePath = getFilePath(folderPath, id);

	const file = app.vault.getFileByPath(filePath);
	if (file) {
		return file;
	}

	return null;
};

export const itemAsString = (item: ItemFormatted) => {
	return `${item.artists} - ${item.name}`;
};

export const showNotice = (message: string, isError = false) => {
	const messageFormatted = `[Scrobble] ${isError ? "Error: " : ""}${message}`;
	new Notice(`${messageFormatted}`, 3500);
};

export const requireAuth = (fn: () => Promise<void>): (() => Promise<void>) => {
	return async () => {
		if (!isAuthenticated()) {
			showNotice("Please connect your Spotify account", true);
			return;
		}
		await fn();
	};
};

// force Obsidian Front Matter Title to reload features, if installed
export const reloadOFMT = (app: App) => {
	const ofmtReloadID =
		"obsidian-front-matter-title-plugin:ofmt-features-reload";

	if (app.commands.findCommand(ofmtReloadID)) {
		app.commands.executeCommandById(ofmtReloadID);
	}
};
