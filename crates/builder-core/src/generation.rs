use crate::{Bounds, Building, BuildingKind, GameError, MapLayout, MapView, Point, Road};

const BOUNDS: Bounds = Bounds {
    min: Point {
        x: -500.0,
        z: -350.0,
    },
    max: Point { x: 500.0, z: 350.0 },
};
const ROAD_CLEARANCE: f32 = 10.0;
const BUILDING_CLEARANCE: f32 = 4.0;
mod streets;

pub(crate) fn generate(seed: &str) -> Result<MapView, GameError> {
    let mut random = Random::from_seed(seed);
    let layout = if random.next() & 1 == 0 {
        MapLayout::Grid
    } else {
        MapLayout::Ring
    };
    for _ in 0..16 {
        let Some(streets) = streets::trace(layout, random.next()) else {
            continue;
        };
        let Ok(buildings) = (Buildings {
            roads: &streets.roads,
            placed: Vec::new(),
        })
        .generate(&mut random) else {
            continue;
        };
        if buildings.len() < 24 {
            continue;
        }
        return Ok(MapView {
            seed: seed.to_owned(),
            bounds: BOUNDS,
            layout,
            blocks: streets.blocks,
            parcels: Vec::new(),
            ring_roads: streets.ring_roads,
            junctions: streets.junctions,
            roads: streets.roads,
            buildings,
        });
    }
    Err(GameError::NoLogisticsSite)
}

struct Buildings<'a> {
    roads: &'a [Road],
    placed: Vec<Building>,
}

impl Buildings<'_> {
    fn generate(mut self, random: &mut Random) -> Result<Vec<Building>, GameError> {
        // Die großen Standorte erhalten zuerst Platz. Die Zielpunkte halten das
        // Lager in der Stadtmitte und die beiden Quellen voneinander entfernt.
        for (kind, target, dimensions) in [
            (
                BuildingKind::Warehouse,
                Point { x: 0.0, z: 0.0 },
                [53.0, 36.0, 16.0],
            ),
            (
                BuildingKind::CircleSource,
                Point { x: -380.0, z: 40.0 },
                [44.0, 38.0, 11.0],
            ),
            (
                BuildingKind::TriangleSource,
                Point { x: 380.0, z: -40.0 },
                [44.0, 38.0, 11.0],
            ),
        ] {
            let mut nearest: Option<(f32, Building)> = None;
            for road in self.roads {
                for fraction in [0.30, 0.50, 0.70] {
                    let fraction = fraction + random.between(-0.035, 0.035);
                    for side in [-1.0, 1.0] {
                        let candidate = self.roadside(road, fraction, side, kind, dimensions);
                        let distance = candidate.position.minus(target).length_squared();
                        if nearest.as_ref().is_none_or(|(best, _)| distance < *best)
                            && self.has_clearance(&candidate)
                        {
                            nearest = Some((distance, candidate));
                        }
                    }
                }
            }
            self.placed
                .push(nearest.ok_or(GameError::NoLogisticsSite)?.1);
        }

        for road in self.roads {
            for side in [-1.0, 1.0] {
                let delta = road.points[road.points.len() - 1].minus(road.points[0]);
                let lots = (delta.length_squared().sqrt() / 40.0) as u32;
                for lot in 1..lots {
                    let fraction = (lot as f32 + random.between(-0.14, 0.14)) / lots as f32;
                    let dimensions = [
                        random.between(14.0, 24.0),
                        random.between(13.0, 23.0),
                        random.between(12.0, 23.0),
                    ];
                    let candidate =
                        self.roadside(road, fraction, side, BuildingKind::House, dimensions);
                    if self.has_clearance(&candidate) {
                        self.placed.push(candidate);
                    }
                }
            }
        }
        Ok(self.placed)
    }

    fn roadside(
        &self,
        road: &Road,
        fraction: f32,
        side: f32,
        kind: BuildingKind,
        [width, depth, height]: [f32; 3],
    ) -> Building {
        let (point, normal) = road_position(road, fraction);
        let offset = side * (width.hypot(depth) * 0.5 + ROAD_CLEARANCE + 4.0);
        let position = point.offset(normal, offset);
        let front = point.minus(position);
        Building {
            id: self.placed.len() as u32 + 1001,
            kind,
            position,
            facing: front.x.atan2(front.z),
            width,
            depth,
            height,
            access: Some(road.id),
            access_point: point,
        }
    }

    fn has_clearance(&self, candidate: &Building) -> bool {
        let point = candidate.position;
        let radius = building_radius(candidate);
        // Der Umkreis umschließt den gedrehten Grundriss vollständig.
        point.x - radius >= BOUNDS.min.x
            && point.x + radius <= BOUNDS.max.x
            && point.z - radius >= BOUNDS.min.z
            && point.z + radius <= BOUNDS.max.z
            && self.placed.iter().all(|other| {
                point.minus(other.position).length_squared()
                    >= (radius + building_radius(other) + BUILDING_CLEARANCE).powi(2)
            })
            && self.roads.iter().all(|road| {
                road.points.windows(2).all(|pair| {
                    road_distance_squared(point, pair[0], pair[1])
                        >= (radius + ROAD_CLEARANCE).powi(2)
                })
            })
    }
}

