use std::{
    collections::{HashMap, HashSet},
    fmt::Debug,
};

use itertools::{EitherOrBoth, Itertools};
use petgraph::{
    stable_graph::{EdgeIndex, EdgeReference, Edges, NodeIndex, StableGraph},
    visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences, NodeRef},
    Directed,
};
use wasm_bindgen::prelude::*;
use web_time::Instant;

use crate::{
    graph_construction::{GraphConstructionEdgeData, GraphConstructionNodeData},
    graph_rules::TransitiveGraphRule,
    graph_update::BatchGraphUpdate,
    utils::{
        self, BreadthFirstTraversalDataStructure, DepthFirstTraversalDataStructure,
        GraphTraversalDataStructure, NoteGraphError, Result,
    },
};

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
#[derive(Clone, Debug)]
pub struct EdgeStruct {
    #[wasm_bindgen(skip)]
    pub source: NodeData,
    #[wasm_bindgen(skip)]
    pub target: NodeData,

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
impl EdgeStruct {
    #[wasm_bindgen(constructor)]
    pub fn new(source: NodeData, target: NodeData, edge: EdgeData) -> EdgeStruct {
        EdgeStruct {
            source,
            target,
            edge_type: edge.edge_type,
            edge_source: edge.edge_source,
            implied: edge.implied,
            round: edge.round,
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

    pub fn get_attribute_label(&self, attributes: Vec<String>) -> String {
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

            match data {
                Some(data) => result.push(format!("{}={}", data.0, data.1)),
                None => {}
            }
        }

        result.join(" ")
    }
}

// impl PartialEq for NodeData {
//     fn eq(&self, other: &Self) -> bool {
//         self.path == other.path
//     }
// }

#[wasm_bindgen]
pub struct MermaidGraphData {
    mermaid: String,
    traversal_time: u64,
    total_time: u64,
}

#[wasm_bindgen]
impl MermaidGraphData {
    #[wasm_bindgen(getter)]
    pub fn mermaid(&self) -> String {
        self.mermaid.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn traversal_time(&self) -> u64 {
        self.traversal_time
    }

    #[wasm_bindgen(getter)]
    pub fn total_time(&self) -> u64 {
        self.total_time
    }
}

impl MermaidGraphData {
    pub fn new(mermaid: String, traversal_time: u64, total_time: u64) -> MermaidGraphData {
        MermaidGraphData {
            mermaid,
            traversal_time,
            total_time,
        }
    }
}

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
#[derive(Clone)]
pub struct NoteGraph {
    #[wasm_bindgen(skip)]
    pub graph: StableGraph<NodeData, EdgeData, Directed, u32>,
    #[wasm_bindgen(skip)]
    pub transitive_rules: Vec<TransitiveGraphRule>,
    #[wasm_bindgen(skip)]
    pub edge_types: HashSet<String>,
    #[wasm_bindgen(skip)]
    pub node_hash: HashMap<String, NodeIndex<u32>>,
    update_callback: Option<js_sys::Function>,
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn new() -> NoteGraph {
        NoteGraph {
            graph: StableGraph::<NodeData, EdgeData, Directed, u32>::default(),
            transitive_rules: Vec::new(),
            edge_types: HashSet::new(),
            node_hash: HashMap::new(),
            update_callback: None,
        }
    }

    pub fn set_transitive_rules(&mut self, rules: Vec<TransitiveGraphRule>) {
        self.transitive_rules = rules;
    }

    pub fn set_update_callback(&mut self, callback: js_sys::Function) {
        self.update_callback = Some(callback);
    }

    pub fn notify_update(&self) {
        match &self.update_callback {
            Some(callback) => match callback.call0(&JsValue::NULL) {
                Ok(_) => {}
                Err(e) => utils::log(format!("Error calling function: {:?}", e)),
            },
            None => {}
        }
    }

