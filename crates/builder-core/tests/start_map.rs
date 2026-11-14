use builder_core::{BuildingKind, Footprint, Game, MapLayout, Point, RoadAccess};
use std::collections::HashSet;

const SAMPLE_SIZE: usize = 256;

#[test]
fn reproduces_the_complete_start_map_from_its_seed() {
    let mut street_positions = HashSet::new();
    let mut logistics_positions = HashSet::new();
    for number in 0..SAMPLE_SIZE {
        let seed = format!("Straße am Mühlbach {number}");
        let game = Game::new(&seed).unwrap();
        assert_eq!(game.view().seed, seed);
        assert_eq!(game.view(), Game::new(&seed).unwrap().view());
        let map = game.view();
        let geometry: Vec<_> = map
            .roads
            .iter()
            .flat_map(|road| {
                road.points
                    .iter()
                    .map(|point| (point.x.to_bits(), point.z.to_bits()))
            })
            .collect();
        assert!(
            street_positions.insert(geometry),
            "Seed {seed}: Straßengeometrie bereits gesehen."
        );
        let sites: Vec<_> = map
            .buildings
            .iter()
            .filter(|building| building.kind != BuildingKind::House)
            .map(|building| (building.position.x.to_bits(), building.position.z.to_bits()))
            .collect();
        assert!(
            logistics_positions.insert(sites),
            "Seed {seed}: Anordnung der Logistikstandorte bereits gesehen."
        );
    }
}

#[test]
fn rejects_seeds_without_content() {
    for seed in ["", "  ", "\t\u{2003}\n"] {
        assert!(Game::new(seed).is_err());
    }
}

#[test]
fn generates_both_connected_street_layouts() {
    let mut saw_grid = false;
    let mut saw_ring = false;
    for number in 0..SAMPLE_SIZE {
        let seed = number.to_string();
        let game = Game::new(&seed).unwrap();
        let map = game.view();
        match map.layout {
            MapLayout::Grid => {
                saw_grid = true;
                assert!(map.ring_roads.is_empty());
                let (mut aligned, mut total) = (0.0, 0.0);
                for a in map.roads.iter().flat_map(|road| road.points.windows(2)) {
                    let length = distance(a[0], a[1]);
                    total += length;
                    if (a[0].x - a[1].x).abs().min((a[0].z - a[1].z).abs()) < length * 0.1 {
                        aligned += length;
                    }
                }
                assert!(aligned > total * 0.8, "Seed {seed}: Rasterachsen fehlen.");
            }
            MapLayout::Ring => {
                saw_ring = true;
                let mut nodes = std::collections::HashMap::new();
                let mut east_crossings = 0;
                for id in &map.ring_roads {
                    let road = map.roads.iter().find(|road| road.id == *id).unwrap();
                    for node in [road.from, road.to] {
                        *nodes.entry(node).or_insert(0) += 1;
                    }
                    east_crossings += road
                        .points
                        .windows(2)
                        .filter(|pair| {
                            let (a, b) = (pair[0], pair[1]);
                            (a.z > 0.0) != (b.z > 0.0)
                                && a.x - a.z * (b.x - a.x) / (b.z - a.z) > 0.0
                        })
                        .count();
                }
                assert_eq!(
                    east_crossings % 2,
                    1,
                    "Seed {seed}: Ring umschließt die Mitte nicht."
                );
                assert!(
                    nodes.values().all(|degree| *degree == 2),
                    "Seed {seed}: Ring offen."
                );
                assert!(
                    map.roads
                        .iter()
                        .filter(|road| !map.ring_roads.contains(&road.id)
                            && (nodes.contains_key(&road.from) || nodes.contains_key(&road.to)))
                        .count()
                        >= 3,
                    "Seed {seed}: Nebenstraßen fehlen."
                );
            }
        }

        let mut ids = HashSet::new();
        for id in map
            .junctions
            .iter()
            .map(|junction| junction.id)
            .chain(map.roads.iter().map(|road| road.id))
            .chain(map.buildings.iter().map(|building| building.id))
            .chain(map.blocks.iter().map(|block| block.id))
            .chain(map.parcels.iter().map(|parcel| parcel.id))
        {
            assert!(ids.insert(id), "Seed {seed}: ID {id} doppelt vergeben.");
        }

        let mut reachable = HashSet::from([map.junctions[0].id]);
        loop {
            let previous_count = reachable.len();
            for road in &map.roads {
                if reachable.contains(&road.from) || reachable.contains(&road.to) {
                    reachable.extend([road.from, road.to]);
                }
            }
            if reachable.len() == previous_count {
                break;
            }
        }
        assert_eq!(reachable.len(), map.junctions.len(), "Seed {seed}");

        for (index, road) in map.roads.iter().enumerate() {
            for (endpoint, id) in [
                (road.points.first(), road.from),
                (road.points.last(), road.to),
            ] {
                let junction = map
                    .junctions
                    .iter()
                    .find(|junction| junction.id == id)
                    .unwrap();
                assert_eq!(endpoint, Some(&junction.position));
            }
            assert!(
                road.points
                    .windows(2)
                    .all(|pair| distance(pair[0], pair[1]) > 0.0009)
            );
            assert!(road.points.iter().all(|point| {
                point.x > map.bounds.min.x
                    && point.x < map.bounds.max.x
                    && point.z > map.bounds.min.z
                    && point.z < map.bounds.max.z
            }));
            for other in &map.roads[index + 1..] {
                for a in road.points.windows(2) {
                    for b in other.points.windows(2) {
                        assert!(
                            !crosses(a, b),
                            "Seed {seed}: Straßen {} und {} kreuzen sich zwischen Knoten.",
                            road.id,
                            other.id
                        );
                    }
                }
            }
        }
    }
    assert!(saw_grid && saw_ring);
}

