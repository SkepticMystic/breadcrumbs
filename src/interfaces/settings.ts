import type { Hierarchy } from "./hierarchies";

export interface BreadcrumbsSettings {
	hierarchies: Hierarchy[];

	views: {
		page: {
			grid: {
				enabled: boolean;
			};
		};
		side: {
			matrix: {};
		};
	};
}
