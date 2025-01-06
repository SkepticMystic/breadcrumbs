<script lang="ts">
	import { run } from 'svelte/legacy';

	import type { EdgeFieldGroup } from "src/interfaces/settings";
	import { createEventDispatcher } from "svelte";
	import FieldGroupLabelsSelector from "../selector/FieldGroupLabelsSelector.svelte";
	import SettingItem from "./SettingItem.svelte";


	interface Props {
		name?: string;
		description?: string;
		field_group_labels: string[];
		edge_field_groups: EdgeFieldGroup[];
	}

	let {
		name = "Field Groups",
		description = "Select the field groups to use for this traversal.",
		field_group_labels = $bindable(),
		edge_field_groups
	}: Props = $props();

	const dispatch = createEventDispatcher<{ select: string[] }>();

	run(() => {
		if (field_group_labels) {
			dispatch("select", field_group_labels);
		}
	});
</script>

<SettingItem {name} {description}>
	<FieldGroupLabelsSelector {edge_field_groups} bind:field_group_labels />
</SettingItem>
