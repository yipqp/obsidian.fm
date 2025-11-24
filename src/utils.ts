import { moment } from "obsidian";
import { TrackFormatted } from "types";

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

export const formatMs = (ms: string) => {
	const msInt = parseInt(ms);
	let msFormatted;

	// song is >= 1 hour
	if (msInt >= 3600000) {
		msFormatted = moment.utc(msInt).format("HH:mm:ss");
	} else {
		msFormatted = moment.utc(msInt).format("mm:ss");
	}

	return msFormatted;
};

export const generateBlockID = (idLen: number): string => {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let id = "";

	for (let i = 0; i < idLen; i++) {
		id += chars[Math.floor(Math.random() * chars.length)];
	}

	return id;
};

export const parseTrackAsWikilink = (
	track: TrackFormatted,
	embedLinkedContent?: boolean,
	blockId?: string,
): string => {
	const prefix = embedLinkedContent ? "!" : "";
	const blockIdFormatted = blockId ? `#^${blockId}` : "";
	return `${prefix}[[${track.id}${blockIdFormatted}|${track.name}]]`;
};
