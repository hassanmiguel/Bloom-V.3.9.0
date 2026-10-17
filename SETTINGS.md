# Bloom Settings Reference

All settings are stored in `settings.json` in the app config directory (`%APPDATA%/bloom/`). The file is a flat JSON object with `bloom-` prefixed keys. Bloom watches this file for external changes and applies them in real-time.

## Quick Start

Edit `settings.json` with any text editor while Bloom is running. Changes are applied immediately — no restart required.

```json
{
	"bloom-dock-enabled": "true",
	"bloom-dock-mode": "smart",
	"bloom-theme-mode": "dark",
	"bloom-scale": "1.0"
}
```

## Settings Keys

### Dock

| Key                                | Type                             | Default       | Description                                                                                                                                                                      |
| ---------------------------------- | -------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bloom-dock-enabled`               | `"true"` / `"false"`             | `"true"`      | Show or hide the Bloom Dock (taskbar replacement).                                                                                                                               |
| `bloom-dock-mode`                  | `"fixed"` / `"smart"` / `"peek"` | `"smart"`     | Dock visibility behavior. **fixed** = always visible as AppBar. **smart** = auto-hide when overlapped by fullscreen apps. **peek** = hidden until cursor approaches bottom edge. |
| `bloom-dock-preview-enabled`       | `"true"` / `"false"`             | `"true"`      | Show window thumbnail previews when hovering dock icons.                                                                                                                         |
| `bloom-dock-icon-only`             | `"true"` / `"false"`             | `"false"`     | Minimal icon-only style (no background/padding around icons).                                                                                                                    |
| `bloom-dock-separator-enabled`     | `"true"` / `"false"`             | `"true"`      | Show a divider between pinned and unpinned dock apps when unpinned apps are present. Unpinned apps remain on the right when disabled.                                            |
| `bloom-start-icon`                 | icon key / `custom:<data URI>` / `library:<id>` | `"default"`   | Start button icon: `default`, `bloom-colorful`, `bloom-golden`, `bloom-biscuit`, `windows`, `custom:` followed by an uploaded image's data URI, or `library:<id>` referencing an icon in the user's Icon Library.                               |
| `bloom-dock-adaptive`              | `"true"` / `"false"`             | `"false"`     | Fixed dock only. Stretch the dock to full width like a traditional taskbar while a window is maximized, and contract back when it's restored.                                    |
| `bloom-dock-win-number-enabled`    | `"true"` / `"false"`             | `"true"`      | When the taskbar is replaced, Win+1 through Win+9 activate the matching pinned dock app (focus/minimize if running, launch otherwise) instead of the native taskbar slots.       |
| `bloom-dock-extras-position`       | `"off"` / `"left"` / `"right"`   | `"off"`       | Show a dock extras section with drives, folders and the Recycle Bin beside the app icons, on the left or right side of the dock.                                                 |
| `bloom-dock-extras-drives`         | `"true"` / `"false"`             | `"true"`      | Show fixed, removable (with media) and connected mapped network drives in the dock extras. Empty card readers and unloaded discs are hidden.                                     |
| `bloom-dock-extras-recycle-bin`    | `"true"` / `"false"`             | `"true"`      | Show the Recycle Bin in the dock extras. The icon reflects whether the bin holds anything.                                                                                       |
| `bloom-dock-extras-folders`        | comma-separated ids              | `"downloads"` | Known folders in the dock extras: any of `desktop`, `downloads`, `documents`, `pictures`, `music`, `videos`, or `"none"` for no folders.                                         |
| `bloom-dock-extras-custom-folders` | JSON array                       | `"[]"`        | User-added folders, e.g. `[{"name":"Projects","path":"D:\\Projects"}]`. Folders that no longer exist are skipped until they return.                                              |
| `bloom-dock-magnify`               | `"true"` / `"false"`             | `"false"`     | Grow dock icons under the cursor, like the macOS Dock.                                                                                                                            |
| `bloom-dock-magnify-strength`      | float `"1.1"`–`"1.8"`            | `"1.45"`      | Peak magnification of the hovered icon.                                                                                                                                          |
| `bloom-dock-clock-enabled`         | `"true"` / `"false"`             | `"false"`     | Show the time (and optional date) at the end of the dock. Uses `bloom-time-format-24h`.                                                                                           |
| `bloom-dock-clock-show-date`       | `"true"` / `"false"`             | `"true"`      | Show the date under the dock clock time.                                                                                                                                          |
| `bloom-dock-clock-seconds`         | `"true"` / `"false"`             | `"false"`     | Update the dock clock every second (shows seconds).                                                                                                                               |

### Floating Clock

The floating clock (Settings → Dock → Floating Clock) is a draggable, always-on-top 3D flip clock that sits anywhere on the desktop. Its window is positioned top-right by default and remembers where you drag it. It reuses `bloom-time-format-24h`.

| Key                     | Type                 | Default | Description                                                                                                                     |
| ----------------------- | -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `bloom-clock-enabled`   | `"true"` / `"false"` | `"false"` | Show the floating 3D flip clock.                                                                                              |
| `bloom-clock-seconds`   | `"true"` / `"false"` | `"false"` | Show seconds on the floating clock.                                                                                           |
| `bloom-clock-show-date` | `"true"` / `"false"` | `"true"`  | Show the date under the floating clock time.                                                                                  |
| `bloom-clock-size`      | float `"0.7"`–`"1.6"` | `"1"`    | Scale of the floating clock.                                                                                                   |
| `bloom-clock-wallpaper` | absolute path        | `""`      | Image placed behind the floating clock, stored in `%APPDATA%\bloom\wallpapers`. Set automatically when you choose a file.     |
| `bloom-clock-x`         | logical pixels       | (unset)   | Saved left position of the floating clock. Unset = default top-right corner. Cleared by **Reset Position**.                   |
| `bloom-clock-y`         | logical pixels       | (unset)   | Saved top position of the floating clock. Unset = default top-right corner. Cleared by **Reset Position**.                    |

### Lock Screen

The in-app lock screen (Settings → Lock) is a full-screen cover with the time, date and optional wallpaper. With auto-lock enabled, Bloom covers the screen after a period without keyboard/mouse input. A still image can also be applied as the real Windows lock screen background via `SetImageFileAsync` (video/GIF are not supported by Windows there).

| Key                           | Type                 | Default   | Description                                                                                                                 |
| ----------------------------- | -------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| `bloom-lock-enabled`          | `"true"` / `"false"` | `"false"` | Enable the in-app lock screen (unlocks the auto-lock watcher and the settings panel).                                        |
| `bloom-lock-show-time`        | `"true"` / `"false"` | `"true"`  | Show the clock on the lock screen. Uses `bloom-time-format-24h`.                                                             |
| `bloom-lock-show-date`        | `"true"` / `"false"` | `"true"`  | Show the date under the time.                                                                                               |
| `bloom-lock-wallpaper`        | absolute path        | `""`      | Image / GIF / video behind the lock screen, stored in `%APPDATA%\bloom\wallpapers`. Set automatically when you choose a file. |
| `bloom-lock-live`             | `"true"` / `"false"` | `"false"` | Treat the lock wallpaper as live media (animated GIF / video) instead of a still image.                                     |
| `bloom-lock-blur`             | pixels `"0"`–`"40"`  | `"0"`     | Gaussian blur applied to the lock wallpaper.                                                                                |
| `bloom-lock-dim`              | `"0"`–`"0.9"`        | `"0.35"`  | Dark overlay for contrast.                                                                                                  |
| `bloom-lock-require-password` | `"true"` / `"false"` | `"false"` | Require a password before unlocking.                                                                                        |
| `bloom-lock-password`         | string               | `""`      | The unlock password. Stored as `sha256:<hex>` (FNV-1a fallback when SubtleCrypto is unavailable); legacy plaintext values still verify. Still a convenience screen-lock, not disk encryption. |
| `bloom-lock-auto`             | `"true"` / `"false"` | `"false"` | Automatically lock when idle.                                                                                               |
| `bloom-lock-auto-minutes`     | integer `"1"`–`"60"` | `"5"`     | Idle minutes before auto-lock.                                                                                              |
| `bloom-lock-show-notifications` | `"true"` / `"false"` | `"true"`  | Show live Windows Action Center toast notifications on the lock screen.                                                       |
| `bloom-lock-include-system-notifications` | `"true"` / `"false"` | `"false"` | Include core system notifications alongside app notifications.                                                              |
| `bloom-lock-windows-image`    | absolute path        | `""`      | Still image chosen to apply as the real Windows lock screen background.                                                     |
| `bloom-lock-show-seconds`     | `"true"` / `"false"` | `"false"` | Show seconds next to the lock clock.                                                                                        |
| `bloom-lock-max-notifications` | integer `"1"`–`"20"` | `"5"`    | Maximum number of notification cards shown on the lock screen.                                                              |
| `bloom-lock-mask-style`       | `"emoji"` / `"dots"` / `"none"` | `"emoji"` | How typed password characters are rendered: emoji scramble, dots, or plain text.                                 |
| `bloom-lock-date-format`      | `"long"` / `"short"` / `"numeric"` | `"long"` | Date line format on the lock screen.                                                                                        |
| `bloom-lock-scrim-color`      | hex color            | `"#000000"` | Colour of the dimming overlay behind the lock screen content.                                                               |
| `bloom-lock-animations`       | `"true"` / `"false"` | `"true"`  | Enable lock-screen animations (shake, fade, hint pulse).                                                                    |
| `bloom-lock-unlock-gesture`   | `"true"` / `"false"` | `"true"`  | Allow unlocking with any key / background click when no password is set.                                                    |
| `bloom-lock-media-controls`   | `"true"` / `"false"` | `"false"` | Show a now-playing bar with previous/play-pause/next controls.                                                              |
| `bloom-lock-weather`          | `"true"` / `"false"` | `"false"` | Show a weather chip (uses the same backend as the notch weather).                                                           |
| `bloom-lock-quick-actions`    | `"true"` / `"false"` | `"false"` | Show quick action buttons (volume down / mute / volume up) on the lock screen.                                              |
| `bloom-lock-show-widgets`     | `"true"` / `"false"` | `"false"` | Show small status widgets (battery level + charging state).                                                                 |
| `bloom-lock-clock-size`       | pixels `"60"`–`"260"` | `"140"`  | Font size of the lock clock.                                                                                                |
| `bloom-lock-clock-weight`     | font weight `"100"`–`"700"` | `"200"` | Font weight of the lock clock.                                                                                             |
| `bloom-lock-clock-position`   | `"top"` / `"center"` / `"bottom"` | `"center"` | Vertical placement of the clock/date block.                                                                    |
| `bloom-lock-click-through`    | `"true"` / `"false"` | `"false"` | Let mouse input pass through the lock screen to windows underneath.                                                         |
| `bloom-lock-lock-on-resume`   | `"true"` / `"false"` | `"false"` | Re-show the lock screen automatically after the PC wakes from sleep/hibernate.                                              |

### Taskbar

Customize the dock's background and icon sizing (Settings → Taskbar). The background sits behind the dock icons; `theme` keeps the normal theme-driven surface.

| Key                          | Type                                              | Default     | Description                                                                                                                                             |
| ---------------------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bloom-taskbar-bg-mode`      | `"theme"` / `"color"` / `"gradient"` / `"image"` / `"live"` | `"theme"`   | Background style: theme surface, solid color, gradient, image wallpaper, or live wallpaper (GIF / video).                                               |
| `bloom-taskbar-bg-color`     | hex color                                         | `"#1c1c1e"` | Solid color (color mode) or gradient start color.                                                                                                        |
| `bloom-taskbar-bg-color2`    | hex color                                         | `"#0a84ff"` | Gradient end color.                                                                                                                                      |
| `bloom-taskbar-bg-angle`     | degrees `"0"`–`"360"`                             | `"90"`      | Gradient angle.                                                                                                                                          |
| `bloom-taskbar-bg-image`     | absolute path                                     | `""`        | Path to the wallpaper stored in `%APPDATA%\bloom\wallpapers`. Set automatically when you choose a file.                                                  |
| `bloom-taskbar-bg-fit`       | `"cover"` / `"contain"` / `"stretch"` / `"tile"`  | `"cover"`   | How the wallpaper fills the taskbar.                                                                                                                     |
| `bloom-taskbar-bg-opacity`   | `"0.05"`–`"1"`                                    | `"1"`       | Wallpaper opacity.                                                                                                                                       |
| `bloom-taskbar-bg-blur`      | pixels `"0"`–`"40"`                               | `"0"`       | Gaussian blur applied to the wallpaper.                                                                                                                  |
| `bloom-taskbar-bg-dim`       | `"0"`–`"1"`                                       | `"0.12"`    | Dark overlay for icon contrast.                                                                                                                          |
| `bloom-taskbar-icon-size`    | pixels `"24"`–`"64"`                              | `"36"`      | Dock icon size.                                                                                                                                          |
| `bloom-taskbar-icon-gap`     | pixels `"0"`–`"32"`                               | `"12"`      | Space between dock icons / groups.                                                                                                                       |

