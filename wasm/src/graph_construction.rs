use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct GraphConstructionNodeData {
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
impl GraphConstructionNodeData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        path: String,
        aliases: Vec<String>,
        resolved: bool,
        ignore_in_edges: bool,
        ignore_out_edges: bool,
    ) -> GraphConstructionNodeData {
        GraphConstructionNodeData {
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

impl GraphConstructionNodeData {
    pub fn new_unresolved(path: String) -> GraphConstructionNodeData {
        GraphConstructionNodeData {
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
pub struct GraphConstructionEdgeData {
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
impl GraphConstructionEdgeData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        source: String,
        target: String,
        edge_type: String,
        edge_source: String,
    ) -> GraphConstructionEdgeData {
        GraphConstructionEdgeData {
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
