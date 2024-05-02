import { MarkdownView, Notice, TFile } from "obsidian";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { drop_crumbs } from "src/utils/drop_crumb";
import { Paths } from "src/utils/paths";
import { resolve_templates } from "src/utils/strings";

export const thread = async (
	plugin: BreadcrumbsPlugin,
	field: string,
	options: BreadcrumbsSettings["commands"]["thread"]["default_options"],
) => {
	const active_view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!active_view) return;
	const source_file = active_view.file;
	if (!source_file) return;

	// Resolve the target path template
	const template_data = {
		attr: {
			field,
		},
		source: {
			path: source_file.path,
			folder: source_file.parent?.path ?? "",
			basename: source_file.basename,
		},
	};
	log.info("template_data", template_data);

	const target_path = Paths.normalise(
		Paths.ensure_ext(
			resolve_templates(options.target_path_template, template_data),
			"md",
		),
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
	// TODO
	// await drop_crumbs(
	// 	plugin,
	// 	source_file,
	// 	[
	// 		{
	// 			attr,
	// 			target_id: target_path,
	// 			source_id: source_file.path,
	// 			target_attr: { aliases: [] },
	// 		},
	// 	],
	// 	options,
	// );

	// Open the target file
	await Promise.all([
		// Let the cache update so that the refresh sees the new file
		// NOTE: I half-completed a less-flaky solution by listening to app.metadataCache.on("changed", ...)
		// But this only works if Dataview isn't enabled, and I couldn't find the correct event to listen to for Dataview
		sleep(500),
		active_view.leaf.openFile(target_file),
	]);

	// Wait till the file is created and crumbs are dropped
	await plugin.refresh();
};
