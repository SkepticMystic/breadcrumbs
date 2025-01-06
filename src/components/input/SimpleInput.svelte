<script lang="ts">
	import { createEventDispatcher } from "svelte";

	interface Props {
		label?: string;
		disabled_cb?: (value: string) => boolean;
	}

	let { label = "", disabled_cb = (_value) => false }: Props = $props();

	let value = $state("");

	const dispatch = createEventDispatcher<{ submit: string }>();
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<label for="input">
			{label}
		</label>
	{/if}

	<input name="input" type="text" bind:value />

	<button
		disabled={disabled_cb(value)}
		onclick={() => dispatch("submit", value)}
	>
		Submit
	</button>
</div>
