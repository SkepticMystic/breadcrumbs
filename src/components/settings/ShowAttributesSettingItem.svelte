<script lang="ts">
	import type { EdgeAttribute } from "src/graph/utils";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import SettingItem from "./SettingItem.svelte";

	interface Props {
		show_attributes: EdgeAttribute[];
		exclude_attributes?: EdgeAttribute[];
		select_cb?: (value: EdgeAttribute[]) => void;
	}

	let {
		show_attributes = $bindable(),
		exclude_attributes = [],
		select_cb = () => {},
	}: Props = $props();

	$effect(() => {
		if (show_attributes) {
			select_cb(show_attributes);
		}
	});
</script>

<SettingItem
	name="Show Attributes"
	description="Select the edge attributes to show."
>
	<ShowAttributesSelectorMenu {exclude_attributes} bind:show_attributes />
</SettingItem>
