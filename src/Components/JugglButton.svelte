<script lang="ts">
  export let icon: string;
  export let onClick: () => void;
  export let disabled = false;
  export let title: string;
</script>

<button
  type="button"
  class="juggl-button"
  on:click={onClick}
  aria-label={title}
  {disabled}
>
  {icon}
</button>
