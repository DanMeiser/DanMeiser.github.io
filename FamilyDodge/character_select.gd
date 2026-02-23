extends Control


func _ready() -> void:
	# Load preview textures dynamically (graceful if assets not yet copied)
	for char_name in Global.ALL_CHARACTERS:
		var preview_path: String = Global.PREVIEW_PATHS[char_name]
		var tex := load(preview_path) as Texture2D
		var node_name: String = char_name.capitalize()
		var preview_node: TextureRect = get_node_or_null(
				"VBox/Characters/%s/Preview" % node_name
		) as TextureRect
		if preview_node and tex:
			preview_node.texture = tex

		# Show best score under each character button
		var score_label: Label = get_node_or_null(
				"VBox/Characters/%s/BestLabel" % node_name
		) as Label
		if score_label:
			score_label.text = "Best: %d" % Global.get_best_score(char_name)


func _on_calvin_btn_pressed() -> void:
	Global.selected_character = "calvin"
	get_tree().change_scene_to_file("res://main.tscn")


func _on_bailey_btn_pressed() -> void:
	Global.selected_character = "bailey"
	get_tree().change_scene_to_file("res://main.tscn")


func _on_lilly_btn_pressed() -> void:
	Global.selected_character = "lilly"
	get_tree().change_scene_to_file("res://main.tscn")
