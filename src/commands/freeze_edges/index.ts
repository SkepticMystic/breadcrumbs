import type { TFile } from "obsidian";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { drop_crumbs } from "src/utils/drop_crumb";

// TODO: The name of this command isn't accessible. Figures-of-speech are hard.
// I guess the internal code can still refer to it as such, but the command name, and docs should be more user-friendly.
export async function freeze_implied_edges_to_note(
	plugin: BreadcrumbsPlugin,
	source_file: TFile,
	options: BreadcrumbsSettings["commands"]["freeze_implied_edges"]["default_options"],
) {
	const implied_edges = plugin.graph
		.get_outgoing_edges(source_file.path)
		.get_edges()
		.filter(
			// Don't freeze a note to itself (self_is_sibling)
			(e) => !e.is_self_loop() && !e.explicit(plugin.graph),
		);

	await drop_crumbs(plugin, source_file, implied_edges, options);
}
