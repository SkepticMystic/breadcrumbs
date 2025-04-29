<script lang="ts">
	import { FileJson } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeAttribute } from "src/graph/MyMultiGraph";
	import { ShowAttributesSelectorMenu } from "src/menus/ShowAttributesMenu";

	export let show_attributes: EdgeAttribute[];
	export let exclude_attributes: EdgeAttribute[] = [];
	export let cls = "";

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
	on:click={(e) => {
		ShowAttributesSelectorMenu({
			exclude_attributes,
			value: show_attributes,
			cb: (value) => (show_attributes = value),
		}).showAtMouseEvent(e);
	}}
>
	<FileJson size={ICON_SIZE} />
</button>
