import { MarkdownRenderChild } from "obsidian";
import CodeblockMermaid from "src/components/codeblocks/CodeblockMermaid.svelte";
import CodeblockTree from "src/components/codeblocks/CodeblockTree.svelte";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { Codeblocks } from ".";

export class CodeblockMDRC extends MarkdownRenderChild {
	source: string;
	plugin: BreadcrumbsPlugin;
	component: CodeblockTree | CodeblockMermaid | undefined;

	constructor(
		plugin: BreadcrumbsPlugin,
		containerEl: HTMLElement,
		source: string,
	) {
		super(containerEl);

		this.plugin = plugin;
		this.source = source;
	}

	async onload(): Promise<void> {
		log.debug("CodeblockMDRC.load");

		const { parsed, errors } = Codeblocks.parse_source(
			this.plugin,
			this.source,
		);
		if (errors.length) log.warn("codeblock errors", errors);

		const options = Codeblocks.resolve_options(parsed);
		log.debug("resolved codeblock options", options);

		this.containerEl.empty();

		switch (options.type) {
			case "tree": {
				this.component = new CodeblockTree({
					target: this.containerEl,
					props: {
						errors,
						options,
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
						plugin: this.plugin,
					},
				});
				break;
			}
		}
	}

	onunload(): void {
		log.debug("CodeblockMDRC.unload");

		this.component?.$destroy();
	}
}
