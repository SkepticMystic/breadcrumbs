<script lang="ts">
	import type { EdgeField, EdgeFieldGroup } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";

	export let plugin: BreadcrumbsPlugin;

	const actions = {
		save: async () => {
			await Promise.all([plugin.saveSettings(), plugin.refresh()]);
		},

		fields: {
			add: () => {
				plugin.settings.edge_fields.push({
					label: "New Edge Field",
				});
				plugin = plugin;
			},
			remove: (edge_field: EdgeField) => {
				plugin.settings.edge_fields =
					plugin.settings.edge_fields.filter(
						(f) => f.label !== edge_field.label,
					);

				plugin.settings.edge_field_groups.forEach((group) => {
					group.fields = group.fields.filter(
						(f) => f !== edge_field.label,
					);
				});

				plugin = plugin;
			},

			rename: (edge_field: EdgeField, new_label: string) => {
				edge_field.label = new_label;

				plugin.settings.edge_field_groups.forEach((group) => {
					const index = group.fields.indexOf(edge_field.label);
					if (index === -1) return;

					group.fields[index] = new_label;
				});

				plugin = plugin;
			},
		},

		groups: {
			add: () => {
				plugin.settings.edge_field_groups.push({
					label: "New Group",
					fields: [],
				});
				plugin = plugin;
			},

			remove: (group: EdgeFieldGroup) => {
				plugin.settings.edge_field_groups =
					plugin.settings.edge_field_groups.filter(
						(g) => g.label !== group.label,
					);

				plugin = plugin;
			},

			add_field: (group: EdgeFieldGroup, field_label: string) => {
				group.fields.push(field_label);
				plugin = plugin;
			},

			remove_field: (group: EdgeFieldGroup, field_label: string) => {
				group.fields = group.fields.filter((f) => f !== field_label);
				plugin = plugin;
			},
		},
	};
</script>

<div class="flex flex-col gap-5">
	<div class="flex flex-wrap gap-3">
		<button on:click={() => actions.fields.add()}> New Edge Field </button>

		<button on:click={() => actions.groups.add()}> New Group </button>

		<button on:click={actions.save}> Save </button>
	</div>

	<div class="flex flex-col gap-3">
		{#each plugin.settings.edge_fields as edge_field, i}
			{@const group_labels = plugin.settings.edge_field_groups
				.filter((group) => group.fields.includes(edge_field.label))
				.map((g) => g.label)}

			<div>
				<input type="text" bind:value={edge_field.label} />

				<button on:click={() => actions.fields.remove(edge_field)}>
					Delete
				</button>

				<div class="flex flex-wrap gap-2">
					{#each group_labels as group_label}
						<span class="tag">
							{group_label}
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="flex flex-col gap-3">
		{#each plugin.settings.edge_field_groups as group}
			<div>
				<input type="text" bind:value={group.label} />

				<div class="flex flex-wrap gap-2">
					{#each group.fields as field}
						<span class="tag">
							{field}
						</span>

						<button
							on:click={() =>
								actions.groups.remove_field(group, field)}
						>
							Delete
						</button>
					{/each}

					<select
						class="dropdown"
						on:change={(e) =>
							actions.groups.add_field(
								group,
								e.currentTarget.value,
							)}
					>
						{#each plugin.settings.edge_fields as edge_field}
							{#if !group.fields.includes(edge_field.label)}
								<option value={edge_field.label}>
									{edge_field.label}
								</option>
							{/if}
						{/each}
					</select>
				</div>
			</div>
		{/each}
	</div>
</div>
