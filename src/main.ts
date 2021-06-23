import { Plugin, WorkspaceLeaf } from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import {
  VIEW_TYPE_BREADCRUMBS_MATRIX,
  VIEW_TYPE_BREADCRUMBS_LIST,
  VIEW_TYPE_BREADCRUMBS_TRAIL,
} from "src/constants";
import MatrixView from "src/MatrixView";
// import ListView from "src/ListView";

interface BreadcrumbsSettings {
  showRelationType: boolean;
  parentFieldName: string;
  siblingFieldName: string;
  childFieldName: string;
  indexNote: string;
}

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  showRelationType: true,
  parentFieldName: "parent",
  siblingFieldName: "sibling",
  childFieldName: "child",
  indexNote: "Index",
};
export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  matrixView: MatrixView;
  // listView: ListView;
  // plugin: BreadcrumbsPlugin;

  async onload(): Promise<void> {
    // while (!this.app.plugins.plugins.dataview.api) {
    //   debounce(() => console.log('waiting'), 10, true)
    //   // console.log(this.app.plugins.plugins.dataview.api);
    // }
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      (leaf: WorkspaceLeaf) => (this.matrixView = new MatrixView(leaf, this))
    );

    this.addCommand({
      id: "show-breadcrumb-matrix-view",
      name: "Open Matrix View",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS_MATRIX)
              .length === 0
          );
        }
        this.initLeaf(VIEW_TYPE_BREADCRUMBS_MATRIX);
      },
    });

    this.addCommand({
      id: "show-breadcrumb-list-view",
      name: "Open List View",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS_LIST)
              .length === 0
          );
        }
        this.initLeaf(VIEW_TYPE_BREADCRUMBS_LIST);
      },
    });

    this.app.workspace.onLayoutReady(() => {
      this.initView(VIEW_TYPE_BREADCRUMBS_MATRIX);
    });

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
  }

  // TODO I feel like initView and initLeaf are doing the same thing, and the the first one does it better...
  initView = async (type: string): Promise<void> => {
    let leaf: WorkspaceLeaf = null;
    for (leaf of this.app.workspace.getLeavesOfType(type)) {
      if (leaf.view instanceof MatrixView) return;
      await leaf.setViewState({ type: "empty" });
      break;
    }
    (leaf ?? this.app.workspace.getRightLeaf(false)).setViewState({
      type,
      active: true,
    });
  };

  initLeaf(type: string): void {
    if (this.app.workspace.getLeavesOfType(type).length) {
      return;
    }
    this.app.workspace.getRightLeaf(false).setViewState({
      type,
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    [
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      VIEW_TYPE_BREADCRUMBS_LIST,
      VIEW_TYPE_BREADCRUMBS_TRAIL,
    ].forEach((type) =>
      this.app.workspace.getLeavesOfType(type).forEach((leaf) => leaf.detach())
    );
  }
}
