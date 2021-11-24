import { mocha } from "approvals";
import type { ITestCallbackContext } from "mocha";
// import { getReflexiveClosure } from "../src/sharedFunctions";
import Graph from "graphology";

describe("typescript simple Approvals tests #1.1", () => {
  mocha(__dirname);

  it("tutu", function (this: ITestCallbackContext) {
    const g = new Graph();
    // const value = getReflexiveClosure(g, []);

    this.verify(g);
  });
});
