import { useRef, useState } from "react";
import {
	PanelBottom,
	Palette,
	Droplets,
	Sun,
	Image as ImageIcon,
	Video,
	Upload,
	Trash2,
	Maximize2,
	Move,
	Sparkles,
	Shuffle,
	Timer,
	Check
} from "lucide-react";
import { SettingRow } from "./SettingRow";
import {
	GRADIENT_PRESETS,
	isVideoWallpaper,
	useTaskbarConfig,
	wallpaperName,
	type TaskbarBgFit,
	type TaskbarBgMode
} from "../taskbarBackground";

export function TaskbarTab() {
	const {
		config,
		mediaUrl,
		mediaLoading,
		mediaError,
		update,
		applyPreset,
		addWallpaper,
		removeWallpaper,
		setActiveWallpaper
	} = useTaskbarConfig();
	const fileRef = useRef<HTMLInputElement>(null);
	const [status, setStatus] = useState<string | null>(null);
	const statusTimer = useRef<number | null>(null);

	const showImage = config.mode === "image" || config.mode === "live";
	const isVideo = isVideoWallpaper(config.imagePath);

	const flash = (message: string) => {
		setStatus(message);
		if (statusTimer.current) window.clearTimeout(statusTimer.current);
		statusTimer.current = window.setTimeout(() => setStatus(null), 3500);
	};

	const handlePick = async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		try {
			flash("Saving wallpaper…");
			await addWallpaper(files[0]);
			flash("Wallpaper added.");
		} catch (e) {
			console.error("Wallpaper upload failed:", e);
			flash("Could not load that file.");
		}
	};

	return (
		<>
			<div className="setting-group-label">Taskbar Background</div>
			<div className="setting-group">
				<SettingRow
					icon={PanelBottom}
					label="Background Style"
					desc="Customize what sits behind your dock icons"
				>
					<select
						className="settings-select"
						value={config.mode}
						onChange={(e) => update({ mode: e.target.value as TaskbarBgMode })}
					>
						<option value="theme">Theme default</option>
						<option value="color">Solid color</option>
						<option value="gradient">Gradient</option>
						<option value="image">Image wallpaper</option>
						<option value="live">Live wallpaper (GIF / video)</option>
					</select>
				</SettingRow>

				{config.mode === "gradient" && (
					<>
						<SettingRow icon={Palette} label="Start Color" desc="Gradient start">
							<div className="color-picker-row">
								<input
									type="color"
									className="color-picker-input"
									value={config.color}
									onChange={(e) => update({ color: e.target.value })}
								/>
								<span className="color-picker-label">{config.color.toUpperCase()}</span>
							</div>
						</SettingRow>
						<SettingRow icon={Palette} label="End Color" desc="Gradient end">
							<div className="color-picker-row">
								<input
									type="color"
									className="color-picker-input"
									value={config.color2}
									onChange={(e) => update({ color2: e.target.value })}
								/>
								<span className="color-picker-label">{config.color2.toUpperCase()}</span>
							</div>
						</SettingRow>
						<SettingRow
							icon={Droplets}
							label="Gradient Angle"
							desc={`${config.angle}°`}
							divider={false}
						>
							<input
								type="range"
								min="0"
								max="360"
								step="5"
								value={config.angle}
								onChange={(e) => update({ angle: parseFloat(e.target.value) })}
								className="settings-slider"
							/>
						</SettingRow>
					</>
				)}

				{config.mode === "color" && (
					<SettingRow
						icon={Palette}
						label="Background Color"
						desc="Solid taskbar background"
						divider={false}
					>
						<div className="color-picker-row">
							<input
								type="color"
								className="color-picker-input"
								value={config.color}
								onChange={(e) => update({ color: e.target.value })}
							/>
							<span className="color-picker-label">{config.color.toUpperCase()}</span>
						</div>
					</SettingRow>
				)}
			</div>

			<div className="setting-group-label">Gradient Presets</div>
			<div className="setting-group">
				<div
					className="setting-item"
					style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}
				>
					<div className="setting-info">
						<span className="setting-label">Preset Gradients</span>
						<span className="setting-desc">Tap a preset to apply it instantly</span>
					</div>
					<div className="taskbar-presets">
						{GRADIENT_PRESETS.map((preset) => {
							const active =
								config.mode === "gradient" &&
								config.color.toLowerCase() === preset.color.toLowerCase() &&
								config.color2.toLowerCase() === preset.color2.toLowerCase();
							return (
								<button
									key={preset.name}
									type="button"
									className={`taskbar-preset ${active ? "active" : ""}`}
									title={preset.name}
									onClick={() => applyPreset(preset)}
								>
									<span
										className="taskbar-preset-swatch"
										style={{
											background: `linear-gradient(${preset.angle}deg, ${preset.color}, ${preset.color2})`
										}}
									/>
									<span className="taskbar-preset-name">{preset.name}</span>
									{active && <Check size={12} strokeWidth={2.4} className="taskbar-preset-check" />}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{showImage && (
				<>
					<div className="setting-group-label">Wallpapers</div>
					<div className="setting-group">
						<div
							className="setting-item"
							style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
								<div className="setting-icon-bg">
									{isVideo ? (
										<Video size={14} strokeWidth={1.5} />
									) : (
										<ImageIcon size={14} strokeWidth={1.5} />
									)}
								</div>
								<div className="setting-info">
									<span className="setting-label">
										{isVideo ? "Live Wallpaper" : "Image Wallpaper"}
									</span>
									<span className="setting-desc" title={config.imagePath || undefined}>
										{config.imagePath
											? wallpaperName(config.imagePath)
											: "Choose an image, GIF or video file"}
									</span>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<button
										type="button"
										className="folder-chip active"
										onClick={() => fileRef.current?.click()}
									>
										<Upload size={13} strokeWidth={2} />
										Add…
									</button>
								</div>
							</div>

							{mediaUrl && (
								<div className="taskbar-preview">
									{isVideo ? (
										<video src={mediaUrl} autoPlay loop muted playsInline />
									) : (
										<img src={mediaUrl} alt="" draggable={false} />
									)}
								</div>
							)}
							{mediaLoading && <div className="icon-library-status">Loading wallpaper…</div>}
							{mediaError && <div className="icon-library-status">{mediaError}</div>}
							{!mediaError && status && <div className="icon-library-status">{status}</div>}
						</div>

						{config.playlist.length > 0 && (
							<div
								className="setting-item"
								style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}
							>
								<div className="setting-info">
									<span className="setting-label">Playlist</span>
									<span className="setting-desc">
										{config.playlist.length} wallpaper
										{config.playlist.length === 1 ? "" : "s"} — click to make active
									</span>
								</div>
								<div className="taskbar-playlist">
									{config.playlist.map((path) => (
										<div
											key={path}
											className={`taskbar-playlist-item ${path === config.imagePath ? "active" : ""}`}
										>
											<button
												type="button"
												className="taskbar-playlist-pick"
												onClick={() => setActiveWallpaper(path)}
												title={wallpaperName(path)}
											>
												<span className="taskbar-playlist-name">{wallpaperName(path)}</span>
											</button>
											<button
												type="button"
												className="taskbar-playlist-remove"
												onClick={() => void removeWallpaper(path)}
												title="Remove wallpaper"
											>
												<Trash2 size={12} strokeWidth={2.2} />
											</button>
										</div>
									))}
								</div>
							</div>
						)}

						<SettingRow icon={Maximize2} label="Fit" desc="How the wallpaper fills the taskbar">
							<select
								className="settings-select"
								value={config.fit}
								onChange={(e) => update({ fit: e.target.value as TaskbarBgFit })}
							>
								<option value="cover">Cover</option>
								<option value="contain">Contain</option>
								<option value="stretch">Stretch</option>
								<option value="tile">Tile</option>
							</select>
						</SettingRow>

						<SettingRow icon={Sparkles} label="Opacity" desc={`${Math.round(config.opacity * 100)}%`}>
							<input
								type="range"
								min="0.05"
								max="1"
								step="0.05"
								value={config.opacity}
								onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
								className="settings-slider"
							/>
						</SettingRow>

						<SettingRow icon={Droplets} label="Blur" desc={`Softness (${config.blur}px)`}>
							<input
								type="range"
								min="0"
								max="40"
								step="1"
								value={config.blur}
								onChange={(e) => update({ blur: parseFloat(e.target.value) })}
								className="settings-slider"
							/>
						</SettingRow>

						<SettingRow
							icon={Sun}
							label="Dim"
							desc={`Darken for contrast (${Math.round(config.dim * 100)}%)`}
							divider={config.playlist.length > 0}
						>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={config.dim}
								onChange={(e) => update({ dim: parseFloat(e.target.value) })}
								className="settings-slider"
							/>
						</SettingRow>

						{config.playlist.length > 1 && (
							<>
								<SettingRow icon={Timer} label="Rotate Every" desc="Switch wallpapers automatically">
									<select
										className="settings-select"
										value={config.interval}
										onChange={(e) => update({ interval: parseInt(e.target.value) })}
									>
										<option value={0}>Off</option>
										<option value={1}>1 minute</option>
										<option value={5}>5 minutes</option>
										<option value={15}>15 minutes</option>
										<option value={30}>30 minutes</option>
										<option value={60}>1 hour</option>
									</select>
								</SettingRow>
								<SettingRow icon={Shuffle} label="Shuffle" desc="Pick a random wallpaper" divider={false}>
									<label className="toggle-switch">
										<input
											type="checkbox"
											checked={config.shuffle}
											onChange={(e) => update({ shuffle: e.target.checked })}
										/>
										<span className="slider"></span>
									</label>
								</SettingRow>
							</>
						)}
					</div>
				</>
			)}

			<div className="setting-group-label">Icon Layout</div>
			<div className="setting-group">
				<SettingRow icon={Maximize2} label="Icon Size" desc={`Dock icon size (${config.iconSize}px)`}>
					<input
						type="range"
						min="24"
						max="64"
						step="2"
						value={config.iconSize}
						onChange={(e) => update({ iconSize: parseFloat(e.target.value) })}
						className="settings-slider"
					/>
				</SettingRow>
				<SettingRow
					icon={Move}
					label="Icon Spacing"
					desc={`Space between icons (${config.iconGap}px)`}
					divider={false}
				>
					<input
						type="range"
						min="0"
						max="32"
						step="2"
						value={config.iconGap}
						onChange={(e) => update({ iconGap: parseFloat(e.target.value) })}
						className="settings-slider"
					/>
				</SettingRow>
			</div>

			<input
				ref={fileRef}
				type="file"
				accept="image/*,video/*"
				style={{ display: "none" }}
				onChange={(e) => {
					void handlePick(e.target.files);
					e.target.value = "";
				}}
			/>
		</>
	);
}
