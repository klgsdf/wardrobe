// pages/zone-clothes/zone-clothes.js - 分区衣物瀑布流页面
var THEME_KEY = 'wardrobe_theme';
var CLOTHES_LIST_KEY = 'clothes_list';

var { CATEGORIES, COLORS, SEASONS } = require('../../config.js');

// 构建映射表
function buildMap(options) {
  var map = {};
  for (var i = 0; i < options.length; i++) {
    map[options[i].key] = options[i].label;
  }
  return map;
}
function buildHexMap(colors) {
  var map = {};
  for (var i = 0; i < colors.length; i++) {
    map[colors[i].key] = colors[i].hex;
  }
  return map;
}

var categoryMap = buildMap(CATEGORIES);
var seasonMap = buildMap(SEASONS);
var colorHexMap = buildHexMap(COLORS);

// 每页加载数量
var PAGE_SIZE = 10;

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    isDark: false,

    // 分区信息
    wardrobeId: '',
    zoneId: '',
    zoneName: '',

    // 衣物数据
    allItems: [],
    leftColumn: [],
    rightColumn: [],
    pageIndex: 0,
    hasMore: true,
    loading: false,

    // 空状态
    isEmpty: false,

    // 标签映射
    categoryMap: categoryMap,
    seasonMap: seasonMap,
    colorHexMap: colorHexMap,
  },

  onLoad: function (options) {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44 });
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    var navPadHeight = statusBarHeight + 44;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';

    this.setData({
      statusBarHeight: statusBarHeight,
      navPadHeight: navPadHeight,
      isDark: theme === 'dark',
      wardrobeId: options.wardrobeId || '',
      zoneId: options.zoneId || '',
      zoneName: options.zoneName ? decodeURIComponent(options.zoneName) : '分区衣物',
    });

    this._loadItems();
  },

  onShow: function () {
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }
  },

  // ===== 加载衣物数据 =====
  _loadItems: function () {
    var self = this;
    var allClothes = wx.getStorageSync(CLOTHES_LIST_KEY) || [];
    var zoneItems = [];

    for (var i = 0; i < allClothes.length; i++) {
      var c = allClothes[i];
      if (c.wardrobeId === self.data.wardrobeId && c.zoneId === self.data.zoneId) {
        // 预格式化日期和标签
        var item = self._formatItem(c);
        zoneItems.push(item);
      }
    }

    // 按创建时间倒序
    zoneItems.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    self.setData({
      allItems: zoneItems,
      isEmpty: zoneItems.length === 0,
      pageIndex: 0,
      hasMore: zoneItems.length > 0,
      leftColumn: [],
      rightColumn: [],
    }, function () {
      if (zoneItems.length > 0) {
        self._loadMore();
      }
    });
  },

  // 格式化单个衣物数据
  _formatItem: function (c) {
    var dateStr = '';
    if (c.createdAt) {
      var d = new Date(c.createdAt);
      dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    // 颜色标签处理
    var colorLabels = [];
    var colorHexes = [];
    if (c.tags && c.tags.color) {
      for (var i = 0; i < c.tags.color.length; i++) {
        var ck = c.tags.color[i];
        colorLabels.push(colorHexMap[ck] ? ck : ck);
        colorHexes.push(colorHexMap[ck] || ck);
      }
    }

    return {
      id: c.id,
      images: c.images,
      tags: c.tags,
      note: c.note || '',
      createdAt: c.createdAt,
      createdAtStr: dateStr,
      colorLabels: colorLabels,
      colorHexes: colorHexes,
      categoryLabel: c.tags && c.tags.category ? (categoryMap[c.tags.category] || c.tags.category) : '',
      seasonLabel: c.tags && c.tags.season && c.tags.season.length > 0 ? (seasonMap[c.tags.season[0]] || c.tags.season[0]) : '',
    };
  },

  // ===== 瀑布流分页加载 =====
  _loadMore: function () {
    var self = this;
    if (self.data.loading || !self.data.hasMore) return;

    self.setData({ loading: true });

    var start = self.data.pageIndex * PAGE_SIZE;
    var end = start + PAGE_SIZE;
    var pageItems = self.data.allItems.slice(start, end);

    // 分配到左右列（简单轮询分配）
    var left = self.data.leftColumn.slice();
    var right = self.data.rightColumn.slice();

    for (var i = 0; i < pageItems.length; i++) {
      if (left.length <= right.length) {
        left.push(pageItems[i]);
      } else {
        right.push(pageItems[i]);
      }
    }

    var nextPageIndex = self.data.pageIndex + 1;
    var hasMore = end < self.data.allItems.length;

    // 模拟轻微延迟，让 loading 状态可见
    setTimeout(function () {
      self.setData({
        leftColumn: left,
        rightColumn: right,
        pageIndex: nextPageIndex,
        hasMore: hasMore,
        loading: false,
      });
    }, 200);
  },

  // 滚动到底部触发加载
  onScrollToLower: function () {
    this._loadMore();
  },

  // ===== 点击衣物卡片 =====
  onItemTap: function (e) {
    var itemId = e.currentTarget.dataset.id;
    wx.vibrateShort({ type: 'light' });
    // 后续可扩展为跳转到衣物详情页
    wx.showToast({ title: '衣物详情开发中', icon: 'none' });
  },

  // ===== 返回 =====
  onBack: function () {
    wx.navigateBack();
  },

  // ===== 切换主题 =====
  onToggleTheme: function () {
    var next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    wx.vibrateShort({ type: 'light' });
  },
});
