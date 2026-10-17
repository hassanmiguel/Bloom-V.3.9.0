import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "framer-motion";
import { useSettingsSync } from "./hooks/useSettingsSync";

const SETTING = {
	enabled: "bloom-clock-enabled",
	seconds: "bloom-clock-seconds",
	showDate: "bloom-clock-show-date",
	size: "bloom-clock-size",
	wallpaper: "bloom-clock-wallpaper",
	x: "bloom-clock-x",
	y: "bloom-clock-y",
	time24h: "bloom-time-format-24h"
} as const;

const WINDOW_PADDING = 0;
const SCREEN_MARGIN = 24;

const pad2 = (n: number) => n.toString().padStart(2, "0");

function FlipDigit({ char }: { char: string }) {
	return (
		<div className="flip-digit">
			<AnimatePresence initial={false}>
				<motion.span
					key={char}
					className="flip-digit-value"
					initial={{ rotateX: -90, opacity: 0 }}
					animate={{ rotateX: 0, opacity: 1 }}
					exit={{ rotateX: 90, opacity: 0 }}
					transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
				>
					{char}
				</motion.span>
			</AnimatePresence>
			<span className="flip-digit-seam" />
		</div>
	);
}

function FlipGroup({ value }: { value: string }) {
	return (
		<div className="flip-group">
			<FlipDigit char={value[0]} />
			<FlipDigit char={value[1]} />
		</div>
	);
}

function Colon({ compact = false }: { compact?: boolean }) {
	return (
		<div className={`clock-colon ${compact ? "compact" : ""}`}>
			<span className="clock-colon-dot" />
			<span className="clock-colon-dot" />
		</div>
	);
}

