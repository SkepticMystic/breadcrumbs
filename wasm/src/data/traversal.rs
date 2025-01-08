use itertools::Itertools;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    data::edge_struct::EdgeStruct,
    edge_sorting::EdgeSorter,
    graph::NoteGraph,
    traversal::path::{Path, PathList},
    utils::{self, LOGGER},
};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalData {
    /// the edge struct that was traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge: EdgeStruct,
    /// the depth of the node in the traversal
    pub depth: u32,
    /// the number of total children of the node, so also children of children
    pub number_of_children: u32,
    /// the children of the node
    #[wasm_bindgen(getter_with_clone)]
    pub children: Vec<TraversalData>,
}

#[wasm_bindgen]
impl TraversalData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        edge: EdgeStruct,
        depth: u32,
        number_of_children: u32,
        children: Vec<TraversalData>,
    ) -> TraversalData {
        TraversalData {
            edge,
            depth,
            number_of_children,
            children,
        }
    }

    pub fn rec_sort_children(
        &mut self,
        graph: &NoteGraph,
        sorter: &EdgeSorter,
    ) -> utils::Result<()> {
        for child in &mut self.children {
            child.rec_sort_children(graph, sorter)?;
        }

        sorter.sort_traversal_data(graph, &mut self.children)
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl TraversalData {
    fn to_paths(&self) -> Vec<Path> {
        let mut paths = Vec::new();

        for child in &self.children {
            let mut child_paths = child.to_paths();

            for path in &mut child_paths {
                path.edges.insert(0, self.edge.clone());
            }

            paths.extend(child_paths);
        }

        if paths.is_empty() {
            paths.push(Path::new_start(self.edge.clone()));
        }

        paths
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalResult {
    #[wasm_bindgen(getter_with_clone)]
    pub data: Vec<TraversalData>,
    pub node_count: u32,
    pub max_depth: u32,
    pub traversal_time: u64,
}

#[wasm_bindgen]
impl TraversalResult {
    #[wasm_bindgen(constructor)]
    pub fn new(
        data: Vec<TraversalData>,
        node_count: u32,
        max_depth: u32,
        traversal_time: u64,
    ) -> TraversalResult {
        TraversalResult {
            data,
            node_count,
            max_depth,
            traversal_time,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    pub fn to_paths(&self) -> PathList {
        let mut paths = Vec::new();

        for datum in &self.data {
            paths.extend(datum.to_paths());
        }

        paths.sort_by(|a, b| {
            let a_len = a.edges.len();
            let b_len = b.edges.len();

            a_len.cmp(&b_len)
        });

        PathList::new(paths)
    }
}

impl TraversalResult {
    /// Flattens the traversal data by removing the tree structure and deduplicating the edges by their target_path
    pub fn flatten(&mut self, graph: &NoteGraph) -> utils::Result<()> {
        let mut data = Vec::new();

        for datum in self.data.drain(..) {
            rec_flatten_traversal_data(datum, &mut data);
        }

        for datum in &data {
            datum.edge.check_revision(graph)?;
        }

        data.dedup_by(|a, b| {
            a.edge.target_path(graph).unwrap() == b.edge.target_path(graph).unwrap()
        });

        self.data = data;

        Ok(())
    }

    pub fn sort(&mut self, graph: &NoteGraph, sorter: &EdgeSorter) -> utils::Result<()> {
        for datum in &mut self.data {
            datum.rec_sort_children(graph, sorter)?;
        }

        sorter.sort_traversal_data(graph, &mut self.data)
    }
}

fn rec_flatten_traversal_data(mut data: TraversalData, result: &mut Vec<TraversalData>) {
    for child in data.children.drain(..) {
        rec_flatten_traversal_data(child, result);
    }

    result.push(data);
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct FlatTraversalData {
    /// the edge struct that was traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge: EdgeStruct,
    /// the depth of the node in the traversal
    pub depth: u32,
    /// the number of total children of the node, so also children of children
    pub number_of_children: u32,
    /// the children of the node
    #[wasm_bindgen(getter_with_clone)]
    pub children: Vec<usize>,
}

impl FlatTraversalData {
    pub fn new(
        edge: EdgeStruct,
        depth: u32,
        number_of_children: u32,
        children: Vec<usize>,
    ) -> FlatTraversalData {
        FlatTraversalData {
            edge,
            depth,
            number_of_children,
            children,
        }
    }
}

#[wasm_bindgen]
impl FlatTraversalData {
    pub fn get_attribute_label(
        &self,
        graph: &NoteGraph,
        attributes: Vec<String>,
    ) -> utils::Result<String> {
        self.edge.get_attribute_label(graph, attributes)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct FlatTraversalResult {
    #[wasm_bindgen(getter_with_clone)]
    pub data: Vec<FlatTraversalData>,
    pub node_count: u32,
    pub max_depth: u32,
    pub traversal_time: u64,
    #[wasm_bindgen(getter_with_clone)]
    pub entry_nodes: Vec<usize>,
}

impl FlatTraversalResult {
    pub fn new(
        data: Vec<FlatTraversalData>,
        node_count: u32,
        max_depth: u32,
        traversal_time: u64,
        entry_nodes: Vec<usize>,
    ) -> FlatTraversalResult {
        FlatTraversalResult {
            data,
            node_count,
            max_depth,
            traversal_time,
            entry_nodes,
        }
    }

    pub fn from_rec_traversal_result(result: TraversalResult) -> FlatTraversalResult {
        let mut flat_data = Vec::new();
        let mut entry_nodes = Vec::new();

        for datum in result.data {
            entry_nodes.push(rec_flatten_traversal_data_to_flat(datum, &mut flat_data));
        }

        FlatTraversalResult::new(
            flat_data,
            result.node_count,
            result.max_depth,
            result.traversal_time,
            entry_nodes,
        )
    }
}

#[wasm_bindgen]
impl FlatTraversalResult {
    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    pub fn data_at_index(&self, index: usize) -> Option<FlatTraversalData> {
        self.data.get(index).cloned()
    }

    pub fn sort(&mut self, graph: &NoteGraph, sorter: &EdgeSorter) -> utils::Result<()> {
        LOGGER.warn(&format!("Entry nodes: {:?}", self.entry_nodes));

        let cloned_edges = self
            .data
            .iter()
            .map(|datum| datum.edge.clone())
            .collect_vec();

        for datum in &mut self.data {
            sorter.sort_flat_traversal_data(graph, &cloned_edges, &mut datum.children)?;
        }

        sorter.sort_flat_traversal_data(graph, &cloned_edges, &mut self.entry_nodes)?;

        LOGGER.warn(&format!("Entry nodes: {:?}", self.entry_nodes));

        Ok(())
    }
}

fn rec_flatten_traversal_data_to_flat(
    mut data: TraversalData,
    result: &mut Vec<FlatTraversalData>,
) -> usize {
    let children = data
        .children
        .drain(..)
        .map(|datum| rec_flatten_traversal_data_to_flat(datum, result))
        .collect();

    result.push(FlatTraversalData::new(
        data.edge,
        data.depth,
        data.number_of_children,
        children,
    ));
    result.len() - 1
}
