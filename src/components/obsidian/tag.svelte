<script lang="ts">
	export let tag: string;
	export let href: string | undefined = undefined;
	export let title: string | undefined = undefined;
</script>

{#if href !== undefined}
	<a {href} {title} class="tag" on:click on:contextmenu>
		{tag}
	</a>
{:else}
	<!-- svelte-ignore a11y-missing-attribute -->
	<a
		{title}
		class="tag"
		tabindex="0"
		role="button"
		on:click
		on:keydown
		on:contextmenu
	>
		{tag}
	</a>
{/if}
