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
		console.log("CodeblockMDRC.load");

		this.containerEl.empty();

		const { parsed, errors } = Codeblocks.parse_source(
			this.plugin,
			this.source,
		);
		if (errors.length) console.log("codeblock errors", errors);

		const options = Codeblocks.resolve_options(parsed);
		console.log("resolved codeblock options", options);

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
		console.log("CodeblockMDRC.unload");

		this.component?.$destroy();
	}
}
