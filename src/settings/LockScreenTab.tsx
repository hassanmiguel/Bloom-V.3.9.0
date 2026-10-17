import type { ChangeEvent } from "react";
import {
	Lock,
	LockOpen,
	Clock,
	Calendar,
	CalendarDays,
	Image as ImageIcon,
	KeyRound,
	Monitor,
	Upload,
	Trash2,
	Sparkles,
	Play,
	Timer,
	Contrast,
	Bell,
	Type,
	Eye,
	Palette,
	Zap,
	MousePointer,
	Volume2,
	Cloud,
	LayoutGrid,
	Battery,
	Grid3x3
} from "lucide-react";
import { SettingRow } from "./SettingRow";

export type ApplyWindowsState = "idle" | "applying" | "success" | "error";

interface SelectProps {
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
}

function Select({ value, onChange, options }: SelectProps) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			style={{
				width: 160,
				padding: "8px 10px",
				borderRadius: 10,
				border: "1px solid rgba(255,255,255,0.18)",
				background: "rgba(255,255,255,0.06)",
				color: "#fff",
				outline: "none",
				fontSize: 12.5
			}}
		>
			{options.map((o) => (
				<option key={o.value} value={o.value} style={{ background: "#1c1c1e", color: "#fff" }}>
					{o.label}
				</option>
			))}
		</select>
	);
}

const textInputStyle = {
	width: 180,
	padding: "8px 12px",
	borderRadius: 10,
	border: "1px solid rgba(255,255,255,0.18)",
	background: "rgba(255,255,255,0.06)",
	color: "#fff",
	outline: "none"
} as const;

interface LockScreenTabProps {
	lockEnabled: boolean;
	toggleLock: () => void;

	lockShowTime: boolean;
	toggleLockShowTime: () => void;
	lockShowDate: boolean;
	toggleLockShowDate: () => void;

	lockLive: boolean;
	toggleLockLive: () => void;

	lockWallpaper: string;
	handleLockWallpaperUpload: (file: File) => Promise<string | null>;
	handleLockWallpaperRemove: () => void;

	lockBlur: number;
	handleLockBlurChange: (value: number) => void;
	lockDim: number;
	handleLockDimChange: (value: number) => void;

	lockRequirePassword: boolean;
	toggleLockRequirePassword: () => void;
	lockPassword: string;
	handleLockPasswordChange: (value: string) => void;
	lockHasPassword: boolean;

	lockAuto: boolean;
	toggleLockAuto: () => void;
	lockAutoMinutes: number;
	handleLockAutoMinutesChange: (value: number) => void;

	lockNow: () => void;

	lockShowNotifications: boolean;
	toggleLockShowNotifications: () => void;
	lockIncludeSystemNotifications: boolean;
	toggleLockIncludeSystemNotifications: () => void;

	windowsLockImage: string;
	handleWindowsLockImageUpload: (file: File) => Promise<string | null>;
	handleWindowsLockImageRemove: () => void;
	applyWindowsLockImage: () => void;
	applyWindowsState: ApplyWindowsState;

	lockShowSeconds: boolean;
	toggleLockShowSeconds: () => void;
	lockClockSize: number;
	changeLockClockSize: (value: number) => void;
	lockClockWeight: number;
	changeLockClockWeight: (value: number) => void;
	lockClockPosition: string;
	changeLockClockPosition: (value: string) => void;
	lockDateFormat: string;
	changeLockDateFormat: (value: string) => void;
	lockMaskStyle: string;
	changeLockMaskStyle: (value: string) => void;
	lockScrimColor: string;
	changeLockScrimColor: (value: string) => void;
	lockAnimations: boolean;
	toggleLockAnimations: () => void;
	lockUnlockGesture: boolean;
	toggleLockUnlockGesture: () => void;
	lockMediaControls: boolean;
	toggleLockMediaControls: () => void;
	lockWeather: boolean;
	toggleLockWeather: () => void;
	lockQuickActions: boolean;
	toggleLockQuickActions: () => void;
	lockShowWidgets: boolean;
	toggleLockShowWidgets: () => void;
	lockMaxNotifications: number;
	changeLockMaxNotifications: (value: number) => void;
	lockClickThrough: boolean;
	toggleLockClickThrough: () => void;
	lockOnResume: boolean;
	toggleLockOnResume: () => void;
}

