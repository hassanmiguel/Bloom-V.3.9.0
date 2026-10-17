import type { ChangeEvent, CSSProperties } from "react";
import {
	Monitor,
	Eye,
	EyeOff,
	Circle,
	Columns2,
	Maximize2,
	Keyboard,
	Sparkles,
	RotateCcw,
	LayoutPanelLeft,
	HardDrive,
	Trash2,
	FolderOpen,
	FolderPlus,
	Plus,
	X,
	Calendar,
	Clock,
	Image,
	Upload
} from "lucide-react";
import { SettingRow } from "./SettingRow";
import { KNOWN_FOLDER_OPTIONS, parseEnabledFolders, parseCustomFolders } from "../dockExtras";
import { useIconLibrary } from "../hooks/useIconLibrary";
import { libraryKeyFor } from "../iconLibrary";
import { IconFolderRow } from "./IconFolderRow";

const START_ICON_PRESETS = [
	{ key: "default", src: "/bloom.png", label: "Bloom" },
	{ key: "bloom-colorful", src: "/bloom-colorful.png", label: "Colorful" },
	{ key: "bloom-golden", src: "/bloom-golden.png", label: "Golden" },
	{ key: "bloom-biscuit", src: "/bloom-biscuit.png", label: "Orange" },
	{ key: "windows", src: "/windows.png", label: "Windows" }
];

const startIconTileStyle = (active: boolean): CSSProperties => ({
	width: "48px",
	height: "48px",
	borderRadius: "12px",
	border: active ? "2px solid var(--bloom-accent, #007aff)" : "2px solid rgba(255,255,255,0.1)",
	background: active ? "rgba(0,122,255,0.15)" : "rgba(255,255,255,0.05)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	cursor: "pointer",
	transition: "all 0.15s ease",
	padding: "6px",
	color: "rgba(255,255,255,0.5)"
});

interface DockTabProps {
	dockEnabled: boolean;
	toggleDock: () => void;
	dockMode: string;
	setDockModeValue: (mode: string) => void;
	dockPreviewEnabled: boolean;
	toggleDockPreview: () => void;
	dockIconOnly: boolean;
	toggleDockIconOnly: () => void;
	dockSeparatorEnabled: boolean;
	toggleDockSeparator: () => void;
	dockAdaptive: boolean;
	toggleDockAdaptive: () => void;
	dockWinNumberEnabled: boolean;
	toggleDockWinNumber: () => void;
	dockExtrasPosition: string;
	handleDockExtrasPositionChange: (position: string) => void;
	dockExtrasDrives: boolean;
	toggleDockExtrasDrives: () => void;
	dockExtrasRecycleBin: boolean;
	toggleDockExtrasRecycleBin: () => void;
	dockExtrasFolders: string;
	toggleDockExtraFolder: (id: string) => void;
	dockExtrasCustomFolders: string;
	handleAddDockExtraFolder: () => void;
	handleRemoveDockExtraFolder: (path: string) => void;
	startIcon: string;
	handleStartIconChange: (icon: string) => void;
	dockMagnify: boolean;
	toggleDockMagnify: () => void;
	dockMagnifyStrength: number;
	handleDockMagnifyStrengthChange: (value: number) => void;
	dockClockEnabled: boolean;
	toggleDockClock: () => void;
	dockClockShowDate: boolean;
	toggleDockClockShowDate: () => void;
	dockClockSeconds: boolean;
	toggleDockClockSeconds: () => void;
	deskClockEnabled: boolean;
	toggleDeskClock: () => void;
	deskClockSeconds: boolean;
	toggleDeskClockSeconds: () => void;
	deskClockShowDate: boolean;
	toggleDeskClockShowDate: () => void;
	deskClockSize: number;
	handleDeskClockSizeChange: (value: number) => void;
	deskClockWallpaper: string;
	handleDeskClockWallpaperUpload: (file: File) => Promise<string | null>;
	handleDeskClockWallpaperRemove: () => void;
	handleDeskClockResetPosition: () => void;
}

