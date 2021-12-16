<script lang="ts">
  import type BCPlugin from "../main";

  export let plugin: BCPlugin;
  export let settingName: string;
  export let options: string[];
  let selected = plugin.settings[settingName];

  let toNone = selected.length === 0 ? false : true;
  $: toNone = selected.length === 0 ? false : true;

  async function save() {
    if (plugin.settings[settingName] === undefined) {
      return console.log(settingName + " not found in BC settings");
    }

    plugin.settings[settingName] = selected;
    await plugin.saveSettings();
    await plugin.refreshIndex();
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
{#each options as option}
  <div>
    <label>
      <input
        type="checkbox"
        value={option}
        bind:group={selected}
        on:change={async () => save()}
      />
      {option}
    </label>
  </div>
{/each}