    pub fn build_graph(
        &mut self,
        nodes: Vec<GraphConstructionNodeData>,
        edges: Vec<GraphConstructionEdgeData>,
    ) {
        let now = Instant::now();

        self.graph = StableGraph::<NodeData, EdgeData, Directed, u32>::default();
        self.edge_types = HashSet::new();

        // self.graph.reserve_exact_nodes(nodes.len());

        self.node_hash = HashMap::new();

        for info_node in nodes.as_slice() {
            if self.node_hash.contains_key(&info_node.path) {
                utils::log(format!("Node already exists: {}", info_node.path));
                continue;
            }

            self.node_hash.insert(
                info_node.path.clone(),
                self.graph
                    .add_node(NodeData::from_construction_data(info_node)),
            );
        }

        for edge in edges {
            self.int_safe_add_edge(
                &edge.source,
                &edge.target,
                &edge.edge_type,
                &edge.edge_source,
            );
        }

        let elapsed = now.elapsed();
        utils::log(format!("Building initial graph took {:.2?}", elapsed));

        self.int_build_implied_edges();

        self.notify_update();
    }

    pub fn apply_update(&mut self, update: BatchGraphUpdate) -> Result<()> {
        let now = Instant::now();
        self.int_remove_implied_edges();

        // self.log();
        update.apply(self)?;
        // self.log();

        self.int_rebuild_edge_type_tracker();
        self.int_build_implied_edges();
        utils::log(format!("Applying update took {:.2?}", now.elapsed()));

        self.notify_update();

        Ok(())
    }

    pub fn iterate_nodes(&self, f: &js_sys::Function) {
        let this = JsValue::NULL;

        self.graph.node_references().into_iter().for_each(|node| {
            match f.call1(&this, &node.weight().clone().into()) {
                Ok(_) => {}
                Err(e) => utils::log(format!("Error calling function: {:?}", e)),
            }
        });
    }

    pub fn iterate_edges(&self, f: &js_sys::Function) {
        let this = JsValue::NULL;

        self.graph.edge_references().into_iter().for_each(|edge| {
            match f.call1(&this, &edge.weight().clone().into()) {
                Ok(_) => {}
                Err(e) => utils::log(format!("Error calling function: {:?}", e)),
            }
        });
    }

    pub fn edge_types(&self) -> Vec<String> {
        self.edge_types.iter().cloned().collect()
    }

    // pub fn subgraph(&self, edge_types: Vec<String>) -> Result<NoteGraph> {
    //     let mut subgraph = self.clone();

    //     for edge in subgraph.graph.edge_indices() {
    //         let edge_data = subgraph.int_get_edge_weight(edge)?;

    //         if !edge_types.contains(&edge_data.edge_type) {
    //             subgraph.graph.remove_edge(edge);
    //         }
    //     }

    //     Ok(subgraph)
    // }

