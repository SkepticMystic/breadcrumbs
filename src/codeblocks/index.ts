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
type CodeblockField = (typeof FIELDS)[number];

type CodeblockInputData = {
	edge_fields: EdgeField[];
	field_groups: EdgeFieldGroup[];
};

const zod_not_string_msg = (field: CodeblockField, received: unknown) =>
	`Expected a string (text), but got: \`${received}\` (${typeof received}).
_Try wrapping the value in quotes._
**Example**: \`${field}: "${received}"\``;

const zod_invalid_enum_msg = (
	field: CodeblockField,
	options: any[] | readonly any[],
	received: unknown,
) =>
	`Expected one of the following options: ${quote_join(options, "`", ", or ")}, but got: \`${received}\`.
**Example**: \`${field}: ${options[0]}\``;

const zod_not_array_msg = (
	field: CodeblockField,
	options: any[] | readonly any[],
	received: unknown,
) =>
	`This field is now expected to be a YAML list (array), but got: \`${received}\` (${typeof received}).
_Try wrapping it in square brackets._
**Example**: \`${field}: [${options.slice(0, 2).join(", ")}]\`, or possibly: \`${field}: [${received}]\``;

const dynamic_enum_schema = (options: string[]) =>
	z.string().superRefine((f, ctx) => {
		if (options.includes(f)) {
			return true;
		} else {
			ctx.addIssue({
				options,
				received: f,
				code: "invalid_enum_value",
				message: zod_invalid_enum_msg(
					ctx.path.join(".") as CodeblockField,
					options,
					f,
				),
			});

			return false;
		}
	});

const BOOLEANS = [true, false] as const;

const dynamic_enum_array_schema = (
	field: CodeblockField,
	options: string[],
	received: unknown,
) =>
	z.array(dynamic_enum_schema(options), {
		invalid_type_error: zod_not_array_msg(field, options, received),
	});

