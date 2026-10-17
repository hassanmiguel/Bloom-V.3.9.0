import React from "react";
import ReactDOM from "react-dom/client";
import { LockScreen } from "./LockScreen";
import "./LockScreen.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<LockScreen />
	</React.StrictMode>
);
