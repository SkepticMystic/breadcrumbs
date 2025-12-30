import type { App, TFile } from "obsidian";
import { writable } from "svelte/store";

const store = writable<TFile | null>(null);

export const active_file_store = {
	...store,

	refresh: (app: App) => store.set(app.workspace.getActiveFile()),
};
