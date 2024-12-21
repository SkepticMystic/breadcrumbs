use std::collections::HashSet;

use itertools::Itertools;
use petgraph::visit::EdgeRef;
use wasm_bindgen::prelude::*;
use web_time::Instant;

use crate::{
    edge_sorting::EdgeSorter,
    graph::NoteGraph,
    graph_data::{EdgeStruct, NGEdgeIndex, NGEdgeRef, NGNodeIndex},
    utils::{
        BreadthFirstTraversalDataStructure, DepthFirstTraversalDataStructure,
        GraphTraversalDataStructure, NoteGraphError, Result,
    },
};

const TRAVERSAL_COUNT_LIMIT: u32 = 10_000;

pub type NodeVec<T> = Vec<(NGNodeIndex, T)>;
pub type EdgeVec<T> = Vec<(NGEdgeIndex, T)>;
pub type NodeEdgeVec<N, E> = (NodeVec<N>, EdgeVec<E>);

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
#[derive(Clone, Debug, PartialEq)]
pub struct Path {
    #[wasm_bindgen(getter_with_clone)]
    pub edges: Vec<EdgeStruct>,
}

#[wasm_bindgen]
impl Path {
    pub fn length(&self) -> usize {
        self.edges.len()
    }

    pub fn truncate(&self, limit: usize) -> Path {
        let mut copy = self.clone();
        copy.edges.truncate(limit);
        copy
    }

    #[wasm_bindgen(getter)]
    pub fn reverse_edges(&self) -> Vec<EdgeStruct> {
        self.edges.iter().rev().cloned().collect()
    }

    pub fn equals(&self, other: &Path) -> bool {
        self.edges == other.edges
    }

