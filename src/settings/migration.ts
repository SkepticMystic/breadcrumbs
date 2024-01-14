import type { Hierarchy } from "src/interfaces/hierarchies";
import type BreadcrumbsPlugin from "src/main";
import { blank_hierarchy } from "src/utils/hierarchies";

export const migrate_old_settings = async (plugin: BreadcrumbsPlugin) => {
	const { settings } = plugin;

	// Hierarchies used to just be the Record<Direction, string[]>, but now that's wrapped in an object
	if (
		settings.hierarchies.at(0) &&
		settings.hierarchies.at(0)!.dirs === undefined
	) {
		// We can also handle the move of implied_relationships here
		const old_settings = //@ts-ignore
			settings.impliedRelations as {
				siblingIdentity: boolean;
				sameParentIsSibling: boolean;
				siblingsSiblingIsSibling: boolean;
				siblingsParentIsParent: boolean;
				parentsSiblingsIsParents: boolean;
				cousinsIsSibling: boolean;
			};

		const implied_relationships: Hierarchy["implied_relationships"] = {
			...blank_hierarchy().implied_relationships,

			self_is_sibling: old_settings.siblingIdentity,
			parents_sibling_is_parent: old_settings.parentsSiblingsIsParents,
			cousing_is_sibling: old_settings.cousinsIsSibling,
			same_parent_is_sibling: old_settings.sameParentIsSibling,
			same_sibling_is_sibling: old_settings.siblingsSiblingIsSibling,
			siblings_parent_is_parent: old_settings.siblingsParentIsParent,
		};

		plugin.settings.hierarchies = settings.hierarchies.map((hierarchy) => ({
			implied_relationships,
			dirs: hierarchy as unknown as Hierarchy["dirs"],
		}));

		await plugin.saveSettings();
	}
};
