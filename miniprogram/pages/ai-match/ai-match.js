// pages/ai-match/ai-match.js - AI 智能搭配（通过云函数调用 TokenHub AI）
var THEME_KEY = 'wardrobe_theme';
var CLOTHES_LIST_KEY = 'clothes_list';
var OUTFIT_HISTORY_KEY = 'outfit_history';

var { recommendOutfit } = require('../../utils/api.js');

// 快捷标签配置
var QUICK_TAGS = [
  { key: 'commute', label: '通勤风', bg: '#E8DDD4' },
  { key: 'date', label: '约会风', bg: '#F0E4E8' },
  { key: 'casual', label: '休闲风', bg: '#E4E8E0' },
  { key: 'sport', label: '运动风', bg: '#E0E4E8' },
  { key: 'academy', label: '学院风', bg: '#E8E0D8' },
  { key: 'vintage', label: '复古风', bg: '#E8D8D0' },
];

// 模拟搭配模板（AI调用失败时降级使用）
var MOCK_OUTFITS = {
  'commute': [
    {
      id: 'mock_c1', name: '温柔通勤风', tagLabel: '搭配一', tagBg: '#E8DDD4',
      top: '米白色针织衫', bottom: '卡其色阔腿裤', accessory: '珍珠耳环', shoes: '裸色单鞋',
      items: [
        { category: '上装', name: '米白色针织衫', match: 95 },
        { category: '下装', name: '卡其色阔腿裤', match: 92 },
        { category: '配饰', name: '珍珠耳环', match: 88 },
        { category: '鞋履', name: '裸色单鞋', match: 90 },
      ],
    },
    {
      id: 'mock_c2', name: '干练职场风', tagLabel: '搭配二', tagBg: '#E4E8E0',
      top: '白色衬衫', bottom: '黑色西装裤', accessory: '简约手表', shoes: '黑色高跟鞋',
      items: [
        { category: '上装', name: '白色衬衫', match: 94 },
        { category: '下装', name: '黑色西装裤', match: 93 },
        { category: '配饰', name: '简约手表', match: 85 },
        { category: '鞋履', name: '黑色高跟鞋', match: 91 },
      ],
    },
    {
      id: 'mock_c3', name: '知性优雅风', tagLabel: '搭配三', tagBg: '#E0E4E8',
      dress: '藏青色连衣裙', accessory: '丝巾', shoes: '棕色乐福鞋',
      items: [
        { category: '连衣裙', name: '藏青色连衣裙', match: 93 },
        { category: '配饰', name: '丝巾', match: 87 },
        { category: '鞋履', name: '棕色乐福鞋', match: 89 },
      ],
    },
  ],
  'date': [
    {
      id: 'mock_d1', name: '法式约会风', tagLabel: '搭配一', tagBg: '#F0E4E8',
      dress: '碎花连衣裙', accessory: '草编包 + 发带', shoes: '白色小皮鞋',
      items: [
        { category: '连衣裙', name: '碎花连衣裙', match: 94 },
        { category: '配饰', name: '草编包', match: 88 },
        { category: '鞋履', name: '白色小皮鞋', match: 90 },
      ],
    },
    {
      id: 'mock_d2', name: '甜美浪漫风', tagLabel: '搭配二', tagBg: '#E8D8D0',
      top: '粉色雪纺衫', bottom: '白色百褶裙', accessory: '珍珠项链', shoes: '粉色芭蕾鞋',
      items: [
        { category: '上装', name: '粉色雪纺衫', match: 93 },
        { category: '下装', name: '白色百褶裙', match: 91 },
        { category: '配饰', name: '珍珠项链', match: 89 },
        { category: '鞋履', name: '粉色芭蕾鞋', match: 88 },
      ],
    },
    {
      id: 'mock_d3', name: '优雅晚宴风', tagLabel: '搭配三', tagBg: '#E8DDD4',
      dress: '黑色吊带裙', accessory: '金属耳环 + 手拿包', shoes: '红色高跟鞋',
      items: [
        { category: '连衣裙', name: '黑色吊带裙', match: 95 },
        { category: '配饰', name: '金属耳环', match: 90 },
        { category: '鞋履', name: '红色高跟鞋', match: 92 },
      ],
    },
  ],
  'casual': [
    {
      id: 'mock_ca1', name: '慵懒周末风', tagLabel: '搭配一', tagBg: '#E4E8E0',
      top: '米色卫衣', bottom: '牛仔裤', accessory: '帆布包', shoes: '白色运动鞋',
      items: [
        { category: '上装', name: '米色卫衣', match: 93 },
        { category: '下装', name: '牛仔裤', match: 92 },
        { category: '配饰', name: '帆布包', match: 85 },
        { category: '鞋履', name: '白色运动鞋', match: 91 },
      ],
    },
    {
      id: 'mock_ca2', name: '清新自然风', tagLabel: '搭配二', tagBg: '#E0E4E8',
      top: '白色T恤', bottom: '卡其色短裤', accessory: '棒球帽', shoes: '帆布鞋',
      items: [
        { category: '上装', name: '白色T恤', match: 94 },
        { category: '下装', name: '卡其色短裤', match: 90 },
        { category: '配饰', name: '棒球帽', match: 86 },
        { category: '鞋履', name: '帆布鞋', match: 89 },
      ],
    },
    {
      id: 'mock_ca3', name: '舒适居家风', tagLabel: '搭配三', tagBg: '#E8E0D8',
      top: '条纹针织衫', bottom: '休闲阔腿裤', accessory: '编织腰带', shoes: '穆勒鞋',
      items: [
        { category: '上装', name: '条纹针织衫', match: 91 },
        { category: '下装', name: '休闲阔腿裤', match: 90 },
        { category: '配饰', name: '编织腰带', match: 84 },
        { category: '鞋履', name: '穆勒鞋', match: 88 },
      ],
    },
  ],
  'sport': [
    {
      id: 'mock_s1', name: '元气运动风', tagLabel: '搭配一', tagBg: '#E0E4E8',
      top: '白色卫衣', bottom: '灰色运动裤', accessory: '棒球帽', shoes: '老爹鞋',
      items: [
        { category: '上装', name: '白色卫衣', match: 94 },
        { category: '下装', name: '灰色运动裤', match: 93 },
        { category: '配饰', name: '棒球帽', match: 87 },
        { category: '鞋履', name: '老爹鞋', match: 91 },
      ],
    },
    {
      id: 'mock_s2', name: '活力健身风', tagLabel: '搭配二', tagBg: '#E4E8E0',
      top: '运动背心', bottom: '黑色紧身裤', accessory: '运动手环', shoes: '跑步鞋',
      items: [
        { category: '上装', name: '运动背心', match: 95 },
        { category: '下装', name: '黑色紧身裤', match: 94 },
        { category: '配饰', name: '运动手环', match: 86 },
        { category: '鞋履', name: '跑步鞋', match: 93 },
      ],
    },
    {
      id: 'mock_s3', name: '户外休闲风', tagLabel: '搭配三', tagBg: '#E8DDD4',
      top: '速干POLO衫', bottom: '运动短裤', accessory: '运动腰包', shoes: '越野跑鞋',
      items: [
        { category: '上装', name: '速干POLO衫', match: 92 },
        { category: '下装', name: '运动短裤', match: 91 },
        { category: '配饰', name: '运动腰包', match: 85 },
        { category: '鞋履', name: '越野跑鞋', match: 90 },
      ],
    },
  ],
  'academy': [
    {
      id: 'mock_a1', name: '经典学院风', tagLabel: '搭配一', tagBg: '#E8E0D8',
      top: '格纹衬衫', bottom: '卡其色百褶裙', accessory: '领结', shoes: '棕色牛津鞋',
      items: [
        { category: '上装', name: '格纹衬衫', match: 93 },
        { category: '下装', name: '卡其色百褶裙', match: 91 },
        { category: '配饰', name: '领结', match: 88 },
        { category: '鞋履', name: '棕色牛津鞋', match: 89 },
      ],
    },
    {
      id: 'mock_a2', name: '青春校园风', tagLabel: '搭配二', tagBg: '#E0E4E8',
      top: '连帽卫衣', bottom: '牛仔短裙', accessory: '双肩包', shoes: '白色板鞋',
      items: [
        { category: '上装', name: '连帽卫衣', match: 94 },
        { category: '下装', name: '牛仔短裙', match: 92 },
        { category: '配饰', name: '双肩包', match: 87 },
        { category: '鞋履', name: '白色板鞋', match: 91 },
      ],
    },
    {
      id: 'mock_a3', name: '文艺书卷风', tagLabel: '搭配三', tagBg: '#E8DDD4',
      top: '米色毛衣', bottom: '格纹长裤', accessory: '圆框眼镜', shoes: '乐福鞋',
      items: [
        { category: '上装', name: '米色毛衣', match: 92 },
        { category: '下装', name: '格纹长裤', match: 90 },
        { category: '配饰', name: '圆框眼镜', match: 85 },
        { category: '鞋履', name: '乐福鞋', match: 89 },
      ],
    },
  ],
  'vintage': [
    {
      id: 'mock_v1', name: '港式复古风', tagLabel: '搭配一', tagBg: '#E8D8D0',
      top: '牛仔外套', bottom: '高腰阔腿裤', accessory: '金属耳环', shoes: '马丁靴',
      items: [
        { category: '上装', name: '牛仔外套', match: 94 },
        { category: '下装', name: '高腰阔腿裤', match: 92 },
        { category: '配饰', name: '金属耳环', match: 88 },
        { category: '鞋履', name: '马丁靴', match: 91 },
      ],
    },
    {
      id: 'mock_v2', name: '法式复古风', tagLabel: '搭配二', tagBg: '#E8DDD4',
      dress: '波点连衣裙', accessory: '贝雷帽 + 腰带', shoes: '玛丽珍鞋',
      items: [
        { category: '连衣裙', name: '波点连衣裙', match: 95 },
        { category: '配饰', name: '贝雷帽', match: 90 },
        { category: '鞋履', name: '玛丽珍鞋', match: 92 },
      ],
    },
    {
      id: 'mock_v3', name: '美式复古风', tagLabel: '搭配三', tagBg: '#E8E0D8',
      top: '格纹西装', bottom: '直筒牛仔裤', accessory: '丝巾', shoes: '切尔西靴',
      items: [
        { category: '上装', name: '格纹西装', match: 93 },
        { category: '下装', name: '直筒牛仔裤', match: 91 },
        { category: '配饰', name: '丝巾', match: 87 },
        { category: '鞋履', name: '切尔西靴', match: 90 },
      ],
    },
  ],
};

