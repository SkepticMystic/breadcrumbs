<script lang="ts">
  export let icon;
  export let onClick: () => void;
  export let disabled = false;
  export let title = "";

  $: renderedIcon = icon;
</script>

<button
  type="button"
  class="juggl-button"
  on:click={onClick}
  aria-label={title}
  {disabled}
>
  {renderedIcon}
</button>