    pub fn generate_mermaid_graph(
        &self,
        entry_nodes: Vec<String>,
        edge_types: Vec<String>,
        max_depth: u32,
    ) -> Result<MermaidGraphData> {
        let now = Instant::now();

        let mut entry_node_indices: Vec<NodeIndex<u32>> = Vec::new();
        for node in entry_nodes {
            let node_index = self
                .int_get_node_index(&node)
                .ok_or(NoteGraphError::new("Node not found"))?;
            entry_node_indices.push(node_index);
        }

        let (node_map, edge_map) = self.int_traverse_breadth_first(
            entry_node_indices,
            Some(&edge_types),
            max_depth,
            |_, depth| depth,
            |edge| edge,
        );

        let traversal_elapsed = now.elapsed();

        let mut result = String::new();
        result.push_str("flowchart LR\n");

        // accumulate edges by direction, so that we can collapse them in the next step
        let mut accumulated_edges: HashMap<
            (NodeIndex<u32>, NodeIndex<u32>),
            (NodeIndex<u32>, NodeIndex<u32>, Vec<EdgeData>, Vec<EdgeData>),
        > = HashMap::new();

        // TODO: this sucks, maybe use a tuple of node indices instead of strings
        for (_, edge_ref) in edge_map {
            let forward_dir = (edge_ref.source(), edge_ref.target());

            let entry1 = accumulated_edges.get_mut(&forward_dir);
            match entry1 {
                Some((_, _, forward, _)) => {
                    forward.push(edge_ref.weight().clone());
                }
                None => {
                    let backward_dir = (edge_ref.target(), edge_ref.source());

                    let entry2 = accumulated_edges.get_mut(&backward_dir);
                    match entry2 {
                        Some((_, _, _, backward)) => {
                            backward.push(edge_ref.weight().clone());
                        }
                        None => {
                            accumulated_edges.insert(
                                forward_dir,
                                (
                                    edge_ref.source(),
                                    edge_ref.target(),
                                    vec![edge_ref.weight().clone()],
                                    Vec::new(),
                                ),
                            );
                        }
                    }
                }
            }
        }

        let mut unresolved_nodes = HashSet::new();

        // add nodes to the graph
        for element in node_map.iter() {
            let weight = self.int_get_node_weight(element.0.clone())?;
            result.push_str(&format!(
                "    {}[\"{} ({})\"]\n",
                element.0.index(),
                weight.path,
                element.1
            ));
            if !weight.resolved {
                unresolved_nodes.insert(element.0.index());
            }
        }

        // collapse edge data and add them to the graph
        for (from, to, forward, backward) in accumulated_edges.values() {
            let mut label = String::new();

            let same_elements = forward
                .iter()
                .zip(backward.iter())
                .all(|(a, b)| a.edge_type == b.edge_type);
            let all_implied = forward
                .iter()
                .zip_longest(backward.iter())
                .all(|pair| match pair {
                    EitherOrBoth::Both(a, b) => a.implied && b.implied,
                    EitherOrBoth::Left(a) => a.implied,
                    EitherOrBoth::Right(b) => b.implied,
                });

            let arrow_type: String;
            if backward.is_empty() {
                if all_implied {
                    arrow_type = String::from("-.->");
                } else {
                    arrow_type = String::from("-->");
                }
            } else {
                if all_implied {
                    arrow_type = String::from("<-.->");
                } else {
                    arrow_type = String::from("<-->");
                }
            }

            if same_elements {
                label.push_str(
                    forward
                        .iter()
                        .map(|edge| edge.edge_type.clone())
                        .collect::<Vec<String>>()
                        .join(", ")
                        .as_str(),
                );
            } else {
                label.push_str(
                    forward
                        .iter()
                        .map(|edge| edge.edge_type.clone())
                        .collect::<Vec<String>>()
                        .join(", ")
                        .as_str(),
                );
                // forward can never be empty
                if !backward.is_empty() {
                    label.push_str(" / ");
                }
                label.push_str(
                    backward
                        .iter()
                        .map(|edge| edge.edge_type.clone())
                        .collect::<Vec<String>>()
                        .join(", ")
                        .as_str(),
                );
            }

            result.push_str(&format!(
                "    {} {}|{}| {}\n",
                from.index(),
                arrow_type,
                label,
                to.index()
            ));
        }

        if !unresolved_nodes.is_empty() {
            result.push_str(&format!(
                "class {} ng-node-unresolved",
                unresolved_nodes
                    .iter()
                    .map(|index| format!("{}", index))
                    .join(",")
            ));
        }

        let total_elapsed = now.elapsed();

        Ok(MermaidGraphData::new(
            result,
            traversal_elapsed.as_micros() as u64,
            total_elapsed.as_micros() as u64,
        ))
    }

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

