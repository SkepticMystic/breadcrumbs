<script lang="ts">
  import { warn } from "loglevel";
  import type BCPlugin from "../main";
  import { refreshIndex } from "../refreshIndex";

  export let plugin: BCPlugin;
  export let settingName: string;
  export let options: string[];

  const { settings } = plugin;

  let selected = settings[settingName];

  $: toNone = selected.length === 0 ? false : true;

  async function save() {
    if (settings[settingName] === undefined)
      return warn(settingName + " not found in BC settings");

    settings[settingName] = selected;
    await plugin.saveSettings();
    await refreshIndex(plugin);
  }
</script>

<div>
  <button
    on:click={async () => {
      if (toNone) selected = [];
      else selected = options;
      await save();
    }}
  >
    Select {toNone ? "None" : "All"}
  </button>
</div>

<div class="grid">
  {#each options as option}
    <div>
      <label>
        <input
          type="checkbox"
          value={option}
          bind:group={selected}
          on:change={async () => await save()}
        />
        {option}
      </label>
    </div>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
</style>
