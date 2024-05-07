use wasm_bindgen::prelude::*;

use crate::{
    graph::NoteGraph,
    graph_construction::{GraphConstructionEdgeData, GraphConstructionNodeData},
};

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

impl TransitiveGraphRule {
    pub fn stringify(&self) -> String {
        format!(
            "[{}] {} {}",
            self.path.join(", "),
            if self.close_reversed { "<-" } else { "->" },
            self.edge_type
        )
    }

    pub fn get_name(&self) -> String {
        if self.name.is_empty() {
            return self.stringify();
        } else {
            self.name.clone()
        }
    }
}

#[wasm_bindgen]
pub fn create_graph_from_rule(rule: TransitiveGraphRule) -> NoteGraph {
    let mut graph = NoteGraph::new();

    graph.set_transitive_rules(vec![rule.clone()]);

    let mut node_data = vec![];
    let mut edge_data = vec![];

    let mut counter = 1;
    for element in rule.path.iter() {
        node_data.push(GraphConstructionNodeData::new(
            counter.to_string(),
            vec![],
            true,
            false,
            false,
        ));
        edge_data.push(GraphConstructionEdgeData::new(
            counter.to_string(),
            (counter + 1).to_string(),
            element.clone(),
            "explicit".to_string(),
        ));

        counter += 1;
    }

    node_data.push(GraphConstructionNodeData::new(
        counter.to_string(),
        vec![],
        true,
        false,
        false,
    ));

    graph.build_graph(node_data, edge_data);

    graph
}