fn building_radius(building: &Building) -> f32 {
    building.width.hypot(building.depth) * 0.5
}

fn road_position(road: &Road, fraction: f32) -> (Point, Point) {
    let length: f32 = road
        .points
        .windows(2)
        .map(|pair| pair[1].minus(pair[0]).length_squared().sqrt())
        .sum();
    let mut remaining = fraction * length;
    for pair in road.points.windows(2) {
        let segment = pair[1].minus(pair[0]);
        let length = segment.length_squared().sqrt();
        if remaining <= length {
            return (
                pair[0].offset(segment, remaining / length),
                segment.normal(),
            );
        }
        remaining -= length;
    }
    unreachable!("Der Anteil der Straßenlänge liegt zwischen 0 und 1.")
}

fn road_distance_squared(point: Point, start: Point, end: Point) -> f32 {
    let segment = end.minus(start);
    let progress = (point.minus(start).dot(segment) / segment.length_squared()).clamp(0.0, 1.0);
    point
        .minus(start.offset(segment, progress))
        .length_squared()
}

impl Point {
    fn minus(self, other: Self) -> Self {
        Self {
            x: self.x - other.x,
            z: self.z - other.z,
        }
    }

    fn offset(self, direction: Self, distance: f32) -> Self {
        Self {
            x: self.x + direction.x * distance,
            z: self.z + direction.z * distance,
        }
    }

    fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.z * other.z
    }

    fn length_squared(self) -> f32 {
        self.dot(self)
    }

    fn normal(self) -> Self {
        let length = self.length_squared().sqrt();
        Self {
            x: -self.z / length,
            z: self.x / length,
        }
    }
}

struct Random(u64);

impl Random {
    fn from_seed(seed: &str) -> Self {
        // FNV-1a über UTF-8, unabhängig von der zufälligen HashMap-Initialisierung.
        Self(seed.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |hash, byte| {
            (hash ^ u64::from(byte)).wrapping_mul(0x100_0000_01b3)
        }))
    }

    fn next(&mut self) -> u64 {
        // SplitMix64 mit festgelegter Ganzzahlarithmetik für reproduzierbare Seeds.
        self.0 = self.0.wrapping_add(0x9e37_79b9_7f4a_7c15);
        let mut value = self.0;
        value = (value ^ (value >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
        value = (value ^ (value >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
        value ^ (value >> 31)
    }

    fn between(&mut self, min: f32, max: f32) -> f32 {
        let fraction = (self.next() >> 40) as f32 / 16_777_216.0;
        min + (max - min) * fraction
    }
}
