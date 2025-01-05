use crate::{
    graph::NoteGraph,
    graph_construction::{GCEdgeData, GCNodeData},
    graph_data::{NGEdgeIndex, NGNodeIndex, NodeData},
    graph_rules::TransitiveGraphRule,
    utils::{NoteGraphError, Result, LOGGER},
};
use enum_dispatch::enum_dispatch;
use petgraph::visit::EdgeRef;
use wasm_bindgen::prelude::*;

#[enum_dispatch]
pub trait GraphUpdate {
    fn apply(self, graph: &mut NoteGraph) -> Result<()>;
}

#[enum_dispatch(GraphUpdate)]
pub enum Update {
    AddNoteGraphUpdate,
    RemoveNoteGraphUpdate,
    RenameNoteGraphUpdate,
    AddEdgeGraphUpdate,
    RemoveEdgeGraphUpdate,
    TransitiveRulesGraphUpdate,
}

#[wasm_bindgen]
pub struct BatchGraphUpdate {
    updates: Vec<Update>,
}

#[wasm_bindgen]
impl BatchGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            updates: Vec::new(),
        }
    }
}

impl Default for BatchGraphUpdate {
    fn default() -> Self {
        Self::new()
    }
}

impl BatchGraphUpdate {
    fn add_update(&mut self, update: Update) {
        self.updates.push(update);
    }

    pub fn apply(self, graph: &mut NoteGraph) -> Result<()> {
        for update in self.updates {
            update.apply(graph)?;
        }

        Ok(())
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct AddNoteGraphUpdate {
    data: GCNodeData,
}

#[wasm_bindgen]
impl AddNoteGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(data: GCNodeData) -> Self {
        Self { data }
    }

    pub fn add_to_batch(self, batch: &mut BatchGraphUpdate) {
        batch.add_update(self.into());
    }
}

impl GraphUpdate for AddNoteGraphUpdate {
    fn apply(self, graph: &mut NoteGraph) -> Result<()> {
        graph.upd_add_node(self.data)
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct RemoveNoteGraphUpdate {
    data: String,
}

#[wasm_bindgen]
impl RemoveNoteGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(data: String) -> Self {
        Self { data }
    }

    pub fn add_to_batch(self, batch: &mut BatchGraphUpdate) {
        batch.add_update(self.into());
    }
}

impl GraphUpdate for RemoveNoteGraphUpdate {
    fn apply(self, graph: &mut NoteGraph) -> Result<()> {
        graph.upd_remove_node(&self.data)
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct RenameNoteGraphUpdate {
    old_name: String,
    new_name: String,
}

#[wasm_bindgen]
impl RenameNoteGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(old_name: String, new_name: String) -> Self {
        Self { old_name, new_name }
    }

    pub fn add_to_batch(self, batch: &mut BatchGraphUpdate) {
        batch.add_update(self.into());
    }
}

impl GraphUpdate for RenameNoteGraphUpdate {
    fn apply(self, graph: &mut NoteGraph) -> Result<()> {
        graph.upd_rename_node(&self.old_name, &self.new_name)
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct AddEdgeGraphUpdate {
    data: GCEdgeData,
}

#[wasm_bindgen]
impl AddEdgeGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(data: GCEdgeData) -> Self {
        Self { data }
    }

    pub fn add_to_batch(self, batch: &mut BatchGraphUpdate) {
        batch.add_update(self.into());
    }
}

impl GraphUpdate for AddEdgeGraphUpdate {
    fn apply(self, graph: &mut NoteGraph) -> Result<()> {
        graph.upd_add_edge(self.data)
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct RemoveEdgeGraphUpdate {
    from: String,
    to: String,
    edge_type: String,
}

#[wasm_bindgen]
impl RemoveEdgeGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(from: String, to: String, edge_type: String) -> Self {
        Self {
            from,
            to,
            edge_type,
        }
    }

    pub fn add_to_batch(self, batch: &mut BatchGraphUpdate) {
        batch.add_update(self.into());
    }
}

impl GraphUpdate for RemoveEdgeGraphUpdate {
    fn apply(self, graph: &mut NoteGraph) -> Result<()> {
        graph.upd_remove_edge(&self.from, &self.to, &self.edge_type)
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct TransitiveRulesGraphUpdate {
    new_rules: Vec<TransitiveGraphRule>,
}

#[wasm_bindgen]
impl TransitiveRulesGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(new_rules: Vec<TransitiveGraphRule>) -> Self {
        Self { new_rules }
    }

    pub fn add_to_batch(self, batch: &mut BatchGraphUpdate) {
        batch.add_update(self.into());
    }
}

impl GraphUpdate for TransitiveRulesGraphUpdate {
    fn apply(self, graph: &mut NoteGraph) -> Result<()> {
        graph.transitive_rules = self.new_rules;
        Ok(())
    }
}

trait UpdateableGraph {
    /// Adds a node to the graph.
    /// Throws an error if the node already exists and is resolved.
    fn upd_add_node(&mut self, data: GCNodeData) -> Result<()>;
    fn upd_remove_node(&mut self, name: &str) -> Result<()>;
    fn upd_rename_node(&mut self, old_name: &str, new_name: &str) -> Result<()>;
    fn upd_add_edge(&mut self, data: GCEdgeData) -> Result<()>;
    fn upd_remove_edge(&mut self, from: &str, to: &str, edge_type: &str) -> Result<()>;
}

/// INVARIANT: These update methods should keep the node_hash in tact, but the edge type tracker can be made inconsistent.
impl UpdateableGraph for NoteGraph {
    fn upd_add_node(&mut self, data: GCNodeData) -> Result<()> {
        // we check if the node already exists in the graph
        // if it does, we assert that it is not resolved
        match self.int_get_node_index(&data.path) {
            Some(node_index) => {
                if self.int_get_node_weight(node_index)?.resolved {
                    return Err(NoteGraphError::new(
                        "There already exists a resolved node with the same name.",
                    ));
                }

                let node = self.int_get_node_weight_mut(node_index)?;
                node.override_with_construction_data(data);
            }
            None => {
                let node_path = data.path.clone();
                let node_index = self.graph.add_node(NodeData::from_construction_data(data));
                self.node_hash.insert(node_path, node_index);
            }
        }

        Ok(())
    }

