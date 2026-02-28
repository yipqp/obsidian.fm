export interface scrobbleDefaultSettings {
	folderPath: string;
	scrobbleAlbumAlwaysCreatesNewTrackFiles: boolean;
	showType: boolean;
	showDuration: boolean;
	showTags: boolean;
	showAlbumReleaseDate: boolean;
	aliasShowArtists: boolean;
	wikilinkShowArtists: boolean;
}

export const SCROBBLE_DEFAULT_SETTINGS: scrobbleDefaultSettings = {
	folderPath: "",
	scrobbleAlbumAlwaysCreatesNewTrackFiles: false,
	showType: true,
	showDuration: true,
	showAlbumReleaseDate: true,
	showTags: true,
	aliasShowArtists: true,
	wikilinkShowArtists: false,
};
