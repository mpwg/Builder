use glam::Vec2;
use std::collections::{BTreeMap, BTreeSet};
use symbios_ground::HeightMap;
use symbios_tensor::{
    BasisField, KeepOut, MathMode, NodeId, RoadGraph, TensorConfig, TensorFieldConfig,
    extract_blocks, generate_roads,
};

use super::BOUNDS;
use crate::{CityBlock, Junction, MapLayout, Point, Road};

const CENTER: Vec2 = Vec2::new(500.0, 350.0);
const EPSILON: f32 = 0.001;

pub(super) struct Streets {
    pub junctions: Vec<Junction>,
    pub roads: Vec<Road>,
    pub blocks: Vec<CityBlock>,
    pub ring_roads: Vec<u32>,
}

pub(super) fn trace(layout: MapLayout, seed: u64) -> Option<Streets> {
    let terrain = HeightMap::new(100, 70, 10.0);
    let (basis, keep_out) = match layout {
        MapLayout::Grid => (
            BasisField::Grid {
                center: CENTER,
                angle: 0.0,
                radius: 1000.0,
                strength: 1.0,
            },
            Vec::new(),
        ),
        MapLayout::Ring => (
            BasisField::Radial {
                center: CENTER,
                radius: 1000.0,
                strength: 1.0,
            },
            vec![KeepOut {
                center: CENTER,
                radius: 82.0,
            }],
        ),
    };
    let config = TensorConfig {
        seed,
        step_size: 20.0,
        major_road_dist: 210.0,
        minor_road_dist: 210.0,
        snap_radius: 17.0,
        tracer_inertia: 0.0,
        math: MathMode::Portable,
        keep_out,
        field: TensorFieldConfig {
            basis: vec![basis],
            terrain_weight: 0.0,
            ..Default::default()
        },
        ..Default::default()
    };
    let mut graph = generate_roads(&terrain, &config).ok()?;
    let adjacency = active_adjacency(&graph);
    if !is_connected(&adjacency) || !is_planar(&graph) {
        return None;
    }
    extract_blocks(&mut graph);
    if !faces_are_disjoint(&graph) {
        return None;
    }

    let ring = match layout {
        MapLayout::Grid => BTreeSet::new(),
        MapLayout::Ring => ring_boundary(&graph, &adjacency)?,
    };
    export(graph, &adjacency, &ring)
}

fn edge_key(a: NodeId, b: NodeId) -> (NodeId, NodeId) {
    (a.min(b), a.max(b))
}

fn active_adjacency(graph: &RoadGraph) -> Vec<Vec<NodeId>> {
    let mut adjacency = vec![Vec::new(); graph.nodes.len()];
    for edge in graph.edges.iter().filter(|edge| edge.active) {
        adjacency[edge.start as usize].push(edge.end);
        adjacency[edge.end as usize].push(edge.start);
    }
    adjacency
}

fn is_connected(adjacency: &[Vec<NodeId>]) -> bool {
    let Some(start) = adjacency.iter().position(|neighbors| !neighbors.is_empty()) else {
        return false;
    };
    let mut seen = vec![false; adjacency.len()];
    seen[start] = true;
    let mut stack = vec![start];
    while let Some(node) = stack.pop() {
        for &next in &adjacency[node] {
            if !std::mem::replace(&mut seen[next as usize], true) {
                stack.push(next as usize);
            }
        }
    }
    adjacency
        .iter()
        .zip(seen)
        .all(|(neighbors, seen)| neighbors.is_empty() || seen)
}

fn is_planar(graph: &RoadGraph) -> bool {
    let edges: Vec<_> = graph.edges.iter().filter(|edge| edge.active).collect();
    for (index, a) in edges.iter().enumerate() {
        let (p, q) = (graph.node_pos(a.start), graph.node_pos(a.end));
        if !p.is_finite() || !q.is_finite() || p.distance_squared(q) < EPSILON * EPSILON {
            return false;
        }
        for b in &edges[index + 1..] {
            let (r, s) = (graph.node_pos(b.start), graph.node_pos(b.end));
            if p.max(q).cmplt(r.min(s) - Vec2::splat(EPSILON)).any()
                || r.max(s).cmplt(p.min(q) - Vec2::splat(EPSILON)).any()
            {
                continue;
            }
            if edge_key(a.start, a.end) == edge_key(b.start, b.end) {
                return false;
            }
            let shared = [a.start, a.end]
                .into_iter()
                .find(|id| *id == b.start || *id == b.end);
            if let Some(id) = shared {
                let origin = graph.node_pos(id);
                let u = if a.start == id { q } else { p } - origin;
                let v = if b.start == id { s } else { r } - origin;
                if u.dot(v) > 0.0 && u.perp_dot(v).abs() <= EPSILON * u.length().min(v.length()) {
                    return false;
                }
                continue;
            }
            if segments_meet(p, q, r, s) {
                return false;
            }
        }
    }
    true
}