const codeblock_schema = (
	input: Record<string, unknown>,
	data: CodeblockInputData,
) => {
	const field_labels = data.edge_fields.map((f) => f.label);
	const group_labels = data.field_groups.map((f) => f.label);

	return z
		.object({
			title: z
				.string({
					message: zod_not_string_msg(
						//
						"title",
						input["title"],
					),
				})
				.optional(),

			"start-note": z
				.string({
					message: zod_not_string_msg(
						"start-note",
						input["start-note"],
					),
				})
				.optional(),

			"dataview-from": z
				.string({
					message: zod_not_string_msg(
						"dataview-from",
						input["dataview-from"],
					),
				})
				.optional(),

			flat: z
				.boolean({
					message: zod_invalid_enum_msg(
						"flat",
						BOOLEANS,
						input["flat"],
					),
				})
				.default(false),

			collapse: z
				.boolean({
					message: zod_invalid_enum_msg(
						"collapse",
						BOOLEANS,
						input["collapse"],
					),
				})
				.default(false),

			"merge-fields": z
				.boolean({
					message: zod_invalid_enum_msg(
						"merge-fields",
						BOOLEANS,
						input["merge-fields"],
					),
				})
				.default(false),

			content: z
				.enum(["open", "closed"], {
					message: zod_invalid_enum_msg(
						"content",
						["open", "closed"],
						input["content"],
					),
				})
				.optional(),

			type: z
				.enum(["tree", "mermaid"], {
					message: zod_invalid_enum_msg(
						"type",
						["tree", "mermaid"],
						input["type"],
					),
				})
				.default("tree"),

			"mermaid-renderer": z
				.enum(Mermaid.RENDERERS, {
					message: zod_invalid_enum_msg(
						"mermaid-renderer",
						Mermaid.RENDERERS,
						input["mermaid-renderer"],
					),
				})
				.optional(),
			"mermaid-direction": z
				.enum(Mermaid.DIRECTIONS, {
					message: zod_invalid_enum_msg(
						"mermaid-direction",
						Mermaid.DIRECTIONS,
						input["mermaid-direction"],
					),
				})
				.optional(),

			"show-attributes": z
				.array(z.enum(EDGE_ATTRIBUTES), {
					message: zod_not_array_msg(
						"show-attributes",
						EDGE_ATTRIBUTES,
						input["show-attributes"],
					),
				})
				.optional(),

			fields: dynamic_enum_array_schema(
				"fields",
				field_labels,
				input["fields"],
			).optional(),

			"field-groups": dynamic_enum_array_schema(
				"field-groups",
				group_labels,
				input["field-groups"],
			).optional(),

			depth: z
				.array(
					z
						.number({
							invalid_type_error: `Expected a number, but got: \`${input["depth"]}\` (${typeof input["depth"]}).
_Try using a number (integer)._
**Example**: \`depth: [0]\`, or \`depth: [0, 3]\``,
						})
						.int({
							message: `Expected an integer (whole number), but got: \`${input["depth"]}\`.
_Try using a whole number (without any decimal points)._
**Example**: \`depth: [0]\`, or \`depth: [0, 3]\``,
						})
						.min(
							0,
							`Minimum depth cannot be less than \`0\`, but got: \`${input["depth"]}\`
_Try using a non-negative number (greater than or equal to zero \`0\`)._
**Example**: \`depth: [0]\`, or possibly: \`depth: [${typeof input["depth"] === "number" ? -1 * input["depth"] : input["depth"]}\`]`,
						),
					{
						invalid_type_error: `Expected a YAML list (array) of one or two numbers, but got: \`${input["depth"]}\` (${typeof input["depth"]}). 
_Try wrapping it in square brackets._
**Example**: \`depth: [0]\`, or \`depth: [0, 3]\`, or possibly: \`depth: [${input["depth"]}]\``,
					},
				)
				.min(
					1,
					`At least one item is required, but got: \`[${input["depth"]}]\`.
_Try adding a number to the list._
**Example**: \`depth: [0]\`, or \`depth: [0, 3]\``,
				)
				.max(
					2,
					// NOTE: I _could_ do something like:
					//    or possibly \`depth: [${(<number[] | null>input["depth"])?.slice(0, 2).join(", ")}]\`
					//    But even that mess isn't safe. What if it's a string or something without join?
					`Maximum of two items allowed, but got: \`[${input["depth"]}]\`.
_Try removing one of the numbers._
**Example**: \`depth: [${(<number[] | null>input["depth"])?.[0] ?? 0}]\`, or possibly \`depth: [${(<number[] | null>input["depth"])?.[0] ?? 0}, 3]\``,
				)
				.transform((v) => {
					if (v.length === 1) return [v[0], Infinity];
					else return v;
				})
				.refine((v) => v[0] <= v[1], {
					message: `Minimum depth cannot be greater than maximum depth.
_Try swapping the numbers._
**Example**: \`depth: [0, 3]\`, or possibly: \`depth: [${(<number[] | null>input["depth"])?.[1] ?? 0}, ${(<number[] | null>input["depth"])?.[0] ?? 3}]\``,
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

	let yaml: Record<string, unknown>;
	try {
		yaml = parseYaml(source) ?? {};

		log.debug("Codeblock > parsed_yaml >", yaml);
	} catch (error) {
		log.error("Codeblock > parse_source > parseYaml.error", error);

		errors.push({
			path: "yaml",
			code: "invalid_yaml",
			message:
				"Invalid codeblock YAML. Check the console for more information (press `Ctrl + Shift + I` to open the console).",
		});

		return { parsed: null, errors };
	}

	// NOTE: An empty codeblock is valid, but yaml sees it as null
	const parsed = codeblock_schema(yaml, data).safeParse(yaml);
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
			message: zod_invalid_enum_msg(
				"yaml" as any,
				FIELDS,
				invalid_fields.join(", "),
			),
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
				message: `Could not find note \`${normalised}\` in your vault. Try a different path.`,
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
				message: `Input \`${parsed["dataview-from"]}\` is not a valid Dataview query. 
You can use \`app.plugins.plugins.dataview.api.pages("<query>")\` to test your query in the console (press \`Ctrl + Shift + I\` to open the console).`,
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
