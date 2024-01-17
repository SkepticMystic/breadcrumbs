import HierarchySettings from "src/components/settings/HierarchySettings.svelte";
import type BreadcrumbsPlugin from "src/main";

export const _add_settings_hierarchies = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new HierarchySettings({
		target: containerEl,
		props: { plugin },
	});
};
