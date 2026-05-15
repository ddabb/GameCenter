extends Control

# === 躲避牛蛙 (Frog Escape) - 扫雷换皮，绿野沼泽主题 ===

# === 设计系统 - 绿野主题 ===
const COLOR_BG_TOP = Color(0.91, 0.973, 0.941)   # #e8f8f0
const COLOR_BG_BOT = Color(0.816, 0.941, 0.894)   # #d0f0e4
const COLOR_BOARD_BG = Color(0.722, 0.902, 0.831)  # #b8e6d4
const COLOR_CELL_HIDDEN = Color(0.784, 0.91, 0.847) # #c8e8d8
const COLOR_CELL_REVEALED = Color(0.91, 0.973, 0.941)
const COLOR_CELL_FLAGGED = Color(0.996, 0.976, 0.906) # #fef9e7
const COLOR_CELL_FROG_REVEAL = Color(0.992, 0.91, 0.91)
const COLOR_CELL_BORDER = Color(0.659, 0.847, 0.784)
const COLOR_ACCENT = Color(0.153, 0.682, 0.376)    # #27ae60
const COLOR_TEXT = Color(0.102, 0.361, 0.22)        # #1a5c38
const COLOR_TEXT_DIM = Color(0.533, 0.533, 0.533)
const COLOR_NUM = Color(0.173, 0.373, 0.18)         # #2c5f2e
const COLOR_CARD = Color(1, 1, 1, 0.95)
const COLOR_FLAG_ACTIVE = Color(0.953, 0.612, 0.071) # #f39c12
const RADIUS = 16
const RADIUS_SM = 12
const RADIUS_XS = 8

# 数字颜色（1-8）
const NUM_COLORS = [
	Color(0, 0, 0, 0),           # 0 unused
	Color(0.227, 0.533, 0.851),  # 1 blue
	Color(0.298, 0.6, 0.227),    # 2 green
	Color(0.859, 0.227, 0.227),  # 3 red
	Color(0.133, 0.133, 0.533),  # 4 dark blue
	Color(0.533, 0.133, 0.133),  # 5 dark red
	Color(0.133, 0.533, 0.533),  # 6 teal
	Color(0.333, 0.333, 0.333),  # 7 gray
	Color(0.533, 0.533, 0.533),  # 8 light gray
]

# === 游戏状态 ===
var board_data = []     # 底层数据 [{is_frog, nearby}]
var board_ui = []       # UI显示状态 [{revealed, flagged}]
var rows = 9
var cols = 9
var total_frogs = 10
var revealed_count = 0
var flagged_count = 0
var flag_mode = false
var game_over = false
var won = false
var first_click = true
var time_elapsed = 0
var timer_running = false
var difficulty = "easy"
var best_times = {}
var cell_size = 36

# === UI引用 ===
var board_grid: GridContainer = null
var frog_count_label: Label = null
var time_label: Label = null
var diff_label: Label = null
var flag_btn: Button = null
var result_overlay: Control = null
var result_icon: Label = null
var result_title: Label = null
var result_sub: Label = null

const DIFFICULTIES = {
	"easy": {"rows": 9, "cols": 9, "frogs": 10, "label": "简单 9×9 · 10只"},
	"medium": {"rows": 16, "cols": 16, "frogs": 40, "label": "中等 16×16 · 40只"},
}

func _ready():
	_load_records()
	_build_ui()
	start_game("easy")

