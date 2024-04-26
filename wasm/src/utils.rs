use petgraph::visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences};
use std::{collections::VecDeque, fmt};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    pub fn log_str(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: String);
}

pub type Result<T> = std::result::Result<T, NoteGraphError>;

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct NoteGraphError {
    message: String,
}

#[wasm_bindgen]
impl NoteGraphError {
    #[wasm_bindgen(constructor)]
    pub fn new(message: &str) -> NoteGraphError {
        NoteGraphError {
            message: message.to_string(),
        }
    }

    #[wasm_bindgen(getter)]
    pub fn message(&self) -> String {
        self.message.clone()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        format!("{:?}", self)
    }
}

impl fmt::Display for NoteGraphError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

pub struct DepthFirstTraversalDataStructure<T> {
    stack: Vec<T>,
}

pub struct BreadthFirstTraversalDataStructure<T> {
    queue: VecDeque<T>,
}

impl<T> GraphTraversalDataStructure<T> for DepthFirstTraversalDataStructure<T> {
    fn new() -> Self {
        DepthFirstTraversalDataStructure { stack: Vec::new() }
    }

    fn push(&mut self, value: T) {
        self.stack.push(value);
    }

    fn pop(&mut self) -> Option<T> {
        self.stack.pop()
    }

    fn is_empty(&self) -> bool {
        self.stack.is_empty()
    }
}

impl<T> GraphTraversalDataStructure<T> for BreadthFirstTraversalDataStructure<T> {
    fn new() -> Self {
        BreadthFirstTraversalDataStructure {
            queue: VecDeque::new(),
        }
    }

    fn push(&mut self, value: T) {
        self.queue.push_back(value);
    }

    fn pop(&mut self) -> Option<T> {
        self.queue.pop_front()
    }

    fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }
}

pub trait GraphTraversalDataStructure<T> {
    fn new() -> Self;
    fn push(&mut self, value: T);
    fn pop(&mut self) -> Option<T>;
    fn is_empty(&self) -> bool;
}

pub fn graph_eq<N, E, Ty, Ix>(
    a: &petgraph::stable_graph::StableGraph<N, E, Ty, Ix>,
    b: &petgraph::stable_graph::StableGraph<N, E, Ty, Ix>,
) -> bool
where
    N: PartialEq,
    E: PartialEq,
    Ty: petgraph::EdgeType,
    Ix: petgraph::graph::IndexType + PartialEq,
{
    let a_ns = a.node_references().map(|n| n.1);
    let b_ns = b.node_references().map(|n| n.1);
    let a_es = a
        .edge_references()
        .map(|e| (e.source(), e.target(), e.weight()));
    let b_es = b
        .edge_references()
        .map(|e| (e.source(), e.target(), e.weight()));
    a_ns.eq(b_ns) && a_es.eq(b_es)
}
