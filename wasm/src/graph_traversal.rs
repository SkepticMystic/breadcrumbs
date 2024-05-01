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
pub struct RecTraversalData {
    // the edge struct that was traversed
    edge: EdgeStruct,
    // the depth of the node in the traversal
    depth: u32,
    // the children of the node
    children: Vec<RecTraversalData>,
}

#[wasm_bindgen]
impl RecTraversalData {
    #[wasm_bindgen(constructor)]
    pub fn new(edge: EdgeStruct, depth: u32, children: Vec<RecTraversalData>) -> RecTraversalData {
        RecTraversalData {
            edge,
            depth,
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
        format!("{:?}", self)
    }
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn rec_traverse(
        &self,
        entry_node: String,
        edge_types: Vec<String>,
        max_depth: u32,
    ) -> Result<Vec<RecTraversalData>> {
        let now = Instant::now();

        let start_node = self
            .int_get_node_index(&entry_node)
            .ok_or(NoteGraphError::new("Node not found"))?;
        let start_node_weight = self.int_get_node_weight(start_node)?;

        let mut node_count = 1;
        let mut result = Vec::new();

        for edge in self.graph.edges(start_node) {
            let target = edge.target();

            let edge_struct = EdgeStruct::new(
                start_node_weight.clone(),
                self.int_get_node_weight(target)?.clone(),
                edge.weight().clone(),
            );

            result.push(self.int_rec_traverse(
                start_node,
                edge_struct,
                &edge_types,
                0,
                max_depth,
                &mut node_count,
            )?);

            node_count += 1;
        }

        let total_elapsed = now.elapsed();
        utils::log(format!(
            "Total tree took {:.2?} ({} nodes)",
            total_elapsed, node_count
        ));

        Ok(result)
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
        edge_types: &Vec<String>,
        depth: u32,
        max_depth: u32,
        node_count: &mut usize,
    ) -> Result<RecTraversalData> {
        let mut new_children = Vec::new();

        if depth < max_depth {
            for outgoing_edge in self.graph.edges(node) {
                let edge_weight = outgoing_edge.weight();

                if edge_types.contains(&edge_weight.edge_type) {
                    let target = outgoing_edge.target();

                    let edge_struct = EdgeStruct::new(
                        edge.target.clone(),
                        self.int_get_node_weight(target)?.clone(),
                        edge_weight.clone(),
                    );

                    new_children.push(self.int_rec_traverse(
                        target,
                        edge_struct,
                        edge_types,
                        depth + 1,
                        max_depth,
                        node_count,
                    )?)
                }
            }
        }

        *node_count += new_children.len();

        Ok(RecTraversalData::new(edge, depth, new_children))
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