# === UI构建 ===
func _build_ui():
	# 渐变背景
	var bg = ColorRect.new()
	bg.color = COLOR_BG_TOP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	
	var margin = MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 16)
	add_child(margin)
	
	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
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
	header.text = "🐸 躲避牛蛙"
	header.add_theme_font_size_override("font_size", 18)
	header.add_theme_color_override("font_color", COLOR_TEXT)
	navbar.add_child(header)
	
	var nsp2 = Control.new()
	nsp2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	navbar.add_child(nsp2)
	
	# 占位对齐
	var ph = Control.new()
	ph.custom_minimum_size = Vector2(50, 0)
	navbar.add_child(ph)
	
	# 状态栏
	var status_bar = HBoxContainer.new()
	status_bar.add_theme_constant_override("separation", 8)
	vbox.add_child(status_bar)
	
	# 🐸 剩余数
	var frog_card = PanelContainer.new()
	var fsb = StyleBoxFlat.new()
	fsb.bg_color = COLOR_CARD
	fsb.corner_radius_top_left = 20
	fsb.corner_radius_top_right = 20
	fsb.corner_radius_bottom_left = 20
	fsb.corner_radius_bottom_right = 20
	fsb.content_margin_top = 6
	fsb.content_margin_bottom = 6
	fsb.content_margin_left = 14
	fsb.content_margin_right = 14
	fsb.shadow_color = Color(0, 0, 0, 0.08)
	fsb.shadow_size = 4
	frog_card.add_theme_stylebox_override("panel", fsb)
	status_bar.add_child(frog_card)
	
	var frog_hbox = HBoxContainer.new()
	frog_hbox.add_theme_constant_override("separation", 4)
	frog_card.add_child(frog_hbox)
	
	var frog_icon = Label.new()
	frog_icon.text = "🐸"
	frog_icon.add_theme_font_size_override("font_size", 18)
	frog_hbox.add_child(frog_icon)
	
	frog_count_label = Label.new()
	frog_count_label.text = "10"
	frog_count_label.add_theme_font_size_override("font_size", 16)
	frog_count_label.add_theme_color_override("font_color", COLOR_TEXT)
	frog_hbox.add_child(frog_count_label)
	
	# 中间难度按钮
	var status_spacer = Control.new()
	status_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status_bar.add_child(status_spacer)
	
	var diff_btn = Button.new()
	diff_label = Label.new()
	diff_label.text = "简单 9×9 · 10只"
	diff_label.add_theme_font_size_override("font_size", 13)
	diff_label.add_theme_color_override("font_color", Color(1, 1, 1))
	# 用按钮包裹
	var diff_card = PanelContainer.new()
	var dsb = StyleBoxFlat.new()
	dsb.bg_color = COLOR_ACCENT
	dsb.corner_radius_top_left = 20
	dsb.corner_radius_top_right = 20
	dsb.corner_radius_bottom_left = 20
	dsb.corner_radius_bottom_right = 20
	dsb.content_margin_top = 6
	dsb.content_margin_bottom = 6
	dsb.content_margin_left = 16
	dsb.content_margin_right = 16
	dsb.shadow_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.3)
	dsb.shadow_size = 4
	diff_card.add_theme_stylebox_override("panel", dsb)
	diff_card.mouse_filter = Control.MOUSE_FILTER_STOP
	diff_card.gui_input.connect(_on_diff_input)
	status_bar.add_child(diff_card)
	
	diff_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	diff_card.add_child(diff_label)
	
	# ⏱ 计时
	var status_spacer2 = Control.new()
	status_spacer2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status_bar.add_child(status_spacer2)
	
	var time_card = PanelContainer.new()
	var tsb = StyleBoxFlat.new()
	tsb.bg_color = COLOR_CARD
	tsb.corner_radius_top_left = 20
	tsb.corner_radius_top_right = 20
	tsb.corner_radius_bottom_left = 20
	tsb.corner_radius_bottom_right = 20
	tsb.content_margin_top = 6
	tsb.content_margin_bottom = 6
	tsb.content_margin_left = 14
	tsb.content_margin_right = 14
	tsb.shadow_color = Color(0, 0, 0, 0.08)
	tsb.shadow_size = 4
	time_card.add_theme_stylebox_override("panel", tsb)
	status_bar.add_child(time_card)
	
	var time_hbox = HBoxContainer.new()
	time_hbox.add_theme_constant_override("separation", 4)
	time_card.add_child(time_hbox)
	
	var time_icon = Label.new()
	time_icon.text = "⏱"
	time_icon.add_theme_font_size_override("font_size", 16)
	time_hbox.add_child(time_icon)
	
	time_label = Label.new()
	time_label.text = "0:00"
	time_label.add_theme_font_size_override("font_size", 16)
	time_label.add_theme_color_override("font_color", COLOR_TEXT)
	time_hbox.add_child(time_label)
	
	# 工具栏
	var tool_bar = HBoxContainer.new()
	tool_bar.add_theme_constant_override("separation", 8)
	vbox.add_child(tool_bar)
	
	# 标记按钮
	flag_btn = Button.new()
	flag_btn.text = "🚩 标记牛蛙"
	flag_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flag_btn.add_theme_font_size_override("font_size", 14)
	flag_btn.custom_minimum_size = Vector2(0, 36)
	_style_tool_btn(flag_btn, false)
	flag_btn.pressed.connect(_toggle_flag_mode)
	tool_bar.add_child(flag_btn)
	
	# 重新开始
	var restart_btn = Button.new()
	restart_btn.text = "🔄 重来"
	restart_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	restart_btn.add_theme_font_size_override("font_size", 14)
	restart_btn.custom_minimum_size = Vector2(0, 36)
	_style_tool_btn(restart_btn, false)
	restart_btn.pressed.connect(func(): start_game(difficulty))
	tool_bar.add_child(restart_btn)
	
	# 帮助
	var help_btn = Button.new()
	help_btn.text = "❓ 帮助"
	help_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	help_btn.add_theme_font_size_override("font_size", 14)
	help_btn.custom_minimum_size = Vector2(0, 36)
	_style_tool_btn(help_btn, false)
	help_btn.pressed.connect(_show_help)
	tool_bar.add_child(help_btn)
	
	# 棋盘区域
	var board_wrapper = PanelContainer.new()
	var bwsb = StyleBoxFlat.new()
	bwsb.bg_color = COLOR_BOARD_BG
	bwsb.corner_radius_top_left = RADIUS
	bwsb.corner_radius_top_right = RADIUS
	bwsb.corner_radius_bottom_left = RADIUS
	bwsb.corner_radius_bottom_right = RADIUS
	bwsb.content_margin_top = 8
	bwsb.content_margin_bottom = 8
	bwsb.content_margin_left = 8
	bwsb.content_margin_right = 8
	bwsb.shadow_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.2)
	bwsb.shadow_size = 8
	board_wrapper.add_theme_stylebox_override("panel", bwsb)
	board_wrapper.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(board_wrapper)
	
	board_grid = GridContainer.new()
	board_grid.columns = cols
	board_grid.add_theme_constant_override("h_separation", 1)
	board_grid.add_theme_constant_override("v_separation", 1)
	board_wrapper.add_child(board_grid)
	
	# 最佳时间
	var best_label = Label.new()
	best_label.text = ""
	best_label.add_theme_font_size_override("font_size", 13)
	best_label.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	best_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(best_label)
	best_label.name = "BestTimeLabel"

