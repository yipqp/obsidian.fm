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

// exchange auth code for access token
export const getAccessToken = async (code: string) => {
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
	return response.access_token;
};

export const handleAuth = async (data: ObsidianProtocolData) => {
	// TODO: need to check if code exists?
	const code = data.code;
	const accessToken = await getAccessToken(code);

	if (!accessToken) {
		return false;
	} // TODO: add better error handling

	localStorage.setItem("access_token", accessToken);
	return true;
};

export const getCurrentlyPlayingTrack = async () => {
	const accessToken = localStorage.getItem("access_token");

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
