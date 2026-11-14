use crate::{Building, BuildingKind, CityBlock, Footprint, Parcel, Point, Road, RoadAccess};

use super::Random;

const WAREHOUSE_SIZE: [f32; 2] = [53.0, 36.0];
const SOURCE_SIZE: [f32; 2] = [44.0, 38.0];
const SIDE_YARD: f32 = 3.0;
const BACK_YARD: f32 = 4.0;
const DRIVEWAY_HALF_WIDTH: f32 = RoadAccess::DRIVEWAY_WIDTH * 0.5;
const MIN_SOURCE_SEPARATION: f32 = 180.0;
const EPSILON: f32 = 0.001;

pub(super) fn populate(
    blocks: &mut Vec<CityBlock>,
    roads: &[Road],
    random: &mut Random,
) -> Option<(Vec<Parcel>, Vec<Building>)> {
    let road_segments: Vec<_> = roads
        .iter()
        .flat_map(|road| {
            road.points.windows(2).map(|points| RoadSegment {
                road_id: road.id,
                half_width: road.width * 0.5,
                line: [points[0], points[1]],
                bounds: Extents::of(points),
            })
        })
        .collect();
    let mut district = Vec::new();
    for block in blocks.iter().filter(|block| block.polygon.len() >= 3) {
        let street = StreetFront::new(block, &road_segments);
        let outside = street.sites(WAREHOUSE_SIZE, 10.0, &[]).max_by(|a, b| {
            distance_squared(a.buildable.position, ORIGIN)
                .total_cmp(&distance_squared(b.buildable.position, ORIGIN))
        });
        if let Some(reserved) = outside {
            district.push((street, vec![reserved]));
        }
    }
    if district.len() < 3 {
        return None;
    }

    let mut buildings = Vec::new();
    let (block, warehouse) = nearest_site(&district, WAREHOUSE_SIZE, ORIGIN, |_| true)?;
    let warehouse = warehouse.occupy(&mut buildings, BuildingKind::Warehouse, 16.0);
    district[block].1.push(warehouse);
    let (block, circle) =
        nearest_site(&district, SOURCE_SIZE, Point { x: -380.0, z: 40.0 }, |_| {
            true
        })?;
    let circle_position = circle.buildable.position;
    let circle = circle.occupy(&mut buildings, BuildingKind::CircleSource, 11.0);
    district[block].1.push(circle);
    let (block, triangle) = nearest_site(
        &district,
        SOURCE_SIZE,
        Point { x: 380.0, z: -40.0 },
        |site| {
            distance_squared(site.buildable.position, circle_position)
                >= MIN_SOURCE_SEPARATION.powi(2)
        },
    )?;
    let triangle = triangle.occupy(&mut buildings, BuildingKind::TriangleSource, 11.0);
    district[block].1.push(triangle);

    for (street, lots) in &mut district {
        // Die Abstände entlang der Straße lassen zwischen den Häuserreihen Grünflächen.
        for sample in street.samples(30.0) {
            let dimensions = [random.between(14.0, 24.0), random.between(13.0, 23.0)];
            if let Some(site) = street.site(sample, dimensions, lots) {
                lots.push(site.occupy(
                    &mut buildings,
                    BuildingKind::House,
                    random.between(12.0, 23.0),
                ));
            }
        }
    }
    if buildings.len() < 24 {
        return None;
    }
    for (index, (_, lots)) in district.iter().enumerate() {
        for (_, neighboring_lots) in &district[index + 1..] {
            if !lots.iter().all(|lot| {
                neighboring_lots
                    .iter()
                    .all(|other| lot.separate_from(other))
            }) {
                return None;
            }
        }
    }

    let accepted = district
        .iter()
        .map(|(street, _)| street.block.id)
        .collect::<Vec<_>>();
    let parcels = district
        .into_iter()
        .flat_map(|(_, lots)| lots)
        .enumerate()
        .map(|(index, lot)| Parcel {
            id: index as u32 + 30_001,
            block_id: lot.block_id,
            polygon: lot.polygon.to_vec(),
            access: lot.access,
            buildable: lot.buildable,
            building_id: lot.building_id,
        })
        .collect();
    blocks.retain(|block| accepted.contains(&block.id));
    Some((parcels, buildings))
}

