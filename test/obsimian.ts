import { ObsimianApp } from "obsimian/dist/ObsimianApp";
const fs = require("fs").promises;

let obsimianData = await fs.readFile(
  "C:/Users/rossk/OneDrive/1D Personal/Programming/Obsidian Plugins/breadcrumbs-test-vault/.obsidian/plugins/breadcrumbs/breadcrumbs-test-vault.json"
);
const app = new ObsimianApp(obsimianData);

export {};
