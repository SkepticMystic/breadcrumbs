use wasm_bindgen::prelude::wasm_bindgen;

use crate::edge_sorting::EdgeSorter;

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalOptions {
    #[wasm_bindgen(getter_with_clone)]
    pub entry_nodes: Vec<String>,
    /// if this is None, all edge types will be traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge_types: Option<Vec<String>>,
    pub max_depth: u32,
    /// if true, multiple traversals - one for each edge type - will be performed and the results will be combined
    /// if false, one traversal over all edge types will be performed
    pub separate_edges: bool,
}

#[wasm_bindgen]
impl TraversalOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(
        entry_nodes: Vec<String>,
        edge_types: Option<Vec<String>>,
        max_depth: u32,
        separate_edges: bool,
    ) -> TraversalOptions {
        TraversalOptions {
            entry_nodes,
            edge_types,
            max_depth,
            separate_edges,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalPostprocessOptions {
    #[wasm_bindgen(getter_with_clone)]
    pub sorter: Option<EdgeSorter>,
    #[wasm_bindgen(getter_with_clone)]
    pub flatten: bool,
}

#[wasm_bindgen]
impl TraversalPostprocessOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(sorter: &EdgeSorter, flatten: bool) -> TraversalPostprocessOptions {
        TraversalPostprocessOptions {
            sorter: Some(sorter.clone()),
            flatten,
        }
    }

    pub fn without_sorter(flatten: bool) -> TraversalPostprocessOptions {
        TraversalPostprocessOptions {
            sorter: None,
            flatten,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}
