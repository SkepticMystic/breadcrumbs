use std::collections::HashMap;

use itertools::{EitherOrBoth, Itertools};
use petgraph::stable_graph::NodeIndex;
use wasm_bindgen::prelude::*;
use web_time::Instant;

use crate::{
    edge_sorting::EdgeSorter,
    graph::NoteGraph,
    graph_data::{EdgeData, EdgeStruct},
    graph_traversal::TraversalOptions,
    utils::{NoteGraphError, Result},
};

pub struct AccumulatedEdgeHashMap<'a> {
    map: HashMap<
        (NodeIndex<u32>, NodeIndex<u32>),
        (NodeIndex<u32>, NodeIndex<u32>, Vec<&'a EdgeData>, Vec<&'a EdgeData>),
    >
}

impl Default for AccumulatedEdgeHashMap<'_> {
    fn default() -> Self {
        AccumulatedEdgeHashMap {
            map: HashMap::new(),
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct MermaidGraphOptions {
    active_node: Option<String>,
    init_line: String,
    chart_type: String,
    direction: String,
    collapse_opposing_edges: bool,
    edge_label_attributes: Vec<String>,
    edge_sorter: Option<EdgeSorter>,
    node_label_fn: Option<js_sys::Function>,
    link_nodes: bool,
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
        edge_sorter: Option<EdgeSorter>,
        node_label_fn: Option<js_sys::Function>,
        link_nodes: bool,
    ) -> MermaidGraphOptions {
        MermaidGraphOptions {
            active_node,
            init_line,
            chart_type,
            direction,
            collapse_opposing_edges,
            edge_label_attributes,
            edge_sorter,
            node_label_fn,
            link_nodes,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct MermaidGraphData {
    #[wasm_bindgen(getter_with_clone)]
    pub mermaid: String,
    pub traversal_time: u64,
    pub total_time: u64,
}

#[wasm_bindgen]
impl MermaidGraphData {
    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
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
        traversal_options: TraversalOptions,
        diagram_options: MermaidGraphOptions,
    ) -> Result<MermaidGraphData> {
        let now = Instant::now();

        let (nodes, edges) = self.int_traverse_basic(&traversal_options)?;
        let mut edge_structs = edges
            .iter()
            .map(|edge| EdgeStruct::from_edge_ref(edge.1))
            .collect::<Vec<EdgeStruct>>();

        if let Some(edge_sorter) = &diagram_options.edge_sorter {
            edge_sorter.sort_edges(self, &mut edge_structs);
        }

        // utils::log(format!("{:#?}", nodes));
        // utils::log(format!("{:#?}", edges));

        let traversal_elapsed = now.elapsed();

        let mut result = String::new();

        result.push_str(&diagram_options.init_line);
        result.push('\n');
        result.push_str(
            format!(
                "{} {}\n",
                diagram_options.chart_type, diagram_options.direction
            )
            .as_str(),
        );

        // accumulate edges by direction, so that we can collapse them in the next step
        let accumulated_edges = NoteGraph::int_accumulate_edges(self, edge_structs);

        // utils::log(format!("{:#?}", accumulated_edges));

        let mut unresolved_nodes = Vec::new();

        // add nodes to the graph
        for element in nodes.iter() {
            let weight = self.int_get_node_weight(element.0)?;

            let node_label = match diagram_options.node_label_fn {
                Some(ref function) => {
                    match function.call1(&JsValue::NULL, &weight.clone().into()) {
                        Ok(value) => value.as_string().unwrap_or(weight.path.clone()),
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
        for (from, to, forward, backward) in accumulated_edges.map.values() {
            if diagram_options.collapse_opposing_edges || backward.is_empty() {
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

        if !nodes.is_empty() && diagram_options.link_nodes {
            result.push_str(&format!(
                "class {} internal-link\n",
                nodes.iter().map(|(index, _)| index.index()).join(",")
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
        forward: Vec<&EdgeData>,
        backward: Vec<&EdgeData>,
        diagram_options: &MermaidGraphOptions,
    ) -> String {
        let mut label = String::new();

        let same_elements = forward
            .iter()
            .zip(backward.iter())
            .all(|(a, b)| a.edge_type == b.edge_type);
        let all_implied = !forward
            .iter()
            .zip_longest(backward.iter())
            .any(|pair| match pair {
                EitherOrBoth::Both(a, b) => a.explicit || b.explicit,
                EitherOrBoth::Left(a) => a.explicit,
                EitherOrBoth::Right(b) => b.explicit,
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

        if label.is_empty() {
            format!("    {} {} {}\n", source.index(), arrow_type, target.index())
        } else {
            format!(
                "    {} {}|\"{}\"| {}\n",
                source.index(),
                arrow_type,
                label,
                target.index()
            )
        }
    }

    pub fn int_accumulate_edges<'a>(graph: &'a NoteGraph, edges: Vec<EdgeStruct>) -> AccumulatedEdgeHashMap<'a> {
        let mut accumulated_edges = AccumulatedEdgeHashMap::default();

        // sorting the two node indices in the edge tuple could be a speedup, since then only one lookup is needed

        for edge_struct in edges {
            let forward_dir = (edge_struct.source_index, edge_struct.target_index);

            let entry1 = accumulated_edges.map.get_mut(&forward_dir);
            match entry1 {
                Some((_, _, forward, _)) => {
                    forward.push(edge_struct.edge_data_ref(graph));
                }
                None => {
                    let backward_dir = (edge_struct.target_index, edge_struct.source_index);

                    let entry2 = accumulated_edges.map.get_mut(&backward_dir);
                    match entry2 {
                        Some((_, _, _, backward)) => {
                            backward.push(edge_struct.edge_data_ref(graph));
                        }
                        None => {
                            accumulated_edges.map.insert(
                                forward_dir,
                                (
                                    edge_struct.source_index,
                                    edge_struct.target_index,
                                    vec![edge_struct.edge_data_ref(graph)],
                                    Vec::new(),
                                ),
                            );
                        }
                    }
                }
            }
        }

        accumulated_edges
    }
}
