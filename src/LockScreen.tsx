import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useSettingsSync } from "./hooks/useSettingsSync";
import { useWeather } from "./hooks/useWeather";
import { verifySecret } from "./lib/hash";

const KEYS = {
	showTime: "bloom-lock-show-time",
	showDate: "bloom-lock-show-date",
	wallpaper: "bloom-lock-wallpaper",
	live: "bloom-lock-live",
	blur: "bloom-lock-blur",
	dim: "bloom-lock-dim",
	requirePassword: "bloom-lock-require-password",
	password: "bloom-lock-password",
	time24h: "bloom-time-format-24h",
	showNotifications: "bloom-lock-show-notifications",
	includeSystemNotifications: "bloom-lock-include-system-notifications",
	showSeconds: "bloom-lock-show-seconds",
	maxNotifications: "bloom-lock-max-notifications",
	maskStyle: "bloom-lock-mask-style",
	dateFormat: "bloom-lock-date-format",
	scrimColor: "bloom-lock-scrim-color",
	animations: "bloom-lock-animations",
	unlockGesture: "bloom-lock-unlock-gesture",
	mediaControls: "bloom-lock-media-controls",
	weather: "bloom-lock-weather",
	quickActions: "bloom-lock-quick-actions",
	showWidgets: "bloom-lock-show-widgets",
	clockSize: "bloom-lock-clock-size",
	clockWeight: "bloom-lock-clock-weight",
	clockPosition: "bloom-lock-clock-position",
	clickThrough: "bloom-lock-click-through",
	onResume: "bloom-lock-lock-on-resume"
};

interface AppNotification {
	id: number;
	app_name: string;
	app_id: string;
	title: string;
	body: string;
	timestamp: number;
	icon: string | null;
	is_system: boolean;
}

interface MediaInfo {
	title: string;
	artist: string;
	is_playing: boolean;
	has_media: boolean;
	artwork?: string[];
}

const EMOJIS = ["🌸", "✨", "💖", "⭐", "🦄", "🍀", "🍩", "🍓", "🦋", "🍄"];

