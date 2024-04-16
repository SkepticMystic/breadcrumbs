import type { CodeblockMDRC } from "src/codeblocks/MDRC";
import {
	COMPLEX_EDGE_SORT_FIELD_PREFIXES,
	SIMPLE_EDGE_SORT_FIELDS,
} from "src/const/graph";
import { dataview_plugin } from "src/external/dataview";
import type { IDataview } from "src/external/dataview/interfaces";
import { EDGE_ATTRIBUTES, type EdgeAttribute } from "src/graph/MyMultiGraph";
import type { ICodeblock } from "src/interfaces/codeblocks";
import type { BreadcrumbsError } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { remove_duplicates } from "src/utils/arrays";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { Mermaid } from "src/utils/mermaid";
import { quote_join, split_and_trim } from "src/utils/strings";

// TODO: parseYaml

const FIELDS = [
	"type",
	"title",
	"fields",
	"field-groups",
	"depth",
	"flat",
	"collapse",
	"merge-fields",
	"dataview-from",
	"content",
	"sort",
	"field-prefix",
	"show-attributes",
	"mermaid-direction",
	"mermaid-renderer",
] as const;

const TYPES: ICodeblock["Options"]["type"][] = ["tree", "mermaid"];

const parse_source = (plugin: BreadcrumbsPlugin, source: string) => {
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
				if (!TYPES.includes(value as ICodeblock["Options"]["type"])) {
					return errors.push({
						path: key,
						code: "invalid_field_value",
						message: `Invalid type: "${value}". Options: ${quote_join(TYPES)}`,
					});
				}

				return (parsed.type = value as ICodeblock["Options"]["type"]);
			}

			case "mermaid-direction": {
				if (
					!Mermaid.DIRECTIONS.includes(value as Mermaid["Direction"])
				) {
					return errors.push({
						path: key,
						code: "invalid_field_value",
						message: `Invalid mermaid-direction: "${value}". Options: ${quote_join(Mermaid.DIRECTIONS)}`,
					});
				}

				return (parsed.mermaid_direction =
					value as Mermaid["Direction"]);
			}

			case "title": {
				return (parsed.title = value);
			}

			//@ts-ignore: TODO: Remove once everyone has migrated
			case "dir":
			// @ts-ignore
			case "dirs": {
				return errors.push({
					path: key,
					code: "deprecated_field",
					message: `The '${key}' field is deprecated. Use 'fields' or 'field-groups' instead.`,
				});
			}

			case "fields": {
				const field_labels = plugin.settings.edge_fields.map(
					(field) => field.label,
				);

				return (parsed.fields = split_and_trim(value).filter(
					(field) => {
						if (!field_labels.includes(field)) {
							errors.push({
								path: key,
								code: "invalid_field_value",
								message: `Invalid field: "${field}". Options: ${quote_join(field_labels)}`,
							});
							return false;
						} else {
							return true;
						}
					},
				));
			}

			case "field-groups": {
				const group_labels = plugin.settings.edge_field_groups.map(
					(group) => group.label,
				);

				const values = split_and_trim(value).filter((group) => {
					// NOTE: resolve_field_group_labels handles values that aren't group labels just fine
					// 	but this lets us add an error message
					if (!group_labels.includes(group)) {
						errors.push({
							path: key,
							code: "invalid_field_value",
							message: `Invalid field-group: "${group}". Options: ${quote_join(group_labels)}`,
						});
						return false;
					} else {
						return true;
					}
				});

				const field_labels = resolve_field_group_labels(
					plugin.settings.edge_field_groups,
					values,
				);

				if (parsed.fields) {
					parsed.fields = remove_duplicates(
						parsed.fields.concat(field_labels),
					);
				} else {
					parsed.fields = field_labels;
				}

				return;
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
						path: key,
						code: "invalid_field_value",
						message: `Invalid depth: "${value}". Min is greater than max.`,
					});

					return (parsed.depth = [0, Infinity]);
				}

				return (parsed.depth = [min, max] as [number, number]);
			}

			case "flat": {
				return (parsed.flat = value === "true");
			}

			case "collapse": {
				return (parsed.collapse = value === "true");
			}

			case "merge-fields": {
				return (parsed.merge_fields = value === "true");
			}

			//@ts-ignore: TODO: Remove once everyone has migrated
			case "from":
			case "dataview-from": {
				//@ts-ignore: TODO: Remove once everyone has migrated
				if (key === "from") {
					errors.push({
						path: key,
						code: "deprecated_field",
						message: `The 'from' field is deprecated. Use 'dataview-from' instead.`,
					});
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
						path: key,
						code: "invalid_field_value",
						message: `Invalid dataview-from: "${value}". You can also use \`app.plugins.plugins.dataview.api.pages\` to test your query.`,
					});
				}
			}

			// TODO: Actually implement
			case "content": {
				if (value !== "open" && value !== "closed") {
					return errors.push({
						path: key,
						code: "invalid_field_value",
						message: `Invalid content: "${value}". Options: "open", "closed"`,
					});
				}

				return (parsed.content = value);
			}

			case "sort": {
				const [field, order] = value.split(" ");

				if (
					!SIMPLE_EDGE_SORT_FIELDS.includes(field as any) &&
					!COMPLEX_EDGE_SORT_FIELD_PREFIXES.some((f) =>
						field.startsWith(f + ":"),
					)
				) {
					return errors.push({
						path: key,
						code: "invalid_field_value",
						message: `Invalid sort-field: "${field}". Options: ${quote_join(SIMPLE_EDGE_SORT_FIELDS)}, or a complex field prefixed with: ${quote_join(COMPLEX_EDGE_SORT_FIELD_PREFIXES)}`,
					});
				}

				// TODO: At this point we know the field is simple or prefixed with a complex
				// 	but the _value_ of the complex field is not validated

				// If an order has been given, but isn't a option
				if (order && order !== "asc" && order !== "desc") {
					return errors.push({
						path: key,
						code: "invalid_field_value",
						message: `Invalid sort-order: "${order}". Options: "asc", "desc", or <blank>.`,
					});
				}

				parsed.sort = {
					field: field as any,
					order: order === "desc" ? -1 : 1,
				};

				return;
			}

			// TODO: Remove once everyone has migrated
			case "field-prefix": {
				errors.push({
					path: key,
					code: "deprecated_field",
					message: `The 'field-prefix' field is deprecated. Use 'show-attributes' instead.`,
				});

				return;
			}

			case "show-attributes": {
				return (parsed.show_attributes = split_and_trim(value).filter(
					(attr) => {
						if (!EDGE_ATTRIBUTES.includes(attr as any)) {
							errors.push({
								path: key,
								code: "invalid_field_value",
								message: `Invalid show-attributes: "${attr}". Options: ${quote_join(EDGE_ATTRIBUTES)}.`,
							});
							return false;
						} else {
							return true;
						}
					},
				) as EdgeAttribute[]);
			}

			case "mermaid-renderer": {
				if (!Mermaid.RENDERERS.includes(value as Mermaid["Renderer"])) {
					return errors.push({
						path: key,
						code: "invalid_field_value",
						message: `Invalid mermaid-renderer: "${value}". Options: ${quote_join(Mermaid.RENDERERS)}`,
					});
				}

				return (parsed.mermaid_renderer = value as Mermaid["Renderer"]);
			}

			default: {
				errors.push({
					path: key,
					code: "invalid_field_value",
					message: `Invalid codeblock field: "${key}". Options: ${quote_join(FIELDS)}`,
				});
			}
		}
	});

	return { parsed, errors };
};

const resolve_options = (
	parsed: ReturnType<typeof parse_source>["parsed"],
): ICodeblock["Options"] =>
	Object.assign(
		{
			type: "tree",
			depth: [0, Infinity],
			flat: false,
			sort: {
				field: "basename",
				order: 1,
			},
		} satisfies ICodeblock["Options"],
		parsed,
	);

const active_codeblocks: Map<string, CodeblockMDRC> = new Map();

const register = (codeBlock: CodeblockMDRC) => {
	active_codeblocks.set(codeBlock.id, codeBlock);
};

const unregister = (codeBlock: CodeblockMDRC) => {
	active_codeblocks.delete(codeBlock.id);
};

const update_all = () => {
	for (const codeBlock of active_codeblocks.values()) {
		void codeBlock.update();
	}
};

export const Codeblocks = {
	FIELDS,
	parse_source,
	resolve_options,
	register,
	unregister,
	update_all,
};
