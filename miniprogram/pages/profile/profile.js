// pages/profile/profile.js - 收藏页面
var THEME_KEY = 'wardrobe_theme';
var FAVORITE_KEY = 'outfit_favorites';
var CLOTHES_LIST_KEY = 'clothes_list';

// 收藏分类标签
var FILTER_TAGS = [
  { key: 'all', label: '全部' },
  { key: 'commute', label: '通勤' },
  { key: 'date', label: '约会' },
  { key: 'sport', label: '运动' },
];

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    isDark: false,

    // 分类筛选
    filterTags: FILTER_TAGS,
    selectedFilter: 'all',

    // 收藏列表
    favorites: [],
    filteredFavorites: [],
    totalCount: 0,

    // 加载状态
    loading: false,
    isEmpty: false,

    // 删除确认
    showDeleteConfirm: false,
    deleteTarget: null,
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

    this._loadFavorites();
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }

    // 主题同步
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }

    // 收藏数据同步（可能从其他页面修改过）
    this._loadFavorites();
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this._loadFavorites();
    wx.stopPullDownRefresh();
  },

  // ===== 加载收藏数据 =====
  _loadFavorites: function () {
    var self = this;
    var favoriteIds = wx.getStorageSync(FAVORITE_KEY) || [];
    var allClothes = wx.getStorageSync(CLOTHES_LIST_KEY) || [];

    // 根据收藏ID查找对应衣物
    var favorites = [];
    for (var i = 0; i < favoriteIds.length; i++) {
      var fid = favoriteIds[i];
      for (var j = 0; j < allClothes.length; j++) {
        var c = allClothes[j];
        if (c.id === fid) {
          favorites.push(self._formatFavoriteItem(c));
          break;
        }
      }
    }

    // 按收藏时间倒序（使用衣物创建时间作为近似）
    favorites.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    this.setData({
      favorites: favorites,
      totalCount: favorites.length,
    }, function () {
      self._applyFilter();
    });
  },

  // 格式化收藏项
  _formatFavoriteItem: function (c) {
    var tag = '全部';
    var tagKey = 'all';
    var tagBg = 'rgba(212, 163, 115, 0.15)';
    var tagColor = '#D4A373';
    var bgColor = '#F0E8E0';
    var icon = '\uD83D\DCBC';

    // 根据衣物标签推断风格
    if (c.tags) {
      if (c.tags.occasion && c.tags.occasion.length > 0) {
        var occ = c.tags.occasion[0];
        if (occ === 'work' || occ === 'business') {
          tag = '通勤';
          tagKey = 'commute';
          tagBg = 'rgba(212, 163, 115, 0.15)';
          tagColor = '#D4A373';
          bgColor = '#F0E8E0';
          icon = '\uD83D\DCBC';
        } else if (occ === 'date' || occ === 'party') {
          tag = '约会';
          tagKey = 'date';
          tagBg = 'rgba(232, 180, 180, 0.20)';
          tagColor = '#C88888';
          bgColor = '#F5E0E0';
          icon = '\uD83C\DF77';
        } else if (occ === 'sport' || occ === 'outdoor') {
          tag = '运动';
          tagKey = 'sport';
          tagBg = 'rgba(168, 188, 168, 0.20)';
          tagColor = '#6C8A6C';
          bgColor = '#E0E8E0';
          icon = '\uD83C\DFC3';
        }
      }

      // 根据类别推断图标
      if (c.tags.category) {
        var cat = c.tags.category;
        if (cat === 'shoes') icon = '\uD83D\DC5F';
        else if (cat === 'accessory') icon = '\uD83D\DC5E';
        else if (cat === 'outer') icon = '\uD83E\UDE91';
        else if (cat === 'dress') icon = '\uD83D\DC57';
        else if (cat === 'bottom') icon = '\uD83D\DC56';
        else if (cat === 'top') icon = '\uD83D\DC55';
      }
    }

    // 格式化日期
    var dateStr = '';
    if (c.createdAt) {
      var d = new Date(c.createdAt);
      var now = new Date();
      var month = d.getMonth() + 1;
      var day = d.getDate();
      dateStr = month + '月' + day + '日收藏';
    }

    // 单品数量
    var itemCount = 1;
    if (c.images && c.images.length > 0) {
      itemCount = c.images.length;
    }

    return {
      id: c.id,
      title: c.note || this._getCategoryName(c.tags && c.tags.category) || '未命名衣物',
      tag: tag,
      tagKey: tagKey,
      tagBg: tagBg,
      tagColor: tagColor,
      bgColor: bgColor,
      icon: icon,
      date: dateStr,
      itemCount: itemCount,
      images: c.images || [],
      createdAt: c.createdAt || 0,
      tags: c.tags || {},
    };
  },

  _getCategoryName: function (key) {
    var map = {
      top: '上装', dress: '连衣裙', bottom: '下装',
      shoes: '鞋靴', outer: '外套', accessory: '配饰',
    };
    return map[key] || '';
  },

  // ===== 筛选 =====
  _applyFilter: function () {
    var self = this;
    var selectedFilter = this.data.selectedFilter;
    var favorites = this.data.favorites;

    var filtered = [];
    for (var i = 0; i < favorites.length; i++) {
      var item = favorites[i];
      if (selectedFilter === 'all' || item.tagKey === selectedFilter) {
        filtered.push(item);
      }
    }

    this.setData({
      filteredFavorites: filtered,
      isEmpty: filtered.length === 0,
    });
  },

  onFilterTap: function (e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ selectedFilter: key });
    this._applyFilter();
    wx.vibrateShort({ type: 'light' });
  },

  // ===== 点击收藏项 =====
  onFavoriteTap: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.vibrateShort({ type: 'light' });
    // 跳转到衣物详情（如果存在）或显示提示
    wx.showToast({ title: '查看衣物详情', icon: 'none' });
  },

  // ===== 取消收藏 =====
  onToggleFavorite: function (e) {
    var self = this;
    var id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这件衣物吗？',
      confirmColor: '#D4A373',
      success: function (res) {
        if (res.confirm) {
          var favoriteIds = wx.getStorageSync(FAVORITE_KEY) || [];
          var idx = favoriteIds.indexOf(id);
          if (idx >= 0) {
            favoriteIds.splice(idx, 1);
            wx.setStorageSync(FAVORITE_KEY, favoriteIds);
          }
          self._loadFavorites();
          wx.vibrateShort({ type: 'light' });
          wx.showToast({ title: '已取消收藏', icon: 'none' });
        }
      },
    });
  },

  // ===== 添加新收藏（跳转到添加收藏页面） =====
  onAddFavorite: function () {
    wx.vibrateShort({ type: 'light' });
    wx.navigateTo({ url: '/pages/add-favorite/add-favorite' });
  },

  // ===== 切换主题 =====
  onToggleTheme: function () {
    var next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    wx.vibrateShort({ type: 'light' });
  },
});
