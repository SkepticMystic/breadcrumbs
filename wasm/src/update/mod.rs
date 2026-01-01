use enum_dispatch::enum_dispatch;
use graph::UpdateableGraph;
use wasm_bindgen::prelude::*;

use crate::{
    data::{
        construction::{GCEdgeData, GCNodeData},
        rules::TransitiveGraphRule,
    },
    graph::NoteGraph,
    update::batch::BatchGraphUpdate,
    utils::Result,
};

pub mod batch;
pub mod graph;

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
