<script lang="ts">
	import { FileJson } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeAttribute } from "src/graph/utils";
	import { ShowAttributesSelectorMenu } from "src/menus/ShowAttributesMenu";

	interface Props {
		show_attributes: EdgeAttribute[];
		exclude_attributes?: EdgeAttribute[];
		cls?: string;
	}

	let {
		show_attributes = $bindable(),
		exclude_attributes = [],
		cls = "",
	}: Props = $props();

	// Remove any excluded items in the initial value
	// This makes it cleaner to pass in EDGE_ATTRIBUTES as the starter, then immediately exclude some
	if (exclude_attributes?.length) {
		show_attributes = show_attributes.filter(
			(v) => !exclude_attributes?.includes(v),
		);
	}
</script>

<button
	class={cls}
	aria-label="Change which edge attributes show"
	onclick={(e) => {
		ShowAttributesSelectorMenu({
			exclude_attributes,
			value: show_attributes,
			cb: (value) => (show_attributes = value),
		}).showAtMouseEvent(e);
	}}
>
	<FileJson size={ICON_SIZE} />
</button>
