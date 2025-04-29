<script lang="ts">
	export let cls = "";
	export let label = "";
	export let aria_label = "";
</script>

<div class="tree-item-flair-outer">
	<span class="{cls} tree-item-flair" aria-label={aria_label}>
		{label}
	</span>
</div>
