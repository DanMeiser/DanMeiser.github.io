extends CanvasLayer

signal start_game
signal change_character


func show_message(text: String) -> void:
	$MessageLabel.text = text
	$MessageLabel.show()
	$MessageTimer.start()


func show_get_ready() -> void:
	show_message("Get Ready!")


func show_game_over(final_score: int) -> void:
	show_message("Game Over!")
	await $MessageTimer.timeout
	$MessageLabel.text = "Family\nDodge!"
	$MessageLabel.show()
	await get_tree().create_timer(1.0).timeout
	update_score(final_score)
	$StartButton.show()
	$ChangeCharBtn.show()


func update_score(score: int) -> void:
	$ScoreLabel.text = "Score: %d" % score


func update_best(best: int) -> void:
	$BestLabel.text = "Best: %d" % best


func _on_start_button_pressed() -> void:
	$StartButton.hide()
	$ChangeCharBtn.hide()
	start_game.emit()


func _on_change_char_btn_pressed() -> void:
	change_character.emit()


func _on_message_timer_timeout() -> void:
	$MessageLabel.hide()
