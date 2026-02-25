import { DateTime } from "luxon";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { Paths } from "src/utils/paths";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import { log } from "src/logger";
import { Replace, ReplaceAll } from "lucide-svelte";

// TODO: Option to point up to month, (and for month to point up to year?)

export const _add_explicit_edges_date_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const date_note_settings = plugin.settings.explicit_edge_sources.date_note;
	if (!date_note_settings.enabled) {
		return results;
	} else if (
		!plugin.settings.edge_fields.find(
			(field) => field.label === date_note_settings.default_field,
		)
	) {
		results.errors.push({
			code: "invalid_setting_value",
			path: "explicit_edge_sources.date_note.default_field",
			message: `The default Date Note field "${date_note_settings.default_field}" is not a valid Breadcrumbs Edge field`,
		});

		return results;
	}


	type DateNoteType = "day" | "week" | "month" | "quarter" | "year";
	interface DateNote {
		ext: string;
		path: string;
		folder: string;
		basename: string;
		date: DateTime;
		type: DateNoteType;
	}

	const date_notes: DateNote[] = [];

	// Basically just converting the two all_files into a common format of their basic fields...
	// Maybe generalise this?

	function detectNoteType(basename: string, settings: any): DateNoteType {
		// You may want to make these formats configurable in settings
		if (DateTime.fromFormat(basename, settings.date_format).isValid) return "day";
		if (DateTime.fromFormat(basename, "kkkk-'W'WW").isValid) return "week";
		if (DateTime.fromFormat(basename, "yyyy-MM").isValid) return "month";
		if (DateTime.fromFormat(basename, "yyyy-'Q'q").isValid) return "quarter";
		if (DateTime.fromFormat(basename, "yyyy").isValid) return "year";
		return "day";
	}

	all_files.obsidian?.forEach(({ file }) => {
		const type = detectNoteType(file.basename, date_note_settings);
		let date: DateTime;
		switch (type) {
			case "week":
				date = DateTime.fromFormat(file.basename, "kkkk-'W'WW");
				break;
			case "month":
				date = DateTime.fromFormat(file.basename, "yyyy-MM");
				break;
			case "quarter":
				date = DateTime.fromFormat(file.basename, "yyyy-'Q'q");
				break;
			case "year":
				date = DateTime.fromFormat(file.basename, "yyyy");
				break;
			default:
				date = DateTime.fromFormat(file.basename, date_note_settings.date_format);
		}
		if (!date.isValid) return;
		date_notes.push({
			date,
			path: file.path,
			ext: file.extension,
			basename: file.basename,
			folder: file.parent?.path ?? "",
			type,
		});
	});


	all_files.dataview?.forEach(({ file }) => {
		const type = detectNoteType(file.name, date_note_settings);
		let date: DateTime;
		switch (type) {
			case "week":
				date = DateTime.fromFormat(file.name, "kkkk-'W'WW");
				break;
			case "month":
				date = DateTime.fromFormat(file.name, "yyyy-MM");
				break;
			case "quarter":
				date = DateTime.fromFormat(file.name, "yyyy-'Q'q");
				break;
			case "year":
				date = DateTime.fromFormat(file.name, "yyyy");
				break;
			default:
				date = DateTime.fromFormat(file.name, date_note_settings.date_format);
		}
		if (!date.isValid) return;
		date_notes.push({
			date,
			ext: file.ext,
			path: file.path,
			folder: file.folder,
			basename: file.name,
			type,
		});
	});


	date_notes
		.sort((a, b) => a.date.toMillis() - b.date.toMillis())
		.forEach((date_note, i, arr) => {
			// Prev/Next logic for all types
			const prev = arr[i - 1];
			const next = arr[i + 1];

			// Prev edge
			if (prev && prev.type === date_note.type) {
				const prev_file = plugin.app.vault.getFileByPath(prev.path);
				if (!prev_file) {
					results.nodes.push(new GCNodeData(prev.path, [], false, false, false));
				}
				results.edges.push(
					new GCEdgeData(
						date_note.path,
						prev.path,
						"prev",
						date_note.type + "_note",
					),
				);
			}

			// Next edge
			if (next && next.type === date_note.type) {
				const next_file = plugin.app.vault.getFileByPath(next.path);
				if (!next_file) {
					results.nodes.push(new GCNodeData(next.path, [], false, false, false));
				}
				results.edges.push(
					new GCEdgeData(
						date_note.path,
						next.path,
						"next",
						date_note.type + "_note",
					),
				);
			}

			// For day notes, also link to week, month, quarter, year, and yesterday/tomorrow
			if (date_note.type === "day") {
				// ...existing code for day notes...
				// (kept as above)
				const yesterday = date_note.date.minus({ days: 1 });
				const tomorrow = date_note.date.plus({ days: 1 });
				const yesterday_note = arr.find(
					n => n.type === "day" && n.date.hasSame(yesterday, "day")
				);
				const tomorrow_note = arr.find(
					n => n.type === "day" && n.date.hasSame(tomorrow, "day")
				);
				if (yesterday_note) {
					results.edges.push(
						new GCEdgeData(
							date_note.path,
							yesterday_note.path,
							"yesterday",
							"day_note",
						),
					);
				}
				if (tomorrow_note) {
					results.edges.push(
						new GCEdgeData(
							date_note.path,
							tomorrow_note.path,
							"tomorrow",
							"day_note",
						),
					);
				}

				// Week, month, quarter, year containers
				const weekStr = date_note.date.toFormat("kkkk-'W'WW");
				const monthStr = date_note.date.toFormat("yyyy-MM");
				const quarterStr = date_note.date.toFormat("yyyy-'Q'q");
				const yearStr = date_note.date.toFormat("yyyy");

				const week_note = arr.find(n => n.type === "week" && n.basename === weekStr);
				const month_note = arr.find(n => n.type === "month" && n.basename === monthStr);
				const quarter_note = arr.find(n => n.type === "quarter" && n.basename === quarterStr);
				const year_note = arr.find(n => n.type === "year" && n.basename === yearStr);

				if (week_note) {
					results.edges.push(
						new GCEdgeData(
							date_note.path,
							week_note.path,
							"week",
							"week_note",
						),
					);
				}
				if (month_note) {
					results.edges.push(
						new GCEdgeData(
							date_note.path,
							month_note.path,
							"month",
							"month_note",
						),
					);
				}
				if (quarter_note) {
					results.edges.push(
						new GCEdgeData(
							date_note.path,
							quarter_note.path,
							"quarter",
							"quarter_note",
						),
					);
				}
				if (year_note) {
					results.edges.push(
						new GCEdgeData(
							date_note.path,
							year_note.path,
							"year",
							"year_note",
						),
					);
				}
			}

			// For week, month, quarter, year notes, link to contained notes and prev/next
			const typeToUnit = {
				week: "week",
				month: "month",
				quarter: "quarter",
				year: "year"
			};
			if (["week", "month", "quarter", "year"].includes(date_note.type)) {
				// Prev/next already handled above

				// Find contained notes
				// Days in this period
				const contained_days = arr.filter(n => n.type === "day" && n.date.hasSame(date_note.date, typeToUnit[date_note.type as keyof typeof typeToUnit] as import("luxon").DateTimeUnit));
				contained_days.forEach(day => {
					results.edges.push(
						new GCEdgeData(
							date_note.path,
							day.path,
							"day",
							"day_note",
						),
					);
				});

				// Months in this period (for week, quarter, year)
				if (date_note.type !== "month") {
					const contained_months = arr.filter(n => n.type === "month" && n.date.hasSame(date_note.date, typeToUnit[date_note.type as keyof typeof typeToUnit] as import("luxon").DateTimeUnit));
					contained_months.forEach(month => {
						results.edges.push(
							new GCEdgeData(
								date_note.path,
								month.path,
								"month",
								"month_note",
							),
						);
					});
				}

				// Quarters in this period (for year)
				if (date_note.type === "year") {
					const contained_quarters = arr.filter(n => n.type === "quarter" && n.date.hasSame(date_note.date, "year"));
					contained_quarters.forEach(quarter => {
						results.edges.push(
							new GCEdgeData(
								date_note.path,
								quarter.path,
								"quarter",
								"quarter_note",
							),
						);
					});
				}

				// Years in this period (for quarter, month, week: not applicable)
				// But for week/month/quarter, link to the containing year
				if (["week", "month", "quarter"].includes(date_note.type)) {
					const yearStr = date_note.date.toFormat("yyyy");
					const year_note = arr.find(n => n.type === "year" && n.basename === yearStr);
					if (year_note) {
						results.edges.push(
							new GCEdgeData(
								date_note.path,
								year_note.path,
								"year",
								"year_note",
							),
						);
					}
				}
			}
		});

	return results;
};
