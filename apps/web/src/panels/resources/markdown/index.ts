import type { ResourceRenderer } from "@/resources";

export const markdownRenderer: ResourceRenderer = {
	id: "thinkrail/markdown",
	labelKey: "viewer.renderer.preview",
	match: { glob: ["*.md", "*.mdx"], text: true },
	rank: 110,
	capabilities: {
		view: true,
		diff: true,
		anchors: { view: ["line"], diff: [] },
		mobile: true,
		copy: false,
		layout: false,
		whitespace: false,
	},
	loadView: () => import("../../MarkdownPreview"),
	loadDiff: () => import("../../RenderedDiff"),
};
