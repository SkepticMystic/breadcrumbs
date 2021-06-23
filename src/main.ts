import { Plugin, WorkspaceLeaf } from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import {
  VIEW_TYPE_BREADCRUMBS_MATRIX,
  VIEW_TYPE_BREADCRUMBS_TRAIL,
} from "src/constants";
import MatrixView from "src/MatrixView";

interface BreadcrumbsSettings {
  parentFieldName: string;
  siblingFieldName: string;
  childFieldName: string;
  indexNote: string;
}

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  parentFieldName: "parent",
  siblingFieldName: "sibling",
  childFieldName: "child",
  indexNote: "Index",
};
export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  matrixView: MatrixView;
  plugin: BreadcrumbsPlugin;

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      (leaf: WorkspaceLeaf) => (this.matrixView = new MatrixView(leaf, this.plugin))
    );

    this.addRibbonIcon("dice", "Breadcrumbs", async () => {
      console.log({
        fileObsDv: this.matrixView.getFileFrontmatterArr(),
        userFields: this.matrixView.getNeighbourObjArr(
          this.matrixView.getFileFrontmatterArr()
        ),
      });
    });

    this.addCommand({
      id: "show-breadcrumb-view",
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

    // if (this.app.workspace.layoutReady) {
    //   this.initView();
    // } else {
    //   this.registerEvent(this.app.workspace.on("layout-ready", this.initView));
    // }

    this.app.workspace.onLayoutReady(this.initView);

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
  }

  initView = async (): Promise<void> => {
    let leaf: WorkspaceLeaf = null;
    for (leaf of this.app.workspace.getLeavesOfType(
      VIEW_TYPE_BREADCRUMBS_MATRIX
    )) {
      if (leaf.view instanceof MatrixView) return;
      await leaf.setViewState({ type: "empty" });
      break;
    }
    (leaf ?? this.app.workspace.getRightLeaf(false)).setViewState({
      type: VIEW_TYPE_BREADCRUMBS_MATRIX,
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
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_BREADCRUMBS_MATRIX)
      .forEach((leaf) => leaf.detach());
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_BREADCRUMBS_TRAIL)
      .forEach((leaf) => leaf.detach());
  }
}
