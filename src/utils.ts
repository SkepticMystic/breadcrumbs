import { camelCase } from "lodash";
// import Graph from "graphology";
import { lowerCase } from "./utils2";

export function myFunc(str: string) {
  return camelCase(lowerCase(str));
}
