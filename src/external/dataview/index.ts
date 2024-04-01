import {
	getAPI as get_api,
	isPluginEnabled as is_enabled,
} from "obsidian-dataview";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";

const await_if_enabled = (plugin: BreadcrumbsPlugin) =>
	new Promise<void>((resolve) => {
		if (is_enabled(plugin.app)) {
			if (get_api(plugin.app)?.index.initialized) {
				log.debug("dataview > already initialized");
				resolve();
			}

			plugin.registerEvent(
				plugin.app.metadataCache.on(
					//@ts-ignore: It's there if dataview is enabled
					"dataview:index-ready",
					() => {
						log.debug("dataview > ready");
						resolve();
					},
				),
			);
		} else {
			log.debug("dataview > not enabled");
			resolve();
		}
	});

export const dataview_plugin = {
	get_api,
	is_enabled,
	await_if_enabled,
};
