import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ImagePlus, Upload, Trash2, RefreshCw, Star, Check, RotateCcw } from "lucide-react";
import { useIconLibrary } from "../hooks/useIconLibrary";
import {
	LIBRARY_IMAGE_ACCEPT,
	appCacheKey,
	applyIconToApp,
	deleteLibraryIcon,
	isImageFile,
	libraryKeyFor,
	removeAppCustomIcon,
	uploadLibraryIcons,
	type LibraryIcon
} from "../iconLibrary";
import { IconFolderRow } from "./IconFolderRow";
import type { AppInfo } from "../dockApps";

interface IconsTabProps {
	startIcon: string;
	onSetStartIcon: (value: string) => void;
}

const START_TARGET = "start";

export function IconsTab({ startIcon, onSetStartIcon }: IconsTabProps) {
	const { icons, loading, refresh } = useIconLibrary();
	const [pinned, setPinned] = useState<AppInfo[]>([]);
	const [running, setRunning] = useState<AppInfo[]>([]);
	const [installed, setInstalled] = useState<AppInfo[]>([]);
	const [target, setTarget] = useState<string>(START_TARGET);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const statusTimerRef = useRef<number | null>(null);

	const flashStatus = useCallback((message: string) => {
		setStatus(message);
		if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
		statusTimerRef.current = window.setTimeout(() => setStatus(null), 4000);
	}, []);

	useEffect(() => {
		invoke<AppInfo[]>("load_pinned_apps")
			.then((apps) => setPinned(apps.filter((a) => a.path && a.path !== "start")))
			.catch(() => {});
		invoke<AppInfo[]>("get_active_windows")
			.then(setRunning)
			.catch(() => {});
		invoke<AppInfo[]>("get_installed_apps")
			.then(setInstalled)
			.catch(() => {});
		return () => {
			if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
		};
	}, []);

	const { pinnedTargets, runningTargets, installedTargets, appByKey } = useMemo(() => {
		const seen = new Set<string>();
		const make = (apps: AppInfo[]) => {
			const out: { value: string; label: string; app: AppInfo }[] = [];
			for (const app of apps) {
				if (!app.path) continue;
				const value = appCacheKey(app.path, app.name);
				if (seen.has(value)) continue;
				seen.add(value);
				out.push({ value, label: app.name || app.path, app });
			}
			out.sort((a, b) => a.label.localeCompare(b.label));
			return out;
		};
		const pinnedTargets = make(pinned);
		const runningTargets = make(running);
		const installedTargets = make(installed);
		const appByKey = new Map<string, AppInfo>();
		for (const t of [...pinnedTargets, ...runningTargets, ...installedTargets]) {
			appByKey.set(t.value, t.app);
		}
		return { pinnedTargets, runningTargets, installedTargets, appByKey };
	}, [pinned, running, installed]);

	const handleFiles = async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		const images = Array.from(files).filter(isImageFile);
		if (images.length === 0) {
			flashStatus("No image files were selected.");
			return;
		}
		setProgress({ done: 0, total: images.length });
		try {
			const added = await uploadLibraryIcons(images, (done, total) =>
				setProgress({ done, total })
			);
			await refresh();
			flashStatus(
				added.length === images.length
					? `Added ${added.length} icon${added.length === 1 ? "" : "s"}.`
					: `Added ${added.length} of ${images.length} icons (some were skipped).`
			);
		} catch (e) {
			console.error("Icon upload failed:", e);
			flashStatus("Upload failed. Try again.");
		} finally {
			setProgress(null);
		}
	};

	const handleDelete = async (icon: LibraryIcon) => {
		try {
			await deleteLibraryIcon(icon.id);
			setSelectedId((current) => (current === icon.id ? null : current));
		} catch (e) {
			console.error("Failed to delete icon:", e);
			flashStatus("Could not remove that icon.");
		}
	};

	const handleApply = async () => {
		const icon = icons.find((i) => i.id === selectedId);
		if (!icon) return;
		try {
			if (target === START_TARGET) {
				onSetStartIcon(libraryKeyFor(icon.id));
				flashStatus("Set as the start menu icon.");
			} else {
				await applyIconToApp(target, icon.src);
				flashStatus(`Applied to ${appByKey.get(target)?.name ?? "app"}.`);
			}
		} catch (e) {
			console.error("Failed to apply icon:", e);
			flashStatus("Could not apply that icon.");
		}
	};

	const handleReset = async () => {
		const app = appByKey.get(target);
		if (!app) return;
		try {
			await removeAppCustomIcon(app.path, app.name);
			flashStatus(`Restored the original icon for ${app.name}.`);
		} catch (e) {
			console.error("Failed to reset icon:", e);
			flashStatus("Could not reset that icon.");
		}
	};

	const selectedIcon = icons.find((i) => i.id === selectedId) ?? null;
	const isAppTarget = target !== START_TARGET;

	return (
		<>
			<div className="setting-group-label">Icon Library</div>
			<div className="setting-group">
				<div
					className="setting-item"
					style={{ flexDirection: "column", alignItems: "stretch", gap: "12px" }}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
						<div className="setting-icon-bg">
							<ImagePlus size={14} strokeWidth={1.5} />
						</div>
						<div className="setting-info">
							<span className="setting-label">Custom Icons</span>
							<span className="setting-desc">
								Upload as many images as you like and use them as your dock and start menu icons
							</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<button
								type="button"
								className="folder-chip"
								onClick={() => {
									void refresh();
								}}
								title="Reload library"
							>
								<RefreshCw size={13} strokeWidth={2} />
							</button>
							<button
								type="button"
								className="folder-chip active"
								onClick={() => fileInputRef.current?.click()}
							>
								<Upload size={13} strokeWidth={2} />
								Add Icons…
							</button>
						</div>
					</div>

					{progress && (
						<div className="icon-library-status">
							Adding {progress.done}/{progress.total}…
						</div>
					)}
					{!progress && status && <div className="icon-library-status">{status}</div>}

					{loading ? (
						<div className="icon-library-empty">Loading…</div>
					) : icons.length === 0 ? (
						<div className="icon-library-empty">
							No custom icons yet. Add PNG, JPG, ICO, WEBP or BMP images — you can select
							hundreds at once.
						</div>
					) : (
						<>
							<div className="icon-library-count">
								{icons.length} icon{icons.length === 1 ? "" : "s"} in your library
							</div>
							<div className="icon-library-grid">
								{icons.map((icon) => {
									const isStart = startIcon === libraryKeyFor(icon.id);
									const select = () =>
										setSelectedId((current) => (current === icon.id ? null : icon.id));
									return (
										<div
											key={icon.id}
											role="button"
											tabIndex={0}
											className={`icon-library-tile ${selectedId === icon.id ? "selected" : ""}`}
											onClick={select}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													select();
												}
											}}
											title="Select this icon"
										>
											<img src={icon.src} alt="" draggable={false} />
											{isStart && (
												<span className="icon-library-badge" title="Current start icon">
													<Star size={11} strokeWidth={2.4} />
												</span>
											)}
											<span
												className="icon-library-remove"
												role="button"
												title="Delete icon"
												onClick={(e) => {
													e.stopPropagation();
													void handleDelete(icon);
												}}
											>
												<Trash2 size={12} strokeWidth={2.2} />
											</span>
										</div>
									);
								})}
							</div>

							<div className="icon-library-apply">
								<span className="icon-library-apply-label">Apply selected to</span>
								<select
									className="settings-select"
									value={target}
									onChange={(e) => setTarget(e.target.value)}
								>
									<option value={START_TARGET}>Start menu icon</option>
									{pinnedTargets.length > 0 && (
										<optgroup label="Pinned apps">
											{pinnedTargets.map((t) => (
												<option key={t.value} value={t.value}>
													{t.label}
												</option>
											))}
										</optgroup>
									)}
									{runningTargets.length > 0 && (
										<optgroup label="Running apps">
											{runningTargets.map((t) => (
												<option key={t.value} value={t.value}>
													{t.label}
												</option>
											))}
										</optgroup>
									)}
									{installedTargets.length > 0 && (
										<optgroup label="All installed apps">
											{installedTargets.map((t) => (
												<option key={t.value} value={t.value}>
													{t.label}
												</option>
											))}
										</optgroup>
									)}
								</select>
								<button
									type="button"
									className="folder-chip active"
									disabled={!selectedIcon}
									style={{ opacity: selectedIcon ? 1 : 0.5 }}
									onClick={() => void handleApply()}
								>
									<Check size={13} strokeWidth={2.4} />
									Apply
								</button>
								{isAppTarget && (
									<button
										type="button"
										className="folder-chip"
										onClick={() => void handleReset()}
										title="Restore the app's original icon"
									>
										<RotateCcw size={13} strokeWidth={2.2} />
										Reset
									</button>
								)}
							</div>
						</>
					)}

					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept={LIBRARY_IMAGE_ACCEPT}
						style={{ display: "none" }}
						onChange={(e) => {
							void handleFiles(e.target.files);
							e.target.value = "";
						}}
					/>
				</div>
			</div>

			<div className="setting-group-label">Icon Folder</div>
			<div className="setting-group">
				<IconFolderRow onImported={refresh} />
			</div>
		</>
	);
}
