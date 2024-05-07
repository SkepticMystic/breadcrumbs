use petgraph::visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences};
use std::{collections::VecDeque, error::Error, fmt};
use wasm_bindgen::prelude::*;
use web_time::Instant;

#[cfg(not(feature = "test"))]
#[wasm_bindgen(module = "src/logger/index.ts")]
extern "C" {
    #[wasm_bindgen(js_name = log)]
    pub static LOGGER: Logger;

    pub type Logger;
    #[wasm_bindgen(method)]
    pub fn debug(this: &Logger, message: &str);
    #[wasm_bindgen(method)]
    pub fn info(this: &Logger, message: &str);
    #[wasm_bindgen(method)]
    pub fn warn(this: &Logger, message: &str);
    #[wasm_bindgen(method)]
    pub fn error(this: &Logger, message: &str);
}

#[cfg(feature = "test")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = console)]
    pub static LOGGER: Console;

    pub type Console;
    #[wasm_bindgen(method)]
    pub fn debug(this: &Console, message: &str);
    #[wasm_bindgen(method, js_name = log)]
    pub fn info(this: &Console, message: &str);
    #[wasm_bindgen(method)]
    pub fn warn(this: &Console, message: &str);
    #[wasm_bindgen(method)]
    pub fn error(this: &Console, message: &str);
}

pub struct PerfLogger {
    name: String,
    start: Instant,
    elapsed: Option<u128>,
    splits: Vec<PerfLogger>,
}

impl PerfLogger {
    pub fn new(name: String) -> Self {
        PerfLogger {
            name,
            start: Instant::now(),
            splits: Vec::new(),
            elapsed: None,
        }
    }

    pub fn start_split(&mut self, name: String) -> &mut PerfLogger {
        // stop the last split
        self.stop_split();

        // create a new split
        self.splits.push(PerfLogger::new(name));
        self.splits.last_mut().unwrap()
    }

    pub fn stop_split(&mut self) {
        self.splits.last_mut().map(|split| {
            if !split.stopped() {
                split.stop()
            }
        });
    }

    pub fn stop(&mut self) {
        if self.stopped() {
            LOGGER.warn(&format!("PerfLogger {} is already stopped", self.name));
        } else {
            self.elapsed = Some(self.start.elapsed().as_micros());
            self.stop_split();
        }
    }

    pub fn stopped(&self) -> bool {
        self.elapsed.is_some()
    }

    fn get_log_message(&mut self) -> Vec<String> {
        if !self.stopped() {
            self.stop();
        }

        let mut message = vec![format!(
            "{}ms > {}",
            self.elapsed.unwrap() as f64 / 1000f64,
            self.name
        )];

        for split in self.splits.iter_mut() {
            let mut sub_message = split
                .get_log_message()
                .iter()
                .map(|s| format!(" | {}", s))
                .collect::<Vec<String>>();
            message.append(&mut sub_message);
        }

        message
    }

    pub fn log(&mut self) {
        LOGGER.debug(&self.get_log_message().join("\n"));
    }
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
    pub fn to_fancy_string(&self) -> String {
        format!("{:#?}", self)
    }
}

impl fmt::Display for NoteGraphError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Error for NoteGraphError {}

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