export function ClockWidget() {
	const [enabled, setEnabled] = useState(
		() => localStorage.getItem(SETTING.enabled) === "true"
	);
	const [seconds, setSeconds] = useState(
		() => localStorage.getItem(SETTING.seconds) === "true"
	);
	const [showDate, setShowDate] = useState(
		() => localStorage.getItem(SETTING.showDate) !== "false"
	);
	const [use24h, setUse24h] = useState(
		() => localStorage.getItem(SETTING.time24h) === "true"
	);
	const [size, setSize] = useState(() => {
		const raw = localStorage.getItem(SETTING.size);
		const parsed = raw === null ? 1 : parseFloat(raw);
		return Number.isFinite(parsed) ? Math.min(1.6, Math.max(0.7, parsed)) : 1;
	});
	const [wallpaperPath, setWallpaperPath] = useState(
		() => localStorage.getItem(SETTING.wallpaper) || ""
	);
	const [mediaUrl, setMediaUrl] = useState<string | null>(null);
	const [now, setNow] = useState(() => new Date());
	const [dragging, setDragging] = useState(false);

	const widgetRef = useRef<HTMLDivElement>(null);
	const posTimer = useRef<number | null>(null);

	// ── Load persisted settings on mount (settings.json first, localStorage fallback) ──
	useEffect(() => {
		invoke<Record<string, unknown>>("load_settings")
			.then((settings) => {
				const get = (key: string): string | null => {
					const val = settings[key];
					if (val !== undefined && val !== null) return String(val);
					return localStorage.getItem(key);
				};
				const enabledVal = get(SETTING.enabled);
				if (enabledVal !== null) setEnabled(enabledVal === "true");
				const secondsVal = get(SETTING.seconds);
				if (secondsVal !== null) setSeconds(secondsVal === "true");
				const dateVal = get(SETTING.showDate);
				if (dateVal !== null) setShowDate(dateVal === "true");
				const h24Val = get(SETTING.time24h);
				if (h24Val !== null) setUse24h(h24Val === "true");
				const sizeVal = get(SETTING.size);
				if (sizeVal !== null) {
					const parsed = parseFloat(sizeVal);
					if (Number.isFinite(parsed)) setSize(Math.min(1.6, Math.max(0.7, parsed)));
				}
				setWallpaperPath(get(SETTING.wallpaper) ?? "");
			})
			.catch(() => {});
	}, []);

	// ── Clock ticking (only re-renders when the visible value changes) ──
	useEffect(() => {
		if (!enabled) return;
		const tick = () => {
			setNow((prev) => {
				const d = new Date();
				if (
					!seconds &&
					d.getMinutes() === prev.getMinutes() &&
					d.getHours() === prev.getHours()
				) {
					return prev;
				}
				return d;
			});
		};
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [enabled, seconds]);

	// ── Resolve wallpaper path to a data URI ──
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

	const widgetSize = useCallback(() => {
		const el = widgetRef.current;
		const rect = el?.getBoundingClientRect();
		const w = Math.ceil(rect?.width || 280) + WINDOW_PADDING * 2;
		const h = Math.ceil(rect?.height || 160) + WINDOW_PADDING * 2;
		return { w, h };
	}, []);

	const syncWindowSize = useCallback(async () => {
		const { w, h } = widgetSize();
		try {
			await getCurrentWebviewWindow().setSize(new LogicalSize(w, h));
		} catch (e) {
			console.error("clock setSize failed:", e);
		}
	}, [widgetSize]);

	const persistPosition = useCallback((x: number, y: number) => {
		const lx = String(Math.round(x));
		const ly = String(Math.round(y));
		if (
			localStorage.getItem(SETTING.x) === lx &&
			localStorage.getItem(SETTING.y) === ly
		) {
			return;
		}
		localStorage.setItem(SETTING.x, lx);
		localStorage.setItem(SETTING.y, ly);
		invoke("save_setting", { key: SETTING.x, value: lx }).catch(() => {});
		invoke("save_setting", { key: SETTING.y, value: ly }).catch(() => {});
	}, []);

	const positionTopRight = useCallback(async () => {
		const { w } = widgetSize();
		const availW = window.screen.availWidth || 1920;
		const x = Math.max(0, availW - w - SCREEN_MARGIN);
		try {
			await getCurrentWebviewWindow().setPosition(
				new LogicalPosition(Math.round(x), SCREEN_MARGIN)
			);
		} catch (e) {
			console.error("clock setPosition failed:", e);
		}
		persistPosition(x, SCREEN_MARGIN);
	}, [persistPosition, widgetSize]);

	// ── React to settings changes from the Settings window ──
	useSettingsSync({
		[SETTING.enabled]: (v) => setEnabled(v === true || v === "true"),
		[SETTING.seconds]: (v) => setSeconds(v === true || v === "true"),
		[SETTING.showDate]: (v) => setShowDate(v === true || v === "true"),
		[SETTING.time24h]: (v) => setUse24h(v === true || v === "true"),
		[SETTING.size]: (v) => {
			const parsed = Number(v);
			if (Number.isFinite(parsed)) setSize(Math.min(1.6, Math.max(0.7, parsed)));
		},
		[SETTING.wallpaper]: (v) => setWallpaperPath(String(v ?? "")),
		[SETTING.x]: (v) => {
			// A blank x/y means "reset to the default top-right corner".
			if (v === "" || v === null || v === undefined) void positionTopRight();
		}
	});

	// ── Show / hide + place the window ──
	useEffect(() => {
		const appWindow = getCurrentWebviewWindow();
		if (!enabled) {
			appWindow.hide().catch(() => {});
			return;
		}
		(async () => {
			await syncWindowSize();
			const sx = localStorage.getItem(SETTING.x);
			const sy = localStorage.getItem(SETTING.y);
			if (sx && sy) {
				try {
					await appWindow.setPosition(
						new LogicalPosition(parseFloat(sx), parseFloat(sy))
					);
				} catch {}
			} else {
				await positionTopRight();
			}
			try {
				await appWindow.show();
			} catch {}
		})();
	}, [enabled, positionTopRight, syncWindowSize]);

	// Re-fit the window whenever the visible footprint changes.
	useEffect(() => {
		if (!enabled) return;
		const id = window.setTimeout(() => {
			void syncWindowSize();
		}, 40);
		return () => window.clearTimeout(id);
	}, [enabled, size, seconds, showDate, use24h, mediaUrl, syncWindowSize]);

	// ── Keep the saved position up to date while the user drags ──
	useEffect(() => {
		const appWindow = getCurrentWebviewWindow();
		let unlisten: (() => void) | undefined;
		appWindow
			.onMoved(({ payload }) => {
				const scale = window.devicePixelRatio || 1;
				if (posTimer.current) window.clearTimeout(posTimer.current);
				posTimer.current = window.setTimeout(() => {
					persistPosition(payload.x / scale, payload.y / scale);
				}, 250);
			})
			.then((fn) => {
				unlisten = fn;
			})
			.catch(() => {});
		return () => {
			unlisten?.();
			if (posTimer.current) window.clearTimeout(posTimer.current);
		};
	}, [persistPosition]);

	// ── 3D parallax tilt following the pointer ──
	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const el = widgetRef.current;
		if (!el || dragging) return;
		const rect = el.getBoundingClientRect();
		if (!rect.width || !rect.height) return;
		const px = (e.clientX - rect.left) / rect.width - 0.5;
		const py = (e.clientY - rect.top) / rect.height - 0.5;
		el.style.setProperty("--ry", `${(px * 16).toFixed(2)}deg`);
		el.style.setProperty("--rx", `${(-py * 14).toFixed(2)}deg`);
	};
	const resetTilt = () => {
		const el = widgetRef.current;
		if (!el) return;
		el.style.setProperty("--ry", "0deg");
		el.style.setProperty("--rx", "0deg");
	};

	// ── Dragging moves the whole widget ──
	const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		e.preventDefault();
		setDragging(true);
		try {
			await getCurrentWebviewWindow().startDragging();
		} catch (err) {
			console.error("clock drag failed:", err);
		} finally {
			setDragging(false);
			resetTilt();
			try {
				const appWindow = getCurrentWebviewWindow();
				const pos = await appWindow.outerPosition();
				const scale = await appWindow.scaleFactor();
				persistPosition(pos.x / scale, pos.y / scale);
			} catch {}
		}
	};

	const { hh, mm, ss, ampm, dateStr } = useMemo(() => {
		const h24 = now.getHours();
		const h12 = h24 % 12 || 12;
		return {
			hh: pad2(use24h ? h24 : h12),
			mm: pad2(now.getMinutes()),
			ss: pad2(now.getSeconds()),
			ampm: h24 < 12 ? "AM" : "PM",
			dateStr: now.toLocaleDateString(undefined, {
				weekday: "long",
				month: "short",
				day: "numeric"
			})
		};
	}, [now, use24h]);

	return (
		<div className="clock-root">
			<div
				ref={widgetRef}
				className={`clock-widget ${mediaUrl ? "has-wallpaper" : ""} ${
					dragging ? "dragging" : ""
				}`}
				style={{ "--k": size } as React.CSSProperties}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerLeave={resetTilt}
			>
				{mediaUrl && (
					<div className="clock-wallpaper" style={{ backgroundImage: `url(${mediaUrl})` }} />
				)}
				<div className="clock-scrim" />
				<div className="clock-sheen" />
				<div className="clock-content">
					<div className="clock-row">
						<FlipGroup value={hh} />
						<Colon />
						<FlipGroup value={mm} />
						{seconds && (
							<>
								<Colon compact />
								<FlipGroup value={ss} />
							</>
						)}
					</div>
					{(showDate || !use24h) && (
						<div className="clock-sub">
							{!use24h && <span className="clock-ampm">{ampm}</span>}
							{showDate && <span className="clock-date">{dateStr}</span>}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
