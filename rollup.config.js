import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { env } from "process";
import svelte from "rollup-plugin-svelte";
import autoPreprocess from "svelte-preprocess";

export default {
  input: "src/main.ts",
  output: {
    format: "cjs",
    file: "main.js",
    exports: "default",
  },
  external: ["obsidian", "fs", "os", "path",
    "@codemirror/autocomplete",
    "@codemirror/closebrackets",
    "@codemirror/commands",
    "@codemirror/fold",
    "@codemirror/gutter",
    "@codemirror/history",
    "@codemirror/language",
    "@codemirror/rangeset",
    "@codemirror/rectangular-selection",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/stream-parser",
    "@codemirror/text",
    "@codemirror/view",],
  plugins: [
    svelte({
      emitCss: false,
      preprocess: autoPreprocess(),
    }),
    typescript({ sourceMap: env.env === "DEV" }),
    resolve({
      browser: true,
      dedupe: ["svelte"],
    }),
    commonjs({
      include: "node_modules/**",
    }),
  ],
};