// 默认搭配（AI调用失败时降级使用）
var DEFAULT_OUTFITS = [
  {
    id: 'mock_def1', name: '温柔通勤风', tagLabel: '搭配一', tagBg: '#E8DDD4',
    top: '米白色针织衫', bottom: '卡其色阔腿裤', accessory: '珍珠耳环', shoes: '裸色单鞋',
    items: [
      { category: '上装', name: '米白色针织衫', match: 95 },
      { category: '下装', name: '卡其色阔腿裤', match: 92 },
      { category: '配饰', name: '珍珠耳环', match: 88 },
      { category: '鞋履', name: '裸色单鞋', match: 90 },
    ],
  },
  {
    id: 'mock_def2', name: '法式约会风', tagLabel: '搭配二', tagBg: '#F0E4E8',
    dress: '碎花连衣裙', accessory: '草编包 + 发带', shoes: '白色小皮鞋',
    items: [
      { category: '连衣裙', name: '碎花连衣裙', match: 94 },
      { category: '配饰', name: '草编包', match: 88 },
      { category: '鞋履', name: '白色小皮鞋', match: 90 },
    ],
  },
  {
    id: 'mock_def3', name: '元气运动风', tagLabel: '搭配三', tagBg: '#E0E4E8',
    top: '白色卫衣', bottom: '灰色运动裤', accessory: '棒球帽', shoes: '老爹鞋',
    items: [
      { category: '上装', name: '白色卫衣', match: 94 },
      { category: '下装', name: '灰色运动裤', match: 93 },
      { category: '配饰', name: '棒球帽', match: 87 },
      { category: '鞋履', name: '老爹鞋', match: 91 },
    ],
  },
];

