use std::{collections::HashSet, rc::Rc};

use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    data::NGNodeIndex,
    edge_sorting::EdgeSorter,
    graph::NoteGraph,
    utils::{NoteGraphError, Result},
};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalOptions {
    #[wasm_bindgen(getter_with_clone)]
    pub entry_nodes: Vec<String>,
    /// if this is None, all edge types will be traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge_types: Option<Vec<String>>,
    pub max_depth: u32,
    pub max_traversal_count: u32,
    /// if true, multiple traversals - one for each edge type - will be
    /// performed and the results will be combined. if false, one traversal
    /// over all edge types will be performed
    pub separate_edges: bool,
    /// When set, only edges whose target node path is in this set will be
    /// traversed. Used for the `dataview-from` codeblock filter.
    #[wasm_bindgen(getter_with_clone)]
    pub dataview_from_paths: Option<Vec<String>>,
}

#[wasm_bindgen]
impl TraversalOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(
        entry_nodes: Vec<String>,
        edge_types: Option<Vec<String>>,
        max_depth: u32,
        max_traversal_count: u32,
        separate_edges: bool,
        dataview_from_paths: Option<Vec<String>>,
    ) -> TraversalOptions {
        TraversalOptions {
            entry_nodes,
            edge_types,
            max_depth,
            max_traversal_count,
            separate_edges,
            dataview_from_paths,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}")
    }
}

impl TraversalOptions {
    /// Gets the edge types as `Rc<str>`.
    pub fn edge_types_as_rcs(&self) -> Option<Vec<Rc<str>>> {
        self.edge_types
            .as_ref()
            .map(|edge_types| edge_types.iter().map(|s| Rc::from(s.clone())).collect())
    }

    /// Gets the node indices of the entry nodes.
    pub fn indices_of_entry_nodes(&self, graph: &NoteGraph) -> Result<Vec<NGNodeIndex>> {
        self.entry_nodes
            .iter()
            .map(|node| {
                graph
                    .int_get_node_index(node)
                    .ok_or(NoteGraphError::new(&format!("Node \"{node}\" not found")))
            })
            .collect()
    }

    /// Resolves `dataview_from_paths` to a set of node indices for efficient
    /// lookups during traversal. Paths that don't exist in the graph are
    /// silently ignored.
    pub fn dataview_from_indices(&self, graph: &NoteGraph) -> Option<HashSet<NGNodeIndex>> {
        self.dataview_from_paths.as_ref().map(|paths| {
            paths
                .iter()
                .filter_map(|path| graph.int_get_node_index(path))
                .collect()
        })
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
        format!("{self:#?}")
    }
}
