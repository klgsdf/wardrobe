// pages/add-cloth/add-cloth.js - 添加衣物页面
var THEME_KEY = 'wardrobe_theme';
var CLOTHES_LIST_KEY = 'clothes_list';
var WARDROBE_LIST_KEY = 'wardrobe_list';
var AUTO_AI_KEY = 'auto_ai_recognize';

var { CATEGORIES, COLORS, SEASONS, STYLES, OCCASIONS } = require('../../config.js');
var { uploadImage, recognizeImage } = require('../../utils/api.js');

// 材质选项
var MATERIALS = [
  { key: 'cotton', label: '棉' },
  { key: 'linen', label: '麻' },
  { key: 'silk', label: '丝' },
  { key: 'wool', label: '羊毛' },
  { key: 'polyester', label: '涤纶' },
  { key: 'denim', label: '牛仔' },
  { key: 'leather', label: '皮革' },
  { key: 'cashmere', label: '羊绒' },
  { key: 'nylon', label: '尼龙' },
  { key: 'velvet', label: '丝绒' },
];

// 构建标签 key -> label 映射表
function buildMap(options) {
  var map = {};
  for (var i = 0; i < options.length; i++) {
    map[options[i].key] = options[i].label;
  }
  return map;
}

// 构建颜色 key -> hex 映射表
function buildHexMap(colors) {
  var map = {};
  for (var i = 0; i < colors.length; i++) {
    map[colors[i].key] = colors[i].hex;
  }
  return map;
}

var categoryMap = buildMap(CATEGORIES);
var seasonMap = buildMap(SEASONS);
var styleMap = buildMap(STYLES);
var occasionMap = buildMap(OCCASIONS);
var materialMap = buildMap(MATERIALS);
var colorHexMap = buildHexMap(COLORS);