func _style_tool_btn(btn: Button, active: bool):
	var sb = StyleBoxFlat.new()
	sb.bg_color = COLOR_FLAG_ACTIVE if active else Color(1, 1, 1, 1)
	sb.border_color = Color(0.722, 0.902, 0.824)
	sb.border_width_top = 2
	sb.border_width_bottom = 2
	sb.border_width_left = 2
	sb.border_width_right = 2
	sb.corner_radius_top_left = 10
	sb.corner_radius_top_right = 10
	sb.corner_radius_bottom_left = 10
	sb.corner_radius_bottom_right = 10
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.shadow_color = Color(0, 0, 0, 0.06)
	sb.shadow_size = 3
	btn.add_theme_stylebox_override("normal", sb)
	btn.add_theme_color_override("font_color", Color(1, 1, 1) if active else COLOR_TEXT)

func _on_diff_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		_cycle_difficulty()
	elif event is InputEventScreenTouch and event.pressed:
		_cycle_difficulty()

func _cycle_difficulty():
	var keys = DIFFICULTIES.keys()
	var idx = keys.find(difficulty)
	idx = (idx + 1) % keys.size()
	start_game(keys[idx])

# === 游戏逻辑 ===

func start_game(diff: String):
	difficulty = diff
	var diff_info = DIFFICULTIES[diff]
	rows = diff_info.rows
	cols = diff_info.cols
	total_frogs = diff_info.frogs
	
	revealed_count = 0
	flagged_count = 0
	flag_mode = false
	game_over = false
	won = false
	first_click = true
	time_elapsed = 0
	timer_running = false
	
	# 计算格子大小
	var screen_w = get_viewport().get_visible_rect().size.x
	cell_size = int((screen_w - 32 - 16 - 2 * (cols - 1)) / cols)
	cell_size = clamp(cell_size, 20, 48)
	
	board_grid.columns = cols
	diff_label.text = diff_info.label
	frog_count_label.text = str(total_frogs)
	time_label.text = "0:00"
	
	_remove_result_overlay()
	
	_generate_board()
	_create_board_cells()
	_update_flag_btn_style()

