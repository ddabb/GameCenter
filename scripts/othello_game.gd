extends Control

# === 黑白棋 (Othello) - 大厂手游风格 ===

const POSITION_WEIGHT = [
	[100, -20,  10,   5,   5,  10, -20, 100],
	[-20, -50,  -2,  -2,  -2,  -2, -50, -20],
	[ 10,  -2,   1,   1,   1,   1,  -2,  10],
	[  5,  -2,   1,   0,   0,   1,  -2,   5],
	[  5,  -2,   1,   0,   0,   1,  -2,   5],
	[ 10,  -2,   1,   1,   1,   1,  -2,  10],
	[-20, -50,  -2,  -2,  -2,  -2, -50, -20],
	[100, -20,  10,   5,   5,  10, -20, 100]
]

const DIRECTIONS = [
	[-1, -1], [-1, 0], [-1, 1],
	[0, -1],           [0, 1],
	[1, -1],  [1, 0],  [1, 1]
]

const BLACK = 1
const WHITE = 2

# === 设计系统 ===
const COLOR_BG = Color(0.059, 0.047, 0.161)
const COLOR_BOARD_GREEN = Color(0.133, 0.333, 0.133)
const COLOR_BOARD_DARK = Color(0.093, 0.247, 0.093)
const COLOR_CELL_BORDER = Color(0.08, 0.2, 0.08)
const COLOR_BLACK_PIECE = Color(0.12, 0.12, 0.12)
const COLOR_WHITE_PIECE = Color(0.95, 0.95, 0.95)
const COLOR_VALID_HINT = Color(1, 1, 1, 0.35)
const COLOR_LAST_MOVE = Color(1, 0.843, 0)
const COLOR_CARD = Color(1, 1, 1, 0.06)
const COLOR_ACCENT = Color(0.4, 0.494, 0.918)
const COLOR_TEXT = Color(1, 1, 1, 0.95)
const COLOR_TEXT_DIM = Color(1, 1, 1, 0.5)
const COLOR_SCORE_BLACK_BG = Color(0.15, 0.15, 0.15, 0.8)
const COLOR_SCORE_WHITE_BG = Color(0.9, 0.9, 0.9, 0.15)
const RADIUS = 16
const RADIUS_SM = 12

# === 游戏状态 ===
var board = []
var current_player = BLACK
var valid_moves = []
var black_count = 2
var white_count = 2
var game_over = false
var winner = null
var ai_thinking = false
var difficulty = 'medium'
var last_move = null
var sound_enabled = true

# === UI 引用 ===
var board_grid: GridContainer = null
var black_score_label: Label = null
var white_score_label: Label = null
var status_label: Label = null
var turn_icon: ColorRect = null
var turn_label: Label = null
var diff_buttons = []

func _ready():
	_build_ui()
	init_game()

