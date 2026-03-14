// pkce reference: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

import { App, ObsidianProtocolData, requestUrl } from "obsidian";
import {
	Album,
	AlbumFormatted,
	CurrentlyPlaying,
	PlayHistory,
	ItemType,
	RecentlyPlayedTracksPage,
	SimplifiedAlbum,
	SimplifiedArtist,
	TrackFormatted,
	TrackLike,
	SearchResults,
	ItemFormatted,
	SpotifyResponse,
	isSpotifyError,
	isAccessToken,
} from "types";
import { URLSearchParams } from "url";
import {
	generateRandomString,
	sha256,
	base64encode,
	formatMs,
	parseItemAsWikilink,
	getFile,
	showNotice,
} from "src/utils";
import { updateTrackFrontmatter } from "./Scrobbler";
import { scrobbleDefaultSettings } from "./settings";

const redirectUri = "obsidian://scrobble-spotify-auth";
const scope = "user-read-currently-playing user-read-recently-played";

export const setCodeVerifier = (app: App) => {
	const codeVerifier = generateRandomString(64);
	app.saveLocalStorage("code_verifier", codeVerifier);
};

export const getAuthUrl = async (app: App, clientID: string) => {
	const codeVerifier = app.loadLocalStorage("code_verifier") as string;
	const authUrl = new URL("https://accounts.spotify.com/authorize");
	const hashed = await sha256(codeVerifier);
	const codeChallenge = base64encode(hashed);
	const params = {
		response_type: "code",
		client_id: clientID,
		scope,
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
		redirect_uri: redirectUri,
	};

	authUrl.search = new URLSearchParams(params).toString();
	return authUrl.toString();
};

const setTokens = (
	app: App,
	accessToken: string,
	expiresIn: number,
	refreshToken: string | null,
) => {
	const expiration = Date.now() + expiresIn * 1000; // expiresIn is in seconds from now
	app.saveLocalStorage("expires_in", expiration.toString());
	app.saveLocalStorage("access_token", accessToken);
	if (refreshToken) {
		app.saveLocalStorage("refresh_token", refreshToken);
	}
};

// exchange auth code for access token
export const requestToken = async (
	app: App,
	clientID: string,
	code: string,
) => {
	const codeVerifier = app.loadLocalStorage("code_verifier") as string;
	if (!codeVerifier) {
		showNotice("Code verifier not found", true);
		return null;
	}

	let response;

	response = await requestUrl({
		url: "https://accounts.spotify.com/api/token",
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: clientID,
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			code_verifier: codeVerifier,
		}).toString(),
	});

	const data: unknown = response.json;

	if (!isAccessToken(data)) {
		throw new Error("Spotify response was not access token");
	}

	setTokens(app, data.access_token, data.expires_in, data.refresh_token);

	return data;
};

const refreshTokens = async (app: App, clientID: string) => {
	const refreshToken = app.loadLocalStorage("refresh_token") as string;
	if (!refreshToken) {
		showNotice("Refresh token not found", true);
		return null;
	}

	let response;

	response = await requestUrl({
		url: "https://accounts.spotify.com/api/token",
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: clientID,
		}).toString(),
	});

	const data: unknown = response.json;

	if (!isAccessToken(data)) {
		throw new Error("Spotify response was not access token");
	}

	setTokens(app, data.access_token, data.expires_in, data.refresh_token);

	return data;
};

export const handleAuth = async (
	app: App,
	clientID: string,
	data: ObsidianProtocolData,
) => {
	if (data?.error) {
		showNotice(data.error, true);
		return;
	}
	const code = data.code;

	try {
		await requestToken(app, clientID, code);
	} catch (e) {
		showNotice("Error requesting token", true);
		console.error(e);
		return;
	}

	showNotice("Spotify connected");
};

const getAccessToken = async (app: App, clientID: string) => {
	const expirationString = app.loadLocalStorage("expires_in") as string;
	if (!expirationString) {
		showNotice("Could not get expires_in", true);
		return null;
	}

	const expiration = parseInt(expirationString);
	if (Date.now() >= expiration) {
		try {
			await refreshTokens(app, clientID);
		} catch (e) {
			showNotice("Error refreshing token", true);
			console.error(e);
			return null;
		}
	}

	const token = app.loadLocalStorage("access_token") as string;
	return token;
};

// to prevent checking authentication through api call
// will fail if user revokes permissions via Spotify
export const isAuthenticated = (app: App) => {
	return !!(
		(app.loadLocalStorage("access_token") as string) &&
		(app.loadLocalStorage("refresh_token") as string)
	);
};

