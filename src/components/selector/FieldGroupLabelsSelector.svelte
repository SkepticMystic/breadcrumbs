<script lang="ts">
	import { GroupIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type BreadcrumbsPlugin from "src/main";
	import { FieldGroupsSelectorMenu } from "src/menus/FieldGroupsSelector";

	export let cls = "";
	export let plugin: BreadcrumbsPlugin;
	export let field_group_labels: string[];
</script>

<button
	class={cls}
	aria-label="Choose edge field groups"
	on:click={(e) => {
		FieldGroupsSelectorMenu({
			value: field_group_labels.map(
				(label) =>
					plugin.settings.edge_field_groups.find(
						(group) => group.label === label,
					) ?? { label, fields: [] },
			),
			edge_field_groups: plugin.settings.edge_field_groups,
			cb: (value) =>
				(field_group_labels = value.map((group) => group.label)),
		}).showAtMouseEvent(e);
	}}
>
	<GroupIcon size={ICON_SIZE} />
</button>
