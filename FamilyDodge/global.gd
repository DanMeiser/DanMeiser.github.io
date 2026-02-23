extends Node

## Singleton autoload: stores selected character and persists high scores.

var selected_character: String = "calvin"
const ALL_CHARACTERS: Array = ["calvin", "bailey", "lilly"]

## Maps character names to their preview PNG filename (handles the lilly hyphen quirk).
const PREVIEW_PATHS: Dictionary = {
	"calvin": "res://assets/calvin_preview.png",
	"bailey": "res://assets/bailey_preview.png",
	"lilly":  "res://assets/lilly-preview.png"
}

const SAVE_PATH: String = "user://family_dodge_scores.cfg"


## Returns the two characters that are NOT currently selected (creep pool).
func get_creep_characters() -> Array:
	return ALL_CHARACTERS.filter(func(c): return c != selected_character)


## Save a score for a character if it beats the current best.
func save_score(char_name: String, score: int) -> void:
	var config := ConfigFile.new()
	config.load(SAVE_PATH)  # OK to fail on first run
	var best: int = config.get_value("scores", char_name, 0)
	if score > best:
		config.set_value("scores", char_name, score)
		config.save(SAVE_PATH)


## Return the best saved score for a character (0 if never played).
func get_best_score(char_name: String) -> int:
	var config := ConfigFile.new()
	if config.load(SAVE_PATH) == OK:
		return config.get_value("scores", char_name, 0)
	return 0
