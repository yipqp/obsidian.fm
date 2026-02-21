export interface defaultSettings {
	folderPath: string;
	logAlbumAlwaysCreateNewTrackFiles: boolean;
	showType: boolean;
	showDuration: boolean;
	showTags: boolean;
	showAlbumReleaseDate: boolean;
}

export const DEFAULT_SETTINGS: defaultSettings = {
	folderPath: "",
	logAlbumAlwaysCreateNewTrackFiles: false,
	showType: true,
	showDuration: true,
	showAlbumReleaseDate: true,
	showTags: true,
};
