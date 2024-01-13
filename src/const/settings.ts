import type { BreadcrumbsSettings } from "src/interfaces/settings";

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
			implied_relationships: {
				opposite_direction: true,
				self_is_sibling: false,
			},
		},
	],
};
