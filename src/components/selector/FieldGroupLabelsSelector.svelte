<script lang="ts">
	import { GroupIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeFieldGroup } from "src/interfaces/settings";
	import { FieldGroupsSelectorMenu } from "src/menus/FieldGroupsSelector";

	export let cls = "";
	export let field_group_labels: string[];
	export let edge_field_groups: EdgeFieldGroup[];
</script>

<button
	class={cls}
	aria-label="Choose edge field groups"
	on:click={(e) => {
		FieldGroupsSelectorMenu({
			edge_field_groups,
			value: field_group_labels,
			cb: (value) => (field_group_labels = value),
		}).showAtMouseEvent(e);
	}}
>
	<GroupIcon size={ICON_SIZE} />
</button>
