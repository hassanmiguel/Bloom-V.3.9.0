import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
	Bell,
	Clipboard,
	Search,
	Music,
	Activity,
	Timer,
	X,
	Play,
	Pause,
	SkipBack,
	SkipForward,
	Copy,
	Pin,
	RefreshCw,
	AppWindow
} from "lucide-react";
import { initTheme } from "./theme";
import "./Tools.css";

const appWindow = getCurrentWebviewWindow();

document.addEventListener("contextmenu", (e) => e.preventDefault());

interface AppNotification {
	id: number;
	app_name: string;
	app_id: string;
	title: string;
	body: string;
	timestamp: number;
	icon?: string | null;
	is_system: boolean;
}

interface InstalledApp {
	name: string;
	path: string;
	icon?: string | null;
	is_running: boolean;
	executable?: string | null;
}

interface MediaInfo {
	title: string;
	artist: string;
	is_playing: boolean;
	has_media: boolean;
	artwork?: string[];
	position_ms?: number;
	duration_ms?: number;
	seek_enabled?: boolean;
	position_updated_at?: number;
}

interface ClipItem {
	id: string;
	text: string;
	ts: number;
	pinned?: boolean;
}

type TabId = "notifications" | "clipboard" | "search" | "media" | "system" | "pomodoro";

const TABS: { id: TabId; label: string; icon: typeof Bell }[] = [
	{ id: "notifications", label: "Notifications", icon: Bell },
	{ id: "clipboard", label: "Clipboard", icon: Clipboard },
	{ id: "search", label: "Search", icon: Search },
	{ id: "media", label: "Media", icon: Music },
	{ id: "system", label: "System", icon: Activity },
	{ id: "pomodoro", label: "Timer", icon: Timer }
];

