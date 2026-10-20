import "./index.css";
import { useT } from "@thinkrail/locales/react";
import { TooltipProvider } from "@thinkrail/ui/tooltip";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initChatPreferencesPersistence } from "./chat/chatPreferences";
import { initModelVisibilityPersistence } from "./chat/modelVisibility";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LocaleBoundary } from "./i18n";
import { initNavigation } from "./navigation";
import { initProjectExpansionPersistence } from "./panels/projectExpansion";
import { Shell } from "./shell/Shell";
import { applyThemePreference, initializeBundledThemes, readThemeHint } from "./themes";
import { initTransport } from "./transport";

initializeBundledThemes();
applyThemePreference(readThemeHint());
initTransport();
initChatPreferencesPersistence();
initModelVisibilityPersistence();
initProjectExpansionPersistence();
initNavigation();

function App() {
	const t = useT();
	return (
		<ErrorBoundary label={t("app.errorBoundary.label")}>
			<TooltipProvider delayDuration={250} skipDelayDuration={400}>
				<Shell />
			</TooltipProvider>
		</ErrorBoundary>
	);
}

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(
		<StrictMode>
			<LocaleBoundary>
				<App />
			</LocaleBoundary>
		</StrictMode>,
	);
}
