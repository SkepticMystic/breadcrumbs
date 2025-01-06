use std::{collections::HashMap, fmt::Debug, path::Path, rc::Rc};

use itertools::Itertools;
use petgraph::{
    graph::{EdgeIndex, NodeIndex},
    stable_graph::EdgeReference,
    visit::EdgeRef,
};
use wasm_bindgen::prelude::*;

use crate::{
    edge_sorting::EdgeSorter,
    graph::{edge_matches_edge_filter_string, NoteGraph},
    graph_construction::GCNodeData,
    utils::{NoteGraphError, Result},
};

pub type NGEdgeIndex = EdgeIndex<u32>;
pub type NGNodeIndex = NodeIndex<u32>;
pub type NGEdgeRef<'a> = EdgeReference<'a, EdgeData, u32>;

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeData {
    #[wasm_bindgen(skip)]
    pub edge_type: Rc<str>,
    #[wasm_bindgen(skip)]
    pub edge_source: Rc<str>,
    pub explicit: bool,
    pub round: u8,
}

#[wasm_bindgen]
impl EdgeData {
    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    #[wasm_bindgen(js_name = edge_type, getter)]
    pub fn get_edge_type(&self) -> String {
        self.edge_type.to_string()
    }

    #[wasm_bindgen(js_name = edge_source, getter)]
    pub fn get_edge_source(&self) -> String {
        self.edge_source.to_string()
    }
}

impl EdgeData {
    pub fn new(edge_type: Rc<str>, edge_source: Rc<str>, explicit: bool, round: u8) -> EdgeData {
        EdgeData {
            edge_type,
            edge_source,
            explicit,
            round,
        }
    }

    pub fn matches_edge_filter_string(&self, edge_types: Option<&Vec<String>>) -> bool {
        edge_matches_edge_filter_string(self, edge_types)
    }

