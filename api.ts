// pkce reference: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

import { ObsidianProtocolData } from "obsidian";
import { generateRandomString, sha256, base64encode } from "utils";

const clientId = "44e32ffa3b9c46398637431d6808481d";
const redirectUri = "obsidian://spotify-auth";
const scope = "user-read-currently-playing";

const codeVerifier = generateRandomString(64); // TODO: where to put this
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
	console.log(
		`setting new expiration date to: ${new Date(expiration).toLocaleString()}`,
	);

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
	const response = await body.json(); // TODO: error checking?
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
	// TODO: need to check if code exists?
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
		console.log(
			`requesting new token. old expiration date: ${new Date(expiration).toLocaleString()}`,
		);
		await refreshTokens();
	}
	const token = window.localStorage.getItem("access_token");
	return token;
};

export const getCurrentlyPlayingTrack = async () => {
	const accessToken = await getAccessToken();

	if (!accessToken) {
		console.log("Error: user is not authorized");
		return null;
	}

	const response = await fetch(
		"https://api.spotify.com/v1/me/player/currently-playing",
		{
			headers: {
				Authorization: "Bearer " + accessToken,
			},
		},
	);

	const data = await response.json(); // TODO: error checking?
	const item = data.item;
	return item;
};
