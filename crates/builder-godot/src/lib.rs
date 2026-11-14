mod map_scene;
mod start_menu;

use godot::classes::{InputEvent, InputEventKey};
use godot::global::Key;
use godot::prelude::*;

const START_MENU_SCENE: &str = "res://scenes/start_menu.tscn";

struct BuilderExtension;

#[gdextension]
unsafe impl ExtensionLibrary for BuilderExtension {}

fn pressed_escape(event: Gd<InputEvent>) -> bool {
    event
        .try_cast::<InputEventKey>()
        .is_ok_and(|key| key.is_pressed() && !key.is_echo() && key.get_keycode() == Key::ESCAPE)
}
