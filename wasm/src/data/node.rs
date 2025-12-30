use wasm_bindgen::prelude::wasm_bindgen;

use crate::data::construction::GCNodeData;

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct NodeData {
    #[wasm_bindgen(getter_with_clone)]
    pub path: String,
    #[wasm_bindgen(getter_with_clone)]
    pub aliases: Vec<String>,
    pub resolved: bool,
    pub ignore_in_edges: bool,
    pub ignore_out_edges: bool,
}

#[wasm_bindgen]
impl NodeData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        path: String,
        aliases: Vec<String>,
        resolved: bool,
        ignore_in_edges: bool,
        ignore_out_edges: bool,
    ) -> NodeData {
        NodeData {
            path,
            aliases,
            resolved,
            ignore_in_edges,
            ignore_out_edges,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}")
    }
}

impl NodeData {
    pub fn new_unresolved(path: String) -> NodeData {
        NodeData {
            path,
            aliases: Vec::new(),
            resolved: false,
            ignore_in_edges: false,
            ignore_out_edges: false,
        }
    }

    pub fn override_with_construction_data(&mut self, data: GCNodeData) {
        assert_eq!(
            self.path, data.path,
            "Can not override with data for another node."
        );
        self.aliases = data.aliases;
        self.resolved = data.resolved;
        self.ignore_in_edges = data.ignore_in_edges;
        self.ignore_out_edges = data.ignore_out_edges;
    }
}

impl From<GCNodeData> for NodeData {
    fn from(data: GCNodeData) -> NodeData {
        NodeData {
            path: data.path,
            aliases: data.aliases,
            resolved: data.resolved,
            ignore_in_edges: data.ignore_in_edges,
            ignore_out_edges: data.ignore_out_edges,
        }
    }
}
