pub mod edge_sorting;
pub mod graph;
pub mod graph_construction;
pub mod graph_data;
pub mod graph_mermaid;
pub mod graph_rules;
pub mod graph_traversal;
pub mod graph_update;
pub mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn create_graph() -> graph::NoteGraph {
    // utils::log_str("Hello, from WASM!");

    console_error_panic_hook::set_once();

    graph::NoteGraph::new()
}
