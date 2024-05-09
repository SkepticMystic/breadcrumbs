use petgraph::visit::EdgeRef;
use wasm_bindgen::prelude::*;

use crate::{
    graph::NoteGraph,
    graph_data::EdgeStruct,
    graph_traversal::RecTraversalData,
    utils::{NoteGraphError, Result},
};

#[derive(Clone, Debug)]
pub enum SortField {
    Path,
    Basename,
    EdgeType,
    Implied,
    Neighbour(String),
}

impl SortField {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "path" => Some(SortField::Path),
            "basename" => Some(SortField::Basename),
            "field" => Some(SortField::EdgeType),
            "explicit" => Some(SortField::Implied),
            s if s.starts_with("neighbour-field:") => Some(SortField::Neighbour(
                s["neighbour-field:".len()..].to_string(),
            )),
            _ => None,
        }
    }
}

#[wasm_bindgen]
pub fn create_edge_sorter(field: String, reverse: bool) -> Result<EdgeSorter> {
    let sort_field =
        SortField::from_str(&field).ok_or(NoteGraphError::new("Invalid sort field"))?;
    Ok(EdgeSorter::new(sort_field, reverse))
}

#[wasm_bindgen]
pub fn sort_traversal_data(
    graph: &NoteGraph,
    traversal_data: Vec<RecTraversalData>,
    sorter: &EdgeSorter,
) -> Vec<RecTraversalData> {
    let mut traversal_data = traversal_data.clone();
    sorter.sort_traversal_data(graph, &mut traversal_data);

    traversal_data
}

#[wasm_bindgen]
pub fn sort_edges(
    graph: &NoteGraph,
    edges: Vec<EdgeStruct>,
    sorter: &EdgeSorter,
) -> Vec<EdgeStruct> {
    // utils::log(format!("Sorting edges: {:?}", edges));

    let mut edges = edges.clone();
    sorter.sort_edges(graph, &mut edges);

    edges
}

#[wasm_bindgen]
pub struct EdgeSorter {
    field: SortField,
    reverse: bool,
}

impl EdgeSorter {
    pub fn new(field: SortField, reverse: bool) -> Self {
        EdgeSorter { field, reverse }
    }

    pub fn sort_edges<'a>(&self, graph: &'a NoteGraph, edges: &mut Vec<EdgeStruct>) {
        let ordering = self.get_edge_ordering(graph);

        edges.sort_by(|a, b| self.apply_edge_ordering(&ordering, a, b));
    }

    pub fn sort_traversal_data<'a>(&self, graph: &'a NoteGraph, edges: &mut Vec<RecTraversalData>) {
        let ordering = self.get_edge_ordering(graph);

        edges.sort_by(|a, b| self.apply_edge_ordering(&ordering, &a.edge, &b.edge));
    }

    fn get_edge_ordering<'a>(&self, graph: &'a NoteGraph) -> Box<dyn EdgeOrdering + 'a> {
        match self.field.clone() {
            SortField::Path => Box::from(PathOrdering),
            SortField::Basename => Box::from(BasenameOrdering),
            SortField::EdgeType => Box::from(EdgeTypeOrdering),
            SortField::Implied => Box::from(ImpliedOrdering),
            SortField::Neighbour(neighbour_field) => {
                Box::from(NeighbourOrdering::new(neighbour_field, graph))
            }
        }
    }

    fn apply_edge_ordering<'a>(
        &self,
        ordering: &Box<dyn EdgeOrdering + 'a>,
        a: &EdgeStruct,
        b: &EdgeStruct,
    ) -> std::cmp::Ordering {
        let ordering = ordering.compare(a, b);

        if self.reverse {
            ordering.reverse()
        } else {
            ordering
        }
    }
}

pub trait EdgeOrdering {
    fn compare(&self, a: &EdgeStruct, b: &EdgeStruct) -> std::cmp::Ordering;
}

pub struct PathOrdering;

impl EdgeOrdering for PathOrdering {
    fn compare(&self, a: &EdgeStruct, b: &EdgeStruct) -> std::cmp::Ordering {
        a.target.path.cmp(&b.target.path)
    }
}

pub struct BasenameOrdering;

impl EdgeOrdering for BasenameOrdering {
    fn compare(&self, a: &EdgeStruct, b: &EdgeStruct) -> std::cmp::Ordering {
        let a_basename = a.target.path.split('/').last().unwrap();
        let b_basename = b.target.path.split('/').last().unwrap();

        a_basename.cmp(&b_basename)
    }
}

pub struct EdgeTypeOrdering;

impl EdgeOrdering for EdgeTypeOrdering {
    fn compare(&self, a: &EdgeStruct, b: &EdgeStruct) -> std::cmp::Ordering {
        a.edge.edge_type.cmp(&b.edge.edge_type)
    }
}

pub struct ImpliedOrdering;

impl EdgeOrdering for ImpliedOrdering {
    fn compare(&self, a: &EdgeStruct, b: &EdgeStruct) -> std::cmp::Ordering {
        if a.edge.explicit == b.edge.explicit {
            a.target.path.cmp(&b.target.path)
        } else if a.edge.explicit {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    }
}

pub struct NeighbourOrdering<'a> {
    neighbour_field: String,
    graph: &'a NoteGraph,
}

impl<'a> NeighbourOrdering<'a> {
    pub fn new(neighbour_field: String, graph: &'a NoteGraph) -> Self {
        NeighbourOrdering {
            neighbour_field,
            graph,
        }
    }
}

impl<'a> EdgeOrdering for NeighbourOrdering<'a> {
    fn compare(&self, a: &EdgeStruct, b: &EdgeStruct) -> std::cmp::Ordering {
        let neighbour_field = vec![self.neighbour_field.clone()];

        let a_neighbour = self
            .graph
            .int_iter_outgoing_edges(a.target_index)
            .filter(|edge| edge.weight().matches_edge_filter(Some(&neighbour_field)))
            .next()
            .and_then(|x| self.graph.int_get_node_weight(x.target()).ok());

        let b_neighbour = self
            .graph
            .int_iter_outgoing_edges(b.target_index)
            .filter(|edge| edge.weight().matches_edge_filter(Some(&neighbour_field)))
            .next()
            .and_then(|x| self.graph.int_get_node_weight(x.target()).ok());

        match (a_neighbour, b_neighbour) {
            (Some(a_neighbour), Some(b_neighbour)) => a_neighbour.path.cmp(&b_neighbour.path),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a.target.path.cmp(&b.target.path),
        }
    }
}