    pub fn log(&self) {
        utils::log(format!("{:#?}", self.graph));
    }
}

/// Internal methods, not exposed to the wasm interface.
/// All of these methods are prefixed with `int_`.
impl NoteGraph {
    /// Builds the implied edges based on the transitive rules.
    pub fn int_build_implied_edges(&mut self) {
        let now = Instant::now();

        let max_rounds = self
            .transitive_rules
            .iter()
            .map(|rule| rule.rounds)
            .max()
            .unwrap_or(0);
        // utils::log(format!("Max rounds: {}", max_rounds));
        // utils::log(format!("Rules count: {}", self.transitive_rules.len()));

        // rules look like
        // [A, B, C] -> D

        // TODO: maybe we can keep track of edge types that were added in the last round and only check a rule that has any of those edge types on the left side
        // we would need to also check back edges though
        // a rule like [A, B] -> (C with back edge D) would do nothing if applied multiple times, since the edges on the left side were not modified

        let mut edge_type_tracker: HashSet<String> = self.edge_types.clone();

        for i in 1..(max_rounds + 1) {
            if edge_type_tracker.is_empty() {
                break;
            }

            let mut edges_to_add: Vec<(NodeIndex<u32>, NodeIndex<u32>, EdgeData)> = Vec::new();

            for rule in self.transitive_rules.iter() {
                // if there is any edge type that the graph doesn't have, we can skip the rule
                if rule
                    .path
                    .iter()
                    .any(|edge_type| !self.edge_types.contains(edge_type))
                {
                    // utils::log(format!("Skipping rule: {}", rule.edge_type));
                    continue;
                }

                // if all edge types of a rule didn't see any changes in the last round, we can skip the rule
                if rule
                    .path
                    .iter()
                    .all(|edge_type| !edge_type_tracker.contains(edge_type))
                {
                    // utils::log(format!("Skipping rule: {}", rule.edge_type));
                    continue;
                }

                for start_node in self.graph.node_indices() {
                    // let path = rule.path.clone();
                    let mut current_nodes = vec![start_node];

                    for edge_type in rule.path.iter() {
                        let mut next_nodes = Vec::new();

                        for current_node in current_nodes {
                            for edge in self.graph.edges(current_node) {
                                if *edge.weight().edge_type == *edge_type {
                                    next_nodes.push(edge.target());
                                }
                            }
                        }

                        current_nodes = next_nodes;
                    }

                    for end_node in current_nodes {
                        // if the rule can't loop and the start and end node are the same, we skip the edge
                        if !rule.can_loop && start_node == end_node {
                            continue;
                        }

                        let edge_data = EdgeData::new(
                            rule.edge_type.clone(),
                            format!("transitive:{}", rule.name),
                            true,
                            i,
                        );

                        if rule.close_reversed {
                            edges_to_add.push((end_node, start_node, edge_data));
                        } else {
                            edges_to_add.push((start_node, end_node, edge_data));
                        }
                    }
                }
            }

            // if edges_to_add.is_empty() {
            //     break;
            // }

            // utils::log(format!("New edge count: {}", edges_to_add.len()));

            let mut current_edge_type_tracker: HashSet<String> = HashSet::new();

            let now2 = Instant::now();
            utils::log(format!("Adding {} Edges ", edges_to_add.len()));

            for (from, to, edge_data) in edges_to_add {
                self.int_add_edge(
                    from,
                    to,
                    edge_data,
                    &mut Some(&mut current_edge_type_tracker),
                );
            }

            let elapsed2 = now2.elapsed();
            utils::log(format!("Adding Implied Edges took {:.2?}", elapsed2));

            edge_type_tracker = current_edge_type_tracker;
        }

        let elapsed = now.elapsed();
        utils::log(format!("Building Implied Edges took {:.2?}", elapsed));
    }

    pub fn int_rebuild_edge_type_tracker(&mut self) {
        self.edge_types = HashSet::new();

        for edge in self.graph.edge_references() {
            self.edge_types.insert(edge.weight().edge_type.clone());
        }
    }

    /// Returns the node index for a specific node weight.
    pub fn int_get_node_index(&self, node: &String) -> Option<NodeIndex<u32>> {
        self.node_hash.get(node).map(|index| index.clone())
    }

    /// Adds an edge type to the global edge type tracker and an optional local edge type tracker.
    pub fn int_add_to_edge_type_tracker(
        &mut self,
        edge_type: &String,
        edge_type_tracker: &mut Option<&mut HashSet<String>>,
        add_to_global: bool,
    ) {
        if add_to_global {
            self.edge_types.insert(edge_type.clone());
        }

        match edge_type_tracker {
            Some(inner) => {
                inner.insert(edge_type.clone());
            }
            None => {}
        }
    }

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

