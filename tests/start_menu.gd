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
	OS.set_environment("BUILDER_MAP_SEED", "   ")
	tap(KEY_ENTER)
	await process_frame
	if current_scene.get_class() != &"StartMenu" or not current_scene.get_node("Setup/Error").is_visible_in_tree() or start.disabled or not start.has_focus():
		fail("Bei einem ungültigen Seed muss ein neuer Start möglich sein.")
		return
	OS.set_environment("BUILDER_MAP_SEED", "0")
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
	var marker := world.find_child("TriangleMarker", true, false) as MeshInstance3D
	if marker == null or not marker.mesh is PrismMesh:
		fail("Die Dreieckquelle braucht ein dreieckiges Modell.")
		return
	if not check_parcels("Raster", world, current_scene.get_node("Camera3D")):
		return
	if not await check_camera(current_scene.get_node("Camera3D"), world):
		return
	tap(KEY_ESCAPE)
	await process_frame
	await process_frame
	if current_scene == null or current_scene.get_class() != &"StartMenu":
		fail("Escape muss von der Karte zum Hauptmenü führen.")
		return
	OS.set_environment("BUILDER_MAP_SEED", "1")
	tap(KEY_ENTER)
	await process_frame
	tap(KEY_ENTER)
	await process_frame
	await process_frame
	if current_scene == null or current_scene.get_class() != &"MapScene":
		fail("Starten muss auch die Ringkarte öffnen.")
		return
	if not check_parcels("Ring", current_scene.get_node("World"), current_scene.get_node("Camera3D")):
		return
	tap(KEY_ESCAPE)
	await process_frame
	await process_frame
	if current_scene == null or current_scene.get_class() != &"StartMenu":
		fail("Escape muss auch von der Ringkarte zum Hauptmenü führen.")
		return
	var quit_button := current_scene.get_node("Menu/Actions/Quit") as Button
	quit_button.grab_focus()
	tap(KEY_ENTER)
	await create_timer(0.3).timeout
	fail("Beenden hat den Prozess nicht beendet.")


func check_parcels(layout: String, world: Node3D, camera: Camera3D) -> bool:
	var blocks := world.find_children("BlockSurface*", "MeshInstance3D", true, false)
	if blocks.size() < 3:
		fail("%s: Die Karte muss Stadtblöcke als Flächen darstellen." % layout)
		return false
	var occupied := world.find_children("OccupiedParcelOutline*", "MeshInstance3D", true, false)
	if occupied.is_empty():
		fail("%s: Auch bebaute Parzellen brauchen einen Umriss." % layout)
		return false
	if not check_driveways(layout, world):
		return false
	if not check_road_markings(layout, world):
		return false
	var occupied_outline := occupied[0] as MeshInstance3D
	var occupied_material := occupied_outline.material_override as StandardMaterial3D
	var visible_vacant := 0
	var viewport := camera.get_viewport().get_visible_rect()
	for node in world.find_children("VacantParcelOutline*", "MeshInstance3D", true, false):
		var outline := node as MeshInstance3D
		if not outline.is_visible_in_tree() or not outline.mesh is ArrayMesh:
			continue
		var material := outline.material_override as StandardMaterial3D
		if material == null or occupied_material == null or material.albedo_color == occupied_material.albedo_color:
			fail("%s: Freie Parzellen müssen sich farblich von bebauten Parzellen abheben." % layout)
			return false
		var surface := outline.mesh.surface_get_arrays(0)
		var vertices: PackedVector3Array = surface[Mesh.ARRAY_VERTEX]
		var indices: PackedInt32Array = surface[Mesh.ARRAY_INDEX]
		if not has_closed_border(indices):
			fail("%s: Jede freie Parzelle braucht einen geschlossenen Umriss." % layout)
			return false
		var fully_in_view := true
		for vertex in vertices:
			var point := outline.to_global(vertex)
			if camera.is_position_behind(point) or not viewport.has_point(camera.unproject_position(point)):
				fully_in_view = false
				break
		if fully_in_view:
			visible_vacant += 1
	if visible_vacant < 2:
		fail("%s: In der Startansicht müssen mehrere freie Parzellen vollständig sichtbar sein." % layout)
		return false
	return true


