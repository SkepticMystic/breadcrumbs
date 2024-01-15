import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { blank_hierarchy } from "src/utils/hierarchies";

export const DEFAULT_SETTINGS: BreadcrumbsSettings = {
	hierarchies: [
		{
			dirs: {
				up: ["up"],
				same: ["same"],
				down: ["down"],
				next: ["next"],
				prev: ["prev"],
			},
			implied_relationships: blank_hierarchy().implied_relationships,
		},
	],

	views: {
		page: {
			grid: {
				enabled: true,
				path_keep_options: {
					ext: false,
					folder: false,
				},
			},
		},
		side: {
			matrix: {
				path_keep_options: {
					ext: false,
					folder: true,
				},
			},
		},
	},
};