    /// Returns the node weight for a specific node index.
    ///
    /// Will return an error if the node is not found.
    pub fn int_get_node_weight(&self, node: NodeIndex<u32>) -> Result<&NodeData> {
        self.graph
            .node_weight(node)
            .ok_or(NoteGraphError::new("Node not found"))
    }

    pub fn int_has_incoming_edges(&self, node: NodeIndex<u32>) -> bool {
        self.graph
            .edges_directed(node, petgraph::Direction::Incoming)
            .count()
            > 0
    }

    pub fn int_has_outgoing_edges(&self, node: NodeIndex<u32>) -> bool {
        self.graph
            .edges_directed(node, petgraph::Direction::Outgoing)
            .count()
            > 0
    }

    pub fn int_iter_incoming_edges(
        &self,
        node: NodeIndex<u32>,
    ) -> Edges<'_, EdgeData, Directed, u32> {
        self.graph
            .edges_directed(node, petgraph::Direction::Incoming)
    }

    pub fn int_iter_outgoing_edges(
        &self,
        node: NodeIndex<u32>,
    ) -> Edges<'_, EdgeData, Directed, u32> {
        self.graph
            .edges_directed(node, petgraph::Direction::Outgoing)
    }

    pub fn int_remove_outgoing_edges(&mut self, node: NodeIndex<u32>) {
        let mut edges_to_remove: Vec<EdgeIndex<u32>> = Vec::new();

        for edge in self.graph.edges(node) {
            edges_to_remove.push(edge.id());
        }

        for edge in edges_to_remove {
            self.graph.remove_edge(edge);
        }
    }

    pub fn int_set_node_resolved(&mut self, node: NodeIndex<u32>, resolved: bool) -> Result<()> {
        let node = self.graph.node_weight_mut(node);
        match node {
            Some(node) => {
                node.resolved = resolved;

                Ok(())
            }
            None => Err(NoteGraphError::new("Node not found")),
        }
    }

    pub fn int_node_count(&self) -> usize {
        self.graph.node_count()
    }

    pub fn int_edge_count(&self) -> usize {
        self.graph.edge_count()
    }