func _generate_board():
	board_data = []
	for r in range(rows):
		var row = []
		for c in range(cols):
			row.append({"is_frog": false, "nearby": 0})
		board_data.append(row)
	
	# 随机放蛙
	var placed = 0
	while placed < total_frogs:
		var r = randi() % rows
		var c = randi() % cols
		if not board_data[r][c].is_frog:
			board_data[r][c].is_frog = true
			placed += 1
	
	# 计算提示数字
	for r in range(rows):
		for c in range(cols):
			if not board_data[r][c].is_frog:
				var count = 0
				for dr in range(-1, 2):
					for dc in range(-1, 2):
						if dr == 0 and dc == 0: continue
						var nr = r + dr
						var nc = c + dc
						if nr >= 0 and nr < rows and nc >= 0 and nc < cols and board_data[nr][nc].is_frog:
							count += 1
				board_data[r][c].nearby = count
	
	# UI状态初始化
	board_ui = []
	for r in range(rows):
		var row = []
		for c in range(cols):
			row.append({"revealed": false, "flagged": false})
		board_ui.append(row)

func _create_board_cells():
	for child in board_grid.get_children():
		child.queue_free()
	
	for r in range(rows):
		for c in range(cols):
			var cell = PanelContainer.new()
			cell.custom_minimum_size = Vector2(cell_size, cell_size)
			cell.set_meta("row", r)
			cell.set_meta("col", c)
			cell.mouse_filter = Control.MOUSE_FILTER_STOP
			cell.gui_input.connect(_on_cell_input.bind(r, c))
			_update_cell_style(cell, r, c)
			board_grid.add_child(cell)

func _on_cell_input(event: InputEvent, row: int, col: int):
	if game_over: return
	
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			_on_cell_tap(row, col)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			_on_cell_long(row, col)
	elif event is InputEventScreenTouch and event.pressed:
		# 触屏：标记模式下长按标记，否则短按翻开
		_on_cell_tap(row, col)

func _on_cell_tap(row: int, col: int):
	if game_over: return
	var cell_ui = board_ui[row][col]
	
	if flag_mode and not cell_ui.revealed:
		_toggle_flag(row, col)
		return
	
	if cell_ui.revealed and cell_ui.flagged:
		return
	if cell_ui.revealed:
		# chord - 双击数字格自动翻开
		_chord(row, col)
		return
	if cell_ui.flagged:
		return
	
	if first_click:
		first_click = false
		_ensure_first_click_safe(row, col)
		_start_timer()
	
	if board_data[row][col].is_frog:
		_reveal_cell(row, col)
		_game_over(false)
		return
	
	_flood_fill(row, col)
	_check_win()

