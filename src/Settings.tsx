import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Effect } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
	X,
	Settings,
	Palette,
	PanelTop,
	Monitor,
	Layers,
	Info,
	Megaphone,
	ImagePlus,
	PanelBottom,
	Lock
} from "lucide-react";
import {
	useSettings,
	GeneralTab,
	AppearanceTab,
	NotchTab,
	DockTab,
	TaskbarTab,
	IconsTab,
	LockScreenTab,
	OverlaysTab,
	AboutTab
} from "./settings/index";
import type { SettingsTab } from "./settings/index";
import { useAnnouncement } from "./hooks/useAnnouncement";
import { initTheme } from "./theme";
import "./Settings.css";

const appWindow = getCurrentWebviewWindow();

const TABS: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
	{ id: "general", label: "General", icon: Settings },
	{ id: "appearance", label: "Appearance", icon: Palette },
	{ id: "notch", label: "Notch", icon: PanelTop },
	{ id: "dock", label: "Dock", icon: Monitor },
	{ id: "taskbar", label: "Taskbar", icon: PanelBottom },
	{ id: "icons", label: "Icons", icon: ImagePlus },
	{ id: "lock", label: "Lock Screen", icon: Lock },
	{ id: "overlays", label: "Overlays", icon: Layers },
	{ id: "about", label: "About", icon: Info }
];

