use itertools::Itertools;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{data::edge_struct::EdgeStruct, graph::NoteGraph, utils};

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct Path {
    #[wasm_bindgen(getter_with_clone)]
    pub edges: Vec<EdgeStruct>,
}

#[wasm_bindgen]
impl Path {
    pub fn length(&self) -> usize {
        self.edges.len()
    }

    pub fn truncate(&self, limit: usize) -> Path {
        let mut copy = self.clone();
        copy.edges.truncate(limit);
        copy
    }

    #[wasm_bindgen(getter)]
    pub fn reverse_edges(&self) -> Vec<EdgeStruct> {
        self.edges.iter().rev().cloned().collect()
    }

    pub fn equals(&self, other: &Path) -> bool {
        self.edges == other.edges
    }

    pub fn get_first_target(&self, graph: &NoteGraph) -> utils::Result<Option<String>> {
        let first = self.edges.first();
        match first {
            Some(edge) => Ok(Some(edge.target_path(graph)?)),
            None => Ok(None),
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl Path {
    pub fn new(edges: Vec<EdgeStruct>) -> Path {
        Path { edges }
    }

    pub fn new_start(edge: EdgeStruct) -> Path {
        Path { edges: vec![edge] }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct PathList {
    paths: Vec<Path>,
}

#[wasm_bindgen]
impl PathList {
    pub fn to_paths(&self) -> Vec<Path> {
        self.paths.clone()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    pub fn select(&self, selection: String) -> PathList {
        match selection.as_str() {
            "shortest" => self.shortest(),
            "longest" => self.longest(),
            _ => self.clone(),
        }
    }

    pub fn max_depth(&self) -> usize {
        self.paths
            .iter()
            .map(|path| path.length())
            .max()
            .unwrap_or(0)
    }

    /// Cuts off all paths at a given depth, then sorts and deduplicates them.
    pub fn process(&self, graph: &NoteGraph, depth: usize) -> utils::Result<Vec<Path>> {
        let paths = self
            .paths
            .iter()
            .map(|path| path.truncate(depth))
            .collect_vec();

        for path in &paths {
            for edge in &path.edges {
                edge.check_revision(graph)?;
            }
        }

        Ok(paths
            .into_iter()
            .sorted_by(|a, b| {
                let a_len = a.edges.len();
                let b_len = b.edges.len();

                a_len.cmp(&b_len).then_with(|| {
                    a.get_first_target(graph)
                        .unwrap()
                        .cmp(&b.get_first_target(graph).unwrap())
                })
            })
            .dedup()
            .collect_vec())
    }
}

impl PathList {
    /// creates new path list, assumes that the paths are already sorted by length
    pub fn new(paths: Vec<Path>) -> PathList {
        PathList { paths }
    }

    pub fn shortest(&self) -> PathList {
        if let Some(shortest) = self.paths.first() {
            PathList::new(vec![shortest.clone()])
        } else {
            PathList::new(Vec::new())
        }
    }

    pub fn longest(&self) -> PathList {
        if let Some(longest) = self.paths.last() {
            PathList::new(vec![longest.clone()])
        } else {
            PathList::new(Vec::new())
        }
    }
}