func _on_cell_long(row: int, col: int):
	if game_over: return
	var cell_ui = board_ui[row][col]
	if cell_ui.revealed: return
	_toggle_flag(row, col)

func _ensure_first_click_safe(row: int, col: int):
	# 如果第一次点击是蛙，重新生成直到安全
	if board_data[row][col].is_frog:
		board_data[row][col].is_frog = false
		# 找个新位置放蛙
		while true:
			var r = randi() % rows
			var c = randi() % cols
			if not board_data[r][c].is_frog and not (r == row and c == col):
				board_data[r][c].is_frog = true
				break
		# 重新计算所有数字
		for r in range(rows):
			for c in range(cols):
				if not board_data[r][c].is_frog:
					var count = 0
					for dr in range(-1, 2):
						for dc in range(-1, 2):
							if dr == 0 and dc == 0: continue
							var nr = r + dr
							var nc = c + dc
							if nr >= 0 and nr < rows and nc >= 0 and nc < cols and board_data[nr][nc].is_frog:
								count += 1
					board_data[r][c].nearby = count

func _toggle_flag(row: int, col: int):
	var cell_ui = board_ui[row][col]
	if cell_ui.flagged:
		cell_ui.flagged = false
		flagged_count -= 1
	else:
		cell_ui.flagged = true
		flagged_count += 1
	frog_count_label.text = str(total_frogs - flagged_count)
	_update_cell_at(row, col)

func _reveal_cell(row: int, col: int):
	var cell_ui = board_ui[row][col]
	if cell_ui.revealed: return
	cell_ui.revealed = true
	cell_ui.flagged = false
	revealed_count += 1
	_update_cell_at(row, col)

func _flood_fill(row: int, col: int):
	var stack = [[row, col]]
	var visited = {}
	visited[row * cols + col] = true
	
	while stack.size() > 0:
		var pos = stack.pop_back()
		var r = pos[0]
		var c = pos[1]
		var cell_ui = board_ui[r][c]
		if cell_ui.revealed: continue
		
		cell_ui.revealed = true
		cell_ui.flagged = false
		revealed_count += 1
		
		if board_data[r][c].nearby == 0 and not board_data[r][c].is_frog:
			for dr in range(-1, 2):
				for dc in range(-1, 2):
					if dr == 0 and dc == 0: continue
					var nr = r + dr
					var nc = c + dc
					if nr >= 0 and nr < rows and nc >= 0 and nc < cols:
						var key = nr * cols + nc
						if not visited.has(key) and not board_data[nr][nc].is_frog:
							visited[key] = true
							stack.append([nr, nc])
	
	_refresh_all_cells()

func _chord(row: int, col: int):
	var cell_ui = board_ui[row][col]
	if not cell_ui.revealed: return
	var nearby = board_data[row][col].nearby
	if nearby == 0: return
	
	# 数周围标记数
	var flag_count = 0
	for dr in range(-1, 2):
		for dc in range(-1, 2):
			if dr == 0 and dc == 0: continue
			var nr = row + dr
			var nc = col + dc
			if nr >= 0 and nr < rows and nc >= 0 and nc < cols:
				if board_ui[nr][nc].flagged:
					flag_count += 1
	
	if flag_count != nearby: return
	
	# 翻开所有未标记未翻开格子
	var exploded = false
	for dr in range(-1, 2):
		for dc in range(-1, 2):
			if dr == 0 and dc == 0: continue
			var nr = row + dr
			var nc = col + dc
			if nr < 0 or nr >= rows or nc < 0 or nc >= cols: continue
			if board_ui[nr][nc].revealed or board_ui[nr][nc].flagged: continue
			
			if board_data[nr][nc].is_frog:
				_reveal_cell(nr, nc)
				exploded = true
			else:
				_flood_fill(nr, nc)
	
	if exploded:
		_game_over(false)
	else:
		_check_win()

