use std::rc::Rc;

use itertools::Itertools;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::graph::{edge_matches_edge_filter, edge_matches_edge_filter_string};

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeData {
    #[wasm_bindgen(skip)]
    pub edge_type: Rc<str>,
    #[wasm_bindgen(skip)]
    pub edge_source: Rc<str>,
    pub explicit: bool,
    pub round: u8,
}

#[wasm_bindgen]
impl EdgeData {
    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    #[wasm_bindgen(js_name = edge_type, getter)]
    pub fn get_edge_type(&self) -> String {
        self.edge_type.to_string()
    }

    #[wasm_bindgen(js_name = edge_source, getter)]
    pub fn get_edge_source(&self) -> String {
        self.edge_source.to_string()
    }
}

impl EdgeData {
    pub fn new(edge_type: Rc<str>, edge_source: Rc<str>, explicit: bool, round: u8) -> EdgeData {
        EdgeData {
            edge_type,
            edge_source,
            explicit,
            round,
        }
    }

    pub fn matches_edge_filter_string(&self, edge_types: Option<&Vec<String>>) -> bool {
        edge_matches_edge_filter_string(self, edge_types)
    }

    pub fn matches_edge_filter(&self, edge_types: Option<&Vec<Rc<str>>>) -> bool {
        edge_matches_edge_filter(self, edge_types)
    }

    pub fn attribute_label(&self, attributes: &Vec<String>) -> String {
        let mut result = vec![];

        // the mapping that exist on the JS side are as follows
        // "field" | "explicit" | "source" | "implied_kind" | "round"

        // TODO(JS): maybe change the attribute options so that the JS side better
        // matches the data
        for attribute in attributes {
            let data = match attribute.as_str() {
                "field" => Some(("field", self.edge_type.to_string())),
                "explicit" => Some(("explicit", self.explicit.to_string())),
                "source" => {
                    if self.explicit {
                        Some(("source", self.edge_source.to_string()))
                    } else {
                        None
                    }
                }
                "implied_kind" => {
                    if !self.explicit {
                        Some(("implied_kind", self.edge_source.to_string()))
                    } else {
                        None
                    }
                }
                "round" => Some(("round", self.round.to_string())),
                _ => None,
            };

            if let Some(data) = data {
                result.push(data);
            }
        }

        match result.len() {
            0 => "".to_string(),
            1 => result[0].1.clone(),
            _ => result.iter().map(|x| format!("{}={}", x.0, x.1)).join(" "),
        }
    }
}
