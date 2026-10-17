import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

// User-uploadable icon library. Library entries live in the same on-disk
// `custom_icons/` store the app-icon overrides use, but are namespaced with a
// `library:` prefix so they never collide with an app path. This lets the
// library hold an unbounded number of images (100+) with zero backend changes.

export const LIBRARY_PREFIX = "library:";

// Processes that host several apps under one executable (PWAs in a browser).
// Mirrors `HOST_PROCESSES` in Dock.tsx and `get_cache_key` in the Rust backend.
const HOST_PROCESSES = ["msedge.exe", "chrome.exe", "brave.exe", "applicationframehost.exe"];

export const LIBRARY_IMAGE_ACCEPT = ".png,.ico,.jpg,.jpeg,.svg,.bmp,.webp,.gif";

export interface LibraryIcon {
	id: string;
	src: string;
}

// Emitted whenever the custom-icon store changes so every window (dock and
// settings) can re-read it live.
export const CUSTOM_ICONS_EVENT = "custom-icons-changed";

export function isLibraryKey(key: string): boolean {
	return key.startsWith(LIBRARY_PREFIX);
}

export function libraryKeyFor(id: string): string {
	return `${LIBRARY_PREFIX}${id}`;
}

export function libraryIdOf(key: string): string {
	return key.slice(LIBRARY_PREFIX.length);
}

function newLibraryId(): string {
	const c = typeof crypto !== "undefined" ? crypto : undefined;
	if (c && typeof c.randomUUID === "function") return c.randomUUID();
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The key the backend and dock use to identify an app's icon override. Matches
 * `get_cache_key`: plain paths as-is, but browser hosts fold in the app name so
 * different PWAs of the same browser stay distinct.
 */
export function appCacheKey(path: string, name?: string): string {
	const p = path.toLowerCase();
	if (name && HOST_PROCESSES.some((host) => p.includes(host))) {
		return `${path}:${name.toLowerCase()}`;
	}
	return path;
}

export function parseLibraryIcons(map: Record<string, string>): LibraryIcon[] {
	return Object.entries(map)
		.filter(([key]) => isLibraryKey(key))
		.map(([key, src]) => ({ id: libraryIdOf(key), src }));
}

export async function loadLibraryIcons(): Promise<LibraryIcon[]> {
	const map = await invoke<Record<string, string>>("get_custom_icons").catch(
		() => ({}) as Record<string, string>
	);
	return parseLibraryIcons(map);
}

/** Absolute path of the folder users can drop images into. */
export async function getCustomIconsDirPath(): Promise<string> {
	return invoke<string>("get_custom_icons_dir_path");
}

/**
 * Ingests any images the user dropped into the custom-icon folder and returns
 * the refreshed library. Emits CUSTOM_ICONS_EVENT so every window updates.
 */
export async function importIconsFromDir(): Promise<LibraryIcon[]> {
	const map = await invoke<Record<string, string>>("import_icons_from_dir").catch(
		() => ({}) as Record<string, string>
	);
	emit(CUSTOM_ICONS_EVENT);
	return parseLibraryIcons(map);
}

function fileToDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
		reader.readAsDataURL(file);
	});
}

export function isImageFile(file: File): boolean {
	if (file.type.startsWith("image/")) return true;
	return /\.(png|ico|jpe?g|svg|bmp|webp|gif)$/i.test(file.name);
}

/**
 * Uploads any number of image files into the library. Files are decoded and
 * normalized by the backend (resized to 256px), so this is batched to keep the
 * IPC channel and UI responsive while still handling 100+ icons. Individual
 * failures are skipped rather than aborting the whole batch.
 */
export async function uploadLibraryIcons(
	files: File[],
	onProgress?: (done: number, total: number) => void
): Promise<LibraryIcon[]> {
	const added: LibraryIcon[] = [];
	const batchSize = 6;
	let done = 0;

	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize);
		const settled = await Promise.all(
			batch.map(async (file): Promise<LibraryIcon | null> => {
				try {
					const dataUri = await fileToDataUri(file);
					const key = libraryKeyFor(newLibraryId());
					const src = await invoke<string>("set_custom_icon", {
						cacheKey: key,
						iconData: dataUri
					});
					return { id: libraryIdOf(key), src };
				} catch (err) {
					console.error(`Failed to add icon "${file.name}":`, err);
					return null;
				} finally {
					done += 1;
					onProgress?.(done, files.length);
				}
			})
		);
		for (const icon of settled) if (icon) added.push(icon);
	}

	if (added.length > 0) emit(CUSTOM_ICONS_EVENT);
	return added;
}

export async function deleteLibraryIcon(id: string): Promise<void> {
	await invoke("remove_custom_icon", { path: libraryKeyFor(id), name: null });
	emit(CUSTOM_ICONS_EVENT);
}

/**
 * Applies a library icon (or any image data URI) to a dock app. `cacheKey` is
 * the same key the dock uses for its custom icons (an app path, or a
 * `path:name` composite for browser-hosted apps).
 */
export async function applyIconToApp(cacheKey: string, src: string): Promise<string> {
	const result = await invoke<string>("set_custom_icon", { cacheKey, iconData: src });
	emit(CUSTOM_ICONS_EVENT);
	return result;
}

/** Removes an app's custom icon so its native icon is used again. */
export async function removeAppCustomIcon(path: string, name?: string | null): Promise<void> {
	await invoke("remove_custom_icon", { path, name: name ?? null });
	emit(CUSTOM_ICONS_EVENT);
}
