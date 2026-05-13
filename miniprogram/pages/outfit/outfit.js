// pages/outfit/outfit.js - 衣服浏览页（侧边栏 + 瀑布流）
var THEME_KEY = 'wardrobe_theme';
var CLOTHES_LIST_KEY = 'clothes_list';
var FAVORITE_KEY = 'outfit_favorites';

var { CATEGORIES, SEASONS } = require('../../config.js');

// 构建映射表
function buildMap(options) {
  var map = {};
  for (var i = 0; i < options.length; i++) {
    map[options[i].key] = options[i].label;
  }
  return map;
}

var categoryMap = buildMap(CATEGORIES);
var seasonMap = buildMap(SEASONS);

// 每页加载数量
var PAGE_SIZE = 10;

Page({
  data: {
    // 系统信息
    statusBarHeight: 44,
    navPadHeight: 88,

    // 主题
    isDark: false,

    // 左侧分类导航（按设计图顺序：全部→上装→连衣裙→下装→鞋靴→外套→配饰）
    categories: [
      { key: 'all', label: '全部' },
      { key: 'top', label: '上装' },
      { key: 'dress', label: '连衣裙' },
      { key: 'bottom', label: '下装' },
      { key: 'shoes', label: '鞋靴' },
      { key: 'outer', label: '外套' },
      { key: 'accessory', label: '配饰' },
    ],
    selectedCategory: 'all',

    // 顶部分类标签
    typeTags: [
      { key: 'all', label: '全部' },
      { key: 'spring', label: '春装' },
      { key: 'summer', label: '夏装' },
      { key: 'autumn', label: '秋装' },
      { key: 'winter', label: '冬装' },
      { key: 'new', label: '最近添加' },
    ],
    selectedTypeTag: 'all',

    // 搜索
    searchKeyword: '',

    // 衣物数据
    allItems: [],
    filteredItems: [],
    leftColumn: [],
    rightColumn: [],
    pageIndex: 0,
    hasMore: true,
    loading: false,

    // 空状态
    isEmpty: false,

    // 收藏
    favoriteIds: [],
    favoriteCount: 0,
    favoritePreviews: [],

    // 标签映射
    categoryMap: categoryMap,
    seasonMap: seasonMap,
  },

  onLoad: function () {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44 });
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    var navPadHeight = statusBarHeight + 44;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    var favoriteIds = wx.getStorageSync(FAVORITE_KEY) || [];

    this.setData({
      statusBarHeight: statusBarHeight,
      navPadHeight: navPadHeight,
      isDark: theme === 'dark',
      favoriteIds: favoriteIds,
    });

    this._loadItems();
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }

    // 主题同步
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }

    // 收藏同步
    var favoriteIds = wx.getStorageSync(FAVORITE_KEY) || [];
    if (JSON.stringify(favoriteIds) !== JSON.stringify(this.data.favoriteIds)) {
      this.setData({ favoriteIds: favoriteIds });
      this._applyFavoritesAndFilter();
    }
  },

  /* ============ 加载衣物数据 ============ */
  _loadItems: function () {
    var self = this;
    var allClothes = wx.getStorageSync(CLOTHES_LIST_KEY) || [];

    // 格式化衣物数据
    var items = [];
    for (var i = 0; i < allClothes.length; i++) {
      var c = allClothes[i];
      var item = self._formatItem(c);
      items.push(item);
    }

    // 按创建时间倒序
    items.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    self.setData({
      allItems: items,
    }, function () {
      self._applyFavoritesAndFilter();
    });
  },

  // 格式化单个衣物
  _formatItem: function (c) {
    var name = '';
    if (c.tags && c.tags.category) {
      name = categoryMap[c.tags.category] || c.tags.category;
    }
    if (c.note) {
      name = c.note.length > 10 ? c.note.substring(0, 10) + '...' : c.note;
    }

    // 季节标签
    var seasonLabel = '';
    if (c.tags && c.tags.season && c.tags.season.length > 0) {
      seasonLabel = seasonMap[c.tags.season[0]] || c.tags.season[0];
    }

    return {
      id: c.id,
      images: c.images && c.images.length > 0 ? c.images : ['/images/default-goods-image.png'],
      name: name,
      tags: c.tags || {},
      category: c.tags && c.tags.category ? c.tags.category : '',
      categoryLabel: c.tags && c.tags.category ? (categoryMap[c.tags.category] || c.tags.category) : '',
      seasonLabel: seasonLabel,
      createdAt: c.createdAt || 0,
      favorite: false,
    };
  },

  // 应用收藏状态并过滤
  _applyFavoritesAndFilter: function () {
    var self = this;
    var allItems = self.data.allItems;
    var favoriteIds = self.data.favoriteIds;
    var selectedCategory = self.data.selectedCategory;
    var selectedTypeTag = self.data.selectedTypeTag;
    var searchKeyword = self.data.searchKeyword;

    // 标记收藏状态
    var items = [];
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      item.favorite = favoriteIds.indexOf(item.id) >= 0;
      items.push(item);
    }

    // 分类过滤
    var filtered = [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];

      // 左侧分类过滤
      if (selectedCategory !== 'all' && it.category !== selectedCategory) {
        continue;
      }

      // 顶部标签过滤
      if (selectedTypeTag !== 'all') {
        if (selectedTypeTag === 'new') {
          // 最近添加（7天内）
          var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (it.createdAt < weekAgo) continue;
        } else if (!it.tags.season || it.tags.season.indexOf(selectedTypeTag) < 0) {
          continue;
        }
      }

      // 搜索过滤
      if (searchKeyword) {
        var kw = searchKeyword.toLowerCase();
        var match = false;
        if (it.name && it.name.toLowerCase().indexOf(kw) >= 0) match = true;
        if (it.categoryLabel && it.categoryLabel.toLowerCase().indexOf(kw) >= 0) match = true;
        if (it.seasonLabel && it.seasonLabel.toLowerCase().indexOf(kw) >= 0) match = true;
        if (!match) continue;
      }

      filtered.push(it);
    }

    // 更新收藏统计
    var favItems = [];
    for (var k = 0; k < items.length; k++) {
      if (items[k].favorite) favItems.push(items[k]);
    }
    var favoritePreviews = [];
    for (var p = 0; p < Math.min(favItems.length, 2); p++) {
      favoritePreviews.push(favItems[p].images[0]);
    }

    self.setData({
      filteredItems: filtered,
      isEmpty: filtered.length === 0,
      pageIndex: 0,
      hasMore: filtered.length > 0,
      leftColumn: [],
      rightColumn: [],
      favoriteCount: favItems.length,
      favoritePreviews: favoritePreviews,
    }, function () {
      if (filtered.length > 0) {
        self._loadMore();
      }
    });
  },

  // 瀑布流分页加载
  _loadMore: function () {
    var self = this;
    if (self.data.loading || !self.data.hasMore) return;

    self.setData({ loading: true });

    var start = self.data.pageIndex * PAGE_SIZE;
    var end = start + PAGE_SIZE;
    var pageItems = self.data.filteredItems.slice(start, end);

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
    var hasMore = end < self.data.filteredItems.length;

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

  /* ============ 左侧分类导航 ============ */
  onCategoryTap: function (e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ selectedCategory: key });
    this._applyFavoritesAndFilter();
    wx.vibrateShort({ type: 'light' });
  },

  /* ============ 顶部分类标签 ============ */
  onTypeTagTap: function (e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ selectedTypeTag: key });
    this._applyFavoritesAndFilter();
    wx.vibrateShort({ type: 'light' });
  },

  onMoreTypes: function () {
    wx.showToast({ title: '更多筛选即将上线', icon: 'none' });
  },

  /* ============ 搜索 ============ */
  onSearchInput: function (e) {
    var keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this._applyFavoritesAndFilter();
  },

  onClearSearch: function () {
    this.setData({ searchKeyword: '' });
    this._applyFavoritesAndFilter();
  },

  onFocusSearch: function () {
    // 点击 sidebar 搜索图标，滚动到顶部并聚焦搜索框
    // 小程序无法直接聚焦 input，这里仅做提示
    wx.showToast({ title: '请在上方搜索框输入', icon: 'none' });
  },

  /* ============ 跳转到收藏列表 ============ */
  onShowFavorites: function () {
    wx.navigateTo({
      url: '/pages/favorites/favorites',
      fail: function () {
        wx.showToast({ title: '收藏列表开发中', icon: 'none' });
      }
    });
  },

  /* ============ 收藏 ============ */
  onToggleFavorite: function (e) {
    var id = e.currentTarget.dataset.id;
    var favoriteIds = this.data.favoriteIds.slice();
    var idx = favoriteIds.indexOf(id);

    if (idx >= 0) {
      favoriteIds.splice(idx, 1);
    } else {
      favoriteIds.push(id);
    }

    wx.setStorageSync(FAVORITE_KEY, favoriteIds);
    this.setData({ favoriteIds: favoriteIds });
    this._applyFavoritesAndFilter();
    wx.vibrateShort({ type: 'light' });
  },

  /* ============ 点击衣物卡片 ============ */
  onItemTap: function (e) {
    var itemId = e.currentTarget.dataset.id;
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '衣物详情开发中', icon: 'none' });
  },

  /* ============ 切换主题 ============ */
  onToggleTheme: function () {
    var next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    wx.vibrateShort({ type: 'light' });
  },
});
