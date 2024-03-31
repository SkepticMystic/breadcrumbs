import { MarkdownRenderChild } from "obsidian";
import CodeblockTree from "src/components/codeblocks/CodeblockTree.svelte";
import type BreadcrumbsPlugin from "src/main";
import { Codeblocks } from ".";

export class CodeblockMDRC extends MarkdownRenderChild {
	source: string;
	plugin: BreadcrumbsPlugin;
	component: CodeblockTree | undefined;

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
		this.plugin.log.debug("CodeblockMDRC.load");

		const { parsed, errors } = Codeblocks.parse_source(
			this.plugin,
			this.source,
		);
		if (errors.length) this.plugin.log.warn("codeblock errors", errors);

		const options = Codeblocks.resolve_options(parsed);
		this.plugin.log.debug("resolved codeblock options", options);

		this.containerEl.empty();
		this.component = new CodeblockTree({
			target: this.containerEl,
			props: {
				errors,
				options,
				plugin: this.plugin,
			},
		});
	}

	onunload(): void {
		this.plugin.log.debug("CodeblockMDRC.unload");

		this.component?.$destroy();
	}
}
