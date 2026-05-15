extends Control

func _ready():
	var btn = get_node_or_null("Margin/VBox/BackButton")
	if btn:
		btn.pressed.connect(_on_back_pressed)

func _on_back_pressed():
	get_tree().change_scene_to_file("res://scenes/control.tscn")
