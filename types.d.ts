import "obsidian";
import { DataviewApi } from "obsidian-dataview";

declare module "obsidian" {
  interface App {
    plugins: {
      enabledPlugins: Set<string>;
      plugins: {
        [id: string]: any;
        dataview?: {
          api?: DataviewApi;
        };
        juggl: any;
        metaedit: {
          api: {
            getAutopropFunction: () => any;
            getUpdateFunction: () => any;
            getFileFromTFileOrPath: () => any;
            getGetPropertyValueFunction: () => any;
            getGetFilesWithPropertyFunction: () => any;
            getCreateYamlPropertyFunction: () => any;
            getGetPropertiesInFile: () => any;
          };
        };
      };
    };
  }
  interface MetadataCache {
    on(
      name: "dataview:api-ready",
      callback: (api: DataviewPlugin["api"]) => any,
      ctx?: any
    ): EventRef;
    on(
      name: "dataview:metadata-change",
      callback: (
        ...args:
          | [op: "rename", file: TAbstractFile, oldPath: string]
          | [op: "delete", file: TFile]
          | [op: "update", file: TFile]
      ) => any,
      ctx?: any
    ): EventRef;
  }
}
