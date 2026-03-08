// https://github.com/spotify/spotify-web-api-ts-sdk/blob/main/src/types.ts

export type ItemType = "track" | "album";
export type ItemFormattedType = TrackFormatted | AlbumFormatted;

export interface ItemFormatted {
	href?: string;
	id: string;
	type: ItemType;
	image: Image;
	name: string;
	artists: string;
}

export interface TrackFormatted extends ItemFormatted {
	type: "track";
	album: string;
	albumid: string;
	duration: string;
	progress?: string;
}

export interface AlbumFormatted extends ItemFormatted {
	type: "album";
	releaseDate: string;
	release_date_precision: string;
	tracks: TrackFormatted[];
	duration: string;
}

export type TrackLike = Pick<
	Track,
	"artists" | "id" | "name" | "duration_ms"
> & {
	album: Pick<Track["album"], "name" | "id" | "images">;
};

export type MinimalItem = Pick<ItemFormatted, "id" | "name" | "artists">;

export interface MinimalFrontmatter {
	name: string;
	artists: string;
	type?: string;
	tags?: string;
	duration?: string;
	aliases: string;
}

export interface TrackFrontmatter extends MinimalFrontmatter {
	album: string;
}

export interface AlbumFrontmatter extends MinimalFrontmatter {
	"release date": string;
	tracks: string[];
}

export interface SpotifyErrorResponse {
	error: {
		status: number;
		message: string;
	};
}

export type SpotifyResponse = SpotifyErrorResponse | Record<string, unknown>;

export function isSpotifyError(
	data: SpotifyResponse,
): data is SpotifyErrorResponse {
	return "error" in data;
}

export interface Episode extends SimplifiedEpisode {
	kind: "episode";
	show: SimplifiedShow;
}

export interface SimplifiedShow {
	available_markets: string[];
	copyrights: Copyright[];
	description: string;
	html_description: string;
	explicit: boolean;
	external_urls: ExternalUrls;
	href: string;
	id: string;
	images: Image[];
	is_externally_hosted: boolean;
	languages: string[];
	media_type: string;
	name: string;
	publisher: string;
	type: string;
	uri: string;
	total_episodes: number;
}

export interface SimplifiedEpisode {
	audio_preview_url: string;
	description: string;
	html_description: string;
	duration_ms: number;
	explicit: boolean;
	external_urls: ExternalUrls;
	href: string;
	id: string;
	images: Image[];
	is_externally_hosted: boolean;
	is_playable: boolean;
	language: string;
	languages: string[];
	name: string;
	release_date: string;
	release_date_precision: string;
	resume_point: ResumePoint;
	type: string;
	uri: string;
	restrictions: Restrictions;
}

export interface ResumePoint {
	fully_played: boolean;
	resume_position_ms: number;
}

export interface AccessToken {
	access_token: string;
	token_type: string;
	scope: string;
	expires_in: number;
	refresh_token: string;
}

export function isAccessToken(data: unknown): data is AccessToken {
	return (
		typeof data === "object" &&
		data !== null &&
		"access_token" in data &&
		"token_type" in data &&
		"scope" in data &&
		"expires_in" in data &&
		"refresh_token" in data
	);
}

export interface CurrentlyPlaying {
	kind: "playbackState";
	device: Device;
	repeat_state: string;
	shuffle_state: boolean;
	context: Context | null;
	timestamp: number;
	progress_ms: number;
	is_playing: boolean;
	item: TrackItem;
	currently_playing_type: string;
	actions: Actions;
}

export interface RecentlyPlayedTracksPage {
	href: string;
	limit: number;
	next: string | null;
	cursors: {
		after: string;
		before: string;
	};
	total: number;
	items: PlayHistory[];
}

export interface PlayHistory {
	track: Track;
	played_at: string;
	context: Context;
}

interface ResourceTypeToResultKey {
	album: "albums";
	track: "tracks";
}

interface SearchResultsMap {
	album: SimplifiedAlbum;
	track: Track;
}

export type PartialSearchResult = {
	[K in ItemType as ResourceTypeToResultKey[K]]?: Page<
		K extends keyof SearchResultsMap ? SearchResultsMap[K] : never
	>;
};

/**
 * Makes all properties in SearchResults optional, unless the type T is a tuple (literal array / tuple) of SearchTypes.
 */
export type SearchResults<T extends readonly ItemType[]> =
	Pick<
		PartialSearchResult,
		ResourceTypeToResultKey[T[number]]
	> extends infer R
		? number extends T["length"]
			? R
			: Required<R>
		: never;

export interface Actions {
	interrupting_playback?: boolean;
	pausing?: boolean;
	resuming?: boolean;
	seeking?: boolean;
	skipping_next?: boolean;
	skipping_prev?: boolean;
	toggling_repeat_context?: boolean;
	toggling_shuffle?: boolean;
	toggling_repeat_track?: boolean;
	transferring_playback?: boolean;
}

export type TrackItem = Track | Episode;

export interface Device {
	id: string | null;
	is_active: boolean;
	is_private_session: boolean;
	is_restricted: boolean;
	name: string;
	type: string;
	volume_percent: number | null;
}

export interface Context {
	type: string;
	href: string;
	external_urls: ExternalUrls;
	uri: string;
}

export interface ExternalUrls {
	spotify: string;
}

export interface Track extends SimplifiedTrack {
	kind: "track";
	album: SimplifiedAlbum;
	external_ids: ExternalIds;
	popularity: number;
}

export interface SimplifiedTrack {
	artists: SimplifiedArtist[];
	available_markets: string[];
	disc_number: number;
	duration_ms: number;
	episode: boolean;
	explicit: boolean;
	external_urls: ExternalUrls;
	href: string;
	id: string;
	is_local: boolean;
	name: string;
	preview_url: string | null;
	track: boolean;
	track_number: number;
	type: string;
	uri: string;
	is_playable?: boolean;
	linked_from?: LinkedFrom;
	restrictions?: Restrictions;
}

export interface Restrictions {
	reason: string;
}

export interface Copyright {
	text: string;
	type: string;
}

export interface Image {
	url: string;
	height: number;
	width: number;
}

interface AlbumBase {
	album_type: string;
	available_markets: string[];
	copyrights: Copyright[];
	external_ids: ExternalIds;
	external_urls: ExternalUrls;
	genres: string[];
	href: string;
	id: string;
	images: Image[];
	label: string;
	name: string;
	popularity: number;
	release_date: string;
	release_date_precision: string;
	restrictions?: Restrictions;
	total_tracks: number;
	type: string;
	uri: string;
}

export interface SimplifiedArtist {
	external_urls: ExternalUrls;
	href: string;
	id: string;
	name: string;
	type: string;
	uri: string;
}

export interface Album extends AlbumBase {
	artists: Artist[];
	tracks: Page<SimplifiedTrack>;
}

export interface Artist extends SimplifiedArtist {
	followers: Followers;
	genres: string[];
	images: Image[];
	popularity: number;
}

export interface Followers {
	href: string | null;
	total: number;
}

export interface Page<TItemType> {
	href: string;
	items: TItemType[];
	limit: number;
	next: string | null;
	offset: number;
	previous: string | null;
	total: number;
}

export interface SimplifiedAlbum extends AlbumBase {
	album_group: string;
	artists: SimplifiedArtist[];
}

export interface ExternalIds {
	isrc: string;
	ean: string;
	upc: string;
}

export interface LinkedFrom {
	external_urls: ExternalUrls;
	href: string;
	id: string;
	type: string;
	uri: string;
}