#[test]
fn places_clear_building_footprints_and_accessible_logistics_sites() {
    for number in 0..SAMPLE_SIZE {
        let seed = format!("Viertel {number}");
        let game = Game::new(&seed).unwrap();
        let map = game.view();
        let logistics: Vec<_> = map
            .buildings
            .iter()
            .filter(|building| building.kind != BuildingKind::House)
            .collect();
        for kind in [
            BuildingKind::Warehouse,
            BuildingKind::CircleSource,
            BuildingKind::TriangleSource,
        ] {
            assert_eq!(
                logistics
                    .iter()
                    .filter(|building| building.kind == kind)
                    .count(),
                1,
                "Seed {seed}"
            );
        }
        assert!(map.buildings.len() >= 24, "Seed {seed}: Zu wenige Häuser.");
        let warehouse = logistics
            .iter()
            .find(|building| building.kind == BuildingKind::Warehouse)
            .unwrap();
        assert!(distance(warehouse.position, Point { x: 0.0, z: 0.0 }) < 180.0);

        for building in &map.buildings {
            assert!(building.height > 0.0);
            let parcel = map
                .parcels
                .iter()
                .find(|parcel| parcel.building_id == Some(building.id))
                .expect("Jedes Gebäude steht auf einer Parzelle.");
            let footprint = Footprint {
                position: building.position,
                facing: building.facing,
                width: building.width,
                depth: building.depth,
            };
            assert!(footprint.width > 0.0 && footprint.depth > 0.0 && footprint.facing.is_finite());
            assert!(
                footprint
                    .corners()
                    .iter()
                    .all(|&corner| within(&parcel.polygon, corner))
            );
            assert_eq!(building.access, Some(parcel.access.road_id));
            assert_eq!(building.access_point, parcel.access.point);
        }
        assert_eq!(
            map.parcels
                .iter()
                .filter(|parcel| parcel.building_id.is_some())
                .count(),
            map.buildings.len()
        );

        for (index, parcel) in map.parcels.iter().enumerate() {
            let block = map
                .blocks
                .iter()
                .find(|block| block.id == parcel.block_id)
                .unwrap();
            assert!(
                parcel
                    .polygon
                    .iter()
                    .all(|&point| within(&block.polygon, point))
            );
            assert!(
                edges(&parcel.polygon).all(|a| edges(&block.polygon).all(|b| !crosses(&a, &b)))
            );
            let footprint = if parcel.building_id.is_none() {
                assert!(parcel.buildable.width >= 53.0 && parcel.buildable.depth >= 36.0);
                Footprint {
                    width: 53.0,
                    depth: 36.0,
                    ..parcel.buildable
                }
            } else {
                parcel.buildable
            };
            let corners = footprint.corners();
            assert!(corners.iter().all(|&point| within(&parcel.polygon, point)));
            let driveway = [footprint.front(), parcel.access.point];
            let length = distance(driveway[0], driveway[1]);
            assert!(length > 6.5 && length < 30.0);
            assert!(
                (distance(footprint.position, driveway[1]) - length - footprint.depth * 0.5).abs()
                    < 0.001
            );

            let road = map
                .roads
                .iter()
                .find(|road| road.id == parcel.access.road_id)
                .unwrap();
            assert!(block.boundary_road_ids.contains(&road.id));
            assert!(road_distance(parcel.access.point, &road.points) < 0.001);

            for road in &map.roads {
                let clearance = road.width * 0.5;
                for segment in road.points.windows(2) {
                    let [start, end] = [segment[0], segment[1]];
                    if !nearby(&parcel.polygon, segment, clearance + 3.0)
                        && !nearby(&driveway, segment, clearance + 2.0)
                    {
                        continue;
                    }
                    assert!(polygon_to_segment(&corners, [start, end]) >= clearance - 0.001);
                    assert!(polygon_to_segment(&parcel.polygon, [start, end]) >= clearance - 0.001);
                    let distance = segment_distance(driveway, [start, end]);
                    if road.id != parcel.access.road_id {
                        assert!(
                            distance >= clearance + RoadAccess::DRIVEWAY_WIDTH * 0.5 - 0.001,
                            "Seed {seed}: Parzelle {} kreuzt die Straße {}.",
                            parcel.id,
                            road.id
                        );
                    } else if road_distance(driveway[1], segment) > 0.001 {
                        assert!(!crosses(&driveway, segment));
                    }
                }
            }

            for other in &map.parcels[index + 1..] {
                let other_driveway = [other.buildable.front(), other.access.point];
                if nearby(&parcel.polygon, &other.polygon, 0.0) {
                    assert!(!rectangles_overlap(&parcel.polygon, &other.polygon));
                }
                for (line, against) in [
                    (driveway, &other.polygon),
                    (other_driveway, &parcel.polygon),
                ] {
                    if nearby(&line, against, RoadAccess::DRIVEWAY_WIDTH * 0.5) {
                        assert!(
                            polygon_to_segment(against, line)
                                >= RoadAccess::DRIVEWAY_WIDTH * 0.5 - 0.001
                        );
                    }
                }
            }
        }
        for block in &map.blocks {
            assert!(
                map.parcels
                    .iter()
                    .any(|parcel| parcel.block_id == block.id && parcel.building_id.is_none())
            );
        }
    }
}

