// pages/index/index.js - 首页（焦糖米黄风 · 按参考图布局）
const THEME_KEY = 'wardrobe_theme';
const NAME_KEY  = 'wardrobe_name';
const LAYOUT_KEY = 'wardrobe_layout';
const WEATHER_KEY = 'wardrobe_weather_cache';
const { commonApi } = require('../../utils/api.js');

const DEFAULT_LAYOUT = {
  topShelf: 'with-light',   // plain / with-light / divided
  hanger:   'single',       // single / double / extendable
  doors:    'sliding',      // sliding / swing / louver / mirror / open
  drawers:  3,              // 2 / 3 / 4
  accessories: [],
  lighting: 'top',          // top / strip / sensor / off
};

function buildGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    // 胶囊按钮占位（用于将衣柜名/日夜开关放在胶囊同行）
    menuBtnTop: 32,
    menuBtnHeight: 32,
    navActionsRight: 95,
    isDark: false,

    wardrobeName: 'Isabella 的衣柜',
    nickName: 'Isabella',
    greeting: '早上好',

    // weather.type 用于驱动 CSS 线条图标：sunny / cloudy / rainy / snowy / night
    weather: {
      type: 'sunny',
      desc: '晴',
      temp: '22℃',
      city: '北京',
    },

    stats: {
      total: 86,
      worn: 42,
      unused: 12,
    },

    // 收藏的搭配数据
    favorites: [
      {
        id: 1,
        title: '温柔通勤风',
        tag: '通勤',
        tagBg: 'rgba(212, 163, 115, 0.15)',
        tagColor: '#D4A373',
        bgColor: '#F0E8E0',
        icon: '\uD83D\uDCBC',
        date: '5月12日收藏',
      },
      {
        id: 2,
        title: '法式约会风',
        tag: '约会',
        tagBg: 'rgba(232, 180, 180, 0.20)',
        tagColor: '#C88888',
        bgColor: '#F5E0E0',
        icon: '\uD83C\uDF77',
        date: '5月8日收藏',
      },
      {
        id: 3,
        title: '元气运动风',
        tag: '运动',
        tagBg: 'rgba(168, 188, 168, 0.20)',
        tagColor: '#6C8A6C',
        bgColor: '#E0E8E0',
        icon: '\uD83C\uDFC3',
        date: '4月28日收藏',
      },
    ],

    // 衣柜 DIY 布局（驱动主卡线条衣柜渲染）
    layout: DEFAULT_LAYOUT,

    // 预生成的次数数组（兼容旧版 wx:for）
    dots20: Array.from({ length: 20 }, function (_, i) { return i; }),
    bars8:  Array.from({ length: 8 },  function (_, i) { return i; }),
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44, windowWidth: 375 });
    const menuBtn = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const statusBarHeight = sysInfo.statusBarHeight || 44;
    const windowWidth    = sysInfo.windowWidth    || 375;
    const navPadHeight   = menuBtn ? (menuBtn.bottom + 8) : (statusBarHeight + 44);
    const menuBtnTop     = menuBtn ? menuBtn.top    : (statusBarHeight + 4);
    const menuBtnHeight  = menuBtn ? menuBtn.height : 32;
    const menuBtnLeft    = menuBtn ? menuBtn.left   : (windowWidth - 95);
    // nav-actions 右侧距屏边，紧贴胶囊按钮左侧，预留 8px 间隙
    const navActionsRight = Math.max(8, windowWidth - menuBtnLeft + 8);
    const theme = wx.getStorageSync(THEME_KEY) || 'light';
    const storedName = wx.getStorageSync(NAME_KEY);
    const storedLayout = wx.getStorageSync(LAYOUT_KEY);
    // 先尝试读取缓存天气，避免界面空白
    const cachedWeather = wx.getStorageSync(WEATHER_KEY);
    this.setData({
      statusBarHeight,
      navPadHeight,
      menuBtnTop,
      menuBtnHeight,
      navActionsRight,
      isDark: theme === 'dark',
      greeting: buildGreeting(),
      wardrobeName: storedName || this.data.wardrobeName,
      layout: Object.assign({}, DEFAULT_LAYOUT, storedLayout || {}),
      weather: cachedWeather || this.data.weather,
    });
    // 异步获取真实天气
    this.fetchRealWeather();
  },

  /* ========== 天气 ========== */

  // 获取定位并拉取真实天气
  fetchRealWeather() {
    const self = this;
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        self._loadWeather(res.latitude, res.longitude);
      },
      fail(err) {
        console.warn('[fetchRealWeather] 定位失败:', err);
        const cached = wx.getStorageSync(WEATHER_KEY);
        if (!cached) {
          wx.showToast({ title: '定位失败，显示默认天气', icon: 'none', duration: 1500 });
        }
      },
    });
  },

  // 调用云函数获取天气并缓存
  async _loadWeather(lat, lon) {
    try {
      const data = await commonApi.getWeather(lat, lon);
      if (data) {
        const weather = {
          type: data.type || 'sunny',
          desc: data.desc || '晴',
          temp: data.temp || '--℃',
          city: data.city || '当前位置',
        };
        wx.setStorageSync(WEATHER_KEY, weather);
        this.setData({ weather });
      }
    } catch (err) {
      console.warn('[_loadWeather] 获取天气失败:', err);
    }
  },

  onShow() {
    const theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }
    // 同步衣柜 DIY 布局（从衣柜页回到首页后即时反映）
    const storedLayout = wx.getStorageSync(LAYOUT_KEY);
    if (storedLayout) {
      this.setData({ layout: Object.assign({}, DEFAULT_LAYOUT, storedLayout) });
    }
    this.setData({ greeting: buildGreeting() });
    // 同步自定义 tabBar 选中项
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 600);
  },

  /* ========== 交互 ========== */

  // 点击衣柜名字：编辑
  onEditName() {
    const self = this;
    wx.showModal({
      title: '修改衣柜名字',
      editable: true,
      placeholderText: '例：小柯的衣柜',
      content: self.data.wardrobeName,
      success: function (res) {
        if (res.confirm && res.content) {
          const name = res.content.trim();
          if (name) {
            wx.setStorageSync(NAME_KEY, name);
            self.setData({ wardrobeName: name });
          }
        }
      },
    });
  },

  // 右上图标：白天/夜晚主题切换
  onToggleTheme() {
    const next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    // 同步自定义 tabBar，避免下方菜单栏颜色滞后
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ isDark: next === 'dark' });
    }
    wx.vibrateShort({ type: 'light' });
    wx.showToast({
      title: next === 'dark' ? '夜晚模式' : '白天模式',
      icon: 'none',
      duration: 1000,
    });
  },

  // 主卡：进入衣柜
  onEnterWardrobe() {
    wx.vibrateShort({ type: 'light' });
    wx.switchTab({ url: '/pages/wardrobe/wardrobe' });
  },

  // 左卡：天气/欢迎
  onWeatherTap() {
    wx.showToast({ title: '已根据天气推荐穿搭', icon: 'none' });
  },

  // 右卡：AI 智能搭配
  onAiRecommend() {
    wx.vibrateShort({ type: 'medium' });
    wx.navigateTo({ url: '/pages/ai-match/ai-match' });
  },

  // 查看全部收藏
  onViewAllFavorites() {
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '查看全部收藏', icon: 'none' });
  },

  // 点击收藏卡片
  onFavoriteTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '查看搭配详情', icon: 'none' });
  },

  onShareAppMessage() {
    return {
      title: '我的智能衣柜',
      path: '/pages/index/index',
    };
  },
});
