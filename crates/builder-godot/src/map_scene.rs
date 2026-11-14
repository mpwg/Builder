use builder_core::{BuildingKind, Game, Point};
use godot::classes::{Camera3D, INode3D, Input, InputEvent, Node3D};
use godot::global::Error;
use godot::prelude::*;

use crate::{START_MENU_SCENE, pressed_escape};

mod scenery;

const CAMERA_SPEED: f32 = 220.0;
const CAMERA_OFFSET: Vector3 = Vector3::new(165.0, 460.0, 260.0);

#[derive(GodotClass)]
#[class(base = Node3D)]
pub(crate) struct MapScene {
    base: Base<Node3D>,
    game: Option<Game>,
}

#[godot_api]
impl INode3D for MapScene {
    fn init(base: Base<Node3D>) -> Self {
        Self { base, game: None }
    }

    fn ready(&mut self) {
        let Some(game) = &self.game else {
            return;
        };
        scenery::build(&mut self.base().get_node_as::<Node3D>("World"), game.view());

        let warehouse = game
            .view()
            .buildings
            .iter()
            .find(|building| building.kind == BuildingKind::Warehouse)
            .expect("Eine generierte Karte enthält ein Zentrallager.");
        let center = ground_position(warehouse.position);
        let mut camera = self.base().get_node_as::<Camera3D>("Camera3D");
        camera.look_at_from_position(center + CAMERA_OFFSET, center);
    }

    fn process(&mut self, delta: f64) {
        let Some(game) = &self.game else {
            return;
        };
        let direction = Input::singleton().get_vector(
            "camera_left",
            "camera_right",
            "camera_up",
            "camera_down",
        );
        if direction.is_zero_approx() {
            return;
        }

        let mut camera = self.base().get_node_as::<Camera3D>("Camera3D");
        let basis = camera.get_basis();
        let right = basis.col_a().slide(Vector3::UP).normalized();
        let up = basis.col_b().slide(Vector3::UP).normalized();
        let shift = (right * direction.x - up * direction.y) * CAMERA_SPEED * delta as f32;
        let bounds = game.view().bounds;
        let center = (camera.get_position() - CAMERA_OFFSET + shift)
            .clamp(ground_position(bounds.min), ground_position(bounds.max));
        camera.set_position(center + CAMERA_OFFSET);
    }

    fn unhandled_key_input(&mut self, event: Gd<InputEvent>) {
        if pressed_escape(event) {
            if let Some(mut viewport) = self.base().get_viewport() {
                viewport.set_input_as_handled();
            }
            let error = self
                .base()
                .get_tree()
                .change_scene_to_file(START_MENU_SCENE);
            if error != Error::OK {
                godot_error!("Das Hauptmenü konnte nicht geöffnet werden: {error:?}");
            }
        }
    }
}

impl MapScene {
    pub(crate) fn set_game(&mut self, game: Game) {
        self.game = Some(game);
    }
}

fn ground_position(point: Point) -> Vector3 {
    Vector3::new(point.x, 0.0, point.z)
}