export function DockTab({
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
	startIcon,
	handleStartIconChange,
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
	handleDeskClockResetPosition
}: DockTabProps) {
	const { icons: libraryIcons, refresh: refreshLibrary } = useIconLibrary();

	const handleDeskClockWallpaperSelect = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await handleDeskClockWallpaperUpload(file);
		e.target.value = "";
	};

	const deskClockWallpaperName = deskClockWallpaper
		? deskClockWallpaper.split(/[\\/]/).pop() || deskClockWallpaper
		: "";

	const handleStartIconUpload = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			handleStartIconChange(`custom:${reader.result as string}`);
		};
		reader.readAsDataURL(file);
		e.target.value = "";
	};

	return (
		<>
			<div className="setting-group-label">Dock</div>
			<div className="setting-group">
				<SettingRow icon={Monitor} label="Bloom Dock" desc="Replace Windows taskbar">
					<label className="toggle-switch">
						<input type="checkbox" checked={dockEnabled} onChange={toggleDock} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				{dockEnabled && (
					<>
						<SettingRow
							icon={dockMode === "fixed" ? EyeOff : Eye}
							label="Behavior"
							desc="Choose how the dock appears"
						>
							<select
								className="settings-select"
								value={dockMode}
								onChange={(e) => setDockModeValue(e.target.value)}
							>
								<option value="fixed">Fixed</option>
								<option value="smart">Smart</option>
								<option value="peek">Peek</option>
							</select>
						</SettingRow>

						<SettingRow icon={Eye} label="Show App Previews" desc="Show window thumbnails on hover">
							<label className="toggle-switch">
								<input type="checkbox" checked={dockPreviewEnabled} onChange={toggleDockPreview} />
								<span className="slider"></span>
							</label>
						</SettingRow>

						<SettingRow icon={Circle} label="Icon Only" desc="Remove icon background and padding">
							<label className="toggle-switch">
								<input type="checkbox" checked={dockIconOnly} onChange={toggleDockIconOnly} />
								<span className="slider"></span>
							</label>
						</SettingRow>

						<SettingRow
							icon={Columns2}
							label="App Separator"
							desc="Show a divider before unpinned apps"
						>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={dockSeparatorEnabled}
									onChange={toggleDockSeparator}
								/>
								<span className="slider"></span>
							</label>
						</SettingRow>

						<SettingRow
							icon={Sparkles}
							label="Hover Magnification"
							desc="Grow icons under the cursor, like macOS"
						>
							<label className="toggle-switch">
								<input type="checkbox" checked={dockMagnify} onChange={toggleDockMagnify} />
								<span className="slider"></span>
							</label>
						</SettingRow>

						{dockMagnify && (
							<SettingRow
								icon={Maximize2}
								label="Magnification Zoom"
								desc={`Peak zoom ${Math.round(dockMagnifyStrength * 100)}%`}
							>
								<input
									type="range"
									min="1.1"
									max="1.8"
									step="0.05"
									value={dockMagnifyStrength}
									onChange={(e) => handleDockMagnifyStrengthChange(parseFloat(e.target.value))}
									className="settings-slider"
								/>
							</SettingRow>
						)}

						<SettingRow
							icon={Clock}
							label="Taskbar Clock"
							desc="Show the time and date at the end of the dock"
						>
							<label className="toggle-switch">
								<input type="checkbox" checked={dockClockEnabled} onChange={toggleDockClock} />
								<span className="slider"></span>
							</label>
						</SettingRow>

						{dockClockEnabled && (
							<>
								<SettingRow icon={Calendar} label="Show Date" desc="Display the date under the time">
									<label className="toggle-switch">
										<input
											type="checkbox"
											checked={dockClockShowDate}
											onChange={toggleDockClockShowDate}
										/>
										<span className="slider"></span>
									</label>
								</SettingRow>

								<SettingRow icon={Clock} label="Show Seconds" desc="Update the clock every second">
									<label className="toggle-switch">
										<input
											type="checkbox"
											checked={dockClockSeconds}
											onChange={toggleDockClockSeconds}
										/>
										<span className="slider"></span>
									</label>
								</SettingRow>
							</>
						)}

						<SettingRow
							icon={Clock}
							label="Floating Clock"
							desc="A draggable 3D flip clock that sits on your desktop"
						>
							<label className="toggle-switch">
								<input type="checkbox" checked={deskClockEnabled} onChange={toggleDeskClock} />
								<span className="slider"></span>
							</label>
						</SettingRow>

						{deskClockEnabled && (
							<>
								<SettingRow icon={Calendar} label="Show Date" desc="Display the date under the time">
									<label className="toggle-switch">
										<input
											type="checkbox"
											checked={deskClockShowDate}
											onChange={toggleDeskClockShowDate}
										/>
										<span className="slider"></span>
									</label>
								</SettingRow>

								<SettingRow icon={Clock} label="Show Seconds" desc="Update the clock every second">
									<label className="toggle-switch">
										<input
											type="checkbox"
											checked={deskClockSeconds}
											onChange={toggleDeskClockSeconds}
										/>
										<span className="slider"></span>
									</label>
								</SettingRow>

								<SettingRow
									icon={Maximize2}
									label="Clock Size"
									desc={`Scale ${Math.round(deskClockSize * 100)}%`}
								>
									<input
										type="range"
										min="0.7"
										max="1.6"
										step="0.05"
										value={deskClockSize}
										onChange={(e) => handleDeskClockSizeChange(parseFloat(e.target.value))}
										className="settings-slider"
									/>
								</SettingRow>

								<SettingRow
									icon={Image}
									label="Clock Wallpaper"
									desc={deskClockWallpaperName || "Place an image behind the clock"}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<button
											type="button"
											className="folder-chip active"
											onClick={() => document.getElementById("clock-wallpaper-file-input")?.click()}
										>
											<Upload size={13} strokeWidth={2} />
											Choose
										</button>
										{deskClockWallpaper && (
											<button
												type="button"
												className="folder-chip"
												onClick={handleDeskClockWallpaperRemove}
												title="Remove wallpaper"
											>
												<Trash2 size={13} strokeWidth={2} />
											</button>
										)}
										<input
											id="clock-wallpaper-file-input"
											type="file"
											accept="image/*"
											style={{ display: "none" }}
											onChange={handleDeskClockWallpaperSelect}
										/>
									</div>
								</SettingRow>

								<SettingRow
									icon={RotateCcw}
									label="Reset Position"
									desc="Snap the clock back to the top-right corner"
								>
									<button
										type="button"
										className="folder-chip"
										onClick={handleDeskClockResetPosition}
									>
										<RotateCcw size={13} strokeWidth={2} />
										Reset
									</button>
								</SettingRow>
							</>
						)}

						<SettingRow
							icon={Keyboard}
							label="Win+Number Shortcuts"
							desc="Open pinned apps with Win+1 through Win+9"
							divider={dockMode === "fixed"}
						>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={dockWinNumberEnabled}
									onChange={toggleDockWinNumber}
								/>
								<span className="slider"></span>
							</label>
						</SettingRow>

						{dockMode === "fixed" && (
							<SettingRow
								icon={Maximize2}
								label="Adaptive Mode"
								desc="Stretch to full width when a window is maximized"
								divider={false}
							>
								<label className="toggle-switch">
									<input type="checkbox" checked={dockAdaptive} onChange={toggleDockAdaptive} />
									<span className="slider"></span>
								</label>
							</SettingRow>
						)}

						<SettingRow
							icon={LayoutPanelLeft}
							label="Dock Extras"
							desc="Show drives, folders and the Recycle Bin beside the apps"
						>
							<select
								className="settings-select"
								value={dockExtrasPosition}
								onChange={(e) => handleDockExtrasPositionChange(e.target.value)}
							>
								<option value="off">Off</option>
								<option value="left">Left</option>
								<option value="right">Right</option>
							</select>
						</SettingRow>

						{dockExtrasPosition !== "off" && (
							<>
								<SettingRow
									icon={HardDrive}
									label="Drives"
									desc="Fixed, removable and connected network drives"
								>
									<label className="toggle-switch">
										<input
											type="checkbox"
											checked={dockExtrasDrives}
											onChange={toggleDockExtrasDrives}
										/>
										<span className="slider"></span>
									</label>
								</SettingRow>

								<SettingRow
									icon={Trash2}
									label="Recycle Bin"
									desc="Show the Recycle Bin in the extras"
								>
									<label className="toggle-switch">
										<input
											type="checkbox"
											checked={dockExtrasRecycleBin}
											onChange={toggleDockExtrasRecycleBin}
										/>
										<span className="slider"></span>
									</label>
								</SettingRow>

								<div
									className="setting-item"
									style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}
								>
									<div
										style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}
									>
										<div className="setting-icon-bg">
											<FolderOpen size={14} strokeWidth={1.5} />
										</div>
										<div className="setting-info">
											<span className="setting-label">Special Folders</span>
											<span className="setting-desc">
												Pick the folders that appear in the extras
											</span>
										</div>
									</div>
									<div
										style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingLeft: "34px" }}
									>
										{KNOWN_FOLDER_OPTIONS.map((folder) => {
											const active = parseEnabledFolders(dockExtrasFolders).includes(folder.id);
											return (
												<button
													key={folder.id}
													type="button"
													className={`folder-chip ${active ? "active" : ""}`}
													onClick={() => toggleDockExtraFolder(folder.id)}
												>
													{folder.label}
												</button>
											);
										})}
									</div>
								</div>

								<div
									className="setting-item"
									style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}
								>
									<div
										style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}
									>
										<div className="setting-icon-bg">
											<FolderPlus size={14} strokeWidth={1.5} />
										</div>
										<div className="setting-info">
											<span className="setting-label">Custom Folders</span>
											<span className="setting-desc">Add any folder to the extras section</span>
										</div>
									</div>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "6px",
											width: "100%",
											paddingLeft: "34px",
											boxSizing: "border-box"
										}}
									>
										{parseCustomFolders(dockExtrasCustomFolders).map((folder) => (
											<div key={folder.path} className="extra-folder-row">
												<span className="extra-folder-name">{folder.name}</span>
												<span className="extra-folder-path">{folder.path}</span>
												<button
													type="button"
													className="extra-folder-remove"
													title="Remove folder"
													onClick={() => handleRemoveDockExtraFolder(folder.path)}
												>
													<X size={14} strokeWidth={2} />
												</button>
											</div>
										))}
										<button
											type="button"
											className="folder-chip add"
											onClick={handleAddDockExtraFolder}
										>
											<Plus size={13} strokeWidth={2} />
											Add Folder...
										</button>
									</div>
								</div>
							</>
						)}

						<div className="setting-divider" />
						<div
							className="setting-item"
							style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
								<div className="setting-icon-bg">
									<Sparkles size={14} strokeWidth={1.5} />
								</div>
								<div className="setting-info">
									<span className="setting-label">Start Menu Icon</span>
									<span className="setting-desc">Choose the dock start button icon</span>
								</div>
							</div>
							<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingLeft: "34px" }}>
								{START_ICON_PRESETS.map((icon) => (
									<div
										key={icon.key}
										onClick={() => handleStartIconChange(icon.key)}
										style={startIconTileStyle(startIcon === icon.key)}
										title={icon.label}
									>
										<img
											src={icon.src}
											alt={icon.label}
											style={{ width: "100%", height: "100%", objectFit: "contain" }}
											draggable={false}
										/>
									</div>
								))}
								{libraryIcons.map((icon) => (
									<div
										key={icon.id}
										onClick={() => handleStartIconChange(libraryKeyFor(icon.id))}
										style={startIconTileStyle(startIcon === libraryKeyFor(icon.id))}
										title="From your icon library"
									>
										<img
											src={icon.src}
											alt="Library icon"
											style={{ width: "100%", height: "100%", objectFit: "contain" }}
											draggable={false}
										/>
									</div>
								))}
								<div
									onClick={() => document.getElementById("start-icon-file-input")?.click()}
									style={startIconTileStyle(startIcon.startsWith("custom:"))}
									title="Custom icon"
								>
									{startIcon.startsWith("custom:") ? (
										<img
											src={startIcon.replace("custom:", "")}
											alt="Custom"
											style={{
												width: "100%",
												height: "100%",
												objectFit: "contain",
												borderRadius: "8px"
											}}
											draggable={false}
										/>
									) : (
										<span style={{ fontSize: "20px" }}>+</span>
									)}
								</div>
								{startIcon !== "default" && (
									<div
										onClick={() => handleStartIconChange("default")}
										style={startIconTileStyle(false)}
										title="Reset to default"
									>
										<RotateCcw size={18} strokeWidth={1.5} />
									</div>
								)}
							</div>
							<input
								id="start-icon-file-input"
								type="file"
								accept=".png,.ico,.jpg,.jpeg,.svg,.bmp"
								style={{ display: "none" }}
								onChange={handleStartIconUpload}
							/>
						</div>

						<div className="setting-divider" />
						<IconFolderRow onImported={refreshLibrary} />
					</>
				)}
			</div>
		</>
	);
}