func _build_ui():
	# 背景
	var bg = ColorRect.new()
	bg.color = COLOR_BG
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	
	var margin = MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 20)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 16)
	add_child(margin)
	
	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	margin.add_child(vbox)
	
	# 顶部导航
	var navbar = HBoxContainer.new()
	vbox.add_child(navbar)
	
	var back_btn = Button.new()
	back_btn.text = "← 返回"
	back_btn.add_theme_font_size_override("font_size", 15)
	back_btn.add_theme_color_override("font_color", COLOR_ACCENT)
	back_btn.flat = true
	back_btn.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/control.tscn"))
	navbar.add_child(back_btn)
	
	var nsp = Control.new()
	nsp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	navbar.add_child(nsp)
	
	var header = Label.new()
	header.text = "⚫ 黑白棋 ⚪"
	header.add_theme_font_size_override("font_size", 18)
	header.add_theme_color_override("font_color", COLOR_TEXT)
	navbar.add_child(header)
	
	var nsp2 = Control.new()
	nsp2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	navbar.add_child(nsp2)
	
	var sound_btn = Button.new()
	sound_btn.text = "🔊"
	sound_btn.add_theme_font_size_override("font_size", 18)
	sound_btn.flat = true
	sound_btn.pressed.connect(toggle_sound)
	navbar.add_child(sound_btn)
	
	# 比分栏
	var score_bar = HBoxContainer.new()
	score_bar.add_theme_constant_override("separation", 8)
	vbox.add_child(score_bar)
	
	# 黑棋分数
	var black_card = PanelContainer.new()
	black_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var bsb = StyleBoxFlat.new()
	bsb.bg_color = COLOR_SCORE_BLACK_BG
	bsb.corner_radius_top_left = RADIUS_SM
	bsb.corner_radius_top_right = RADIUS_SM
	bsb.corner_radius_bottom_left = RADIUS_SM
	bsb.corner_radius_bottom_right = RADIUS_SM
	bsb.content_margin_top = 10
	bsb.content_margin_bottom = 10
	bsb.content_margin_left = 12
	bsb.content_margin_right = 12
	black_card.add_theme_stylebox_override("panel", bsb)
	score_bar.add_child(black_card)
	
	var black_hbox = HBoxContainer.new()
	black_hbox.add_theme_constant_override("separation", 8)
	black_hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	black_card.add_child(black_hbox)
	
	var black_icon = ColorRect.new()
	black_icon.custom_minimum_size = Vector2(28, 28)
	black_icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	black_icon.color = COLOR_BLACK_PIECE
	black_hbox.add_child(black_icon)
	
	black_score_label = Label.new()
	black_score_label.text = "2"
	black_score_label.add_theme_font_size_override("font_size", 24)
	black_score_label.add_theme_color_override("font_color", COLOR_TEXT)
	black_hbox.add_child(black_score_label)
	
	# VS
	var vs_label = Label.new()
	vs_label.text = "VS"
	vs_label.add_theme_font_size_override("font_size", 12)
	vs_label.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	vs_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	score_bar.add_child(vs_label)
	
	# 白棋分数
	var white_card = PanelContainer.new()
	white_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var wsb = StyleBoxFlat.new()
	wsb.bg_color = COLOR_SCORE_WHITE_BG
	wsb.corner_radius_top_left = RADIUS_SM
	wsb.corner_radius_top_right = RADIUS_SM
	wsb.corner_radius_bottom_left = RADIUS_SM
	wsb.corner_radius_bottom_right = RADIUS_SM
	wsb.content_margin_top = 10
	wsb.content_margin_bottom = 10
	wsb.content_margin_left = 12
	wsb.content_margin_right = 12
	white_card.add_theme_stylebox_override("panel", wsb)
	score_bar.add_child(white_card)
	
	var white_hbox = HBoxContainer.new()
	white_hbox.add_theme_constant_override("separation", 8)
	white_hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	white_card.add_child(white_hbox)
	
	white_score_label = Label.new()
	white_score_label.text = "2"
	white_score_label.add_theme_font_size_override("font_size", 24)
	white_score_label.add_theme_color_override("font_color", COLOR_TEXT)
	white_hbox.add_child(white_score_label)
	
	var white_icon = ColorRect.new()
	white_icon.custom_minimum_size = Vector2(28, 28)
	white_icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	white_icon.color = COLOR_WHITE_PIECE
	white_hbox.add_child(white_icon)
	
	# 状态 + 回合
	var status_bar = HBoxContainer.new()
	status_bar.add_theme_constant_override("separation", 6)
	status_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_child(status_bar)
	
	turn_icon = ColorRect.new()
	turn_icon.custom_minimum_size = Vector2(16, 16)
	turn_icon.color = COLOR_BLACK_PIECE
	status_bar.add_child(turn_icon)
	
	turn_label = Label.new()
	turn_label.text = "黑棋回合"
	turn_label.add_theme_font_size_override("font_size", 13)
	turn_label.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	status_bar.add_child(turn_label)
	
	status_label = Label.new()
	status_label.add_theme_font_size_override("font_size", 13)
	status_label.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	status_bar.add_child(status_label)
	
	# 难度选择
	var diff_bar = HBoxContainer.new()
	diff_bar.add_theme_constant_override("separation", 6)
	diff_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_child(diff_bar)
	
	var diffs = ["简单", "中等", "困难", "专家"]
	diff_buttons = []
	for i in range(4):
		var db = Button.new()
		db.text = diffs[i]
		db.add_theme_font_size_override("font_size", 12)
		db.custom_minimum_size = Vector2(0, 30)
		db.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		db.pressed.connect(Callable(self, "set_difficulty").bind(i))
		diff_bar.add_child(db)
		diff_buttons.append(db)
	
	# 棋盘（居中卡片）
	var board_card = PanelContainer.new()
	var board_sb = StyleBoxFlat.new()
	board_sb.bg_color = COLOR_BOARD_GREEN
	board_sb.corner_radius_top_left = RADIUS
	board_sb.corner_radius_top_right = RADIUS
	board_sb.corner_radius_bottom_left = RADIUS
	board_sb.corner_radius_bottom_right = RADIUS
	board_sb.content_margin_top = 6
	board_sb.content_margin_bottom = 6
	board_sb.content_margin_left = 6
	board_sb.content_margin_right = 6
	board_card.add_theme_stylebox_override("panel", board_sb)
	board_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(board_card)
	
	board_grid = GridContainer.new()
	board_grid.columns = 8
	board_grid.add_theme_constant_override("h_separation", 2)
	board_grid.add_theme_constant_override("v_separation", 2)
	board_card.add_child(board_grid)
	
	# 底部操作栏
	var controls = HBoxContainer.new()
	controls.add_theme_constant_override("separation", 10)
	vbox.add_child(controls)
	
	var restart_btn = Button.new()
	restart_btn.text = "🔄 重新开始"
	restart_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	restart_btn.custom_minimum_size = Vector2(0, 44)
	restart_btn.add_theme_font_size_override("font_size", 15)
	_style_action_btn(restart_btn)
	restart_btn.pressed.connect(restart)
	controls.add_child(restart_btn)
	
	# 初始难度样式
	_update_diff_style()