func _check_win():
	var safe_cells = rows * cols - total_frogs
	if revealed_count >= safe_cells:
		_game_over(true)

func _game_over(player_won: bool):
	game_over = true
	won = player_won
	timer_running = false
	
	if player_won:
		_save_record(time_elapsed)
	
	# 揭示所有蛙
	for r in range(rows):
		for c in range(cols):
			if board_data[r][c].is_frog:
				board_ui[r][c].revealed = true
	_refresh_all_cells()
	
	# 显示结果
	_show_result(player_won)

func _refresh_all_cells():
	var children = board_grid.get_children()
	var idx = 0
	for r in range(rows):
		for c in range(cols):
			if idx < children.size():
				_update_cell_style(children[idx], r, c)
			idx += 1

func _update_cell_at(row: int, col: int):
	var idx = row * cols + col
	var children = board_grid.get_children()
	if idx < children.size():
		_update_cell_style(children[idx], row, col)

func _update_cell_style(cell: PanelContainer, row: int, col: int):
	var cell_ui = board_ui[row][col]
	var data = board_data[row][col]
	
	# 清除旧子节点
	for child in cell.get_children():
		child.queue_free()
	
	var sb = StyleBoxFlat.new()
	sb.corner_radius_top_left = 2
	sb.corner_radius_top_right = 2
	sb.corner_radius_bottom_left = 2
	sb.corner_radius_bottom_right = 2
	
	if not cell_ui.revealed:
		if cell_ui.flagged:
			sb.bg_color = COLOR_CELL_FLAGGED
			cell.add_theme_stylebox_override("panel", sb)
			var flag = Label.new()
			flag.text = "🚩"
			flag.add_theme_font_size_override("font_size", max(cell_size * 0.5, 12))
			flag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			flag.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			flag.set_anchors_preset(Control.PRESET_FULL_RECT)
			cell.add_child(flag)
		else:
			sb.bg_color = COLOR_CELL_HIDDEN
			cell.add_theme_stylebox_override("panel", sb)
	else:
		if data.is_frog:
			sb.bg_color = COLOR_CELL_FROG_REVEAL
			cell.add_theme_stylebox_override("panel", sb)
			var frog = Label.new()
			frog.text = "🐸"
			frog.add_theme_font_size_override("font_size", max(cell_size * 0.6, 14))
			frog.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			frog.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			frog.set_anchors_preset(Control.PRESET_FULL_RECT)
			cell.add_child(frog)
		elif data.nearby == 0:
			sb.bg_color = COLOR_CELL_REVEALED
			cell.add_theme_stylebox_override("panel", sb)
			var water = Label.new()
			water.text = "💧"
			water.add_theme_font_size_override("font_size", max(cell_size * 0.45, 10))
			water.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			water.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			water.set_anchors_preset(Control.PRESET_FULL_RECT)
			cell.add_child(water)
		else:
			sb.bg_color = COLOR_CELL_REVEALED
			cell.add_theme_stylebox_override("panel", sb)
			var num = Label.new()
			num.text = str(data.nearby)
			num.add_theme_font_size_override("font_size", max(cell_size * 0.45, 10))
			num.add_theme_color_override("font_color", NUM_COLORS[data.nearby] if data.nearby < NUM_COLORS.size() else COLOR_NUM)
			num.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			num.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			num.set_anchors_preset(Control.PRESET_FULL_RECT)
			cell.add_child(num)

# === 计时器 ===
func _start_timer():
	timer_running = true
	time_elapsed = 0

func _process(delta):
	if timer_running:
		time_elapsed += delta
		var m = int(time_elapsed) / 60
		var s = int(time_elapsed) % 60
		time_label.text = str(m) + ":" + str(s).pad_zeros(2)