// AI 系统提示词
var AI_SYSTEM_PROMPT = '你是一位专业的AI穿搭顾问。请根据用户提供的风格需求，推荐3套完整的服装搭配。每套搭配需要包含：上装/连衣裙、下装（如有）、配饰、鞋履。请用JSON格式返回，格式如下：{"outfits":[{"name":"搭配名称","items":[{"category":"上装","name":"单品名称"},{"category":"下装","name":"单品名称"},{"category":"配饰","name":"单品名称"},{"category":"鞋履","name":"单品名称"}]}]}。category只能是：上装、下装、连衣裙、外套、配饰、鞋履。请确保搭配风格统一、实用性强。【重要】所有输出内容（包括搭配名称、单品名称、颜色、风格、材质描述等）必须全部使用简体中文，严禁出现任何英文单词、英文字母、拼音缩写（例如禁止出现 beige、minimal、casual、business、gray 等英文），颜色用“米色、极简、休闲、商务、灰色”等中文表达。';

Page({
  data: {
    // 系统信息
    statusBarHeight: 44,
    navPadHeight: 88,
    navBarHeight: 44,

    // 主题
    isDark: false,

    // 页面状态: 'input' | 'loading' | 'streaming' | 'results'
    pageState: 'input',

    // 气泡文案
    bubbleText: '今天想穿什么风格呢？',

    // 风格输入
    styleInput: '',

    // 快捷标签
    quickTags: QUICK_TAGS,
    selectedQuickTag: '',

    // 流式输出内容
    streamingText: '',
    streamingThink: '',

    // 推荐结果
    recommendations: [],

    // AI调用状态
    aiError: false,
    aiErrorMsg: '',
  },

  onLoad: function () {
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

  /* ============ 输入处理 ============ */
  onInputStyle: function (e) {
    this.setData({
      styleInput: e.detail.value,
      selectedQuickTag: '',
    });
  },

  /* ============ 快捷标签选择 ============ */
  onQuickTagTap: function (e) {
    var key = e.currentTarget.dataset.key;
    var label = e.currentTarget.dataset.label;

    this.setData({
      selectedQuickTag: key,
      styleInput: label,
    });

    wx.vibrateShort({ type: 'light' });

    // 自动触发推荐
    this._startRecommend(label, key);
  },

  /* ============ AI 推荐按钮 ============ */
  onAiRecommend: function () {
    if (!this.data.styleInput) {
      wx.showToast({ title: '请先输入风格', icon: 'none' });
      return;
    }
    this._startRecommend(this.data.styleInput, this.data.selectedQuickTag);
  },

  /* ============ 开始推荐流程 ============ */
  _startRecommend: function (inputText, quickTagKey) {
    var self = this;

    self.setData({
      pageState: 'loading',
      bubbleText: 'AI 正在为你搭配...',
      streamingText: '',
      streamingThink: '',
      aiError: false,
      aiErrorMsg: '',
      recommendations: [],
    });

    wx.vibrateShort({ type: 'light' });

    // 先展示加载动画，然后调用AI
    setTimeout(function () {
      self._callAiModel(inputText, quickTagKey);
    }, 600);
  },

  /* ============ 调用 AI 搭配推荐（通过云函数） ============ */
  _callAiModel: function (inputText, quickTagKey) {
    var self = this;

    // 构建衣物上下文
    var clothesContext = '';
    var clothes = wx.getStorageSync(CLOTHES_LIST_KEY) || [];
    if (clothes.length > 0) {
      clothesContext = self._buildClothesContext(clothes);
    }

    // 切换到流式输出状态（展示思考动画）
    self.setData({
      pageState: 'streaming',
      bubbleText: 'AI 正在思考...',
      streamingText: '',
      streamingThink: '',
    });

    // 调用云函数
    recommendOutfit(inputText, clothesContext).then(function (result) {
      if (result && result.outfits && Array.isArray(result.outfits) && result.outfits.length > 0) {
        // 成功获取AI推荐
        self._parseAiOutfits(result.outfits, inputText, quickTagKey);
      } else {
        console.warn('[AI] 云函数返回无效数据，降级到模拟数据');
        self._fallbackToMock(inputText, quickTagKey);
      }
    }).catch(function (err) {
      console.error('[AI] 云函数调用失败:', err);
      self.setData({
        aiError: true,
        aiErrorMsg: 'AI服务暂时不可用',
      });
      self._fallbackToMock(inputText, quickTagKey);
    });

    // 超时保护（12秒）
    setTimeout(function () {
      if (self.data.pageState === 'streaming') {
        console.warn('[AI] 云函数调用超时，降级到模拟数据');
        self._fallbackToMock(inputText, quickTagKey);
      }
    }, 12000);
  },

  /* ============ 解析AI返回的搭配数据 ============ */
  _parseAiOutfits: function (outfits, inputText, quickTagKey) {
    var self = this;

    try {
      var tagLabels = ['搭配一', '搭配二', '搭配三'];
      var tagBgs = ['#E8DDD4', '#F0E4E8', '#E0E4E8'];
      var result = [];

      for (var i = 0; i < outfits.length && i < 3; i++) {
        var o = outfits[i];
        var outfit = {
          id: 'ai_' + Date.now() + '_' + i,
          name: o.name || ('推荐搭配' + (i + 1)),
          tagLabel: tagLabels[i],
          tagBg: tagBgs[i],
          items: [],
        };

        if (o.items && Array.isArray(o.items)) {
          for (var j = 0; j < o.items.length; j++) {
            var item = o.items[j];
            var category = item.category || '单品';
            var name = item.name || '未知单品';
            var matchScore = item.match || (85 + Math.floor(Math.random() * 12));

            outfit.items.push({
              category: category,
              name: name,
              match: matchScore,
            });

            // 填充快捷字段
            var catKey = self._getCategoryKey(category);
            if (catKey === 'top') outfit.top = name;
            else if (catKey === 'bottom') outfit.bottom = name;
            else if (catKey === 'dress') {
              // 连衣裙同时算作上装，确保上装行有内容显示
              outfit.dress = name;
              outfit.top = name;
            }
            else if (catKey === 'accessory') outfit.accessory = name;
            else if (catKey === 'shoes') outfit.shoes = name;
          }
        }

        if (outfit.items.length > 0) {
          result.push(outfit);
        }
      }

      if (result.length === 0) {
        self._fallbackToMock(inputText, quickTagKey);
        return;
      }

      self.setData({
        pageState: 'results',
        bubbleText: '为你推荐以下' + result.length + '套搭配',
        recommendations: result,
      });
      wx.vibrateShort({ type: 'medium' });

    } catch (e) {
      console.error('[AI] 解析搭配数据失败:', e);
      self._fallbackToMock(inputText, quickTagKey);
    }
  },

  /* ============ 构建衣物上下文描述 ============ */
  _buildClothesContext: function (clothes) {
    var items = [];
    var maxItems = 20; // 最多描述20件衣物
    var count = Math.min(clothes.length, maxItems);

    // 英文 -> 中文 映射表（防止 AI 输出英文）
    var CAT_MAP = { top: '上装', bottom: '下装', dress: '连衣裙', outer: '外套', shoes: '鞋靴', accessory: '配饰' };
    var COLOR_MAP = {
      white: '白色', black: '黑色', gray: '灰色', blue: '蓝色', navy: '藏青色',
      red: '红色', pink: '粉色', yellow: '黄色', green: '绿色', brown: '棕色',
      beige: '米色', purple: '紫色', orange: '橙色', khaki: '卡其色',
    };
    var STYLE_MAP = {
      casual: '休闲', business: '商务', sweet: '甜美', cool: '酷飒', vintage: '复古',
      street: '街头', minimal: '极简', sport: '运动', formal: '正式', elegant: '优雅',
    };
    var MATERIAL_MAP = {
      cotton: '棉', linen: '麻', silk: '丝绸', wool: '羊毛', polyester: '涤纶',
      denim: '牛仔', leather: '皮革', cashmere: '羊绒', nylon: '尼龙', velvet: '丝绒',
    };
    var SEASON_MAP = { spring: '春季', summer: '夏季', autumn: '秋季', fall: '秋季', winter: '冬季' };

    function translate(arr, map) {
      if (!arr || !arr.length) return [];
      var out = [];
      for (var k = 0; k < arr.length; k++) {
        var v = arr[k];
        out.push(map[v] || v);
      }
      return out;
    }

    for (var i = 0; i < count; i++) {
      var c = clothes[i];
      var desc = '';

      // 类别
      if (c.tags && c.tags.category) {
        desc += (CAT_MAP[c.tags.category] || c.tags.category);
      }

      // 颜色
      if (c.tags && c.tags.color && c.tags.color.length > 0) {
        desc += '（' + translate(c.tags.color, COLOR_MAP).join('、') + '）';
      }

      // 风格
      if (c.tags && c.tags.style && c.tags.style.length > 0) {
        desc += '，风格：' + translate(c.tags.style, STYLE_MAP).join('、');
      }

      // 材质
      if (c.tags && c.tags.material && c.tags.material.length > 0) {
        desc += '，材质：' + translate(c.tags.material, MATERIAL_MAP).join('、');
      }

      // 季节
      if (c.tags && c.tags.season && c.tags.season.length > 0) {
        desc += '，季节：' + translate(c.tags.season, SEASON_MAP).join('、');
      }

      // 备注
      if (c.note) {
        desc += '，备注：' + c.note;
      }

      if (desc) {
        items.push(desc);
      }
    }

    return items.join('；');
  },



  /* ============ 获取类别key ============ */
  _getCategoryKey: function (label) {
    var map = {
      '上装': 'top',
      '下装': 'bottom',
      '连衣裙': 'dress',
      '外套': 'outer',
      '鞋履': 'shoes',
      '鞋靴': 'shoes',
      '配饰': 'accessory',
    };
    return map[label] || '';
  },

  /* ============ 降级到模拟数据 ============ */
  _fallbackToMock: function (inputText, quickTagKey) {
    var self = this;
    var outfits = null;

    if (quickTagKey && MOCK_OUTFITS[quickTagKey]) {
      outfits = MOCK_OUTFITS[quickTagKey];
    } else {
      for (var key in MOCK_OUTFITS) {
        if (inputText.indexOf(key) >= 0) {
          outfits = MOCK_OUTFITS[key];
          break;
        }
      }
    }

    if (!outfits) {
      outfits = DEFAULT_OUTFITS;
    }

    var copied = outfits.map(function (o) {
      return Object.assign({}, o);
    });

    self.setData({
      pageState: 'results',
      bubbleText: '为你推荐以下' + copied.length + '套搭配',
      recommendations: copied,
    });
    wx.vibrateShort({ type: 'medium' });
  },

  /* ============ 点击搭配卡片 ============ */
  onOutfitTap: function (e) {
    var idx = e.currentTarget.dataset.index;
    var outfit = this.data.recommendations[idx];
    if (!outfit) return;

    wx.vibrateShort({ type: 'light' });

    var outfitStr = encodeURIComponent(JSON.stringify(outfit));
    wx.navigateTo({
      url: '/pages/ai-match/detail?outfit=' + outfitStr,
    });
  },

  /* ============ 重新搭配 ============ */
  onRecommendAgain: function () {
    this.setData({
      pageState: 'input',
      bubbleText: '今天想穿什么风格呢？',
      styleInput: '',
      selectedQuickTag: '',
      streamingText: '',
      streamingThink: '',
      recommendations: [],
      aiError: false,
      aiErrorMsg: '',
    });
    wx.vibrateShort({ type: 'light' });
  },
});