### Notch

| Key                      | Type                             | Default   | Description                                                                                                                    |
| ------------------------ | -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `bloom-notch-mode`       | `"fixed"` / `"smart"` / `"peek"` | `"fixed"` | Notch (top bar) visibility behavior. Same modes as dock. **peek** shows the notch briefly on media events and notifications.   |
| `bloom-notch-edge-delay` | milliseconds `"0"`–`"2000"`      | `"200"`   | In smart/peek mode, how long the cursor must rest against the top screen edge before the notch peeks. `"0"` reveals instantly. |

### Weather

| Key                              | Type                         | Default     | Description                                                                        |
| -------------------------------- | ---------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `bloom-weather-enabled`          | `"true"` / `"false"`         | `"true"`    | Show weather widget in the notch status bar.                                       |
| `bloom-weather-city`             | string                       | `""`        | Manually set city name for weather. Empty string = auto-detect via IP geolocation. |
| `bloom-weather-lat`              | number string                | (auto)      | Latitude coordinate for weather. Set automatically when a city is selected.        |
| `bloom-weather-lon`              | number string                | (auto)      | Longitude coordinate for weather. Set automatically when a city is selected.       |
| `bloom-weather-cached-temp`      | number string                | (none)      | Cached temperature value shown before next API fetch.                              |
| `bloom-weather-cached-condition` | string                       | (none)      | Cached weather condition text (e.g. "Partly Cloudy").                              |
| `bloom-temp-unit`                | `"celsius"` / `"fahrenheit"` | `"celsius"` | Temperature display unit.                                                          |

