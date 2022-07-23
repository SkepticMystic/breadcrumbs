<script lang="ts">
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import FaInfo from "svelte-icons/fa/FaInfo.svelte";
  import type BCPlugin from "../main";
  import type DucksView from "../Views/DucksView";

  export let plugin: BCPlugin;
  export let ducksView: DucksView;

  const { mainG } = plugin;
  const files = app.vault.getMarkdownFiles();

  let query: string = "";
  let regex = new RegExp(query, "g");
  let include = true;

  $: {
    try {
      const newReg = new RegExp(query, "g");
      regex = newReg;
    } catch (e) {}
  }

  const getDucks = (regex: RegExp) => {
    if (!regex) return;
    return files
      .map((file) => file.basename)
      .filter(
        (name) => !mainG.neighbors(name).length && include === regex.test(name)
      );
  };

  $: ducks = getDucks(regex);
</script>

<div class="BC-Ducks markdown-preview-view">
  <h6>Notes without Breadcrumbs</h6>
  <span
    class="icon"
    aria-label={`A Regex used to filter the results.\nIf 'Include' is checked, it will only show notes that match the regex.\nIf 'Include' is not checked, this regex will filter out notes that match it.`}
  >
    <FaInfo />
  </span>
  <label>
    Filter:
    <input type="text" placeholder="Regex" bind:value={query} />
  </label>
  <input aria-label="Include" type="checkbox" bind:checked={include} />

  {#each ducks as duck}
    <div
      on:click={async (e) => await openOrSwitch(duck, e)}
      on:mouseover={(e) => hoverPreview(e, ducksView, duck)}
    >
      <!-- svelte-ignore a11y-missing-attribute -->
      <a class="internal-link">{duck}</a>
    </div>
  {/each}
</div>

<style>
  .icon {
    color: var(--text-normal);
    display: inline-block;
    padding-top: 5px !important;
    width: 20px;
    height: 20px;
  }
</style>
