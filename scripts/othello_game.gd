extends Control

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

# Colors matching freetools design
const COLOR_BG = Color(0.102, 0.102, 0.18)
const COLOR_BOARD_GREEN = Color(0.176, 0.353, 0.153)  # #2d5a27
const COLOR_BOARD_LINE = Color(0.15, 0.30, 0.13)
const COLOR_BLACK_PIECE = Color(0.1, 0.1, 0.1)
const COLOR_WHITE_PIECE = Color(1.0, 1.0, 1.0)
const COLOR_VALID_HINT = Color(1, 1, 1, 0.4)
const COLOR_LAST_MOVE = Color(1, 0.843, 0)  # gold #ffd700
const COLOR_SCORE_BG = Color(1, 1, 1, 0.1)
const COLOR_DIFF_ACTIVE = Color(0.4, 0.494, 0.918)  # #667eea
const COLOR_DIFF_INACTIVE = Color(1, 1, 1, 0.1)
const COLOR_TEXT = Color(1, 1, 1)
const COLOR_TEXT_DIM = Color(0.7, 0.7, 0.7)

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

var board_node = null
var black_count_label = null
var white_count_label = null
var status_label = null
var turn_piece = null
var turn_text = null
var btn_restart = null
var btn_sound = null
var back_button = null
var diff_buttons = []

func _ready():
	board_node = get_node_or_null("VBox/BoardCenter/BoardBg/Board")
	black_count_label = get_node_or_null("VBox/ScoreBoard/BlackScore/HBox/BlackCount")
	white_count_label = get_node_or_null("VBox/ScoreBoard/WhiteScore/HBox/WhiteCount")
	status_label = get_node_or_null("VBox/StatusLabel")
	turn_piece = get_node_or_null("VBox/TurnIndicator/TurnPiece")
	turn_text = get_node_or_null("VBox/TurnIndicator/TurnText")
	btn_restart = get_node_or_null("VBox/Controls/BtnRestart")
	btn_sound = get_node_or_null("VBox/Controls/BtnSound")
	back_button = get_node_or_null("VBox/BackButton")
	
	diff_buttons = [
		get_node_or_null("VBox/DifficultyBar/DiffEasy"),
		get_node_or_null("VBox/DifficultyBar/DiffMedium"),
		get_node_or_null("VBox/DifficultyBar/DiffHard"),
		get_node_or_null("VBox/DifficultyBar/DiffExpert")
	]
	
	if btn_restart:
		btn_restart.pressed.connect(restart)
	if btn_sound:
		btn_sound.pressed.connect(toggle_sound)
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
	
	for i in range(4):
		if diff_buttons[i]:
			diff_buttons[i].pressed.connect(Callable(self, "set_difficulty").bind(i))
	
	# Style score panels with semi-transparent bg
	var score_panels = [
		get_node_or_null("VBox/ScoreBoard/BlackScore"),
		get_node_or_null("VBox/ScoreBoard/WhiteScore")
	]
	for panel in score_panels:
		if panel:
			var sb = StyleBoxFlat.new()
			sb.bg_color = COLOR_SCORE_BG
			sb.corner_radius_top_left = 16
			sb.corner_radius_top_right = 16
			sb.corner_radius_bottom_left = 16
			sb.corner_radius_bottom_right = 16
			sb.content_margin_top = 6
			sb.content_margin_bottom = 6
			sb.content_margin_left = 12
			sb.content_margin_right = 12
			panel.add_theme_stylebox_override("panel", sb)
	
	# Style board bg
	var board_bg = get_node_or_null("VBox/BoardCenter/BoardBg")
	if board_bg:
		var sb = StyleBoxFlat.new()
		sb.bg_color = COLOR_BOARD_GREEN
		sb.corner_radius_top_left = 10
		sb.corner_radius_top_right = 10
		sb.corner_radius_bottom_left = 10
		sb.corner_radius_bottom_right = 10
		sb.content_margin_top = 4
		sb.content_margin_bottom = 4
		sb.content_margin_left = 4
		sb.content_margin_right = 4
		board_bg.add_theme_stylebox_override("panel", sb)
	
	# Style difficulty buttons
	_update_diff_style()
	
	init_game()

