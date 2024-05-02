use std::fmt::Debug;

use petgraph::{
    graph::{EdgeIndex, NodeIndex},
    stable_graph::EdgeReference,
};
use wasm_bindgen::prelude::*;

use crate::{graph::edge_matches_edge_filter, graph_construction::GraphConstructionNodeData};

pub type NGEdgeIndex = EdgeIndex<u32>;
pub type NGNodeIndex = NodeIndex<u32>;
pub type NGEdgeRef<'a> = EdgeReference<'a, EdgeData, u32>;

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeData {
    #[wasm_bindgen(skip)]
    pub edge_type: String,
    #[wasm_bindgen(skip)]
    pub edge_source: String,
    #[wasm_bindgen(skip)]
    pub implied: bool,
    #[wasm_bindgen(skip)]
    pub round: u8,
}

#[wasm_bindgen]
impl EdgeData {
    #[wasm_bindgen(constructor)]
    pub fn new(edge_type: String, edge_source: String, implied: bool, round: u8) -> EdgeData {
        EdgeData {
            edge_type,
            edge_source,
            implied,
            round,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn edge_type(&self) -> String {
        self.edge_type.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn edge_source(&self) -> String {
        self.edge_source.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn implied(&self) -> bool {
        self.implied
    }

    #[wasm_bindgen(getter)]
    pub fn round(&self) -> u8 {
        self.round
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl EdgeData {
    pub fn get_attribute_label(&self, attributes: &Vec<String>) -> String {
        let mut result = vec![];

        // the mapping that exist on the JS side are as follows
        // "field" | "explicit" | "source" | "implied_kind" | "round"

        // TODO: maybe change the attribute options so that the JS side better matches the data

        for attribute in attributes {
            let data = match attribute.as_str() {
                "field" => Some(("field", self.edge_type.clone())),
                "explicit" => Some(("explicit", (!self.implied).to_string())),
                "source" => {
                    if !self.implied {
                        Some(("source", self.edge_source.clone()))
                    } else {
                        None
                    }
                }
                "implied_kind" => {
                    if self.implied {
                        Some(("implied_kind", self.edge_source.clone()))
                    } else {
                        None
                    }
                }
                "round" => Some(("round", self.round.to_string())),
                _ => None,
            };

            if let Some(data) = data {
                result.push(format!("{}={}", data.0, data.1));
            }
        }

        result.join(" ")
    }
}

// impl PartialEq for EdgeData {
//     fn eq(&self, other: &Self) -> bool {
//         self.edge_type == other.edge_type
//     }
// }

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct NodeData {
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

    #[wasm_bindgen(getter)]
    pub fn path(&self) -> String {
        self.path.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn aliases(&self) -> Vec<String> {
        self.aliases.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn resolved(&self) -> bool {
        self.resolved
    }

    #[wasm_bindgen(getter)]
    pub fn ignore_in_edges(&self) -> bool {
        self.ignore_in_edges
    }

    #[wasm_bindgen(getter)]
    pub fn ignore_out_edges(&self) -> bool {
        self.ignore_out_edges
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl NodeData {
    pub fn from_construction_data(data: &GraphConstructionNodeData) -> NodeData {
        NodeData {
            path: data.path.clone(),
            aliases: data.aliases.clone(),
            resolved: data.resolved,
            ignore_in_edges: data.ignore_in_edges,
            ignore_out_edges: data.ignore_out_edges,
        }
    }

    pub fn new_unresolved(path: String) -> NodeData {
        NodeData {
            path,
            aliases: Vec::new(),
            resolved: false,
            ignore_in_edges: false,
            ignore_out_edges: false,
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeStruct {
    #[wasm_bindgen(skip)]
    pub source: NodeData,
    #[wasm_bindgen(skip)]
    pub target: NodeData,
    #[wasm_bindgen(skip)]
    pub edge: EdgeData,
}

#[wasm_bindgen]
impl EdgeStruct {
    #[wasm_bindgen(constructor)]
    pub fn new(source: NodeData, target: NodeData, edge: EdgeData) -> EdgeStruct {
        EdgeStruct {
            source,
            target,
            edge,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn source(&self) -> NodeData {
        self.source.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn target(&self) -> NodeData {
        self.target.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn edge_type(&self) -> String {
        self.edge.edge_type.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn edge_source(&self) -> String {
        self.edge.edge_source.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn implied(&self) -> bool {
        self.edge.implied
    }

    #[wasm_bindgen(getter)]
    pub fn round(&self) -> u8 {
        self.edge.round
    }

    pub fn get_attribute_label(&self, attributes: Vec<String>) -> String {
        self.edge.get_attribute_label(&attributes)
    }

    pub fn matches_edge_filter(&self, edge_types: Option<Vec<String>>) -> bool {
        edge_matches_edge_filter(&self.edge, edge_types.as_ref())
    }

    pub fn is_self_loop(&self) -> bool {
        self.source.path == self.target.path
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}