const ORIGIN: Point = Point { x: 0.0, z: 0.0 };

fn nearest_site(
    district: &[(StreetFront<'_>, Vec<Lot>)],
    dimensions: [f32; 2],
    target: Point,
    eligible: impl Fn(&Lot) -> bool,
) -> Option<(usize, Lot)> {
    district
        .iter()
        .enumerate()
        .flat_map(|(block, (street, lots))| {
            street
                .sites(dimensions, 10.0, lots)
                .map(move |lot| (block, lot))
        })
        .filter(|(_, lot)| eligible(lot))
        .min_by(|(_, a), (_, b)| {
            distance_squared(a.buildable.position, target)
                .total_cmp(&distance_squared(b.buildable.position, target))
        })
}

struct RoadSegment {
    road_id: u32,
    half_width: f32,
    line: [Point; 2],
    bounds: Extents,
}

struct Frontage {
    road_id: u32,
    start: Point,
    tangent: Point,
    inward: Point,
    length: f32,
    half_width: f32,
}

struct StreetFront<'a> {
    block: &'a CityBlock,
    roads: Vec<&'a RoadSegment>,
    frontage: Vec<Frontage>,
}

impl<'a> StreetFront<'a> {
    fn new(block: &'a CityBlock, roads: &'a [RoadSegment]) -> Self {
        let extent = Extents::of(&block.polygon).expanded(20.0);
        let roads = roads
            .iter()
            .filter(|segment| segment.bounds.overlaps(extent))
            .collect::<Vec<_>>();
        let signed_area: f32 = polygon_edges(&block.polygon)
            .map(|[a, b]| cross(a, b))
            .sum();
        let winding = signed_area.signum();
        let frontage = polygon_edges(&block.polygon)
            .zip(&block.boundary_road_ids)
            .filter_map(|([start, end], &road_id)| {
                let delta = subtract(end, start);
                let length = distance_squared(start, end).sqrt();
                let road = roads.iter().find(|road| road.road_id == road_id)?;
                if length < EPSILON {
                    return None;
                }
                let tangent = scale(delta, length.recip());
                Some(Frontage {
                    road_id,
                    start,
                    tangent,
                    inward: Point {
                        x: -tangent.z * winding,
                        z: tangent.x * winding,
                    },
                    length,
                    half_width: road.half_width,
                })
            })
            .collect();
        Self {
            block,
            roads,
            frontage,
        }
    }

    fn samples(&self, spacing: f32) -> impl Iterator<Item = (&Frontage, Point)> {
        // Über eine ganze Straßenfolge zählen, damit fein abgetastete Kurven nicht dichter bebaut sind.
        let mut previous_road = None;
        let mut until_sample = spacing * 0.5;
        self.frontage.iter().flat_map(move |edge| {
            if previous_road != Some(edge.road_id) {
                until_sample = spacing * 0.5;
                previous_road = Some(edge.road_id);
            }
            let first = until_sample;
            let count = ((edge.length - first) / spacing).ceil().max(0.0) as usize;
            until_sample = first + count as f32 * spacing - edge.length;
            (0..count).map(move |index| {
                let distance = first + index as f32 * spacing;
                (edge, offset(edge.start, edge.tangent, distance))
            })
        })
    }

    fn sites<'b>(
        &'b self,
        dimensions: [f32; 2],
        spacing: f32,
        existing: &'b [Lot],
    ) -> impl Iterator<Item = Lot> + 'b {
        self.samples(spacing)
            .filter_map(move |sample| self.site(sample, dimensions, existing))
    }

    fn site(
        &self,
        (edge, access): (&Frontage, Point),
        dimensions: [f32; 2],
        existing: &[Lot],
    ) -> Option<Lot> {
        let [width, depth] = dimensions;
        // Ein zusätzlicher Abstand erlaubt eine gerade Parzellenkante an sanften Kurven.
        [2.0, 5.0, 8.0].into_iter().find_map(|verge| {
            let road_edge = edge.half_width + verge;
            let buildable = Footprint {
                position: offset(access, edge.inward, road_edge + 5.0 + depth * 0.5),
                facing: (-edge.inward.x).atan2(-edge.inward.z),
                width,
                depth,
            };
            let half = width * 0.5 + SIDE_YARD;
            let near = offset(access, edge.inward, road_edge);
            let far = offset(near, edge.inward, 5.0 + depth + BACK_YARD);
            let polygon = [
                offset(near, edge.tangent, -half),
                offset(near, edge.tangent, half),
                offset(far, edge.tangent, half),
                offset(far, edge.tangent, -half),
            ];
            let lot = Lot {
                block_id: self.block.id,
                polygon,
                bounds: Extents::of(&polygon),
                access: RoadAccess {
                    road_id: edge.road_id,
                    point: access,
                },
                buildable,
                building_id: None,
            };
            (self.has_clearance(&lot) && existing.iter().all(|other| lot.separate_from(other)))
                .then_some(lot)
        })
    }

    fn has_clearance(&self, lot: &Lot) -> bool {
        if !lot
            .polygon
            .iter()
            .all(|&point| contains(&self.block.polygon, point))
            || polygon_edges(&self.block.polygon).any(|edge| {
                lot.bounds.overlaps(Extents::of(&edge))
                    && distance_to_polygon(edge, &lot.polygon) < EPSILON.powi(2)
            })
        {
            return false;
        }

        let driveway = lot.driveway();
        let driveway_bounds = Extents::of(&driveway);
        let footprint = lot.buildable.corners();
        self.roads.iter().all(|road| {
            let paved = road.bounds.expanded(road.half_width);
            // Straßen können auch als Stichstraße innerhalb eines Blocks verlaufen.
            if lot.bounds.overlaps(paved)
                && distance_to_polygon(road.line, &lot.polygon) < road.half_width.powi(2)
            {
                return false;
            }
            if lot
                .bounds
                .overlaps(road.bounds.expanded(road.half_width + 3.0))
                && distance_to_polygon(road.line, &footprint) < (road.half_width + 3.0).powi(2)
            {
                return false;
            }

            let clearance = road.half_width + DRIVEWAY_HALF_WIDTH;
            if !driveway_bounds.overlaps(paved.expanded(DRIVEWAY_HALF_WIDTH)) {
                return true;
            }
            if road.road_id != lot.access.road_id {
                return segment_distance_squared(driveway, road.line) >= clearance.powi(2);
            }
            if point_segment_distance_squared(lot.access.point, road.line) < EPSILON.powi(2) {
                return true;
            }

            // Der Anschluss selbst ist erlaubt. Anderen Segmenten derselben Straße
            // darf die Zufahrt erst im unmittelbaren Anschlussbereich begegnen.
            let [front, access] = driveway;
            let fraction = clearance / distance_squared(front, access).sqrt();
            let approach = [front, offset(access, subtract(front, access), fraction)];
            segment_distance_squared(driveway, road.line) >= EPSILON.powi(2)
                && segment_distance_squared(approach, road.line) >= (clearance - EPSILON).powi(2)
        })
    }
}