    fn upd_remove_node(&mut self, name: &str) -> Result<()> {
        match self.int_get_node_index(name) {
            Some(index) => {
                let node_weight = self.int_get_node_weight_mut(index)?;

                if !node_weight.resolved {
                    LOGGER.warn(&format!(
                        "Attempted to remove unresolved node {} from the graph",
                        node_weight.path
                    ));
                }

                node_weight.resolved = false;

                let edges_to_remove: Vec<NGEdgeIndex> = self
                    .int_iter_outgoing_edges(index)
                    .map(|edge| edge.id())
                    .collect();

                for edge in edges_to_remove {
                    self.remove_edge_by_index(edge)?;
                }
            }
            None => {
                return Err(NoteGraphError::new("failed to remove node, node not found"));
            }
        }

        Ok(())
    }

    fn upd_rename_node(&mut self, old_name: &str, new_name: &str) -> Result<()> {
        let node_index = self
            .int_get_node_index(old_name)
            .ok_or(NoteGraphError::new(
                "failed to rename node, old node not found",
            ))?;

        self.graph.node_weight_mut(node_index).unwrap().path = new_name.to_owned();
        self.node_hash.remove(old_name);
        self.node_hash.insert(new_name.to_owned(), node_index);

        Ok(())
    }

    fn upd_add_edge(&mut self, data: GCEdgeData) -> Result<()> {
        let source = self
            .int_get_node_index(&data.source)
            .ok_or(NoteGraphError::new(
                "failed to add edge, source node not found",
            ))?;
        let target = self.get_node_index_or_create_unresolved(&data.target);

        if self.int_has_edge(source, target, &data.edge_type) {
            return Ok(());
        }

        self.graph.add_edge(source, target, data.to_explicit_edge());

        Ok(())
    }

    fn upd_remove_edge(&mut self, from: &str, to: &str, edge_type: &str) -> Result<()> {
        let from = self.int_get_node_index(from).ok_or(NoteGraphError::new(
            "failed to delete edge, source node not found",
        ))?;
        let to = self.int_get_node_index(to).ok_or(NoteGraphError::new(
            "failed to delete edge, target node not found",
        ))?;

        match self.int_get_edge(from, to, edge_type) {
            Some(edge) => self.remove_edge_by_index(edge.id()),
            None => Err(NoteGraphError::new("failed to delete edge, edge not found")),
        }
    }
}

impl NoteGraph {
    /// INVARIANT: This function does not update the edge type tracker.
    fn remove_edge_by_index(&mut self, edge_index: NGEdgeIndex) -> Result<()> {
        let (_, target) = self
            .graph
            .edge_endpoints(edge_index)
            .ok_or(NoteGraphError::new("Edge not found"))?;
        let target_data = self.int_get_node_weight(target)?;
        let target_name = target_data.path.clone();
        let target_unresolved = !target_data.resolved;

        self.graph.remove_edge(edge_index);

        if target_unresolved && !self.int_has_incoming_edges(target) {
            // INVARIANT: target node is unresolved and has no incoming edges
            self.remove_node_by_index_and_name(target, &target_name);
        }

        Ok(())
    }

    /// INVARIANT: This function does not update the edge type tracker.
    fn remove_node_by_index_and_name(&mut self, node_index: NGNodeIndex, name: &str) {
        self.node_hash.remove(name);
        self.graph.remove_node(node_index);
    }

    /// Gets the node index for a specific node.
    /// If the node does not exist, a new unresolved node will be created and
    /// the index of the new node returned.
    pub fn get_node_index_or_create_unresolved(&mut self, node: &str) -> NGNodeIndex {
        match self.int_get_node_index(node) {
            Some(node_index) => node_index,
            None => {
                let node_index = self
                    .graph
                    .add_node(NodeData::new_unresolved(node.to_owned()));

                self.node_hash.insert(node.to_owned(), node_index);

                node_index
            }
        }
    }
}
