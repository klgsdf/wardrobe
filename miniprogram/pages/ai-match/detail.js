// pages/ai-match/detail.js - 搭配详情（焦糖米黄风）
var THEME_KEY = 'wardrobe_theme';
var OUTFIT_HISTORY_KEY = 'outfit_history';
var CLOTHES_LIST_KEY = 'clothes_list';

// 分类图标配置
var CATEGORY_ICONS = {
  '上装': { text: '👕', bg: '#E8DDD4' },
  '下装': { text: '👖', bg: '#E4E8E0' },
  '连衣裙': { text: '👗', bg: '#F0E4E8' },
  '外套': { text: '🧥', bg: '#E0E4E8' },
  '配饰': { text: '💎', bg: '#E8E0D8' },
  '鞋履': { text: '👟', bg: '#E8D8D0' },
  '鞋靴': { text: '👟', bg: '#E8D8D0' },
};

// AI推荐单品类别 -> 用户衣物category key 的映射
var CATEGORY_KEY_MAP = {
  '上装': 'top',
  '下装': 'bottom',
  '连衣裙': 'dress',
  '外套': 'outer',
  '配饰': 'accessory',
  '鞋履': 'shoes',
  '鞋靴': 'shoes',
};

// 颜色相似度矩阵（简单版本：相同颜色100%，同色系80%，其他0%）
var COLOR_SIMILARITY = {
  'white': { 'white': 100, 'beige': 80, 'gray': 60, 'black': 30 },
  'beige': { 'beige': 100, 'white': 80, 'brown': 80, 'gray': 50 },
  'black': { 'black': 100, 'gray': 70, 'navy': 70, 'white': 30 },
  'gray': { 'gray': 100, 'black': 70, 'white': 60, 'blue': 40 },
  'blue': { 'blue': 100, 'navy': 90, 'gray': 40, 'white': 50 },
  'navy': { 'navy': 100, 'blue': 90, 'black': 70, 'gray': 50 },
  'red': { 'red': 100, 'pink': 80, 'brown': 50 },
  'pink': { 'pink': 100, 'red': 80, 'white': 60 },
  'yellow': { 'yellow': 100, 'beige': 70, 'brown': 50 },
  'green': { 'green': 100, 'brown': 40 },
  'brown': { 'brown': 100, 'beige': 80, 'black': 50, 'yellow': 50 },
  'purple': { 'purple': 100, 'pink': 60, 'blue': 50 },
};

// 风格相似度矩阵
var STYLE_SIMILARITY = {
  'casual': { 'casual': 100, 'street': 80, 'sport': 60 },
  'business': { 'business': 100, 'minimal': 90, 'formal': 80 },
  'sweet': { 'sweet': 100, 'vintage': 60 },
  'cool': { 'cool': 100, 'street': 80, 'minimal': 70 },
  'vintage': { 'vintage': 100, 'sweet': 60, 'casual': 50 },
  'street': { 'street': 100, 'casual': 80, 'cool': 80 },
  'minimal': { 'minimal': 100, 'business': 90, 'cool': 70 },
  'sport': { 'sport': 100, 'casual': 60 },
};

/**
 * 计算两个颜色数组的相似度
 */
function calcColorSimilarity(colors1, colors2) {
  if (!colors1 || !colors2 || colors1.length === 0 || colors2.length === 0) return 0;
  var maxSim = 0;
  for (var i = 0; i < colors1.length; i++) {
    for (var j = 0; j < colors2.length; j++) {
      var c1 = colors1[i];
      var c2 = colors2[j];
      var sim = 0;
      if (c1 === c2) {
        sim = 100;
      } else {
        var row = COLOR_SIMILARITY[c1];
        if (row && row[c2]) sim = row[c2];
      }
      if (sim > maxSim) maxSim = sim;
    }
  }
  return maxSim;
}

/**
 * 计算两个风格数组的相似度
 */
function calcStyleSimilarity(styles1, styles2) {
  if (!styles1 || !styles2 || styles1.length === 0 || styles2.length === 0) return 0;
  var maxSim = 0;
  for (var i = 0; i < styles1.length; i++) {
    for (var j = 0; j < styles2.length; j++) {
      var s1 = styles1[i];
      var s2 = styles2[j];
      var sim = 0;
      if (s1 === s2) {
        sim = 100;
      } else {
        var row = STYLE_SIMILARITY[s1];
        if (row && row[s2]) sim = row[s2];
      }
      if (sim > maxSim) maxSim = sim;
    }
  }
  return maxSim;
}

/**
 * 计算两个材质数组的相似度
 */
function calcMaterialSimilarity(mats1, mats2) {
  if (!mats1 || !mats2 || mats1.length === 0 || mats2.length === 0) return 0;
  var matchCount = 0;
  for (var i = 0; i < mats1.length; i++) {
    for (var j = 0; j < mats2.length; j++) {
      if (mats1[i] === mats2[j]) {
        matchCount++;
        break;
      }
    }
  }
  var maxLen = Math.max(mats1.length, mats2.length);
  return maxLen > 0 ? Math.round((matchCount / maxLen) * 100) : 0;
}

