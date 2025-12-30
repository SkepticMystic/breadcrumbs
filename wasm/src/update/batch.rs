use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    graph::NoteGraph,
    update::{GraphUpdate, Update},
    utils,
};

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
    pub fn add_update(&mut self, update: Update) {
        self.updates.push(update);
    }

    pub fn apply(self, graph: &mut NoteGraph) -> utils::Result<()> {
        for update in self.updates {
            update.apply(graph)?;
        }

        Ok(())
    }
}
