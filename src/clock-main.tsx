import React from "react";
import ReactDOM from "react-dom/client";
import { ClockWidget } from "./ClockWidget";
import "./Clock.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ClockWidget />
	</React.StrictMode>
);
