import { Power, Download, Clock, BatteryWarning, RefreshCw, RotateCcw, LogOut, Moon, SunMedium, AppWindow } from "lucide-react";
import { SettingRow } from "./SettingRow";

interface GeneralTabProps {
	autostart: boolean;
	toggleAutostart: () => void;
	timeFormat24h: boolean;
	toggleTimeFormat24h: () => void;
	showUpdateIndicator: boolean;
	toggleUpdateIndicator: () => void;
	lowBatteryThreshold: number;
	handleThresholdChange: (val: number) => void;
	nightLightEnabled: boolean;
	nightLightIntensity: number;
	toggleNightLight: () => void;
	changeNightLightIntensity: (val: number) => void;
	openTools: () => void;
	restartBloom: () => void;
	resetToDefaults: () => void;
	quitBloom: () => void;
}

export function GeneralTab({
	autostart,
	toggleAutostart,
	timeFormat24h,
	toggleTimeFormat24h,
	showUpdateIndicator,
	toggleUpdateIndicator,
	lowBatteryThreshold,
	handleThresholdChange,
	nightLightEnabled,
	nightLightIntensity,
	toggleNightLight,
	changeNightLightIntensity,
	openTools,
	restartBloom,
	resetToDefaults,
	quitBloom
}: GeneralTabProps) {
	return (
		<>
			<div className="setting-group-label">System</div>
			<div className="setting-group">
				<SettingRow icon={Power} label="Launch at Login" desc="Open Bloom automatically">
					<label className="toggle-switch">
						<input type="checkbox" checked={autostart} onChange={toggleAutostart} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Download}
					label="Update Indicator"
					desc="Show green dot when update available"
				>
					<label className="toggle-switch">
						<input type="checkbox" checked={showUpdateIndicator} onChange={toggleUpdateIndicator} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow icon={Clock} label="24-Hour Time" desc="Use 24-hour clock format">
					<label className="toggle-switch">
						<input type="checkbox" checked={timeFormat24h} onChange={toggleTimeFormat24h} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Moon}
					label="Night Light"
					desc="Warm the screen colour to reduce eye strain"
				>
					<label className="toggle-switch">
						<input type="checkbox" checked={nightLightEnabled} onChange={toggleNightLight} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				{nightLightEnabled && (
					<SettingRow icon={SunMedium} label="Warmth" desc={`${Math.round(nightLightIntensity * 100)}%`}>
						<input
							type="range"
							min="0.1"
							max="1"
							step="0.05"
							value={nightLightIntensity}
							onChange={(e) => changeNightLightIntensity(parseFloat(e.target.value))}
							className="settings-slider"
						/>
					</SettingRow>
				)}

				<SettingRow
					icon={BatteryWarning}
					label="Low Battery Alert"
					desc={`Trigger at ${lowBatteryThreshold}%`}
					divider={false}
				>
					<input
						type="range"
						min="5"
						max="50"
						step="5"
						value={lowBatteryThreshold}
						onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
						className="settings-slider"
					/>
				</SettingRow>
			</div>

			<div className="setting-group-label">App</div>
			<div className="setting-group">
				<SettingRow
					icon={AppWindow}
					label="Bloom Tools"
					desc="Clipboard history, search, system stats & timers"
					action
					onClick={openTools}
				/>
				<SettingRow
					icon={RotateCcw}
					label="Reset to Defaults"
					desc="Restore all settings and restart Bloom"
					action
					danger
					onClick={resetToDefaults}
				/>
				<SettingRow
					icon={RefreshCw}
					label="Restart Bloom"
					desc="Reinitialize all components"
					action
					onClick={restartBloom}
				/>
				<SettingRow
					icon={LogOut}
					label="Quit Bloom"
					desc="Exit application completely"
					action
					danger
					onClick={quitBloom}
					divider={false}
				/>
			</div>
		</>
	);
}
