use builder_core::{BuildingKind, Game, Point};
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
    let mut road_counts = HashSet::new();
    for number in 0..SAMPLE_SIZE {
        let seed = number.to_string();
        let game = Game::new(&seed).unwrap();
        let map = game.view();
        assert_eq!(map.junctions.len(), 9);
        assert!(map.roads.iter().all(|road| road.from != road.to));
        road_counts.insert(map.roads.len());
        if map.roads.len() == 12 {
            for road in &map.roads {
                let start = road.points.first().unwrap();
                let end = road.points.last().unwrap();
                assert!(
                    start.x == end.x || start.z == end.z,
                    "Seed {seed}: Straße im Raster verläuft diagonal."
                );
            }
        } else {
            assert_eq!(map.roads.len(), 11);
            assert!(map.roads.iter().any(|road| road.points.len() > 2));
            let center = map
                .junctions
                .iter()
                .find(|junction| distance(junction.position, Point { x: 0.0, z: 0.0 }) < 60.0)
                .unwrap();
            assert_eq!(
                map.roads
                    .iter()
                    .filter(|road| road.from == center.id || road.to == center.id)
                    .count(),
                3,
                "Seed {seed}"
            );
        }

        let mut ids = HashSet::new();
        for id in map
            .junctions
            .iter()
            .map(|junction| junction.id)
            .chain(map.roads.iter().map(|road| road.id))
            .chain(map.buildings.iter().map(|building| building.id))
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
                    .all(|pair| distance(pair[0], pair[1]) > 1.0)
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
    assert_eq!(road_counts, HashSet::from([11, 12]));
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

        for (index, building) in map.buildings.iter().enumerate() {
            assert!(building.width > 0.0 && building.depth > 0.0 && building.height > 0.0);
            assert!(building.facing.is_finite());
            // Der Umkreis enthält den gesamten gedrehten Grundriss.
            let radius = building.width.hypot(building.depth) * 0.5;
            let position = building.position;
            assert!(
                position.x - radius >= map.bounds.min.x && position.x + radius <= map.bounds.max.x
            );
            assert!(
                position.z - radius >= map.bounds.min.z && position.z + radius <= map.bounds.max.z
            );
            for other in &map.buildings[index + 1..] {
                let other_radius = other.width.hypot(other.depth) * 0.5;
                assert!(
                    distance(position, other.position) >= radius + other_radius + 4.0,
                    "Seed {seed}: Gebäude {} und {} stehen zu dicht.",
                    building.id,
                    other.id
                );
            }
            let road = map
                .roads
                .iter()
                .find(|road| Some(road.id) == building.access)
                .unwrap();
            let front = Point {
                x: position.x + building.facing.sin() * building.depth * 0.5,
                z: position.z + building.facing.cos() * building.depth * 0.5,
            };
            let distance_to_access = road_distance(front, &road.points);
            assert!(road_distance(building.access_point, &road.points) < 0.001);
            assert!(
                (distance(position, building.access_point)
                    - distance(front, building.access_point)
                    - building.depth * 0.5)
                    .abs()
                    < 0.001
            );
            assert!(
                (10.0..=55.0).contains(&distance_to_access),
                "Seed {seed}: Abstand zur Zufahrt: {distance_to_access}"
            );
            assert!(distance_to_access < road_distance(position, &road.points));
            if building.kind != BuildingKind::House {
                let driveway = [front, building.access_point];
                for other in &map.buildings {
                    if other.id != building.id {
                        let other_radius = other.width.hypot(other.depth) * 0.5;
                        assert!(
                            road_distance(other.position, &driveway) >= other_radius + 3.0,
                            "Seed {seed}: Gebäude {} blockiert die Zufahrt zu {}.",
                            other.id,
                            building.id
                        );
                    }
                }
            }

            for road in &map.roads {
                assert!(
                    road_distance(position, &road.points) >= radius + 10.0,
                    "Seed {seed}: Gebäude {} ragt in den Straßenraum von {}.",
                    building.id,
                    road.id
                );
            }
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

fn crosses(a: &[Point], b: &[Point]) -> bool {
    fn side(line: &[Point], point: Point) -> f32 {
        (line[1].x - line[0].x) * (point.z - line[0].z)
            - (line[1].z - line[0].z) * (point.x - line[0].x)
    }

    side(a, b[0]) * side(a, b[1]) < 0.0 && side(b, a[0]) * side(b, a[1]) < 0.0
}
