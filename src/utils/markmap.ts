import type { EdgeAttribute } from "src/graph/MyMultiGraph";
import type { EdgeTree } from "src/graph/traverse";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Links } from "./links";
import { untyped_pick } from "./objects";
import { Paths } from "./paths";
import { url_search_params } from "./url";

type Options = {
	show_attributes?: EdgeAttribute[];
	show_node_options?: ShowNodeOptions;
};

const from_tree = (tree: EdgeTree[], options?: Options) => {
	let markmap = "";

	tree.forEach((item) => {
		const hashes = "#".repeat(item.depth + 1);

		const link = Links.ify(
			item.edge.target_id,
			Paths.show(item.edge.target_id, options?.show_node_options),
			{ link_kind: "wiki" },
		);

		const attr = options?.show_attributes
			? ` (${url_search_params(untyped_pick(item.edge.attr, options.show_attributes), { trim_lone_param: true })})`
			: "";

		markmap += `${hashes} ${link}${attr}\n\n`;

		if (item.children.length) {
			markmap += from_tree(item.children, options);
		}
	});

	return markmap;
};

export const Markmap = {
	from_tree,
};
