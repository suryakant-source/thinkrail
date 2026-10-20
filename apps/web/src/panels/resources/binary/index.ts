import { t } from "@thinkrail/locales/react";
import type { ResourceRenderer } from "@/resources";

export const binaryRenderer: ResourceRenderer = {
	id: "thinkrail/binary",
	get label() {
		return t("viewer.renderer.file");
	},
	match: { text: false },
	rank: 0,
	capabilities: {
		view: true,
		diff: true,
		anchors: { view: [], diff: [] },
		mobile: true,
		copy: false,
		layout: false,
		whitespace: false,
	},
	loadView: () => import("./BinaryView"),
	loadDiff: () => import("./BinaryDiff"),
};
