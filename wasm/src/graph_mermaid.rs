use std::collections::HashMap;

use itertools::{EitherOrBoth, Itertools};
use petgraph::{stable_graph::NodeIndex, visit::EdgeRef};
use wasm_bindgen::prelude::*;
use web_time::Instant;

use crate::{
    graph::{EdgeData, NoteGraph},
    utils::{NoteGraphError, Result},
};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct MermaidGraphOptions {
    active_node: Option<String>,
    init_line: String,
    chart_type: String,
    direction: String,
    collapse_opposing_edges: bool,
    edge_label_attributes: Vec<String>,
    node_label_fn: Option<js_sys::Function>,
}

#[wasm_bindgen]
impl MermaidGraphOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(
        active_node: Option<String>,
        init_line: String,
        chart_type: String,
        direction: String,
        collapse_opposing_edges: bool,
        edge_label_attributes: Vec<String>,
        node_label_fn: Option<js_sys::Function>,
    ) -> MermaidGraphOptions {
        MermaidGraphOptions {
            active_node,
            init_line,
            chart_type,
            direction,
            collapse_opposing_edges,
            edge_label_attributes,
            node_label_fn,
        }
    }
}

#[wasm_bindgen]
pub struct MermaidGraphData {
    mermaid: String,
    traversal_time: u64,
    total_time: u64,
}

