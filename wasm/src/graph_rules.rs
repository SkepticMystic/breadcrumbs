use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TransitiveGraphRule {
    #[wasm_bindgen(skip)]
    pub name: String,
    // the path by edge type
    #[wasm_bindgen(skip)]
    pub path: Vec<String>,
    // the edge type to add
    #[wasm_bindgen(skip)]
    pub edge_type: String,
    // the edge type to add
    #[wasm_bindgen(skip)]
    pub rounds: u8,
    #[wasm_bindgen(skip)]
    pub can_loop: bool,
    #[wasm_bindgen(skip)]
    pub close_reversed: bool,
}

#[wasm_bindgen]
impl TransitiveGraphRule {
    #[wasm_bindgen(constructor)]
    pub fn new(
        name: String,
        path: Vec<String>,
        edge_type: String,
        rounds: u8,
        can_loop: bool,
        close_reversed: bool,
    ) -> TransitiveGraphRule {
        TransitiveGraphRule {
            name,
            path,
            edge_type,
            rounds,
            can_loop,
            close_reversed,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}
