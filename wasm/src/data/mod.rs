use std::{fmt::Debug, path::Path};

use petgraph::{
    graph::{EdgeIndex, NodeIndex},
    stable_graph::EdgeReference,
};
use wasm_bindgen::prelude::*;

use crate::data::{edge::EdgeData, node::NodeData};

pub mod construction;
pub mod edge;
pub mod edge_list;
pub mod edge_struct;
pub mod node;
pub mod rules;
pub mod traversal;

pub type NGEdgeIndex = EdgeIndex<u32>;
pub type NGNodeIndex = NodeIndex<u32>;
pub type NGEdgeRef<'a> = EdgeReference<'a, EdgeData, u32>;

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct NodeStringifyOptions {
    extension: bool,
    folder: bool,
    alias: bool,
    trim_basename_delimiter: Option<String>,
}

#[wasm_bindgen]
impl NodeStringifyOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(
        extension: bool,
        folder: bool,
        alias: bool,
        trim_basename_delimiter: Option<String>,
    ) -> NodeStringifyOptions {
        NodeStringifyOptions {
            extension,
            folder,
            alias,
            trim_basename_delimiter,
        }
    }
}

#[wasm_bindgen]
impl NodeStringifyOptions {
    pub fn stringify_node(&self, node: &NodeData) -> String {
        if self.alias && !node.aliases.is_empty() {
            node.aliases.first().unwrap().clone()
        } else if self.trim_basename_delimiter.is_some() {
            node.path.clone()
        } else {
            let mut path = Path::new(&node.path);
            if !self.folder {
                path = Path::new(path.file_name().unwrap());
            }

            if !self.extension {
                path.with_extension("").as_string()
            } else {
                path.as_string()
            }
        }
    }
}

trait AsString {
    fn as_string(&self) -> String;
}

impl AsString for Path {
    fn as_string(&self) -> String {
        String::from(self.to_string_lossy())
    }
}