#[wasm_bindgen]
impl MermaidGraphData {
    #[wasm_bindgen(getter)]
    pub fn mermaid(&self) -> String {
        self.mermaid.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn traversal_time(&self) -> u64 {
        self.traversal_time
    }

    #[wasm_bindgen(getter)]
    pub fn total_time(&self) -> u64 {
        self.total_time
    }
}

impl MermaidGraphData {
    pub fn new(mermaid: String, traversal_time: u64, total_time: u64) -> MermaidGraphData {
        MermaidGraphData {
            mermaid,
            traversal_time,
            total_time,
        }
    }
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn generate_mermaid_graph(
        &self,
        entry_nodes: Vec<String>,
        edge_types: Vec<String>,
        max_depth: u32,
        diagram_options: MermaidGraphOptions,
    ) -> Result<MermaidGraphData> {
        let now = Instant::now();

        let mut entry_node_indices: Vec<NodeIndex<u32>> = Vec::new();
        for node in entry_nodes {
            let node_index = self
                .int_get_node_index(&node)
                .ok_or(NoteGraphError::new("Node not found"))?;
            entry_node_indices.push(node_index);
        }

        let (node_map, edge_map) = self.int_traverse_breadth_first(
            entry_node_indices,
            Some(&edge_types),
            max_depth,
            |_, depth| depth,
            |edge| edge,
        );

        let traversal_elapsed = now.elapsed();

        let mut result = String::new();
        // NOTE: double curly braces are used to escape the curly braces in the string
        result.push_str(&diagram_options.init_line);
        result.push_str("\n");
        result.push_str(
            format!(
                "{} {}\n",
                diagram_options.chart_type, diagram_options.direction
            )
            .as_str(),
        );

        // accumulate edges by direction, so that we can collapse them in the next step
        let mut accumulated_edges: HashMap<
            (NodeIndex<u32>, NodeIndex<u32>),
            (NodeIndex<u32>, NodeIndex<u32>, Vec<EdgeData>, Vec<EdgeData>),
        > = HashMap::new();

        // TODO: this sucks, maybe use a tuple of node indices instead of strings
        for (_, edge_ref) in edge_map {
            let forward_dir = (edge_ref.source(), edge_ref.target());

            let entry1 = accumulated_edges.get_mut(&forward_dir);
            match entry1 {
                Some((_, _, forward, _)) => {
                    forward.push(edge_ref.weight().clone());
                }
                None => {
                    let backward_dir = (edge_ref.target(), edge_ref.source());

                    let entry2 = accumulated_edges.get_mut(&backward_dir);
                    match entry2 {
                        Some((_, _, _, backward)) => {
                            backward.push(edge_ref.weight().clone());
                        }
                        None => {
                            accumulated_edges.insert(
                                forward_dir,
                                (
                                    edge_ref.source(),
                                    edge_ref.target(),
                                    vec![edge_ref.weight().clone()],
                                    Vec::new(),
                                ),
                            );
                        }
                    }
                }
            }
        }

        let mut unresolved_nodes = Vec::new();

        // add nodes to the graph
        for element in node_map.iter() {
            let weight = self.int_get_node_weight(element.0.clone())?;

            let node_label = match diagram_options.node_label_fn {
                Some(ref function) => {
                    match function.call1(&JsValue::NULL, &weight.clone().into()) {
                        Ok(value) => value.as_string().unwrap_or_default(),
                        Err(e) => {
                            return Err(NoteGraphError::new(
                                format!("Error calling function: {:?}", e).as_str(),
                            ));
                        }
                    }
                }
                None => weight.path.clone(),
            };

            result.push_str(&format!("    {}(\"{}\")\n", element.0.index(), node_label));
            if !weight.resolved {
                unresolved_nodes.push(element.0.index());
            }
        }

        // collapse edge data and add them to the graph
        for (from, to, forward, backward) in accumulated_edges.values() {
            if diagram_options.collapse_opposing_edges {
                result.push_str(&self.generate_mermaid_edge(
                    from,
                    to,
                    forward.clone(),
                    backward.clone(),
                    &diagram_options,
                ));
            } else {
                result.push_str(&self.generate_mermaid_edge(
                    from,
                    to,
                    forward.clone(),
                    Vec::new(),
                    &diagram_options,
                ));
                result.push_str(&self.generate_mermaid_edge(
                    to,
                    from,
                    backward.clone(),
                    Vec::new(),
                    &diagram_options,
                ));
            }
        }

        let active_node_index = diagram_options
            .active_node
            .and_then(|node| self.int_get_node_index(&node));
        if let Some(index) = active_node_index {
            result.push_str(&format!("class {} BC-active-node\n", index.index()));
        }

        if !node_map.is_empty() {
            result.push_str(&format!(
                "class {} internal-link\n",
                node_map.iter().map(|(index, _)| index.index()).join(",")
            ));
        }

        if !unresolved_nodes.is_empty() {
            result.push_str(&format!(
                "class {} is-unresolved",
                unresolved_nodes
                    .iter()
                    .map(|index| format!("{}", index))
                    .join(",")
            ));
        }

        let total_elapsed = now.elapsed();

        Ok(MermaidGraphData::new(
            result,
            traversal_elapsed.as_micros() as u64,
            total_elapsed.as_micros() as u64,
        ))
    }
}

impl NoteGraph {
    fn generate_mermaid_edge(
        &self,
        source: &NodeIndex<u32>,
        target: &NodeIndex<u32>,
        forward: Vec<EdgeData>,
        backward: Vec<EdgeData>,
        diagram_options: &MermaidGraphOptions,
    ) -> String {
        let mut label = String::new();

        let same_elements = forward
            .iter()
            .zip(backward.iter())
            .all(|(a, b)| a.edge_type == b.edge_type);
        let all_implied = forward
            .iter()
            .zip_longest(backward.iter())
            .all(|pair| match pair {
                EitherOrBoth::Both(a, b) => a.implied && b.implied,
                EitherOrBoth::Left(a) => a.implied,
                EitherOrBoth::Right(b) => b.implied,
            });

        let arrow_type = match (backward.is_empty(), all_implied) {
            (true, true) => "-.->",
            (true, false) => "-->",
            (false, true) => "-.-",
            (false, false) => "---",
        };

        label.push_str(
            forward
                .iter()
                .map(|edge| edge.get_attribute_label(&diagram_options.edge_label_attributes))
                .collect::<Vec<String>>()
                .join(", ")
                .as_str(),
        );

        if !same_elements && !backward.is_empty() {
            label.push_str(" | ");
            label.push_str(
                backward
                    .iter()
                    .map(|edge| edge.get_attribute_label(&diagram_options.edge_label_attributes))
                    .collect::<Vec<String>>()
                    .join(", ")
                    .as_str(),
            );
        }

        format!(
            "    {} {}|{}| {}\n",
            source.index(),
            arrow_type,
            label,
            target.index()
        )
    }
}