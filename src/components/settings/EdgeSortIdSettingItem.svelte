<script lang="ts">
	import { type EdgeSortId } from "src/const/graph";
	import { createEventDispatcher } from "svelte";
	import EdgeSortIdSelector from "../selector/EdgeSortIdSelector.svelte";
	import SettingItem from "./SettingItem.svelte";

	export let edge_sort_id: EdgeSortId;

	const dispatch = createEventDispatcher<{ select: EdgeSortId }>();

	$: if (edge_sort_id) {
		dispatch("select", edge_sort_id);
	}
</script>

<SettingItem
	name="Edge Sort"
	description="Select the sorting method for the edges in the graph."
>
	<EdgeSortIdSelector bind:edge_sort_id />
</SettingItem>
