use builder_core::{BuildingKind, Game, Point};
use godot::classes::{Camera3D, INode3D, InputEvent, Node3D};
use godot::global::Error;
use godot::prelude::*;

use crate::{START_MENU_SCENE, pressed_escape};

mod scenery;

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