struct Lot {
    block_id: u32,
    polygon: [Point; 4],
    bounds: Extents,
    access: RoadAccess,
    buildable: Footprint,
    building_id: Option<u32>,
}

impl Lot {
    fn driveway(&self) -> [Point; 2] {
        [self.buildable.front(), self.access.point]
    }

    fn separate_from(&self, other: &Self) -> bool {
        if self.bounds.overlaps(other.bounds) && rectangles_overlap(&self.polygon, &other.polygon) {
            return false;
        }
        [(self, other), (other, self)]
            .into_iter()
            .all(|(from, against)| {
                let driveway = from.driveway();
                !Extents::of(&driveway)
                    .expanded(DRIVEWAY_HALF_WIDTH)
                    .overlaps(against.bounds)
                    || distance_to_polygon(driveway, &against.polygon)
                        >= DRIVEWAY_HALF_WIDTH.powi(2)
            })
    }

    fn occupy(mut self, buildings: &mut Vec<Building>, kind: BuildingKind, height: f32) -> Self {
        let id = buildings.len() as u32 + 1001;
        buildings.push(Building {
            id,
            kind,
            position: self.buildable.position,
            facing: self.buildable.facing,
            width: self.buildable.width,
            depth: self.buildable.depth,
            height,
            access: Some(self.access.road_id),
            access_point: self.access.point,
        });
        self.building_id = Some(id);
        self
    }
}

