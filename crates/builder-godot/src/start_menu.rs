use builder_core::Game;
use godot::classes::{
    Button, Control, IControl, InputEvent, Label, Os, PackedScene, RandomNumberGenerator,
};
use godot::global::Error;
use godot::prelude::*;
use godot::tools::try_load;

use crate::{map_scene::MapScene, pressed_escape};

#[derive(GodotClass)]
#[class(base = Control)]
struct StartMenu {
    base: Base<Control>,
}

#[godot_api]
impl IControl for StartMenu {
    fn init(base: Base<Control>) -> Self {
        Self { base }
    }

    fn ready(&mut self) {
        self.focus_new_game();
    }

    fn unhandled_key_input(&mut self, event: Gd<InputEvent>) {
        if self.base().get_node_as::<Control>("Setup").is_visible() && pressed_escape(event) {
            if let Some(mut viewport) = self.base().get_viewport() {
                viewport.set_input_as_handled();
            }
            self.cancel_new_game();
        }
    }
}

#[godot_api]
impl StartMenu {
    #[func]
    fn quit_game(&self) {
        self.base().get_tree().quit();
    }

    #[func]
    fn open_new_game(&self) {
        self.base().get_node_as::<Control>("Menu").hide();
        self.base().get_node_as::<Control>("Setup").show();
        self.base().get_node_as::<Label>("Setup/Error").hide();
        self.base()
            .get_node_as::<Button>("Setup/Start")
            .grab_focus();
    }

    #[func]
    fn cancel_new_game(&self) {
        self.base().get_node_as::<Control>("Setup").hide();
        self.base().get_node_as::<Control>("Menu").show();
        self.focus_new_game();
    }

    #[func]
    fn start_new_game(&self) {
        let mut start = self.base().get_node_as::<Button>("Setup/Start");
        if start.is_disabled() || !start.is_visible_in_tree() {
            return;
        }

        start.set_disabled(true);
        self.base().get_node_as::<Label>("Setup/Error").hide();

        if self.open_map().is_err() {
            self.base().get_node_as::<Label>("Setup/Error").show();
            start.set_disabled(false);
            start.grab_focus();
        }
    }
}

impl StartMenu {
    fn focus_new_game(&self) {
        self.base()
            .get_node_as::<Button>("Menu/Actions/NewGame")
            .grab_focus();
    }

    fn open_map(&self) -> Result<(), ()> {
        let fixed_seed = Os::singleton().get_environment("BUILDER_MAP_SEED");
        let seed = if fixed_seed.is_empty() {
            let mut rng = RandomNumberGenerator::new_gd();
            rng.randomize();
            format!("{:08x}{:08x}", rng.randi(), rng.randi())
        } else {
            fixed_seed.to_string()
        };
        let game = Game::new(&seed).map_err(|_| ())?;
        let scene = try_load::<PackedScene>("res://scenes/map.tscn").map_err(|_| ())?;
        let node = scene.instantiate().ok_or(())?;
        let mut map = match node.try_cast::<MapScene>() {
            Ok(map) => map,
            Err(node) => {
                node.free();
                return Err(());
            }
        };
        map.bind_mut().set_game(game);
        let error = self.base().get_tree().change_scene_to_node(&map);
        if error != Error::OK {
            map.free();
            return Err(());
        }
        Ok(())
    }
}
