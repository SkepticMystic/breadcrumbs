import { TFile } from "obsidian";
import { writable } from "svelte/store";

export const active_file_store = writable<TFile | null>(null);
