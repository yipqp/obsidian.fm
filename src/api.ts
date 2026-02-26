// pkce reference: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

import { App, ObsidianProtocolData } from "obsidian";
import {
	Album,
	AlbumFormatted,
	MinimalItem,
	PlaybackState,
	PlayHistory,
	PlayingType,
	RecentlyPlayedTracksPage,
	SimplifiedAlbum,
	SimplifiedArtist,
	SimplifiedTrack,
	TrackFormatted,
	TrackLike,
} from "types";
import { URLSearchParams } from "url";
import {
	generateRandomString,
	sha256,
	base64encode,
	formatMs,
	parsePlayingAsWikilink,
	getFile,
	showError,
} from "src/utils";
import { updateTrackFrontmatter } from "./SpotifyLogger";

const clientId = "44e32ffa3b9c46398637431d6808481d";
const redirectUri = "obsidian://spotify-auth";
const scope = "user-read-currently-playing user-read-recently-played";
const codeVerifier = generateRandomString(64);

window.localStorage.setItem("code_verifier", codeVerifier);

export const getAuthUrl = async () => {
	const authUrl = new URL("https://accounts.spotify.com/authorize");
	const hashed = await sha256(codeVerifier);
	const codeChallenge = base64encode(hashed);
	const params = {
		response_type: "code",
		client_id: clientId,
		scope,
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
		redirect_uri: redirectUri,
	};

	authUrl.search = new URLSearchParams(params).toString();
	return authUrl.toString();
};

const setTokens = (
	accessToken: string,
	expiresIn: number,
	refreshToken: string | null,
) => {
	const expiration = Date.now() + expiresIn * 1000; // expiresIn is in seconds from now
	localStorage.setItem("expires_in", expiration.toString());
	localStorage.setItem("access_token", accessToken);
	if (refreshToken) {
		localStorage.setItem("refresh_token", refreshToken);
	}
};

// exchange auth code for access token
export const requestToken = async (code: string) => {
	const codeVerifier = localStorage.getItem("code_verifier");
	if (!codeVerifier) {
		console.log("Error: code verifier not found");
		return null;
	}

	const url = "https://accounts.spotify.com/api/token";
	const payload = {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: clientId,
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			code_verifier: codeVerifier,
		}),
	};
	const body = await fetch(url, payload);
	const response = await body.json();

	setTokens(
		response.access_token,
		response.expires_in,
		response.refresh_token,
	);

	return response;
};

const refreshTokens = async () => {
	const refreshToken = localStorage.getItem("refresh_token");
	if (!refreshToken) {
		console.log("Error: refresh token not found");
		return null;
	}

	const url = "https://accounts.spotify.com/api/token";
	const payload = {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: clientId,
		}),
	};
	const body = await fetch(url, payload);
	const response = await body.json();

	setTokens(
		response.access_token,
		response.expires_in,
		response.refresh_token,
	);

	return response;
};

export const handleAuth = async (data: ObsidianProtocolData) => {
	if (data?.error) {
		showError(data.error);
		return;
	}
	const code = data.code;
	await requestToken(code);
};

const getAccessToken = async () => {
	const expirationString = window.localStorage.getItem("expires_in");
	if (!expirationString) {
		console.log("Error: could not get expires_in");
		return null;
	}

	const expiration = parseInt(expirationString);
	if (Date.now() >= expiration) {
		await refreshTokens();
	}

	const token = window.localStorage.getItem("access_token");
	return token;
};

// to prevent checking authentication through api call
// will fail if user revokes permissions via Spotify
export const isAuthenticated = () => {
	return (
		window.localStorage.getItem("access_token") &&
		window.localStorage.getItem("refresh_token")
	);
};

export const callEndpoint = async (url: string) => {
	if (!isAuthenticated()) {
		throw new Error("please connect your spotify account");
	}

	const accessToken = (await getAccessToken()) ?? "";

	const response = await fetch(url, {
		headers: {
			Authorization: "Bearer " + accessToken,
		},
	});

	if (response.status === 204) {
		throw new Error("no currently playing track");
	}

	const data = await response.json();

	if (data.error) {
		if (data.error.status === 401) {
			throw new Error("please connect your spotify account");
		}
		throw new Error(data.error.message);
	}

	return data;
};

export const getCurrentlyPlayingTrack = async () => {
	const data = await callEndpoint(
		"https://api.spotify.com/v1/me/player/currently-playing",
	);
	return data;
};

export const getRecentlyPlayed = async () => {
	const data = await callEndpoint(
		"https://api.spotify.com/v1/me/player/recently-played",
	);
	return data;
};

export const searchItem = async (query: string, type: PlayingType) => {
	if (!query) {
		return null;
	}

	const searchURL = new URL("https://api.spotify.com/v1/search");
	const params = {
		q: query,
		type: type.toLowerCase(),
	};

	searchURL.search = new URLSearchParams(params).toString();

	const data = callEndpoint(searchURL.toString());
	return data;
};

export const tracksAsWikilinks = (
	app: App,
	folderPath: string,
	tracks: SimplifiedTrack[] | TrackFormatted[],
	album: AlbumFormatted,
	logAlbumAlwaysCreateNewTrackFiles: boolean,
) => {
	return tracks.map((track) => {
		const trackFile = getFile(app, folderPath, track.id);
		if (trackFile) {
			// if this track was logged before, then link current album in that track's frontmatter[album]
			updateTrackFrontmatter(app, trackFile, album);
		} else if (!logAlbumAlwaysCreateNewTrackFiles) {
			return track.name;
		}

		return parsePlayingAsWikilink(track);
	});
};

export const processCurrentlyPlayingResponse = async (
	playbackState: PlaybackState,
	type: PlayingType,
) => {
	if (playbackState.item == null || playbackState.item.kind === "episode") {
		throw new Error("episodes not supported");
	}
	if (type === "Track") {
		const trackInfo = processTrack(playbackState.item);
		trackInfo.progress = formatMs(playbackState.progress_ms);
		return trackInfo;
	}
	if (type === "Album") {
		const albumLink = playbackState.item.album.href;
		if (!albumLink) {
			throw new Error("no album href found");
		}
		const album = await callEndpoint(albumLink);
		const albumInfo = processAlbum(album);
		return albumInfo;
	}
	throw new Error("current playback state not supported");
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
		type: "Track",
		album: track.album.name,
		albumid: track.album.id,
		artists: formatArtists(track.artists),
		id: track.id,
		name: track.name,
		image: track.album.images[track.album.images.length - 1],
		duration: formatMs(track.duration_ms),
	};
};

export const processSimplifiedAlbum = (album: SimplifiedAlbum): MinimalItem => {
	return {
		href: album.href,
		id: album.id,
		type: "Album",
		image: album.images[album.images.length - 1],
		name: album.name,
		artists: formatArtists(album.artists),
	};
};

export const processAlbum = (album: Album): AlbumFormatted => {
	return {
		type: "Album",
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