# === 标记模式 ===
func _toggle_flag_mode():
	flag_mode = !flag_mode
	_update_flag_btn_style()

func _update_flag_btn_style():
	if flag_btn:
		_style_tool_btn(flag_btn, flag_mode)
		flag_btn.text = "🚩 标记模式" if flag_mode else "🚩 标记牛蛙"

# === 结果弹窗 ===
func _show_result(player_won: bool):
	_remove_result_overlay()
	
	result_overlay = Control.new()
	result_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	result_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	
	# 半透明背景
	var overlay_bg = ColorRect.new()
	overlay_bg.color = Color(0, 0, 0, 0.5)
	overlay_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	result_overlay.add_child(overlay_bg)
	
	# 模态框
	var modal = PanelContainer.new()
	modal.set_anchors_preset(Control.PRESET_CENTER)
	modal.offset_left = -140
	modal.offset_right = 140
	modal.offset_top = -120
	modal.offset_bottom = 120
	var msb = StyleBoxFlat.new()
	msb.bg_color = Color(1, 1, 1, 1)
	msb.corner_radius_top_left = 20
	msb.corner_radius_top_right = 20
	msb.corner_radius_bottom_left = 20
	msb.corner_radius_bottom_right = 20
	msb.content_margin_top = 28
	msb.content_margin_bottom = 24
	msb.content_margin_left = 24
	msb.content_margin_right = 24
	msb.shadow_color = Color(0, 0, 0, 0.15)
	msb.shadow_size = 8
	modal.add_theme_stylebox_override("panel", msb)
	result_overlay.add_child(modal)
	
	var modal_vbox = VBoxContainer.new()
	modal_vbox.add_theme_constant_override("separation", 10)
	modal_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	modal.add_child(modal_vbox)
	
	result_icon = Label.new()
	result_icon.text = "🏆" if player_won else "🐸"
	result_icon.add_theme_font_size_override("font_size", 56)
	result_icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	modal_vbox.add_child(result_icon)
	
	result_title = Label.new()
	result_title.text = "成功逃脱！" if player_won else "踩到牛蛙了！"
	result_title.add_theme_font_size_override("font_size", 22)
	result_title.add_theme_color_override("font_color", COLOR_TEXT)
	result_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	modal_vbox.add_child(result_title)
	
	result_sub = Label.new()
	if player_won:
		var m = int(time_elapsed) / 60
		var s = int(time_elapsed) % 60
		result_sub.text = "用时 " + str(m) + ":" + str(s).pad_zeros(2)
	else:
		result_sub.text = "老婆看到会骂人的吧… 😂"
	result_sub.add_theme_font_size_override("font_size", 14)
	result_sub.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	result_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	modal_vbox.add_child(result_sub)
	
	# 再来一局按钮
	var again_btn = Button.new()
	again_btn.text = "再来一局"
	again_btn.custom_minimum_size = Vector2(0, 44)
	again_btn.add_theme_font_size_override("font_size", 15)
	var asb = StyleBoxFlat.new()
	asb.bg_color = COLOR_ACCENT
	asb.corner_radius_top_left = 25
	asb.corner_radius_top_right = 25
	asb.corner_radius_bottom_left = 25
	asb.corner_radius_bottom_right = 25
	again_btn.add_theme_stylebox_override("normal", asb)
	again_btn.add_theme_color_override("font_color", Color(1, 1, 1))
	again_btn.pressed.connect(func(): start_game(difficulty))
	modal_vbox.add_child(again_btn)
	
	add_child(result_overlay)

func _remove_result_overlay():
	if result_overlay and is_instance_valid(result_overlay):
		result_overlay.queue_free()
		result_overlay = null

