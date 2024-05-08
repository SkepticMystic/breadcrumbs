use std::{collections::HashMap, fmt::Debug};

use itertools::Itertools;
use petgraph::{
    graph::{EdgeIndex, NodeIndex},
    stable_graph::EdgeReference,
    visit::EdgeRef,
};
use wasm_bindgen::prelude::*;

use crate::{
    edge_sorting::EdgeSorter,
    graph::{edge_matches_edge_filter, NoteGraph},
    graph_construction::GraphConstructionNodeData,
};

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
    pub explicit: bool,
    #[wasm_bindgen(skip)]
    pub round: u8,
}

#[wasm_bindgen]
impl EdgeData {
    #[wasm_bindgen(constructor)]
    pub fn new(edge_type: String, edge_source: String, explicit: bool, round: u8) -> EdgeData {
        EdgeData {
            edge_type,
            edge_source,
            explicit,
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
    pub fn explicit(&self) -> bool {
        self.explicit
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
    pub fn matches_edge_filter(&self, edge_types: Option<&Vec<String>>) -> bool {
        edge_matches_edge_filter(&self, edge_types)
    }

    pub fn get_attribute_label(&self, attributes: &Vec<String>) -> String {
        let mut result = vec![];

        // the mapping that exist on the JS side are as follows
        // "field" | "explicit" | "source" | "implied_kind" | "round"

        // TODO(JS): maybe change the attribute options so that the JS side better matches the data
        for attribute in attributes {
            let data = match attribute.as_str() {
                "field" => Some(("field", self.edge_type.clone())),
                "explicit" => Some(("explicit", self.explicit.to_string())),
                "source" => {
                    if self.explicit {
                        Some(("source", self.edge_source.clone()))
                    } else {
                        None
                    }
                }
                "implied_kind" => {
                    if !self.explicit {
                        Some(("implied_kind", self.edge_source.clone()))
                    } else {
                        None
                    }
                }
                "round" => Some(("round", self.round.to_string())),
                _ => None,
            };

            if let Some(data) = data {
                result.push(data);
            }
        }

        if result.len() == 1 {
            result[0].1.clone()
        } else {
            result.iter().map(|x| format!("{}={}", x.0, x.1)).join(" ")
        }
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
    pub source_index: NGNodeIndex,
    #[wasm_bindgen(skip)]
    pub target: NodeData,
    #[wasm_bindgen(skip)]
    pub target_index: NGNodeIndex,
    #[wasm_bindgen(skip)]
    pub edge: EdgeData,
    #[wasm_bindgen(skip)]
    pub edge_index: NGEdgeIndex,
}

#[wasm_bindgen]
impl EdgeStruct {
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
    pub fn explicit(&self) -> bool {
        self.edge.explicit
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

impl EdgeStruct {
    pub fn new(
        source: NodeData,
        source_index: NGNodeIndex,
        target: NodeData,
        target_index: NGNodeIndex,
        edge: EdgeData,
        edge_index: NGEdgeIndex,
    ) -> EdgeStruct {
        EdgeStruct {
            source,
            source_index,
            target,
            target_index,
            edge,
            edge_index,
        }
    }

    pub fn from_edge_ref(
        edge_ref: NGEdgeRef,
        graph: &crate::graph::NoteGraph,
    ) -> Option<EdgeStruct> {
        let source_index = edge_ref.source();
        let target_index = edge_ref.target();
        let source = graph.graph.node_weight(source_index)?.clone();
        let target = graph.graph.node_weight(target_index)?.clone();

        Some(EdgeStruct::new(
            source,
            source_index,
            target,
            target_index,
            edge_ref.weight().clone(),
            edge_ref.id(),
        ))
    }

    pub fn from_edge_data(
        edge_index: NGEdgeIndex,
        edge_data: EdgeData,
        graph: &crate::graph::NoteGraph,
    ) -> Option<EdgeStruct> {
        let (source_index, target_index) = graph.graph.edge_endpoints(edge_index)?;
        let source = graph.graph.node_weight(source_index)?.clone();
        let target = graph.graph.node_weight(target_index)?.clone();

        Some(EdgeStruct::new(
            source,
            source_index,
            target,
            target_index,
            edge_data,
            edge_index,
        ))
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeList {
    #[wasm_bindgen(skip)]
    pub edges: Vec<EdgeStruct>,
}

#[wasm_bindgen]
impl EdgeList {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EdgeList {
        EdgeList { edges: Vec::new() }
    }

    pub fn get_edges(&self) -> Vec<EdgeStruct> {
        self.edges.clone()
    }

    pub fn get_sorted_edges(&self, graph: &NoteGraph, sorter: &EdgeSorter) -> Vec<EdgeStruct> {
        let mut edges = self.edges.clone();
        sorter.sort_edges(graph, &mut edges);

        edges
    }

    pub fn group_by_type(&self) -> GroupedEdgeList {
        let mut grouped_edges = GroupedEdgeList::new();

        for edge in &self.edges {
            grouped_edges.add_edge(edge.clone());
        }

        grouped_edges
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl EdgeList {
    pub fn from_vec(edges: Vec<EdgeStruct>) -> EdgeList {
        EdgeList { edges }
    }
}

#[wasm_bindgen]
pub struct GroupedEdgeList {
    #[wasm_bindgen(skip)]
    pub edges: HashMap<String, EdgeList>,
}

#[wasm_bindgen]
impl GroupedEdgeList {
    pub fn new() -> GroupedEdgeList {
        GroupedEdgeList {
            edges: HashMap::new(),
        }
    }

    pub fn from_edge_list(edge_list: EdgeList) -> GroupedEdgeList {
        GroupedEdgeList::from_vec(edge_list.edges)
    }

    pub fn from_vec(edge_list: Vec<EdgeStruct>) -> GroupedEdgeList {
        let mut grouped_edges = GroupedEdgeList::new();

        for edge in edge_list {
            grouped_edges.add_edge(edge);
        }

        grouped_edges
    }

    pub fn add_edge(&mut self, edge_struct: EdgeStruct) {
        let edge_type = edge_struct.edge.edge_type.clone();
        let edge_list = self.edges.entry(edge_type).or_insert(EdgeList::new());
        edge_list.edges.push(edge_struct);
    }

    pub fn get_edges(&self, edge_type: &str) -> Option<Vec<EdgeStruct>> {
        self.edges
            .get(edge_type)
            .map(|edge_list| edge_list.get_edges())
    }

    pub fn get_sorted_edges(
        &self,
        edge_type: &str,
        graph: &NoteGraph,
        sorter: &EdgeSorter,
    ) -> Option<Vec<EdgeStruct>> {
        self.edges
            .get(edge_type)
            .map(|edge_list| edge_list.get_sorted_edges(graph, sorter))
    }
}
