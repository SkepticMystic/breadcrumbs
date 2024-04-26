use crate::{graph::NoteGraph, graph_construction::GraphConstructionNodeData, utils::Result};
use wasm_bindgen::prelude::*;

pub trait GraphUpdate {
    fn apply(&self, graph: &mut NoteGraph) -> Result<()>;
}

#[wasm_bindgen]
pub struct BatchGraphUpdate {
    updates: Vec<Box<dyn GraphUpdate>>,
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

impl BatchGraphUpdate {
    pub fn add_update(&mut self, update: Box<dyn GraphUpdate>) {
        self.updates.push(update);
    }

    pub fn apply(&self, graph: &mut NoteGraph) -> Result<()> {
        for update in &self.updates {
            update.apply(graph)?;
        }

        Ok(())
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct AddNoteGraphUpdate {
    data: GraphConstructionNodeData,
}

#[wasm_bindgen]
impl AddNoteGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(data: GraphConstructionNodeData) -> Self {
        Self { data }
    }

    pub fn add_to_batch(&self, batch: &mut BatchGraphUpdate) {
        batch.add_update(Box::new(self.clone()));
    }
}

impl GraphUpdate for AddNoteGraphUpdate {
    fn apply(&self, graph: &mut NoteGraph) -> Result<()> {
        graph.int_safe_add_node(&self.data)
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

    pub fn add_to_batch(&self, batch: &mut BatchGraphUpdate) {
        batch.add_update(Box::new(self.clone()));
    }
}

impl GraphUpdate for RemoveNoteGraphUpdate {
    fn apply(&self, graph: &mut NoteGraph) -> Result<()> {
        graph.int_safe_remove_node(&self.data)
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

    pub fn add_to_batch(&self, batch: &mut BatchGraphUpdate) {
        batch.add_update(Box::new(self.clone()));
    }
}

impl GraphUpdate for RenameNoteGraphUpdate {
    fn apply(&self, graph: &mut NoteGraph) -> Result<()> {
        graph.int_safe_rename_node(&self.old_name, &self.new_name)
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct AddEdgeGraphUpdate {
    from: String,
    to: String,
    edge_type: String,
}

#[wasm_bindgen]
impl AddEdgeGraphUpdate {
    #[wasm_bindgen(constructor)]
    pub fn new(from: String, to: String, edge_type: String) -> Self {
        Self {
            from,
            to,
            edge_type,
        }
    }

    pub fn add_to_batch(&self, batch: &mut BatchGraphUpdate) {
        batch.add_update(Box::new(self.clone()));
    }
}

impl GraphUpdate for AddEdgeGraphUpdate {
    fn apply(&self, graph: &mut NoteGraph) -> Result<()> {
        Ok(graph.int_safe_add_edge(&self.from, &self.to, &self.edge_type))
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

    pub fn add_to_batch(&self, batch: &mut BatchGraphUpdate) {
        batch.add_update(Box::new(self.clone()));
    }
}

impl GraphUpdate for RemoveEdgeGraphUpdate {
    fn apply(&self, graph: &mut NoteGraph) -> Result<()> {
        graph.int_safe_delete_edge(&self.from, &self.to, &self.edge_type)
    }
}
