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
	id: string;

	constructor(
		plugin: BreadcrumbsPlugin,
		containerEl: HTMLElement,
		source: string,
	) {
		super(containerEl);

		this.plugin = plugin;
		this.source = source;
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
		Codeblocks.unregister(this);

		this.component?.$destroy();
	}
}
