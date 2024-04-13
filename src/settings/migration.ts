import { Notice, TFile } from "obsidian";
import { ListIndex } from "src/commands/list_index";
import { META_ALIAS } from "src/const/metadata_fields";
import { DEFAULT_SETTINGS } from "src/const/settings";
import {
	OLD_DIRECTIONS,
	type BreadcrumbsSettings,
	type BreadcrumbsSettingsWithDirection,
	type OLD_BREADCRUMBS_SETTINGS,
	type OLD_DIRECTION,
	type OLD_HIERARCHY,
} from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { Paths } from "src/utils/paths";

const get_opposite_direction = (dir: OLD_DIRECTION): OLD_DIRECTION => {
	switch (dir) {
		case "up":
			return "down";
		case "down":
			return "up";
		case "same":
			return "same";
		case "next":
			return "prev";
		case "prev":
			return "next";
	}
};

// TODO: Loooots of migrating to do here
export const migrate_old_settings = async (plugin: BreadcrumbsPlugin) => {
	const old = plugin.settings as (
		| BreadcrumbsSettings
		| BreadcrumbsSettingsWithDirection
	) &
		OLD_BREADCRUMBS_SETTINGS;

	// SECTION: Hierarchies
	// NOTE: Keep the intermediate type, not just old. We convert this to the latest type next
	/// Hierarchies used to just be the Record<Direction, string[]>, but it's now wrapped in an object
	/// We can also handle the move of implied_relationships here
	if (old.userHiers && old.impliedRelations) {
		const implied_relationships: OLD_HIERARCHY["implied_relationships"] = {
			opposite_direction: {
				rounds: 1,
			},
			self_is_sibling: {
				rounds: Number(old.impliedRelations.siblingIdentity),
			},
			cousin_is_sibling: {
				rounds: Number(old.impliedRelations.cousinsIsSibling),
			},
			same_parent_is_sibling: {
				rounds: Number(old.impliedRelations.sameParentIsSibling),
			},
			same_sibling_is_sibling: {
				rounds: Number(old.impliedRelations.siblingsSiblingIsSibling),
			},
			siblings_parent_is_parent: {
				rounds: Number(old.impliedRelations.siblingsParentIsParent),
			},
			parents_sibling_is_parent: {
				rounds: Number(old.impliedRelations.parentsSiblingsIsParents),
			},
		};

		// @ts-ignore
		plugin.settings.hierarchies = old.userHiers.map((hierarchy) => ({
			dirs: hierarchy,
			implied_relationships,
		}));

		delete old.userHiers;
		delete old.impliedRelations;
	}

	// Transform hierarchies into edge_fields
	// @ts-ignore
	if (plugin.settings.hierarchies) {
		OLD_DIRECTIONS.forEach((dir) => {
			plugin.settings.edge_field_groups.push({
				group: `All ${dir}s`,
				//@ts-ignore
				fields: (<OLD_HIERARCHY[]>plugin.settings.hierarchies)
					.flatMap((hier) => hier.dirs[dir])
					.filter(Boolean),
			});
		});

		// @ts-ignore
		(<OLD_HIERARCHY[]>plugin.settings.hierarchies).forEach(
			(hier, hier_i) => {
				plugin.settings.edge_field_groups.push({
					group: `Hierarchy ${hier_i + 1}`,
					fields: Object.values(hier.dirs)
						.flatMap((fields) => fields)
						.filter(Boolean),
				});

				Object.values(hier.dirs).forEach((fields) => {
					fields.forEach((field) =>
						plugin.settings.edge_fields.push({ label: field }),
					);
				});

				Object.entries(hier.implied_relationships).forEach(
					([rel, { rounds }]) => {
						if (!rounds) return;

						const fields = {
							up: hier.dirs.up[0],
							same: hier.dirs.same[0],
							down: hier.dirs.down[0],
							next: hier.dirs.next[0],
							prev: hier.dirs.prev[0],
						};

						switch (rel) {
							case "self_is_sibling": {
								if (!fields.same) return;

								plugin.settings.implied_relations.transitive.push(
									{
										rounds,
										// TODO(NODIR): Handle empty chain
										chain: [],
										close_reversed: false,
										close_field: fields.same,
									},
								);
							}

							case "opposite_direction": {
								OLD_DIRECTIONS.forEach((dir) => {
									const field = fields[dir];
									const close_field =
										fields[get_opposite_direction(dir)];
									if (!field || !close_field) return;

									plugin.settings.implied_relations.transitive.push(
										{
											rounds,
											close_field,
											chain: [{ field }],
											close_reversed: true,
										},
									);
								});
								break;
							}

							case "cousin_is_sibling": {
								if (!fields.up || !fields.same || !fields.down)
									return;

								plugin.settings.implied_relations.transitive.push(
									{
										rounds,
										chain: [
											{ field: fields.up },
											{ field: fields.same },
											{ field: fields.down },
										],
										close_reversed: false,
										close_field: fields.same,
									},
								);
							}

							case "same_parent_is_sibling": {
								if (!fields.up || !fields.down || !fields.down)
									return;

								plugin.settings.implied_relations.transitive.push(
									{
										rounds,
										chain: [
											{ field: fields.up },
											{ field: fields.down },
										],
										close_reversed: false,
										close_field: fields.same,
									},
								);
							}

							case "same_sibling_is_sibling": {
								if (!fields.same) return;

								plugin.settings.implied_relations.transitive.push(
									{
										rounds,
										chain: [
											{ field: fields.same },
											{ field: fields.same },
										],
										close_reversed: false,
										close_field: fields.same,
									},
								);
							}

							case "siblings_parent_is_parent": {
								if (!fields.up || !fields.same) return;

								plugin.settings.implied_relations.transitive.push(
									{
										rounds,
										chain: [
											{ field: fields.same },
											{ field: fields.up },
										],
										close_reversed: false,
										close_field: fields.up,
									},
								);
							}

							case "parents_sibling_is_parent": {
								if (!fields.up || !fields.same) return;

								plugin.settings.implied_relations.transitive.push(
									{
										rounds,
										chain: [
											{ field: fields.up },
											{ field: fields.same },
										],
										close_reversed: false,
										close_field: fields.up,
									},
								);
							}
						}
					},
				);
			},
		);

		// @ts-ignore
		delete plugin.settings.hierarchies;
	}
	// !SECTION

	// SECTION: Explicit edge sources
	/// Tag note
	if (old.tagNoteField !== undefined) {
		plugin.settings.explicit_edge_sources.tag_note.default_field =
			old.tagNoteField;

		delete old.tagNoteField;
	}

	/// List note
	if (
		old.hierarchyNotes !== undefined &&
		old.hierarchyNoteIsParent !== undefined &&
		old.HNUpField !== undefined
	) {
		if (old.hierarchyNotes.length > 0) {
			const msg = `DEPRECATED: The central Hierarchy Notes setting is deprecated in favour of the "${META_ALIAS["list-note-field"]}" field in each hierarchy note. Breadcrumbs has added the field to each of your hierarchy notes, so no action is required.`;
			log.warn(msg);
			new Notice(msg);

			await Promise.all(
				old.hierarchyNotes.map((path) => {
					const file = plugin.app.vault.getAbstractFileByPath(
						Paths.ensure_ext(path, "md"),
					);
					if (!file || !(file instanceof TFile)) return;

					return plugin.app.fileManager.processFrontMatter(
						file,
						(frontmatter) => {
							frontmatter[META_ALIAS["list-note-field"]] ??=
								old.HNUpField;
						},
					);
				}),
			);
		}

		delete old.HNUpField;
		delete old.hierarchyNotes;
		delete old.hierarchyNoteIsParent;
	}

	/// Dendron
	if (
		old.addDendronNotes !== undefined &&
		old.dendronNoteField !== undefined &&
		old.trimDendronNotes !== undefined &&
		old.dendronNoteDelimiter !== undefined
	) {
		plugin.settings.explicit_edge_sources.dendron_note = {
			enabled: old.addDendronNotes,
			default_field: old.dendronNoteField,
			delimiter: old.dendronNoteDelimiter,
			display_trimmed: old.trimDendronNotes,
		};

		delete old.addDendronNotes;
		delete old.dendronNoteField;
		delete old.trimDendronNotes;
		delete old.dendronNoteDelimiter;
	}

	/// Date notes
	if (
		old.addDateNotes !== undefined &&
		old.dateNoteField !== undefined &&
		old.dateNoteFormat !== undefined
	) {
		plugin.settings.explicit_edge_sources.date_note = {
			enabled: old.addDateNotes,
			default_field: old.dateNoteField,
			date_format: old.dateNoteFormat,
			stretch_to_existing:
				DEFAULT_SETTINGS.explicit_edge_sources.date_note
					.stretch_to_existing,
		};

		delete old.addDateNotes;
		delete old.dateNoteField;
		delete old.dateNoteFormat;
	}
	// !SECTION

	// SECTION: Views
	/// Page
	if (old.respectReadableLineLength !== undefined) {
		plugin.settings.views.page.all.readable_line_width =
			old.respectReadableLineLength;

		delete old.respectReadableLineLength;
	}

	//// Trail
	if (old.showBCs !== undefined) {
		plugin.settings.views.page.trail.enabled = old.showBCs;
		delete old.showBCs;
	}

	if (old.showGrid !== undefined) {
		plugin.settings.views.page.trail.format = old.showGrid
			? "grid"
			: "path";

		delete old.showGrid;
	}

	if (old.gridDefaultDepth !== undefined) {
		plugin.settings.views.page.trail.default_depth = old.gridDefaultDepth;
		delete old.gridDefaultDepth;
	}

	if (old.noPathMessage !== undefined) {
		plugin.settings.views.page.trail.no_path_message = old.noPathMessage;
		delete old.noPathMessage;
	}

	//// Prev/Next
	if (old.showPrevNext !== undefined) {
		plugin.settings.views.page.prev_next.enabled = old.showPrevNext;

		delete old.showPrevNext;
	}

	//// Codeblocks
	// @ts-ignore: This previously wasn't "considered" a view
	if (plugin.settings.codeblocks !== undefined) {
		// @ts-ignore: This previously wasn't "considered" a view
		plugin.settings.views.codeblocks = plugin.settings.codeblocks;

		// @ts-ignore: This previously wasn't "considered" a view
		delete plugin.settings.codeblocks;
	}
	// !SECTION

	// SECTION: Commands
	/// Rebuild Graph
	if (
		old.showRefreshNotice !== undefined &&
		old.refreshOnNoteSave !== undefined &&
		old.refreshOnNoteChange !== undefined
	) {
		plugin.settings.commands.rebuild_graph.notify = old.showRefreshNotice;

		plugin.settings.commands.rebuild_graph.trigger = {
			note_save: old.refreshOnNoteSave,
			layout_change: old.refreshOnNoteChange,
		};

		delete old.showRefreshNotice;
		delete old.refreshOnNoteSave;
		delete old.refreshOnNoteChange;
	}

	/// List Index
	if (
		old.wikilinkIndex !== undefined &&
		old.aliasesInIndex !== undefined &&
		old.createIndexIndent !== undefined
	) {
		plugin.settings.commands.list_index.default_options = {
			...plugin.settings.commands.list_index.default_options,

			indent: old.createIndexIndent,
			link_kind: old.wikilinkIndex ? "wiki" : "none",
			show_node_options: {
				...ListIndex.DEFAULT_OPTIONS.show_node_options,
				alias: old.aliasesInIndex,
			},
		};

		delete old.wikilinkIndex;
		delete old.aliasesInIndex;
		delete old.createIndexIndent;
	}

	/// Freeze implied edges
	if (old.writeBCsInline !== undefined) {
		plugin.settings.commands.freeze_implied_edges.default_options.destination =
			old.writeBCsInline ? "dataview-inline" : "frontmatter";

		delete old.writeBCsInline;
	}

	/// Thread
	if (old.threadingTemplate !== undefined) {
		plugin.settings.commands.thread.default_options.target_path_template =
			old.threadingTemplate;

		delete old.threadingTemplate;
	}

	if (old.threadUnderCursor !== undefined) {
		plugin.settings.commands.thread.default_options.destination =
			old.threadUnderCursor ? "dataview-inline" : "frontmatter";

		delete old.threadUnderCursor;
	}
	// !SECTION

	// SECTION: Suggestors
	/// Hierarchy Field
	if (old.enableRelationSuggestor !== undefined) {
		plugin.settings.suggestors.hierarchy_field.enabled =
			old.enableRelationSuggestor;

		delete old.enableRelationSuggestor;
	}

	if (old.relSuggestorTrigger !== undefined) {
		plugin.settings.suggestors.hierarchy_field.trigger =
			old.relSuggestorTrigger;

		delete old.relSuggestorTrigger;
	}
	// !SECTION

	await plugin.saveSettings();
};
