import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";
import { Graph } from "graphlib";
import * as graphlib from "graphlib";

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: "default",
};

interface nameContent {
  fileName: string;
  content: string;
}

interface childParent {
  child: string;
  parent: string;
}

export default class BreadcrumbsPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Breadcrumbs", () => {
      new Notice("This is a notice!");
    });

    this.addCommand({
      id: "open-sample-modal",
      name: "Open Sample Modal",
      // callback: () => {
      // 	console.log('Simple Callback');
      // },
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            new SampleModal(this.app).open();
          }
          return true;
        }
        return false;
      },
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      console.log("codemirror", cm);
    });

    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      console.log("click", evt);
    });

    this.registerInterval(
      window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
    );
  }

  files: TFile[];

  init() {
    let nameContentArr: nameContent[];
    let files: TFile[] = this.app.vault.getMarkdownFiles();
    files.forEach(async (file) => {
      const eachContent = await this.app.vault.cachedRead(file);
      nameContentArr.push({ fileName: file.basename, content: eachContent });
    });

    // Regex to match the `parent` metadata field
    const parentField = "yz-parent";
    const yamlOrInlineParent = new RegExp(`${parentField}::? (.+)`, "i");
  }
  // Grab parent fields from note content
  // Currently, this doesn't wait until the cachedRead is complete for all files

  test(nameContentArr: nameContent[], yamlOrInlineParent: RegExp) {
    let childParentArr = nameContentArr.map((arr: string[]) => {
      const matches = arr[1].match(yamlOrInlineParent);
      if (matches) {
        const dropBrackets = matches[1].replace("[[", "").replace("]]", "");
        return [arr[0], dropBrackets];
      } else {
        return [arr[0], ""];
      }
    });
  }
  // Graph stuff...

  initialiseGraph(data: string[][]) {
    let g = new Graph();
    g.setNode("Index", "Index");

    data.forEach((edge) => g.setNode(edge[0], edge[0]));

    data.forEach((edge) => {
      if (edge[1] !== "") {
        g.setEdge(...edge, "child");
      }
    });
  }

  getBreadcrumbs(g: Graph, from: string, to: string = "Index") {
    const paths = graphlib.alg.dijkstra(g, from);
    let step = to;
    const breadcrumbs: string[] = [];

    while (paths[step].predecessor !== from) {
      breadcrumbs.push(step);
      step = paths[step].predecessor;
    }

    breadcrumbs.push(from);
    return breadcrumbs;
  }

  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: BreadcrumbsPlugin;

  constructor(app: App, plugin: BreadcrumbsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue("")
          .onChange(async (value) => {
            console.log("Secret: " + value);
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
