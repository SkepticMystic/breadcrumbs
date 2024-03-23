<script lang="ts">
	import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import { type EdgeSortId } from "src/const/graph";
	import { EdgeSortIdMenu } from "src/menus/EdgeSortIdMenu";

	export let edge_sort_id: EdgeSortId;
	export let exclude_fields: EdgeSortId["field"][] = [];
	export let cls = "";
</script>

<button
	class="flex gap-1 {cls}"
	aria-label="Change sort field/order"
	on:click={(e) => {
		EdgeSortIdMenu({
			exclude_fields,
			value: edge_sort_id,
			cb: (value) => (edge_sort_id = value),
		}).showAtMouseEvent(e);
	}}
>
	{#if edge_sort_id.order === 1}
		<ArrowUpNarrowWide size={ICON_SIZE} />
	{:else}
		<ArrowDownWideNarrow size={ICON_SIZE} />
	{/if}
</button>
