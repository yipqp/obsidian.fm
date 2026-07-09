export interface scrobbleDefaultSettings {
	clientID: string;
	folderPath: string;
	scrobbleAlbumAlwaysCreatesNewTrackFiles: boolean;
	showType: boolean;
	showDuration: boolean;
	showTrackNumber: boolean;
	showDiscNumber: boolean;
	showTags: boolean;
	showAlbumReleaseDate: boolean;
	aliasShowArtists: boolean;
	wikilinkShowArtists: boolean;
}

export const SCROBBLE_DEFAULT_SETTINGS: scrobbleDefaultSettings = {
	clientID: "",
	folderPath: "",
	scrobbleAlbumAlwaysCreatesNewTrackFiles: false,
	showType: true,
	showDuration: true,
	showTrackNumber: true,
	showDiscNumber: true,
	showAlbumReleaseDate: true,
	showTags: true,
	aliasShowArtists: true,
	wikilinkShowArtists: false,
};