#[derive(Clone, Copy)]
struct Extents {
    min: Point,
    max: Point,
}

impl Extents {
    fn of(points: &[Point]) -> Self {
        points.iter().fold(
            Self {
                min: points[0],
                max: points[0],
            },
            |bounds, point| Self {
                min: Point {
                    x: bounds.min.x.min(point.x),
                    z: bounds.min.z.min(point.z),
                },
                max: Point {
                    x: bounds.max.x.max(point.x),
                    z: bounds.max.z.max(point.z),
                },
            },
        )
    }

    fn expanded(self, amount: f32) -> Self {
        Self {
            min: Point {
                x: self.min.x - amount,
                z: self.min.z - amount,
            },
            max: Point {
                x: self.max.x + amount,
                z: self.max.z + amount,
            },
        }
    }

    fn overlaps(self, other: Self) -> bool {
        self.min.x <= other.max.x
            && other.min.x <= self.max.x
            && self.min.z <= other.max.z
            && other.min.z <= self.max.z
    }
}

fn polygon_edges(vertices: &[Point]) -> impl Iterator<Item = [Point; 2]> {
    vertices
        .iter()
        .copied()
        .zip(vertices.iter().copied().cycle().skip(1))
        .map(|(a, b)| [a, b])
}

fn contains(polygon: &[Point], point: Point) -> bool {
    polygon_edges(polygon)
        .filter(|[a, b]| {
            (a.z > point.z) != (b.z > point.z)
                && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x
        })
        .count()
        % 2
        == 1
}

fn rectangles_overlap(left: &[Point; 4], right: &[Point; 4]) -> bool {
    [left, right].into_iter().all(|rect| {
        polygon_edges(rect).take(2).all(|[a, b]| {
            let axis = subtract(b, a);
            let projection = |polygon: &[Point; 4]| {
                polygon
                    .iter()
                    .map(|&p| dot(p, axis))
                    .fold((f32::INFINITY, f32::NEG_INFINITY), |(min, max), value| {
                        (min.min(value), max.max(value))
                    })
            };
            let (left_min, left_max) = projection(left);
            let (right_min, right_max) = projection(right);
            left_min < right_max && right_min < left_max
        })
    })
}

fn distance_to_polygon(line: [Point; 2], polygon: &[Point]) -> f32 {
    if contains(polygon, line[0]) || contains(polygon, line[1]) {
        return 0.0;
    }
    polygon_edges(polygon)
        .map(|edge| segment_distance_squared(line, edge))
        .fold(f32::INFINITY, f32::min)
}

fn segment_distance_squared(a: [Point; 2], b: [Point; 2]) -> f32 {
    if crosses(a, b) {
        return 0.0;
    }
    point_segment_distance_squared(a[0], b)
        .min(point_segment_distance_squared(a[1], b))
        .min(point_segment_distance_squared(b[0], a))
        .min(point_segment_distance_squared(b[1], a))
}

