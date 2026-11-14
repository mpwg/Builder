use godot::classes::{Control, IControl};
use godot::prelude::*;

struct BuilderExtension;

#[gdextension]
unsafe impl ExtensionLibrary for BuilderExtension {}

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
}

#[godot_api]
impl StartMenu {
    #[func]
    fn quit_game(&self) {
        self.base().get_tree().quit();
    }
}
