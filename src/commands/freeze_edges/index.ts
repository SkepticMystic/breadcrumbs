import { TFile } from "obsidian";
import { is_self_loop } from "src/graph/utils";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { drop_crumbs } from "src/utils/drop_crumb";

export const freeze_implied_edges_to_note = async (
	plugin: BreadcrumbsPlugin,
	source_file: TFile,
	options: BreadcrumbsSettings["commands"]["freeze_implied_edges"]["default_options"],
) => {
	const implied_edges = plugin.graph.get_out_edges(source_file.path).filter(
		(e) =>
			// Don't freeze a note to itself (self_is_sibling)
			!is_self_loop(e) &&
			!e.attr.explicit &&
			// If field === null, we don't have an opposite field to freeze to
			e.attr.field !== null,
	);

	await drop_crumbs(plugin, source_file, implied_edges, options);
};
