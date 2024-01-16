import type { Hierarchy } from "./hierarchies";

export type ShowNodeOptions = {
	ext: boolean;
	folder: boolean;
	alias: boolean;
};

export interface BreadcrumbsSettings {
	hierarchies: Hierarchy[];

	views: {
		page: {
			grid: {
				enabled: boolean;
				show_node_options: ShowNodeOptions;
			};
			prev_next: {
				enabled: boolean;
				show_node_options: ShowNodeOptions;
			};
		};
		side: {
			matrix: {
				show_node_options: ShowNodeOptions;
			};
		};
	};
}
