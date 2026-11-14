extends SceneTree


func _initialize() -> void:
	check_start_menu.call_deferred()


func check_start_menu() -> void:
	create_timer(6.0).timeout.connect(fail.bind("Der Menü- und Kartentest hat das Zeitlimit erreicht."))
	if change_scene_to_file(ProjectSettings.get_setting("application/run/main_scene")) != OK:
		fail("Das Startmenü lässt sich nicht laden.")
		return
	await scene_changed

	var buttons := current_scene.get_node("Menu/Actions").find_children("*", "Button")
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
	if enabled.size() != 2 or enabled[0].text != "Neue Partie" or enabled[1].text != "Beenden":
		fail("Neue Partie und Beenden müssen auswählbar sein.")
		return

	var new_game := enabled[0]
	if current_scene.get_class() != &"StartMenu" or current_scene.get_script() != null:
		fail("Das Menü muss seine Logik aus der Rust-GDExtension laden.")
		return

	if not new_game.has_focus():
		fail("Neue Partie muss beim Öffnen des Hauptmenüs fokussiert sein.")
		return
	tap(KEY_ENTER)
	await process_frame
	var start := current_scene.get_node_or_null("Setup/Start") as Button
	var cancel := current_scene.get_node_or_null("Setup/Cancel") as Button
	if start == null or cancel == null or not start.is_visible_in_tree() or not start.has_focus():
		fail("Die Zwischenseite muss Starten fokussieren.")
		return
	cancel.grab_focus()
	tap(KEY_ENTER)
	await process_frame
	if start.is_visible_in_tree() or not new_game.has_focus():
		fail("Abbrechen muss zum fokussierten Menüeintrag zurückführen.")
		return
	tap(KEY_ENTER)
	await process_frame
	tap(KEY_ESCAPE)
	await process_frame
	if start.is_visible_in_tree() or not new_game.has_focus():
		fail("Escape muss zum fokussierten Menüeintrag zurückführen.")
		return
	tap(KEY_ENTER)
	await process_frame
	var map_path := "res://scenes/map.tscn"
	var real_map := load(map_path) as PackedScene
	var invalid_map := PackedScene.new()
	var wrong_root := Node.new()
	invalid_map.pack(wrong_root)
	wrong_root.free()
	invalid_map.take_over_path(map_path)
	tap(KEY_ENTER)
	await process_frame
	real_map.take_over_path(map_path)
	if not current_scene.get_node("Setup/Error").is_visible_in_tree() or start.disabled or not start.has_focus():
		fail("Bei einem Kartenfehler muss ein neuer Start möglich sein.")
		return
	tap(KEY_ENTER)
	await process_frame
	await process_frame
	if current_scene == null or current_scene.get_class() != &"MapScene":
		fail("Starten muss die 3D-Karte öffnen.")
		return
	if not current_scene.get_node("Camera3D").is_current():
		fail("Die Kartenkamera muss aktiv sein.")
		return
	var world := current_scene.get_node("World")
	var buildings := world.find_children("Building*", "Node3D", false, false)
	if buildings.size() < 24 or world.get_child_count() <= buildings.size() + 10:
		fail("Die erzeugte Welt muss Straßen und Miniaturen enthalten.")
		return
	if not await check_camera(current_scene.get_node("Camera3D")):
		return
	tap(KEY_ESCAPE)
	await process_frame
	await process_frame
	if current_scene == null or current_scene.get_class() != &"StartMenu":
		fail("Escape muss von der Karte zum Hauptmenü führen.")
		return
	var quit_button := current_scene.get_node("Menu/Actions/Quit") as Button
	quit_button.grab_focus()
	tap(KEY_ENTER)
	await create_timer(0.3).timeout
	fail("Beenden hat den Prozess nicht beendet.")


func check_camera(camera: Camera3D) -> bool:
	var right := camera.basis.x.slide(Vector3.UP).normalized()
	var up := camera.basis.y.slide(Vector3.UP).normalized()
	for direction in [[KEY_W, up], [KEY_A, -right], [KEY_S, -up], [KEY_D, right]]:
		var initial := camera.position
		physical_key(direction[0], true)
		await create_timer(0.1).timeout
		physical_key(direction[0], false)
		if (camera.position - initial).dot(direction[1]) < 2.0:
			fail("Eine WASD-Taste verschiebt die Karte nicht in die erwartete Richtung.")
			return false
		var stopped := camera.position
		await create_timer(0.05).timeout
		if not camera.position.is_equal_approx(stopped):
			fail("Die Kamera bewegt sich nach dem Loslassen weiter.")
			return false
	return true


func physical_key(key: Key, pressed: bool) -> void:
	var event := InputEventKey.new()
	event.physical_keycode = key
	event.pressed = pressed
	Input.parse_input_event(event)


func tap(key: Key) -> void:
	var press := InputEventKey.new()
	press.keycode = key
	press.pressed = true
	Input.parse_input_event(press)
	var release := InputEventKey.new()
	release.keycode = key
	Input.parse_input_event(release)


func fail(message: String) -> void:
	printerr(message)
	quit(1)