const readNumber = (key: string, fallback: number) => {
	const raw = localStorage.getItem(key);
	const parsed = raw === null ? fallback : parseFloat(raw);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const readBool = (key: string, fallback: boolean) => {
	const raw = localStorage.getItem(key);
	return raw === null ? fallback : raw === "true";
};

const readString = (key: string, fallback: string) => localStorage.getItem(key) || fallback;

export function LockScreen() {
	const [showTime, setShowTime] = useState(() => readBool(KEYS.showTime, true));
	const [showDate, setShowDate] = useState(() => readBool(KEYS.showDate, true));
	const [wallpaperPath, setWallpaperPath] = useState(() => readString(KEYS.wallpaper, ""));
	const [live, setLive] = useState(() => readBool(KEYS.live, false));
	const [blur, setBlur] = useState(() => readNumber(KEYS.blur, 0));
	const [dim, setDim] = useState(() => readNumber(KEYS.dim, 0.35));
	const [requirePassword, setRequirePassword] = useState(() => readBool(KEYS.requirePassword, false));
	const [password, setPassword] = useState(() => readString(KEYS.password, ""));
	const [use24h, setUse24h] = useState(() => readBool(KEYS.time24h, false));
	const [showNotifications, setShowNotifications] = useState(() => readBool(KEYS.showNotifications, true));
	const [includeSystem, setIncludeSystem] = useState(() => readBool(KEYS.includeSystemNotifications, false));
	const [showSeconds, setShowSeconds] = useState(() => readBool(KEYS.showSeconds, false));
	const [maxNotifications, setMaxNotifications] = useState(() => readNumber(KEYS.maxNotifications, 5));
	const [maskStyle, setMaskStyle] = useState(() => readString(KEYS.maskStyle, "emoji"));
	const [dateFormat, setDateFormat] = useState(() => readString(KEYS.dateFormat, "long"));
	const [scrimColor, setScrimColor] = useState(() => readString(KEYS.scrimColor, "#000000"));
	const [animations, setAnimations] = useState(() => readBool(KEYS.animations, true));
	const [unlockGesture, setUnlockGesture] = useState(() => readBool(KEYS.unlockGesture, true));
	const [showMediaControls, setShowMediaControls] = useState(() => readBool(KEYS.mediaControls, false));
	const [showWeather, setShowWeather] = useState(() => readBool(KEYS.weather, false));
	const [showQuickActions, setShowQuickActions] = useState(() => readBool(KEYS.quickActions, false));
	const [showWidgets, setShowWidgets] = useState(() => readBool(KEYS.showWidgets, false));
	const [clockSize, setClockSize] = useState(() => readNumber(KEYS.clockSize, 140));
	const [clockWeight, setClockWeight] = useState(() => readNumber(KEYS.clockWeight, 200));
	const [clockPosition, setClockPosition] = useState(() => readString(KEYS.clockPosition, "center"));
	const [clickThrough, setClickThrough] = useState(() => readBool(KEYS.clickThrough, false));
	const [onResume, setOnResume] = useState(() => readBool(KEYS.onResume, false));

	const [notifications, setNotifications] = useState<AppNotification[]>([]);
	const [dismissed, setDismissed] = useState<Set<number>>(() => new Set());
	const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
	const [media, setMedia] = useState<MediaInfo | null>(null);
	const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
	const [mediaUrl, setMediaUrl] = useState<string | null>(null);
	const [now, setNow] = useState(() => new Date());
	const [input, setInput] = useState("");
	const [error, setError] = useState(false);
	const passwordRef = useRef<HTMLInputElement>(null);

	const { temperature, weatherIcon: WeatherIcon, tempUnit } = useWeather(showWeather);

	// ── Load persisted settings ──
	useEffect(() => {
		invoke<Record<string, unknown>>("load_settings")
			.then((settings) => {
				const get = (key: string): string | null => {
					const val = settings[key];
					if (val !== undefined && val !== null) return String(val);
					return localStorage.getItem(key);
				};
				const t = (k: string, setter: (v: boolean) => void) => {
					const v = get(k);
					if (v !== null) setter(v === "true");
				};
				const n = (k: string, setter: (v: number) => void) => {
					const v = get(k);
					if (v !== null && Number.isFinite(parseFloat(v))) setter(parseFloat(v));
				};
				const s = (k: string, setter: (v: string) => void) => {
					const v = get(k);
					if (v !== null) setter(v);
				};

				t(KEYS.showTime, setShowTime);
				t(KEYS.showDate, setShowDate);
				s(KEYS.wallpaper, setWallpaperPath);
				t(KEYS.live, setLive);
				n(KEYS.blur, setBlur);
				n(KEYS.dim, setDim);
				t(KEYS.requirePassword, setRequirePassword);
				s(KEYS.password, setPassword);
				t(KEYS.time24h, setUse24h);
				t(KEYS.showNotifications, setShowNotifications);
				t(KEYS.includeSystemNotifications, setIncludeSystem);
				t(KEYS.showSeconds, setShowSeconds);
				n(KEYS.maxNotifications, setMaxNotifications);
				s(KEYS.maskStyle, setMaskStyle);
				s(KEYS.dateFormat, setDateFormat);
				s(KEYS.scrimColor, setScrimColor);
				t(KEYS.animations, setAnimations);
				t(KEYS.unlockGesture, setUnlockGesture);
				t(KEYS.mediaControls, setShowMediaControls);
				t(KEYS.weather, setShowWeather);
				t(KEYS.quickActions, setShowQuickActions);
				t(KEYS.showWidgets, setShowWidgets);
				n(KEYS.clockSize, setClockSize);
				n(KEYS.clockWeight, setClockWeight);
				s(KEYS.clockPosition, setClockPosition);
				t(KEYS.clickThrough, setClickThrough);
				t(KEYS.onResume, setOnResume);
			})
			.catch(() => {});
	}, []);

	// ── Live sync from Settings window ──
	useSettingsSync({
		[KEYS.showTime]: (v) => setShowTime(v !== false && v !== "false"),
		[KEYS.showDate]: (v) => setShowDate(v !== false && v !== "false"),
		[KEYS.wallpaper]: (v) => setWallpaperPath(String(v ?? "")),
		[KEYS.live]: (v) => setLive(v === true || v === "true"),
		[KEYS.blur]: (v) => {
			const parsed = Number(v);
			if (Number.isFinite(parsed)) setBlur(parsed);
		},
		[KEYS.dim]: (v) => {
			const parsed = Number(v);
			if (Number.isFinite(parsed)) setDim(parsed);
		},
		[KEYS.requirePassword]: (v) => setRequirePassword(v === true || v === "true"),
		[KEYS.password]: (v) => setPassword(String(v ?? "")),
		[KEYS.time24h]: (v) => setUse24h(v === true || v === "true"),
		[KEYS.showNotifications]: (v) => setShowNotifications(v === true || v === "true"),
		[KEYS.includeSystemNotifications]: (v) => setIncludeSystem(v === true || v === "true"),
		[KEYS.showSeconds]: (v) => setShowSeconds(v === true || v === "true"),
		[KEYS.maxNotifications]: (v) => {
			const parsed = Number(v);
			if (Number.isFinite(parsed)) setMaxNotifications(parsed);
		},
		[KEYS.maskStyle]: (v) => setMaskStyle(String(v ?? "emoji")),
		[KEYS.dateFormat]: (v) => setDateFormat(String(v ?? "long")),
		[KEYS.scrimColor]: (v) => setScrimColor(String(v ?? "#000000")),
		[KEYS.animations]: (v) => setAnimations(v === true || v === "true"),
		[KEYS.unlockGesture]: (v) => setUnlockGesture(v === true || v === "true"),
		[KEYS.mediaControls]: (v) => setShowMediaControls(v === true || v === "true"),
		[KEYS.weather]: (v) => setShowWeather(v === true || v === "true"),
		[KEYS.quickActions]: (v) => setShowQuickActions(v === true || v === "true"),
		[KEYS.showWidgets]: (v) => setShowWidgets(v === true || v === "true"),
		[KEYS.clockSize]: (v) => {
			const parsed = Number(v);
			if (Number.isFinite(parsed)) setClockSize(parsed);
		},
		[KEYS.clockWeight]: (v) => {
			const parsed = Number(v);
			if (Number.isFinite(parsed)) setClockWeight(parsed);
		},
		[KEYS.clockPosition]: (v) => setClockPosition(String(v ?? "center")),
		[KEYS.clickThrough]: (v) => setClickThrough(v === true || v === "true"),
		[KEYS.onResume]: (v) => setOnResume(v === true || v === "true")
	});

	// ── Poll notifications ──
	useEffect(() => {
		if (!showNotifications) {
			setNotifications([]);
			return;
		}
		const limit = Math.max(1, Math.min(20, Math.round(maxNotifications)));
		const fetchNotes = () => {
			invoke<AppNotification[]>("get_notifications", {
				limit,
				includeSystem
			})
				.then((res) => setNotifications(res || []))
				.catch(() => {});
		};
		fetchNotes();
		const id = window.setInterval(fetchNotes, 4000);
		return () => window.clearInterval(id);
	}, [showNotifications, includeSystem, maxNotifications]);

	// ── Tick ──
	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	// ── Resolve wallpaper ──
	useEffect(() => {
		if (!wallpaperPath) {
			setMediaUrl(null);
			return;
		}
		let cancelled = false;
		invoke<string | null>("read_wallpaper", { path: wallpaperPath })
			.then((url) => {
				if (!cancelled) setMediaUrl(url ?? null);
			})
			.catch(() => {
				if (!cancelled) setMediaUrl(null);
			});
		return () => {
			cancelled = true;
		};
	}, [wallpaperPath]);

	// ── Media controls ──
	useEffect(() => {
		if (!showMediaControls) {
			setMedia(null);
			return;
		}
		let cancelled = false;
		const un = listen<MediaInfo>("media-update", (e) => {
			if (!cancelled) setMedia(e.payload);
		});
		invoke<MediaInfo>("get_media_info")
			.then((i) => {
				if (!cancelled) setMedia(i);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			un.then((fn) => fn());
		};
	}, [showMediaControls]);

	// ── Battery widget ──
	useEffect(() => {
		if (!showWidgets) {
			setBattery(null);
			return;
		}
		let cancelled = false;
		const poll = () => {
			invoke<{ level: number; charging: boolean }>("get_battery_level")
				.then((b) => {
					if (!cancelled) setBattery(b);
				})
				.catch(() => {
					if (!cancelled) setBattery(null);
				});
		};
		poll();
		const id = window.setInterval(poll, 30000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, [showWidgets]);

	// ── Click-through ──
	// A click-through lock screen cannot be clicked to focus its input, so it
	// must stay interactive whenever a password has to be typed.
	useEffect(() => {
		const ignore = clickThrough && !requirePassword;
		invoke("set_ignore_cursor_events", { ignore }).catch(() => {});
	}, [clickThrough, requirePassword]);

	// ── Lock on resume ──
	useEffect(() => {
		invoke("set_lock_resume_lock", { enabled: onResume }).catch(() => {});
	}, [onResume]);

	const attemptUnlock = useCallback(
		async (value: string) => {
			if (requirePassword) {
				const ok = await verifySecret(value, password);
				if (!ok) {
					setError(true);
					return;
				}
			}
			setInput("");
			setError(false);
			invoke("hide_lock_screen").catch(() => {});
		},
		[requirePassword, password]
	);

	const handleUnlockKey = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") return;
			if (requirePassword) {
				// Password mode: Enter submits. Text entry is normally handled by
				// the (invisible) input's onChange, but the input can lose DOM
				// focus when the window is shown — so capture keystrokes here too
				// as long as the input is not already the active element.
				if (e.key === "Enter") {
					void attemptUnlock(input);
					return;
				}
				if (document.activeElement === passwordRef.current) return;
				if (e.key === "Backspace") {
					setInput((v) => v.slice(0, -1));
					setError(false);
					return;
				}
				if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
					setInput((v) => v + e.key);
					setError(false);
				}
				return;
			}
			if (unlockGesture) void attemptUnlock("");
		},
		[requirePassword, input, attemptUnlock, unlockGesture]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleUnlockKey);
		return () => window.removeEventListener("keydown", handleUnlockKey);
	}, [handleUnlockKey]);

	// Keep the invisible password input focused whenever the lock window has
	// focus, so native typing (and paste/IME) works in addition to the global
	// key capture above.
	const focusPasswordInput = useCallback(() => {
		if (requirePassword) passwordRef.current?.focus();
	}, [requirePassword]);

	useEffect(() => {
		focusPasswordInput();
		window.addEventListener("focus", focusPasswordInput);
		return () => window.removeEventListener("focus", focusPasswordInput);
	}, [focusPasswordInput]);

	// The lock window is created hidden at startup, so any mount-time focus is a
	// no-op. When the backend (re)shows it, grab OS focus and clear stale input.
	useEffect(() => {
		const un = listen("lock-shown", () => {
			setInput("");
			setError(false);
			getCurrentWebviewWindow()
				.setFocus()
				.catch(() => {});
			window.setTimeout(() => passwordRef.current?.focus(), 30);
		});
		return () => {
			un.then((fn) => fn());
		};
	}, []);

	const isVideo = !!mediaUrl && mediaUrl.startsWith("data:video/");

	const { hh, mm, ss, dateStr } = useMemo(() => {
		const h24 = now.getHours();
		const h12 = h24 % 12 || 12;
		const pad = (n: number) => String(n).padStart(2, "0");
		const base: Intl.DateTimeFormatOptions =
			dateFormat === "short"
				? { weekday: "short", month: "short", day: "numeric" }
				: dateFormat === "numeric"
					? { day: "2-digit", month: "2-digit", year: "numeric" }
					: { weekday: "long", month: "long", day: "numeric" };
		return {
			hh: pad(use24h ? h24 : h12),
			mm: pad(now.getMinutes()),
			ss: pad(now.getSeconds()),
			dateStr: now.toLocaleDateString(undefined, base)
		};
	}, [now, use24h, dateFormat]);

	const handleBackgroundClick = () => {
		if (!requirePassword && unlockGesture) void attemptUnlock("");
	};

	const toggleExpand = (id: number) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const dismiss = (id: number) => {
		setDismissed((prev) => new Set(prev).add(id));
	};

	const visibleNotifications = useMemo(
		() =>
			notifications
				.filter((n) => !dismissed.has(n.id))
				.slice(0, Math.max(1, Math.round(maxNotifications))),
		[notifications, dismissed, maxNotifications]
	);

	const changeVolume = (delta: number) => {
		invoke<number>("get_volume")
			.then((v) => invoke("set_volume", { volume: Math.min(1, Math.max(0, v + delta)) }))
			.catch(() => {});
	};

	const clockStyle = {
		fontSize: `${clockSize}px`,
		fontWeight: clockWeight
	} as React.CSSProperties;

	const renderMask = () => {
		if (input.length === 0) return null;
		if (maskStyle === "none") return <span className="lock-plain-text">{input}</span>;
		if (maskStyle === "dots")
			return (
				<>
					{input.split("").map((_, i) => (
						<span key={i} className="lock-masked-emoji">
							•
						</span>
					))}
				</>
			);
		return (
			<>
				{input.split("").map((_, i) => {
					const emoji =
						EMOJIS[(i * 7 + input.charCodeAt(i % input.length)) % EMOJIS.length];
					return (
						<span key={i} className="lock-masked-emoji">
							{emoji}
						</span>
					);
				})}
			</>
		);
	};

	return (
		<div
			className={`lock-root${animations ? "" : " lock-no-anim"}`}
			onClick={handleBackgroundClick}
			style={
				{
					"--lock-dim": dim
				} as React.CSSProperties
			}
		>
			{mediaUrl &&
				(isVideo ? (
					<video
						className="lock-media"
						src={mediaUrl}
						autoPlay={live}
						loop
						muted
						playsInline
						style={{ filter: blur ? `blur(${blur}px)` : undefined }}
					/>
				) : (
					<div
						className="lock-media"
						style={{
							backgroundImage: `url(${mediaUrl})`,
							filter: blur ? `blur(${blur}px)` : undefined
						}}
					/>
				))}
			<div className="lock-scrim" style={{ backgroundColor: scrimColor, opacity: dim }} />

			<div className={`lock-content pos-${clockPosition}`} onClick={(e) => e.stopPropagation()}>
				<div className={`lock-hero pos-${clockPosition}`}>
					{showTime && (
						<div className="lock-clock">
							<span className="lock-time" style={clockStyle}>
								{hh}:{mm}
								{showSeconds && <span className="lock-seconds">:{ss}</span>}
							</span>
						</div>
					)}
					{showDate && <div className="lock-date">{dateStr}</div>}

					<div className="lock-widget-row">
						{showWeather && temperature !== null && (
							<span className="lock-chip">
								<WeatherIcon size={15} />
								{temperature}°{tempUnit === "fahrenheit" ? "F" : "C"}
							</span>
						)}
						{showWidgets && battery && (
							<span className="lock-chip">
								<span className="lock-battery">
									<span
										className="lock-battery-fill"
										style={{ width: `${battery.level}%` }}
									/>
								</span>
								{battery.level}%
								{battery.charging ? " ⚡" : ""}
							</span>
						)}
					</div>
				</div>

				{showMediaControls && media && media.has_media && (
					<div className="lock-media-bar">
						<div className="lock-media-meta">
							{media.artwork?.[0] && <img src={media.artwork[0]} alt="" />}
							<div>
								<div className="lock-media-title">{media.title}</div>
								<div className="lock-media-artist">{media.artist}</div>
							</div>
						</div>
						<div className="lock-media-buttons">
							<button onClick={() => invoke("media_previous").catch(() => {})}>⏮</button>
							<button onClick={() => invoke("media_play_pause").catch(() => {})}>
								{media.is_playing ? "⏸" : "⏵"}
							</button>
							<button onClick={() => invoke("media_next").catch(() => {})}>⏭</button>
						</div>
					</div>
				)}

				{showNotifications && visibleNotifications.length > 0 && (
					<div className="lock-notifications">
						{visibleNotifications.map((n) => (
							<div key={n.id} className="lock-notif-card">
								<button
									className="lock-notif-close"
									onClick={() => dismiss(n.id)}
									title="Dismiss"
								>
									✕
								</button>
								<div className="lock-notif-header">
									{n.icon ? (
										<img src={n.icon} className="lock-notif-icon" alt="" />
									) : (
										<div className="lock-notif-icon-fallback" />
									)}
									<span className="lock-notif-app">{n.app_name}</span>
								</div>
								{n.title && <div className="lock-notif-title">{n.title}</div>}
								<div
									className={`lock-notif-body${expanded.has(n.id) ? " expanded" : ""}`}
									onClick={(e) => {
										e.stopPropagation();
										toggleExpand(n.id);
									}}
									title="Tap to expand"
								>
									{n.body}
								</div>
							</div>
						))}
					</div>
				)}

				{showQuickActions && (
					<div className="lock-quick-row">
						<button onClick={() => changeVolume(-0.1)}>Vol −</button>
						<button onClick={() => invoke("set_volume", { volume: 0 }).catch(() => {})}>
							Mute
						</button>
						<button onClick={() => changeVolume(0.1)}>Vol +</button>
					</div>
				)}

				<div className="lock-unlock">
					{requirePassword ? (
						<div className="lock-password">
							<div
								className={`lock-custom-input ${error ? "error" : ""}`}
								onClick={() => passwordRef.current?.focus()}
							>
								<div className="lock-emoji-display">
									{input.length === 0 ? (
										<span className="lock-placeholder">Enter password</span>
									) : (
										renderMask()
									)}
								</div>
								<input
									ref={passwordRef}
									type="text"
									autoFocus
									value={input}
									className="lock-hidden-field"
									onChange={(e) => {
										setInput(e.target.value);
										setError(false);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") void attemptUnlock(input);
									}}
								/>
							</div>
							<button type="button" onClick={() => void attemptUnlock(input)}>
								Unlock
							</button>
						</div>
					) : (
						<span className="lock-hint">
							{unlockGesture ? "Press any key to unlock" : " "}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
