import { MarkdownRenderChild } from "obsidian";
import CodeblockMermaid from "src/components/codeblocks/CodeblockMermaid.svelte";
import CodeblockTree from "src/components/codeblocks/CodeblockTree.svelte";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { Codeblocks } from ".";
import { Paths } from "src/utils/paths";

export class CodeblockMDRC extends MarkdownRenderChild {
	source: string;
	plugin: BreadcrumbsPlugin;
	component: CodeblockTree | CodeblockMermaid | undefined;
	file_path: string;
	id: string;

	constructor(
		plugin: BreadcrumbsPlugin,
		containerEl: HTMLElement,
		source: string,
		file_path: string,
	) {
		super(containerEl);

		this.plugin = plugin;
		this.source = source;
		this.file_path = file_path;
		this.id = window.crypto.randomUUID();
	}

	async update(): Promise<void> {
		log.debug("CodeblockMDRC.update");

		if (this.component) {
			try {
				this.component.update();
			} catch (e) {
				log.error("CodeblockMDRC.update error >", e);
			}
		}
	}

	async onload(): Promise<void> {
		log.debug("CodeblockMDRC.load");

		Codeblocks.register(this);

		const { parsed, errors } = Codeblocks.parse_source(
			this.plugin,
			this.source,
		);

		const options = Codeblocks.resolve_options(parsed);
		log.debug("resolved codeblock options", options);

		let file_path = this.file_path;

		if (options.start_node_id) {
			const normalised = Paths.normalise(
				Paths.ensure_ext(options.start_node_id, "md"),
			);

			const start_file =
				this.plugin.app.metadataCache.getFirstLinkpathDest(
					normalised,
					file_path,
				);

			if (start_file) {
				file_path = start_file.path;
			} else {
				errors.push({
					path: "start_node_id",
					code: "invalid_field_value",
					message: `Invalid 'start-note', could not find: "${normalised}"`,
				});
			}
		}

		if (errors.length) log.warn("codeblock errors", errors);

		this.containerEl.empty();

		switch (options.type) {
			case "tree": {
				this.component = new CodeblockTree({
					target: this.containerEl,
					props: {
						errors,
						options,
						file_path,
						plugin: this.plugin,
					},
				});

				break;
			}

			case "mermaid": {
				this.component = new CodeblockMermaid({
					target: this.containerEl,
					props: {
						errors,
						options,
						file_path,
						plugin: this.plugin,
					},
				});
				break;
			}
		}
	}

	onunload(): void {
		log.debug("CodeblockMDRC.unload");
		Codeblocks.unregister(this);

		this.component?.$destroy();
	}
}