### Modules

| Key                         | Type                 | Default  | Description                                                           |
| --------------------------- | -------------------- | -------- | --------------------------------------------------------------------- |
| `bloom-calendar-enabled`    | `"true"` / `"false"` | `"true"` | Enable calendar/timer mode in the notch.                              |
| `bloom-music-mode-enabled`  | `"true"` / `"false"` | `"true"` | Enable interactive music media widget.                                |
| `bloom-music-compact-notch` | `"true"` / `"false"` | `"true"` | Show compact music display (visualizer + artwork) in collapsed notch. |

### Shelf

| Key                   | Type                 | Default   | Description                                                                                                    |
| --------------------- | -------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `bloom-shelf-persist` | `"true"` / `"false"` | `"false"` | Keep notch shelf items across restarts. Off = items are cleared when Bloom closes. Max 10 items, newest first. |

### Music Appearance

| Key                                | Type                      | Default     | Description                                                                                     |
| ---------------------------------- | ------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `bloom-media-layout`               | `"classic"` / `"compact"` | `"classic"` | Expanded player style. **classic** = large album art. **compact** = small thumbnail + controls. |
| `bloom-media-ambience-enabled`     | `"true"` / `"false"`      | `"true"`    | Colored ambient glow behind expanded album art.                                                 |
| `bloom-media-compact-glow-enabled` | `"true"` / `"false"`      | `"true"`    | Glow effect around the collapsed compact thumbnail.                                             |
| `bloom-media-visualizer-enabled`   | `"true"` / `"false"`      | `"true"`    | Audio visualizer bars in music mode. Also accepts `bloom-visualizer-enabled` (legacy alias).    |
| `bloom-media-album-art-enabled`    | `"true"` / `"false"`      | `"true"`    | Show album artwork in the notch music display.                                                  |

