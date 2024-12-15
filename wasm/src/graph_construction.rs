use wasm_bindgen::prelude::*;

use crate::graph_data::EdgeData;

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct GCNodeData {
    #[wasm_bindgen(skip)]
    pub path: String,
    #[wasm_bindgen(skip)]
    pub aliases: Vec<String>,
    #[wasm_bindgen(skip)]
    pub resolved: bool,
    #[wasm_bindgen(skip)]
    pub ignore_in_edges: bool,
    #[wasm_bindgen(skip)]
    pub ignore_out_edges: bool,
}

#[wasm_bindgen]
impl GCNodeData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        path: String,
        aliases: Vec<String>,
        resolved: bool,
        ignore_in_edges: bool,
        ignore_out_edges: bool,
    ) -> GCNodeData {
        GCNodeData {
            path,
            aliases,
            resolved,
            ignore_in_edges,
            ignore_out_edges,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl GCNodeData {
    pub fn new_unresolved(path: String) -> GCNodeData {
        GCNodeData {
            path,
            aliases: Vec::new(),
            resolved: false,
            ignore_in_edges: false,
            ignore_out_edges: false,
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct GCEdgeData {
    #[wasm_bindgen(skip)]
    pub source: String,
    #[wasm_bindgen(skip)]
    pub target: String,
    #[wasm_bindgen(skip)]
    pub edge_type: String,
    #[wasm_bindgen(skip)]
    pub edge_source: String,
}

#[wasm_bindgen]
impl GCEdgeData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        source: String,
        target: String,
        edge_type: String,
        edge_source: String,
    ) -> GCEdgeData {
        GCEdgeData {
            source,
            target,
            edge_type,
            edge_source,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl GCEdgeData {
    pub fn to_explicit_edge(&self) -> EdgeData {
        EdgeData::new(self.edge_type.clone(), self.edge_source.clone(), true, 0)
    }
}
