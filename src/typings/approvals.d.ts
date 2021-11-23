declare module "approvals" {
  export type ApprovalsOptions = any;

  export interface MochaInstance {
    verify(data: any, overrideOptions: Partial<ApprovalsOptions>): void;
  }

  export function configure(overrideOptions: Partial<ApprovalsOptions>): void;

  export function getConfig(
    overrideOptions: Partial<ApprovalsOptions>
  ): ApprovalsOptions;

  export function verify(
    dirName: string,
    testName: string,
    data: string | Buffer,
    optionsOverride: Partial<ApprovalsOptions>
  ): void;

  export function verifyAndScrub(
    dirName: string,
    testName: string,
    data: string | Buffer,
    scrubber: (file: string) => string,
    optionsOverride: Partial<ApprovalsOptions>
  ): void;

  export function verifyAsJSON(
    dirName: string,
    testName: string,
    data: any,
    optionsOverride: Partial<ApprovalsOptions>
  ): void;

  export function verifyAsJSONAndScrub(
    dirName: string,
    testName: string,
    data: any,
    scrubber: (file: string) => string,
    optionsOverride: Partial<ApprovalsOptions>
  ): void;

  export function verifyWithControl(
    namer: string,
    writer: string,
    reporterFactory: string,
    optionsOverride: Partial<ApprovalsOptions>
  ): void;

  export const reporters: {
    MultiReporter: any;
  };

  export namespace scrubbers {
    export function noScrubber(): void;

    export function guidScrubber(): void;

    export function multiScrubber(): void;
  }

  /**
   * Configure approvals to hook into Mocha tests.
   * @param {*} optionalBaseDir - An optional folder to save approval files to.
   */
  export const mocha: (optionalBaseDir?: string) => void;
}
