use petgraph::prelude::EdgeRef;

use crate::{
    data::{
        construction::{GCEdgeData, GCNodeData},
        node::NodeData,
        NGEdgeIndex, NGNodeIndex,
    },
    graph::NoteGraph,
    utils,
    utils::{NoteGraphError, LOGGER},
};

pub(super) trait UpdateableGraph {
    /// Adds a node to the graph.
    /// Throws an error if the node already exists and is resolved.
    fn upd_add_node(&mut self, data: GCNodeData) -> utils::Result<()>;
    fn upd_remove_node(&mut self, name: &str) -> utils::Result<()>;
    fn upd_rename_node(&mut self, old_name: &str, new_name: &str) -> utils::Result<()>;
    fn upd_add_edge(&mut self, data: GCEdgeData) -> utils::Result<()>;
    fn upd_remove_edge(&mut self, from: &str, to: &str, edge_type: &str) -> utils::Result<()>;
}

/// INVARIANT: These update methods should keep the node_hash intact, but the
/// edge type tracker can be made inconsistent.
impl UpdateableGraph for NoteGraph {
    fn upd_add_node(&mut self, data: GCNodeData) -> utils::Result<()> {
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
                let node_index = self.graph.add_node(data.into());
                self.node_hash.insert(node_path, node_index);
            }
        }

        Ok(())
    }

    fn upd_remove_node(&mut self, name: &str) -> utils::Result<()> {
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

    fn upd_rename_node(&mut self, old_name: &str, new_name: &str) -> utils::Result<()> {
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

    fn upd_add_edge(&mut self, data: GCEdgeData) -> utils::Result<()> {
        let source = self
            .int_get_node_index(&data.source)
            .ok_or(NoteGraphError::new(
                "failed to add edge, source node not found",
            ))?;
        let target = self.get_node_index_or_create_unresolved(&data.target);

        if self.int_has_edge(source, target, &data.edge_type) {
            return Ok(());
        }

        self.graph.add_edge(source, target, data.to_edge_data());

        Ok(())
    }

    fn upd_remove_edge(&mut self, from: &str, to: &str, edge_type: &str) -> utils::Result<()> {
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

/// Helper methods for the impl above.
impl NoteGraph {
    /// Given an edge index, removes the edge from the graph.
    /// If the target node is unresolved and has no incoming edges, it will be
    /// removed as well.
    ///
    /// INVARIANT: This function does not update the edge type tracker.
    fn remove_edge_by_index(&mut self, edge_index: NGEdgeIndex) -> utils::Result<()> {
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

    /// Given a node index and the name of a node, removes it from the graph and
    /// the node hash.
    ///
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
