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
    pub junctions: Vec<Junction>,
    pub roads: Vec<Road>,
    pub buildings: Vec<Building>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameError {
    EmptySeed,
    NoLogisticsSite,
}

impl fmt::Display for GameError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptySeed => formatter.write_str("Gib einen Seed ein."),
            Self::NoLogisticsSite => formatter
                .write_str("Die Startkarte bietet keinen Platz für alle Logistikstandorte."),
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