### Overlays

| Key                                | Type                 | Default  | Description                                                              |
| ---------------------------------- | -------------------- | -------- | ------------------------------------------------------------------------ |
| `bloom-volume-overlay-enabled`     | `"true"` / `"false"` | `"true"` | Show Bloom volume HUD when volume changes (replaces native Windows OSD). |
| `bloom-volume-edge-enabled`        | `"true"` / `"false"` | `"true"` | Trigger volume HUD by hovering the left screen edge.                     |
| `bloom-brightness-overlay-enabled` | `"true"` / `"false"` | `"true"` | Show Bloom brightness HUD when brightness changes.                       |
| `bloom-brightness-edge-enabled`    | `"true"` / `"false"` | `"true"` | Trigger brightness HUD by hovering the right screen edge.                |
| `bloom-night-light-enabled`        | `"true"` / `"false"` | `"false"` | Apply a warm colour-temperature gamma ramp to every monitor.            |
| `bloom-night-light-intensity`      | `"0.1"`–`"1"`        | `"0.5"`  | Night-light warmth (higher = warmer). Only applied while enabled.       |

### Appearance

| Key                      | Type                                             | Default     | Description                                                                                                                                                 |
| ------------------------ | ------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bloom-theme-mode`       | `"dark"` / `"light"` / `"custom"` / `"adaptive"` | `"dark"`    | Theme mode. **dark** = dark translucent. **light** = light translucent. **custom** = user-picked color. **adaptive** = follows Windows system accent color. |
| `bloom-theme-color`      | hex string                                       | `"#007aff"` | Custom theme color (used in `custom` and `adaptive` modes).                                                                                                 |
| `bloom-theme-opacity`    | float string                                     | `"0.80"`    | Background opacity (0.1 to 1.0).                                                                                                                            |
| `bloom-theme-saturation` | float string                                     | `"0.50"`    | Color saturation for custom/adaptive themes (0.0 to 1.0).                                                                                                   |
| `bloom-theme-brightness` | float string                                     | `"0.15"`    | Background brightness for custom/adaptive themes (0.0 to 1.0).                                                                                              |
| `bloom-corners-enabled`  | `"true"` / `"false"`                             | `"false"`   | Render rounded screen corner overlays on top edges.                                                                                                         |

### Status Widgets

| Key                    | Type        | Default                                    | Description                                                                                                 |
| ---------------------- | ----------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `bloom-status-widgets` | JSON string | `{"left":["weather"],"right":["battery"]}` | Widget layout in collapsed notch. Available: `"weather"`, `"battery"`, `"cpu"`, `"ram"`, `"disk"`, `"net"`. |

Example:

```json
{
	"bloom-status-widgets": "{\"left\":[\"cpu\",\"ram\"],\"right\":[\"battery\",\"net\"]}"
}
```

### System

| Key                            | Type                 | Default   | Description                                                                                          |
| ------------------------------ | -------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `bloom-scale`                  | float string         | `"1.0"`   | UI scale factor (0.8 to 1.3). Changing this re-registers AppBars to resize the reserved screen area. |
| `bloom-low-battery-threshold`  | integer string       | `"20"`    | Battery percentage that triggers the low-battery alert pulse (5 to 50, step 5).                      |
| `bloom-auto-update`            | `"true"` / `"false"` | `"false"` | Check for and download updates automatically on startup.                                             |
| `bloom-show-update-indicator`  | `"true"` / `"false"` | `"true"`  | Show a green dot on the notch when an update is available.                                           |
| `bloom-announcement-dismissed` | announcement id      | `""`      | ID of the last dismissed in-app announcement (published via `website/public/announcements.json`).    |
| `bloom-time-format-24h`        | `"true"` / `"false"` | `"false"` | Use 24-hour clock format in the notch. When `"false"`, displays 12-hour format with AM/PM.           |

### Internal (Do Not Edit Manually)

| Key                 | Type     | Description                                                                           |
| ------------------- | -------- | ------------------------------------------------------------------------------------- |
| `bloom-first-run`   | sentinel | Set to `"done"` after first launch. Triggers splash screen if absent.                 |
| `bloom-app-version` | string   | Last known app version. If it differs from current, splash screen is shown on update. |

## Event System

Bloom uses two Tauri events for settings synchronization:

### `settings-changed`

- **Emitted by:** `save_setting` command (frontend or backend)
- **Payload:** `{ "key": "bloom-...", "value": ... }`
- **Purpose:** Broadcasts changes made through the Bloom UI to all windows
- **Key format:** Bloom-prefixed keys as-is (e.g. `"bloom-dock-mode"`)

### `settings-external-changed`

- **Emitted by:** File watcher (detects external edits to `settings.json`)
- **Payload:** `{ "key": "bloom-...", "value": ... }` or `{ "key": "bloom-...", "value": null }` for removed keys
- **Purpose:** Broadcasts changes made by external editors (VS Code, notepad, scripts)
- **Key format:** Bloom-prefixed keys as-is
- **Behavior:** Also syncs values to `localStorage` for instant frontend reads

### Flow

```
External editor saves settings.json
    ↓