func check_driveways(layout: String, world: Node3D) -> bool:
	var driveway_count := 0
	for child in world.get_children():
		var instance := child as MeshInstance3D
		if instance == null or not instance.mesh is BoxMesh:
			continue
		var mesh := instance.mesh as BoxMesh
		if not is_equal_approx(mesh.size.y, 0.2):
			continue
		if not is_equal_approx(mesh.size.x, 4.0):
			fail("%s: Zufahrten müssen in den vier Einheiten breiten Korridor passen." % layout)
			return false
		driveway_count += 1
	if driveway_count != 3:
		fail("%s: Die drei Logistikstandorte brauchen je eine Zufahrt." % layout)
		return false
	return true


func check_road_markings(layout: String, world: Node3D) -> bool:
	var road_length := 0.0
	var marking_count := 0
	for child in world.get_children():
		var instance := child as MeshInstance3D
		if instance == null or not instance.mesh is BoxMesh:
			continue
		var mesh := instance.mesh as BoxMesh
		if is_equal_approx(mesh.size.y, 0.4):
			road_length += mesh.size.z
		elif is_equal_approx(mesh.size.y, 0.04):
			marking_count += 1
	if marking_count < road_length / 27.0:
		fail("%s: Auch Straßen mit kurzen Teilstücken brauchen durchgehende Fahrbahnmarkierungen." % layout)
		return false
	return true


func has_closed_border(indices: PackedInt32Array) -> bool:
	# Ein ausgefüllter Umriss hat einen geschlossenen inneren und äußeren Rand.
	if indices.size() % 3 != 0:
		return false
	var edges := {}
	for index in range(0, indices.size(), 3):
		for offset in range(3):
			var a := indices[index + offset]
			var b := indices[index + (offset + 1) % 3]
			var edge := Vector2i(mini(a, b), maxi(a, b))
			edges[edge] = edges.get(edge, 0) + 1
	var boundary := {}
	for edge: Vector2i in edges:
		if edges[edge] == 1:
			if not boundary.has(edge.x):
				boundary[edge.x] = []
			if not boundary.has(edge.y):
				boundary[edge.y] = []
			boundary[edge.x].append(edge.y)
			boundary[edge.y].append(edge.x)
	var loops := 0
	while not boundary.is_empty():
		var vertex: int = boundary.keys()[0]
		while boundary.has(vertex):
			var neighbours: Array = boundary[vertex]
			if neighbours.size() != 2:
				return false
			boundary.erase(vertex)
			vertex = neighbours[0] if boundary.has(neighbours[0]) else neighbours[1]
		loops += 1
	return loops == 2


func check_camera(camera: Camera3D, world: Node3D) -> bool:
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
	var initial := camera.position
	physical_key(KEY_D, true)
	await create_timer(0.35).timeout
	physical_key(KEY_D, false)
	var cardinal_speed := camera.position.distance_to(initial)
	camera.position = initial
	physical_key(KEY_D, true)
	physical_key(KEY_W, true)
	await create_timer(0.35).timeout
	physical_key(KEY_D, false)
	physical_key(KEY_W, false)
	var diagonal_speed := camera.position.distance_to(initial)
	if absf(diagonal_speed - cardinal_speed) > cardinal_speed * 0.17:
		fail("Diagonale und gerade Kamerabewegung müssen gleich schnell sein.")
		return false

	# Die Kameramitte ist der Schnittpunkt ihrer Blickachse mit der Bauebene.
	var ground := world.get_child(0) as MeshInstance3D
	var ground_mesh := ground.mesh as BoxMesh
	var boundary := ground.position.x + ground_mesh.size.x * 0.5
	var target := ground_point(camera)
	camera.position.x += boundary - target.x - 1.0
	physical_key(KEY_D, true)
	await create_timer(0.1).timeout
	physical_key(KEY_D, false)
	if not is_equal_approx(ground_point(camera).x, boundary):
		fail("Die Kameramitte muss an der Kartengrenze stoppen.")
		return false
	return true


func ground_point(camera: Camera3D) -> Vector3:
	return camera.position - camera.basis.z * camera.position.y / camera.basis.z.y


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
