import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { getCustomIconsDirPath, importIconsFromDir } from "../iconLibrary";

interface IconFolderRowProps {
	onImported?: () => void;
}

/**
 * Shows the on-disk folder that backs the icon library, lets the user open it
 * and re-scan it, and automatically imports any images dropped into it.
 */
export function IconFolderRow({ onImported }: IconFolderRowProps) {
	const [dir, setDir] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const ranOnce = useRef(false);
	const timer = useRef<number | null>(null);

	const flash = useCallback((message: string) => {
		setStatus(message);
		if (timer.current) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setStatus(null), 4000);
	}, []);

	const runImport = useCallback(
		async (announce: boolean) => {
			setBusy(true);
			try {
				await importIconsFromDir();
				onImported?.();
				if (announce) flash("Folder scanned — new images were added to your library.");
			} catch (e) {
				console.error("Import from folder failed:", e);
				if (announce) flash("Could not read the icon folder.");
			} finally {
				setBusy(false);
			}
		},
		[flash, onImported]
	);

	useEffect(() => {
		getCustomIconsDirPath()
			.then(setDir)
			.catch(() => {});
		if (!ranOnce.current) {
			ranOnce.current = true;
			void runImport(false);
		}
		return () => {
			if (timer.current) window.clearTimeout(timer.current);
		};
	}, [runImport]);

	const openFolder = async () => {
		try {
			await revealItemInDir(dir);
		} catch (e) {
			console.error("Failed to open icon folder:", e);
			flash("Could not open the folder.");
		}
	};

	return (
		<div
			className="setting-item"
			style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
				<div className="setting-icon-bg">
					<FolderOpen size={14} strokeWidth={1.5} />
				</div>
				<div className="setting-info">
					<span className="setting-label">Custom Icon Folder</span>
					<span className="setting-desc">
						Drop image files here to add them to your library automatically
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						className="folder-chip"
						onClick={() => void runImport(true)}
						disabled={busy}
						style={{ opacity: busy ? 0.6 : 1 }}
						title="Re-scan the folder for new images"
					>
						<RefreshCw size={13} strokeWidth={2} />
						Rescan
					</button>
					<button
						type="button"
						className="folder-chip active"
						onClick={() => void openFolder()}
						disabled={!dir}
						title="Open the icon folder"
					>
						<FolderOpen size={13} strokeWidth={2} />
						Open Folder
					</button>
				</div>
			</div>
			{dir && (
				<span className="icon-folder-path" title={dir}>
					{dir}
				</span>
			)}
			{status && <div className="icon-library-status">{status}</div>}
		</div>
	);
}
