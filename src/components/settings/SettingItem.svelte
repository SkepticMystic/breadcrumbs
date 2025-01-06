<script lang="ts">
	interface Props {
		name: string;
		description: string;
		children?: import('svelte').Snippet;
	}

	let { name, description, children }: Props = $props();
</script>

<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">
			{name}
		</div>
		<div class="setting-item-description">
			{description}
		</div>
	</div>

	<div class="setting-item-control">
		{@render children?.()}
	</div>
</div>
