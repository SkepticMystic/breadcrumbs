import { parseYaml } from "obsidian";
import type { CodeblockMDRC } from "src/codeblocks/MDRC";
import { dataview_plugin } from "src/external/dataview";
import type { IDataview } from "src/external/dataview/interfaces";
import type { BreadcrumbsError } from "src/interfaces/graph";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { remove_duplicates_by } from "src/utils/arrays";
import { Paths } from "src/utils/paths";
import { z } from "zod";
import { CodeblockSchema, type ICodeblock } from "./schema";

/** Raw YAML string -> YAML -> zod-parsed */
const parse_source = (
	source: string,
	data: ICodeblock["InputData"],
): {
	errors: BreadcrumbsError[];
	parsed: z.infer<ReturnType<typeof CodeblockSchema.build>> | null;
} => {
	const errors: BreadcrumbsError[] = [];

	let yaml: Record<string, unknown>;
	try {
		yaml = parseYaml(source) ?? {};

		log.debug("Codeblock > parsed_yaml >", yaml);
	} catch (error) {
		log.error("Codeblock > parse_source > ", error);

		errors.push({
			path: "yaml",
			code: "invalid_yaml",
			message:
				"Invalid codeblock YAML. Check the console for more information (press `Ctrl + Shift + I` to open the console).",
		});

		return { parsed: null, errors };
	}

	// NOTE: An empty codeblock is valid, but yaml sees it as null
	const parsed = CodeblockSchema.build(yaml, data).safeParse(yaml);
	if (!parsed.success) {
		errors.push(
			// Sometimes what I thought would be a fatal parsing error just continues...
			// The `depth` schema, for example, can send multiple issues, the latter of which don't make sense in the context of the previous failures
			// So, we just take the first issue for each path and ignore the rest
			...remove_duplicates_by(parsed.error.issues, (issue) =>
				issue.path.join("."),
			).map((issue) => ({
				message: issue.message,
				code: "invalid_field_value" as const,
				path: issue.path
					.map((key) => (typeof key === "number" ? key + 1 : key))
					.join(" > "),
			})),
		);

		return {
			errors,
			parsed: null,
		};
	}

	const invalid_fields = Object.keys(parsed.data).filter(
		(key) => !CodeblockSchema.FIELDS.includes(key as any),
	);

	if (invalid_fields.length) {
		errors.push({
			path: "yaml",
			code: "invalid_yaml",
			message: `The following is not a valid codeblock field: \`${invalid_fields[0]}\`. Valid options are: ${CodeblockSchema.FIELDS.join(", ")}`,
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
	parse_source,
	postprocess_options,

	register,
	unregister,
	update_all,
};
