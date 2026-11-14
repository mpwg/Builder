use godot::prelude::*;

struct BuilderExtension;

#[gdextension]
unsafe impl ExtensionLibrary for BuilderExtension {}
