import { mocha } from "approvals";
// import type { ITestCallbackContext } from "mocha";
// import { getReflexiveClosure } from "../src/sharedFunctions";
import { MultiGraph } from "graphology";

describe("typescript simple Approvals tests #1.1", () => {
  mocha(__dirname);

  it("tutu", function (this) {
    const g = new MultiGraph();
    const value = "TUTU";
    // const value = getReflexiveClosure(g, []);

    this.verify(value);
  });
});