func _style_action_btn(btn: Button):
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.2)
	sb.corner_radius_top_left = RADIUS_SM
	sb.corner_radius_top_right = RADIUS_SM
	sb.corner_radius_bottom_left = RADIUS_SM
	sb.corner_radius_bottom_right = RADIUS_SM
	btn.add_theme_stylebox_override("normal", sb)
	var hsb = sb.duplicate()
	hsb.bg_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.35)
	btn.add_theme_stylebox_override("hover", hsb)
	var psb = sb.duplicate()
	psb.bg_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.5)
	btn.add_theme_stylebox_override("pressed", psb)
	btn.add_theme_color_override("font_color", COLOR_ACCENT)

func _update_diff_style():
	var diffs = ["easy", "medium", "hard", "expert"]
	for i in range(4):
		if not diff_buttons[i]:
			continue
		var is_active = diffs[i] == difficulty
		var sb = StyleBoxFlat.new()
		sb.bg_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.25) if is_active else Color(1, 1, 1, 0.05)
		sb.corner_radius_top_left = 10
		sb.corner_radius_top_right = 10
		sb.corner_radius_bottom_left = 10
		sb.corner_radius_bottom_right = 10
		diff_buttons[i].add_theme_stylebox_override("normal", sb)
		diff_buttons[i].add_theme_color_override("font_color", Color(1, 1, 1, 0.95) if is_active else Color(1, 1, 1, 0.4))

func toggle_sound():
	sound_enabled = !sound_enabled

func init_game():
	board = []
	for r in range(8):
		var row = []
		for c in range(8):
			row.append({"value": 0, "is_last_move": false, "is_flipped": false, "is_valid_move": false})
		board.append(row)
	
	board[3][3].value = WHITE
	board[3][4].value = BLACK
	board[4][3].value = BLACK
	board[4][4].value = WHITE
	
	valid_moves = get_valid_moves(board, BLACK)
	for move in valid_moves:
		board[move.row][move.col].is_valid_move = true
	
	current_player = BLACK
	black_count = 2
	white_count = 2
	game_over = false
	winner = null
	ai_thinking = false
	last_move = null
	
	create_board_ui()
	update_ui()

func create_board_ui():
	if not board_grid:
		return
	
	for child in board_grid.get_children():
		child.queue_free()
	
	# 计算棋子大小 - 根据屏幕宽度自适应
	var screen_w = get_viewport().get_visible_rect().size.x
	var cell_size = int((screen_w - 32 - 12 - 2 * 7) / 8)  # margin + padding + gaps
	cell_size = clamp(cell_size, 28, 56)
	
	for r in range(8):
		for c in range(8):
			var cell = PanelContainer.new()
			cell.custom_minimum_size = Vector2(cell_size, cell_size)
			cell.set_meta("row", r)
			cell.set_meta("col", c)
			cell.mouse_filter = Control.MOUSE_FILTER_PASS
			
			var csb = StyleBoxFlat.new()
			csb.bg_color = COLOR_BOARD_DARK if (r + c) % 2 == 0 else COLOR_BOARD_GREEN
			csb.border_color = COLOR_CELL_BORDER
			csb.border_width_top = 1
			csb.border_width_bottom = 1
			csb.border_width_left = 1
			csb.border_width_right = 1
			cell.add_theme_stylebox_override("panel", csb)
			
			cell.gui_input.connect(_on_cell_gui_input.bind(r, c))
			board_grid.add_child(cell)

