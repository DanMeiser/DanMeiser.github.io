extends Node

const CREEP_SCENE: PackedScene = preload("res://creep.tscn")

var score: int = 0


func _ready() -> void:
	# Build a rectangular spawn path just outside the viewport edges
	var vp := get_viewport_rect().size
	var margin := 60.0
	var curve := Curve2D.new()
	curve.add_point(Vector2(-margin, -margin))
	curve.add_point(Vector2(vp.x + margin, -margin))
	curve.add_point(Vector2(vp.x + margin, vp.y + margin))
	curve.add_point(Vector2(-margin, vp.y + margin))
	curve.add_point(Vector2(-margin, -margin))
	$MobPath.curve = curve

	# Show title + start button on first open
	$HUD.show_message("Family\nDodge!")
	await $HUD/MessageTimer.timeout
	$HUD.update_best(Global.get_best_score(Global.selected_character))
	$HUD/StartButton.show()


func game_over() -> void:
	$ScoreTimer.stop()
	$MobTimer.stop()
	get_tree().call_group(&"mobs", &"queue_free")
	Global.save_score(Global.selected_character, score)
	$HUD.update_best(Global.get_best_score(Global.selected_character))
	$HUD.show_game_over(score)


func new_game() -> void:
	score = 0
	get_tree().call_group(&"mobs", &"queue_free")
	$HUD.update_score(score)
	$HUD.update_best(Global.get_best_score(Global.selected_character))
	$Player.start($StartPosition.position)
	$StartTimer.start()
	$HUD.show_get_ready()


## Spawn one creep per timer tick; speed and rate ramp with score.
func _on_mob_timer_timeout() -> void:
	var creep = CREEP_SCENE.instantiate()

	var spawn_loc: PathFollow2D = $MobPath/MobSpawnLocation
	spawn_loc.progress_ratio = randf()
	creep.position = spawn_loc.position

	var direction: float = spawn_loc.rotation + PI / 2.0
	direction += randf_range(-PI / 4.0, PI / 4.0)
	creep.rotation = direction

	# Speed scales with score for increasing difficulty
	var base_speed: float = randf_range(140.0, 220.0) + score * 2.5
	creep.speed = base_speed
	creep.linear_velocity = Vector2(base_speed, 0.0).rotated(direction)

	creep.add_to_group(&"mobs")
	add_child(creep)

	# Gradually speed up the spawn rate (minimum 0.2 s)
	$MobTimer.wait_time = max(0.2, 0.8 - score * 0.015)


func _on_score_timer_timeout() -> void:
	score += 1
	$HUD.update_score(score)


func _on_start_timer_timeout() -> void:
	$MobTimer.start()
	$ScoreTimer.start()


func _on_player_hit() -> void:
	game_over()


func _on_hud_start_game() -> void:
	new_game()


func _on_hud_change_character() -> void:
	get_tree().change_scene_to_file("res://character_select.tscn")
