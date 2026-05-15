extends Control

func _ready():
	var vbox = get_node_or_null("VBox")
	if vbox:
		var buttons = [
			["ButtonAkari", _on_akari_pressed],
			["ButtonOthello", _on_othello_pressed],
			["ButtonSokoban", _on_sokoban_pressed],
			["ButtonBattleship", _on_battleship_pressed],
			["ButtonNurikabe", _on_nurikabe_pressed],
			["ButtonTents", _on_tents_pressed],
			["ButtonSlitherLink", _on_slither_link_pressed],
			["ButtonNumberOne", _on_number_one_pressed],
			["ButtonFrogEscape", _on_frog_escape_pressed]
		]
		
		for button_info in buttons:
			var button_name = button_info[0]
			var callback = button_info[1]
			var button = vbox.get_node_or_null(button_name)
			if button:
				button.pressed.connect(callback)

func _on_akari_pressed():
	get_tree().change_scene_to_file("res://scenes/akari.tscn")

func _on_othello_pressed():
	get_tree().change_scene_to_file("res://scenes/othello.tscn")

func _on_sokoban_pressed():
	get_tree().change_scene_to_file("res://scenes/sokoban.tscn")

func _on_battleship_pressed():
	get_tree().change_scene_to_file("res://scenes/battleship.tscn")

func _on_nurikabe_pressed():
	get_tree().change_scene_to_file("res://scenes/nurikabe.tscn")

func _on_tents_pressed():
	get_tree().change_scene_to_file("res://scenes/tents.tscn")

func _on_slither_link_pressed():
	get_tree().change_scene_to_file("res://scenes/slither-link.tscn")

func _on_number_one_pressed():
	get_tree().change_scene_to_file("res://scenes/number-one.tscn")

func _on_frog_escape_pressed():
	get_tree().change_scene_to_file("res://scenes/frog-escape.tscn")
