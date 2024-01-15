import type { Hierarchy } from "./hierarchies";

export type PathKeepOptions = {
	ext: boolean;
	folder: boolean;
};

export interface BreadcrumbsSettings {
	hierarchies: Hierarchy[];

	views: {
		page: {
			grid: {
				enabled: boolean;
				path_keep_options: PathKeepOptions;
			};
			prev_next: {
				enabled: boolean;
				path_keep_options: PathKeepOptions;
			};
		};
		side: {
			matrix: {
				path_keep_options: PathKeepOptions;
			};
		};
	};
}