fn distance(a: Point, b: Point) -> f32 {
    (a.x - b.x).hypot(a.z - b.z)
}

fn road_distance(point: Point, road: &[Point]) -> f32 {
    road.windows(2)
        .map(|pair| {
            let [start, end] = [pair[0], pair[1]];
            let x = end.x - start.x;
            let z = end.z - start.z;
            let fraction = (((point.x - start.x) * x + (point.z - start.z) * z) / (x * x + z * z))
                .clamp(0.0, 1.0);
            distance(
                point,
                Point {
                    x: start.x + fraction * x,
                    z: start.z + fraction * z,
                },
            )
        })
        .fold(f32::INFINITY, f32::min)
}

fn edges(polygon: &[Point]) -> impl Iterator<Item = [Point; 2]> + '_ {
    (0..polygon.len()).map(|i| [polygon[i], polygon[(i + 1) % polygon.len()]])
}

fn within(polygon: &[Point], p: Point) -> bool {
    let mut inside = false;
    for [a, b] in edges(polygon) {
        if (a.z > p.z) != (b.z > p.z) && p.x < a.x + (p.z - a.z) * (b.x - a.x) / (b.z - a.z) {
            inside = !inside;
        }
    }
    inside
}

fn nearby(a: &[Point], b: &[Point], tolerance: f32) -> bool {
    let aabb = |v: &[Point], project: fn(Point) -> f32| {
        v.iter()
            .map(|&point| project(point))
            .fold((f32::INFINITY, f32::NEG_INFINITY), |(lo, hi), x| {
                (lo.min(x), hi.max(x))
            })
    };
    [((|p: Point| p.x) as fn(Point) -> f32), |p: Point| p.z]
        .into_iter()
        .all(|axis| {
            let (lo, hi) = aabb(a, axis);
            let (lo2, hi2) = aabb(b, axis);
            lo <= hi2 + tolerance && lo2 <= hi + tolerance
        })
}