# === 帮助弹窗 ===
func _show_help():
	_remove_result_overlay()
	
	result_overlay = Control.new()
	result_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	result_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	
	var overlay_bg = ColorRect.new()
	overlay_bg.color = Color(0, 0, 0, 0.5)
	overlay_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay_bg.add_child(overlay_bg)
	
	var modal = PanelContainer.new()
	modal.set_anchors_preset(Control.PRESET_CENTER)
	modal.offset_left = -150
	modal.offset_right = 150
	modal.offset_top = -180
	modal.offset_bottom = 180
	var msb = StyleBoxFlat.new()
	msb.bg_color = Color(1, 1, 1, 1)
	msb.corner_radius_top_left = 20
	msb.corner_radius_top_right = 20
	msb.corner_radius_bottom_left = 20
	msb.corner_radius_bottom_right = 20
	msb.content_margin_top = 24
	msb.content_margin_bottom = 20
	msb.content_margin_left = 24
	msb.content_margin_right = 24
	modal.add_theme_stylebox_override("panel", msb)
	result_overlay.add_child(modal)
	
	var mv = VBoxContainer.new()
	mv.add_theme_constant_override("separation", 8)
	mv.alignment = BoxContainer.ALIGNMENT_CENTER
	modal.add_child(mv)
	
	var hi = Label.new()
	hi.text = "🐸"
	hi.add_theme_font_size_override("font_size", 40)
	hi.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mv.add_child(hi)
	
	var ht = Label.new()
	ht.text = "躲避牛蛙"
	ht.add_theme_font_size_override("font_size", 20)
	ht.add_theme_color_override("font_color", COLOR_TEXT)
	ht.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mv.add_child(ht)
	
	var story = Label.new()
	story.text = "26年4月22日，老婆买了牛蛙打算炒着吃，让商家帮忙处理结果没处理。开箱那一刻，一盒子活牛蛙眼睛齐刷刷盯着她…… 🐸"
	story.add_theme_font_size_override("font_size", 12)
	story.add_theme_color_override("font_color", Color(0.533, 0.533, 0.533))
	story.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	story.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mv.add_child(story)
	
	var rules = [
		"🐸 点击格子，躲开所有牛蛙",
		"💧 安全区域会显示水花",
		"🔢 数字表示周围有多少只牛蛙",
		"🚩 切换标记模式标记可疑位置",
		"🏆 全部安全区域翻开后获胜",
	]
	for rule in rules:
		var rl = Label.new()
		rl.text = rule
		rl.add_theme_font_size_override("font_size", 13)
		rl.add_theme_color_override("font_color", Color(0.267, 0.267, 0.267))
		rl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		mv.add_child(rl)
	
	var ok_btn = Button.new()
	ok_btn.text = "明白了"
	ok_btn.custom_minimum_size = Vector2(0, 40)
	ok_btn.add_theme_font_size_override("font_size", 15)
	var osb = StyleBoxFlat.new()
	osb.bg_color = COLOR_ACCENT
	osb.corner_radius_top_left = 25
	osb.corner_radius_top_right = 25
	osb.corner_radius_bottom_left = 25
	osb.corner_radius_bottom_right = 25
	ok_btn.add_theme_stylebox_override("normal", osb)
	ok_btn.add_theme_color_override("font_color", Color(1, 1, 1))
	ok_btn.pressed.connect(_remove_result_overlay)
	mv.add_child(ok_btn)
	
	add_child(result_overlay)

# === 记录 ===
func _load_records():
	# Godot 没有微信存储，用文件
	var file = FileAccess.open("user://frog_escape_records.json", FileAccess.READ)
	if file:
		var json = JSON.new()
		if json.parse(file.get_as_text()) == OK:
			best_times = json.data
		file.close()

func _save_record(time: float):
	var key = difficulty
	if not best_times.has(key) or time < best_times[key]:
		best_times[key] = time
		var file = FileAccess.open("user://frog_escape_records.json", FileAccess.WRITE)
		if file:
			file.store_string(JSON.stringify(best_times))
			file.close()
