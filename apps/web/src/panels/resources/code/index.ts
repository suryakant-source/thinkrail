import { t } from "@thinkrail/locales/react";
import { isPhoneViewport } from "@/lib";
import type { ResourceRenderer } from "@/resources";

export const codeRenderer: ResourceRenderer = {
	id: "thinkrail/code",
	get label() {
		return t("viewer.renderer.source");
	},
	match: { text: true },
	rank: 100,
	capabilities: {
		view: true,
		diff: true,
		anchors: { view: ["line"], diff: ["line"] },
		mobile: true,
		copy: true,
		layout: true,
		whitespace: true,
		boundedDiff: "large",
	},
	loadView: () => (isPhoneViewport() ? import("./PierreFile") : import("../../MonacoEditor")),
	loadDiff: () => import("./PierreDiff"),
};
