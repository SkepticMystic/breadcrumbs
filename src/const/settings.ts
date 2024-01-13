import type { BreadcrumbsSettings } from "src/interfaces/settings";

export const DEFAULT_SETTINGS: BreadcrumbsSettings = {
	hierarchies: [
		{
			up: ["up"],
			same: ["same"],
			down: ["down"],
			next: ["next"],
			prev: ["prev"],
		},
	],
};