// 生成唯一ID
function genId() {
  return 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    isDark: false,

    // 图片相关
    images: [],
    maxImages: 5,

    // 标签数据
    tags: {
      color: [],
      category: '',
      season: [],
      style: [],
      material: [],
      occasion: [],
    },

    // 可选标签源
    colorOptions: COLORS,
    categoryOptions: CATEGORIES,
    seasonOptions: SEASONS,
    styleOptions: STYLES,
    materialOptions: MATERIALS,
    occasionOptions: OCCASIONS,

    // 标签映射表（用于 wxml 显示）
    categoryMap: categoryMap,
    seasonMap: seasonMap,
    styleMap: styleMap,
    occasionMap: occasionMap,
    materialMap: materialMap,
    colorHexMap: colorHexMap,

    // 折叠面板状态
    expandedPanels: {
      category: false,
      color: false,
      season: false,
      style: false,
      material: false,
      occasion: false,
    },

    // 已选标签摘要
    hasSelectedTags: false,
    selectedTagSummary: '',

    // 各面板预览文本
    tagPreviews: {
      category: '',
      color: '',
      season: '',
      style: '',
      material: '',
      occasion: '',
    },

    // AI 识别
    aiRecognizing: false,
    aiResult: null,
    autoAiEnabled: false,

    // 自定义输入
    customColor: '',
    customMaterial: '',

    // 备注
    note: '',

    // 保存中
    saving: false,

    // 存放选择弹窗
    showStorePicker: false,
    storePickerStep: 'wardrobe', // 'wardrobe' | 'zone'
    storePickerWardrobes: [],
    storePickerSelectedWardrobe: null,
    storePickerZones: [],
    pendingCloth: null, // 待存放的衣物数据
  },

  onLoad: function (options) {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44 });
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    var navPadHeight = statusBarHeight + 44;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    var autoAi = wx.getStorageSync(AUTO_AI_KEY) || false;

    this.setData({
      statusBarHeight: statusBarHeight,
      navPadHeight: navPadHeight,
      isDark: theme === 'dark',
      autoAiEnabled: autoAi,
    });

    // 如果外部传入图片路径（从 tabBar 跳转时）
    if (options.tempFilePath) {
      this.setData({
        images: [{ url: options.tempFilePath, status: 'local' }],
      });
      if (autoAi) {
        this._triggerAiRecognize(options.tempFilePath);
      }
    }

    this._updateTagSummary();
  },

  onShow: function () {
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }
  },

  // ===== 图片上传 =====
  onChooseImage: function () {
    var self = this;
    var remain = this.data.maxImages - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传' + this.data.maxImages + '张', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: function (res) {
        if (res.tapIndex === 0) {
          self._chooseMedia(['camera'], remain);
        } else {
          self._chooseMedia(['album'], remain);
        }
      },
    });
  },

  _chooseMedia: function (sourceType, count) {
    var self = this;
    wx.chooseMedia({
      count: count,
      mediaType: ['image'],
      sourceType: sourceType,
      success: function (res) {
        var newImages = res.tempFiles.map(function (f) {
          return { url: f.tempFilePath, status: 'local' };
        });
        var images = self.data.images.concat(newImages);
        self.setData({ images: images });
        // 自动 AI 识别（取第一张新图）
        if (self.data.autoAiEnabled && newImages.length > 0) {
          self._triggerAiRecognize(newImages[0].url);
        }
      },
    });
  },

  onPreviewImage: function (e) {
    var idx = e.currentTarget.dataset.index;
    var urls = this.data.images.map(function (img) { return img.url; });
    wx.previewImage({
      current: urls[idx],
      urls: urls,
    });
  },

  onRemoveImage: function (e) {
    var idx = e.currentTarget.dataset.index;
    var images = this.data.images.slice();
    images.splice(idx, 1);
    this.setData({ images: images });
    wx.vibrateShort({ type: 'light' });
  },

  // ===== 折叠面板 =====
  onTogglePanel: function (e) {
    var panel = e.currentTarget.dataset.panel;
    var expanded = this.data.expandedPanels;
    var next = {};
    for (var k in expanded) {
      next[k] = (k === panel) ? !expanded[k] : false;
    }
    this.setData({ expandedPanels: next });
    wx.vibrateShort({ type: 'light' });
  },

  // 更新已选标签摘要和各面板预览文本
  _updateTagSummary: function () {
    var tags = this.data.tags;
    var count = 0;
    if (tags.category) { count++; }
    if (tags.color.length > 0) { count++; }
    if (tags.season.length > 0) { count++; }
    if (tags.style.length > 0) { count++; }
    if (tags.material.length > 0) { count++; }
    if (tags.occasion.length > 0) { count++; }

    var colorPreview = '';
    for (var i = 0; i < tags.color.length; i++) {
      var c = tags.color[i];
      var label = colorHexMap[c] ? c : c;
      colorPreview += (i > 0 ? '、' : '') + label;
    }

    var seasonPreview = '';
    for (var j = 0; j < tags.season.length; j++) {
      seasonPreview += (j > 0 ? '、' : '') + seasonMap[tags.season[j]];
    }

    var stylePreview = '';
    for (var k = 0; k < tags.style.length; k++) {
      stylePreview += (k > 0 ? '、' : '') + styleMap[tags.style[k]];
    }

    var materialPreview = '';
    for (var m = 0; m < tags.material.length; m++) {
      var mat = tags.material[m];
      materialPreview += (m > 0 ? '、' : '') + (materialMap[mat] || mat);
    }

    var occasionPreview = '';
    for (var n = 0; n < tags.occasion.length; n++) {
      occasionPreview += (n > 0 ? '、' : '') + occasionMap[tags.occasion[n]];
    }

    var summary = count > 0 ? ('已选 ' + count + ' 项') : '';
    this.setData({
      hasSelectedTags: count > 0,
      selectedTagSummary: summary,
      tagPreviews: {
        category: tags.category ? categoryMap[tags.category] : '',
        color: colorPreview,
        season: seasonPreview,
        style: stylePreview,
        material: materialPreview,
        occasion: occasionPreview,
      },
    });
  },

  // ===== 标签选择 =====
  onToggleColor: function (e) {
    var key = e.currentTarget.dataset.key;
    var colors = this.data.tags.color.slice();
    var idx = colors.indexOf(key);
    if (idx >= 0) {
      colors.splice(idx, 1);
    } else {
      colors.push(key);
    }
    this.setData({ 'tags.color': colors });
    this._updateTagSummary();
    wx.vibrateShort({ type: 'light' });
  },

  onCustomColorInput: function (e) {
    this.setData({ customColor: e.detail.value });
  },

  onAddCustomColor: function () {
    var val = (this.data.customColor || '').trim();
    if (!val) return;
    var colors = this.data.tags.color.slice();
    if (colors.indexOf(val) < 0) {
      colors.push(val);
      this.setData({
        'tags.color': colors,
        customColor: '',
      });
      this._updateTagSummary();
      wx.vibrateShort({ type: 'light' });
    }
  },

  onSelectCategory: function (e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ 'tags.category': key });
    this._updateTagSummary();
    wx.vibrateShort({ type: 'light' });
  },

  onToggleSeason: function (e) {
    var key = e.currentTarget.dataset.key;
    var seasons = this.data.tags.season.slice();
    var idx = seasons.indexOf(key);
    if (idx >= 0) {
      seasons.splice(idx, 1);
    } else {
      seasons.push(key);
    }
    this.setData({ 'tags.season': seasons });
    this._updateTagSummary();
    wx.vibrateShort({ type: 'light' });
  },

  onToggleStyle: function (e) {
    var key = e.currentTarget.dataset.key;
    var styles = this.data.tags.style.slice();
    var idx = styles.indexOf(key);
    if (idx >= 0) {
      styles.splice(idx, 1);
    } else {
      styles.push(key);
    }
    this.setData({ 'tags.style': styles });
    this._updateTagSummary();
    wx.vibrateShort({ type: 'light' });
  },

  onToggleMaterial: function (e) {
    var key = e.currentTarget.dataset.key;
    var materials = this.data.tags.material.slice();
    var idx = materials.indexOf(key);
    if (idx >= 0) {
      materials.splice(idx, 1);
    } else {
      materials.push(key);
    }
    this.setData({ 'tags.material': materials });
    this._updateTagSummary();
    wx.vibrateShort({ type: 'light' });
  },

  onCustomMaterialInput: function (e) {
    this.setData({ customMaterial: e.detail.value });
  },

  onAddCustomMaterial: function () {
    var val = (this.data.customMaterial || '').trim();
    if (!val) return;
    var materials = this.data.tags.material.slice();
    if (materials.indexOf(val) < 0) {
      materials.push(val);
      this.setData({
        'tags.material': materials,
        customMaterial: '',
      });
      this._updateTagSummary();
      wx.vibrateShort({ type: 'light' });
    }
  },

  onToggleOccasion: function (e) {
    var key = e.currentTarget.dataset.key;
    var occasions = this.data.tags.occasion.slice();
    var idx = occasions.indexOf(key);
    if (idx >= 0) {
      occasions.splice(idx, 1);
    } else {
      occasions.push(key);
    }
    this.setData({ 'tags.occasion': occasions });
    this._updateTagSummary();
    wx.vibrateShort({ type: 'light' });
  },

  // ===== AI 识别 =====
  onToggleAutoAi: function () {
    var next = !this.data.autoAiEnabled;
    wx.setStorageSync(AUTO_AI_KEY, next);
    this.setData({ autoAiEnabled: next });
    wx.vibrateShort({ type: 'light' });
  },

  onAiRecognize: function () {
    var images = this.data.images;
    if (images.length === 0) {
      wx.showToast({ title: '请先上传图片', icon: 'none' });
      return;
    }
    this._triggerAiRecognize(images[0].url);
  },

  _triggerAiRecognize: function (imageUrl) {
    var self = this;
    this.setData({ aiRecognizing: true, aiResult: null });

    // 本地临时文件需先上传云存储，获取 fileID 后再进行 AI 识别
    var isLocal = imageUrl.indexOf('http://tmp') === 0 || imageUrl.indexOf('wxfile://') === 0;

    // 设置整体超时保护（8秒），避免云函数未部署时长时间等待
    var timeoutId = setTimeout(function () {
      console.warn('[AI识别] 整体流程超时，降级到模拟');
      self._fallbackMockRecognize();
    }, 8000);

    var recognize = function (url) {
      console.log('[AI识别] 开始识别，图片URL:', url);
      recognizeImage(url).then(function (result) {
        clearTimeout(timeoutId);
        console.log('[AI识别] 返回结果:', JSON.stringify(result));
        if (result && result.tags && result.tags.length > 0) {
          var parsed = self._parseAiTags(result.tags);
          self.setData({
            aiRecognizing: false,
            aiResult: parsed,
            tags: {
              color: parsed.color || [],
              category: parsed.category || '',
              season: parsed.season || [],
              style: parsed.style || [],
              material: parsed.material || [],
              occasion: parsed.occasion || [],
            },
          });
          self._updateTagSummary();
          wx.vibrateShort({ type: 'medium' });
          wx.showToast({ title: 'AI 识别完成', icon: 'none', duration: 1200 });
        } else {
          console.warn('[AI识别] 结果为空或无标签，降级到模拟:', result);
          self._fallbackMockRecognize();
        }
      }).catch(function (err) {
        clearTimeout(timeoutId);
        console.error('[AI识别] 接口调用失败，降级到模拟:', err);
        self._fallbackMockRecognize();
      });
    };

    if (isLocal) {
      uploadImage(imageUrl, 'clothes').then(function (fileID) {
        if (fileID) {
          recognize(fileID);
        } else {
          clearTimeout(timeoutId);
          console.warn('[AI识别] 图片上传失败，降级到模拟');
          self._fallbackMockRecognize();
        }
      }).catch(function (err) {
        clearTimeout(timeoutId);
        console.warn('[AI识别] 图片上传异常，降级到模拟:', err);
        self._fallbackMockRecognize();
      });
    } else {
      recognize(imageUrl);
    }
  },

  // 解析腾讯云 AI 返回的标签
  _parseAiTags: function (tags) {
    var colorMap = {
      '白色': 'white', '黑色': 'black', '灰色': 'gray', '蓝色': 'blue',
      '藏青': 'navy', '红色': 'red', '粉色': 'pink', '黄色': 'yellow',
      '绿色': 'green', '棕色': 'brown', '米色': 'beige', '紫色': 'purple',
      '橙色': 'orange', '橙红': 'orange', '橙黄': 'orange',
      '卡其色': 'beige', '裸色': 'beige',
    };
    var categoryMap = {
      '连衣裙': 'dress', '裙子': 'dress',
      '外套': 'outer', '大衣': 'outer', '羽绒服': 'outer',
      '牛仔裤': 'bottom', '裤子': 'bottom',
      '运动鞋': 'shoes', '高跟鞋': 'shoes', '鞋': 'shoes',
      '卫衣': 'top', '衬衫': 'top', 'T恤': 'top', '上衣': 'top',
      '包': 'accessory', '帽子': 'accessory', '围巾': 'accessory',
    };
    var seasonMap = {
      '春季': 'spring', '夏季': 'summer', '秋季': 'autumn', '冬季': 'winter',
    };
    var styleMap = {
      '休闲': 'casual', '商务': 'business', '甜美': 'sweet', '酷': 'cool',
      '复古': 'vintage', '街头': 'street', '简约': 'minimal', '运动': 'sport',
    };
    var materialMap = {
      '棉': 'cotton', '麻': 'linen', '丝': 'silk', '羊毛': 'wool',
      '涤纶': 'polyester', '牛仔': 'denim', '皮革': 'leather',
      '羊绒': 'cashmere', '尼龙': 'nylon', '丝绒': 'velvet',
    };

    var parsed = { color: [], category: '', season: [], style: [], material: [], occasion: [] };

    for (var i = 0; i < tags.length; i++) {
      var tagName = tags[i].name || tags[i].label || '';
      if (!tagName) continue;

      // 匹配颜色
      for (var cn in colorMap) {
        if (tagName.indexOf(cn) >= 0 && parsed.color.indexOf(colorMap[cn]) < 0) {
          parsed.color.push(colorMap[cn]);
        }
      }
      // 匹配类别
      if (!parsed.category) {
        for (var c in categoryMap) {
          if (tagName.indexOf(c) >= 0) { parsed.category = categoryMap[c]; break; }
        }
      }
      // 匹配季节
      for (var s in seasonMap) {
        if (tagName.indexOf(s) >= 0 && parsed.season.indexOf(seasonMap[s]) < 0) {
          parsed.season.push(seasonMap[s]);
        }
      }
      // 匹配风格
      for (var st in styleMap) {
        if (tagName.indexOf(st) >= 0 && parsed.style.indexOf(styleMap[st]) < 0) {
          parsed.style.push(styleMap[st]);
        }
      }
      // 匹配材质
      for (var m in materialMap) {
        if (tagName.indexOf(m) >= 0 && parsed.material.indexOf(materialMap[m]) < 0) {
          parsed.material.push(materialMap[m]);
        }
      }
    }

    return parsed;
  },

  // 降级：模拟识别
  _fallbackMockRecognize: function () {
    var self = this;
    // 如果已经在非识别状态，避免重复执行
    if (!self.data.aiRecognizing && self.data.aiResult) return;
    setTimeout(function () {
      var mockResult = self._mockAiResult();
      self.setData({
        aiRecognizing: false,
        aiResult: mockResult,
        tags: {
          color: mockResult.color || [],
          category: mockResult.category || '',
          season: mockResult.season || [],
          style: mockResult.style || [],
          material: mockResult.material || [],
          occasion: mockResult.occasion || [],
        },
      });
      self._updateTagSummary();
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: 'AI 识别完成（演示模式）', icon: 'none', duration: 1200 });
    }, 400);
  },

  _mockAiResult: function () {
    var mockPool = [
      {
        color: ['blue', 'white'],
        category: 'top',
        season: ['spring', 'summer'],
        style: ['casual'],
        material: ['cotton'],
        occasion: ['daily'],
      },
      {
        color: ['black'],
        category: 'bottom',
        season: ['autumn', 'winter'],
        style: ['business'],
        material: ['wool'],
        occasion: ['work'],
      },
      {
        color: ['beige', 'brown'],
        category: 'outer',
        season: ['autumn', 'winter'],
        style: ['minimal'],
        material: ['wool'],
        occasion: ['daily', 'work'],
      },
    ];
    return mockPool[Math.floor(Math.random() * mockPool.length)];
  },

  onClearAiResult: function () {
    this.setData({ aiResult: null });
  },

  // ===== 备注 =====
  onNoteInput: function (e) {
    this.setData({ note: e.detail.value });
  },

  // ===== 保存 =====
  onSave: function () {
    var self = this;
    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none' });
      return;
    }
    if (!this.data.tags.category) {
      wx.showToast({ title: '请选择衣物类别', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    // 上传图片到云存储
    this._uploadAllImages().then(function (cloudUrls) {
      var cloth = {
        id: genId(),
        images: cloudUrls,
        tags: self.data.tags,
        note: (self.data.note || '').trim(),
        createdAt: Date.now(),
        wardrobeId: '',
        zoneId: '',
      };

      // 检查是否有衣柜数据
      var wardrobes = wx.getStorageSync(WARDROBE_LIST_KEY) || [];
      if (!wardrobes || wardrobes.length === 0) {
        // 无衣柜，直接保存不关联
        self._finalizeSave(cloth);
        return;
      }

      // 有待选衣柜，弹出存放选择
      self.setData({
        saving: false,
        showStorePicker: true,
        storePickerStep: 'wardrobe',
        storePickerWardrobes: wardrobes,
        storePickerSelectedWardrobe: null,
        storePickerZones: [],
        pendingCloth: cloth,
      });
    }).catch(function (err) {
      self.setData({ saving: false });
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    });
  },

  // 最终保存衣物
  _finalizeSave: function (cloth, wardrobeId, zoneId) {
    var self = this;
    if (wardrobeId) cloth.wardrobeId = wardrobeId;
    if (zoneId) cloth.zoneId = zoneId;

    // 存入衣物列表
    var list = wx.getStorageSync(CLOTHES_LIST_KEY) || [];
    list.unshift(cloth);
    wx.setStorageSync(CLOTHES_LIST_KEY, list);

    // 更新衣柜分区的衣物计数
    if (wardrobeId && zoneId) {
      self._updateZoneCount(wardrobeId, zoneId, 1);
    }

    self.setData({
      saving: false,
      showStorePicker: false,
      storePickerStep: 'wardrobe',
      storePickerSelectedWardrobe: null,
      pendingCloth: null,
    });
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: '添加成功', icon: 'success', duration: 1200 });
    setTimeout(function () {
      wx.navigateBack();
    }, 1200);
  },

  // 更新指定分区的衣物计数
  _updateZoneCount: function (wardrobeId, zoneId, delta) {
    var wardrobes = wx.getStorageSync(WARDROBE_LIST_KEY) || [];
    for (var i = 0; i < wardrobes.length; i++) {
      if (wardrobes[i].id === wardrobeId) {
        var zones = wardrobes[i].zones || [];
        for (var j = 0; j < zones.length; j++) {
          if (zones[j].id === zoneId) {
            zones[j].count = (zones[j].count || 0) + delta;
            break;
          }
        }
        wardrobes[i].zones = zones;
        wardrobes[i].itemCount = (wardrobes[i].itemCount || 0) + delta;
        break;
      }
    }
    wx.setStorageSync(WARDROBE_LIST_KEY, wardrobes);
  },

  // ===== 存放选择弹窗 =====
  onStorePickerSelectWardrobe: function (e) {
    var wardrobeId = e.currentTarget.dataset.id;
    var wardrobe = null;
    for (var i = 0; i < this.data.storePickerWardrobes.length; i++) {
      if (this.data.storePickerWardrobes[i].id === wardrobeId) {
        wardrobe = this.data.storePickerWardrobes[i];
        break;
      }
    }
    if (!wardrobe) return;
    this.setData({
      storePickerStep: 'zone',
      storePickerSelectedWardrobe: wardrobe,
      storePickerZones: wardrobe.zones || [],
    });
    wx.vibrateShort({ type: 'light' });
  },

  onStorePickerSelectZone: function (e) {
    var zoneId = e.currentTarget.dataset.id;
    var wardrobe = this.data.storePickerSelectedWardrobe;
    this._finalizeSave(this.data.pendingCloth, wardrobe.id, zoneId);
    wx.vibrateShort({ type: 'medium' });
  },

  onStorePickerBack: function () {
    this.setData({
      storePickerStep: 'wardrobe',
      storePickerSelectedWardrobe: null,
      storePickerZones: [],
    });
    wx.vibrateShort({ type: 'light' });
  },

  onStorePickerSkip: function () {
    this._finalizeSave(this.data.pendingCloth);
  },

  onStorePickerClose: function () {
    this.setData({
      showStorePicker: false,
      storePickerStep: 'wardrobe',
      storePickerSelectedWardrobe: null,
      storePickerZones: [],
      pendingCloth: null,
    });
  },

  onStorePickerPreventBubble: function () {
    // 阻止事件冒泡到 overlay
  },

  _uploadAllImages: function () {
    var self = this;
    var promises = this.data.images.map(function (img) {
      if (img.status === 'cloud') {
        return Promise.resolve(img.url);
      }
      return uploadImage(img.url, 'clothes').then(function (fileID) {
        return fileID || img.url;
      });
    });
    return Promise.all(promises);
  },

  // ===== 返回 =====
  onBack: function () {
    var self = this;
    if (this.data.images.length > 0 || this.data.tags.category) {
      wx.showModal({
        title: '确认退出',
        content: '当前内容未保存，确定要退出吗？',
        confirmText: '退出',
        success: function (res) {
          if (res.confirm) {
            wx.navigateBack();
          }
        },
      });
    } else {
      wx.navigateBack();
    }
  },

  // ===== 切换主题 =====
  onToggleTheme: function () {
    var next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    wx.vibrateShort({ type: 'light' });
  },
});
