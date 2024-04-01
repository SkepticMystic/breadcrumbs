import { MarkdownView, Notice, TFile } from "obsidian";
import type { BCEdgeAttributes } from "src/graph/MyMultiGraph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { drop_crumbs } from "src/utils/drop_crumb";
import { Paths } from "src/utils/paths";
import { resolve_templates } from "src/utils/strings";

export const thread = async (
	plugin: BreadcrumbsPlugin,
	attr: Pick<BCEdgeAttributes, "field" | "dir" | "hierarchy_i">,
	options: BreadcrumbsSettings["commands"]["thread"]["default_options"],
) => {
	const active_view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!active_view) return;
	const source_file = active_view.file;
	if (!source_file) return;

	// Resolve the target path template
	const target_path = Paths.ensure_ext(
		resolve_templates(options.target_path_template, {
			attr,
			source: {
				path: source_file.path,
				folder: source_file.parent?.path ?? "",
				basename: Paths.drop_ext(source_file.basename),
			},
		}),
		"md",
	);
	log.debug("thread > target_path", target_path);

	// Create the target file
	let target_file: TFile | null = null;

	try {
		target_file = await plugin.app.vault.create(target_path, "");
	} catch (error) {
		const msg = `Error creating file "${target_path}". ${error instanceof Error ? error.message : error}`;

		new Notice(msg);
		log.error(msg);

		return;
	}

	// Drop the crumbs
	// NOTE: You technically can Promise.all, but it's safer to create the file first
	await drop_crumbs(
		plugin,
		source_file,
		[
			{
				attr,
				target_id: target_path,
				source_id: source_file.path,
				target_attr: { aliases: [] },
			},
		],
		options,
	);

	// Open the target file
	await Promise.all([
		// Let the cache update so that the refresh sees the new file
		sleep(500),
		active_view.leaf.openFile(target_file),
	]);

	// Wait till the file is created and crumbs are dropped
	await plugin.refresh();
};
