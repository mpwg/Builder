//! Engine-unabhängiger Kern für Karte und Simulation.

#![forbid(unsafe_code)]

use std::fmt;

mod generation;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f32,
    pub z: f32,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Bounds {
    pub min: Point,
    pub max: Point,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Junction {
    pub id: u32,
    pub position: Point,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Road {
    pub id: u32,
    pub from: u32,
    pub to: u32,
    pub points: Vec<Point>,
    pub width: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MapLayout {
    Grid,
    Ring,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CityBlock {
    pub id: u32,
    /// Das Polygon wird durch die Kante vom letzten zum ersten Punkt geschlossen.
    pub polygon: Vec<Point>,
    /// Straßen-ID für jede Polygonkante, einschließlich der schließenden Kante.
    pub boundary_road_ids: Vec<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RoadAccess {
    pub road_id: u32,
    /// Anschluss auf der Straßenmittellinie.
    pub point: Point,
}

impl RoadAccess {
    pub const DRIVEWAY_WIDTH: f32 = 4.0;
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Footprint {
    pub position: Point,
    /// Drehwinkel um Y im Bogenmaß. Die Vorderseite zeigt bei 0 entlang +Z.
    pub facing: f32,
    pub width: f32,
    pub depth: f32,
}

impl Footprint {
    pub fn corners(self) -> [Point; 4] {
        [(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)]
            .map(|(x, z)| self.local_point(x * self.width * 0.5, z * self.depth * 0.5))
    }

    pub fn front(self) -> Point {
        self.local_point(0.0, self.depth * 0.5)
    }

    fn local_point(self, x: f32, z: f32) -> Point {
        let (sin, cos) = self.facing.sin_cos();
        Point {
            x: self.position.x + x * cos + z * sin,
            z: self.position.z - x * sin + z * cos,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Parcel {
    pub id: u32,
    pub block_id: u32,
    pub polygon: Vec<Point>,
    pub access: RoadAccess,
    pub buildable: Footprint,
    pub building_id: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuildingKind {
    House,
    Warehouse,
    CircleSource,
    TriangleSource,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Building {
    pub id: u32,
    pub kind: BuildingKind,
    pub position: Point,
    /// Drehwinkel um Y im Bogenmaß. Die Vorderseite zeigt bei 0 entlang +Z.
    pub facing: f32,
    pub width: f32,
    pub depth: f32,
    pub height: f32,
    /// ID der Straße an der Vorderseite des Gebäudes.
    pub access: Option<u32>,
    /// Punkt auf der Straßenmittellinie an der Zufahrt des Gebäudes.
    pub access_point: Point,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MapView {
    pub seed: String,
    pub bounds: Bounds,
    pub layout: MapLayout,
    pub blocks: Vec<CityBlock>,
    pub parcels: Vec<Parcel>,
    pub junctions: Vec<Junction>,
    pub roads: Vec<Road>,
    /// Straßen-IDs des geschlossenen Rings, leer bei Rasterkarten.
    pub ring_roads: Vec<u32>,
    pub buildings: Vec<Building>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameError {
    EmptySeed,
    NoUsableStartMap,
}

impl fmt::Display for GameError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptySeed => formatter.write_str("Gib einen Seed ein."),
            Self::NoUsableStartMap => formatter
                .write_str("Für diesen Seed konnte keine bebaubare Startkarte erzeugt werden."),
        }
    }
}

impl std::error::Error for GameError {}

#[derive(Debug)]
pub struct Game {
    map: MapView,
}

impl Game {
    pub fn new(seed: &str) -> Result<Self, GameError> {
        if seed.trim().is_empty() {
            return Err(GameError::EmptySeed);
        }
        Ok(Self {
            map: generation::generate(seed)?,
        })
    }

    pub fn view(&self) -> &MapView {
        &self.map
    }
}
