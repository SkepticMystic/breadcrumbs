use std::rc::Rc;

use wasm_bindgen::prelude::*;

use crate::{
    graph::NoteGraph,
    graph_construction::{GCEdgeData, GCNodeData},
};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TransitiveGraphRule {
    name: Rc<str>,
    // the path by edge type
    path: Vec<Rc<str>>,
    // the edge type to add
    edge_type: Rc<str>,
    // the edge type to add
    rounds: u8,
    can_loop: bool,
    close_reversed: bool,
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
        let mut name = name.trim().to_string();
        if name.is_empty() {
            name = format!(
                "[{}] {} {}",
                path.join(", "),
                if close_reversed { "<-" } else { "->" },
                edge_type
            );
        }

        TransitiveGraphRule {
            name: Rc::from(name),
            path: path.into_iter().map(Rc::from).collect(),
            edge_type: Rc::from(edge_type),
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
    pub fn name(&self) -> Rc<str> {
        Rc::clone(&self.name)
    }

    pub fn edge_type(&self) -> Rc<str> {
        Rc::clone(&self.edge_type)
    }

    pub fn iter_path(&self) -> impl Iterator<Item = &Rc<str>> {
        self.path.iter()
    }

    pub fn rounds(&self) -> u8 {
        self.rounds
    }

    pub fn can_loop(&self) -> bool {
        self.can_loop
    }

    pub fn close_reversed(&self) -> bool {
        self.close_reversed
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
        node_data.push(GCNodeData::new(
            counter.to_string(),
            vec![],
            true,
            false,
            false,
        ));
        edge_data.push(GCEdgeData::new(
            counter.to_string(),
            (counter + 1).to_string(),
            element.to_string(),
            "explicit".to_string(),
        ));

        counter += 1;
    }

    node_data.push(GCNodeData::new(
        counter.to_string(),
        vec![],
        true,
        false,
        false,
    ));

    graph.build_graph(node_data, edge_data);

    graph
}
