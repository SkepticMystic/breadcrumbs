use std::{collections::HashMap, rc::Rc};

use wasm_bindgen::prelude::wasm_bindgen;

use crate::{data::edge_struct::EdgeStruct, edge_sorting::EdgeSorter, graph::NoteGraph, utils};

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq, Default)]
pub struct EdgeList {
    #[wasm_bindgen(skip)]
    pub edges: Vec<EdgeStruct>,
}

#[wasm_bindgen]
impl EdgeList {
    pub fn get_edges(&self) -> Vec<EdgeStruct> {
        self.edges.clone()
    }

    pub fn get_sorted_edges(
        &self,
        graph: &NoteGraph,
        sorter: &EdgeSorter,
    ) -> utils::Result<Vec<EdgeStruct>> {
        let mut edges = self.edges.clone();
        sorter.sort_edges(graph, &mut edges)?;

        Ok(edges)
    }

    pub fn group_by_type(&self) -> GroupedEdgeList {
        let mut grouped_edges = GroupedEdgeList::new();

        for edge in &self.edges {
            grouped_edges.add_edge(edge.clone());
        }

        grouped_edges
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl EdgeList {
    pub fn new() -> EdgeList {
        EdgeList { edges: Vec::new() }
    }

    pub fn from_vec(edges: Vec<EdgeStruct>) -> EdgeList {
        EdgeList { edges }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq, Default)]
pub struct GroupedEdgeList {
    #[wasm_bindgen(skip)]
    pub edges: HashMap<Rc<str>, EdgeList>,
}

#[wasm_bindgen]
impl GroupedEdgeList {
    pub fn get_edges(&self, edge_type: &str) -> Option<Vec<EdgeStruct>> {
        self.edges
            .get(edge_type)
            .map(|edge_list| edge_list.get_edges())
    }

    pub fn get_sorted_edges(
        &self,
        edge_type: &str,
        graph: &NoteGraph,
        sorter: &EdgeSorter,
    ) -> utils::Result<Option<Vec<EdgeStruct>>> {
        self.edges
            .get(edge_type)
            .map(|x| x.get_sorted_edges(graph, sorter))
            .transpose()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl GroupedEdgeList {
    pub fn new() -> GroupedEdgeList {
        GroupedEdgeList {
            edges: HashMap::new(),
        }
    }

    pub fn from_edge_list(edge_list: EdgeList) -> GroupedEdgeList {
        GroupedEdgeList::from_vec(edge_list.edges)
    }

    pub fn from_vec(edge_list: Vec<EdgeStruct>) -> GroupedEdgeList {
        let mut grouped_edges = GroupedEdgeList::new();

        for edge in edge_list {
            grouped_edges.add_edge(edge);
        }

        grouped_edges
    }

    pub fn add_edge(&mut self, edge_struct: EdgeStruct) {
        let edge_type = edge_struct.edge_type.clone();
        let edge_list = self.edges.entry(edge_type).or_default();
        edge_list.edges.push(edge_struct);
    }
}