fn segments_meet(a: Vec2, b: Vec2, c: Vec2, d: Vec2) -> bool {
    fn side(a: Vec2, b: Vec2, p: Vec2) -> i8 {
        let distance = (b - a).normalize().perp_dot(p - a);
        if distance > EPSILON {
            1
        } else if distance < -EPSILON {
            -1
        } else {
            0
        }
    }
    side(a, b, c) * side(a, b, d) <= 0 && side(c, d, a) * side(c, d, b) <= 0
}

fn perimeter_edges(perimeter: &[NodeId]) -> impl Iterator<Item = (NodeId, NodeId)> + '_ {
    perimeter
        .iter()
        .copied()
        .zip(perimeter.iter().copied().cycle().skip(1))
}

fn strictly_contains(graph: &RoadGraph, perimeter: &[NodeId], point: Vec2) -> bool {
    let mut inside = false;
    for (a, b) in perimeter_edges(perimeter) {
        let (a, b) = (graph.node_pos(a), graph.node_pos(b));
        let delta = b - a;
        let from_a = point - a;
        if delta.perp_dot(from_a).abs() <= EPSILON * delta.length()
            && from_a.dot(delta) >= 0.0
            && (point - b).dot(delta) <= 0.0
        {
            return false;
        }
        if (a.y > point.y) != (b.y > point.y) && point.x < a.x + delta.x * (point.y - a.y) / delta.y
        {
            inside = !inside;
        }
    }
    inside
}

fn faces_are_disjoint(graph: &RoadGraph) -> bool {
    // In einem planaren Graphen haben echte Flächen getrennte Innenräume.
    // Der Extraktor kann bei Schleifen mit gemeinsamem Knoten einen Umlauf
    // vorzeitig schließen und dadurch verschachtelte Flächen liefern.
    let bounds: Vec<_> = graph
        .blocks
        .iter()
        .map(|block| {
            block.perimeter.iter().map(|&id| graph.node_pos(id)).fold(
                (Vec2::splat(f32::INFINITY), Vec2::splat(f32::NEG_INFINITY)),
                |(min, max), point| (min.min(point), max.max(point)),
            )
        })
        .collect();
    graph.blocks.iter().enumerate().all(|(index, block)| {
        let (min, max) = bounds[index];
        graph
            .blocks
            .iter()
            .enumerate()
            .skip(index + 1)
            .all(|(next, other)| {
                let (other_min, other_max) = bounds[next];
                if max.cmple(other_min).any() || other_max.cmple(min).any() {
                    return true;
                }
                [
                    (&block.perimeter, &other.perimeter),
                    (&other.perimeter, &block.perimeter),
                ]
                .into_iter()
                .all(|(boundary, candidate)| {
                    perimeter_edges(candidate).all(|(a, b)| {
                        let midpoint = (graph.node_pos(a) + graph.node_pos(b)) * 0.5;
                        !strictly_contains(graph, boundary, midpoint)
                    })
                })
            })
    })
}

fn ring_boundary(
    graph: &RoadGraph,
    adjacency: &[Vec<NodeId>],
) -> Option<BTreeSet<(NodeId, NodeId)>> {
    let perimeter = &graph
        .blocks
        .iter()
        .find(|block| strictly_contains(graph, &block.perimeter, CENTER))?
        .perimeter;
    let nodes: BTreeSet<_> = perimeter.iter().copied().collect();
    if nodes.len() != perimeter.len() {
        return None;
    }
    let mut length = 0.0;
    let mut tangential = 0.0;
    for (a, b) in perimeter_edges(perimeter) {
        let (a, b) = (graph.node_pos(a), graph.node_pos(b));
        let delta = b - a;
        let segment = delta.length();
        length += segment;
        let radial = ((a + b) * 0.5 - CENTER).normalize();
        if radial.dot(delta / segment).abs() < 0.65 {
            tangential += segment;
        }
    }
    // Der Rand der zentralen Fläche folgt überwiegend dem Ringfeld. Kurze
    // Querverbindungen schließen die Tangentialstraßen zu einem Hauptstraßenring.
    let ring: BTreeSet<_> = perimeter_edges(perimeter)
        .map(|(a, b)| edge_key(a, b))
        .collect();
    let spoke_count = perimeter
        .iter()
        .filter(|&&node| {
            let position = graph.node_pos(node);
            let outward = (position - CENTER).normalize();
            adjacency[node as usize].iter().any(|&other| {
                !nodes.contains(&other)
                    && (graph.node_pos(other) - position).normalize().dot(outward) > 0.5
            })
        })
        .count();
    (tangential >= length * 0.70 && spoke_count >= 3).then_some(ring)
}

