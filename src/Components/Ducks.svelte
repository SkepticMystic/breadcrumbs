<script lang="ts">
  import type { App } from "obsidian";
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import type DucksView from "src/DucksView";
  import type BCPlugin from "src/main";
  import FaInfo from "svelte-icons/fa/FaInfo.svelte";

  export let plugin: BCPlugin;
  export let app: App;
  export let ducksView: DucksView;

  const { mainG } = plugin;
  const files = app.vault.getMarkdownFiles();

  let query: string = "";
  let include = true;

  let regex = new RegExp(query, "g");
  $: regex = new RegExp(query, "g");

  let ducks = files
    .map((file) => file.basename)
    .filter(
      (name) => !mainG.neighbors(name).length && include === regex.test(name)
    );
  $: console.log({ ducks, query, include, regex });

  $: {
    ducks = files
      .map((file) => file.basename)
      .filter(
        (name) => !mainG.neighbors(name).length && include === regex.test(name)
      );
  }
</script>

<div class="BC-Ducks markdown-preview-view">
  <h6>Notes without Breadcrumbs</h6>
  <span
    class="icon"
    aria-label={`A Regex used to filter the results.\nIf 'Include' is checked, it will only show notes that match the regex.\nIf 'Include' is not checked, this regex will filter out notes that match it.`}
  >
    <FaInfo />
  </span>
  <label for="regex">Filter: </label>
  <input
    type="text"
    name="regex"
    placeholder="Regex"
    value={query}
    on:change={(e) => (query = e.target.value)}
  />
  <input
    aria-label="Include"
    type="checkbox"
    checked={include}
    on:change={(e) => (include = e.target.checked)}
  />
  {#each ducks as duck}
    <div
      on:click={async (e) => await openOrSwitch(app, duck, e)}
      on:mouseover={(e) => hoverPreview(e, ducksView, duck)}
    >
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
