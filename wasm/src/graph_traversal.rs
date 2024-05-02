use std::collections::HashSet;

use petgraph::{
    stable_graph::{EdgeIndex, EdgeReference, NodeIndex},
    visit::EdgeRef,
};
use wasm_bindgen::prelude::*;
use web_time::Instant;

use crate::{
    graph::{EdgeData, EdgeStruct, NoteGraph},
    utils::{
        self, BreadthFirstTraversalDataStructure, DepthFirstTraversalDataStructure,
        GraphTraversalDataStructure, NoteGraphError, Result,
    },
};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalOptions {
    entry_nodes: Vec<String>,
    // if this is None, all edge types will be traversed
    edge_types: Option<Vec<String>>,
    max_depth: u32,
    /// if true, multiple traversals - one for each edge type - will be performed and the results will be combined
    /// if false, one traversal over all edge types will be performed
    separate_edges: bool,
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

    #[wasm_bindgen(getter)]
    pub fn entry_nodes(&self) -> Vec<String> {
        self.entry_nodes.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn edge_types(&self) -> Option<Vec<String>> {
        self.edge_types.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn max_depth(&self) -> u32 {
        self.max_depth
    }

    #[wasm_bindgen(getter)]
    pub fn separate_edges(&self) -> bool {
        self.separate_edges
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        format!("{:#?}", self)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Path {
    edges: Vec<EdgeStruct>,
}

#[wasm_bindgen]
impl Path {
    pub fn length(&self) -> usize {
        self.edges.len()
    }

    pub fn truncate(&mut self, limit: usize) {
        self.edges.truncate(limit);
    }

    #[wasm_bindgen(getter)]
    pub fn edges(&self) -> Vec<EdgeStruct> {
        self.edges.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn reverse_edges(&self) -> Vec<EdgeStruct> {
        self.edges.iter().rev().cloned().collect()
    }

    pub fn equals(&self, other: &Path) -> bool {
        self.edges == other.edges
    }

    pub fn get_first_target(&self) -> Option<String> {
        self.edges.first().map(|edge| edge.target.path.clone())
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl Path {
    pub fn new(edges: Vec<EdgeStruct>) -> Path {
        Path { edges }
    }

    pub fn new_start(edge: EdgeStruct) -> Path {
        Path { edges: vec![edge] }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct RecTraversalData {
    // the edge struct that was traversed
    edge: EdgeStruct,
    // the depth of the node in the traversal
    depth: u32,
    // the number of total children of the node, so also children of children
    number_of_children: u32,
    // the children of the node
    children: Vec<RecTraversalData>,
}

#[wasm_bindgen]
impl RecTraversalData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        edge: EdgeStruct,
        depth: u32,
        number_of_children: u32,
        children: Vec<RecTraversalData>,
    ) -> RecTraversalData {
        RecTraversalData {
            edge,
            depth,
            number_of_children,
            children,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn edge(&self) -> EdgeStruct {
        self.edge.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn depth(&self) -> u32 {
        self.depth
    }

    #[wasm_bindgen(getter)]
    pub fn children(&self) -> Vec<RecTraversalData> {
        self.children.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_children(&mut self, children: Vec<RecTraversalData>) {
        self.children = children;
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl RecTraversalData {
    fn to_paths(&self) -> Vec<Path> {
        let mut paths = Vec::new();

        for child in &self.children {
            let mut child_paths = child.to_paths();

            for path in &mut child_paths {
                path.edges.insert(0, self.edge.clone());
            }

            paths.extend(child_paths);
        }

        if paths.is_empty() {
            paths.push(Path::new_start(self.edge.clone()));
        }

        paths
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct RecTraversalResult {
    data: Vec<RecTraversalData>,
    node_count: u32,
    max_depth: u32,
    traversal_time: u64,
}

#[wasm_bindgen]
impl RecTraversalResult {
    #[wasm_bindgen(constructor)]
    pub fn new(
        data: Vec<RecTraversalData>,
        node_count: u32,
        max_depth: u32,
        traversal_time: u64,
    ) -> RecTraversalResult {
        RecTraversalResult {
            data,
            node_count,
            max_depth,
            traversal_time,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<RecTraversalData> {
        self.data.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn node_count(&self) -> u32 {
        self.node_count
    }

    #[wasm_bindgen(getter)]
    pub fn max_depth(&self) -> u32 {
        self.max_depth
    }

    #[wasm_bindgen(getter)]
    pub fn traversal_time(&self) -> u64 {
        self.traversal_time
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        format!("{:#?}", self)
    }

    pub fn to_paths(&self) -> Vec<Path> {
        let mut paths = Vec::new();

        for datum in &self.data {
            paths.extend(datum.to_paths());
        }

        paths.sort_by(|a, b| {
            let a_len = a.edges.len();
            let b_len = b.edges.len();

            a_len.cmp(&b_len)
        });

        paths
    }
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn rec_traverse(&self, options: TraversalOptions) -> Result<RecTraversalResult> {
        let now = Instant::now();

        let mut result = Vec::new();

        let edge_types = options.edge_types.unwrap_or(self.edge_types());

        for entry_node in &options.entry_nodes {
            let start_node = self
                .int_get_node_index(&entry_node)
                .ok_or(NoteGraphError::new("Node not found"))?;

            let start_node_weight = self.int_get_node_weight(start_node)?;

            for edge in self.graph.edges(start_node) {
                if !self.int_edge_matches_edge_filter(edge.weight(), Some(&edge_types)) {
                    continue;
                }

                let target = edge.target();

                let edge_struct = EdgeStruct::new(
                    start_node_weight.clone(),
                    self.int_get_node_weight(target)?.clone(),
                    edge.weight().clone(),
                );

                if options.separate_edges {
                    result.push(self.int_rec_traverse(
                        target,
                        edge_struct.clone(),
                        Some(&vec![edge_struct.edge_type()]),
                        0,
                        options.max_depth,
                    )?);
                } else {
                    result.push(self.int_rec_traverse(
                        target,
                        edge_struct,
                        Some(&edge_types),
                        0,
                        options.max_depth,
                    )?);
                }
            }
        }

        let node_count = self.int_rec_count_children(&mut result);
        let max_depth = self.int_rec_max_depth(&result);

        let total_elapsed = now.elapsed();

        Ok(RecTraversalResult::new(
            result,
            node_count,
            max_depth,
            total_elapsed.as_millis() as u64,
        ))
    }
}

impl NoteGraph {
    /// Recursively traverses the graph using DFS and builds a tree structure.
    ///
    /// Will return an error if the node weight for any node along the traversal is not found.
    pub fn int_rec_traverse(
        &self,
        node: NodeIndex<u32>,
        edge: EdgeStruct,
        edge_types: Option<&Vec<String>>,
        depth: u32,
        max_depth: u32,
    ) -> Result<RecTraversalData> {
        let mut new_children = Vec::new();

        if depth < max_depth {
            for outgoing_edge in self.graph.edges(node) {
                let edge_data = outgoing_edge.weight();

                if self.int_edge_matches_edge_filter(&edge_data, edge_types) {
                    let target = outgoing_edge.target();

                    // assert!(*self.int_get_node_weight(node).unwrap() == edge.target);

                    let edge_struct = EdgeStruct::new(
                        edge.target.clone(),
                        self.int_get_node_weight(target)?.clone(),
                        edge_data.clone(),
                    );

                    new_children.push(self.int_rec_traverse(
                        target,
                        edge_struct,
                        edge_types,
                        depth + 1,
                        max_depth,
                    )?)
                }
            }
        }

        Ok(RecTraversalData::new(edge, depth, 0, new_children))
    }

    pub fn int_rec_count_children(&self, data: &mut Vec<RecTraversalData>) -> u32 {
        let mut total_children = 0;

        for datum in data.iter_mut() {
            datum.number_of_children = self.int_rec_count_children(&mut datum.children);
            total_children += 1 + datum.number_of_children;
        }

        total_children
    }

    pub fn int_rec_max_depth(&self, data: &Vec<RecTraversalData>) -> u32 {
        data.iter()
            .map(|datum| u32::max(self.int_rec_max_depth(&datum.children), datum.depth))
            .max()
            .unwrap_or(0)
    }

    pub fn int_traverse_basic(
        &self,
        options: &TraversalOptions,
    ) -> Result<(
        Vec<(NodeIndex<u32>, u32)>,
        Vec<(EdgeIndex<u32>, EdgeReference<EdgeData, u32>)>,
    )> {
        let entry_nodes = options
            .entry_nodes
            .iter()
            .map(|node| {
                self.int_get_node_index(node)
                    .ok_or(NoteGraphError::new("Node not found"))
            })
            .into_iter()
            .collect::<Result<Vec<NodeIndex<u32>>>>()?;

        if options.separate_edges {
            let mut node_list = Vec::new();
            let mut edge_list = Vec::new();

            let all_edge_types = self.edge_types();
            let edge_types: &Vec<String> = options.edge_types.as_ref().unwrap_or(&all_edge_types);

            for edge_type in edge_types {
                let (nodes, edges) = self.int_traverse_depth_first(
                    entry_nodes.clone(),
                    Some(&vec![edge_type.clone()]),
                    options.max_depth,
                    |_, depth| depth,
                    |edge| edge,
                );

                node_list.extend(nodes);
                edge_list.extend(edges);
            }

            Ok((node_list, edge_list))
        } else {
            Ok(self.int_traverse_depth_first(
                entry_nodes,
                options.edge_types.as_ref(),
                options.max_depth,
                |_, depth| depth,
                |edge| edge,
            ))
        }
    }

    /// Traverses the tree in a depth first manner and calls the provided callbacks for each node and edge.
    /// The depth metric **might not** accurately represent the intuitive understanding of depth on a graph.
    /// A list of tuples of node indices and the result of the node callback and a list of tuples of edge indices and the result of the edge callback are returned.
    /// These lists are ordered by the order in which the nodes and edges were visited.
    /// Each node and edge is only visited once.
    /// At the depth limit, edges are only added if the target node is already in the depth map.
    pub fn int_traverse_depth_first<'a, T, S>(
        &'a self,
        entry_nodes: Vec<NodeIndex<u32>>,
        edge_types: Option<&Vec<String>>,
        max_depth: u32,
        node_callback: fn(NodeIndex<u32>, u32) -> T,
        edge_callback: fn(EdgeReference<'a, EdgeData, u32>) -> S,
    ) -> (Vec<(NodeIndex<u32>, T)>, Vec<(EdgeIndex<u32>, S)>) {
        let mut data_structure = DepthFirstTraversalDataStructure::new();

        self.int_traverse_generic(
            &mut data_structure,
            entry_nodes,
            edge_types,
            max_depth,
            node_callback,
            edge_callback,
        )
    }

    /// Traverses the tree in a breadth first manner and calls the provided callbacks for each node and edge.
    /// The depth metric accurately represent the intuitive understanding of depth on a graph.
    /// A list of tuples of node indices and the result of the node callback and a list of tuples of edge indices and the result of the edge callback are returned.
    /// These lists are ordered by the order in which the nodes and edges were visited.
    /// Each node and edge is only visited once.
    /// At the depth limit, edges are only added if the target node is already in the depth map.
    pub fn int_traverse_breadth_first<'a, T, S>(
        &'a self,
        entry_nodes: Vec<NodeIndex<u32>>,
        edge_types: Option<&Vec<String>>,
        max_depth: u32,
        node_callback: fn(NodeIndex<u32>, u32) -> T,
        edge_callback: fn(EdgeReference<'a, EdgeData, u32>) -> S,
    ) -> (Vec<(NodeIndex<u32>, T)>, Vec<(EdgeIndex<u32>, S)>) {
        let mut data_structure = BreadthFirstTraversalDataStructure::new();

        self.int_traverse_generic(
            &mut data_structure,
            entry_nodes,
            edge_types,
            max_depth,
            node_callback,
            edge_callback,
        )
    }

    pub fn int_traverse_generic<'a, T, S>(
        &'a self,
        traversal_data_structure: &mut impl GraphTraversalDataStructure<(NodeIndex<u32>, u32)>,
        entry_nodes: Vec<NodeIndex<u32>>,
        edge_types: Option<&Vec<String>>,
        max_depth: u32,
        node_callback: fn(NodeIndex<u32>, u32) -> T,
        edge_callback: fn(EdgeReference<'a, EdgeData, u32>) -> S,
    ) -> (Vec<(NodeIndex<u32>, T)>, Vec<(EdgeIndex<u32>, S)>) {
        let mut node_list: Vec<(NodeIndex<u32>, T)> = Vec::new();
        let mut edge_list: Vec<(EdgeIndex<u32>, S)> = Vec::new();
        let mut visited_nodes: HashSet<NodeIndex<u32>> = HashSet::new();

        for node in entry_nodes {
            node_list.push((node, node_callback(node, 0)));
            visited_nodes.insert(node);
            traversal_data_structure.push((node, 0));
        }

        while !traversal_data_structure.is_empty() {
            let (current_node, current_depth) = traversal_data_structure.pop().unwrap();
            let at_depth_limit = current_depth >= max_depth;

            for edge in self.graph.edges(current_node) {
                let target = edge.target();
                let edge_data = edge.weight();

                if self.int_edge_matches_edge_filter(edge_data, edge_types) {
                    let already_visited = visited_nodes.contains(&target);

                    // we only add the edge if we are not at the depth limit or if we are at the depth limit and the target node is already in the depth map
                    // this captures all the outgoing edges from the nodes at the depth limit to nodes already present in the depth map
                    if !at_depth_limit || (at_depth_limit && already_visited) {
                        edge_list.push((edge.id(), edge_callback(edge)));
                    }

                    // we only insert the new node when we are not at the depth limit and the node is not already in the depth map
                    if !at_depth_limit && !already_visited {
                        node_list.push((target, node_callback(target, current_depth + 1)));
                        visited_nodes.insert(target);
                        traversal_data_structure.push((target, current_depth + 1));
                    }
                }
            }
        }

        (node_list, edge_list)
    }
}
