<script lang="ts">
	import { GroupIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeFieldGroup } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { FieldGroupsSelectorMenu } from "src/menus/FieldGroupsSelector";

	export let cls = "";
	export let plugin: BreadcrumbsPlugin;
	export let edge_field_groups: EdgeFieldGroup[];
</script>

<button
	class={cls}
	aria-label="Choose edge field groups"
	on:click={(e) => {
		FieldGroupsSelectorMenu({
			value: edge_field_groups,
			edge_field_groups: plugin.settings.edge_field_groups,
			cb: (value) => (edge_field_groups = value),
		}).showAtMouseEvent(e);
	}}
>
	<GroupIcon size={ICON_SIZE} />
</button>