export const callEndpoint = async (
	app: App,
	clientID: string,
	url: string,
): Promise<unknown> => {
	const accessToken = (await getAccessToken(app, clientID)) ?? "";

	if (!accessToken) {
		app.saveLocalStorage("access_token", null);
		app.saveLocalStorage("refresh_token", null);
		throw new Error("Please connect your Spotify account");
	}

	const response = await requestUrl({
		url,
		headers: {
			Authorization: "Bearer " + accessToken,
		},
		throw: false,
	});

	if (response.status === 204) {
		throw new Error("No currently playing track");
	}

	const data = response.json as SpotifyResponse;

	if (isSpotifyError(data)) {
		if (data.error.status === 401) {
			throw new Error("Please connect your Spotify account");
		}
		throw new Error(data.error.message);
	}

	return data;
};

export const getCurrentlyPlayingTrack = async (app: App, clientID: string) => {
	const data = (await callEndpoint(
		app,
		clientID,
		"https://api.spotify.com/v1/me/player/currently-playing",
	)) as CurrentlyPlaying;
	return data;
};

export const getRecentlyPlayed = async (app: App, clientID: string) => {
	const data = (await callEndpoint(
		app,
		clientID,
		"https://api.spotify.com/v1/me/player/recently-played",
	)) as RecentlyPlayedTracksPage;
	return data;
};

export const searchItem = async <T extends ItemType>(
	app: App,
	clientID: string,
	query: string,
	itemType: ItemType,
) => {
	if (!query) {
		return null;
	}

	const searchURL = new URL("https://api.spotify.com/v1/search");
	const params = {
		q: query,
		type: itemType.toLowerCase(),
	};

	searchURL.search = new URLSearchParams(params).toString();

	const data = (await callEndpoint(
		app,
		clientID,
		searchURL.toString(),
	)) as SearchResults<[T]>;

	return data;
};

export const tracksAsWikilinks = (
	app: App,
	settings: scrobbleDefaultSettings,
	folderPath: string,
	tracks: TrackFormatted[],
	album: AlbumFormatted,
) => {
	return Promise.all(
		tracks.map(async (track) => {
			const trackFile = getFile(app, folderPath, track.id);
			if (trackFile) {
				// if this track was scrobbled before, then link current album in that track's frontmatter[album]
				await updateTrackFrontmatter(app, trackFile, album);
			} else if (!settings.scrobbleAlbumAlwaysCreatesNewTrackFiles) {
				return track.name;
			}

			return parseItemAsWikilink(track, false);
		}),
	);
};

export const processCurrentlyPlayingResponse = async (
	app: App,
	clientID: string,
	playbackState: CurrentlyPlaying,
	itemType: ItemType,
) => {
	if (playbackState.item == null || playbackState.item.kind === "episode") {
		throw new Error("Episodes not supported");
	}
	if (itemType === "track") {
		const trackInfo = processTrack(playbackState.item);
		trackInfo.progress = formatMs(playbackState.progress_ms);
		return trackInfo;
	}
	if (itemType === "album") {
		const albumLink = playbackState.item.album.href;
		if (!albumLink) {
			throw new Error("No album href found");
		}
		const album = (await callEndpoint(app, clientID, albumLink)) as Album;
		const albumInfo = processAlbum(album);
		return albumInfo;
	}
	throw new Error("Current playback state not supported");
};

export const processRecentlyPlayed = (
	recentlyPlayedTracksPage: RecentlyPlayedTracksPage,
): TrackFormatted[] => {
	return recentlyPlayedTracksPage.items.map((playHistory: PlayHistory) =>
		processTrack(playHistory.track),
	);
};

const formatArtists = (artists: SimplifiedArtist[]) => {
	return artists.map((artist) => artist.name).join(", ");
};

const getAlbumLength = (album: Album) => {
	let length = 0;
	for (const track of album.tracks.items) {
		length += track.duration_ms;
	}
	return formatMs(length);
};

// returns object with relevant information about the playing track
export const processTrack = (track: TrackLike): TrackFormatted => {
	return {
		type: "track",
		album: track.album.name,
		albumid: track.album.id,
		artists: formatArtists(track.artists),
		id: track.id,
		name: track.name,
		image: track.album.images[track.album.images.length - 1],
		duration: formatMs(track.duration_ms),
	};
};

export const processSimplifiedAlbum = (
	album: SimplifiedAlbum,
): ItemFormatted => {
	return {
		href: album.href,
		id: album.id,
		type: "album",
		image: album.images[album.images.length - 1],
		name: album.name,
		artists: formatArtists(album.artists),
	};
};

export const processAlbum = (album: Album): AlbumFormatted => {
	return {
		type: "album",
		image: album.images[album.images.length - 1],
		artists: formatArtists(album.artists),
		releaseDate: album.release_date,
		release_date_precision: album.release_date_precision,
		id: album.id,
		name: album.name,
		tracks: album.tracks.items.map((simplifiedTrack) =>
			processTrack({
				...simplifiedTrack,
				album: {
					name: album.name,
					id: album.id,
					images: album.images,
				},
			}),
		),
		duration: getAlbumLength(album),
	};
};
