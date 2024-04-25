import { parseYaml } from "obsidian";
import type { CodeblockMDRC } from "src/codeblocks/MDRC";
import { SIMPLE_EDGE_SORT_FIELDS } from "src/const/graph";
import { dataview_plugin } from "src/external/dataview";
import type { IDataview } from "src/external/dataview/interfaces";
import { EDGE_ATTRIBUTES } from "src/graph/MyMultiGraph";
import type { BreadcrumbsError } from "src/interfaces/graph";
import type { EdgeField, EdgeFieldGroup } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { remove_duplicates } from "src/utils/arrays";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { Mermaid } from "src/utils/mermaid";
import { Paths } from "src/utils/paths";
import { quote_join } from "src/utils/strings";
import { z } from "zod";

const FIELDS = [
	"type",
	"title",
	"start-note",
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

type CodeblockInputData = {
	edge_fields: EdgeField[];
	field_groups: EdgeFieldGroup[];
};

const zod_invalid_enum_msg = (options: any[]) =>
	`Invalid enum value. Expected: ${quote_join(options, "'", " | ")}`;

const zod_not_array_msg = (options: any[] | readonly any[]) =>
	`Invalid type. Expected a list/array. Example: [${options.slice(0, 2).join(", ")}]`;

const dynamic_enum_schema = (options: string[]) =>
	z.string().superRefine((f, ctx) => {
		if (options.includes(f)) {
			return true;
		} else {
			ctx.addIssue({
				options,
				received: f,
				code: "invalid_enum_value",
			});

			return false;
		}
	});

const dynamic_enum_array_schema = (options: string[]) =>
	z.array(dynamic_enum_schema(options), {
		invalid_type_error: zod_not_array_msg(options),
	});

const codeblock_schema = (data: CodeblockInputData) => {
	const field_labels = data.edge_fields.map((f) => f.label);
	const group_labels = data.field_groups.map((f) => f.label);

	return z
		.object({
			flat: z
				.boolean({ message: zod_invalid_enum_msg([true, false]) })
				.default(false),
			collapse: z
				.boolean({ message: zod_invalid_enum_msg([true, false]) })
				.default(false),
			"merge-fields": z
				.boolean({ message: zod_invalid_enum_msg([true, false]) })
				.default(false),

			title: z.string().optional(),
			"start-note": z.string().optional(),
			"dataview-from": z.string().optional(),

			content: z.enum(["open", "closed"]).optional(),
			type: z.enum(["tree", "mermaid"]).default("tree"),
			"mermaid-renderer": z.enum(Mermaid.RENDERERS).optional(),
			"mermaid-direction": z.enum(Mermaid.DIRECTIONS).optional(),

			"show-attributes": z
				.array(z.enum(EDGE_ATTRIBUTES), {
					invalid_type_error: zod_not_array_msg(EDGE_ATTRIBUTES),
				})
				.optional(),

			fields: dynamic_enum_array_schema(field_labels).optional(),
			"field-groups": dynamic_enum_array_schema(group_labels).optional(),

			depth: z
				.array(z.number().min(0), {
					invalid_type_error:
						"Invalid type. Expected a list/array of one or two numbers. Example: [0] or [0, 3]",
				})
				.min(
					1,
					"Invalid length. At least one element is required. Example: [0] or [0, 3]",
				)
				.max(
					2,
					"Invalid length. Maximum of two elements allowed. Example: [0] or [0, 3]",
				)
				.transform((v) => {
					if (v.length === 1) return [v[0], Infinity];
					else return v;
				})
				.refine((v) => v[0] <= v[1], {
					message: "Min is greater than max",
				})
				.default([0, Infinity]),

			sort: z
				.preprocess(
					(v) => {
						if (typeof v === "string") {
							const [field, order] = v.split(" ");

							return { field, order: order ?? "asc" };
						} else {
							return v;
						}
					},
					z.object({
						// TODO: Use a custom zod schema to retain string template literals here
						// https://github.com/colinhacks/zod?tab=readme-ov-file#custom-schemas
						field: dynamic_enum_schema([
							...SIMPLE_EDGE_SORT_FIELDS,
							...data.edge_fields.map(
								(f) => `neighbour-field:${f.label}`,
							),
						]),

						order: z
							.union([
								z.enum(["asc", "desc"]),
								// Something very weird happening...
								// If a note has two codeblocks, the one that gets rendered first seems to override config in the other?
								// So when the `sort` field of the second comes in for parsing,
								// It's already been transformed, and so sort.order is a number, not a string...
								z.literal(1),
								z.literal(-1),
							])
							.transform((v) =>
								v === "asc" ? 1 : v === "desc" ? -1 : v,
							),
					}),
				)
				.default({
					order: 1,
					field: "basename",
				}),
		})
		.passthrough()
		.default({})

		.transform((options) => {
			// If field-groups are given, resolve them to their fields
			// adding them to the fields array
			if (options["field-groups"]) {
				const field_labels = resolve_field_group_labels(
					data.field_groups,
					options["field-groups"],
				);

				if (options.fields) {
					options.fields = remove_duplicates(
						options.fields.concat(field_labels),
					);
				} else {
					options.fields = field_labels;
				}
			}

			return options;
		});
};

export type ICodeblock = {
	/** Once resolved, the non-optional fields WILL be there, with a default if missing */
	Options: z.infer<ReturnType<typeof codeblock_schema>> & {
		"dataview-from-paths"?: string[];
	};
};

const parse_source = (
	source: string,
	data: CodeblockInputData,
): {
	errors: BreadcrumbsError[];
	parsed: z.infer<ReturnType<typeof codeblock_schema>> | null;
} => {
	const errors: BreadcrumbsError[] = [];

	let yaml: any;
	try {
		yaml = parseYaml(source);

		log.debug("Codeblock > parsed_yaml >", yaml);
	} catch (error) {
		log.error("Codeblock > parse_source > parseYaml.error", error);

		errors.push({
			path: "yaml",
			code: "invalid_yaml",
			message: "Invalid YAML. Check the console for more information.",
		});

		return { parsed: null, errors };
	}

	// NOTE: An empty codeblock is valid, but yaml sees it as null
	const parsed = codeblock_schema(data).safeParse(yaml ?? {});
	if (!parsed.success) {
		errors.push(
			...parsed.error.issues.map((issue) => ({
				message: issue.message,
				path: issue.path.join("."),
				code: "invalid_field_value" as const,
			})),
		);

		return {
			errors,
			parsed: null,
		};
	}

	const invalid_fields = Object.keys(parsed.data).filter(
		(key) => !FIELDS.includes(key as any),
	);

	if (invalid_fields.length) {
		errors.push({
			path: "yaml",
			code: "invalid_yaml",
			message: `Unknown field(s) - ${quote_join(invalid_fields)}. Options: ${quote_join(FIELDS, "'", " | ")}`,
		});
	}

	return { parsed: parsed.data, errors };
};

/** Refine the results of parsing, with the plugin now available in context */
const postprocess_options = (
	/** Where the codeblock is */
	source_path: string,
	parsed: ICodeblock["Options"],
	errors: BreadcrumbsError[],
	plugin: BreadcrumbsPlugin,
) => {
	let file_path = source_path;

	if (parsed["start-note"]) {
		const normalised = Paths.normalise(
			Paths.ensure_ext(parsed["start-note"], "md"),
		);

		const start_file = plugin.app.metadataCache.getFirstLinkpathDest(
			normalised,
			file_path,
		);

		if (start_file) {
			file_path = start_file.path;
		} else {
			errors.push({
				path: "start-note",
				code: "invalid_field_value",
				message: `Invalid 'start-note', could not find: "${normalised}"`,
			});
		}
	}

	if (parsed["dataview-from"]) {
		try {
			const pages = dataview_plugin
				.get_api(plugin.app)
				?.pages(parsed["dataview-from"]) as
				| undefined
				| IDataview.Page[];

			parsed["dataview-from-paths"] = pages?.map(
				(page) => page.file.path,
			);
		} catch (error) {
			errors.push({
				path: "dataview-from",
				code: "invalid_field_value",
				message: `Invalid dataview-from: "${parsed["dataview-from"]}". You can also use \`app.plugins.plugins.dataview.api.pages\` to test your query.`,
			});
		}
	}

	return { options: parsed, file_path };
};

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
	postprocess_options,

	register,
	unregister,
	update_all,
};