function SettingsApp() {
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");
	const settings = useSettings();
	const { announcement, dismissed, dismiss } = useAnnouncement();

	useEffect(() => {
		return initTheme();
	}, []);

	useEffect(() => {
		const preventContext = (e: MouseEvent) => e.preventDefault();
		document.addEventListener("contextmenu", preventContext as any);

		appWindow
			.setEffects({
				effects: ["mica" as Effect],
				state: "active" as any
			})
			.catch(() => {});

		return () => {
			document.removeEventListener("contextmenu", preventContext as any);
		};
	}, []);

	useEffect(() => {
		invoke("resize_settings_window", {
			width: 620 * settings.scale,
			height: 480 * settings.scale
		}).catch(console.error);
	}, [settings.scale]);

	const handleClose = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			await appWindow.hide();
		} catch {}
	};

	return (
		<div className="settings-container" style={{ zoom: settings.scale }}>
			<div className="title-bar" data-tauri-drag-region>
				<span className="title-text" data-tauri-drag-region>
					Settings
				</span>
				<button className="close-btn" onClick={handleClose} title="Close Settings">
					<X size={12} strokeWidth={1.5} className="close-btn-icon" />
				</button>
			</div>

			<div className="settings-body">
				<div className="settings-sidebar">
					{TABS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							className={`sidebar-tab ${activeTab === id ? "active" : ""}`}
							onClick={() => setActiveTab(id)}
						>
							<div className="sidebar-tab-icon">
								<Icon size={14} strokeWidth={1.5} />
							</div>
							<span>{label}</span>
						</button>
					))}
				</div>

				<div className="settings-content">
					{announcement && !dismissed && (
						<div className={`announcement-banner severity-${announcement.severity}`}>
							<Megaphone size={14} className="announcement-banner-icon" />
							<div className="announcement-banner-text">
								<span className="announcement-banner-title">{announcement.title}</span>
								{announcement.body && (
									<span className="announcement-banner-body">{announcement.body}</span>
								)}
							</div>
							{announcement.url && (
								<button
									className="announcement-banner-link"
									onClick={() => openUrl(announcement.url!)}
								>
									Learn more
								</button>
							)}
							<button className="announcement-banner-close" onClick={dismiss} title="Dismiss">
								<X size={12} strokeWidth={2.2} />
							</button>
						</div>
					)}
					{activeTab === "general" && (
						<GeneralTab
							autostart={settings.autostart}
							toggleAutostart={settings.toggleAutostart}
							timeFormat24h={settings.timeFormat24h}
							toggleTimeFormat24h={settings.toggleTimeFormat24h}
							showUpdateIndicator={settings.showUpdateIndicator}
							toggleUpdateIndicator={settings.toggleUpdateIndicator}
							lowBatteryThreshold={settings.lowBatteryThreshold}
							handleThresholdChange={settings.handleThresholdChange}
							nightLightEnabled={settings.nightLightEnabled}
							nightLightIntensity={settings.nightLightIntensity}
							toggleNightLight={settings.toggleNightLight}
							changeNightLightIntensity={settings.changeNightLightIntensity}
							openTools={() => invoke("open_tools_window")}
							restartBloom={settings.restartBloom}
							resetToDefaults={settings.resetToDefaults}
							quitBloom={settings.quitBloom}
						/>
					)}
					{activeTab === "appearance" && (
						<AppearanceTab
							themeMode={settings.themeMode}
							handleThemeModeChange={settings.handleThemeModeChange}
							themeColor={settings.themeColor}
							handleThemeColorChange={settings.handleThemeColorChange}
							themeOpacity={settings.themeOpacity}
							handleOpacityChange={settings.handleOpacityChange}
							themeSaturation={settings.themeSaturation}
							handleSaturationChange={settings.handleSaturationChange}
							themeBrightness={settings.themeBrightness}
							handleBrightnessChange={settings.handleBrightnessChange}
							cornersEnabled={settings.cornersEnabled}
							toggleCorners={settings.toggleCorners}
							scale={settings.scale}
							handleScaleChange={settings.handleScaleChange}
						/>
					)}
					{activeTab === "notch" && (
						<NotchTab
							notchMode={settings.notchMode}
							setNotchModeValue={settings.setNotchModeValue}
							notchEdgeDelay={settings.notchEdgeDelay}
							handleNotchEdgeDelayChange={settings.handleNotchEdgeDelayChange}
							calendarEnabled={settings.calendarEnabled}
							toggleCalendar={settings.toggleCalendar}
							timerSoundEnabled={settings.timerSoundEnabled}
							toggleTimerSound={settings.toggleTimerSound}
							musicModeEnabled={settings.musicModeEnabled}
							toggleMusicMode={settings.toggleMusicMode}
							musicCompactNotch={settings.musicCompactNotch}
							toggleMusicCompactNotch={settings.toggleMusicCompactNotch}
							shelfPersist={settings.shelfPersist}
							toggleShelfPersist={settings.toggleShelfPersist}
							mediaLayout={settings.mediaLayout}
							toggleMediaLayout={settings.toggleMediaLayout}
							mediaAmbienceEnabled={settings.mediaAmbienceEnabled}
							toggleAmbience={settings.toggleAmbience}
							mediaCompactGlowEnabled={settings.mediaCompactGlowEnabled}
							toggleCompactGlow={settings.toggleCompactGlow}
							weatherEnabled={settings.weatherEnabled}
							toggleWeather={settings.toggleWeather}
							tempUnitFahrenheit={settings.tempUnitFahrenheit}
							toggleTempUnit={settings.toggleTempUnit}
							cityName={settings.cityName}
							setCityName={settings.setCityName}
							citySearchResults={settings.citySearchResults}
							showCityDropdown={settings.showCityDropdown}
							setShowCityDropdown={settings.setShowCityDropdown}
							selectCity={settings.selectCity}
							handleCityClear={settings.handleCityClear}
							statusWidgets={settings.statusWidgets}
							handleWidgetsChange={settings.handleWidgetsChange}
						/>
					)}
					{activeTab === "dock" && (
						<DockTab
							dockEnabled={settings.dockEnabled}
							toggleDock={settings.toggleDock}
							dockMode={settings.dockMode}
							setDockModeValue={settings.setDockModeValue}
							dockPreviewEnabled={settings.dockPreviewEnabled}
							toggleDockPreview={settings.toggleDockPreview}
							dockIconOnly={settings.dockIconOnly}
							toggleDockIconOnly={settings.toggleDockIconOnly}
							dockSeparatorEnabled={settings.dockSeparatorEnabled}
							toggleDockSeparator={settings.toggleDockSeparator}
							dockAdaptive={settings.dockAdaptive}
							toggleDockAdaptive={settings.toggleDockAdaptive}
							dockWinNumberEnabled={settings.dockWinNumberEnabled}
							toggleDockWinNumber={settings.toggleDockWinNumber}
							dockExtrasPosition={settings.dockExtrasPosition}
							handleDockExtrasPositionChange={settings.handleDockExtrasPositionChange}
							dockExtrasDrives={settings.dockExtrasDrives}
							toggleDockExtrasDrives={settings.toggleDockExtrasDrives}
							dockExtrasRecycleBin={settings.dockExtrasRecycleBin}
							toggleDockExtrasRecycleBin={settings.toggleDockExtrasRecycleBin}
							dockExtrasFolders={settings.dockExtrasFolders}
							toggleDockExtraFolder={settings.toggleDockExtraFolder}
							dockExtrasCustomFolders={settings.dockExtrasCustomFolders}
							handleAddDockExtraFolder={settings.handleAddDockExtraFolder}
							handleRemoveDockExtraFolder={settings.handleRemoveDockExtraFolder}
							startIcon={settings.startIcon}
							handleStartIconChange={settings.handleStartIconChange}
							dockMagnify={settings.dockMagnify}
							toggleDockMagnify={settings.toggleDockMagnify}
							dockMagnifyStrength={settings.dockMagnifyStrength}
							handleDockMagnifyStrengthChange={settings.handleDockMagnifyStrengthChange}
							dockClockEnabled={settings.dockClockEnabled}
							toggleDockClock={settings.toggleDockClock}
							dockClockShowDate={settings.dockClockShowDate}
							toggleDockClockShowDate={settings.toggleDockClockShowDate}
							dockClockSeconds={settings.dockClockSeconds}
							toggleDockClockSeconds={settings.toggleDockClockSeconds}
							deskClockEnabled={settings.deskClockEnabled}
							toggleDeskClock={settings.toggleDeskClock}
							deskClockSeconds={settings.deskClockSeconds}
							toggleDeskClockSeconds={settings.toggleDeskClockSeconds}
							deskClockShowDate={settings.deskClockShowDate}
							toggleDeskClockShowDate={settings.toggleDeskClockShowDate}
							deskClockSize={settings.deskClockSize}
							handleDeskClockSizeChange={settings.handleDeskClockSizeChange}
							deskClockWallpaper={settings.deskClockWallpaper}
							handleDeskClockWallpaperUpload={settings.handleDeskClockWallpaperUpload}
							handleDeskClockWallpaperRemove={settings.handleDeskClockWallpaperRemove}
							handleDeskClockResetPosition={settings.handleDeskClockResetPosition}
						/>
					)}
					{activeTab === "taskbar" && <TaskbarTab />}
					{activeTab === "icons" && (
						<IconsTab
							startIcon={settings.startIcon}
							onSetStartIcon={settings.handleStartIconChange}
						/>
					)}
					{activeTab === "lock" && (
						<LockScreenTab
							lockEnabled={settings.lockEnabled}
							toggleLock={settings.toggleLock}
							lockShowTime={settings.lockShowTime}
							toggleLockShowTime={settings.toggleLockShowTime}
							lockShowDate={settings.lockShowDate}
							toggleLockShowDate={settings.toggleLockShowDate}
							lockLive={settings.lockLive}
							toggleLockLive={settings.toggleLockLive}
							lockWallpaper={settings.lockWallpaper}
							handleLockWallpaperUpload={settings.handleLockWallpaperUpload}
							handleLockWallpaperRemove={settings.handleLockWallpaperRemove}
							lockBlur={settings.lockBlur}
							handleLockBlurChange={settings.handleLockBlurChange}
							lockDim={settings.lockDim}
							handleLockDimChange={settings.handleLockDimChange}
							lockRequirePassword={settings.lockRequirePassword}
							toggleLockRequirePassword={settings.toggleLockRequirePassword}
							lockPassword={settings.lockPassword}
							handleLockPasswordChange={settings.handleLockPasswordChange}
							lockHasPassword={settings.lockHasPassword}
							lockAuto={settings.lockAuto}
							toggleLockAuto={settings.toggleLockAuto}
							lockAutoMinutes={settings.lockAutoMinutes}
							handleLockAutoMinutesChange={settings.handleLockAutoMinutesChange}
							lockNow={settings.lockNow}
							lockShowNotifications={settings.lockShowNotifications}
							toggleLockShowNotifications={settings.toggleLockShowNotifications}
							lockIncludeSystemNotifications={settings.lockIncludeSystemNotifications}
							toggleLockIncludeSystemNotifications={settings.toggleLockIncludeSystemNotifications}
							windowsLockImage={settings.windowsLockImage}
							handleWindowsLockImageUpload={settings.handleWindowsLockImageUpload}
							handleWindowsLockImageRemove={settings.handleWindowsLockImageRemove}
							applyWindowsLockImage={settings.applyWindowsLockImage}
							applyWindowsState={settings.applyWindowsState}
							lockShowSeconds={settings.lockShowSeconds}
							toggleLockShowSeconds={settings.toggleLockShowSeconds}
							lockClockSize={settings.lockClockSize}
							changeLockClockSize={settings.changeLockClockSize}
							lockClockWeight={settings.lockClockWeight}
							changeLockClockWeight={settings.changeLockClockWeight}
							lockClockPosition={settings.lockClockPosition}
							changeLockClockPosition={settings.changeLockClockPosition}
							lockDateFormat={settings.lockDateFormat}
							changeLockDateFormat={settings.changeLockDateFormat}
							lockMaskStyle={settings.lockMaskStyle}
							changeLockMaskStyle={settings.changeLockMaskStyle}
							lockScrimColor={settings.lockScrimColor}
							changeLockScrimColor={settings.changeLockScrimColor}
							lockAnimations={settings.lockAnimations}
							toggleLockAnimations={settings.toggleLockAnimations}
							lockUnlockGesture={settings.lockUnlockGesture}
							toggleLockUnlockGesture={settings.toggleLockUnlockGesture}
							lockMediaControls={settings.lockMediaControls}
							toggleLockMediaControls={settings.toggleLockMediaControls}
							lockWeather={settings.lockWeather}
							toggleLockWeather={settings.toggleLockWeather}
							lockQuickActions={settings.lockQuickActions}
							toggleLockQuickActions={settings.toggleLockQuickActions}
							lockShowWidgets={settings.lockShowWidgets}
							toggleLockShowWidgets={settings.toggleLockShowWidgets}
							lockMaxNotifications={settings.lockMaxNotifications}
							changeLockMaxNotifications={settings.changeLockMaxNotifications}
							lockClickThrough={settings.lockClickThrough}
							toggleLockClickThrough={settings.toggleLockClickThrough}
							lockOnResume={settings.lockOnResume}
							toggleLockOnResume={settings.toggleLockOnResume}
						/>
					)}
					{activeTab === "overlays" && (
						<OverlaysTab
							volumeOverlayEnabled={settings.volumeOverlayEnabled}
							toggleVolumeOverlay={settings.toggleVolumeOverlay}
							volumeEdgeEnabled={settings.volumeEdgeEnabled}
							toggleVolumeEdge={settings.toggleVolumeEdge}
							brightnessOverlayEnabled={settings.brightnessOverlayEnabled}
							toggleBrightnessOverlay={settings.toggleBrightnessOverlay}
							brightnessEdgeEnabled={settings.brightnessEdgeEnabled}
							toggleBrightnessEdge={settings.toggleBrightnessEdge}
						/>
					)}
					{activeTab === "about" && (
						<AboutTab
							appVersion={settings.appVersion}
							autoUpdate={settings.autoUpdate}
							toggleAutoUpdate={settings.toggleAutoUpdate}
							updateStatus={settings.updateStatus}
							updateVersion={settings.updateVersion}
							checkForUpdates={settings.checkForUpdates}
							installUpdate={settings.installUpdate}
							exportStatus={settings.exportStatus}
							importStatus={settings.importStatus}
							handleExportSettings={settings.handleExportSettings}
							handleImportSettings={settings.handleImportSettings}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<SettingsApp />
	</StrictMode>
);
