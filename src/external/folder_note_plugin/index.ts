import {
	getApi,
	isPluginEnabled,
	registerApi,
} from "@aidenlx/folder-note-core";
import type BreadcrumbsPlugin from "src/main";

const is_enabled = (plugin: BreadcrumbsPlugin) =>
	isPluginEnabled(
		// @ts-expect-error: I believe the FolderNote types are outdated
		plugin,
	);

const get_api = (plugin: BreadcrumbsPlugin) =>
	getApi(
		// @ts-expect-error: I believe the FolderNote types are outdated
		plugin,
	);

const await_if_enabled = (plugin: BreadcrumbsPlugin) =>
	new Promise<void>((resolve) => {
		if (is_enabled(plugin)) {
			registerApi(
				// @ts-expect-error: I believe the FolderNote types are outdated
				plugin,
				// TODO: Does this have the same issue as Dataview where, in dev mode, the plugin might already be initialized?
				(api) => {
					console.log("folder-note-core api initialized");
					resolve();
				},
			);
		} else {
			console.log("folder-note-core not enabled");

			resolve();
		}
	});

export const FolderNotePlugin = {
	get_api,
	is_enabled,
	await_if_enabled,
};
