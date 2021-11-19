<script lang="ts">
  import type { App } from "obsidian";
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import type DucksView from "src/DucksView";

  import type BCPlugin from "src/main";

  export let plugin: BCPlugin;
  export let app: App;
  export let ducksView: DucksView;

  const { main } = plugin.currGraphs;
  const files = app.vault.getMarkdownFiles();
  const fileNames = files.map((file) => file.basename);

  const ducks = fileNames.filter((name) => !main.neighbors(name).length);
</script>

<div class="BC-Ducks markdown-preview-view">
  <h6>Notes without Breadcrumbs</h6>
  {#each ducks as duck}
    <div
      on:click={async (e) => await openOrSwitch(app, duck, e)}
      on:mouseover={(e) => hoverPreview(e, ducksView, duck)}
    >
      <a class="internal-link">{duck}</a>
    </div>
  {/each}
</div>
