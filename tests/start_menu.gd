extends SceneTree


func _initialize() -> void:
	check_start_menu.call_deferred()


func check_start_menu() -> void:
	if change_scene_to_file(ProjectSettings.get_setting("application/run/main_scene")) != OK:
		fail("Das Startmenü lässt sich nicht laden.")
		return
	await scene_changed

	var buttons := current_scene.find_children("*", "Button")
	var labels: Array[String] = []
	var enabled: Array[Button] = []
	for node in buttons:
		var button := node as Button
		labels.append(button.text)
		if not button.disabled:
			enabled.append(button)
	if labels != ["Neue Partie", "Fortsetzen", "Spielstand", "Beenden"]:
		fail("Das Startmenü zeigt nicht alle vorgesehenen Aktionen.")
		return
	if enabled.size() != 1 or enabled[0].text != "Beenden":
		fail("Nur Beenden darf auswählbar sein.")
		return

	var quit_button := enabled[0]
	if current_scene.get_class() != &"StartMenu" or current_scene.get_script() != null:
		fail("Das Menü muss seine Logik aus der Rust-GDExtension laden.")
		return

	quit_button.grab_focus()
	var press := InputEventKey.new()
	press.keycode = KEY_ENTER
	press.pressed = true
	Input.parse_input_event(press)
	var release := InputEventKey.new()
	release.keycode = KEY_ENTER
	Input.parse_input_event(release)

	await create_timer(0.3).timeout
	fail("Beenden hat den Prozess nicht beendet.")


func fail(message: String) -> void:
	printerr(message)
	quit(1)
