pub mod data;
pub mod edge_sorting;
pub mod graph;
pub mod mermaid;
pub mod traversal;
pub mod update;
pub mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn create_graph() -> graph::NoteGraph {
    console_error_panic_hook::set_once();

    utils::LOGGER.with(|l| l.debug("Hello, from WASM!"));

    graph::NoteGraph::new()
}