const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

export function LockScreenTab({
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
	lockClockSize,
	changeLockClockSize,
	lockClockWeight,
	changeLockClockWeight,
	lockClockPosition,
	changeLockClockPosition,
	lockDateFormat,
	changeLockDateFormat,
	lockMaskStyle,
	changeLockMaskStyle,
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
	lockMaxNotifications,
	changeLockMaxNotifications,
	lockClickThrough,
	toggleLockClickThrough,
	lockOnResume,
	toggleLockOnResume
}: LockScreenTabProps) {
	const handleWallpaperSelect = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await handleLockWallpaperUpload(file);
		e.target.value = "";
	};

	const handleWindowsSelect = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await handleWindowsLockImageUpload(file);
		e.target.value = "";
	};

	const applyLabel =
		applyWindowsState === "applying"
			? "Applying..."
			: applyWindowsState === "success"
				? "Applied"
				: applyWindowsState === "error"
					? "Failed"
					: "Apply";

	return (
		<>
			<SettingRow
				icon={Lock}
				label="In-App Lock Screen"
				desc="A full-screen cover with the time, date and your wallpaper"
			>
				<label className="toggle-switch">
					<input type="checkbox" checked={lockEnabled} onChange={toggleLock} />
					<span className="slider"></span>
				</label>
			</SettingRow>

			{lockEnabled && (
				<>
					<SettingRow icon={LockOpen} label="Lock Now" desc="Cover the screen immediately">
						<button type="button" className="folder-chip active" onClick={lockNow}>
							<Lock size={13} strokeWidth={2} />
							Lock
						</button>
					</SettingRow>

					<SettingRow icon={Clock} label="Show Time" desc="Display the clock on the lock screen">
						<label className="toggle-switch">
							<input type="checkbox" checked={lockShowTime} onChange={toggleLockShowTime} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					{lockShowTime && (
						<SettingRow icon={Clock} label="Show Seconds" desc="Add a ticking seconds counter">
							<label className="toggle-switch">
								<input type="checkbox" checked={lockShowSeconds} onChange={toggleLockShowSeconds} />
								<span className="slider"></span>
							</label>
						</SettingRow>
					)}

					<SettingRow icon={Calendar} label="Show Date" desc="Display the date under the time">
						<label className="toggle-switch">
							<input type="checkbox" checked={lockShowDate} onChange={toggleLockShowDate} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					{lockShowDate && (
						<SettingRow icon={CalendarDays} label="Date Format" desc="How the date is written">
							<Select
								value={lockDateFormat}
								onChange={changeLockDateFormat}
								options={[
									{ value: "long", label: "Wednesday, 16 October" },
									{ value: "short", label: "Wed, 16 Oct" },
									{ value: "numeric", label: "16/10/2026" }
								]}
							/>
						</SettingRow>
					)}

					<SettingRow
						icon={ImageIcon}
						label="Lock Wallpaper"
						desc={lockWallpaper ? fileName(lockWallpaper) : "Use an image behind the lock screen"}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<button
								type="button"
								className="folder-chip active"
								onClick={() => document.getElementById("lock-wallpaper-file-input")?.click()}
							>
								<Upload size={13} strokeWidth={2} />
								Choose
							</button>
							{lockWallpaper && (
								<button
									type="button"
									className="folder-chip"
									onClick={handleLockWallpaperRemove}
									title="Remove wallpaper"
								>
									<Trash2 size={13} strokeWidth={2} />
								</button>
							)}
							<input
								id="lock-wallpaper-file-input"
								type="file"
								accept="image/*,video/*"
								style={{ display: "none" }}
								onChange={handleWallpaperSelect}
							/>
						</div>
					</SettingRow>

					<SettingRow
						icon={Play}
						label="Live Wallpaper"
						desc="Use an animated GIF or video behind the lock screen"
					>
						<label className="toggle-switch">
							<input type="checkbox" checked={lockLive} onChange={toggleLockLive} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<SettingRow
						icon={Sparkles}
						label="Background Blur"
						desc={`Blur the wallpaper (${lockBlur}px)`}
					>
						<input
							type="range"
							min="0"
							max="40"
							step="1"
							value={lockBlur}
							onChange={(e) => handleLockBlurChange(parseFloat(e.target.value))}
							className="settings-slider"
						/>
					</SettingRow>

					<SettingRow
						icon={Contrast}
						label="Dim"
						desc={`Darken the background (${Math.round(lockDim * 100)}%)`}
					>
						<input
							type="range"
							min="0"
							max="0.9"
							step="0.05"
							value={lockDim}
							onChange={(e) => handleLockDimChange(parseFloat(e.target.value))}
							className="settings-slider"
						/>
					</SettingRow>

					<SettingRow icon={Palette} label="Scrim Colour" desc="Tint of the overlay behind content">
						<input
							type="color"
							value={lockScrimColor}
							onChange={(e) => changeLockScrimColor(e.target.value)}
							style={{
								width: 46,
								height: 34,
								borderRadius: 10,
								border: "1px solid rgba(255,255,255,0.18)",
								background: "rgba(255,255,255,0.06)",
								cursor: "pointer",
								padding: 2
							}}
						/>
					</SettingRow>

					<SettingRow icon={Type} label="Clock Size" desc={`Size of the time (${lockClockSize}px)`}>
						<input
							type="range"
							min="48"
							max="280"
							step="4"
							value={lockClockSize}
							onChange={(e) => changeLockClockSize(parseInt(e.target.value))}
							className="settings-slider"
						/>
					</SettingRow>

					<SettingRow icon={Type} label="Clock Weight" desc={`Font weight (${lockClockWeight})`}>
						<input
							type="range"
							min="100"
							max="900"
							step="100"
							value={lockClockWeight}
							onChange={(e) => changeLockClockWeight(parseInt(e.target.value))}
							className="settings-slider"
						/>
					</SettingRow>

					<SettingRow icon={LayoutGrid} label="Clock Position" desc="Where the clock sits">
						<Select
							value={lockClockPosition}
							onChange={changeLockClockPosition}
							options={[
								{ value: "top", label: "Top" },
								{ value: "center", label: "Centre" },
								{ value: "bottom", label: "Bottom" }
							]}
						/>
					</SettingRow>

					<SettingRow
						icon={Zap}
						label="Animations"
						desc="Pulse, shake and fade effects on the lock screen"
					>
						<label className="toggle-switch">
							<input type="checkbox" checked={lockAnimations} onChange={toggleLockAnimations} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<SettingRow
						icon={MousePointer}
						label="Click or Key to Unlock"
						desc="Allow unlocking by clicking the background or pressing any key"
					>
						<label className="toggle-switch">
							<input type="checkbox" checked={lockUnlockGesture} onChange={toggleLockUnlockGesture} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<div className="setting-divider" />

					<SettingRow
						icon={KeyRound}
						label="Require Password"
						desc="Ask for a password before unlocking"
					>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={lockRequirePassword}
								onChange={toggleLockRequirePassword}
							/>
							<span className="slider"></span>
						</label>
					</SettingRow>

					{lockRequirePassword && (
						<>
							<SettingRow
								icon={KeyRound}
								label="Password"
								desc={lockHasPassword ? "Password set — stored as a hash" : "Stored as a one-way hash"}
							>
								<input
									type="password"
									value={lockPassword}
									placeholder={lockHasPassword ? "••••••••" : "Set a password"}
									onChange={(e) => handleLockPasswordChange(e.target.value)}
									style={textInputStyle}
								/>
							</SettingRow>

							<SettingRow icon={Eye} label="Mask Style" desc="How typed characters are hidden">
								<Select
									value={lockMaskStyle}
									onChange={changeLockMaskStyle}
									options={[
										{ value: "emoji", label: "Emoji" },
										{ value: "dots", label: "Dots" },
										{ value: "none", label: "Show characters" }
									]}
								/>
							</SettingRow>
						</>
					)}

					<SettingRow
						icon={Timer}
						label="Auto-lock When Idle"
						desc="Lock automatically after a period without input"
					>
						<label className="toggle-switch">
							<input type="checkbox" checked={lockAuto} onChange={toggleLockAuto} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					{lockAuto && (
						<SettingRow
							icon={Timer}
							label="Idle Minutes"
							desc={`Lock after ${lockAutoMinutes} minute${lockAutoMinutes === 1 ? "" : "s"}`}
						>
							<input
								type="range"
								min="1"
								max="60"
								step="1"
								value={lockAutoMinutes}
								onChange={(e) => handleLockAutoMinutesChange(parseInt(e.target.value))}
								className="settings-slider"
							/>
						</SettingRow>
					)}

					<div className="setting-divider" />

					<SettingRow
						icon={Bell}
						label="Show Notifications"
						desc="Display live Windows Action Center toast notifications on the lock screen"
					>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={lockShowNotifications}
								onChange={toggleLockShowNotifications}
							/>
							<span className="slider"></span>
						</label>
					</SettingRow>

					{lockShowNotifications && (
						<>
							<SettingRow
								icon={Bell}
								label="Include System Notifications"
								desc="Show core system notifications alongside app notifications"
							>
								<label className="toggle-switch">
									<input
										type="checkbox"
										checked={lockIncludeSystemNotifications}
										onChange={toggleLockIncludeSystemNotifications}
									/>
									<span className="slider"></span>
								</label>
							</SettingRow>

							<SettingRow
								icon={Bell}
								label="Max Notifications"
								desc={`Show up to ${lockMaxNotifications} notification${lockMaxNotifications === 1 ? "" : "s"}`}
							>
								<input
									type="range"
									min="1"
									max="20"
									step="1"
									value={lockMaxNotifications}
									onChange={(e) => changeLockMaxNotifications(parseInt(e.target.value))}
									className="settings-slider"
								/>
							</SettingRow>
						</>
					)}

					<div className="setting-divider" />

					<SettingRow icon={Battery} label="Show Battery Widget" desc="Show the battery level on the lock screen">
						<label className="toggle-switch">
							<input type="checkbox" checked={lockShowWidgets} onChange={toggleLockShowWidgets} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<SettingRow icon={Cloud} label="Weather" desc="Show the current temperature on the lock screen">
						<label className="toggle-switch">
							<input type="checkbox" checked={lockWeather} onChange={toggleLockWeather} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<SettingRow icon={Volume2} label="Media Controls" desc="Show play, pause and skip buttons">
						<label className="toggle-switch">
							<input type="checkbox" checked={lockMediaControls} onChange={toggleLockMediaControls} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<SettingRow icon={LayoutGrid} label="Quick Actions" desc="Show shortcuts to Settings and Bloom Tools">
						<label className="toggle-switch">
							<input type="checkbox" checked={lockQuickActions} onChange={toggleLockQuickActions} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<div className="setting-divider" />

					<SettingRow
						icon={Grid3x3}
						label="Click-through"
						desc="Let clicks pass through the lock screen to what is behind it"
					>
						<label className="toggle-switch">
							<input type="checkbox" checked={lockClickThrough} onChange={toggleLockClickThrough} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<SettingRow
						icon={Zap}
						label="Lock on Resume"
						desc="Lock immediately when the PC wakes from sleep"
					>
						<label className="toggle-switch">
							<input type="checkbox" checked={lockOnResume} onChange={toggleLockOnResume} />
							<span className="slider"></span>
						</label>
					</SettingRow>

					<div className="setting-divider" />

					<SettingRow
						icon={Monitor}
						label="Windows Lock Screen Image"
						desc={
							windowsLockImage
								? fileName(windowsLockImage)
								: "Use a still image as the real Windows lock screen background"
						}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<button
								type="button"
								className="folder-chip"
								onClick={() => document.getElementById("windows-lock-file-input")?.click()}
							>
								<Upload size={13} strokeWidth={2} />
								Choose
							</button>
							{windowsLockImage && (
								<button
									type="button"
									className="folder-chip active"
									onClick={applyWindowsLockImage}
									disabled={applyWindowsState === "applying"}
								>
									{applyLabel}
								</button>
							)}
							{windowsLockImage && (
								<button
									type="button"
									className="folder-chip"
									onClick={handleWindowsLockImageRemove}
									title="Remove image"
								>
									<Trash2 size={13} strokeWidth={2} />
								</button>
							)}
							<input
								id="windows-lock-file-input"
								type="file"
								accept="image/*"
								style={{ display: "none" }}
								onChange={handleWindowsSelect}
							/>
						</div>
					</SettingRow>
				</>
			)}
		</>
	);
}