function timeAgo(ts: number): string {
	const diff = Date.now() - ts;
	if (diff < 60000) return "just now";
	const mins = Math.floor(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return new Date(ts).toLocaleDateString();
}

function formatMs(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) ms = 0;
	const total = Math.floor(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Notifications ────────────────────────────────────────────────

function NotificationsTab() {
	const [items, setItems] = useState<AppNotification[]>([]);
	const [loading, setLoading] = useState(false);
	const [includeSystem, setIncludeSystem] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await invoke<AppNotification[]>("get_notifications", {
				limit: 60,
				includeSystem
			});
			setItems(res);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [includeSystem]);

	useEffect(() => {
		load();
		const id = setInterval(load, 5000);
		return () => clearInterval(id);
	}, [load]);

	return (
		<div className="tool-pane">
			<div className="tool-toolbar">
				<label className="tool-check">
					<input
						type="checkbox"
						checked={includeSystem}
						onChange={(e) => setIncludeSystem(e.target.checked)}
					/>
					Include system notifications
				</label>
				<button className="tool-btn" onClick={load} disabled={loading}>
					<RefreshCw size={14} className={loading ? "spin" : ""} />
					Refresh
				</button>
			</div>
			{items.length === 0 ? (
				<div className="tool-empty">No notifications</div>
			) : (
				<ul className="notif-list">
					{items.map((n) => (
						<li key={n.id} className="notif-item">
							{n.icon ? (
								<img className="notif-icon" src={n.icon} alt="" />
							) : (
								<div className="notif-icon notif-icon-fallback">
									<Bell size={14} />
								</div>
							)}
							<div className="notif-body">
								<div className="notif-head">
									<span className="notif-app">{n.app_name}</span>
									<span className="notif-time">{timeAgo(n.timestamp)}</span>
								</div>
								{n.title && <div className="notif-title">{n.title}</div>}
								{n.body && <div className="notif-text">{n.body}</div>}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

// ── Clipboard history ────────────────────────────────────────────

const CLIP_KEY = "bloom-clipboard-history";
const CLIP_MAX = 60;

function ClipboardTab() {
	const [items, setItems] = useState<ClipItem[]>(() => {
		try {
			const raw = localStorage.getItem(CLIP_KEY);
			return raw ? (JSON.parse(raw) as ClipItem[]) : [];
		} catch {
			return [];
		}
	});
	const lastText = useRef<string>("");
	const itemsRef = useRef<ClipItem[]>(items);
	itemsRef.current = items;

	useEffect(() => {
		localStorage.setItem(CLIP_KEY, JSON.stringify(items));
	}, [items]);

	const addText = useCallback((text: string) => {
		if (!text || text === lastText.current) return;
		lastText.current = text;
		setItems((prev) => {
			if (prev[0]?.text === text) return prev;
			const next: ClipItem = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				text,
				ts: Date.now()
			};
			return [next, ...prev.filter((i) => i.text !== text)].slice(0, CLIP_MAX);
		});
	}, []);

	useEffect(() => {
		let cancelled = false;
		const poll = async () => {
			try {
				const text = await readText();
				if (!cancelled && text) addText(text);
			} catch {
				// clipboard may hold non-text or be empty
			}
		};
		poll();
		const id = setInterval(poll, 1200);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [addText]);

	const copyItem = (text: string) => {
		writeText(text).catch(console.error);
	};

	const removeItem = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
	};

	const togglePin = (id: string) => {
		setItems((prev) => prev.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)));
	};

	const clearAll = () => {
		setItems((prev) => prev.filter((i) => i.pinned));
	};

	return (
		<div className="tool-pane">
			<div className="tool-toolbar">
				<span className="tool-hint">{items.length} item(s)</span>
				<button className="tool-btn" onClick={clearAll}>
					<X size={14} />
					Clear (keep pinned)
				</button>
			</div>
			{items.length === 0 ? (
				<div className="tool-empty">Clipboard history is empty. Copy something to begin.</div>
			) : (
				<ul className="clip-list">
					{items.map((item) => (
						<li key={item.id} className={`clip-item${item.pinned ? " is-pinned" : ""}`}>
							<button className="clip-text" onClick={() => copyItem(item.text)} title="Click to copy">
								{item.text.length > 220 ? `${item.text.slice(0, 220)}…` : item.text}
							</button>
							<div className="clip-actions">
								<button className="icon-btn" onClick={() => togglePin(item.id)} title="Pin">
									<Pin size={14} />
								</button>
								<button
									className="icon-btn"
									onClick={() => copyItem(item.text)}
									title="Copy"
								>
									<Copy size={14} />
								</button>
								<button className="icon-btn" onClick={() => removeItem(item.id)} title="Remove">
									<X size={14} />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

// ── Spotlight search ─────────────────────────────────────────────

function SearchTab() {
	const [apps, setApps] = useState<InstalledApp[]>([]);
	const [query, setQuery] = useState("");

	useEffect(() => {
		invoke<InstalledApp[]>("get_installed_apps")
			.then((list) => {
				const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
				setApps(sorted);
			})
			.catch(console.error);
	}, []);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return apps.slice(0, 50);
		return apps.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 50);
	}, [apps, query]);

	const launch = (app: InstalledApp) => {
		invoke("open_app", { appName: app.path }).catch(console.error);
	};

	return (
		<div className="tool-pane">
			<div className="search-bar">
				<Search size={16} />
				<input
					autoFocus
					type="text"
					placeholder="Search applications…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && results[0]) launch(results[0]);
					}}
				/>
				{query && (
					<button className="icon-btn" onClick={() => setQuery("")} title="Clear">
						<X size={14} />
					</button>
				)}
			</div>
			<ul className="app-list">
				{results.map((app, idx) => (
					<li key={app.path + idx} className="app-item" onClick={() => launch(app)}>
						{app.icon ? (
							<img className="app-icon" src={app.icon} alt="" />
						) : (
							<div className="app-icon app-icon-fallback">
								<AppWindow size={14} />
							</div>
						)}
						<span className="app-name">{app.name}</span>
						{app.is_running && <span className="app-badge">running</span>}
					</li>
				))}
				{results.length === 0 && <div className="tool-empty">No matching apps</div>}
			</ul>
		</div>
	);
}

// ── Media (now playing + scrubber + lyrics) ──────────────────────

function MediaTab() {
	const [info, setInfo] = useState<MediaInfo | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const [scrub, setScrub] = useState<number | null>(null);
	const [lyrics, setLyrics] = useState<string | null>(null);
	const [lyricsState, setLyricsState] = useState<"idle" | "loading" | "error" | "empty">("idle");

	useEffect(() => {
		const un = listen<MediaInfo>("media-update", (e) => {
			setInfo(e.payload);
		});
		invoke<MediaInfo>("get_media_info")
			.then((i) => setInfo(i))
			.catch(() => {});
		return () => {
			un.then((f) => f());
		};
	}, []);

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(id);
	}, []);

	const duration = info?.duration_ms ?? 0;
	const position = useMemo(() => {
		if (!info) return 0;
		if (scrub !== null) return scrub;
		let pos = info.position_ms ?? 0;
		if (info.is_playing && info.position_updated_at) {
			pos += Math.max(0, now - info.position_updated_at);
		}
		return Math.min(pos, duration || pos);
	}, [info, now, scrub, duration]);

	useEffect(() => {
		setLyrics(null);
		setLyricsState("idle");
	}, [info?.title, info?.artist]);

	const fetchLyrics = async () => {
		if (!info?.title) return;
		setLyricsState("loading");
		try {
			const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(
				info.title
			)}&artist_name=${encodeURIComponent(info.artist || "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(String(res.status));
			const data = (await res.json()) as Array<{
				plainLyrics?: string | null;
				syncedLyrics?: string | null;
			}>;
			const found = data.find((d) => d.plainLyrics || d.syncedLyrics);
			const text = found?.plainLyrics || found?.syncedLyrics || "";
			if (text) {
				setLyrics(text.replace(/\[\d+:\d+\.\d+\]/g, "").trim());
				setLyricsState("idle");
			} else {
				setLyricsState("empty");
			}
		} catch (err) {
			console.error(err);
			setLyricsState("error");
		}
	};

	if (!info || !info.has_media) {
		return <div className="tool-empty">No media playing</div>;
	}

	return (
		<div className="tool-pane media-pane">
			<div className="media-head">
				{info.artwork?.[0] ? (
					<img className="media-art" src={info.artwork[0]} alt="" />
				) : (
					<div className="media-art media-art-fallback">
						<Music size={24} />
					</div>
				)}
				<div className="media-meta">
					<div className="media-title">{info.title}</div>
					<div className="media-artist">{info.artist}</div>
				</div>
			</div>

			<div className="media-controls">
				<button className="icon-btn" onClick={() => invoke("media_previous")} title="Previous">
					<SkipBack size={18} />
				</button>
				<button
					className="icon-btn icon-btn-lg"
					onClick={() => invoke("media_play_pause")}
					title="Play/Pause"
				>
					{info.is_playing ? <Pause size={20} /> : <Play size={20} />}
				</button>
				<button className="icon-btn" onClick={() => invoke("media_next")} title="Next">
					<SkipForward size={18} />
				</button>
			</div>

			<div className="scrub">
				<span className="scrub-time">{formatMs(position)}</span>
				<input
					type="range"
					min={0}
					max={duration || 1}
					value={position}
					disabled={!info.seek_enabled && !duration}
					onChange={(e) => setScrub(parseFloat(e.target.value))}
					onMouseUp={() => {
						if (scrub !== null) {
							invoke("media_seek", { positionMs: scrub }).catch(() => {});
							setScrub(null);
						}
					}}
					onKeyUp={() => {
						if (scrub !== null) {
							invoke("media_seek", { positionMs: scrub }).catch(() => {});
							setScrub(null);
						}
					}}
				/>
				<span className="scrub-time">{formatMs(duration)}</span>
			</div>

			<div className="lyrics-head">
				<button className="tool-btn" onClick={fetchLyrics} disabled={lyricsState === "loading"}>
					{lyricsState === "loading" ? "Loading…" : "Fetch lyrics"}
				</button>
			</div>
			{lyricsState === "empty" && <div className="tool-empty">No lyrics found</div>}
			{lyricsState === "error" && <div className="tool-empty">Could not load lyrics</div>}
			{lyrics && <pre className="lyrics">{lyrics}</pre>}
		</div>
	);
}

// ── System monitor sparklines ────────────────────────────────────

function Sparkline({ data, max, color }: { data: number[]; max: number; color: string }) {
	const width = 160;
	const height = 36;
	const points = useMemo(() => {
		if (data.length === 0) return "";
		const cap = max > 0 ? max : 1;
		return data
			.map((v, i) => {
				const x = (i / Math.max(1, data.length - 1)) * width;
				const y = height - (Math.min(v, cap) / cap) * height;
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(" ");
	}, [data, max]);
	return (
		<svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
			<polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
		</svg>
	);
}

const HISTORY = 40;

function SystemTab() {
	const [cpu, setCpu] = useState<number[]>([]);
	const [ram, setRam] = useState<number[]>([]);
	const [disk, setDisk] = useState<number | null>(null);
	const [net, setNet] = useState<[number, number]>([0, 0]);

	useEffect(() => {
		let cancelled = false;
		const tick = async () => {
			try {
				const [c, r] = await Promise.all([
					invoke<number>("get_cpu_usage"),
					invoke<number>("get_ram_usage")
				]);
				if (cancelled) return;
				setCpu((prev) => [...prev, c].slice(-HISTORY));
				setRam((prev) => [...prev, r].slice(-HISTORY));
			} catch {
				// ignore
			}
			try {
				const [speed, diskFree] = await Promise.all([
					invoke<[number, number]>("get_network_speed"),
					invoke<number>("get_disk_space")
				]);
				if (cancelled) return;
				setNet([speed[0], speed[1]]);
				setDisk(diskFree);
			} catch {
				// ignore
			}
		};
		tick();
		const id = setInterval(tick, 2000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, []);

	const last = (arr: number[]) => (arr.length ? arr[arr.length - 1] : 0);
	const fmtBytes = (b: number) => {
		if (b > 1e9) return `${(b / 1e9).toFixed(2)} GB`;
		if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`;
		if (b > 1e3) return `${(b / 1e3).toFixed(1)} KB`;
		return `${b} B`;
	};

	return (
		<div className="tool-pane system-pane">
			<div className="stat-card">
				<div className="stat-head">
					<span>CPU</span>
					<span className="stat-value">{Math.round(last(cpu))}%</span>
				</div>
				<Sparkline data={cpu} max={100} color="#5ac8fa" />
			</div>
			<div className="stat-card">
				<div className="stat-head">
					<span>Memory</span>
					<span className="stat-value">{Math.round(last(ram))}%</span>
				</div>
				<Sparkline data={ram} max={100} color="#34c759" />
			</div>
			<div className="stat-card stat-inline">
				<div className="stat-head">
					<span>Network</span>
				</div>
				<div className="stat-row">
					<span>↓ {fmtBytes(net[1])}/s</span>
					<span>↑ {fmtBytes(net[0])}/s</span>
				</div>
			</div>
			<div className="stat-card stat-inline">
				<div className="stat-head">
					<span>Disk free</span>
				</div>
				<div className="stat-row">{disk !== null ? `${disk} GB` : "—"}</div>
			</div>
		</div>
	);
}

// ── Pomodoro / timer ─────────────────────────────────────────────

type TimerMode = "work" | "break" | "stopwatch";

function playChime() {
	try {
		const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		const ctx = new Ctx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.type = "sine";
		osc.frequency.value = 880;
		gain.gain.setValueAtTime(0.001, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
		osc.start();
		osc.stop(ctx.currentTime + 1.3);
	} catch {
		// audio unavailable
	}
}

function PomodoroTab() {
	const [mode, setMode] = useState<TimerMode>("work");
	const [seconds, setSeconds] = useState(25 * 60);
	const [running, setRunning] = useState(false);
	const [completed, setCompleted] = useState(0);

	const durations: Record<TimerMode, number> = { work: 25 * 60, break: 5 * 60, stopwatch: 0 };

	useEffect(() => {
		if (!running) return;
		const id = setInterval(() => {
			setSeconds((s) => {
				if (mode === "stopwatch") return s + 1;
				if (s <= 1) {
					playChime();
					if (mode === "work") setCompleted((c) => c + 1);
					return 0;
				}
				return s - 1;
			});
		}, 1000);
		return () => clearInterval(id);
	}, [running, mode]);

	useEffect(() => {
		if (!running && seconds === 0 && mode !== "stopwatch") {
			setRunning(false);
		}
	}, [seconds, running, mode]);

	const selectMode = (m: TimerMode) => {
		setMode(m);
		setRunning(false);
		setSeconds(durations[m]);
	};

	const display =
		mode === "stopwatch" ? formatMs(seconds * 1000) : formatMs(seconds * 1000);

	return (
		<div className="tool-pane pomodoro-pane">
			<div className="seg">
				<button className={`seg-btn${mode === "work" ? " active" : ""}`} onClick={() => selectMode("work")}>
					Focus
				</button>
				<button className={`seg-btn${mode === "break" ? " active" : ""}`} onClick={() => selectMode("break")}>
					Break
				</button>
				<button
					className={`seg-btn${mode === "stopwatch" ? " active" : ""}`}
					onClick={() => selectMode("stopwatch")}
				>
					Stopwatch
				</button>
			</div>

			<div className="clock-display">{display}</div>

			<div className="pomo-controls">
				<button className="tool-btn primary" onClick={() => setRunning((r) => !r)}>
					{running ? "Pause" : "Start"}
				</button>
				<button
					className="tool-btn"
					onClick={() => {
						setRunning(false);
						setSeconds(durations[mode]);
					}}
				>
					Reset
				</button>
			</div>

			{mode !== "stopwatch" && (
				<div className="pomo-presets">
					{[15, 25, 45, 60].map((min) => (
						<button
							key={min}
							className="chip"
							onClick={() => {
								setMode("work");
								setRunning(false);
								setSeconds(min * 60);
							}}
						>
							{min}m
						</button>
					))}
				</div>
			)}

			<div className="pomo-count">Sessions completed: {completed}</div>
		</div>
	);
}

// ── Shell ────────────────────────────────────────────────────────

function ToolsApp() {
	const [tab, setTab] = useState<TabId>("notifications");

	useEffect(() => {
		const mode = localStorage.getItem("bloom-theme-mode") || "dark";
		document.documentElement.classList.toggle("light", mode === "light");
		return initTheme();
	}, []);

	const close = () => {
		appWindow.hide().catch(console.error);
	};

	return (
		<div className="tools-shell">
			<div className="tools-header" data-tauri-drag-region>
				<span className="tools-title" data-tauri-drag-region>
					Bloom Tools
				</span>
				<button className="tools-close" onClick={close} title="Close">
					<X size={16} />
				</button>
			</div>
			<div className="tools-body">
				<nav className="tools-nav">
					{TABS.map((t) => {
						const Icon = t.icon;
						return (
							<button
								key={t.id}
								className={`nav-btn${tab === t.id ? " active" : ""}`}
								onClick={() => setTab(t.id)}
							>
								<Icon size={18} />
								<span>{t.label}</span>
							</button>
						);
					})}
				</nav>
				<section className="tools-content">
					{tab === "notifications" && <NotificationsTab />}
					{tab === "clipboard" && <ClipboardTab />}
					{tab === "search" && <SearchTab />}
					{tab === "media" && <MediaTab />}
					{tab === "system" && <SystemTab />}
					{tab === "pomodoro" && <PomodoroTab />}
				</section>
			</div>
		</div>
	);
}

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<ToolsApp />
	</StrictMode>
);
