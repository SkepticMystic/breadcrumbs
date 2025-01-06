<script lang="ts">
	interface Props {
		cls?: string;
		label?: string;
		aria_label?: string;
	}

	let { cls = "", label = "", aria_label = "" }: Props = $props();
</script>

<div class="tree-item-flair-outer">
	<span class="{cls} tree-item-flair" aria-label={aria_label}>
		{label}
	</span>
</div>
