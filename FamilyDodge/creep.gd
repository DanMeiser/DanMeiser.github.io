extends RigidBody2D

## Speed in px/s – set by Main before adding to the scene tree.
var speed: float = 200.0

var _player: Node2D = null


func _ready() -> void:
	# Pick a random character from the non-selected pool for this creep's skin
	var pool: Array = Global.get_creep_characters()
	_setup_sprite(pool.pick_random())

	# Grab player reference so we can home in on them
	_player = get_tree().get_first_node_in_group(&"player")


## Build SpriteFrames for this creep from the chosen character's PNGs.
func _setup_sprite(char_name: String) -> void:
	var frames := SpriteFrames.new()
	frames.add_animation(&"walk")
	frames.set_animation_loop(&"walk", true)
	frames.set_animation_speed(&"walk", 8.0)
	for i in range(1, 4):
		var tex := load("res://assets/" + char_name + str(i) + ".png") as Texture2D
		if tex:
			frames.add_frame(&"walk", tex)
	$AnimatedSprite2D.sprite_frames = frames
	$AnimatedSprite2D.play(&"walk")


func _physics_process(_delta: float) -> void:
	if _player == null or not is_instance_valid(_player) or not _player.visible:
		return

	# Softly steer toward the player each frame (homing behaviour)
	if linear_velocity.length_squared() > 0.01:
		var dir_to_player: Vector2 = (_player.global_position - global_position).normalized()
		var blended: Vector2 = linear_velocity.normalized().lerp(dir_to_player, 0.035).normalized()
		linear_velocity = blended * speed

	$AnimatedSprite2D.flip_h = linear_velocity.x < 0


func _on_visible_on_screen_notifier_2d_screen_exited() -> void:
	queue_free()
