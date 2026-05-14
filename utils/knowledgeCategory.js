const CDN_THEME_URL = 'https://cdn.jsdelivr.net/gh/ddabb/PortableKnowledge@main/know-category-theme.json';
const CACHE_KEY_THEME = 'cdn_know_theme';
const CACHE_KEY_THEME_TS = 'cdn_know_theme_ts';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';

let _themeMap = null;
let _themeVersion = '';
let _classNameByCategory = null;

function _loadThemeFromStorage() {
  try {
    const raw = wx.getStorageSync(CACHE_KEY_THEME);
    if (raw) return raw;
  } catch (e) {}
  return null;
}

function _saveThemeToStorage(data) {
  try {
    wx.setStorageSync(CACHE_KEY_THEME, data);
    wx.setStorageSync(CACHE_KEY_THEME_TS, Date.now());
  } catch (e) {}
}

function _buildClassNameByCategory() {
  const map = {
    '产品研发': 'category-product-design',
    '产品使用': 'category-product-usage',
    '产品设计': 'category-product-design',
    '产品思考': 'category-product-thinking',
    '开发实践': 'category-dev-practice',
    '开发者故事': 'category-dev-story',
    '软考': 'category-soft-exam',
    '综合知识': 'category-soft-exam',
    '项目管理': 'category-project-mgmt',
    '引论': 'category-soft-exam',
    '软考备考': 'category-soft-exam',
    '信息系统开发': 'category-dev-practice',
    '工具与技术': 'category-dev-practice',
    '数据流向图': 'category-dev-practice',
    '系统集成基础': 'category-dev-practice',
    '法律法规与标准': 'category-legal',
    '计算题专项': 'category-calculation',
    '项目立项管理': 'category-project-mgmt',
    '项目整合管理': 'category-project-mgmt',
    '项目范围管理': 'category-project-mgmt',
    '项目进度管理': 'category-project-mgmt',
    '项目成本管理': 'category-project-mgmt',
    '项目质量管理': 'category-project-mgmt',
    '项目资源管理': 'category-project-mgmt',
    '项目沟通管理': 'category-project-mgmt',
    '项目风险管理': 'category-project-mgmt',
    '项目采购管理': 'category-project-mgmt',
    '项目相关方管理': 'category-project-mgmt',
    '项目经理的角色': 'category-project-mgmt',
    '项目运行环境': 'category-project-mgmt',
    '生活通识': 'category-safety',
    '安全防范': 'category-safety',
    '急救知识': 'category-safety',
    '自然灾害': 'category-safety',
    '法律常识': 'category-legal',
    '社保公积金': 'category-legal',
    '心理学': 'category-product-thinking',
    'PMP认证': 'category-pmp',
    '敏捷管理': 'category-agile',
    '未分类': 'category-uncategorized'
  };
  return map;
}

function loadTheme(onReady) {
  if (_themeMap) {
    onReady({ version: _themeVersion, categories: _themeMap });
    return;
  }

  const cached = _loadThemeFromStorage();
  if (cached) {
    _themeMap = cached.categories || {};
    _themeVersion = cached.version || '';
    _classNameByCategory = _buildClassNameByCategory();
    onReady({ version: _themeVersion, categories: _themeMap });
  }

  wx.request({
    url: CDN_THEME_URL,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.categories) {
        _themeMap = res.data.categories;
        _themeVersion = res.data.version || '';
        _classNameByCategory = _buildClassNameByCategory();
        _saveThemeToStorage(res.data);
        onReady({ version: _themeVersion, categories: _themeMap });
      }
    },
    fail() {
      if (!_themeMap) _themeMap = {};
    }
  });
}

function getCategoryGradient(className) {
  if (_themeMap && _themeMap[className]) {
    return _themeMap[className].gradient || DEFAULT_GRADIENT;
  }
  return DEFAULT_GRADIENT;
}

function getCategoryIconByClassName(className) {
  if (_themeMap && _themeMap[className] && _themeMap[className].icon) {
    return _themeMap[className].icon;
  }
  return '📚';
}

const CATEGORY_RULES = [
  {
    test: category => /^项目.+管理$/.test(category) || category === '项目经理的角色' || category === '项目运行环境',
    className: 'category-project-mgmt'
  },
  {
    test: category => /安全|急救|灾害/.test(category),
    className: 'category-safety'
  },
  {
    test: category => /法律|法规|标准|社保|公积金/.test(category),
    className: 'category-legal'
  },
  {
    test: category => /计算|算/.test(category),
    className: 'category-calculation'
  },
  {
    test: category => /系统|技术|开发|数据流向图/.test(category),
    className: 'category-dev-practice'
  },
  {
    test: category => /备考|引论|软考/.test(category),
    className: 'category-soft-exam'
  },
  {
    test: category => /心理/.test(category),
    className: 'category-product-thinking'
  }
];

function getLeafCategoryName(category) {
  if (!category) return '未分类';

  const parts = String(category).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(category);
}

function getCategoryMeta(category) {
  const leafCategory = getLeafCategoryName(category);

  if (_classNameByCategory && _classNameByCategory[leafCategory]) {
    const className = _classNameByCategory[leafCategory];
    return {
      className: className,
      icon: getCategoryIconByClassName(className)
    };
  }

  const matchedRule = CATEGORY_RULES.find(rule => rule.test(leafCategory));
  if (matchedRule) {
    return {
      className: matchedRule.className,
      icon: getCategoryIconByClassName(matchedRule.className)
    };
  }

  return {
    icon: '📚',
    className: 'category-uncategorized'
  };
}

function getCategoryIcon(category) {
  return getCategoryMeta(category).icon;
}

function getCategoryClass(category) {
  return getCategoryMeta(category).className;
}

module.exports = {
  getLeafCategoryName,
  getCategoryMeta,
  getCategoryIcon,
  getCategoryClass,
  getCategoryGradient,
  loadTheme
};