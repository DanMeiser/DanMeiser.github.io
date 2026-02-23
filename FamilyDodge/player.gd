extends Area2D

signal hit

@export var speed: float = 350.0

var screen_size: Vector2


func _ready() -> void:
	add_to_group(&"player")
	screen_size = get_viewport_rect().size
	hide()
	_setup_sprite(Global.selected_character)


## Build SpriteFrames at runtime from the selected character's PNG files.
func _setup_sprite(char_name: String) -> void:
	var frames := SpriteFrames.new()

	# Walk animation – 3 frames cycled at 6 fps
	frames.add_animation(&"walk")
	frames.set_animation_loop(&"walk", true)
	frames.set_animation_speed(&"walk", 6.0)
	for i in range(1, 4):
		var tex := load("res://assets/" + char_name + str(i) + ".png") as Texture2D
		if tex:
			frames.add_frame(&"walk", tex)

	# Idle – single frame
	frames.add_animation(&"idle")
	frames.set_animation_loop(&"idle", true)
	var idle_tex := load("res://assets/" + char_name + "1.png") as Texture2D
	if idle_tex:
		frames.add_frame(&"idle", idle_tex)

	$AnimatedSprite2D.sprite_frames = frames
	$AnimatedSprite2D.play(&"idle")


func _process(delta: float) -> void:
	var velocity := Vector2.ZERO
	if Input.is_action_pressed(&"move_right"): velocity.x += 1.0
	if Input.is_action_pressed(&"move_left"):  velocity.x -= 1.0
	if Input.is_action_pressed(&"move_down"):  velocity.y += 1.0
	if Input.is_action_pressed(&"move_up"):    velocity.y -= 1.0

	if velocity.length_squared() > 0:
		velocity = velocity.normalized() * speed
		$AnimatedSprite2D.play(&"walk")
		$AnimatedSprite2D.flip_h = velocity.x < 0
	else:
		$AnimatedSprite2D.play(&"idle")

	position = (position + velocity * delta).clamp(Vector2.ZERO, screen_size)


## Called by Main to place and activate the player.
func start(pos: Vector2) -> void:
	position = pos
	show()
	$CollisionShape2D.set_deferred(&"disabled", false)


func _on_body_entered(_body: Node2D) -> void:
	hide()
	hit.emit()
	$CollisionShape2D.set_deferred(&"disabled", true)