    /// Returns the edge weight for a specific edge index.
    ///
    /// Will return an error if the edge is not found.
    pub fn int_get_edge_weight(&self, edge: EdgeIndex<u32>) -> Result<&EdgeData> {
        self.graph
            .edge_weight(edge)
            .ok_or(NoteGraphError::new("Edge not found"))
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

    pub fn int_edge_matches_edge_filter(
        &self,
        edge: &EdgeData,
        edge_types: Option<&Vec<String>>,
    ) -> bool {
        match edge_types {
            Some(types) => types.contains(&edge.edge_type),
            None => true,
        }
    }

    pub fn int_remove_implied_edges(&mut self) {
        let now = Instant::now();

        // let mut edges_to_remove: Vec<EdgeIndex<u32>> = Vec::new();

        self.graph.retain_edges(|frozen_graph, edge| {
            let weight = frozen_graph.edge_weight(edge).unwrap();

            !weight.implied
        });

        // for edge in self.graph.edge_references() {
        //     let edge_data = edge.weight();

        //     if edge_data.implied {
        //         edges_to_remove.push(edge.id());
        //     }
        // }

        // utils::log(format!("Removing {} of {} Implied Edges", edges_to_remove.len(), self.graph.edge_count()));

        // for edge in edges_to_remove {
        //     self.graph.remove_edge(edge);
        // }

        utils::log(format!("{} edges remain", self.graph.edge_count()));

        let elapsed = now.elapsed();
        utils::log(format!("Removing Implied Edges took {:.2?}", elapsed));
    }

    fn int_add_node(&mut self, node: &GraphConstructionNodeData) -> Result<()> {
        if self.node_hash.contains_key(&node.path) {
            return Err(NoteGraphError::new("Node already exists"));
        }

        let node_index = self.graph.add_node(NodeData::from_construction_data(node));

        self.node_hash.insert(node.path.clone(), node_index);

        Ok(())
    }

    fn int_remove_node(&mut self, node: &String) -> Result<()> {
        let node_index = self
            .int_get_node_index(node)
            .ok_or(NoteGraphError::new("Node not found"))?;

        self.graph.remove_node(node_index);
        self.node_hash.remove(node);

        Ok(())
    }
    /// Adds an edge to the graph. will also add the back edge if necessary.
    /// This will not add already existing edges.
    ///
    /// Will add the added edge types to the global edge type tracker and an optional local edge type tracker.
    fn int_add_edge(
        &mut self,
        from: NodeIndex<u32>,
        to: NodeIndex<u32>,
        edge_data: EdgeData,
        edge_type_tracker: &mut Option<&mut HashSet<String>>,
    ) {
        if self.int_has_edge(from, to, &edge_data.edge_type) {
            return;
        }

        self.int_add_to_edge_type_tracker(&edge_data.edge_type, edge_type_tracker, true);

        self.graph.add_edge(from, to, edge_data);
    }

    fn int_remove_edge(
        &mut self,
        from: NodeIndex<u32>,
        to: NodeIndex<u32>,
        edge_type: &String,
    ) -> Result<()> {
        let edge = self
            .graph
            .edges(from)
            .into_iter()
            .find(|e| e.target() == to && *e.weight().edge_type == *edge_type);

        match edge {
            Some(edge) => {
                self.graph.remove_edge(edge.id());
                Ok(())
            }
            None => Err(NoteGraphError::new("Edge not found")),
        }
    }

    pub fn int_get_edge(
        &self,
        from: NodeIndex<u32>,
        to: NodeIndex<u32>,
        edge_type: &String,
    ) -> Option<EdgeReference<EdgeData, u32>> {
        self.graph
            .edges(from)
            .into_iter()
            .find(|e| e.target() == to && *e.weight().edge_type == *edge_type)
    }

    pub fn int_get_edge_by_name(
        &self,
        from: &String,
        to: &String,
        edge_type: &String,
    ) -> Option<EdgeReference<EdgeData, u32>> {
        let from_index = self.int_get_node_index(from)?;
        let to_index = self.int_get_node_index(to)?;

        self.int_get_edge(from_index, to_index, edge_type)
    }

    /// Checks if an edge exists between two nodes with a specific edge type.
    pub fn int_has_edge(
        &self,
        from: NodeIndex<u32>,
        to: NodeIndex<u32>,
        edge_type: &String,
    ) -> bool {
        self.graph
            .edges(from)
            .into_iter()
            .any(|e| e.target() == to && *e.weight().edge_type == *edge_type)
    }

    pub fn int_has_edge_by_name(&self, from: &String, to: &String, edge_type: &String) -> bool {
        let from_index = self.int_get_node_index(from);
        let to_index = self.int_get_node_index(to);

        match (from_index, to_index) {
            (Some(from_index), Some(to_index)) => {
                self.int_has_edge(from_index, to_index, edge_type)
            }
            _ => false,
        }
    }

    pub fn int_safe_add_node(
        &mut self,
        construction_data: &GraphConstructionNodeData,
    ) -> Result<()> {
        // we check if the node already exists in the graph
        // if it does, we assert that it is not resolved
        match self.int_get_node_index(&construction_data.path) {
            Some(node_index) => {
                if self.int_get_node_weight(node_index)?.resolved() {
                    return Err(NoteGraphError::new(
                        "There already exists a resolved node with the same name.",
                    ));
                }

                // TODO: also update the other things like aliases
                self.int_set_node_resolved(node_index, true)?;
            }
            None => {
                self.int_add_node(construction_data)?;
            }
        }

        Ok(())
    }

    pub fn int_safe_remove_node(&mut self, node: &String) -> Result<()> {
        match self.int_get_node_index(node) {
            Some(index) => {
                if !self.int_get_node_weight(index)?.resolved() {
                    return Err(NoteGraphError::new("Cannot remove an unresolved node"));
                }

                self.int_set_node_resolved(index, false)?;

                let edges_to_remove: Vec<EdgeIndex<u32>> = self
                    .int_iter_outgoing_edges(index)
                    .map(|edge| edge.id())
                    .collect();

                for edge in edges_to_remove {
                    self.int_safe_delete_edge_ref(edge)?;
                }
            }
            None => {
                return Err(NoteGraphError::new("Node not found"));
            }
        }

        Ok(())
    }

    pub fn int_safe_rename_node(&mut self, old_name: &String, new_name: &String) -> Result<()> {
        let node_index = self
            .int_get_node_index(old_name)
            .ok_or(NoteGraphError::new("Old node not found"))?;

        self.graph.node_weight_mut(node_index).unwrap().path = new_name.clone();
        self.node_hash.remove(old_name);
        self.node_hash.insert(new_name.clone(), node_index);

        Ok(())
    }

    fn int_safe_delete_edge_ref(&mut self, edge: EdgeIndex<u32>) -> Result<()> {
        let (_, target) = self
            .graph
            .edge_endpoints(edge)
            .ok_or(NoteGraphError::new("Edge not found"))?;
        let target_data = self.int_get_node_weight(target)?.clone();
        let target_resolved = target_data.resolved();

        self.graph.remove_edge(edge);

        if !target_resolved && self.int_iter_incoming_edges(target).count() == 0 {
            self.int_remove_node(&target_data.path)?;
        }

        Ok(())
    }

    pub fn int_safe_delete_edge(
        &mut self,
        from: &String,
        to: &String,
        edge_type: &String,
    ) -> Result<()> {
        match (self.int_get_node_index(from), self.int_get_node_index(to)) {
            (Some(from_index), Some(to_index)) => {
                match self.int_get_edge(from_index, to_index, edge_type) {
                    Some(edge) => self.int_safe_delete_edge_ref(edge.id()),
                    None => Err(NoteGraphError::new("Edge not found")),
                }
            }
            _ => Err(NoteGraphError::new("Node not found")),
        }
    }

    pub fn int_safe_add_edge(
        &mut self,
        source_path: &String,
        target_path: &String,
        edge_type: &String,
        edge_source: &String,
    ) {
        let source = self.node_hash.get(source_path);
        let target = self.node_hash.get(target_path);

        let source_index: NodeIndex<u32>;
        let target_index: NodeIndex<u32>;
        let mut add_from_to_hash = false;
        let mut add_to_to_hash = false;

        if source.is_none() {
            source_index = self
                .graph
                .add_node(NodeData::new_unresolved(source_path.clone()));
            add_from_to_hash = true;
        } else {
            source_index = source.unwrap().clone();
        }

        if target.is_none() {
            if source_path == target_path {
                target_index = source_index;
            } else {
                target_index = self
                    .graph
                    .add_node(NodeData::new_unresolved(target_path.clone()));
                add_to_to_hash = true;
            }
        } else {
            target_index = target.unwrap().clone();
        }

        if add_from_to_hash {
            self.node_hash.insert(source_path.clone(), source_index);
        }

        if add_to_to_hash {
            self.node_hash.insert(source_path.clone(), target_index);
        }

        self.int_add_edge(
            source_index,
            target_index,
            EdgeData::new(edge_type.clone(), edge_source.clone(), false, 0),
            &mut None,
        );
    }

    pub fn assert_correct_trackers(&self) {
        let mut edge_types: HashSet<String> = HashSet::new();

        for edge in self.graph.edge_references() {
            edge_types.insert(edge.weight().edge_type.clone());
        }

        assert_eq!(edge_types, self.edge_types);

        let mut node_hash: HashMap<String, NodeIndex<u32>> = HashMap::new();

        for node_ref in self.graph.node_references() {
            node_hash.insert(node_ref.weight().path.clone(), node_ref.id());
        }

        assert_eq!(node_hash, self.node_hash);
    }
}
