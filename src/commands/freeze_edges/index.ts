import { 
  TFile,
  TFolder,
  Vault,
  Notice
} from "obsidian";
import { is_self_loop } from "src/graph/utils";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { drop_crumbs } from "src/utils/drop_crumb";

// TODO: The name of this command isn't accessible. Figures-of-speech are hard.
// I guess the internal code can still refer to it as such, but the command name, and docs should be more user-friendly.
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

export async function freeze_edges_in_folder(plugin: BreadcrumbsPlugin, folder: TFolder): Promise<void> {
	const promises: Promise<void>[] = [];
	new Notice("Freezing implied edges in the selected folder.");
	await plugin.refresh({rebuild_graph: true, active_file_store: true, redraw_page_views: true, redraw_side_views: true, redraw_codeblocks: true});
	Vault.recurseChildren(folder, (child) => {
		if (child instanceof TFile) {
			const p = freeze_implied_edges_to_note(plugin, child, plugin.settings.commands.freeze_implied_edges.default_options);
			promises.push(p);
		}
	});
	await Promise.all(promises);
	new Notice("Finished freezing implied edges in folder.");
}