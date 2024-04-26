pub mod graph;
pub mod graph_construction;
pub mod graph_rules;
pub mod graph_update;
pub mod utils;

use wasm_bindgen::prelude::*;

const DEBUG: bool = false;

#[wasm_bindgen]
pub fn create_graph() -> graph::NoteGraph {
    // utils::log_str("Hello, from WASM!");

    console_error_panic_hook::set_once();

    let graph = graph::NoteGraph::new();

    return graph;
}
