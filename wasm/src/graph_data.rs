use std::{collections::HashMap, fmt::Debug, path::Path};

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
    graph_construction::GCNodeData,
};

pub type NGEdgeIndex = EdgeIndex<u32>;
pub type NGNodeIndex = NodeIndex<u32>;
pub type NGEdgeRef<'a> = EdgeReference<'a, EdgeData, u32>;

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeData {
    #[wasm_bindgen(getter_with_clone)]
    pub edge_type: String,
    #[wasm_bindgen(getter_with_clone)]
    pub edge_source: String,
    pub explicit: bool,
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

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl EdgeData {
    pub fn matches_edge_filter(&self, edge_types: Option<&Vec<String>>) -> bool {
        edge_matches_edge_filter(self, edge_types)
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

        match result.len() {
            0 => "".to_string(),
            1 => result[0].1.clone(),
            _ => result.iter().map(|x| format!("{}={}", x.0, x.1)).join(" "),
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
        format!("{:#?}", self)
    }
}

impl NodeData {
    pub fn from_construction_data(data: &GCNodeData) -> NodeData {
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

    pub fn override_with_construction_data(&mut self, data: &GCNodeData) {
        assert_eq!(
            self.path, data.path,
            "Can not override with data for another node."
        );
        self.aliases = data.aliases.clone();
        self.resolved = data.resolved;
        self.ignore_in_edges = data.ignore_in_edges;
        self.ignore_out_edges = data.ignore_out_edges;
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeStruct {
    #[wasm_bindgen(getter_with_clone)]
    pub source: NodeData,
    #[wasm_bindgen(skip)]
    pub source_index: NGNodeIndex,
    #[wasm_bindgen(getter_with_clone)]
    pub target: NodeData,
    #[wasm_bindgen(skip)]
    pub target_index: NGNodeIndex,
    #[wasm_bindgen(getter_with_clone)]
    pub edge: EdgeData,
    #[wasm_bindgen(skip)]
    pub edge_index: NGEdgeIndex,
}

#[wasm_bindgen]
impl EdgeStruct {
    #[wasm_bindgen(getter)]
    pub fn source_path(&self) -> String {
        self.source.path.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn target_path(&self) -> String {
        self.target.path.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn source_resolved(&self) -> bool {
        self.source.resolved
    }

    #[wasm_bindgen(getter)]
    pub fn target_resolved(&self) -> bool {
        self.target.resolved
    }

    pub fn stringify_target(&self, options: &NodeStringifyOptions) -> String {
        options.stringify_node(&self.target)
    }

    pub fn stringify_source(&self, options: &NodeStringifyOptions) -> String {
        options.stringify_node(&self.source)
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
#[derive(Clone, Debug, PartialEq, Default)]
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
#[derive(Clone, Debug, PartialEq, Default)]
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
        let edge_list = self.edges.entry(edge_type).or_default();
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

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct NodeStringifyOptions {
    extension: bool,
    folder: bool,
    alias: bool,
    trim_basename_delimiter: Option<String>,
}

#[wasm_bindgen]
impl NodeStringifyOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(
        extension: bool,
        folder: bool,
        alias: bool,
        trim_basename_delimiter: Option<String>,
    ) -> NodeStringifyOptions {
        NodeStringifyOptions {
            extension,
            folder,
            alias,
            trim_basename_delimiter,
        }
    }
}

impl NodeStringifyOptions {
    pub fn stringify_node(&self, node: &NodeData) -> String {
        if self.alias && !node.aliases.is_empty() {
            node.aliases.first().unwrap().clone()
        } else if self.trim_basename_delimiter.is_some() {
            node.path.clone()
        } else {
            let mut path = Path::new(&node.path);
            if !self.folder {
                path = Path::new(path.file_name().unwrap());
            }

            if !self.extension {
                path.with_extension("").as_string()
            } else {
                path.as_string()
            }
        }
    }
}

trait AsString {
    fn as_string(&self) -> String;
}

impl AsString for Path {
    fn as_string(&self) -> String {
        String::from(self.to_string_lossy())
    }
}
