extends Control

# === 设计系统 ===
const GRADIENT_TOP = Color(0.059, 0.047, 0.161)  # #0f0c29
const GRADIENT_BOT = Color(0.086, 0.086, 0.165)   # #16162a
const COLOR_CARD = Color(1, 1, 1, 0.06)
const COLOR_CARD_HOVER = Color(1, 1, 1, 0.1)
const COLOR_CARD_PRESS = Color(1, 1, 1, 0.14)
const COLOR_ACCENT = Color(0.4, 0.494, 0.918)      # #667eea
const COLOR_ACCENT2 = Color(0.463, 0.294, 0.635)   # #764ba2
const COLOR_TEXT = Color(1, 1, 1, 0.95)
const COLOR_TEXT_DIM = Color(1, 1, 1, 0.5)
const RADIUS_CARD = 16
const RADIUS_BTN = 12

const GAMES = [
	{"icon": "💡", "name": "数灯", "desc": "放置灯泡照亮所有格子", "scene": "res://scenes/akari.tscn"},
	{"icon": "⚫", "name": "黑白棋", "desc": "翻转对手棋子占领棋盘", "scene": "res://scenes/othello.tscn"},
	{"icon": "📦", "name": "推箱子", "desc": "将箱子推到指定位置", "scene": "res://scenes/sokoban.tscn"},
	{"icon": "🚢", "name": "战舰", "desc": "猜测敌方战舰位置", "scene": "res://scenes/battleship.tscn"},
	{"icon": "🧱", "name": "数墙", "desc": "用墙壁分隔数字区域", "scene": "res://scenes/nurikabe.tscn"},
	{"icon": "⛺", "name": "帐篷", "desc": "为每棵树搭一顶帐篷", "scene": "res://scenes/tents.tscn"},
	{"icon": "🔗", "name": "数回", "desc": "画出连续的封闭回路", "scene": "res://scenes/slither-link.tscn"},
	{"icon": "1️⃣", "name": "数字一", "desc": "放置数字1的谜题", "scene": "res://scenes/number-one.tscn"},
	{"icon": "🐸", "name": "青蛙逃脱", "desc": "滑动方块开辟道路", "scene": "res://scenes/frog-escape.tscn"},
]

func _ready():
	# 渐变背景
	var bg = ColorRect.new()
	bg.color = GRADIENT_TOP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	
	# 主容器
	var margin = MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_top", 32)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_bottom", 20)
	add_child(margin)
	
	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 16)
	margin.add_child(vbox)
	
	# Logo 区域
	var logo_box = HBoxContainer.new()
	logo_box.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_child(logo_box)
	
	var logo = Label.new()
	logo.text = "🧩"
	logo.add_theme_font_size_override("font_size", 40)
	logo_box.add_child(logo)
	
	var title_vbox = VBoxContainer.new()
	title_vbox.add_theme_constant_override("separation", 2)
	logo_box.add_child(title_vbox)
	
	var title = Label.new()
	title.text = "益智游戏合集"
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", COLOR_TEXT)
	title_vbox.add_child(title)
	
	var subtitle = Label.new()
	subtitle.text = "选择游戏开始挑战"
	subtitle.add_theme_font_size_override("font_size", 13)
	subtitle.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	title_vbox.add_child(subtitle)
	
	# 分隔线
	_add_separator(vbox)
	
	# 游戏卡片网格 (2列，更像手游)
	var grid = GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(grid)
	
	# 游戏卡片
	for i in range(GAMES.size()):
		var game = GAMES[i]
		var card = _create_game_card(game, i)
		grid.add_child(card)

func _create_game_card(game: Dictionary, index: int) -> Control:
	var card = PanelContainer.new()
	card.custom_minimum_size = Vector2(0, 110)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.mouse_filter = Control.MOUSE_FILTER_PASS
	
	# 卡片样式
	var sb = StyleBoxFlat.new()
	sb.bg_color = COLOR_CARD
	sb.corner_radius_top_left = RADIUS_CARD
	sb.corner_radius_top_right = RADIUS_CARD
	sb.corner_radius_bottom_left = RADIUS_CARD
	sb.corner_radius_bottom_right = RADIUS_CARD
	sb.content_margin_top = 14
	sb.content_margin_bottom = 14
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.border_color = Color(1, 1, 1, 0.03)
	sb.border_width_top = 1
	card.add_theme_stylebox_override("panel", sb)
	
	# 点击区域
	var click = BaseButton.new()
	click.set_anchors_preset(Control.PRESET_FULL_RECT)
	click.mouse_filter = Control.MOUSE_FILTER_STOP
	click.action_mode = BaseButton.ACTION_MODE_BUTTON_PRESS
	
	# Hover/Pressed 样式
	var hsb = sb.duplicate()
	hsb.bg_color = COLOR_CARD_HOVER
	card.add_theme_stylebox_override("panel_hover", hsb)  # won't work directly, use click button styling
	
	# 卡片内容
	var hbox = HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 12)
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	card.add_child(hbox)
	
	# 图标
	var icon_bg = PanelContainer.new()
	var icon_sb = StyleBoxFlat.new()
	icon_sb.bg_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.15)
	icon_sb.corner_radius_top_left = 12
	icon_sb.corner_radius_top_right = 12
	icon_sb.corner_radius_bottom_left = 12
	icon_sb.corner_radius_bottom_right = 12
	icon_sb.content_margin_top = 8
	icon_sb.content_margin_bottom = 8
	icon_sb.content_margin_left = 8
	icon_sb.content_margin_right = 8
	icon_bg.add_theme_stylebox_override("panel", icon_sb)
	hbox.add_child(icon_bg)
	
	var icon = Label.new()
	icon.text = game.icon
	icon.add_theme_font_size_override("font_size", 28)
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_bg.add_child(icon)
	
	# 文字区
	var text_vbox = VBoxContainer.new()
	text_vbox.add_theme_constant_override("separation", 4)
	text_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(text_vbox)
	
	var name_label = Label.new()
	name_label.text = game.name
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.add_theme_color_override("font_color", COLOR_TEXT)
	text_vbox.add_child(name_label)
	
	var desc_label = Label.new()
	desc_label.text = game.desc
	desc_label.add_theme_font_size_override("font_size", 11)
	desc_label.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text_vbox.add_child(desc_label)
	
	# 箭头
	var arrow = Label.new()
	arrow.text = "›"
	arrow.add_theme_font_size_override("font_size", 20)
	arrow.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	arrow.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(arrow)
	
	# 点击事件
	click.pressed.connect(func(): get_tree().change_scene_to_file(game.scene))
	click.mouse_entered.connect(func(): 
		var s = sb.duplicate()
		s.bg_color = COLOR_CARD_HOVER
		card.add_theme_stylebox_override("panel", s)
	)
	click.mouse_exited.connect(func():
		card.add_theme_stylebox_override("panel", sb)
	)
	card.add_child(click)
	# 确保 click 在最上层
	card.move_child(click, card.get_child_count() - 1)
	
	return card

func _add_separator(parent: VBoxContainer):
	var sep = HSeparator.new()
	sep.add_theme_stylebox_override("separator", StyleBoxEmpty.new())
	sep.custom_minimum_size = Vector2(0, 4)
	parent.add_child(sep)
