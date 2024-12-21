<script lang="ts">
	import type { EdgeAttribute } from "src/graph/utils";
	import { createEventDispatcher } from "svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import SettingItem from "./SettingItem.svelte";

	export let show_attributes: EdgeAttribute[];
	export let exclude_attributes: EdgeAttribute[] = [];

	const dispatch = createEventDispatcher<{ select: EdgeAttribute[] }>();

	$: if (show_attributes) {
		dispatch("select", show_attributes);
	}
</script>

<SettingItem
	name="Show Attributes"
	description="Select the edge attributes to show."
>
	<ShowAttributesSelectorMenu {exclude_attributes} bind:show_attributes />
</SettingItem>
