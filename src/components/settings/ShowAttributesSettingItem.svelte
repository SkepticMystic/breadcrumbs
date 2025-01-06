<script lang="ts">
	import { run } from 'svelte/legacy';

	import type { EdgeAttribute } from "src/graph/utils";
	import { createEventDispatcher } from "svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import SettingItem from "./SettingItem.svelte";

	interface Props {
		show_attributes: EdgeAttribute[];
		exclude_attributes?: EdgeAttribute[];
	}

	let { show_attributes = $bindable(), exclude_attributes = [] }: Props = $props();

	const dispatch = createEventDispatcher<{ select: EdgeAttribute[] }>();

	run(() => {
		if (show_attributes) {
			dispatch("select", show_attributes);
		}
	});
</script>

<SettingItem
	name="Show Attributes"
	description="Select the edge attributes to show."
>
	<ShowAttributesSelectorMenu {exclude_attributes} bind:show_attributes />
</SettingItem>