/**
 * 计算两个季节数组的相似度
 */
function calcSeasonSimilarity(seasons1, seasons2) {
  if (!seasons1 || !seasons2 || seasons1.length === 0 || seasons2.length === 0) return 0;
  var matchCount = 0;
  for (var i = 0; i < seasons1.length; i++) {
    for (var j = 0; j < seasons2.length; j++) {
      if (seasons1[i] === seasons2[j]) {
        matchCount++;
        break;
      }
    }
  }
  var maxLen = Math.max(seasons1.length, seasons2.length);
  return maxLen > 0 ? Math.round((matchCount / maxLen) * 100) : 0;
}

/**
 * 从AI推荐单品名称中提取标签信息（颜色、风格关键词）
 */
function extractTagsFromName(name) {
  var tags = { colors: [], styles: [] };
  if (!name) return tags;
  var lowerName = name.toLowerCase();

  // 颜色关键词映射
  var colorKeywords = {
    '白色': 'white', '白': 'white',
    '黑色': 'black', '黑': 'black',
    '灰色': 'gray', '灰': 'gray',
    '蓝色': 'blue', '蓝': 'blue',
    '藏青': 'navy', '藏青色': 'navy',
    '红色': 'red', '红': 'red',
    '粉色': 'pink', '粉': 'pink',
    '黄色': 'yellow', '黄': 'yellow',
    '绿色': 'green', '绿': 'green',
    '棕色': 'brown', '棕': 'brown',
    '米色': 'beige', '米': 'beige',
    '紫色': 'purple', '紫': 'purple',
    '卡其色': 'beige', '卡其': 'beige',
    '裸色': 'beige',
  };

  // 风格关键词映射
  var styleKeywords = {
    '休闲': 'casual',
    '商务': 'business',
    '甜美': 'sweet',
    '酷飒': 'cool',
    '复古': 'vintage',
    '街头': 'street',
    '极简': 'minimal', '简约': 'minimal', '简单': 'minimal',
    '运动': 'sport',
    '通勤': 'business',
    '正式': 'business',
  };

  for (var ck in colorKeywords) {
    if (lowerName.indexOf(ck) >= 0) {
      var cv = colorKeywords[ck];
      if (tags.colors.indexOf(cv) < 0) tags.colors.push(cv);
    }
  }

  for (var sk in styleKeywords) {
    if (lowerName.indexOf(sk) >= 0) {
      var sv = styleKeywords[sk];
      if (tags.styles.indexOf(sv) < 0) tags.styles.push(sv);
    }
  }

  return tags;
}

/**
 * 计算推荐单品与用户衣物的匹配度
 * @param {object} recommendItem AI推荐的单品 {category, name}
 * @param {object} userCloth 用户衣物 {tags:{color, style, material, season}}
 * @returns {number} 匹配度 0-100
 */
function calcMatchScore(recommendItem, userCloth) {
  if (!recommendItem || !userCloth || !userCloth.tags) return 0;

  var recTags = extractTagsFromName(recommendItem.name);
  var userTags = userCloth.tags;

  // 颜色相似度（权重35%）
  var colorSim = calcColorSimilarity(recTags.colors, userTags.color || []);

  // 风格相似度（权重35%）
  var styleSim = calcStyleSimilarity(recTags.styles, userTags.style || []);

  // 材质相似度（权重15%）
  var materialSim = calcMaterialSimilarity([], userTags.material || []);
  // 如果推荐名称中包含材质关键词，可以提取后计算；这里简化处理

  // 季节相似度（权重15%）
  var seasonSim = calcSeasonSimilarity([], userTags.season || []);

  // 综合得分
  var score = Math.round(colorSim * 0.35 + styleSim * 0.35 + materialSim * 0.15 + seasonSim * 0.15);
  return score;
}

/**
 * 为用户衣柜中的衣物按匹配度排序
 * @param {object} recommendItem AI推荐的单品
 * @param {array} userClothes 用户所有衣物
 * @returns {array} 按匹配度排序的衣物列表，每项包含 {cloth, matchScore}
 */
