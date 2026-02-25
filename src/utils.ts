import { App, normalizePath, Notice, TFile } from "obsidian";
import {
	AlbumFormatted,
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
export const generateBlockID = (idLen: number): string => {
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
export const generateIDFromTrack = async (
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

export const parsePlayingAsWikilink = (
	playing: MinimalItem | SimplifiedTrack,
	embedLinkedContent?: boolean,
	blockId?: string,
): string => {
	const prefix = embedLinkedContent ? "!" : "";
	const blockIdFormatted = blockId ? `#^${blockId}` : "";
	return `${prefix}[[${playing.id}${blockIdFormatted}|${playing.name}]]`;
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

	let file = app.vault.getFileByPath(filePath);
	if (file) {
		return file;
	}

	return null;
};

export const nowPlayingAsString = (
	playing: AlbumFormatted | TrackFormatted,
) => {
	return `${playing.artists} - ${playing.name}`;
};

export const showError = (err: string) => {
	const message = `[obsidian.fm] Error: ${err}`;
	new Notice(`${message}`, 3000);
};

export const requireAuth = (fn: () => Promise<void>): (() => Promise<void>) => {
	return async () => {
		if (!isAuthenticated()) {
			new Notice("Please connect your Spotify account", 3000);
			return;
		}
		await fn();
	};
};