    pub fn get_first_target(&self, graph: &NoteGraph) -> Option<String> {
        self.edges.first().map(|edge| edge.target_path(graph))
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
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
#[derive(Clone, Debug, PartialEq)]
pub struct PathList {
    paths: Vec<Path>,
}

#[wasm_bindgen]
impl PathList {
    pub fn to_paths(&self) -> Vec<Path> {
        self.paths.clone()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    pub fn select(&self, selection: String) -> PathList {
        match selection.as_str() {
            "shortest" => self.shortest(),
            "longest" => self.longest(),
            _ => self.clone(),
        }
    }

    pub fn max_depth(&self) -> usize {
        self.paths
            .iter()
            .map(|path| path.length())
            .max()
            .unwrap_or(0)
    }

    pub fn process(&self, graph: &NoteGraph, depth: usize) -> Vec<Path> {
        self.paths
            .iter()
            .map(|path| path.truncate(depth))
            .sorted_by(|a, b| {
                let a_len = a.edges.len();
                let b_len = b.edges.len();

                a_len
                    .cmp(&b_len)
                    .then_with(|| a.get_first_target(graph).cmp(&b.get_first_target(graph)))
            })
            .dedup()
            .collect_vec()
    }
}

impl PathList {
    /// creates new path list, assumes that the paths are already sorted by length
    pub fn new(paths: Vec<Path>) -> PathList {
        PathList { paths }
    }

    pub fn shortest(&self) -> PathList {
        if let Some(shortest) = self.paths.first() {
            PathList::new(vec![shortest.clone()])
        } else {
            PathList::new(Vec::new())
        }
    }

    pub fn longest(&self) -> PathList {
        if let Some(longest) = self.paths.last() {
            PathList::new(vec![longest.clone()])
        } else {
            PathList::new(Vec::new())
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct RecTraversalData {
    /// the edge struct that was traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge: EdgeStruct,
    /// the depth of the node in the traversal
    pub depth: u32,
    /// the number of total children of the node, so also children of children
    pub number_of_children: u32,
    /// the children of the node
    #[wasm_bindgen(getter_with_clone)]
    pub children: Vec<RecTraversalData>,
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

    pub fn rec_sort_children(&mut self, graph: &NoteGraph, sorter: &EdgeSorter) {
        for child in &mut self.children {
            child.rec_sort_children(graph, sorter);
        }

        sorter.sort_traversal_data(graph, &mut self.children);
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
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
    #[wasm_bindgen(getter_with_clone)]
    pub data: Vec<RecTraversalData>,
    pub node_count: u32,
    pub max_depth: u32,
    pub traversal_time: u64,
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

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    pub fn to_paths(&self) -> PathList {
        let mut paths = Vec::new();

        for datum in &self.data {
            paths.extend(datum.to_paths());
        }

        paths.sort_by(|a, b| {
            let a_len = a.edges.len();
            let b_len = b.edges.len();

            a_len.cmp(&b_len)
        });

        PathList::new(paths)
    }

    /// Flattens the traversal data by removing the tree structure and deduplicating the edges by their target_path
    pub fn flatten(&mut self, graph: &NoteGraph) {
        let mut data = Vec::new();

        for datum in self.data.drain(..) {
            rec_flatten_traversal_data(datum, &mut data);
        }

        data.dedup_by(|a, b| a.edge.target_path(graph) == b.edge.target_path(graph));

        self.data = data;
    }

    pub fn sort(&mut self, graph: &NoteGraph, sorter: &EdgeSorter) {
        for datum in &mut self.data {
            datum.rec_sort_children(graph, sorter);
        }

        sorter.sort_traversal_data(graph, &mut self.data);
    }

    pub fn to_flat(&self) -> FlatRecTraversalResult {
        FlatRecTraversalResult::from_rec_traversal_result(self.clone())
    }
}

fn rec_flatten_traversal_data(mut data: RecTraversalData, result: &mut Vec<RecTraversalData>) {
    for child in data.children.drain(..) {
        rec_flatten_traversal_data(child, result);
    }

    result.push(data);
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct FlatRecTraversalData {
    /// the edge struct that was traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge: EdgeStruct,
    /// the depth of the node in the traversal
    pub depth: u32,
    /// the number of total children of the node, so also children of children
    pub number_of_children: u32,
    /// the children of the node
    #[wasm_bindgen(getter_with_clone)]
    pub children: Vec<usize>,
}

impl FlatRecTraversalData {
    pub fn new(
        edge: EdgeStruct,
        depth: u32,
        number_of_children: u32,
        children: Vec<usize>,
    ) -> FlatRecTraversalData {
        FlatRecTraversalData {
            edge,
            depth,
            number_of_children,
            children,
        }
    }
}

#[wasm_bindgen]
impl FlatRecTraversalData {
    pub fn get_attribute_label(&self, graph: &NoteGraph, attributes: Vec<String>) -> String {
        self.edge.get_attribute_label(graph, attributes)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct FlatRecTraversalResult {
    #[wasm_bindgen(getter_with_clone)]
    pub data: Vec<FlatRecTraversalData>,
    pub node_count: u32,
    pub max_depth: u32,
    pub traversal_time: u64,
    #[wasm_bindgen(getter_with_clone)]
    pub entry_nodes: Vec<usize>,
}

impl FlatRecTraversalResult {
    pub fn new(
        data: Vec<FlatRecTraversalData>,
        node_count: u32,
        max_depth: u32,
        traversal_time: u64,
        entry_nodes: Vec<usize>,
    ) -> FlatRecTraversalResult {
        FlatRecTraversalResult {
            data,
            node_count,
            max_depth,
            traversal_time,
            entry_nodes,
        }
    }

    pub fn from_rec_traversal_result(result: RecTraversalResult) -> FlatRecTraversalResult {
        let mut flat_data = Vec::new();
        let mut entry_nodes = Vec::new();

        for datum in result.data {
            entry_nodes.push(rec_flatten_traversal_data_to_flat(datum, &mut flat_data));
        }

        FlatRecTraversalResult::new(
            flat_data,
            result.node_count,
            result.max_depth,
            result.traversal_time,
            entry_nodes,
        )
    }
}

#[wasm_bindgen]
impl FlatRecTraversalResult {
    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

fn rec_flatten_traversal_data_to_flat(
    mut data: RecTraversalData,
    result: &mut Vec<FlatRecTraversalData>,
) -> usize {
    let children = data
        .children
        .drain(..)
        .map(|datum| rec_flatten_traversal_data_to_flat(datum, result))
        .collect();

    result.push(FlatRecTraversalData::new(
        data.edge,
        data.depth,
        data.number_of_children,
        children,
    ));
    result.len() - 1
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn rec_traverse(&self, options: TraversalOptions) -> Result<RecTraversalResult> {
        let now = Instant::now();

        let mut result = Vec::new();

        let edge_types = options.edge_types.unwrap_or(self.edge_types());

        let mut traversal_count = 0;

        for entry_node in &options.entry_nodes {
            let start_node = self
                .int_get_node_index(entry_node)
                .ok_or(NoteGraphError::new("Node not found"))?;

            for edge in self.graph.edges(start_node) {
                if !self.int_edge_matches_edge_filter(edge.weight(), Some(&edge_types)) {
                    continue;
                }

                let target = edge.target();

                let edge_struct = EdgeStruct::new(
                    start_node,
                    target,
                    edge.id(),
                    edge.weight().edge_type.clone(),
                );

                traversal_count += 1;

                if options.separate_edges {
                    result.push(self.int_rec_traverse(
                        target,
                        edge_struct.clone(),
                        Some(&vec![edge_struct.edge_type]),
                        0,
                        options.max_depth,
                        &mut traversal_count,
                    )?);
                } else {
                    result.push(self.int_rec_traverse(
                        target,
                        edge_struct,
                        Some(&edge_types),
                        0,
                        options.max_depth,
                        &mut traversal_count,
                    )?);
                }
            }
        }

        let node_count = NoteGraph::int_rec_traversal_data_count_children(&mut result);
        let max_depth = NoteGraph::int_rec_traversal_data_max_depth(&result);

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
        node: NGNodeIndex,
        edge: EdgeStruct,
        edge_types: Option<&Vec<String>>,
        depth: u32,
        max_depth: u32,
        traversal_count: &mut u32,
    ) -> Result<RecTraversalData> {
        let mut new_children = Vec::new();

        if depth < max_depth {
            for outgoing_edge in self.graph.edges(node) {
                let edge_data = outgoing_edge.weight();

                if self.int_edge_matches_edge_filter(edge_data, edge_types) {
                    let target = outgoing_edge.target();

                    // assert!(*self.int_get_node_weight(node).unwrap() == edge.target);

                    let edge_struct = EdgeStruct::new(
                        edge.target_index,
                        target,
                        outgoing_edge.id(),
                        edge_data.edge_type.clone(),
                    );

                    *traversal_count += 1;

                    if *traversal_count > TRAVERSAL_COUNT_LIMIT {
                        return Err(NoteGraphError::new("Traversal exceeded limit of 10,000 nodes. Try decreasing the max depth."));
                    }

                    new_children.push(self.int_rec_traverse(
                        target,
                        edge_struct,
                        edge_types,
                        depth + 1,
                        max_depth,
                        traversal_count,
                    )?)
                }
            }
        }

        Ok(RecTraversalData::new(edge, depth, 0, new_children))
    }

    pub fn int_rec_traversal_data_count_children(data: &mut [RecTraversalData]) -> u32 {
        let mut total_children = 0;

        for datum in data.iter_mut() {
            datum.number_of_children =
                NoteGraph::int_rec_traversal_data_count_children(&mut datum.children);
            total_children += 1 + datum.number_of_children;
        }

        total_children
    }

    pub fn int_rec_traversal_data_max_depth(data: &[RecTraversalData]) -> u32 {
        data.iter()
            .map(|datum| {
                u32::max(
                    NoteGraph::int_rec_traversal_data_max_depth(&datum.children),
                    datum.depth,
                )
            })
            .max()
            .unwrap_or(0)
    }

    pub fn int_traverse_basic(
        &self,
        options: &TraversalOptions,
    ) -> Result<NodeEdgeVec<u32, NGEdgeRef>> {
        let entry_nodes = options
            .entry_nodes
            .iter()
            .map(|node| {
                self.int_get_node_index(node)
                    .ok_or(NoteGraphError::new("Node not found"))
            })
            .collect::<Result<Vec<NGNodeIndex>>>()?;

        if options.separate_edges {
            let mut node_list = Vec::new();
            let mut edge_list = Vec::new();

            let all_edge_types = self.edge_types();
            let edge_types: &Vec<String> = options.edge_types.as_ref().unwrap_or(&all_edge_types);

            for edge_type in edge_types {
                let (nodes, edges) = self.int_traverse_breadth_first(
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
            Ok(self.int_traverse_breadth_first(
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
    /// At the depth limit, edges are only visited if they point to already visited nodes.
    pub fn int_traverse_depth_first<'a, N, E>(
        &'a self,
        entry_nodes: Vec<NGNodeIndex>,
        edge_types: Option<&Vec<String>>,
        max_depth: u32,
        node_callback: fn(NGNodeIndex, u32) -> N,
        edge_callback: fn(NGEdgeRef<'a>) -> E,
    ) -> NodeEdgeVec<N, E> {
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
    /// At the depth limit, edges are only visited if they point to already visited nodes.
    pub fn int_traverse_breadth_first<'a, N, E>(
        &'a self,
        entry_nodes: Vec<NGNodeIndex>,
        edge_types: Option<&Vec<String>>,
        max_depth: u32,
        node_callback: fn(NGNodeIndex, u32) -> N,
        edge_callback: fn(NGEdgeRef<'a>) -> E,
    ) -> NodeEdgeVec<N, E> {
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

    pub fn int_traverse_generic<'a, N, E>(
        &'a self,
        traversal_data_structure: &mut impl GraphTraversalDataStructure<(NGNodeIndex, u32)>,
        entry_nodes: Vec<NGNodeIndex>,
        edge_types: Option<&Vec<String>>,
        max_depth: u32,
        node_callback: fn(NGNodeIndex, u32) -> N,
        edge_callback: fn(NGEdgeRef<'a>) -> E,
    ) -> NodeEdgeVec<N, E> {
        let mut node_list: NodeVec<N> = Vec::new();
        let mut edge_list: EdgeVec<E> = Vec::new();
        let mut visited_nodes: HashSet<NGNodeIndex> = HashSet::new();

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
                    if !at_depth_limit || already_visited {
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
