#!/usr/bin/env fish

function find_godot
    if set -q BUILDER_GODOT
        if test -x "$BUILDER_GODOT"
            echo "$BUILDER_GODOT"
            return
        end
        echo "BUILDER_GODOT verweist auf keine ausführbare Datei: $BUILDER_GODOT" >&2
        return 1
    end

    if command -sq godot
        command -s godot
        return
    end

    for app in /Applications/Godot.app "$HOME/Applications/Godot.app" "$HOME/Library/Caches/Builder/godot-4.7.2/Godot.app"
        set -l executable "$app/Contents/MacOS/Godot"
        if test -x "$executable"
            echo "$executable"
            return
        end
    end

    echo 'Godot fehlt. Installiere Godot 4.7.2 oder setze BUILDER_GODOT auf die ausführbare Godot-Datei.' >&2
    return 1
end

function build_debug
    cargo build --locked -p builder-godot --target-dir target
    and mkdir -p game/bin
    and cp target/debug/libbuilder_godot.dylib game/bin/
    and "$godot" --headless --path game --editor --import --quit
end

function export_macos
    rustup target add aarch64-apple-darwin x86_64-apple-darwin
    and cargo build --locked --release -p builder-godot --target-dir target \
        --target aarch64-apple-darwin --target x86_64-apple-darwin
    and mkdir -p game/bin dist
    and lipo -create target/aarch64-apple-darwin/release/libbuilder_godot.dylib \
        target/x86_64-apple-darwin/release/libbuilder_godot.dylib \
        -output game/bin/libbuilder_godot.dylib
    and "$godot" --headless --path game --editor --import --quit
    and "$godot" --headless --path game --export-release macOS "$PWD/dist/Symbol-Logistik.app"
end

set -g godot (find_godot)
or exit 1

switch "$argv[1]"
    case build
        build_debug
    case run
        build_debug
        and "$godot" --path game
    case check
        cargo fmt --check
        and cargo clippy --locked --workspace --all-targets -- -D warnings
        and cargo test --locked --workspace
        and cargo build --locked -p builder-core --target wasm32-unknown-unknown
        and build_debug
        and "$godot" --headless --path game --script "$PWD/tests/start_menu.gd"
    case export
        export_macos
    case '*'
        echo 'Verwendung: builder.fish build|run|check|export' >&2
        exit 2
end