function findBestMatches(recommendItem, userClothes) {
  var results = [];
  var targetCategory = CATEGORY_KEY_MAP[recommendItem.category];
  if (!targetCategory) return results;

  for (var i = 0; i < userClothes.length; i++) {
    var cloth = userClothes[i];
    if (!cloth.tags || !cloth.tags.category) continue;
    // 类别必须匹配（连衣裙也算上装）
    var clothCat = cloth.tags.category;
    var catMatch = false;
    if (targetCategory === 'top' && (clothCat === 'top' || clothCat === 'dress')) {
      catMatch = true;
    } else if (targetCategory === clothCat) {
      catMatch = true;
    }
    if (!catMatch) continue;

    var score = calcMatchScore(recommendItem, cloth);
    if (score >= 50) {
      // 构建衣物显示名称：颜色 + 类别
      var displayName = cloth.note || '';
      if (!displayName && cloth.tags) {
        var colorLabels = [];
        if (cloth.tags.color && cloth.tags.color.length > 0) {
          for (var ci = 0; ci < cloth.tags.color.length; ci++) {
            var ck = cloth.tags.color[ci];
            var colorLabelMap = {
              'white': '白色', 'black': '黑色', 'gray': '灰色', 'blue': '蓝色',
              'navy': '藏青', 'red': '红色', 'pink': '粉色', 'yellow': '黄色',
              'green': '绿色', 'brown': '棕色', 'beige': '米色', 'purple': '紫色',
            };
            colorLabels.push(colorLabelMap[ck] || ck);
          }
        }
        var catLabelMap = {
          'top': '上装', 'bottom': '下装', 'dress': '连衣裙',
          'outer': '外套', 'shoes': '鞋靴', 'accessory': '配饰',
        };
        var catLabel = catLabelMap[cloth.tags.category] || cloth.tags.category;
        displayName = (colorLabels.length > 0 ? colorLabels.join('、') : '') + catLabel;
      }
      results.push({
        id: cloth.id,
        name: displayName || '未知单品',
        images: cloth.images,
        tags: cloth.tags,
        matchScore: score,
      });
    }
  }

  // 按匹配度降序排列
  results.sort(function (a, b) {
    return b.matchScore - a.matchScore;
  });

  return results;
}

Page({
  data: {
    // 系统信息
    statusBarHeight: 44,
    navPadHeight: 88,
    navBarHeight: 44,

    // 主题
    isDark: false,

    // 页面状态: 'detail' | 'success'
    pageState: 'detail',
    pageTitle: '搭配详情',

    // 搭配数据
    outfit: {},

    // 智能匹配结果：每个单品对应的推荐衣物列表
    matchResults: [],
  },

  onLoad: function (options) {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44 });
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    var navBarHeight = 44;
    var navPadHeight = statusBarHeight + navBarHeight;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';

    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: navBarHeight,
      navPadHeight: navPadHeight,
      isDark: theme === 'dark',
    });

    // 解析搭配数据
    if (options.outfit) {
      try {
        var outfit = JSON.parse(decodeURIComponent(options.outfit));
        // 为每个单品添加图标配置
        if (outfit.items && outfit.items.length > 0) {
          for (var i = 0; i < outfit.items.length; i++) {
            var item = outfit.items[i];
            var iconConfig = CATEGORY_ICONS[item.category] || { text: '👔', bg: '#E8DDD4' };
            item.iconText = iconConfig.text;
            item.iconBg = iconConfig.bg;
          }
        }
        this.setData({
          outfit: outfit,
          pageTitle: outfit.name || '搭配详情',
        });

        // 加载用户衣柜并执行智能匹配
        this._loadAndMatch(outfit);
      } catch (e) {
        console.error('解析搭配数据失败:', e);
        wx.showToast({ title: '数据加载失败', icon: 'none' });
      }
    }
  },

  /* ============ 加载衣柜并智能匹配 ============ */
  _loadAndMatch: function (outfit) {
    var self = this;
    var userClothes = wx.getStorageSync(CLOTHES_LIST_KEY) || [];

    if (!outfit.items || outfit.items.length === 0 || userClothes.length === 0) {
      self.setData({ matchResults: [] });
      return;
    }

    var matchResults = [];
    for (var i = 0; i < outfit.items.length; i++) {
      var recItem = outfit.items[i];
      var matches = findBestMatches(recItem, userClothes);
      // 限制最多5个推荐
      if (matches.length > 5) {
        matches = matches.slice(0, 5);
      }
      matchResults.push({
        category: recItem.category,
        name: recItem.name,
        iconText: recItem.iconText,
        iconBg: recItem.iconBg,
        matches: matches,
        hasMatches: matches.length > 0,
      });
    }

    self.setData({ matchResults: matchResults });
  },

  onShow: function () {
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }
  },

  /* ============ 导航 ============ */
  onBack: function () {
    wx.navigateBack();
  },

  /* ============ 保存搭配 ============ */
  onSaveOutfit: function () {
    var self = this;
    var outfit = this.data.outfit;
    if (!outfit || !outfit.id) {
      wx.showToast({ title: '搭配数据异常', icon: 'none' });
      return;
    }

    // 读取历史记录
    var history = wx.getStorageSync(OUTFIT_HISTORY_KEY) || [];

    // 检查是否已保存
    for (var i = 0; i < history.length; i++) {
      if (history[i].id === outfit.id) {
        wx.showToast({ title: '该搭配已保存过', icon: 'none' });
        self.setData({ pageState: 'success' });
        return;
      }
    }

    // 添加保存时间
    var savedOutfit = Object.assign({}, outfit, {
      savedAt: Date.now(),
    });

    history.unshift(savedOutfit);

    // 最多保存50条
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    wx.setStorageSync(OUTFIT_HISTORY_KEY, history);

    wx.vibrateShort({ type: 'medium' });

    // 切换到成功视图
    self.setData({ pageState: 'success' });
  },

  /* ============ 返回首页 ============ */
  onBackToHome: function () {
    wx.vibrateShort({ type: 'light' });
    wx.switchTab({ url: '/pages/index/index' });
  },
});
