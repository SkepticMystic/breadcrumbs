<script lang="ts">
	import { FileJson } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeAttribute } from "src/graph/MyMultiGraph";
	import { ShowAttributesSelectorMenu } from "src/menus/ShowAttributesMenu";

	export let show_attributes: EdgeAttribute[];
	export let exclude_attributes: EdgeAttribute[] = [];
	export let cls = "";
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
