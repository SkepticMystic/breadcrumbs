import type { Hierarchy } from "./hierarchies";

export interface BreadcrumbsSettings {
	hierarchies: Hierarchy[];

	views: {
		page: {
			trail: {
				enabled: boolean;
			};
		};
		side: {
			matrix: {};
		};
	};
}
