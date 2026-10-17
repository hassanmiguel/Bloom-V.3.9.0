import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsSync } from "./hooks/useSettingsSync";

export type TaskbarBgMode = "theme" | "color" | "gradient" | "image" | "live";
export type TaskbarBgFit = "cover" | "contain" | "stretch" | "tile";

export interface TaskbarConfig {
	mode: TaskbarBgMode;
	color: string;
	color2: string;
	angle: number;
	imagePath: string;
	playlist: string[];
	interval: number;
	shuffle: boolean;
	fit: TaskbarBgFit;
	opacity: number;
	blur: number;
	dim: number;
	iconSize: number;
	iconGap: number;
}

export interface GradientPreset {
	name: string;
	color: string;
	color2: string;
	angle: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
	{ name: "Aurora", color: "#007aff", color2: "#34c759", angle: 120 },
	{ name: "Sunset", color: "#ff5e63", color2: "#ffbb54", angle: 120 },
	{ name: "Ocean", color: "#0a84ff", color2: "#00c7be", angle: 90 },
	{ name: "Grape", color: "#7d5fff", color2: "#c56cf0", angle: 135 },
	{ name: "Ember", color: "#ff375f", color2: "#ff9f0a", angle: 90 },
	{ name: "Mint", color: "#00c7be", color2: "#a2e4b8", angle: 160 },
	{ name: "Midnight", color: "#1c1c1e", color2: "#3a3a3c", angle: 180 },
	{ name: "Cosmos", color: "#5e5ce6", color2: "#ff2d55", angle: 135 },
	{ name: "Slate", color: "#232526", color2: "#414345", angle: 120 },
	{ name: "Peach", color: "#ff9a8b", color2: "#ff6a88", angle: 120 },
	{ name: "Sky", color: "#56ccf2", color2: "#2f80ed", angle: 90 },
	{ name: "Forest", color: "#134e5e", color2: "#71b280", angle: 110 }
];

export const FIELD_KEYS: Record<keyof TaskbarConfig, string> = {
	mode: "bloom-taskbar-bg-mode",
	color: "bloom-taskbar-bg-color",
	color2: "bloom-taskbar-bg-color2",
	angle: "bloom-taskbar-bg-angle",
	imagePath: "bloom-taskbar-bg-image",
	playlist: "bloom-taskbar-bg-images",
	interval: "bloom-taskbar-bg-interval",
	shuffle: "bloom-taskbar-bg-shuffle",
	fit: "bloom-taskbar-bg-fit",
	opacity: "bloom-taskbar-bg-opacity",
	blur: "bloom-taskbar-bg-blur",
	dim: "bloom-taskbar-bg-dim",
	iconSize: "bloom-taskbar-icon-size",
	iconGap: "bloom-taskbar-icon-gap"
};

export const DEFAULT_TASKBAR_CONFIG: TaskbarConfig = {
	mode: "theme",
	color: "#1c1c1e",
	color2: "#0a84ff",
	angle: 90,
	imagePath: "",
	playlist: [],
	interval: 0,
	shuffle: false,
	fit: "cover",
	opacity: 1,
	blur: 0,
	dim: 0.12,
	iconSize: 36,
	iconGap: 12
};

const MODES: TaskbarBgMode[] = ["theme", "color", "gradient", "image", "live"];
const FITS: TaskbarBgFit[] = ["cover", "contain", "stretch", "tile"];

function clamp(value: number, min: number, max: number, fallback: number): number {
	if (!Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, value));
}

function parsePlaylist(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed.filter((p): p is string => typeof p === "string" && p.length > 0);
		}
	} catch {}
	return [];
}

function readConfig(): TaskbarConfig {
	const get = (field: keyof TaskbarConfig) => localStorage.getItem(FIELD_KEYS[field]);
	const num = (field: keyof TaskbarConfig, fallback: number) => {
		const raw = get(field);
		return raw === null ? fallback : parseFloat(raw);
	};
	const modeRaw = get("mode") as TaskbarBgMode | null;
	const fitRaw = get("fit") as TaskbarBgFit | null;
	return {
		mode: modeRaw && MODES.includes(modeRaw) ? modeRaw : DEFAULT_TASKBAR_CONFIG.mode,
		color: get("color") || DEFAULT_TASKBAR_CONFIG.color,
		color2: get("color2") || DEFAULT_TASKBAR_CONFIG.color2,
		angle: clamp(num("angle", DEFAULT_TASKBAR_CONFIG.angle), 0, 360, 90),
		imagePath: get("imagePath") || "",
		playlist: parsePlaylist(get("playlist")),
		interval: clamp(num("interval", DEFAULT_TASKBAR_CONFIG.interval), 0, 180, 0),
		shuffle: get("shuffle") === "true",
		fit: fitRaw && FITS.includes(fitRaw) ? fitRaw : DEFAULT_TASKBAR_CONFIG.fit,
		opacity: clamp(num("opacity", DEFAULT_TASKBAR_CONFIG.opacity), 0, 1, 1),
		blur: clamp(num("blur", DEFAULT_TASKBAR_CONFIG.blur), 0, 40, 0),
		dim: clamp(num("dim", DEFAULT_TASKBAR_CONFIG.dim), 0, 1, 0.12),
		iconSize: clamp(num("iconSize", DEFAULT_TASKBAR_CONFIG.iconSize), 24, 64, 36),
		iconGap: clamp(num("iconGap", DEFAULT_TASKBAR_CONFIG.iconGap), 0, 32, 12)
	};
}