fn point_segment_distance_squared(point: Point, [a, b]: [Point; 2]) -> f32 {
    let ab = subtract(b, a);
    let norm = dot(ab, ab);
    if norm == 0.0 {
        return distance_squared(point, a);
    }
    let fraction = (dot(subtract(point, a), ab) / norm).clamp(0.0, 1.0);
    distance_squared(point, offset(a, ab, fraction))
}

fn crosses([a, b]: [Point; 2], [c, d]: [Point; 2]) -> bool {
    let left = subtract(b, a);
    let right = subtract(d, c);
    cross(left, subtract(c, a)) * cross(left, subtract(d, a)) < 0.0
        && cross(right, subtract(a, c)) * cross(right, subtract(b, c)) < 0.0
}

fn distance_squared(a: Point, b: Point) -> f32 {
    let delta = subtract(a, b);
    dot(delta, delta)
}

fn offset(base: Point, direction: Point, distance: f32) -> Point {
    Point {
        x: base.x + direction.x * distance,
        z: base.z + direction.z * distance,
    }
}

fn subtract(a: Point, b: Point) -> Point {
    Point {
        x: a.x - b.x,
        z: a.z - b.z,
    }
}

fn scale(point: Point, factor: f32) -> Point {
    Point {
        x: point.x * factor,
        z: point.z * factor,
    }
}

fn dot(a: Point, b: Point) -> f32 {
    a.x * b.x + a.z * b.z
}