fn rectangles_overlap(a: &[Point], b: &[Point]) -> bool {
    [a, b]
        .into_iter()
        .flat_map(|polygon| edges(polygon).take(2))
        .all(|[x, y]| {
            let projection = |polygon: &[Point]| {
                let length = distance(x, y);
                polygon
                    .iter()
                    .map(|p| ((y.z - x.z) * p.x - (y.x - x.x) * p.z) / length)
                    .fold((f32::INFINITY, f32::NEG_INFINITY), |(lo, hi), k| {
                        (lo.min(k), hi.max(k))
                    })
            };
            let (lo, hi) = projection(a);
            let (lo2, hi2) = projection(b);
            hi.min(hi2) - lo.max(lo2) > 0.001
        })
}

fn polygon_to_segment(polygon: &[Point], segment: [Point; 2]) -> f32 {
    if segment.iter().any(|&p| within(polygon, p)) {
        return 0.0;
    }
    edges(polygon)
        .map(|edge| segment_distance(edge, segment))
        .fold(f32::INFINITY, f32::min)
}

fn segment_distance(a: [Point; 2], b: [Point; 2]) -> f32 {
    if crosses(&a, &b) {
        return 0.0;
    }
    road_distance(a[0], &b)
        .min(road_distance(a[1], &b))
        .min(road_distance(b[0], &a))
        .min(road_distance(b[1], &a))
}

fn crosses(a: &[Point], b: &[Point]) -> bool {
    fn side(line: &[Point], point: Point) -> f32 {
        (line[1].x - line[0].x) * (point.z - line[0].z)
            - (line[1].z - line[0].z) * (point.x - line[0].x)
    }

    side(a, b[0]) * side(a, b[1]) < 0.0 && side(b, a[0]) * side(b, a[1]) < 0.0
}

#[test]
fn start_maps_expose_street_bounded_blocks() {
    for seed in ["0", "1", "Viertel 0"] {
        let game = Game::new(seed).unwrap();
        let map = game.view();
        assert!(map.blocks.len() >= 3);
        for block in &map.blocks {
            assert!(block.polygon.len() >= 3);
            assert_eq!(block.polygon.len(), block.boundary_road_ids.len());
            for (i, (&a, &road_id)) in block
                .polygon
                .iter()
                .zip(&block.boundary_road_ids)
                .enumerate()
            {
                let b = block.polygon[(i + 1) % block.polygon.len()];
                let road = map.roads.iter().find(|road| road.id == road_id).unwrap();
                assert!(
                    road.points
                        .windows(2)
                        .any(|edge| edge == [a, b] || edge == [b, a])
                );
                assert!(!block.polygon[..i].contains(&a));
                for j in i + 2..block.polygon.len() {
                    assert!(!crosses(
                        &[a, b],
                        &[
                            block.polygon[j],
                            block.polygon[(j + 1) % block.polygon.len()]
                        ]
                    ));
                }
            }
        }
    }
}

#[test]
fn reserves_a_logistics_parcel_in_every_block() {
    for seed in ["0", "1"] {
        let game = Game::new(seed).unwrap();
        let map = game.view();
        for block in &map.blocks {
            let parcel = map.parcels.iter().find(|parcel| {
                parcel.block_id == block.id
                    && parcel.building_id.is_none()
                    && parcel.buildable.width >= 53.0
                    && parcel.buildable.depth >= 36.0
            });
            assert!(
                parcel.is_some(),
                "Seed {seed}, Block {}: freier Logistikbauplatz fehlt.",
                block.id
            );
        }
    }
}
