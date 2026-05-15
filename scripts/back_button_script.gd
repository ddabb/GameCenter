extends Control

# 通用游戏占位页 - 根据场景文件名自动匹配游戏信息
# 所有占位页共用此脚本，无需为每个游戏写独立脚本

const GRADIENT_TOP = Color(0.059, 0.047, 0.161)
const COLOR_CARD = Color(1, 1, 1, 0.06)
const COLOR_TEXT = Color(1, 1, 1, 0.95)
const COLOR_TEXT_DIM = Color(1, 1, 1, 0.5)
const COLOR_ACCENT = Color(0.4, 0.494, 0.918)
const RADIUS = 16

const GAME_INFO = {
	"akari": {"icon": "💡", "title": "数灯", "desc": "在网格中放置灯泡，照亮所有白色格子", "rules": ["在空白格子中放置灯泡", "灯泡会照亮同行同列的所有格子", "数字表示周围8格的灯泡数量", "两个灯泡不能互相照亮", "所有空白格子必须被照亮"]},
	"battleship": {"icon": "🚢", "title": "战舰", "desc": "在海域中寻找敌方隐藏的战舰", "rules": ["在10×10网格上猜测敌舰位置", "数字提示表示命中但未击沉的战舰格子数", "战舰不可相邻", "击沉所有战舰即可获胜"]},
	"frog-escape": {"icon": "🐸", "title": "青蛙逃脱", "desc": "滑动方块帮青蛙找到出口", "rules": ["滑动方块为青蛙开辟道路", "方块只能在空位滑动", "用最少步数完成挑战", "青蛙必须到达出口"]},
	"number-one": {"icon": "1️⃣", "title": "数字一", "desc": "在网格中放置数字1的趣味谜题", "rules": ["每个区域只能放一个数字1", "数字1不能相邻（含对角）", "所有区域都必须有数字1"]},
	"nurikabe": {"icon": "🧱", "title": "数墙", "desc": "用墙壁分隔数字区域", "rules": ["数字表示其所在白色区域的格子数", "黑色墙壁必须连成一片", "2×2的黑色区域不合法"]},
	"slither-link": {"icon": "🔗", "title": "数回", "desc": "画出一条连续的封闭回路", "rules": ["在网格点之间绘制线段", "数字表示周围4条边中要画的线段数", "回路不能分叉或交叉", "回路必须闭合"]},
	"sokoban": {"icon": "📦", "title": "推箱子", "desc": "将箱子推到指定目标位置", "rules": ["角色只能推箱子，不能拉", "每次只能推一个箱子", "所有箱子推到目标点即通关", "箱子推到角落则无法移动"]},
	"tents": {"icon": "⛺", "title": "帐篷", "desc": "为每棵树搭一顶帐篷", "rules": ["每棵树对应一顶帐篷", "帐篷必须紧邻其对应的树", "行/列数字表示该行/列的帐篷数", "帐篷之间不能相邻（含对角）"]},
}

var _info: Dictionary = {}

func _ready():
	# 从场景文件名推断游戏
	var scene_path = scene_file_path
	var filename = scene_path.get_file().replace(".tscn", "")
	_info = GAME_INFO.get(filename, {"icon": "🎮", "title": "游戏", "desc": "即将上线", "rules": []})
	_build_ui()

func _build_ui():
	# 渐变背景
	var bg = ColorRect.new()
	bg.color = GRADIENT_TOP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	
	var margin = MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_bottom", 20)
	add_child(margin)
	
	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 16)
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
	
	var sp1 = Control.new()
	sp1.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	navbar.add_child(sp1)
	
	var icon_label = Label.new()
	icon_label.text = _info.icon
	icon_label.add_theme_font_size_override("font_size", 24)
	navbar.add_child(icon_label)
	
	# 标题卡片
	var title_card = PanelContainer.new()
	var tsb = StyleBoxFlat.new()
	tsb.bg_color = COLOR_CARD
	tsb.corner_radius_top_left = RADIUS
	tsb.corner_radius_top_right = RADIUS
	tsb.corner_radius_bottom_left = RADIUS
	tsb.corner_radius_bottom_right = RADIUS
	tsb.content_margin_top = 20
	tsb.content_margin_bottom = 20
	tsb.content_margin_left = 16
	tsb.content_margin_right = 16
	title_card.add_theme_stylebox_override("panel", tsb)
	vbox.add_child(title_card)
	
	var title_vbox = VBoxContainer.new()
	title_vbox.add_theme_constant_override("separation", 8)
	title_card.add_child(title_vbox)
	
	var title = Label.new()
	title.text = _info.icon + " " + _info.title
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", COLOR_TEXT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_vbox.add_child(title)
	
	var desc = Label.new()
	desc.text = _info.desc
	desc.add_theme_font_size_override("font_size", 13)
	desc.add_theme_color_override("font_color", COLOR_TEXT_DIM)
	desc.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title_vbox.add_child(desc)
	
	# 规则卡片
	if _info.rules.size() > 0:
		var rules_card = PanelContainer.new()
		var rsb = StyleBoxFlat.new()
		rsb.bg_color = COLOR_CARD
		rsb.corner_radius_top_left = RADIUS
		rsb.corner_radius_top_right = RADIUS
		rsb.corner_radius_bottom_left = RADIUS
		rsb.corner_radius_bottom_right = RADIUS
		rsb.content_margin_top = 16
		rsb.content_margin_bottom = 16
		rsb.content_margin_left = 16
		rsb.content_margin_right = 16
		rules_card.add_theme_stylebox_override("panel", rsb)
		rules_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(rules_card)
		
		var rules_vbox = VBoxContainer.new()
		rules_vbox.add_theme_constant_override("separation", 10)
		rules_card.add_child(rules_vbox)
		
		var rules_title = Label.new()
		rules_title.text = "📖 游戏规则"
		rules_title.add_theme_font_size_override("font_size", 16)
		rules_title.add_theme_color_override("font_color", COLOR_TEXT)
		rules_vbox.add_child(rules_title)
		
		for rule in _info.rules:
			var rl = Label.new()
			rl.text = "  •  " + rule
			rl.add_theme_font_size_override("font_size", 13)
			rl.add_theme_color_override("font_color", COLOR_TEXT_DIM)
			rl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			rules_vbox.add_child(rl)
	else:
		# 即将上线占位
		var coming_card = PanelContainer.new()
		var csb = StyleBoxFlat.new()
		csb.bg_color = COLOR_CARD
		csb.corner_radius_top_left = RADIUS
		csb.corner_radius_top_right = RADIUS
		csb.corner_radius_bottom_left = RADIUS
		csb.corner_radius_bottom_right = RADIUS
		csb.content_margin_top = 32
		csb.content_margin_bottom = 32
		coming_card.add_theme_stylebox_override("panel", csb)
		coming_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(coming_card)
		
		var cv = VBoxContainer.new()
		cv.add_theme_constant_override("separation", 8)
		cv.alignment = BoxContainer.ALIGNMENT_CENTER
		coming_card.add_child(cv)
		
		var cl = Label.new()
		cl.text = "🚧 即将上线"
		cl.add_theme_font_size_override("font_size", 20)
		cl.add_theme_color_override("font_color", COLOR_TEXT_DIM)
		cl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cv.add_child(cl)