func _update_diff_style():
	var diffs = ["easy", "medium", "hard", "expert"]
	for i in range(4):
		if not diff_buttons[i]:
			continue
		var sb = StyleBoxFlat.new()
		if diffs[i] == difficulty:
			sb.bg_color = COLOR_DIFF_ACTIVE
		else:
			sb.bg_color = COLOR_DIFF_INACTIVE
		sb.corner_radius_top_left = 14
		sb.corner_radius_top_right = 14
		sb.corner_radius_bottom_left = 14
		sb.corner_radius_bottom_right = 14
		sb.content_margin_top = 4
		sb.content_margin_bottom = 4
		sb.content_margin_left = 10
		sb.content_margin_right = 10
		diff_buttons[i].add_theme_stylebox_override("normal", sb)
		# Hover
		var hsb = sb.duplicate()
		hsb.bg_color = Color(sb.bg_color.r + 0.1, sb.bg_color.g + 0.1, sb.bg_color.b + 0.1, sb.bg_color.a)
		diff_buttons[i].add_theme_stylebox_override("hover", hsb)
		# Font color
		if diffs[i] == difficulty:
			diff_buttons[i].add_theme_color_override("font_color", Color(1, 1, 1))
		else:
			diff_buttons[i].add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))

func _on_back_pressed():
	get_tree().change_scene_to_file("res://scenes/control.tscn")

func toggle_sound():
	sound_enabled = !sound_enabled
	if btn_sound:
		btn_sound.text = "🔊" if sound_enabled else "🔇"

func init_game():
	board = []
	for r in range(8):
		var row = []
		for c in range(8):
			row.append({
				"value": 0,
				"is_last_move": false,
				"is_flipped": false,
				"is_valid_move": false
			})
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
	if not board_node:
		return
	
	for child in board_node.get_children():
		child.queue_free()
	
	# Calculate cell size based on board width
	var cell_size = 38
	var available = board_node.custom_minimum_size.x
	if available > 0:
		cell_size = int((available - 2 * 7) / 8)  # minus gaps
		cell_size = maxi(cell_size, 30)
		cell_size = mini(cell_size, 50)
	
	for r in range(8):
		for c in range(8):
			var cell = PanelContainer.new()
			cell.custom_minimum_size = Vector2(cell_size, cell_size)
			cell.set_meta("row", r)
			cell.set_meta("col", c)
			cell.mouse_filter = Control.MOUSE_FILTER_PASS
			
			# Green cell background
			var cell_sb = StyleBoxFlat.new()
			cell_sb.bg_color = COLOR_BOARD_GREEN
			cell_sb.border_color = COLOR_BOARD_LINE
			cell_sb.border_width_top = 1
			cell_sb.border_width_bottom = 1
			cell_sb.border_width_left = 1
			cell_sb.border_width_right = 1
			cell.add_theme_stylebox_override("panel", cell_sb)
			
			# Click detection via gui_input
			cell.gui_input.connect(_on_cell_gui_input.bind(r, c))
			
			board_node.add_child(cell)

func _on_cell_gui_input(event: InputEvent, row: int, col: int):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		on_cell_tap(row, col)
	elif event is InputEventScreenTouch and event.pressed:
		on_cell_tap(row, col)