func _on_cell_gui_input(event: InputEvent, row: int, col: int):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		on_cell_tap(row, col)
	elif event is InputEventScreenTouch and event.pressed:
		on_cell_tap(row, col)

func update_cell_appearance(cell, row, col):
	var cell_data = board[row][col]
	var value = cell_data.value
	
	for child in cell.get_children():
		child.queue_free()
	
	var pw = cell.custom_minimum_size.x * 0.78
	
	if value == BLACK:
		var piece = PanelContainer.new()
		piece.custom_minimum_size = Vector2(pw, pw)
		piece.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		piece.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var psb = StyleBoxFlat.new()
		psb.bg_color = COLOR_BLACK_PIECE
		psb.corner_radius_top_left = int(pw / 2)
		psb.corner_radius_top_right = int(pw / 2)
		psb.corner_radius_bottom_left = int(pw / 2)
		psb.corner_radius_bottom_right = int(pw / 2)
		# 棋子光泽
		psb.border_color = Color(0.3, 0.3, 0.3, 0.5)
		psb.border_width_top = 1
		psb.border_width_bottom = 2
		psb.border_width_left = 1
		psb.border_width_right = 2
		piece.add_theme_stylebox_override("panel", psb)
		cell.add_child(piece)
		
		if cell_data.is_last_move:
			var ring = PanelContainer.new()
			var rw = cell.custom_minimum_size.x * 0.88
			ring.custom_minimum_size = Vector2(rw, rw)
			ring.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			ring.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			var rsb = StyleBoxFlat.new()
			rsb.bg_color = Color(0, 0, 0, 0)
			rsb.border_color = COLOR_LAST_MOVE
			rsb.border_width_top = 2
			rsb.border_width_bottom = 2
			rsb.border_width_left = 2
			rsb.border_width_right = 2
			rsb.corner_radius_top_left = int(rw / 2)
			rsb.corner_radius_top_right = int(rw / 2)
			rsb.corner_radius_bottom_left = int(rw / 2)
			rsb.corner_radius_bottom_right = int(rw / 2)
			ring.add_theme_stylebox_override("panel", rsb)
			cell.add_child(ring)
			cell.move_child(ring, 0)
	
	elif value == WHITE:
		var piece = PanelContainer.new()
		piece.custom_minimum_size = Vector2(pw, pw)
		piece.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		piece.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var psb = StyleBoxFlat.new()
		psb.bg_color = COLOR_WHITE_PIECE
		psb.corner_radius_top_left = int(pw / 2)
		psb.corner_radius_top_right = int(pw / 2)
		psb.corner_radius_bottom_left = int(pw / 2)
		psb.corner_radius_bottom_right = int(pw / 2)
		psb.border_color = Color(0.8, 0.8, 0.8, 0.8)
		psb.border_width_top = 1
		psb.border_width_bottom = 1
		psb.border_width_left = 1
		psb.border_width_right = 1
		piece.add_theme_stylebox_override("panel", psb)
		cell.add_child(piece)
		
		if cell_data.is_last_move:
			var ring = PanelContainer.new()
			var rw = cell.custom_minimum_size.x * 0.88
			ring.custom_minimum_size = Vector2(rw, rw)
			ring.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			ring.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			var rsb = StyleBoxFlat.new()
			rsb.bg_color = Color(0, 0, 0, 0)
			rsb.border_color = COLOR_LAST_MOVE
			rsb.border_width_top = 2
			rsb.border_width_bottom = 2
			rsb.border_width_left = 2
			rsb.border_width_right = 2
			rsb.corner_radius_top_left = int(rw / 2)
			rsb.corner_radius_top_right = int(rw / 2)
			rsb.corner_radius_bottom_left = int(rw / 2)
			rsb.corner_radius_bottom_right = int(rw / 2)
			ring.add_theme_stylebox_override("panel", rsb)
			cell.add_child(ring)
			cell.move_child(ring, 0)
	
	elif cell_data.is_valid_move:
		var hint = PanelContainer.new()
		var hw = cell.custom_minimum_size.x * 0.25
		hint.custom_minimum_size = Vector2(hw, hw)
		hint.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		hint.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var hsb = StyleBoxFlat.new()
		hsb.bg_color = COLOR_VALID_HINT
		hsb.corner_radius_top_left = int(hw / 2)
		hsb.corner_radius_top_right = int(hw / 2)
		hsb.corner_radius_bottom_left = int(hw / 2)
		hsb.corner_radius_bottom_right = int(hw / 2)
		hint.add_theme_stylebox_override("panel", hsb)
		cell.add_child(hint)

