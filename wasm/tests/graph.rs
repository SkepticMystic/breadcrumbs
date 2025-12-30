#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use breadcrumbs_graph_wasm::{data::rules::TransitiveGraphRule, graph::NoteGraph};
use wasm_bindgen_test::*;
// wasm_bindgen_test_configure!(run_in_browser);

mod common;

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

    graph
        .build_graph(
            data.0,
            data.1,
            vec![
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
            ],
        )
        .unwrap();

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

    graph
        .build_graph(
            data.0,
            data.1,
            vec![
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
            ],
        )
        .unwrap();

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

    graph
        .build_graph(
            data.0,
            data.1,
            vec![
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
            ],
        )
        .unwrap();
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
