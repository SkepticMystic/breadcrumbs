<script lang="ts">
    export let icon;
    $: renderedIcon = icon;
    export let onClick;
    export let disabled = false;
    export let title;
</script>


<button type="button" class="juggl-button" on:click={onClick} aria-label={title} {disabled}>
    {renderedIcon}
</button>
