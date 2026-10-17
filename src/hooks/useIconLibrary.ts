import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { loadLibraryIcons, CUSTOM_ICONS_EVENT, type LibraryIcon } from "../iconLibrary";

/**
 * Reads the user's icon library and keeps it in sync with changes made from any
 * window (uploads, deletes and app-icon changes all emit CUSTOM_ICONS_EVENT).
 */
export function useIconLibrary() {
	const [icons, setIcons] = useState<LibraryIcon[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			setIcons(await loadLibraryIcons());
		} catch (e) {
			console.error("Failed to load icon library:", e);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
		const unlisten = listen(CUSTOM_ICONS_EVENT, () => {
			refresh();
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [refresh]);

	return { icons, loading, refresh };
}