    pub fn get_attribute_label(&self, attributes: &Vec<String>) -> String {
        let mut result = vec![];

        // the mapping that exist on the JS side are as follows
        // "field" | "explicit" | "source" | "implied_kind" | "round"

        // TODO(JS): maybe change the attribute options so that the JS side better matches the data
        for attribute in attributes {
            let data = match attribute.as_str() {
                "field" => Some(("field", self.edge_type.to_string())),
                "explicit" => Some(("explicit", self.explicit.to_string())),
                "source" => {
                    if self.explicit {
                        Some(("source", self.edge_source.to_string()))
                    } else {
                        None
                    }
                }
                "implied_kind" => {
                    if !self.explicit {
                        Some(("implied_kind", self.edge_source.to_string()))
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
    pub fn from_construction_data(data: GCNodeData) -> NodeData {
        NodeData {
            path: data.path,
            aliases: data.aliases,
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

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeStruct {
    #[wasm_bindgen(skip)]
    pub source_index: NGNodeIndex,
    #[wasm_bindgen(skip)]
    pub target_index: NGNodeIndex,
    #[wasm_bindgen(skip)]
    pub edge_index: NGEdgeIndex,
    #[wasm_bindgen(skip)]
    pub edge_type: Rc<str>,
    /// refers to the revision of the graph when this edge was created
    revision: u32,
}

#[wasm_bindgen]
impl EdgeStruct {
    pub fn source_data(&self, graph: &NoteGraph) -> Result<NodeData> {
        Ok(self.source_data_ref(graph)?.clone())
    }

    pub fn target_data(&self, graph: &NoteGraph) -> Result<NodeData> {
        Ok(self.target_data_ref(graph)?.clone())
    }

    pub fn source_path(&self, graph: &NoteGraph) -> Result<String> {
        Ok(self.source_data_ref(graph)?.path.clone())
    }

    pub fn target_path(&self, graph: &NoteGraph) -> Result<String> {
        Ok(self.target_data_ref(graph)?.path.clone())
    }

    pub fn source_resolved(&self, graph: &NoteGraph) -> Result<bool> {
        Ok(self.source_data_ref(graph)?.resolved)
    }

    pub fn target_resolved(&self, graph: &NoteGraph) -> Result<bool> {
        Ok(self.target_data_ref(graph)?.resolved)
    }

    pub fn stringify_target(
        &self,
        graph: &NoteGraph,
        options: &NodeStringifyOptions,
    ) -> Result<String> {
        Ok(options.stringify_node(self.target_data_ref(graph)?))
    }

    pub fn stringify_source(
        &self,
        graph: &NoteGraph,
        options: &NodeStringifyOptions,
    ) -> Result<String> {
        Ok(options.stringify_node(self.source_data_ref(graph)?))
    }

    pub fn edge_data(&self, graph: &NoteGraph) -> Result<EdgeData> {
        Ok(self.edge_data_ref(graph)?.clone())
    }

    #[wasm_bindgen(getter)]
    pub fn edge_type(&self) -> String {
        self.edge_type.to_string()
    }

    pub fn edge_source(&self, graph: &NoteGraph) -> Result<String> {
        Ok(self.edge_data_ref(graph)?.get_edge_source())
    }

    pub fn explicit(&self, graph: &NoteGraph) -> Result<bool> {
        Ok(self.edge_data_ref(graph)?.explicit)
    }

    pub fn round(&self, graph: &NoteGraph) -> Result<u8> {
        Ok(self.edge_data_ref(graph)?.round)
    }

    pub fn get_attribute_label(
        &self,
        graph: &NoteGraph,
        attributes: Vec<String>,
    ) -> Result<String> {
        Ok(self.edge_data_ref(graph)?.get_attribute_label(&attributes))
    }

    pub fn matches_edge_filter(
        &self,
        graph: &NoteGraph,
        edge_types: Option<Vec<String>>,
    ) -> Result<bool> {
        Ok(edge_matches_edge_filter_string(
            self.edge_data_ref(graph)?,
            edge_types.as_ref(),
        ))
    }

    pub fn is_self_loop(&self) -> bool {
        self.source_index == self.target_index
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl EdgeStruct {
    pub fn new(
        source_index: NGNodeIndex,
        target_index: NGNodeIndex,
        edge_index: NGEdgeIndex,
        edge_type: Rc<str>,
        revision: u32,
    ) -> EdgeStruct {
        EdgeStruct {
            source_index,
            target_index,
            edge_index,
            edge_type,
            revision,
        }
    }

    pub fn from_edge_ref(edge_ref: NGEdgeRef, graph: &NoteGraph) -> EdgeStruct {
        let source_index = edge_ref.source();
        let target_index = edge_ref.target();

        EdgeStruct::new(
            source_index,
            target_index,
            edge_ref.id(),
            Rc::clone(&edge_ref.weight().edge_type),
            graph.get_revision(),
        )
    }

    pub fn from_edge_data(
        edge_index: NGEdgeIndex,
        edge_data: &EdgeData,
        graph: &NoteGraph,
    ) -> Option<EdgeStruct> {
        let (source_index, target_index) = graph.graph.edge_endpoints(edge_index)?;

        Some(EdgeStruct::new(
            source_index,
            target_index,
            edge_index,
            Rc::clone(&edge_data.edge_type),
            graph.get_revision(),
        ))
    }

    pub fn edge_data_ref<'a>(&self, graph: &'a NoteGraph) -> Result<&'a EdgeData> {
        self.check_revision(graph)?;
        graph
            .graph
            .edge_weight(self.edge_index)
            .ok_or(NoteGraphError::new("Edge not found"))
    }

    pub fn source_data_ref<'a>(&self, graph: &'a NoteGraph) -> Result<&'a NodeData> {
        self.check_revision(graph)?;
        graph
            .graph
            .node_weight(self.source_index)
            .ok_or(NoteGraphError::new("Source node not found"))
    }

    pub fn target_data_ref<'a>(&self, graph: &'a NoteGraph) -> Result<&'a NodeData> {
        self.check_revision(graph)?;
        graph
            .graph
            .node_weight(self.target_index)
            .ok_or(NoteGraphError::new("Source node not found"))
    }

    pub fn target_path_ref<'a>(&self, graph: &'a NoteGraph) -> Result<&'a str> {
        Ok(&self.target_data_ref(graph)?.path)
    }

    pub fn source_path_ref<'a>(&self, graph: &'a NoteGraph) -> Result<&'a str> {
        Ok(&self.source_data_ref(graph)?.path)
    }

    pub fn check_revision(&self, graph: &NoteGraph) -> Result<()> {
        match graph.get_revision() == self.revision {
            true => Ok(()),
            false => Err(NoteGraphError::new(&format!(
                "Revision mismatch. Edge was created in revision {}, but current revision is {}",
                self.revision,
                graph.get_revision()
            ))),
        }
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
    pub fn get_edges(&self) -> Vec<EdgeStruct> {
        self.edges.clone()
    }

    pub fn get_sorted_edges(
        &self,
        graph: &NoteGraph,
        sorter: &EdgeSorter,
    ) -> Result<Vec<EdgeStruct>> {
        let mut edges = self.edges.clone();
        sorter.sort_edges(graph, &mut edges)?;

        Ok(edges)
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
    pub fn new() -> EdgeList {
        EdgeList { edges: Vec::new() }
    }

    pub fn from_vec(edges: Vec<EdgeStruct>) -> EdgeList {
        EdgeList { edges }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq, Default)]
pub struct GroupedEdgeList {
    #[wasm_bindgen(skip)]
    pub edges: HashMap<Rc<str>, EdgeList>,
}

#[wasm_bindgen]
impl GroupedEdgeList {
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
    ) -> Result<Option<Vec<EdgeStruct>>> {
        let edges = self.edges.get(edge_type);

        match edges {
            Some(edge_list) => Ok(Some(edge_list.get_sorted_edges(graph, sorter)?)),
            None => Ok(None),
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

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
        let edge_type = edge_struct.edge_type.clone();
        let edge_list = self.edges.entry(edge_type).or_default();
        edge_list.edges.push(edge_struct);
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
