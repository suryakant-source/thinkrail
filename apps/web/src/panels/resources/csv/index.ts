import { t } from "@thinkrail/locales/react";
import type { ResourceRenderer } from "@/resources";

export const csvRenderer: ResourceRenderer = {
	id: "thinkrail/csv",
	get label() {
		return t("viewer.renderer.table");
	},
	match: { glob: ["*.csv", "*.tsv"], text: true },
	rank: 120,
	capabilities: {
		view: true,
		diff: true,
		anchors: {
			view: ["line", "structural:table-cell"],
			diff: ["line", "structural:table-cell"],
		},
		mobile: true,
		copy: true,
		layout: false,
		whitespace: false,
		boundedDiff: "always",
	},
	loadView: () => import("./View"),
	loadDiff: () => import("./Diff"),
};
