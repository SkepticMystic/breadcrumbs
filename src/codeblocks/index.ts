import type { MarkdownPostProcessorContext } from "obsidian";
import { DIRECTIONS, type Direction } from "src/const/hierarchies";
import type { ICodeblock } from "src/interfaces/codeblocks";
import type { BreadcrumbsError } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { active_file_store } from "src/stores/active_file";
import { get_all_hierarchy_fields } from "src/utils/hierarchies";
import { get } from "svelte/store";
import CodeblockTree from "../components/codeblocks/CodeblockTree.svelte";
import { dataview_plugin } from "src/external/dataview";
import type { IDataview } from "src/external/dataview/interfaces";
import { EDGE_SORT_FIELDS } from "src/const/graph";

const FIELDS = [
	"type",
	"dir",
	"title",
	"fields",
	"depth",
	"flat",
	"dataview-from",
	"content",
	"sort",
] as const;

const parse_source = (plugin: BreadcrumbsPlugin, source: string) => {
	const hierarchy_fields = get_all_hierarchy_fields(
		plugin.settings.hierarchies,
	);

	const lines = source.split("\n");

	const errors: BreadcrumbsError[] = [];
	const parsed: Partial<ICodeblock["Options"]> = {};

	lines.forEach((line) => {
		const [key, ...rest] = line.split(":") as [
			key: (typeof FIELDS)[number],
			...rest: string[],
		];
		const value = rest.join(":").trim();
		if (!key || !value) return;

		// By the time we parse the value in the switch statement,
		//   we know it's non-empty
		switch (key) {
			case "type": {
				return (parsed.type = value as ICodeblock["Options"]["type"]);
			}

			case "dir": {
				if (!DIRECTIONS.includes(value as Direction)) {
					return errors.push({
						code: "invalid_field_value",
						message: `Invalid dir: ${value}`,
						path: key,
					});
				}

				return (parsed.dir = value as Direction);
			}

			case "title": {
				return (parsed.title = value);
			}

			case "fields": {
				return (parsed.fields = value
					.split(",")
					.map((field) => field.trim())
					.filter((field) => {
						if (!hierarchy_fields.includes(field)) {
							errors.push({
								code: "invalid_field_value",
								message: `Invalid field: ${field}. Must be one of your hierarchy fields.`,
								path: key,
							});
							return false;
						} else return true;
					}));
			}

			case "depth": {
				// depth: -2
				// depth: 1-2
				// depth: 1-

				const bounds = value.split("-").map((num) => parseInt(num));

				const [min, max] = [
					Number.isNaN(bounds[0]) ? 0 : bounds[0],
					Number.isNaN(bounds[1]) ? Infinity : bounds[1],
				];

				if (min > max) {
					errors.push({
						code: "invalid_field_value",
						message: `Invalid depth: ${value}. Min is greater than max.`,
						path: key,
					});

					return (parsed.depth = [0, Infinity]);
				}

				return (parsed.depth = [min, max] as [number, number]);
			}

			case "flat": {
				return (parsed.flat = value === "true");
			}

			//@ts-ignore: TODO: Remove once everyone has migrated
			case "from":
			case "dataview-from": {
				//@ts-ignore: TODO: Remove once everyone has migrated
				if (key === "from") {
					console.warn(
						"The 'from' field in codeblocks is deprecated in favour of 'dataview-from' instead.",
					);
				}

				try {
					const pages = dataview_plugin
						.get_api(plugin.app)
						?.pages(value) as undefined | IDataview.Page[];

					return (parsed.dataview_from_paths = pages?.map(
						(page) => page.file.path,
					));
				} catch (error) {
					return errors.push({
						code: "invalid_field_value",
						message: `Invalid dataview-from: ${value}. Must be a valid dataview query.`,
						path: key,
					});
				}
			}

			case "content": {
				if (value !== "open" && value !== "closed") {
					return errors.push({
						code: "invalid_field_value",
						message: `Invalid content: ${value}. Valid options: open, closed`,
						path: key,
					});
				}

				return (parsed.content = value);
			}

			case "sort": {
				let [field, order] = value.split(" ");

				if (!EDGE_SORT_FIELDS.includes(field as any)) {
					return errors.push({
						code: "invalid_field_value",
						message: `Invalid sort field: ${field}. Valid options: ${EDGE_SORT_FIELDS.join(", ")}`,
						path: key,
					});
				}

				if (order !== "asc" && order !== "desc") {
					return errors.push({
						code: "invalid_field_value",
						message: `Invalid sort order: ${order}. Valid options: asc, desc`,
						path: key,
					});
				}

				parsed.sort = {
					field: field as any,
					order: order === "asc" ? 1 : -1,
				};

				return;
			}

			default: {
				errors.push({
					code: "invalid_field_value",
					message: `Invalid codeblock field: ${key}. Valid options: ${FIELDS.join(", ")}`,
					path: key,
				});
			}
		}
	});

	return { parsed, errors };
};

const get_callback = (plugin: BreadcrumbsPlugin) => {
	return (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
	) => {
		const active_file = get(active_file_store);
		if (!active_file) return;

		const { parsed, errors } = parse_source(plugin, source);
		if (errors.length) console.log("codeblock errors", errors);

		const options: ICodeblock["Options"] = Object.assign(
			{
				type: "tree",
				dir: "down",
				depth: [0, Infinity],
				flat: false,
				sort: {
					field: "default",
					order: -1,
				},
			},
			parsed,
		);
		console.log("resolved codeblock options", options);

		new CodeblockTree({
			target: el,
			props: {
				plugin,
				options,
				errors,
			},
		});
	};
};

export const Codeblocks = {
	FIELDS,
	get_callback,
};