fn cross(a: Point, b: Point) -> f32 {
    a.x * b.z - a.z * b.x
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_reentrant_block_boundary_cannot_cut_through_a_parcel() {
        let block = CityBlock {
            id: 1,
            polygon: [
                (-10.0, -10.0),
                (10.0, -10.0),
                (10.0, 10.0),
                (3.0, 5.0),
                (0.0, 0.0),
                (-3.0, 5.0),
                (-10.0, 10.0),
            ]
            .map(|(x, z)| Point { x, z })
            .to_vec(),
            boundary_road_ids: vec![101; 7],
        };
        let polygon =
            [(-5.0, -5.0), (5.0, -5.0), (5.0, 5.0), (-5.0, 5.0)].map(|(x, z)| Point { x, z });
        let lot = Lot {
            block_id: block.id,
            polygon,
            bounds: Extents::of(&polygon),
            access: RoadAccess {
                road_id: 101,
                point: Point { x: 0.0, z: -10.0 },
            },
            buildable: Footprint {
                position: Point { x: 0.0, z: 0.0 },
                facing: std::f32::consts::PI,
                width: 4.0,
                depth: 4.0,
            },
            building_id: None,
        };

        assert!(!StreetFront::new(&block, &[]).has_clearance(&lot));
    }

    #[test]
    fn a_folded_street_cannot_touch_the_driveway_before_the_connection() {
        let mut blocks = Vec::new();
        let mut roads = Vec::new();
        add_block(&mut blocks, &mut roads, -50.0, 50.0, 0.0, 80.0);
        let road_segments = [
            [Point { x: -50.0, z: 0.0 }, Point { x: 50.0, z: 0.0 }],
            [Point { x: -10.0, z: 2.0 }, Point { x: 0.0, z: 2.0 }],
            [Point { x: 0.0, z: 2.0 }, Point { x: -10.0, z: 3.0 }],
        ]
        .map(|line| RoadSegment {
            road_id: 101,
            half_width: 5.0,
            bounds: Extents::of(&line),
            line,
        });
        let frontage = StreetFront::new(&blocks[0], &road_segments);
        let edge = &frontage.frontage[0];

        assert!(
            frontage
                .site((edge, Point { x: 0.0, z: 0.0 }), [20.0, 20.0], &[])
                .is_none()
        );
    }
    use crate::{BuildingKind, Point};

    #[test]
    fn city_keeps_a_free_logistics_parcel_in_each_buildable_block() {
        let mut blocks = Vec::new();
        let mut roads = Vec::new();
        for (left, right, down, up) in [
            (-300.0, -102.0, -90.0, 90.0),
            (-98.0, 98.0, -90.0, 90.0),
            (102.0, 300.0, -90.0, 90.0),
            (315.0, 358.0, -90.0, 90.0),
        ] {
            add_block(&mut blocks, &mut roads, left, right, down, up);
        }

        let (parcels, buildings) = populate(&mut blocks, &roads, &mut Random::from_seed("Stadt"))
            .expect("Drei ausreichend große Blöcke müssen die Startstadt aufnehmen");
        assert_eq!(
            blocks.iter().map(|block| block.id).collect::<Vec<_>>(),
            [1, 2, 3]
        );
        for block in &blocks {
            assert!(parcels.iter().any(|parcel| {
                parcel.block_id == block.id
                    && parcel.building_id.is_none()
                    && parcel.buildable.width >= 53.0
                    && parcel.buildable.depth >= 36.0
            }));
        }
        assert!(buildings.len() >= 24);
        for kind in [
            BuildingKind::Warehouse,
            BuildingKind::CircleSource,
            BuildingKind::TriangleSource,
        ] {
            assert_eq!(
                buildings
                    .iter()
                    .filter(|building| building.kind == kind)
                    .count(),
                1
            );
        }

        for parcel in &parcels {
            let block = &blocks[(parcel.block_id - 1) as usize];
            let left = block.polygon[0].x;
            let right = block.polygon[2].x;
            assert!(parcel.polygon.iter().all(|point| {
                (left..=right).contains(&point.x) && (-90.0..=90.0).contains(&point.z)
            }));
            assert!(block.boundary_road_ids.contains(&parcel.access.road_id));

            let bounds = rectangle_bounds(&parcel.polygon);
            for corner in parcel.buildable.corners() {
                assert!(corner.x > bounds[0] && corner.x < bounds[1]);
                assert!(corner.z > bounds[2] && corner.z < bounds[3]);
                assert!((left + 5.0..=right - 5.0).contains(&corner.x));
                assert!((-85.0..=85.0).contains(&corner.z));
            }

            for other in parcels.iter().filter(|other| other.id > parcel.id) {
                let other = rectangle_bounds(&other.polygon);
                assert!(
                    bounds[1] <= other[0]
                        || other[1] <= bounds[0]
                        || bounds[3] <= other[2]
                        || other[3] <= bounds[2]
                );
            }
            if let Some(id) = parcel.building_id {
                let building = buildings.iter().find(|building| building.id == id).unwrap();
                assert_eq!(building.position, parcel.buildable.position);
                assert_eq!(building.facing, parcel.buildable.facing);
                assert_eq!(building.access, Some(parcel.access.road_id));
                assert_eq!(building.access_point, parcel.access.point);
            }
        }
    }

    fn add_block(
        blocks: &mut Vec<CityBlock>,
        roads: &mut Vec<Road>,
        left: f32,
        right: f32,
        down: f32,
        up: f32,
    ) {
        let polygon = vec![
            Point { x: left, z: down },
            Point { x: right, z: down },
            Point { x: right, z: up },
            Point { x: left, z: up },
        ];
        let boundary_road_ids = (0..4)
            .map(|index| {
                let id = roads.len() as u32 + 101;
                roads.push(Road {
                    id,
                    from: id * 2,
                    to: id * 2 + 1,
                    width: 10.0,
                    points: vec![polygon[index], polygon[(index + 1) % 4]],
                });
                id
            })
            .collect();
        blocks.push(CityBlock {
            id: blocks.len() as u32 + 1,
            polygon,
            boundary_road_ids,
        });
    }

    fn rectangle_bounds(points: &[Point]) -> [f32; 4] {
        points.iter().fold(
            [
                f32::INFINITY,
                f32::NEG_INFINITY,
                f32::INFINITY,
                f32::NEG_INFINITY,
            ],
            |bounds, point| {
                [
                    bounds[0].min(point.x),
                    bounds[1].max(point.x),
                    bounds[2].min(point.z),
                    bounds[3].max(point.z),
                ]
            },
        )
    }
}
