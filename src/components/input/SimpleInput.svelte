<script lang="ts">
	interface Props {
		label?: string;
		disabled_cb?: (value: string) => boolean;
		submit_cb?: (value: string) => void;
	}

	let {
		label = "",
		disabled_cb = (_value) => false,
		submit_cb = () => {},
	}: Props = $props();

	let value = $state("");
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<label for="input">
			{label}
		</label>
	{/if}

	<input name="input" type="text" bind:value />

	<button disabled={disabled_cb(value)} onclick={() => submit_cb(value)}>
		Submit
	</button>
</div>
