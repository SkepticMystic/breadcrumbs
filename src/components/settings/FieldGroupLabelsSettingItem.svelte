<script lang="ts">
	import type { EdgeFieldGroup } from "src/interfaces/settings";
	import { createEventDispatcher } from "svelte";
	import FieldGroupLabelsSelector from "../selector/FieldGroupLabelsSelector.svelte";
	import SettingItem from "./SettingItem.svelte";

	export let name = "Field Groups";
	export let description =
		"Select the field groups to use for this traversal.";

	export let field_group_labels: string[];
	export let edge_field_groups: EdgeFieldGroup[];

	const dispatch = createEventDispatcher<{ select: string[] }>();

	$: if (field_group_labels) {
		dispatch("select", field_group_labels);
	}
</script>

<SettingItem {name} {description}>
	<FieldGroupLabelsSelector {edge_field_groups} bind:field_group_labels />
</SettingItem>