File watcher detects change (ReadDirectoryChangesW)
    ↓
Diffs against SETTINGS_CACHE
    ↓
Emits settings-external-changed for each changed/removed key
    ↓
useSettingsSync hook updates React state + localStorage
    ↓
useSettingsSync hook updates React state
    ↓
UI re-renders with new values
```

## Example: Changing Dock Mode via Script

```powershell
# PowerShell: switch dock to smart mode
$json = Get-Content "$env:APPDATA\bloom\settings.json" | ConvertFrom-Json
$json.'bloom-dock-mode' = 'smart'
$json | ConvertTo-Json | Set-Content "$env:APPDATA\bloom\settings.json"
```

```python
# Python: disable dock
import json, os
path = os.path.join(os.environ['APPDATA'], 'bloom', 'settings.json')
with open(path) as f: settings = json.load(f)
settings['bloom-dock-enabled'] = 'false'
with open(path, 'w') as f: json.dump(settings, f)
```

## Notes

- All boolean values are strings (`"true"` / `"false"`) for consistency with `localStorage`.
- The `useSettingsSync` hook auto-converts `"true"` / `"false"` strings to booleans.
- `auto-hide` mode values in `bloom-dock-mode` and `bloom-notch-mode` are legacy aliases for `smart` — they are mapped automatically.
- Changing `bloom-scale` triggers AppBar re-registration to adjust reserved screen space.
- **Icon Library** (Settings → Icons) stores an unlimited number of user-uploaded images in `custom_icons/` under `library:`-prefixed keys. You can select hundreds of files at once; each is normalized to a 256×256 PNG. Any library icon can be assigned to the start button (`bloom-start-icon = "library:<id>"`) or to **any application** — the target picker lists pinned, currently-running, and all installed apps, and each app target has a **Reset** action that restores its native icon. The library is independent of `settings.json` and survives a settings reset.
- **Icon Folder** (Settings → Icons and Settings → Dock). The folder that backs the library (`%APPDATA%\bloom\custom_icons`) is shown with **Open Folder** and **Rescan** buttons. Any image files dropped directly into it are imported automatically (converted to a 256×256 PNG and registered as `library:<filename>`), so icons can be added without using the picker. Icons applied to apps are stored in the same folder under `custom_icons.json` (mapping sanitized filename → cache key).
- **Taskbar Wallpapers** (Settings → Taskbar) store uploaded image / GIF / video files in `%APPDATA%\bloom\wallpapers` (filename gets a timestamp suffix). Only `bloom-taskbar-bg-image` (the path) lives in `settings.json`; the Dock reads the file through the `read_wallpaper` command and renders it as a data URI, so no asset protocol is required. GIF or video files switch the mode to `live` automatically.
- Settings → General → Reset to Defaults removes every `bloom-` key from `settings.json` and `localStorage` (except the `bloom-first-run` / `bloom-app-version` lifecycle sentinels), then restarts Bloom. Pinned apps (`pinned_apps.json`) and uploaded icons (`custom_icons/`) are preserved.
- Theme changes (`bloom-theme-*`) are applied by reading all theme values from `localStorage` and calling `applyTheme()` — the theme system depends on all five theme keys being in sync.