func update_cell_appearance(cell, row, col):
	var cell_data = board[row][col]
	var value = cell_data.value
	
	# Reset cell - remove old piece/hint children
	for child in cell.get_children():
		child.queue_free()
	
	if value == BLACK:
		var piece = ColorRect.new()
		piece.color = COLOR_BLACK_PIECE
		piece.anchors_preset = Control.PRESET_CENTER
		# Make piece 80% of cell size, centered
		var pw = cell.custom_minimum_size.x * 0.8
		piece.custom_minimum_size = Vector2(pw, pw)
		piece.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		piece.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		cell.add_child(piece)
		
		if cell_data.is_last_move:
			var ring = ColorRect.new()
			ring.color = COLOR_LAST_MOVE
			var rw = cell.custom_minimum_size.x * 0.85
			ring.custom_minimum_size = Vector2(rw, rw)
			ring.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			ring.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			cell.add_child(ring)
			# Move ring behind piece
			cell.move_child(ring, 0)
	
	elif value == WHITE:
		var piece = ColorRect.new()
		piece.color = COLOR_WHITE_PIECE
		var pw = cell.custom_minimum_size.x * 0.8
		piece.custom_minimum_size = Vector2(pw, pw)
		piece.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		piece.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		cell.add_child(piece)
		
		if cell_data.is_last_move:
			var ring = ColorRect.new()
			ring.color = COLOR_LAST_MOVE
			var rw = cell.custom_minimum_size.x * 0.85
			ring.custom_minimum_size = Vector2(rw, rw)
			ring.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			ring.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			cell.add_child(ring)
			cell.move_child(ring, 0)
	
	elif cell_data.is_valid_move:
		# Small dot hint
		var hint = ColorRect.new()
		hint.color = COLOR_VALID_HINT
		var hw = cell.custom_minimum_size.x * 0.3
		hint.custom_minimum_size = Vector2(hw, hw)
		hint.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		hint.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		cell.add_child(hint)

func update_ui():
	if black_count_label:
		black_count_label.text = str(black_count)
	if white_count_label:
		white_count_label.text = str(white_count)
	
	if turn_piece:
		turn_piece.color = COLOR_BLACK_PIECE if current_player == BLACK else COLOR_WHITE_PIECE
	
	if turn_text:
		turn_text.text = "黑棋回合" if current_player == BLACK else "白棋回合"
		if ai_thinking:
			turn_text.text += " (思考中...)"
	
	if status_label:
		if game_over:
			if winner == BLACK:
				status_label.text = "🎉 黑棋获胜！"
			elif winner == WHITE:
				status_label.text = "💻 白棋获胜！"
			else:
				status_label.text = "🤝 平局！"
		else:
			status_label.text = "黑棋先行" if current_player == BLACK else "白棋思考中..."

func set_difficulty(index):
	var diffs = ["easy", "medium", "hard", "expert"]
	difficulty = diffs[index]
	_update_diff_style()
	init_game()

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
				if found_opponent:
					return true
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
			if board_data[r][c].value == BLACK:
				black += 1
			elif board_data[r][c].value == WHITE:
				white += 1
	return {"black": black, "white": white}

func is_game_over(board_data):
	var black_moves = get_valid_moves(board_data, BLACK)
	var white_moves = get_valid_moves(board_data, WHITE)
	return black_moves.size() == 0 and white_moves.size() == 0

func on_cell_tap(row, col):
	if game_over or ai_thinking:
		return
	if current_player != BLACK:
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
	
	get_tree().create_timer(0.3).timeout.connect(func():
		switch_turn(board)
	)

func update_board_ui():
	if not board_node:
		return
	
	var children = board_node.get_children()
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
		var skip_player = "黑棋" if next_player == BLACK else "白棋"
		if status_label:
			status_label.text = skip_player + "无法落子，跳过"
		
		board = board_data
		update_board_ui()
		
		var current_moves = get_valid_moves(board_data, current_player)
		for move in current_moves:
			board_data[move.row][move.col].is_valid_move = true
		
		valid_moves = current_moves
		board = board_data
		
		if status_label:
			status_label.text = "黑棋继续" if current_player == BLACK else "白棋思考中..."
		
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
	if moves.size() == 0:
		return null
	
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
			if beta <= alpha:
				break
		return max_score
	else:
		var min_score = 99999
		for move in moves:
			var result = make_move(board_data, move.row, move.col, BLACK)
			var score = minimax(result.new_board, depth - 1, alpha, beta, true)
			min_score = min(min_score, score)
			beta = min(beta, score)
			if beta <= alpha:
				break
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
	
	if counts.black > counts.white:
		winner = BLACK
	elif counts.white > counts.black:
		winner = WHITE
	else:
		winner = null
	
	update_ui()

func restart():
	init_game()