func update_ui():
	if black_score_label:
		black_score_label.text = str(black_count)
	if white_score_label:
		white_score_label.text = str(white_count)
	if turn_icon:
		turn_icon.color = COLOR_BLACK_PIECE if current_player == BLACK else COLOR_WHITE_PIECE
	if turn_label:
		turn_label.text = "黑棋回合" if current_player == BLACK else "白棋回合"
		if ai_thinking:
			turn_label.text += " 思考中..."
	if status_label:
		if game_over:
			if winner == BLACK:
				status_label.text = "🎉 黑棋获胜！"
			elif winner == WHITE:
				status_label.text = "💻 白棋获胜！"
			else:
				status_label.text = "🤝 平局！"
		else:
			status_label.text = ""

func set_difficulty(index):
	var diffs = ["easy", "medium", "hard", "expert"]
	difficulty = diffs[index]
	_update_diff_style()
	init_game()

# === 游戏逻辑（不变） ===

func get_valid_moves(board_data, player):
	var moves = []
	for r in range(8):
		for c in range(8):
			if board_data[r][c].value == 0 and can_flip(board_data, r, c, player):
				moves.append({"row": r, "col": c})
	return moves

func can_flip(board_data, row, col, player):
	var opponent = WHITE if player == BLACK else BLACK
	for dir in DIRECTIONS:
		var r = row + dir[0]
		var c = col + dir[1]
		var found_opponent = false
		while r >= 0 and r < 8 and c >= 0 and c < 8:
			if board_data[r][c].value == opponent:
				found_opponent = true
			elif board_data[r][c].value == player:
				if found_opponent: return true
				break
			else:
				break
			r += dir[0]
			c += dir[1]
	return false

func get_cells_to_flip(board_data, row, col, player):
	var opponent = WHITE if player == BLACK else BLACK
	var cells_to_flip = []
	for dir in DIRECTIONS:
		var r = row + dir[0]
		var c = col + dir[1]
		var line = []
		while r >= 0 and r < 8 and c >= 0 and c < 8:
			if board_data[r][c].value == opponent:
				line.append({"row": r, "col": c})
			elif board_data[r][c].value == player:
				cells_to_flip += line
				break
			else:
				break
			r += dir[0]
			c += dir[1]
	return cells_to_flip

func make_move(board_data, row, col, player):
	var new_board = []
	for r in range(8):
		var row_data = []
		for c in range(8):
			row_data.append({
				"value": board_data[r][c].value,
				"is_last_move": board_data[r][c].is_last_move,
				"is_flipped": board_data[r][c].is_flipped,
				"is_valid_move": board_data[r][c].is_valid_move
			})
		new_board.append(row_data)
	var cells_to_flip = get_cells_to_flip(board_data, row, col, player)
	new_board[row][col].value = player
	for cell in cells_to_flip:
		new_board[cell.row][cell.col].value = player
	return {"new_board": new_board, "cells_to_flip": cells_to_flip}

func count_pieces(board_data):
	var black = 0
	var white = 0
	for r in range(8):
		for c in range(8):
			if board_data[r][c].value == BLACK: black += 1
			elif board_data[r][c].value == WHITE: white += 1
	return {"black": black, "white": white}

func is_game_over(board_data):
	return get_valid_moves(board_data, BLACK).size() == 0 and get_valid_moves(board_data, WHITE).size() == 0

func on_cell_tap(row, col):
	if game_over or ai_thinking or current_player != BLACK:
		return
	var is_valid = false
	for move in valid_moves:
		if move.row == row and move.col == col:
			is_valid = true
			break
	if not is_valid:
		return
	execute_move(row, col, BLACK)

