import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { getVersion } from "@tauri-apps/api/app";
import type { UpdateCheckResult } from "../updater";
import { useSettingsSync } from "../hooks/useSettingsSync";
import { reloadIfMirrorWasStale } from "../hooks/settingsMirror";
import { hexToHsl } from "../theme";
import {
	addCustomFolder,
	removeCustomFolder,
	toggleEnabledFolder,
	DEFAULT_ENABLED_FOLDERS
} from "../dockExtras";
import type { WidgetConfig } from "./types";
import { hashSecret, isHashed } from "../lib/hash";

function saveSetting(key: string, value: string) {
	localStorage.setItem(key, value);
	invoke("save_setting", { key, value }).catch(console.error);
}

function readBool(val: string | null): boolean {
	return val === "true";
}

function fileToDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export function useSettings() {
	const [autostart, setAutostart] = useState(false);
	const [weatherEnabled, setWeatherEnabled] = useState(true);
	const [calendarEnabled, setCalendarEnabled] = useState(true);
	const [timerSoundEnabled, setTimerSoundEnabled] = useState(
		() => localStorage.getItem("bloom-timer-sound-enabled") !== "false"
	);
	const [musicModeEnabled, setMusicModeEnabled] = useState(true);
	const [musicCompactNotch, setMusicCompactNotch] = useState(true);
	const [shelfPersist, setShelfPersist] = useState(
		() => localStorage.getItem("bloom-shelf-persist") === "true"
	);
	const [volumeOverlayEnabled, setVolumeOverlayEnabled] = useState(true);
	const [volumeEdgeEnabled, setVolumeEdgeEnabled] = useState(
		() => localStorage.getItem("bloom-volume-edge-enabled") !== "false"
	);
	const [brightnessOverlayEnabled, setBrightnessOverlayEnabled] = useState(
		() => localStorage.getItem("bloom-brightness-overlay-enabled") !== "false"
	);
	const [brightnessEdgeEnabled, setBrightnessEdgeEnabled] = useState(
		() => localStorage.getItem("bloom-brightness-edge-enabled") !== "false"
	);
	const [nightLightEnabled, setNightLightEnabled] = useState(
		() => localStorage.getItem("bloom-night-light-enabled") === "true"
	);
	const [nightLightIntensity, setNightLightIntensity] = useState(
		() => parseFloat(localStorage.getItem("bloom-night-light-intensity") || "0.5")
	);
	const [mediaAmbienceEnabled, setMediaAmbienceEnabled] = useState(true);
	const [mediaCompactGlowEnabled, setMediaCompactGlowEnabled] = useState(true);
	const [mediaLayout, setMediaLayout] = useState<"classic" | "compact">(
		() => (localStorage.getItem("bloom-media-layout") as "classic" | "compact") || "classic"
	);
	const [cornersEnabled, setCornersEnabled] = useState(
		() => localStorage.getItem("bloom-corners-enabled") === "true"
	);
	const [showUpdateIndicator, setShowUpdateIndicator] = useState(
		() => localStorage.getItem("bloom-show-update-indicator") !== "false"
	);
	const [timeFormat24h, setTimeFormat24h] = useState(
		() => localStorage.getItem("bloom-time-format-24h") === "true"
	);
	const [tempUnitFahrenheit, setTempUnitFahrenheit] = useState(false);
	const [cityName, setCityName] = useState("");
	const [citySearchResults, setCitySearchResults] = useState<
		Array<{ name: string; country: string; latitude: number; longitude: number }>
	>([]);
	const [showCityDropdown, setShowCityDropdown] = useState(false);
	const [statusWidgets, setStatusWidgets] = useState<WidgetConfig>({
		left: ["weather"],
		right: ["battery"]
	});
	const [dockEnabled, setDockEnabled] = useState(true);
	const [dockPreviewEnabled, setDockPreviewEnabled] = useState(true);
	const [dockIconOnly, setDockIconOnly] = useState(
		() => localStorage.getItem("bloom-dock-icon-only") === "true"
	);
	const [dockSeparatorEnabled, setDockSeparatorEnabled] = useState(
		() => localStorage.getItem("bloom-dock-separator-enabled") !== "false"
	);
	const [startIcon, setStartIcon] = useState(
		() => localStorage.getItem("bloom-start-icon") || "default"
	);
	const [dockAdaptive, setDockAdaptive] = useState(
		() => localStorage.getItem("bloom-dock-adaptive") === "true"
	);
	const [dockWinNumberEnabled, setDockWinNumberEnabled] = useState(
		() => localStorage.getItem("bloom-dock-win-number-enabled") !== "false"
	);
	const [dockExtrasPosition, setDockExtrasPosition] = useState(
		() => localStorage.getItem("bloom-dock-extras-position") || "off"
	);
	const [dockExtrasDrives, setDockExtrasDrives] = useState(
		() => localStorage.getItem("bloom-dock-extras-drives") !== "false"
	);
	const [dockExtrasRecycleBin, setDockExtrasRecycleBin] = useState(
		() => localStorage.getItem("bloom-dock-extras-recycle-bin") !== "false"
	);
	const [dockExtrasFolders, setDockExtrasFolders] = useState(
		() => localStorage.getItem("bloom-dock-extras-folders") ?? DEFAULT_ENABLED_FOLDERS
	);
	const [dockExtrasCustomFolders, setDockExtrasCustomFolders] = useState(
		() => localStorage.getItem("bloom-dock-extras-custom-folders") || "[]"
	);
	const [dockMagnify, setDockMagnify] = useState(
		() => localStorage.getItem("bloom-dock-magnify") === "true"
	);
	const [dockMagnifyStrength, setDockMagnifyStrength] = useState(() => {
		const val = localStorage.getItem("bloom-dock-magnify-strength");
		return val !== null ? parseFloat(val) : 1.45;
	});
	const [dockClockEnabled, setDockClockEnabled] = useState(
		() => localStorage.getItem("bloom-dock-clock-enabled") === "true"
	);
	const [dockClockShowDate, setDockClockShowDate] = useState(
		() => localStorage.getItem("bloom-dock-clock-show-date") !== "false"
	);
	const [dockClockSeconds, setDockClockSeconds] = useState(
		() => localStorage.getItem("bloom-dock-clock-seconds") === "true"
	);
	const [deskClockEnabled, setDeskClockEnabled] = useState(
		() => localStorage.getItem("bloom-clock-enabled") === "true"
	);
	const [deskClockSeconds, setDeskClockSeconds] = useState(
		() => localStorage.getItem("bloom-clock-seconds") === "true"
	);
	const [deskClockShowDate, setDeskClockShowDate] = useState(
		() => localStorage.getItem("bloom-clock-show-date") !== "false"
	);
	const [deskClockSize, setDeskClockSize] = useState(() => {
		const val = localStorage.getItem("bloom-clock-size");
		const parsed = val !== null ? parseFloat(val) : 1;
		return Number.isFinite(parsed) ? parsed : 1;
	});
	const [deskClockWallpaper, setDeskClockWallpaper] = useState(
		() => localStorage.getItem("bloom-clock-wallpaper") || ""
	);
	const [lockEnabled, setLockEnabled] = useState(
		() => localStorage.getItem("bloom-lock-enabled") === "true"
	);
	const [lockShowTime, setLockShowTime] = useState(
		() => localStorage.getItem("bloom-lock-show-time") !== "false"
	);
	const [lockShowDate, setLockShowDate] = useState(
		() => localStorage.getItem("bloom-lock-show-date") !== "false"
	);
	const [lockLive, setLockLive] = useState(
		() => localStorage.getItem("bloom-lock-live") === "true"
	);
	const [lockWallpaper, setLockWallpaper] = useState(
		() => localStorage.getItem("bloom-lock-wallpaper") || ""
	);
	const [lockBlur, setLockBlur] = useState(() => {
		const v = localStorage.getItem("bloom-lock-blur");
		const p = v === null ? 0 : parseFloat(v);
		return Number.isFinite(p) ? p : 0;
	});
	const [lockDim, setLockDim] = useState(() => {
		const v = localStorage.getItem("bloom-lock-dim");
		const p = v === null ? 0.35 : parseFloat(v);
		return Number.isFinite(p) ? p : 0.35;
	});
	const [lockRequirePassword, setLockRequirePassword] = useState(
		() => localStorage.getItem("bloom-lock-require-password") === "true"
	);
	const [lockPassword, setLockPassword] = useState(
		() => localStorage.getItem("bloom-lock-password") || ""
	);
	const [lockHasPassword, setLockHasPassword] = useState(() => {
		const stored = localStorage.getItem("bloom-lock-password") || "";
		return stored !== "";
	});
	const [lockAuto, setLockAuto] = useState(
		() => localStorage.getItem("bloom-lock-auto") === "true"
	);
	const [lockAutoMinutes, setLockAutoMinutes] = useState(() => {
		const v = localStorage.getItem("bloom-lock-auto-minutes");
		const parsed = v === null ? 5 : parseInt(v);
		return Number.isFinite(parsed) ? parsed : 5;
	});
	const [lockShowNotifications, setLockShowNotifications] = useState(
		() => localStorage.getItem("bloom-lock-show-notifications") !== "false"
	);
	const [lockIncludeSystemNotifications, setLockIncludeSystemNotifications] = useState(
		() => localStorage.getItem("bloom-lock-include-system-notifications") === "true"
	);
	const [windowsLockImage, setWindowsLockImage] = useState(
		() => localStorage.getItem("bloom-lock-windows-image") || ""
	);
	const [lockShowSeconds, setLockShowSeconds] = useState(
		() => localStorage.getItem("bloom-lock-show-seconds") === "true"
	);
	const [lockMaxNotifications, setLockMaxNotifications] = useState(() => {
		const v = localStorage.getItem("bloom-lock-max-notifications");
		const p = v === null ? 5 : parseInt(v);
		return Number.isFinite(p) ? p : 5;
	});
	const [lockMaskStyle, setLockMaskStyle] = useState(
		() => localStorage.getItem("bloom-lock-mask-style") || "emoji"
	);
	const [lockDateFormat, setLockDateFormat] = useState(
		() => localStorage.getItem("bloom-lock-date-format") || "long"
	);
	const [lockScrimColor, setLockScrimColor] = useState(
		() => localStorage.getItem("bloom-lock-scrim-color") || "#000000"
	);
	const [lockAnimations, setLockAnimations] = useState(
		() => localStorage.getItem("bloom-lock-animations") !== "false"
	);
	const [lockUnlockGesture, setLockUnlockGesture] = useState(
		() => localStorage.getItem("bloom-lock-unlock-gesture") !== "false"
	);
	const [lockMediaControls, setLockMediaControls] = useState(
		() => localStorage.getItem("bloom-lock-media-controls") === "true"
	);
	const [lockWeather, setLockWeather] = useState(
		() => localStorage.getItem("bloom-lock-weather") === "true"
	);
	const [lockQuickActions, setLockQuickActions] = useState(
		() => localStorage.getItem("bloom-lock-quick-actions") === "true"
	);
	const [lockShowWidgets, setLockShowWidgets] = useState(
		() => localStorage.getItem("bloom-lock-show-widgets") === "true"
	);
	const [lockClockSize, setLockClockSize] = useState(() => {
		const v = localStorage.getItem("bloom-lock-clock-size");
		const p = v === null ? 140 : parseFloat(v);
		return Number.isFinite(p) ? p : 140;
	});
	const [lockClockWeight, setLockClockWeight] = useState(() => {
		const v = localStorage.getItem("bloom-lock-clock-weight");
		const p = v === null ? 200 : parseInt(v);
		return Number.isFinite(p) ? p : 200;
	});
	const [lockClockPosition, setLockClockPosition] = useState(
		() => localStorage.getItem("bloom-lock-clock-position") || "center"
	);
	const [lockClickThrough, setLockClickThrough] = useState(
		() => localStorage.getItem("bloom-lock-click-through") === "true"
	);
	const [lockOnResume, setLockOnResume] = useState(
		() => localStorage.getItem("bloom-lock-lock-on-resume") === "true"
	);
	const [applyWindowsState, setApplyWindowsState] = useState<
		"idle" | "applying" | "success" | "error"
	>("idle");
	const [dockMode, setDockMode] = useState(() => {
		// "smart" is the fresh-install default — keep in step with App.tsx,
		// Dock.tsx, and the backend fallback in commands.rs.
		const raw = localStorage.getItem("bloom-dock-mode") || "smart";
		return raw === "auto-hide" ? "smart" : raw;
	});
	const [notchMode, setNotchMode] = useState("fixed");
	const [notchEdgeDelay, setNotchEdgeDelay] = useState(() => {
		const val = localStorage.getItem("bloom-notch-edge-delay");
		return val !== null ? parseInt(val) : 200;
	});
	const [lowBatteryThreshold, setLowBatteryThreshold] = useState(20);
	const [updateStatus, setUpdateStatus] = useState<
		"idle" | "checking" | "available" | "uptodate" | "error" | "downloading" | "installing"
	>("idle");
	const [updateVersion, setUpdateVersion] = useState("");
	const [appVersion, setAppVersion] = useState("");
	const [autoUpdate, setAutoUpdate] = useState(
		() => localStorage.getItem("bloom-auto-update") === "true"
	);
	const [scale, setScale] = useState(() =>
		parseFloat(localStorage.getItem("bloom-scale") || "1.0")
	);
	const [themeMode, setThemeMode] = useState(
		() => localStorage.getItem("bloom-theme-mode") || "dark"
	);
	const [themeColor, setThemeColor] = useState(
		() => localStorage.getItem("bloom-theme-color") || "#007aff"
	);
	const [themeOpacity, setThemeOpacity] = useState(() => {
		const val = localStorage.getItem("bloom-theme-opacity");
		return val !== null ? parseFloat(val) : 0.8;
	});
	const [themeSaturation, setThemeSaturation] = useState(() => {
		const val = localStorage.getItem("bloom-theme-saturation");
		return val !== null ? parseFloat(val) : 0.5;
	});
	const [themeBrightness, setThemeBrightness] = useState(() => {
		const val = localStorage.getItem("bloom-theme-brightness");
		return val !== null ? parseFloat(val) : 0.15;
	});
	const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success" | "error">(
		"idle"
	);
	const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success" | "error">(
		"idle"
	);

	// ── Load all settings from backend + localStorage ──
	const loadAllSettings = useCallback(async () => {
		try {
			const settings: Record<string, string> = await invoke("load_settings");
			if (await reloadIfMirrorWasStale(settings)) return;
			const getVal = (key: string) => {
				const val = settings[key];
				if (val !== undefined && val !== null) return String(val);
				return localStorage.getItem(key);
			};

			const apply = <T>(
				val: string | null,
				setter: (v: T) => void,
				transform: (v: string) => T
			) => {
				if (val !== null) setter(transform(val));
			};

			apply(getVal("bloom-weather-enabled"), setWeatherEnabled, readBool);
			apply(getVal("bloom-calendar-enabled"), setCalendarEnabled, readBool);
			apply(getVal("bloom-timer-sound-enabled"), setTimerSoundEnabled, readBool);
			apply(getVal("bloom-music-mode-enabled"), setMusicModeEnabled, readBool);
			apply(getVal("bloom-music-compact-notch"), setMusicCompactNotch, readBool);
			apply(getVal("bloom-shelf-persist"), setShelfPersist, readBool);
			apply(getVal("bloom-volume-overlay-enabled"), setVolumeOverlayEnabled, readBool);
			apply(getVal("bloom-brightness-overlay-enabled"), setBrightnessOverlayEnabled, readBool);
			apply(getVal("bloom-media-ambience-enabled"), setMediaAmbienceEnabled, readBool);
			apply(getVal("bloom-media-compact-glow-enabled"), setMediaCompactGlowEnabled, readBool);
			apply(getVal("bloom-corners-enabled"), setCornersEnabled, readBool);
			apply(getVal("bloom-time-format-24h"), setTimeFormat24h, readBool);
			apply(getVal("bloom-show-update-indicator"), setShowUpdateIndicator, readBool);
			apply(getVal("bloom-auto-update"), setAutoUpdate, readBool);
			apply(getVal("bloom-volume-edge-enabled"), setVolumeEdgeEnabled, readBool);
			apply(getVal("bloom-brightness-edge-enabled"), setBrightnessEdgeEnabled, readBool);
			apply(getVal("bloom-night-light-enabled"), setNightLightEnabled, readBool);
			apply(getVal("bloom-night-light-intensity"), setNightLightIntensity, parseFloat);
			apply(getVal("bloom-dock-enabled"), setDockEnabled, readBool);
			apply(getVal("bloom-dock-preview-enabled"), setDockPreviewEnabled, readBool);
			apply(getVal("bloom-dock-icon-only"), setDockIconOnly, readBool);
			apply(getVal("bloom-dock-separator-enabled"), setDockSeparatorEnabled, readBool);
			apply(getVal("bloom-start-icon"), setStartIcon, (v) => v);
			apply(getVal("bloom-dock-adaptive"), setDockAdaptive, readBool);
			apply(getVal("bloom-dock-win-number-enabled"), setDockWinNumberEnabled, readBool);
			apply(getVal("bloom-dock-extras-position"), setDockExtrasPosition, (v) => v);
			apply(getVal("bloom-dock-extras-drives"), setDockExtrasDrives, readBool);
			apply(getVal("bloom-dock-extras-recycle-bin"), setDockExtrasRecycleBin, readBool);
			apply(getVal("bloom-dock-extras-folders"), setDockExtrasFolders, (v) => v);
			apply(getVal("bloom-dock-extras-custom-folders"), setDockExtrasCustomFolders, (v) => v);
			apply(getVal("bloom-dock-magnify"), setDockMagnify, readBool);
			apply(getVal("bloom-dock-magnify-strength"), setDockMagnifyStrength, parseFloat);
			apply(getVal("bloom-dock-clock-enabled"), setDockClockEnabled, readBool);
			apply(getVal("bloom-dock-clock-show-date"), setDockClockShowDate, readBool);
			apply(getVal("bloom-dock-clock-seconds"), setDockClockSeconds, readBool);
			apply(getVal("bloom-clock-enabled"), setDeskClockEnabled, readBool);
			apply(getVal("bloom-clock-seconds"), setDeskClockSeconds, readBool);
			apply(getVal("bloom-clock-show-date"), setDeskClockShowDate, readBool);
			apply(getVal("bloom-clock-size"), setDeskClockSize, parseFloat);
			apply(getVal("bloom-clock-wallpaper"), setDeskClockWallpaper, (v) => v);
			apply(getVal("bloom-lock-enabled"), setLockEnabled, readBool);
			apply(getVal("bloom-lock-show-time"), setLockShowTime, readBool);
			apply(getVal("bloom-lock-show-date"), setLockShowDate, readBool);
			apply(getVal("bloom-lock-live"), setLockLive, readBool);
			apply(getVal("bloom-lock-wallpaper"), setLockWallpaper, (v) => v);
			apply(getVal("bloom-lock-blur"), setLockBlur, parseFloat);
			apply(getVal("bloom-lock-dim"), setLockDim, parseFloat);
			apply(getVal("bloom-lock-require-password"), setLockRequirePassword, readBool);
			const storedPassword = getVal("bloom-lock-password");
			if (storedPassword !== null && storedPassword !== undefined) {
				setLockHasPassword(storedPassword !== "");
				setLockPassword(isHashed(storedPassword) ? "" : storedPassword);
			}
			apply(getVal("bloom-lock-auto"), setLockAuto, readBool);
			apply(getVal("bloom-lock-auto-minutes"), setLockAutoMinutes, parseInt);
			apply(getVal("bloom-lock-show-notifications"), setLockShowNotifications, readBool);
			apply(getVal("bloom-lock-include-system-notifications"), setLockIncludeSystemNotifications, readBool);
			apply(getVal("bloom-lock-windows-image"), setWindowsLockImage, (v) => v);
			apply(getVal("bloom-lock-show-seconds"), setLockShowSeconds, readBool);
			apply(getVal("bloom-lock-max-notifications"), setLockMaxNotifications, parseInt);
			apply(getVal("bloom-lock-mask-style"), setLockMaskStyle, (v) => v);
			apply(getVal("bloom-lock-date-format"), setLockDateFormat, (v) => v);
			apply(getVal("bloom-lock-scrim-color"), setLockScrimColor, (v) => v);
			apply(getVal("bloom-lock-animations"), setLockAnimations, readBool);
			apply(getVal("bloom-lock-unlock-gesture"), setLockUnlockGesture, readBool);
			apply(getVal("bloom-lock-media-controls"), setLockMediaControls, readBool);
			apply(getVal("bloom-lock-weather"), setLockWeather, readBool);
			apply(getVal("bloom-lock-quick-actions"), setLockQuickActions, readBool);
			apply(getVal("bloom-lock-show-widgets"), setLockShowWidgets, readBool);
			apply(getVal("bloom-lock-clock-size"), setLockClockSize, parseFloat);
			apply(getVal("bloom-lock-clock-weight"), setLockClockWeight, parseInt);
			apply(getVal("bloom-lock-clock-position"), setLockClockPosition, (v) => v);
			apply(getVal("bloom-lock-click-through"), setLockClickThrough, readBool);
			apply(getVal("bloom-lock-lock-on-resume"), setLockOnResume, readBool);

			apply(getVal("bloom-temp-unit"), setTempUnitFahrenheit, (v) => v === "fahrenheit");
			apply(getVal("bloom-scale"), setScale, parseFloat);
			apply(getVal("bloom-low-battery-threshold"), setLowBatteryThreshold, parseInt);

			apply(getVal("bloom-notch-mode"), setNotchMode, (v) => (v === "auto-hide" ? "smart" : v));
			apply(getVal("bloom-notch-edge-delay"), setNotchEdgeDelay, parseInt);
			apply(getVal("bloom-dock-mode"), setDockMode, (v) => (v === "auto-hide" ? "smart" : v));

			const savedCity = getVal("bloom-weather-city");
			if (savedCity) setCityName(savedCity);

			apply(getVal("bloom-theme-mode"), setThemeMode, (v) => v);
			apply(getVal("bloom-theme-color"), setThemeColor, (v) => v);
			apply(getVal("bloom-theme-opacity"), setThemeOpacity, parseFloat);
			apply(getVal("bloom-theme-saturation"), setThemeSaturation, parseFloat);
			apply(getVal("bloom-theme-brightness"), setThemeBrightness, parseFloat);

			const widgetsVal = getVal("bloom-status-widgets");
			if (widgetsVal) {
				try {
					const parsed = JSON.parse(widgetsVal);
					if (parsed && Array.isArray(parsed.left) && Array.isArray(parsed.right)) {
						setStatusWidgets(parsed);
					}
				} catch {}
			}
		} catch (e) {
			console.error("Failed to load settings:", e);
		}
	}, []);

	// ── Initialize on mount ──
	useEffect(() => {
		loadAllSettings();

		isEnabled()
			.then(setAutostart)
			.catch(() => {});

		getVersion()
			.then((ver) => setAppVersion(ver || "3.1.2"))
			.catch(() => setAppVersion("3.1.2"));

		checkForUpdates(false);
	}, []);

	// ── Sync settings from other windows ──
	useSettingsSync({
		"bloom-dock-mode": setDockMode,
		"bloom-notch-mode": setNotchMode,
		"bloom-notch-edge-delay": setNotchEdgeDelay,
		"bloom-dock-enabled": setDockEnabled,
		"bloom-dock-icon-only": setDockIconOnly,
		"bloom-dock-separator-enabled": setDockSeparatorEnabled,
		"bloom-start-icon": setStartIcon,
		"bloom-dock-preview-enabled": setDockPreviewEnabled,
		"bloom-dock-adaptive": setDockAdaptive,
		"bloom-dock-win-number-enabled": setDockWinNumberEnabled,
		"bloom-dock-extras-position": setDockExtrasPosition,
		"bloom-dock-extras-drives": setDockExtrasDrives,
		"bloom-dock-extras-recycle-bin": setDockExtrasRecycleBin,
		"bloom-dock-extras-folders": setDockExtrasFolders,
		"bloom-dock-extras-custom-folders": setDockExtrasCustomFolders,
		"bloom-dock-magnify": setDockMagnify,
		"bloom-dock-magnify-strength": setDockMagnifyStrength,
		"bloom-dock-clock-enabled": setDockClockEnabled,
		"bloom-dock-clock-show-date": setDockClockShowDate,
		"bloom-dock-clock-seconds": setDockClockSeconds,
		"bloom-clock-enabled": setDeskClockEnabled,
		"bloom-clock-seconds": setDeskClockSeconds,
		"bloom-clock-show-date": setDeskClockShowDate,
		"bloom-clock-size": setDeskClockSize,
		"bloom-clock-wallpaper": setDeskClockWallpaper,
		"bloom-lock-enabled": setLockEnabled,
		"bloom-lock-show-time": setLockShowTime,
		"bloom-lock-show-date": setLockShowDate,
		"bloom-lock-live": setLockLive,
		"bloom-lock-wallpaper": setLockWallpaper,
		"bloom-lock-blur": setLockBlur,
		"bloom-lock-dim": setLockDim,
		"bloom-lock-require-password": setLockRequirePassword,
		"bloom-lock-password": (v: unknown) => {
			const s = String(v ?? "");
			setLockHasPassword(s !== "");
			// Our own saves write a hash back through settings-changed; do not
			// clobber the plaintext the user is currently typing with it.
			if (!isHashed(s)) setLockPassword(s);
		},
		"bloom-lock-auto": setLockAuto,
		"bloom-lock-auto-minutes": setLockAutoMinutes,
		"bloom-lock-windows-image": setWindowsLockImage,
		"bloom-lock-show-seconds": setLockShowSeconds,
		"bloom-lock-max-notifications": setLockMaxNotifications,
		"bloom-lock-mask-style": setLockMaskStyle,
		"bloom-lock-date-format": setLockDateFormat,
		"bloom-lock-scrim-color": setLockScrimColor,
		"bloom-lock-animations": setLockAnimations,
		"bloom-lock-unlock-gesture": setLockUnlockGesture,
		"bloom-lock-media-controls": setLockMediaControls,
		"bloom-lock-weather": setLockWeather,
		"bloom-lock-quick-actions": setLockQuickActions,
		"bloom-lock-show-widgets": setLockShowWidgets,
		"bloom-lock-clock-size": setLockClockSize,
		"bloom-lock-clock-weight": setLockClockWeight,
		"bloom-lock-clock-position": setLockClockPosition,
		"bloom-lock-click-through": setLockClickThrough,
		"bloom-lock-lock-on-resume": setLockOnResume,
		"bloom-weather-enabled": setWeatherEnabled,
		"bloom-calendar-enabled": setCalendarEnabled,
		"bloom-timer-sound-enabled": setTimerSoundEnabled,
		"bloom-music-mode-enabled": setMusicModeEnabled,
		"bloom-music-compact-notch": setMusicCompactNotch,
		"bloom-media-ambience-enabled": setMediaAmbienceEnabled,
		"bloom-media-compact-glow-enabled": setMediaCompactGlowEnabled,
		"bloom-media-layout": setMediaLayout,
		"bloom-corners-enabled": setCornersEnabled,
		"bloom-show-update-indicator": setShowUpdateIndicator,
		"bloom-time-format-24h": setTimeFormat24h,
		"bloom-low-battery-threshold": setLowBatteryThreshold,
		"bloom-scale": setScale,
		"bloom-temp-unit": (v) => setTempUnitFahrenheit(v === "fahrenheit"),
		"bloom-auto-update": setAutoUpdate,
		"bloom-volume-overlay-enabled": setVolumeOverlayEnabled,
		"bloom-volume-edge-enabled": setVolumeEdgeEnabled,
		"bloom-brightness-overlay-enabled": setBrightnessOverlayEnabled,
		"bloom-brightness-edge-enabled": setBrightnessEdgeEnabled,
		"bloom-night-light-enabled": setNightLightEnabled,
		"bloom-night-light-intensity": setNightLightIntensity,
		"bloom-theme-mode": setThemeMode,
		"bloom-theme-color": setThemeColor,
		"bloom-theme-opacity": setThemeOpacity,
		"bloom-theme-saturation": setThemeSaturation,
		"bloom-theme-brightness": setThemeBrightness,
		"bloom-weather-city": (v) => setCityName(v || "")
	});

	// ── Listen for system accent changes (adaptive theme) ──
	useEffect(() => {
		const unlisten = listen<string>("system-accent-changed", (event) => {
			const mode = localStorage.getItem("bloom-theme-mode") || "dark";
			if (mode === "adaptive") {
				try {
					const hsl = hexToHsl(event.payload);
					setThemeSaturation(hsl.s / 100);
					setThemeBrightness(hsl.l / 100);
				} catch (e) {
					console.error("Failed to parse system accent color change HSL:", e);
				}
			}
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	// ── City search debounce ──
	useEffect(() => {
		if (cityName.trim().length < 2) {
			setCitySearchResults([]);
			setShowCityDropdown(false);
			return;
		}

		const timeout = setTimeout(async () => {
			try {
				const res = await fetch(
					`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`
				);
				const data = await res.json();
				if (data.results && data.results.length > 0) {
					setCitySearchResults(
						data.results.map((r: any) => ({
							name: r.name,
							country: r.country || "",
							latitude: r.latitude,
							longitude: r.longitude
						}))
					);
					setShowCityDropdown(true);
				} else {
					setCitySearchResults([]);
				}
			} catch {
				setCitySearchResults([]);
			}
		}, 300);

		return () => clearTimeout(timeout);
	}, [cityName]);

	// ── Update checker ──
	const checkForUpdates = async (manual = true) => {
		setUpdateStatus("checking");
		try {
			const result = await invoke<UpdateCheckResult>("check_for_updates", { force: manual });
			if (result.available) {
				setUpdateStatus("available");
				setUpdateVersion(result.version ?? "");
			} else {
				setUpdateStatus("uptodate");
			}
		} catch (e) {
			console.error("Updater error:", e);
			setUpdateStatus("error");
		}
	};

	const installUpdate = async () => {
		try {
			setUpdateStatus("downloading");
			await invoke("install_update");
			setUpdateStatus("idle");
		} catch (e) {
			console.error(e);
			setUpdateStatus("error");
		}
	};

	// Reflect install progress triggered from any window (including auto-update).
	useEffect(() => {
		const unlisten = listen<{ status: string; progress?: number }>(
			"auto-update-status",
			(event) => {
				switch (event.payload.status) {
					case "downloading":
						setUpdateStatus("downloading");
						break;
					case "installing":
						setUpdateStatus("installing");
						break;
					case "done":
						setUpdateStatus((prev) =>
							prev === "downloading" || prev === "installing" ? "idle" : prev
						);
						break;
				}
			}
		);
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	// ── Autostart ──
	const toggleAutostart = async () => {
		try {
			const currentlyEnabled = await isEnabled();
			if (currentlyEnabled) {
				await disable();
				setAutostart(false);
			} else {
				await enable();
				setAutostart(true);
			}
		} catch (err) {}
	};

	// ── Simple boolean toggles ──
	const toggleWeather = () => {
		const next = !weatherEnabled;
		setWeatherEnabled(next);
		saveSetting("bloom-weather-enabled", String(next));
	};

	const toggleCalendar = () => {
		const next = !calendarEnabled;
		setCalendarEnabled(next);
		saveSetting("bloom-calendar-enabled", String(next));
	};

	const toggleTimerSound = () => {
		const next = !timerSoundEnabled;
		setTimerSoundEnabled(next);
		saveSetting("bloom-timer-sound-enabled", String(next));
	};

	const toggleMusicMode = () => {
		const next = !musicModeEnabled;
		setMusicModeEnabled(next);
		saveSetting("bloom-music-mode-enabled", String(next));
	};

	const toggleMusicCompactNotch = () => {
		const next = !musicCompactNotch;
		setMusicCompactNotch(next);
		saveSetting("bloom-music-compact-notch", String(next));
	};

	const toggleShelfPersist = () => {
		const next = !shelfPersist;
		setShelfPersist(next);
		saveSetting("bloom-shelf-persist", String(next));
	};

	const toggleMediaLayout = (layout: "classic" | "compact") => {
		setMediaLayout(layout);
		saveSetting("bloom-media-layout", layout);
	};

	const toggleVolumeOverlay = () => {
		const next = !volumeOverlayEnabled;
		setVolumeOverlayEnabled(next);
		saveSetting("bloom-volume-overlay-enabled", String(next));
	};

	const toggleVolumeEdge = () => {
		const next = !volumeEdgeEnabled;
		setVolumeEdgeEnabled(next);
		saveSetting("bloom-volume-edge-enabled", String(next));
	};

	const toggleBrightnessOverlay = () => {
		const next = !brightnessOverlayEnabled;
		setBrightnessOverlayEnabled(next);
		saveSetting("bloom-brightness-overlay-enabled", String(next));
	};

	const toggleBrightnessEdge = () => {
		const next = !brightnessEdgeEnabled;
		setBrightnessEdgeEnabled(next);
		saveSetting("bloom-brightness-edge-enabled", String(next));
	};

	const toggleNightLight = () => {
		const next = !nightLightEnabled;
		setNightLightEnabled(next);
		saveSetting("bloom-night-light-enabled", String(next));
		invoke("set_night_light", { intensity: next ? nightLightIntensity : 0 }).catch(console.error);
	};

	const changeNightLightIntensity = (value: number) => {
		setNightLightIntensity(value);
		saveSetting("bloom-night-light-intensity", String(value));
		if (nightLightEnabled) {
			invoke("set_night_light", { intensity: value }).catch(console.error);
		}
	};

	const toggleAmbience = () => {
		const next = !mediaAmbienceEnabled;
		setMediaAmbienceEnabled(next);
		saveSetting("bloom-media-ambience-enabled", String(next));
	};

	const toggleCompactGlow = () => {
		const next = !mediaCompactGlowEnabled;
		setMediaCompactGlowEnabled(next);
		saveSetting("bloom-media-compact-glow-enabled", String(next));
	};

	const toggleCorners = () => {
		const next = !cornersEnabled;
		setCornersEnabled(next);
		saveSetting("bloom-corners-enabled", String(next));
	};

	const toggleUpdateIndicator = () => {
		const next = !showUpdateIndicator;
		setShowUpdateIndicator(next);
		saveSetting("bloom-show-update-indicator", String(next));
	};

	const toggleTimeFormat24h = () => {
		const next = !timeFormat24h;
		setTimeFormat24h(next);
		saveSetting("bloom-time-format-24h", String(next));
	};

	const toggleTempUnit = () => {
		const next = !tempUnitFahrenheit;
		setTempUnitFahrenheit(next);
		saveSetting("bloom-temp-unit", next ? "fahrenheit" : "celsius");
	};

	const toggleDock = () => {
		const next = !dockEnabled;
		setDockEnabled(next);
		saveSetting("bloom-dock-enabled", String(next));
	};

	const toggleDockPreview = () => {
		const next = !dockPreviewEnabled;
		setDockPreviewEnabled(next);
		saveSetting("bloom-dock-preview-enabled", String(next));
	};

	const toggleDockIconOnly = () => {
		const next = !dockIconOnly;
		setDockIconOnly(next);
		saveSetting("bloom-dock-icon-only", String(next));
	};

	const toggleDockSeparator = () => {
		const next = !dockSeparatorEnabled;
		setDockSeparatorEnabled(next);
		saveSetting("bloom-dock-separator-enabled", String(next));
	};

	const handleStartIconChange = (icon: string) => {
		setStartIcon(icon);
		saveSetting("bloom-start-icon", icon);
	};

	const toggleDockAdaptive = () => {
		const next = !dockAdaptive;
		setDockAdaptive(next);
		saveSetting("bloom-dock-adaptive", String(next));
	};

	const toggleDockWinNumber = () => {
		const next = !dockWinNumberEnabled;
		setDockWinNumberEnabled(next);
		saveSetting("bloom-dock-win-number-enabled", String(next));
	};

	const handleDockExtrasPositionChange = (position: string) => {
		setDockExtrasPosition(position);
		saveSetting("bloom-dock-extras-position", position);
	};

	const toggleDockExtrasDrives = () => {
		const next = !dockExtrasDrives;
		setDockExtrasDrives(next);
		saveSetting("bloom-dock-extras-drives", String(next));
	};

	const toggleDockExtrasRecycleBin = () => {
		const next = !dockExtrasRecycleBin;
		setDockExtrasRecycleBin(next);
		saveSetting("bloom-dock-extras-recycle-bin", String(next));
	};

	const toggleDockExtraFolder = (id: string) => {
		const next = toggleEnabledFolder(dockExtrasFolders, id);
		setDockExtrasFolders(next);
		saveSetting("bloom-dock-extras-folders", next);
	};

	const handleAddDockExtraFolder = async () => {
		try {
			const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
			const selected = await openDialog({
				title: "Add a folder to the dock",
				directory: true,
				multiple: false
			});
			if (typeof selected === "string") {
				const next = addCustomFolder(dockExtrasCustomFolders, selected);
				setDockExtrasCustomFolders(next);
				saveSetting("bloom-dock-extras-custom-folders", next);
			}
		} catch (e) {
			console.error("Folder picker failed:", e);
		}
	};

	const handleRemoveDockExtraFolder = (path: string) => {
		const next = removeCustomFolder(dockExtrasCustomFolders, path);
		setDockExtrasCustomFolders(next);
		saveSetting("bloom-dock-extras-custom-folders", next);
	};

	const toggleDockMagnify = () => {
		const next = !dockMagnify;
		setDockMagnify(next);
		saveSetting("bloom-dock-magnify", String(next));
	};

	const handleDockMagnifyStrengthChange = (value: number) => {
		setDockMagnifyStrength(value);
		saveSetting("bloom-dock-magnify-strength", value.toString());
	};

	const toggleDockClock = () => {
		const next = !dockClockEnabled;
		setDockClockEnabled(next);
		saveSetting("bloom-dock-clock-enabled", String(next));
	};

	const toggleDockClockShowDate = () => {
		const next = !dockClockShowDate;
		setDockClockShowDate(next);
		saveSetting("bloom-dock-clock-show-date", String(next));
	};

	const toggleDockClockSeconds = () => {
		const next = !dockClockSeconds;
		setDockClockSeconds(next);
		saveSetting("bloom-dock-clock-seconds", String(next));
	};

	const toggleDeskClock = () => {
		const next = !deskClockEnabled;
		setDeskClockEnabled(next);
		saveSetting("bloom-clock-enabled", String(next));
	};

	const toggleDeskClockSeconds = () => {
		const next = !deskClockSeconds;
		setDeskClockSeconds(next);
		saveSetting("bloom-clock-seconds", String(next));
	};

	const toggleDeskClockShowDate = () => {
		const next = !deskClockShowDate;
		setDeskClockShowDate(next);
		saveSetting("bloom-clock-show-date", String(next));
	};

	const handleDeskClockSizeChange = (value: number) => {
		setDeskClockSize(value);
		saveSetting("bloom-clock-size", value.toString());
	};

	const handleDeskClockWallpaperUpload = async (file: File) => {
		try {
			const dataUri = await fileToDataUri(file);
			const path = await invoke<string>("save_wallpaper", {
				filename: file.name,
				data: dataUri
			});
			setDeskClockWallpaper(path);
			saveSetting("bloom-clock-wallpaper", path);
			return path;
		} catch (err) {
			console.error("Failed to set clock wallpaper:", err);
			return null;
		}
	};

	const handleDeskClockWallpaperRemove = () => {
		const prev = deskClockWallpaper;
		setDeskClockWallpaper("");
		saveSetting("bloom-clock-wallpaper", "");
		if (prev) {
			invoke("delete_wallpaper", { path: prev }).catch((err) => console.error(err));
		}
	};

	// ── Lock screen ──
	const toggleLock = () => {
		const next = !lockEnabled;
		setLockEnabled(next);
		saveSetting("bloom-lock-enabled", String(next));
	};

	const toggleLockShowTime = () => {
		const next = !lockShowTime;
		setLockShowTime(next);
		saveSetting("bloom-lock-show-time", String(next));
	};

	const toggleLockShowDate = () => {
		const next = !lockShowDate;
		setLockShowDate(next);
		saveSetting("bloom-lock-show-date", String(next));
	};

	const toggleLockLive = () => {
		const next = !lockLive;
		setLockLive(next);
		saveSetting("bloom-lock-live", String(next));
	};

	const handleLockBlurChange = (value: number) => {
		setLockBlur(value);
		saveSetting("bloom-lock-blur", value.toString());
	};

	const handleLockDimChange = (value: number) => {
		setLockDim(value);
		saveSetting("bloom-lock-dim", value.toString());
	};

	const toggleLockRequirePassword = () => {
		const next = !lockRequirePassword;
		setLockRequirePassword(next);
		saveSetting("bloom-lock-require-password", String(next));
	};

	const handleLockPasswordChange = (value: string) => {
		setLockPassword(value);
		setLockHasPassword(value !== "");
		if (value === "") {
			saveSetting("bloom-lock-password", "");
		} else {
			hashSecret(value).then((hash) => saveSetting("bloom-lock-password", hash));
		}
	};

	// Helper for the many new lock toggles.
	const makeToggle = (current: boolean, setter: (v: boolean) => void, key: string) => () => {
		const next = !current;
		setter(next);
		saveSetting(key, String(next));
	};

	const toggleLockShowSeconds = makeToggle(
		lockShowSeconds,
		setLockShowSeconds,
		"bloom-lock-show-seconds"
	);
	const changeLockMaxNotifications = (value: number) => {
		setLockMaxNotifications(value);
		saveSetting("bloom-lock-max-notifications", String(value));
	};
	const changeLockMaskStyle = (value: string) => {
		setLockMaskStyle(value);
		saveSetting("bloom-lock-mask-style", value);
	};
	const changeLockDateFormat = (value: string) => {
		setLockDateFormat(value);
		saveSetting("bloom-lock-date-format", value);
	};
	const changeLockScrimColor = (value: string) => {
		setLockScrimColor(value);
		saveSetting("bloom-lock-scrim-color", value);
	};
	const toggleLockAnimations = makeToggle(
		lockAnimations,
		setLockAnimations,
		"bloom-lock-animations"
	);
	const toggleLockUnlockGesture = makeToggle(
		lockUnlockGesture,
		setLockUnlockGesture,
		"bloom-lock-unlock-gesture"
	);
	const toggleLockMediaControls = makeToggle(
		lockMediaControls,
		setLockMediaControls,
		"bloom-lock-media-controls"
	);
	const toggleLockWeather = makeToggle(lockWeather, setLockWeather, "bloom-lock-weather");
	const toggleLockQuickActions = makeToggle(
		lockQuickActions,
		setLockQuickActions,
		"bloom-lock-quick-actions"
	);
	const toggleLockShowWidgets = makeToggle(
		lockShowWidgets,
		setLockShowWidgets,
		"bloom-lock-show-widgets"
	);
	const changeLockClockSize = (value: number) => {
		setLockClockSize(value);
		saveSetting("bloom-lock-clock-size", String(value));
	};
	const changeLockClockWeight = (value: number) => {
		setLockClockWeight(value);
		saveSetting("bloom-lock-clock-weight", String(value));
	};
	const changeLockClockPosition = (value: string) => {
		setLockClockPosition(value);
		saveSetting("bloom-lock-clock-position", value);
	};
	const toggleLockClickThrough = makeToggle(
		lockClickThrough,
		setLockClickThrough,
		"bloom-lock-click-through"
	);
	const toggleLockOnResume = makeToggle(lockOnResume, setLockOnResume, "bloom-lock-lock-on-resume");

	const handleLockWallpaperUpload = async (file: File) => {
		try {
			const dataUri = await fileToDataUri(file);
			const path = await invoke<string>("save_wallpaper", {
				filename: file.name,
				data: dataUri
			});
			setLockWallpaper(path);
			saveSetting("bloom-lock-wallpaper", path);
			return path;
		} catch (err) {
			console.error("Failed to save lock wallpaper:", err);
			return null;
		}
	};

	const handleLockWallpaperRemove = () => {
		const prev = lockWallpaper;
		setLockWallpaper("");
		saveSetting("bloom-lock-wallpaper", "");
		if (prev) {
			invoke("delete_wallpaper", { path: prev }).catch((err) => console.error(err));
		}
	};

	const toggleLockAuto = () => {
		const next = !lockAuto;
		setLockAuto(next);
		saveSetting("bloom-lock-auto", String(next));
	};

	const handleLockAutoMinutesChange = (value: number) => {
		setLockAutoMinutes(value);
		saveSetting("bloom-lock-auto-minutes", value.toString());
	};

	const lockNow = () => {
		invoke("show_lock_screen").catch((err) => console.error("Failed to lock:", err));
	};

	const toggleLockShowNotifications = () => {
		const next = !lockShowNotifications;
		setLockShowNotifications(next);
		saveSetting("bloom-lock-show-notifications", String(next));
	};

	const toggleLockIncludeSystemNotifications = () => {
		const next = !lockIncludeSystemNotifications;
		setLockIncludeSystemNotifications(next);
		saveSetting("bloom-lock-include-system-notifications", String(next));
	};

	const handleWindowsLockImageUpload = async (file: File) => {
		try {
			const dataUri = await fileToDataUri(file);
			const path = await invoke<string>("save_wallpaper", {
				filename: file.name,
				data: dataUri
			});
			setWindowsLockImage(path);
			saveSetting("bloom-lock-windows-image", path);
			return path;
		} catch (err) {
			console.error("Failed to save Windows lock image:", err);
			return null;
		}
	};

	const handleWindowsLockImageRemove = () => {
		const prev = windowsLockImage;
		setWindowsLockImage("");
		saveSetting("bloom-lock-windows-image", "");
		if (prev) {
			invoke("delete_wallpaper", { path: prev }).catch((err) => console.error(err));
		}
	};

	const applyWindowsLockImage = async () => {
		if (!windowsLockImage) return;
		setApplyWindowsState("applying");
		try {
			await invoke("set_windows_lock_screen_image", { path: windowsLockImage });
			setApplyWindowsState("success");
		} catch (err) {
			console.error("Failed to apply Windows lock screen image:", err);
			setApplyWindowsState("error");
		} finally {
			setTimeout(() => setApplyWindowsState("idle"), 2500);
		}
	};


	const handleDeskClockResetPosition = () => {
		localStorage.removeItem("bloom-clock-x");
		localStorage.removeItem("bloom-clock-y");
		invoke("save_setting", { key: "bloom-clock-x", value: "" }).catch(console.error);
		invoke("save_setting", { key: "bloom-clock-y", value: "" }).catch(console.error);
	};

	const toggleAutoUpdate = () => {
		const next = !autoUpdate;
		setAutoUpdate(next);
		saveSetting("bloom-auto-update", String(next));
	};

	// ── Value setters ──
	const setDockModeValue = (newMode: string) => {
		setDockMode(newMode);
		saveSetting("bloom-dock-mode", newMode);
	};

	const setNotchModeValue = (newMode: string) => {
		setNotchMode(newMode);
		saveSetting("bloom-notch-mode", newMode);
	};

	const handleNotchEdgeDelayChange = (val: number) => {
		setNotchEdgeDelay(val);
		saveSetting("bloom-notch-edge-delay", val.toString());
	};

	const handleThresholdChange = (val: number) => {
		setLowBatteryThreshold(val);
		saveSetting("bloom-low-battery-threshold", val.toString());
	};

	const handleScaleChange = (val: number) => {
		setScale(val);
		saveSetting("bloom-scale", val.toString());
	};

	const handleWidgetsChange = (config: WidgetConfig) => {
		setStatusWidgets(config);
		saveSetting("bloom-status-widgets", JSON.stringify(config));
	};

	// ── Theme handlers ──
	const handleThemeModeChange = async (mode: string) => {
		setThemeMode(mode);
		saveSetting("bloom-theme-mode", mode);

		if (mode === "adaptive") {
			try {
				const accentHex = await invoke<string>("get_system_accent_color");
				const hsl = hexToHsl(accentHex);
				setThemeSaturation(hsl.s / 100);
				saveSetting("bloom-theme-saturation", String(hsl.s / 100));
				setThemeBrightness(hsl.l / 100);
				saveSetting("bloom-theme-brightness", String(hsl.l / 100));
			} catch (e) {
				console.error("Failed to parse adaptive accent HSL:", e);
			}
		}
	};

	const handleThemeColorChange = (color: string) => {
		setThemeColor(color);
		saveSetting("bloom-theme-color", color);

		try {
			const hsl = hexToHsl(color);
			setThemeSaturation(hsl.s / 100);
			saveSetting("bloom-theme-saturation", String(hsl.s / 100));
			setThemeBrightness(hsl.l / 100);
			saveSetting("bloom-theme-brightness", String(hsl.l / 100));
		} catch (e) {
			console.error("Failed to parse custom color HSL:", e);
		}
	};

	const handleOpacityChange = (value: number) => {
		setThemeOpacity(value);
		saveSetting("bloom-theme-opacity", String(value));
	};

	const handleSaturationChange = (value: number) => {
		setThemeSaturation(value);
		saveSetting("bloom-theme-saturation", String(value));
	};

	const handleBrightnessChange = (value: number) => {
		setThemeBrightness(value);
		saveSetting("bloom-theme-brightness", String(value));
	};

	// ── City search ──
	const selectCity = async (city: {
		name: string;
		country: string;
		latitude: number;
		longitude: number;
	}) => {
		setCityName(city.name);
		setShowCityDropdown(false);
		setCitySearchResults([]);
		localStorage.setItem("bloom-weather-city", city.name);
		localStorage.setItem("bloom-weather-lat", city.latitude.toString());
		localStorage.setItem("bloom-weather-lon", city.longitude.toString());
		await invoke("save_setting", {
			key: "bloom-weather-lat",
			value: city.latitude.toString()
		}).catch(() => {});
		await invoke("save_setting", {
			key: "bloom-weather-lon",
			value: city.longitude.toString()
		}).catch(() => {});
		await invoke("save_setting", { key: "bloom-weather-city", value: city.name }).catch(() => {});
		emit("weather-refresh", { lat: city.latitude, lon: city.longitude });
	};

	const handleCityClear = async () => {
		setCityName("");
		setShowCityDropdown(false);
		setCitySearchResults([]);
		localStorage.removeItem("bloom-weather-city");
		localStorage.removeItem("bloom-weather-lat");
		localStorage.removeItem("bloom-weather-lon");
		await invoke("save_setting", { key: "bloom-weather-lat", value: null }).catch(() => {});
		await invoke("save_setting", { key: "bloom-weather-lon", value: null }).catch(() => {});
		await invoke("save_setting", { key: "bloom-weather-city", value: null }).catch(() => {});
		emit("weather-refresh", true);
	};

	// ── Reset to defaults ──
	const resetToDefaults = async () => {
		try {
			const { ask } = await import("@tauri-apps/plugin-dialog");
			const confirmed = await ask(
				"All settings return to their defaults and Bloom restarts. Pinned apps and custom icons are kept.",
				{
					title: "Reset Bloom to Defaults",
					kind: "warning",
					okLabel: "Reset and Restart",
					cancelLabel: "Cancel"
				}
			);
			if (!confirmed) return;

			await invoke("reset_settings");

			// settings.json is cleared, but every window also caches bloom keys
			// in localStorage; drop them so the restart can't resurrect values.
			// The first-run/version sentinels are lifecycle markers, not
			// preferences — keeping them avoids replaying the splash, which
			// would also re-trigger the first-run autostart enable.
			const keep = new Set(["bloom-first-run", "bloom-app-version"]);
			for (const key of Object.keys(localStorage)) {
				if (key.startsWith("bloom-") && !keep.has(key)) localStorage.removeItem(key);
			}

			await invoke("restart_bloom").catch(console.error);
		} catch (e) {
			console.error("Reset failed:", e);
		}
	};

	// ── Export / Import ──
	const handleExportSettings = async () => {
		setExportStatus("exporting");
		try {
			const { save: saveDialog } = await import("@tauri-apps/plugin-dialog");
			const settingsJson = await invoke<string>("export_settings");
			const filePath = await saveDialog({
				title: "Export Bloom Settings",
				defaultPath: "bloom-settings.json",
				filters: [{ name: "JSON", extensions: ["json"] }]
			});
			if (filePath) {
				await invoke("write_settings_to_path", { path: filePath, content: settingsJson });
				setExportStatus("success");
				setTimeout(() => setExportStatus("idle"), 2000);
			} else {
				setExportStatus("idle");
			}
		} catch (e) {
			console.error("Export failed:", e);
			setExportStatus("error");
			setTimeout(() => setExportStatus("idle"), 3000);
		}
	};

	const handleImportSettings = async () => {
		setImportStatus("importing");
		try {
			const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
			const filePath = await openDialog({
				title: "Import Bloom Settings",
				filters: [{ name: "JSON", extensions: ["json"] }],
				multiple: false
			});
			if (filePath) {
				const content = await invoke<string>("read_settings_from_path", {
					path: filePath as string
				});
				await invoke("import_settings", { settings: content });
				await loadAllSettings();
				setImportStatus("success");
				setTimeout(() => setImportStatus("idle"), 2000);
			} else {
				setImportStatus("idle");
			}
		} catch (e) {
			console.error("Import failed:", e);
			setImportStatus("error");
			setTimeout(() => setImportStatus("idle"), 3000);
		}
	};

	return {
		// System
		autostart,
		toggleAutostart,
		autoUpdate,
		toggleAutoUpdate,
		lowBatteryThreshold,
		handleThresholdChange,
		timeFormat24h,
		toggleTimeFormat24h,
		showUpdateIndicator,
		toggleUpdateIndicator,
		scale,
		handleScaleChange,
		cornersEnabled,
		toggleCorners,

		// Theme
		themeMode,
		handleThemeModeChange,
		themeColor,
		handleThemeColorChange,
		themeOpacity,
		handleOpacityChange,
		themeSaturation,
		handleSaturationChange,
		themeBrightness,
		handleBrightnessChange,

		// Notch
		notchMode,
		setNotchModeValue,
		notchEdgeDelay,
		handleNotchEdgeDelayChange,
		calendarEnabled,
		toggleCalendar,
		timerSoundEnabled,
		toggleTimerSound,
		musicModeEnabled,
		toggleMusicMode,
		musicCompactNotch,
		toggleMusicCompactNotch,
		shelfPersist,
		toggleShelfPersist,
		mediaLayout,
		toggleMediaLayout,
		mediaAmbienceEnabled,
		toggleAmbience,
		mediaCompactGlowEnabled,
		toggleCompactGlow,

		// Weather
		weatherEnabled,
		toggleWeather,
		tempUnitFahrenheit,
		toggleTempUnit,
		cityName,
		setCityName,
		citySearchResults,
		showCityDropdown,
		setShowCityDropdown,
		selectCity,
		handleCityClear,

		// Widgets
		statusWidgets,
		handleWidgetsChange,

		// Dock
		dockEnabled,
		toggleDock,
		dockMode,
		setDockModeValue,
		dockPreviewEnabled,
		toggleDockPreview,
		dockIconOnly,
		toggleDockIconOnly,
		dockSeparatorEnabled,
		toggleDockSeparator,
		startIcon,
		handleStartIconChange,
		dockAdaptive,
		toggleDockAdaptive,
		dockWinNumberEnabled,
		toggleDockWinNumber,
		dockExtrasPosition,
		handleDockExtrasPositionChange,
		dockExtrasDrives,
		toggleDockExtrasDrives,
		dockExtrasRecycleBin,
		toggleDockExtrasRecycleBin,
		dockExtrasFolders,
		toggleDockExtraFolder,
		dockExtrasCustomFolders,
		handleAddDockExtraFolder,
		handleRemoveDockExtraFolder,
		dockMagnify,
		toggleDockMagnify,
		dockMagnifyStrength,
		handleDockMagnifyStrengthChange,
		dockClockEnabled,
		toggleDockClock,
		dockClockShowDate,
		toggleDockClockShowDate,
		dockClockSeconds,
		toggleDockClockSeconds,
		deskClockEnabled,
		toggleDeskClock,
		deskClockSeconds,
		toggleDeskClockSeconds,
		deskClockShowDate,
		toggleDeskClockShowDate,
		deskClockSize,
		handleDeskClockSizeChange,
		deskClockWallpaper,
		handleDeskClockWallpaperUpload,
		handleDeskClockWallpaperRemove,

		// Lock Screen
		lockEnabled,
		toggleLock,
		lockShowTime,
		toggleLockShowTime,
		lockShowDate,
		toggleLockShowDate,
		lockLive,
		toggleLockLive,
		lockWallpaper,
		handleLockWallpaperUpload,
		handleLockWallpaperRemove,
		lockBlur,
		handleLockBlurChange,
		lockDim,
		handleLockDimChange,
		lockRequirePassword,
		toggleLockRequirePassword,
		lockPassword,
		handleLockPasswordChange,
		lockHasPassword,
		lockAuto,
		toggleLockAuto,
		lockAutoMinutes,
		handleLockAutoMinutesChange,
		lockNow,
		lockShowNotifications,
		toggleLockShowNotifications,
		lockIncludeSystemNotifications,
		toggleLockIncludeSystemNotifications,
		windowsLockImage,
		handleWindowsLockImageUpload,
		handleWindowsLockImageRemove,
		applyWindowsLockImage,
		applyWindowsState,
		lockShowSeconds,
		toggleLockShowSeconds,
		lockMaxNotifications,
		changeLockMaxNotifications,
		lockMaskStyle,
		changeLockMaskStyle,
		lockDateFormat,
		changeLockDateFormat,
		lockScrimColor,
		changeLockScrimColor,
		lockAnimations,
		toggleLockAnimations,
		lockUnlockGesture,
		toggleLockUnlockGesture,
		lockMediaControls,
		toggleLockMediaControls,
		lockWeather,
		toggleLockWeather,
		lockQuickActions,
		toggleLockQuickActions,
		lockShowWidgets,
		toggleLockShowWidgets,
		lockClockSize,
		changeLockClockSize,
		lockClockWeight,
		changeLockClockWeight,
		lockClockPosition,
		changeLockClockPosition,
		lockClickThrough,
		toggleLockClickThrough,
		lockOnResume,
		toggleLockOnResume,
		handleDeskClockResetPosition,

		// Overlays
		volumeOverlayEnabled,
		toggleVolumeOverlay,
		volumeEdgeEnabled,
		toggleVolumeEdge,
		brightnessOverlayEnabled,
		toggleBrightnessOverlay,
		brightnessEdgeEnabled,
		toggleBrightnessEdge,
		nightLightEnabled,
		nightLightIntensity,
		toggleNightLight,
		changeNightLightIntensity,

		// Updates
		updateStatus,
		updateVersion,
		appVersion,
		checkForUpdates,
		installUpdate,

		// Import / Export
		exportStatus,
		importStatus,
		handleExportSettings,
		handleImportSettings,

		// Utilities
		restartBloom: () => invoke("restart_bloom"),
		resetToDefaults,
		quitBloom: () => invoke("quit_bloom")
	};
}
