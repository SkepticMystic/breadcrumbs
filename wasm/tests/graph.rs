// #![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use breadcrumbs_graph_wasm::{
    graph::NoteGraph,
    graph_construction::GraphConstructionNodeData,
    graph_rules::TransitiveGraphRule,
    graph_update::{
        AddEdgeGraphUpdate, AddNoteGraphUpdate, BatchGraphUpdate, RemoveNoteGraphUpdate,
    },
    utils::graph_eq,
};
use wasm_bindgen_test::*;
mod common;

// wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_graph_builds() {
    let data = common::tdata_generate_tree(3, 2);
    let graph = common::tdata_to_graph(data);

    assert_eq!(graph.int_node_count(), 15);
    assert_eq!(graph.int_edge_count(), 14);
    graph.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_implied_edge_rules_reverse_direction() {
    let data = common::tdata_generate_tree(3, 2);
    let mut graph = NoteGraph::new();

    graph.set_transitive_rules(vec![
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["down".to_string()],
            "up".to_string(),
            5,
            false,
            true,
        ),
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["up".to_string()],
            "down".to_string(),
            5,
            false,
            true,
        ),
    ]);

    graph.build_graph(data.0, data.1);

    assert_eq!(graph.int_edge_count(), 28);

    let up_edge_1 = graph
        .int_get_edge_by_name(&"0".to_string(), &"root".to_string(), &"up".to_string())
        .unwrap();
    let up_edge_2 = graph
        .int_get_edge_by_name(&"1".to_string(), &"root".to_string(), &"up".to_string())
        .unwrap();

    assert_eq!(up_edge_1.weight().explicit, false);
    assert_eq!(up_edge_2.weight().explicit, false);
    graph.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_implied_edge_rules_sibling() {
    let data = common::tdata_generate_tree(3, 2);
    let mut graph = NoteGraph::new();

    graph.set_transitive_rules(vec![
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["down".to_string()],
            "up".to_string(),
            5,
            false,
            true,
        ),
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["up".to_string()],
            "down".to_string(),
            5,
            false,
            true,
        ),
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["up".to_string(), "down".to_string()],
            "same".to_string(),
            5,
            false,
            false,
        ),
    ]);

    graph.build_graph(data.0, data.1);
    // same edges between siblings exist
    let same_edge_1 = graph
        .int_get_edge_by_name(&"0".to_string(), &"1".to_string(), &"same".to_string())
        .unwrap();
    let same_edge_2 = graph
        .int_get_edge_by_name(&"1".to_string(), &"0".to_string(), &"same".to_string())
        .unwrap();
    // same edges to self do not exist
    let same_edge_3 =
        graph.int_get_edge_by_name(&"0".to_string(), &"0".to_string(), &"same".to_string());
    let same_edge_4 =
        graph.int_get_edge_by_name(&"1".to_string(), &"1".to_string(), &"same".to_string());

    assert_eq!(same_edge_1.weight().explicit, false);
    assert_eq!(same_edge_2.weight().explicit, false);
    assert_eq!(same_edge_3.is_none(), true);
    assert_eq!(same_edge_4.is_none(), true);
    graph.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_implied_edge_rules_sibling_can_loop() {
    let data = common::tdata_generate_tree(3, 2);
    let mut graph = NoteGraph::new();

    graph.set_transitive_rules(vec![
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["down".to_string()],
            "up".to_string(),
            5,
            false,
            true,
        ),
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["up".to_string()],
            "down".to_string(),
            5,
            false,
            true,
        ),
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["up".to_string(), "down".to_string()],
            "same".to_string(),
            5,
            true,
            false,
        ),
    ]);

    graph.build_graph(data.0, data.1);
    // same edges between siblings exist
    let same_edge_1 = graph
        .int_get_edge_by_name(&"0".to_string(), &"1".to_string(), &"same".to_string())
        .unwrap();
    let same_edge_2 = graph
        .int_get_edge_by_name(&"1".to_string(), &"0".to_string(), &"same".to_string())
        .unwrap();
    // same edges to self do not exist
    let same_edge_3 = graph
        .int_get_edge_by_name(&"0".to_string(), &"0".to_string(), &"same".to_string())
        .unwrap();
    let same_edge_4 = graph
        .int_get_edge_by_name(&"1".to_string(), &"1".to_string(), &"same".to_string())
        .unwrap();

    assert_eq!(same_edge_1.weight().explicit, false);
    assert_eq!(same_edge_2.weight().explicit, false);
    assert_eq!(same_edge_3.weight().explicit, false);
    assert_eq!(same_edge_4.weight().explicit, false);
    graph.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_empty_update_does_nothing() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph_1 = common::tdata_to_graph(data.clone());
    let graph_2 = common::tdata_to_graph(data);

    let batch = BatchGraphUpdate::new();
    graph_1.apply_update(batch).unwrap();

    assert!(graph_eq(&graph_1.graph, &graph_2.graph));
    graph_1.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_remove_update() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph = common::tdata_to_graph(data);

    let mut batch = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("0".to_string()).add_to_batch(&mut batch);
    graph.apply_update(batch).unwrap();

    let node_0 = graph.int_get_node_index(&"0".to_string()).unwrap();
    let node_0_weight = graph.int_get_node_weight(node_0).unwrap();

    assert_eq!(node_0_weight.resolved, false);
    assert_eq!(graph.int_has_outgoing_edges(node_0), false);
    assert!(graph.int_has_edge_by_name(&"root".to_string(), &"0".to_string(), &"down".to_string()));

    graph.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_remove_add_update() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph_1 = common::tdata_to_graph(data.clone());
    let graph_2 = common::tdata_to_graph(data);

    let mut batch = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("0".to_string()).add_to_batch(&mut batch);
    AddNoteGraphUpdate::new(GraphConstructionNodeData::new(
        "0".to_string(),
        vec![],
        true,
        false,
        false,
    ))
    .add_to_batch(&mut batch);
    AddEdgeGraphUpdate::new(
        "0".to_string(),
        "00".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    )
    .add_to_batch(&mut batch);
    AddEdgeGraphUpdate::new(
        "0".to_string(),
        "01".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    )
    .add_to_batch(&mut batch);

    graph_1.apply_update(batch).unwrap();

    assert!(graph_eq(&graph_1.graph, &graph_2.graph));

    graph_1.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_remove_add_separate_updates() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph_1 = common::tdata_to_graph(data.clone());
    let graph_2 = common::tdata_to_graph(data);

    let mut batch_1 = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("0".to_string()).add_to_batch(&mut batch_1);

    graph_1.apply_update(batch_1).unwrap();

    let mut batch_2 = BatchGraphUpdate::new();
    AddNoteGraphUpdate::new(GraphConstructionNodeData::new(
        "0".to_string(),
        vec![],
        true,
        false,
        false,
    ))
    .add_to_batch(&mut batch_2);
    AddEdgeGraphUpdate::new(
        "0".to_string(),
        "00".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    )
    .add_to_batch(&mut batch_2);
    AddEdgeGraphUpdate::new(
        "0".to_string(),
        "01".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    )
    .add_to_batch(&mut batch_2);
    graph_1.apply_update(batch_2).unwrap();

    assert!(graph_eq(&graph_1.graph, &graph_2.graph));

    graph_1.assert_correct_trackers();
}