fn export(
    graph: RoadGraph,
    adjacency: &[Vec<NodeId>],
    ring: &BTreeSet<(NodeId, NodeId)>,
) -> Option<Streets> {
    let point = |id| {
        let point = graph.node_pos(id);
        Point {
            x: point.x + BOUNDS.min.x,
            z: point.y + BOUNDS.min.z,
        }
    };
    // Knoten mit Grad 2 bleiben als exakte Stützpunkte im Straßenverlauf.
    let mut junction_ids = vec![0; adjacency.len()];
    let mut junctions = Vec::new();
    for (node, neighbors) in adjacency.iter().enumerate() {
        if !neighbors.is_empty() && neighbors.len() != 2 {
            let id = junctions.len() as u32 + 1;
            junction_ids[node] = id;
            junctions.push(Junction {
                id,
                position: point(node as NodeId),
            });
        }
    }
    let mut edge_roads = BTreeMap::new();
    let mut roads = Vec::new();
    let mut ring_roads = Vec::new();
    for (node, &from) in junction_ids.iter().enumerate().filter(|&(_, id)| *id != 0) {
        let start = node as NodeId;
        for &next in &adjacency[node] {
            let first = edge_key(start, next);
            if edge_roads.contains_key(&first) {
                continue;
            }
            let id = 10_001 + roads.len() as u32;
            let mut points = vec![point(start), point(next)];
            edge_roads.insert(first, id);
            let (mut previous, mut current) = (start, next);
            while junction_ids[current as usize] == 0 {
                let neighbors = &adjacency[current as usize];
                let next = if neighbors[0] == previous {
                    neighbors[1]
                } else {
                    neighbors[0]
                };
                edge_roads.insert(edge_key(current, next), id);
                points.push(point(next));
                (previous, current) = (current, next);
            }
            if ring.contains(&first) {
                ring_roads.push(id);
            }
            roads.push(Road {
                id,
                from,
                to: junction_ids[current as usize],
                points,
                width: 13.0,
            });
        }
    }
    let blocks: Vec<_> = graph
        .blocks
        .iter()
        .filter(|block| {
            let unique: BTreeSet<_> = block.perimeter.iter().collect();
            unique.len() == block.perimeter.len()
        })
        .filter_map(|block| {
            let boundary_road_ids = perimeter_edges(&block.perimeter)
                .map(|(a, b)| edge_roads.get(&edge_key(a, b)).copied())
                .collect::<Option<Vec<_>>>()?;
            Some((
                block.perimeter.iter().copied().map(point).collect(),
                boundary_road_ids,
            ))
        })
        .enumerate()
        .map(|(index, (polygon, boundary_road_ids))| CityBlock {
            id: 20_001 + index as u32,
            polygon,
            boundary_road_ids,
        })
        .collect();
    (blocks.len() >= 3).then_some(Streets {
        junctions,
        roads,
        blocks,
        ring_roads,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use symbios_tensor::{CityBlock as TensorBlock, RoadType};

    #[test]
    fn faces_with_nested_street_loops_are_rejected() {
        let mut graph = RoadGraph::default();
        for (x, z) in [
            (0., 0.),
            (100., 0.),
            (100., 100.),
            (0., 100.),
            (30., 20.),
            (50., 50.),
            (20., 30.),
        ] {
            graph.add_node([x, z].into());
        }
        for (a, b) in [
            (0, 3),
            (1, 2),
            (2, 3),
            (0, 1),
            (0, 4),
            (4, 5),
            (5, 6),
            (6, 0),
        ] {
            graph.add_edge(a, b, RoadType::Major);
        }
        extract_blocks(&mut graph);
        assert!(!faces_are_disjoint(&graph));
    }

    #[test]
    fn inward_dead_ends_do_not_count_as_spokes() {
        let mut graph = RoadGraph::default();
        let ring: Vec<_> = (0..8)
            .map(|i| {
                let angle = std::f32::consts::TAU * i as f32 / 8.0;
                graph.add_node(CENTER + Vec2::from_angle(angle) * 120.0)
            })
            .collect();
        for (a, b) in perimeter_edges(&ring) {
            graph.add_edge(a, b, RoadType::Major);
            let end = graph.add_node(graph.node_pos(a).lerp(CENTER, 0.2));
            graph.add_edge(a, end, RoadType::Minor);
        }
        graph.blocks.push(TensorBlock { perimeter: ring });
        assert!(ring_boundary(&graph, &active_adjacency(&graph)).is_none());
    }
}
