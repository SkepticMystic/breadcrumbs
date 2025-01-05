use std::rc::Rc;

use hashbrown::HashMap;
use petgraph::{
    stable_graph::{Edges, StableGraph},
    visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences, NodeRef},
    Directed,
};
use vec_collections::{AbstractVecSet, VecSet};
use wasm_bindgen::prelude::*;

use crate::{
    graph_construction::{GCEdgeData, GCNodeData},
    graph_data::{
        EdgeData, EdgeStruct, GroupedEdgeList, NGEdgeIndex, NGEdgeRef, NGNodeIndex, NodeData,
    },
    graph_rules::TransitiveGraphRule,
    graph_update::{AddEdgeGraphUpdate, AddNoteGraphUpdate, BatchGraphUpdate},
    utils::{NoteGraphError, PerfLogger, Result, LOGGER},
};

pub fn edge_matches_edge_filter(edge: &EdgeData, edge_types: Option<&Vec<Rc<str>>>) -> bool {
    match edge_types {
        Some(types) => types.contains(&edge.edge_type),
        None => true,
    }
}

pub fn edge_matches_edge_filter_string(edge: &EdgeData, edge_types: Option<&Vec<String>>) -> bool {
    match edge_types {
        // sadly we can't use contains with Rc<str> and String
        Some(types) => types.iter().any(|t| t == edge.edge_type.as_ref()),
        None => true,
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct NoteGraph {
    #[wasm_bindgen(skip)]
    pub graph: StableGraph<NodeData, EdgeData, Directed, u32>,
    #[wasm_bindgen(skip)]
    pub transitive_rules: Vec<TransitiveGraphRule>,
    #[wasm_bindgen(skip)]
    pub edge_types: VecSet<[Rc<str>; 16]>,
    #[wasm_bindgen(skip)]
    pub node_hash: HashMap<String, NGNodeIndex>,
    update_callback: Option<js_sys::Function>,
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn new() -> NoteGraph {
        NoteGraph {
            graph: StableGraph::<NodeData, EdgeData, Directed, u32>::default(),
            transitive_rules: Vec::new(),
            edge_types: VecSet::empty(),
            node_hash: HashMap::new(),
            update_callback: None,
        }
    }

    /// Set the update callback.
    /// This will be called after every update to the graph.
    pub fn set_update_callback(&mut self, callback: js_sys::Function) {
        self.update_callback = Some(callback);
    }

    /// Call the update callback.
    pub fn notify_update(&self) {
        if let Some(callback) = &self.update_callback {
            match callback.call0(&JsValue::NULL) {
                Ok(_) => {}
                Err(e) => LOGGER.warn(&format!(
                    "Error calling update notification function: {:?}",
                    e
                )),
                // LOGGER.with(|l| {
                //     l.warn(&format!(
                //         "Error calling update notification function: {:?}",
                //         e
                //     ))
                // }),
            }
        }
    }

    /// Builds the graph from a list of nodes and edges.
    /// Will delete all existing data.
    pub fn build_graph(
        &mut self,
        nodes: Vec<GCNodeData>,
        edges: Vec<GCEdgeData>,
        transitive_rules: Vec<TransitiveGraphRule>,
    ) -> Result<()> {
        LOGGER.info("Building Graph");

        self.graph = StableGraph::<NodeData, EdgeData, Directed, u32>::default();
        self.edge_types = VecSet::empty();
        self.node_hash = HashMap::new();
        self.transitive_rules = transitive_rules;

        let mut update = BatchGraphUpdate::new();
        for data in nodes {
            AddNoteGraphUpdate::new(data).add_to_batch(&mut update);
        }
        for data in edges {
            AddEdgeGraphUpdate::new(data).add_to_batch(&mut update);
        }

        self.apply_update(update)
    }

    /// Applies a batch update to the graph.
    /// Throws an error if the update fails.
    pub fn apply_update(&mut self, update: BatchGraphUpdate) -> Result<()> {
        let mut perf_logger = PerfLogger::new("Applying Update".to_owned());
        perf_logger.start_split("Removing implied edges".to_owned());

        self.int_remove_implied_edges_unchecked();

        perf_logger.start_split("Applying updates".to_owned());

        // self.log();
        update.apply(self)?;
        // self.log();

        perf_logger.start_split("Rebuilding edge type tracker".to_owned());

        self.int_rebuild_edge_type_tracker();
        self.int_build_implied_edges(&mut perf_logger);

        perf_logger.start_split("Update notification callback".to_owned());

        self.notify_update();

        perf_logger.log();

        Ok(())
    }

    /// Iterate all nodes in the graph and call the provided function with the [NodeData] of each node.
    pub fn iterate_nodes(&self, f: &js_sys::Function) {
        let this = JsValue::NULL;

        self.graph.node_references().for_each(|node| {
            match f.call1(&this, &node.weight().clone().into()) {
                Ok(_) => {}
                Err(e) => LOGGER.warn(&format!("Error calling node iteration callback: {:?}", e)),
                // LOGGER.with(|l| l.warn(&format!("Error calling node iteration callback: {:?}", e))),
            }
        });
    }

    /// Iterate all edges in the graph and call the provided function with the [EdgeData] of each edge.
    pub fn iterate_edges(&self, f: &js_sys::Function) {
        let this = JsValue::NULL;

        self.graph.edge_references().for_each(|edge| {
            match f.call1(&this, &edge.weight().clone().into()) {
                Ok(_) => {}
                Err(e) => LOGGER.warn(&format!("Error calling edge iteration callback: {:?}", e)),
                // LOGGER.with(|l| l.warn(&format!("Error calling edge iteration callback: {:?}", e))),
            }
        });
    }

    /// Get all outgoing edges from a node.
    pub fn get_outgoing_edges(&self, node: String) -> Vec<EdgeStruct> {
        let node_index = self.int_get_node_index(&node);

        match node_index {
            Some(node_index) => self
                .int_iter_outgoing_edges(node_index)
                .map(|edge| EdgeStruct::from_edge_ref(edge))
                .collect(),
            None => Vec::new(),
        }
    }

    /// Get all outgoing edges from a node, filtered and grouped by edge type.
    pub fn get_filtered_grouped_outgoing_edges(
        &self,
        node: String,
        edge_types: Option<Vec<String>>,
    ) -> GroupedEdgeList {
        let node_index = self.int_get_node_index(&node);

        GroupedEdgeList::from_vec(match node_index {
            Some(node_index) => self
                .int_iter_outgoing_edges(node_index)
                .filter(|edge_ref| {
                    edge_matches_edge_filter_string(edge_ref.weight(), edge_types.as_ref())
                })
                .map(|edge| EdgeStruct::from_edge_ref(edge))
                .collect(),
            None => Vec::new(),
        })
    }

    /// Get all incoming edges to a node.
    pub fn get_incoming_edges(&self, node: String) -> Vec<EdgeStruct> {
        let node_index = self.int_get_node_index(&node);

        match node_index {
            Some(node_index) => self
                .int_iter_incoming_edges(node_index)
                .map(|edge| EdgeStruct::from_edge_ref(edge))
                .collect(),
            None => Vec::new(),
        }
    }

    /// Checks if a node exists in the graph.
    pub fn has_node(&self, node: String) -> bool {
        self.node_hash.contains_key(&node)
    }

    /// Checks if a node is resolved.
    /// Returns false if the node is not found.
    pub fn is_node_resolved(&self, node: String) -> bool {
        self.int_get_node_index(&node)
            .and_then(|node_index| self.graph.node_weight(node_index))
            .map(|node| node.resolved)
            .unwrap_or(false)
    }

    pub fn get_node(&self, node: String) -> Option<NodeData> {
        self.int_get_node_index(&node)
            .and_then(|node_index| self.graph.node_weight(node_index).cloned())
    }

    /// Returns all edge types that are present in the graph.
    pub fn edge_types(&self) -> Vec<String> {
        self.edge_types.iter().map(|x| x.to_string()).collect()
    }

    pub fn log(&self) {
        LOGGER.info(&format!("{:#?}", self.graph));
        // LOGGER.with(|l| l.info(&format!("{:#?}", self.graph)));
    }
}

impl Default for NoteGraph {
    fn default() -> Self {
        Self::new()
    }
}

/// Internal methods, not exposed to the wasm interface.
/// All of these methods are prefixed with `int_`.
impl NoteGraph {
    /// Builds the implied edges based on the transitive rules.
    pub fn int_build_implied_edges(&mut self, perf_logger: &mut PerfLogger) {
        let perf_split = perf_logger.start_split("Building Implied Edges".to_owned());

        let max_rounds = self
            .transitive_rules
            .iter()
            .map(|rule| rule.rounds())
            .max()
            .unwrap_or(0);
        // utils::log(format!("Max rounds: {}", max_rounds));
        // utils::log(format!("Rules count: {}", self.transitive_rules.len()));

        // rules look like
        // [A, B, C] -> D

        // We can keep track of edge types that were added in the last round and only check a rule that has any of those edge types on the left side
        // we would need to also check back edges though
        // a rule like [A, B] -> (C with back edge D) would do nothing if applied multiple times, since the edges on the left side were not modified

        let mut edge_type_tracker = self.edge_types.clone();
        let mut edges_to_add: Vec<(NGNodeIndex, NGNodeIndex, EdgeData)> = Vec::new();

        for i in 1..(max_rounds + 1) {
            let round_perf_split = perf_split.start_split(format!("Round {}", i));

            if edge_type_tracker.is_empty() {
                break;
            }

            for rule in self.transitive_rules.iter() {
                // if there is any edge type that the graph doesn't have, we can skip the rule
                if rule
                    .iter_path()
                    .any(|edge_type| !self.edge_types.contains(edge_type))
                {
                    // utils::log(format!("Skipping rule: {}", rule.edge_type));
                    continue;
                }

                // if all edge types of a rule didn't see any changes in the last round, we can skip the rule
                if rule
                    .iter_path()
                    .all(|edge_type| !edge_type_tracker.contains(edge_type))
                {
                    // utils::log(format!("Skipping rule: {}", rule.edge_type));
                    continue;
                }

                for start_node in self.graph.node_indices() {
                    // let path = rule.path.clone();
                    let mut current_nodes = vec![start_node];

                    for edge_type in rule.iter_path() {
                        let mut next_nodes = Vec::new();

                        for current_node in current_nodes {
                            for edge in self.graph.edges(current_node) {
                                if edge.weight().edge_type == *edge_type {
                                    next_nodes.push(edge.target());
                                }
                            }
                        }

                        current_nodes = next_nodes;
                    }

                    for end_node in current_nodes {
                        // if the rule can't loop and the start and end node are the same, we skip the edge
                        if !rule.can_loop() && start_node == end_node {
                            continue;
                        }

                        // if self.int_has_edge(start_node, end_node, &rule.edge_type()) {
                        //     continue;
                        // }

                        let edge_data = EdgeData::new(rule.edge_type(), rule.name(), false, i);

                        if rule.close_reversed() {
                            edges_to_add.push((end_node, start_node, edge_data));
                        } else {
                            edges_to_add.push((start_node, end_node, edge_data));
                        }
                    }
                }
            }

            edge_type_tracker.retain(|_| false);

            round_perf_split.start_split(format!("Adding {} Edges", edges_to_add.len()));

            for (from, to, edge_data) in edges_to_add.drain(..) {
                if self.int_has_edge(from, to, &edge_data.edge_type) {
                    continue;
                }

                self.edge_types.insert(Rc::clone(&edge_data.edge_type));
                edge_type_tracker.insert(Rc::clone(&edge_data.edge_type));

                self.graph.add_edge(from, to, edge_data);
            }

            round_perf_split.stop();
        }

        perf_split.stop();
    }

    pub fn int_rebuild_edge_type_tracker(&mut self) {
        self.edge_types = VecSet::empty();

        for edge in self.graph.edge_references() {
            self.edge_types.insert(Rc::clone(&edge.weight().edge_type));
        }
    }

    /// Removes all implied edges from the graph.
    /// UNCHECKED: This does not update the edge type tracker.
    pub fn int_remove_implied_edges_unchecked(&mut self) {
        let edge_count = self.graph.edge_count();

        self.graph.retain_edges(|frozen_graph, edge| {
            let weight = frozen_graph.edge_weight(edge).unwrap();

            weight.explicit
        });

        LOGGER.debug(&format!(
            "Removed {} implied edges, {} explicit edges remain",
            edge_count - self.graph.edge_count(),
            self.graph.edge_count()
        ));
        // LOGGER.with(|l| {
        //     l.debug(&format!(
        //         "Removed {} implied edges, {} explicit edges remain",
        //         edge_count - self.graph.edge_count(),
        //         self.graph.edge_count()
        //     ))
        // });
    }

    // ---------------------
    // Node Methods
    // ---------------------

    pub fn int_node_count(&self) -> usize {
        self.graph.node_count()
    }

    /// Returns the node index for a specific node weight.
    pub fn int_get_node_index(&self, node: &str) -> Option<NGNodeIndex> {
        self.node_hash.get(node).copied()
    }

    /// Returns the node weight for a specific node index.
    ///
    /// Will return an error if the node is not found.
    pub fn int_get_node_weight(&self, node: NGNodeIndex) -> Result<&NodeData> {
        self.graph.node_weight(node).ok_or(NoteGraphError::new(
            "failed to get node weight, node not found",
        ))
    }

    pub fn int_get_node_weight_mut(&mut self, node: NGNodeIndex) -> Result<&mut NodeData> {
        self.graph.node_weight_mut(node).ok_or(NoteGraphError::new(
            "failed to get node weight, node not found",
        ))
    }

    pub fn int_has_incoming_edges(&self, node: NGNodeIndex) -> bool {
        self.graph
            .edges_directed(node, petgraph::Direction::Incoming)
            .count()
            > 0
    }

    pub fn int_has_outgoing_edges(&self, node: NGNodeIndex) -> bool {
        self.graph
            .edges_directed(node, petgraph::Direction::Outgoing)
            .count()
            > 0
    }

    pub fn int_iter_incoming_edges(&self, node: NGNodeIndex) -> Edges<'_, EdgeData, Directed, u32> {
        self.graph
            .edges_directed(node, petgraph::Direction::Incoming)
    }

    pub fn int_iter_outgoing_edges(&self, node: NGNodeIndex) -> Edges<'_, EdgeData, Directed, u32> {
        self.graph
            .edges_directed(node, petgraph::Direction::Outgoing)
    }

    // ---------------------
    // Edge Methods
    // ---------------------

    pub fn int_edge_count(&self) -> usize {
        self.graph.edge_count()
    }

    /// Gets an edge between two nodes based on a specific edge type.
    /// Returns None if the edge does not exist.
    pub fn int_get_edge(
        &self,
        from: NGNodeIndex,
        to: NGNodeIndex,
        edge_type: &str,
    ) -> Option<NGEdgeRef> {
        self.graph
            .edges(from)
            .find(|e| e.target() == to && *e.weight().edge_type == *edge_type)
    }

    /// Gets an edge between two nodes based on a specific edge type.
    /// Returns None if the edge does not exist.
    pub fn int_get_edge_by_name(&self, from: &str, to: &str, edge_type: &str) -> Option<NGEdgeRef> {
        let from_index = self.int_get_node_index(from)?;
        let to_index = self.int_get_node_index(to)?;

        self.int_get_edge(from_index, to_index, edge_type)
    }

    /// Checks if an edge exists between two nodes with a specific edge type.
    pub fn int_has_edge(&self, from: NGNodeIndex, to: NGNodeIndex, edge_type: &str) -> bool {
        self.graph
            .edges(from)
            .any(|e| e.target() == to && *e.weight().edge_type == *edge_type)
    }

    /// Checks if an edge exists between two nodes with a specific edge type.
    pub fn int_has_edge_by_name(&self, from: &str, to: &str, edge_type: &str) -> bool {
        let from_index = self.int_get_node_index(from);
        let to_index = self.int_get_node_index(to);

        match (from_index, to_index) {
            (Some(from_index), Some(to_index)) => {
                self.int_has_edge(from_index, to_index, edge_type)
            }
            _ => false,
        }
    }

    /// Get a reference to the edge weight for a specific edge index.
    ///
    /// Will return an error if the edge is not found.
    pub fn int_get_edge_weight(&self, edge: NGEdgeIndex) -> Result<&EdgeData> {
        self.graph.edge_weight(edge).ok_or(NoteGraphError::new(
            "failed to get edge weight, edge not found",
        ))
    }

    /// Get a mutable reference to the edge weight for a specific edge index.
    ///
    /// Will return an error if the edge is not found.
    pub fn int_get_edge_weight_mut(&mut self, edge: NGEdgeIndex) -> Result<&mut EdgeData> {
        self.graph.edge_weight_mut(edge).ok_or(NoteGraphError::new(
            "failed to get edge weight, edge not found",
        ))
    }

    pub fn int_edge_types(&self) -> Vec<Rc<str>> {
        self.edge_types.iter().cloned().collect()
    }

    // ----------------
    // Debugging
    // ----------------

    pub fn assert_correct_trackers(&self) {
        let mut edge_types: VecSet<[Rc<str>; 16]> = VecSet::empty();

        for edge in self.graph.edge_references() {
            edge_types.insert(edge.weight().edge_type.clone());
        }

        assert_eq!(edge_types, self.edge_types);

        let mut node_hash: HashMap<String, NGNodeIndex> = HashMap::new();

        for node_ref in self.graph.node_references() {
            node_hash.insert(node_ref.weight().path.clone(), node_ref.id());
        }

        assert_eq!(node_hash, self.node_hash);
    }
}