function persist(key: string, value: string) {
	localStorage.setItem(key, value);
	invoke("save_setting", { key, value }).catch(console.error);
}

export function isVideoWallpaper(path: string): boolean {
	return /\.(mp4|m4v|webm|mov|ogv|ogg|avi)$/i.test(path);
}

export function wallpaperName(path: string): string {
	const parts = path.split(/[\\/]/);
	return parts[parts.length - 1] || path;
}

function fileToDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
		reader.readAsDataURL(file);
	});
}

interface UseTaskbarConfigOptions {
	/** Advance through the wallpaper playlist on a timer (Dock only). */
	enableRotation?: boolean;
}

/**
 * Shared taskbar background + icon-sizing configuration. Backed by the same
 * `bloom-`-prefixed settings store as the rest of the app, so changes made in
 * Settings reach the Dock window immediately via `settings-changed`.
 */
export function useTaskbarConfig(options: UseTaskbarConfigOptions = {}) {
	const { enableRotation = false } = options;
	const [config, setConfig] = useState<TaskbarConfig>(readConfig);
	const [mediaUrl, setMediaUrl] = useState<string | null>(null);
	const [mediaLoading, setMediaLoading] = useState(false);
	const [mediaError, setMediaError] = useState<string | null>(null);
	const rotationIndexRef = useRef(0);

	const needsMedia = config.mode === "image" || config.mode === "live";

	const mutate = useCallback(
		(fn: (current: TaskbarConfig) => TaskbarConfig, changedKeys?: (keyof TaskbarConfig)[]) => {
			setConfig((current) => {
				const next = fn(current);
				const keys =
					changedKeys ??
					(Object.keys(next) as (keyof TaskbarConfig)[]).filter((k) => next[k] !== current[k]);
				keys.forEach((k) => {
					const value = next[k];
					persist(FIELD_KEYS[k], Array.isArray(value) ? JSON.stringify(value) : String(value));
				});
				return next;
			});
		},
		[]
	);

	useSettingsSync({
		[FIELD_KEYS.mode]: (v) =>
			setConfig((c) => ({ ...c, mode: MODES.includes(v) ? (v as TaskbarBgMode) : c.mode })),
		[FIELD_KEYS.color]: (v) => setConfig((c) => ({ ...c, color: String(v) })),
		[FIELD_KEYS.color2]: (v) => setConfig((c) => ({ ...c, color2: String(v) })),
		[FIELD_KEYS.angle]: (v) =>
			setConfig((c) => ({ ...c, angle: clamp(Number(v), 0, 360, c.angle) })),
		[FIELD_KEYS.imagePath]: (v) => setConfig((c) => ({ ...c, imagePath: String(v ?? "") })),
		[FIELD_KEYS.playlist]: (v) => setConfig((c) => ({ ...c, playlist: parsePlaylist(String(v)) })),
		[FIELD_KEYS.interval]: (v) =>
			setConfig((c) => ({ ...c, interval: clamp(Number(v), 0, 180, c.interval) })),
		[FIELD_KEYS.shuffle]: (v) => setConfig((c) => ({ ...c, shuffle: v === true || v === "true" })),
		[FIELD_KEYS.fit]: (v) =>
			setConfig((c) => ({ ...c, fit: FITS.includes(v) ? (v as TaskbarBgFit) : c.fit })),
		[FIELD_KEYS.opacity]: (v) =>
			setConfig((c) => ({ ...c, opacity: clamp(Number(v), 0, 1, c.opacity) })),
		[FIELD_KEYS.blur]: (v) => setConfig((c) => ({ ...c, blur: clamp(Number(v), 0, 40, c.blur) })),
		[FIELD_KEYS.dim]: (v) => setConfig((c) => ({ ...c, dim: clamp(Number(v), 0, 1, c.dim) })),
		[FIELD_KEYS.iconSize]: (v) =>
			setConfig((c) => ({ ...c, iconSize: clamp(Number(v), 24, 64, c.iconSize) })),
		[FIELD_KEYS.iconGap]: (v) =>
			setConfig((c) => ({ ...c, iconGap: clamp(Number(v), 0, 32, c.iconGap) }))
	});

	const update = useCallback(
		(patch: Partial<TaskbarConfig>) => mutate((c) => ({ ...c, ...patch })),
		[mutate]
	);

	const applyPreset = useCallback(
		(preset: GradientPreset) =>
			update({
				mode: "gradient",
				color: preset.color,
				color2: preset.color2,
				angle: preset.angle
			}),
		[update]
	);

	// Resolve the stored wallpaper path to a displayable data URI. Re-runs when
	// the path or mode changes; stale requests are ignored.
	useEffect(() => {
		if (!needsMedia || !config.imagePath) {
			setMediaUrl(null);
			setMediaError(null);
			return;
		}
		let cancelled = false;
		setMediaLoading(true);
		setMediaError(null);
		invoke<string | null>("read_wallpaper", { path: config.imagePath })
			.then((url) => {
				if (cancelled) return;
				setMediaUrl(url ?? null);
				if (!url) setMediaError("Wallpaper file could not be found.");
			})
			.catch((e) => {
				if (cancelled) return;
				console.error("Failed to read wallpaper:", e);
				setMediaUrl(null);
				setMediaError("Could not load the wallpaper.");
			})
			.finally(() => {
				if (!cancelled) setMediaLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [needsMedia, config.imagePath]);

	// Wallpaper playlists: advance to the next entry on a timer.
	useEffect(() => {
		if (!enableRotation || !needsMedia || config.interval <= 0) return;
		const list = config.playlist.length > 0 ? config.playlist : [config.imagePath].filter(Boolean);
		if (list.length < 2) return;
		const id = window.setInterval(() => {
			mutate((c) => {
				const pool = c.playlist.length > 0 ? c.playlist : [c.imagePath].filter(Boolean);
				if (pool.length < 2) return c;
				let nextPath: string;
				if (c.shuffle) {
					const candidates = pool.filter((p) => p !== c.imagePath);
					nextPath = candidates[Math.floor(Math.random() * candidates.length)];
				} else {
					rotationIndexRef.current = (pool.indexOf(c.imagePath) + 1) % pool.length;
					nextPath = pool[rotationIndexRef.current < 0 ? 0 : rotationIndexRef.current];
				}
				return { ...c, imagePath: nextPath };
			}, ["imagePath"]);
		}, config.interval * 60000);
		return () => window.clearInterval(id);
	}, [enableRotation, needsMedia, config.interval, config.shuffle, config.playlist, config.imagePath, mutate]);

	const addWallpaper = useCallback(
		async (file: File) => {
			const dataUri = await fileToDataUri(file);
			const path = await invoke<string>("save_wallpaper", {
				filename: file.name,
				data: dataUri
			});
			const isVideo =
				file.type.startsWith("video/") || isVideoWallpaper(file.name) || isVideoWallpaper(path);
			mutate(
				(c) => ({
					...c,
					mode: isVideo ? "live" : "image",
					imagePath: path,
					playlist: c.playlist.includes(path) ? c.playlist : [...c.playlist, path]
				}),
				["mode", "imagePath", "playlist"]
			);
			return path;
		},
		[mutate]
	);

	const removeWallpaper = useCallback(
		async (path: string) => {
			mutate(
				(c) => {
					const playlist = c.playlist.filter((p) => p !== path);
					const imagePath = c.imagePath === path ? (playlist[playlist.length - 1] ?? "") : c.imagePath;
					return { ...c, playlist, imagePath };
				},
				["playlist", "imagePath"]
			);
			invoke("delete_wallpaper", { path }).catch(() => {});
		},
		[mutate]
	);

	const setActiveWallpaper = useCallback(
		(path: string) =>
			update({ imagePath: path, mode: isVideoWallpaper(path) ? "live" : "image" }),
		[update]
	);

	const clearWallpaper = useCallback(async () => {
		const previous = config.imagePath;
		update({ imagePath: "" });
		if (previous) {
			invoke("delete_wallpaper", { path: previous }).catch(() => {});
		}
	}, [config.imagePath, update]);

	return {
		config,
		mediaUrl,
		mediaLoading,
		mediaError,
		update,
		applyPreset,
		addWallpaper,
		removeWallpaper,
		setActiveWallpaper,
		clearWallpaper
	};
}
