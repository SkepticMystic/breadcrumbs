<script lang="ts">
  import type BCPlugin from "../main";

  export let plugin: BCPlugin;
  export let settingName: string;
  export let options: string[];
  let selected = plugin.settings[settingName];

  console.log({ options, selected });
</script>

{#each options as option}
  <div>
    <label>
      <input
        type="checkbox"
        value={option}
        bind:group={selected}
        on:change={async () => {
          if (plugin.settings[settingName] === undefined) {
            return console.log(settingName + " not found in BC settings");
          }
          plugin.settings[settingName] = selected;
          await plugin.saveSettings();
          await plugin.refreshIndex();
        }}
      />
      {option}
    </label>
  </div>
{/each}
