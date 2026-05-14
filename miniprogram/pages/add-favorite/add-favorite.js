// pages/add-favorite/add-favorite.js - 添加收藏页面
var THEME_KEY = 'wardrobe_theme';
var FAVORITE_KEY = 'outfit_favorites';

// 搭配标签选项
var STYLE_TAGS = [
  { key: 'commute', label: '通勤' },
  { key: 'date', label: '约会' },
  { key: 'sport', label: '运动' },
  { key: 'casual', label: '休闲' },
  { key: 'vintage', label: '复古' },
];

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    isDark: false,

    // 搭配照片
    images: [],
    maxImages: 3,

    // 搭配名称
    name: '',

    // 搭配标签
    styleTags: STYLE_TAGS,
    selectedTag: '',

    // 关联单品
    linkedItems: [],
  },

  onLoad: function () {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44 });
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    var navPadHeight = statusBarHeight + 44;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';

    this.setData({
      statusBarHeight: statusBarHeight,
      navPadHeight: navPadHeight,
      isDark: theme === 'dark',
    });
  },

  onShow: function () {
    var self = this;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }

    // 接收从 zone-clothes 返回的选中衣物数据
    var selected = wx.getStorageSync('__add_favorite_selected_items');
    if (selected && selected.length > 0) {
      var categoryMap = {
        top: '上装', dress: '连衣裙', bottom: '下装',
        shoes: '鞋靴', outer: '外套', accessory: '配饰',
      };
      var linkedItems = [];
      for (var i = 0; i < selected.length; i++) {
        var cloth = selected[i];
        linkedItems.push({
          id: cloth.id,
          name: cloth.note || categoryMap[cloth.tags && cloth.tags.category] || '未命名',
          category: categoryMap[cloth.tags && cloth.tags.category] || '单品',
          icon: self._getCategoryIcon(cloth.tags && cloth.tags.category),
        });
      }
      self.setData({ linkedItems: linkedItems });
      // 清空临时数据
      wx.removeStorageSync('__add_favorite_selected_items');
    }
  },

  // ===== 返回 =====
  onBack: function () {
    var self = this;
    if (this.data.images.length > 0 || this.data.name || this.data.linkedItems.length > 0) {
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

  // ===== 选择照片 =====
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
        if (images.length > self.data.maxImages) {
          images = images.slice(0, self.data.maxImages);
        }
        self.setData({ images: images });
      },
    });
  },

  onRemoveImage: function (e) {
    var idx = e.currentTarget.dataset.index;
    var images = this.data.images.slice();
    images.splice(idx, 1);
    this.setData({ images: images });
    wx.vibrateShort({ type: 'light' });
  },

  // ===== 搭配名称 =====
  onNameInput: function (e) {
    this.setData({ name: e.detail.value });
  },

  // ===== 搭配标签 =====
  onTagSelect: function (e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ selectedTag: key });
    wx.vibrateShort({ type: 'light' });
  },

  // ===== 关联单品 =====
  onShowItemPicker: function () {
    // 标记进入选择模式（TabBar 页面不能 navigateTo，用 storage 传递状态）
    wx.setStorageSync('__wardrobe_select_mode', 'add-favorite');
    // TabBar 页面必须用 switchTab 跳转
    wx.switchTab({
      url: '/pages/wardrobe/wardrobe',
      fail: function () {
        wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
      },
    });
  },

  onRemoveLinkedItem: function (e) {
    var idx = e.currentTarget.dataset.index;
    var linkedItems = this.data.linkedItems.slice();
    linkedItems.splice(idx, 1);
    this.setData({ linkedItems: linkedItems });
    wx.vibrateShort({ type: 'light' });
  },

  _getCategoryIcon: function (cat) {
    var map = {
      top: '上装', dress: '连衣裙', bottom: '下装',
      shoes: '鞋靴', outer: '外套', accessory: '配饰',
    };
    return map[cat] || '单品';
  },

  // ===== 保存收藏 =====
  onSave: function () {
    var self = this;

    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张搭配照片', icon: 'none' });
      return;
    }

    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入搭配名称', icon: 'none' });
      return;
    }

    // 构建收藏数据
    var favorite = {
      id: 'fav_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: this.data.name.trim(),
      tag: this.data.selectedTag,
      images: this.data.images.map(function (img) { return img.url; }),
      linkedItems: this.data.linkedItems,
      createdAt: Date.now(),
    };

    // 保存到收藏列表（使用独立存储key）
    var favorites = wx.getStorageSync('wardrobe_favorites') || [];
    favorites.unshift(favorite);
    wx.setStorageSync('wardrobe_favorites', favorites);

    wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: '保存成功', icon: 'success', duration: 1200 });

    setTimeout(function () {
      wx.navigateBack();
    }, 1200);
  },

  // ===== 切换主题 =====
  onToggleTheme: function () {
    var next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    wx.vibrateShort({ type: 'light' });
  },
});
