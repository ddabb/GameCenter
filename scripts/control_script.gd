extends Control

const COLOR_BTN_BG = Color(1, 1, 1, 0.08)
const COLOR_BTN_HOVER = Color(1, 1, 1, 0.15)
const COLOR_BTN_PRESSED = Color(1, 1, 1, 0.2)
const COLOR_BTN_TEXT = Color(0.9, 0.9, 0.9)
const CORNER = 12

func _ready():
	var grid = get_node_or_null("Margin/VBox/Grid")
	if not grid:
		return
	
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
		var button = grid.get_node_or_null(button_name)
		if button:
			button.pressed.connect(callback)
			_style_button(button)

func _style_button(btn: Button):
	var sb = StyleBoxFlat.new()
	sb.bg_color = COLOR_BTN_BG
	sb.corner_radius_top_left = CORNER
	sb.corner_radius_top_right = CORNER
	sb.corner_radius_bottom_left = CORNER
	sb.corner_radius_bottom_right = CORNER
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	btn.add_theme_stylebox_override("normal", sb)
	
	var hsb = sb.duplicate()
	hsb.bg_color = COLOR_BTN_HOVER
	btn.add_theme_stylebox_override("hover", hsb)
	
	var psb = sb.duplicate()
	psb.bg_color = COLOR_BTN_PRESSED
	btn.add_theme_stylebox_override("pressed", psb)
	
	btn.add_theme_color_override("font_color", COLOR_BTN_TEXT)
	btn.add_theme_color_override("font_hover_color", Color(1, 1, 1))

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