func execute_move(row, col, player):
	var result = make_move(board, row, col, player)
	var new_board = result.new_board
	var cells_to_flip = result.cells_to_flip
	var counts = count_pieces(new_board)
	
	for r in range(8):
		for c in range(8):
			new_board[r][c].is_last_move = false
			new_board[r][c].is_flipped = false
	
	new_board[row][col].is_last_move = true
	for cell in cells_to_flip:
		new_board[cell.row][cell.col].is_flipped = true
	
	board = new_board
	black_count = counts.black
	white_count = counts.white
	last_move = {"row": row, "col": col}
	
	update_board_ui()
	update_ui()
	get_tree().create_timer(0.3).timeout.connect(func(): switch_turn(board))

func update_board_ui():
	if not board_grid: return
	var children = board_grid.get_children()
	var index = 0
	for r in range(8):
		for c in range(8):
			if index < children.size():
				update_cell_appearance(children[index], r, c)
			index += 1

func switch_turn(board_data):
	var next_player = WHITE if current_player == BLACK else BLACK
	var next_moves = get_valid_moves(board_data, next_player)
	
	for r in range(8):
		for c in range(8):
			board_data[r][c].is_flipped = false
			board_data[r][c].is_valid_move = false
	
	for move in next_moves:
		board_data[move.row][move.col].is_valid_move = true
	
	if is_game_over(board_data):
		end_game(board_data)
		return
	
	if next_moves.size() == 0:
		board = board_data
		update_board_ui()
		var current_moves = get_valid_moves(board_data, current_player)
		for move in current_moves:
			board_data[move.row][move.col].is_valid_move = true
		valid_moves = current_moves
		board = board_data
		if current_player == WHITE:
			ai_move(board_data)
		return
	
	current_player = next_player
	valid_moves = next_moves
	board = board_data
	update_board_ui()
	update_ui()
	
	if current_player == WHITE:
		ai_move(board_data)

func ai_move(board_data):
	ai_thinking = true
	update_ui()
	var depth_map = {"easy": 1, "medium": 3, "hard": 5, "expert": 6}
	var depth = depth_map.get(difficulty, 3)
	get_tree().create_timer(0.1).timeout.connect(func():
		var move = get_ai_move(board_data, depth)
		ai_thinking = false
		if move:
			execute_move(move.row, move.col, WHITE)
		else:
			switch_turn(board_data)
	)

func get_ai_move(board_data, depth):
	var moves = get_valid_moves(board_data, WHITE)
	if moves.size() == 0: return null
	if depth == 1:
		var best_move = moves[0]
		var max_flip = 0
		for move in moves:
			var flips = get_cells_to_flip(board_data, move.row, move.col, WHITE).size()
			if flips > max_flip:
				max_flip = flips
				best_move = move
		return best_move
	var best_move = null
	var best_score = -99999
	for move in moves:
		var result = make_move(board_data, move.row, move.col, WHITE)
		var score = minimax(result.new_board, depth - 1, -99999, 99999, false)
		if score > best_score:
			best_score = score
			best_move = move
	return best_move

func minimax(board_data, depth, alpha, beta, is_maximizing):
	if depth == 0 or is_game_over(board_data):
		return evaluate_board(board_data)
	var player = WHITE if is_maximizing else BLACK
	var moves = get_valid_moves(board_data, player)
	if moves.size() == 0:
		return minimax(board_data, depth - 1, alpha, beta, not is_maximizing)
	if is_maximizing:
		var max_score = -99999
		for move in moves:
			var result = make_move(board_data, move.row, move.col, WHITE)
			var score = minimax(result.new_board, depth - 1, alpha, beta, false)
			max_score = max(max_score, score)
			alpha = max(alpha, score)
			if beta <= alpha: break
		return max_score
	else:
		var min_score = 99999
		for move in moves:
			var result = make_move(board_data, move.row, move.col, BLACK)
			var score = minimax(result.new_board, depth - 1, alpha, beta, true)
			min_score = min(min_score, score)
			beta = min(beta, score)
			if beta <= alpha: break
		return min_score

func evaluate_board(board_data):
	var score = 0
	for r in range(8):
		for c in range(8):
			if board_data[r][c].value == WHITE:
				score += POSITION_WEIGHT[r][c]
			elif board_data[r][c].value == BLACK:
				score -= POSITION_WEIGHT[r][c]
	if is_game_over(board_data):
		var counts = count_pieces(board_data)
		score += (counts.white - counts.black) * 100
	return score

func end_game(board_data):
	game_over = true
	var counts = count_pieces(board_data)
	if counts.black > counts.white: winner = BLACK
	elif counts.white > counts.black: winner = WHITE
	else: winner = null
	update_ui()

func restart():
	init_game()
