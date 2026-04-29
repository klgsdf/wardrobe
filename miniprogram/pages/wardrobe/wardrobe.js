// pages/wardrobe/wardrobe.js - 衣柜 DIY 页
const THEME_KEY = 'wardrobe_theme';
const LAYOUT_KEY = 'wardrobe_layout';

const DEFAULT_LAYOUT = {
  topShelf: 'with-light',
  hanger:   'single',
  doors:    'sliding',
  drawers:  3,
  accessories: 'shoe-rack-2',
  lighting: 'top',
};

// 每个模块的可选组件
const COMPONENTS = {
  doors: [
    { key: 'sliding', label: '推拉门', desc: '圆点装饰面板' },
    { key: 'swing',   label: '平开门', desc: '经典双开' },
    { key: 'louver',  label: '百叶门', desc: '通风条纹' },
    { key: 'mirror',  label: '镜面门', desc: '反光镜面' },
    { key: 'open',    label: '开放式', desc: '无门设计' },
  ],
  drawers: [
    { key: 2, label: '2 抽', desc: '等高双屉' },
    { key: 3, label: '3 抽', desc: '中等容量' },
    { key: 4, label: '4 抽组合', desc: '大中小混搭' },
  ],
  hanger: [
    { key: 'single',     label: '单杆',   desc: '通用挂衣' },
    { key: 'double',     label: '双杆',   desc: '高低分区' },
    { key: 'extendable', label: '伸缩杆', desc: '可调长度' },
  ],
  topShelf: [
    { key: 'plain',      label: '平板',   desc: '基础一层' },
    { key: 'with-light', label: '带灯带', desc: '氛围照明' },
    { key: 'divided',    label: '分隔',   desc: '三格收纳' },
  ],
  accessories: [
    { key: 'shoe-rack-2', label: '2 层鞋架', desc: '标准款' },
    { key: 'shoe-rack-3', label: '3 层鞋架', desc: '大容量' },
    { key: 'shoe-slant',  label: '斜插式',   desc: '省空间' },
    { key: 'none',        label: '无',       desc: '移除鞋架' },
  ],
  lighting: [
    { key: 'top',    label: '顶光',    desc: '顶部柔光' },
    { key: 'strip',  label: '层间灯带', desc: '加粗灯带' },
    { key: 'sensor', label: '感应灯',   desc: '人来即亮' },
    { key: 'off',    label: '关闭',     desc: '无照明' },
  ],
};

const TABS = [
  { key: 'doors',       label: '门款',   zone: 'doors' },
  { key: 'drawers',     label: '抽屉',   zone: 'drawers' },
  { key: 'hanger',      label: '挂衣杆', zone: 'hanger' },
  { key: 'topShelf',    label: '置物架', zone: 'topShelf' },
  { key: 'accessories', label: '鞋架',   zone: 'accessories' },
  { key: 'lighting',    label: '灯光',   zone: 'lighting' },
];

// 画布热区 → Tab 映射
const ZONE_TO_TAB = {
  'top-shelf':   'topShelf',
  'hanger':      'hanger',
  'doors':       'doors',
  'drawers':     'drawers',
  'accessories': 'accessories',
  'lighting':    'lighting',
};

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    menuBtnTop: 32,
    menuBtnHeight: 32,
    isDark: false,

    activeTab: 'doors',
    activeZone: 'doors',
    layout: DEFAULT_LAYOUT,

    tabs: TABS,
    componentList: COMPONENTS.doors,

    // 预生成的次数数组（兼容旧版 wx:for）
    dots24: Array.from({ length: 24 }, function (_, i) { return i; }),
    bars10: Array.from({ length: 10 }, function (_, i) { return i; }),
    dots9:  Array.from({ length: 9 },  function (_, i) { return i; }),
    bars5:  Array.from({ length: 5 },  function (_, i) { return i; }),
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menuBtn = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const statusBarHeight = sysInfo.statusBarHeight || 44;
    const navPadHeight   = menuBtn ? (menuBtn.bottom + 8) : (statusBarHeight + 44);
    const menuBtnTop     = menuBtn ? menuBtn.top    : (statusBarHeight + 4);
    const menuBtnHeight  = menuBtn ? menuBtn.height : 32;

    const theme = wx.getStorageSync(THEME_KEY) || 'light';
    const storedLayout = wx.getStorageSync(LAYOUT_KEY);
    const layout = Object.assign({}, DEFAULT_LAYOUT, storedLayout || {});

    this.setData({
      statusBarHeight,
      navPadHeight,
      menuBtnTop,
      menuBtnHeight,
      isDark: theme === 'dark',
      layout,
    });
  },

  onShow() {
    const theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, isDark: theme === 'dark' });
    }
  },

  // 点击画布某模块：高亮 + Tab 联动
  onZoneTap(e) {
    const zone = e.currentTarget.dataset.zone;
    const tabKey = ZONE_TO_TAB[zone];
    if (!tabKey) return;
    this.setData({
      activeZone: zone,
      activeTab: tabKey,
      componentList: COMPONENTS[tabKey],
    });
    wx.vibrateShort({ type: 'light' });
  },

  // 点击底部 Tab
  onTabTap(e) {
    const tabKey = e.currentTarget.dataset.key;
    const tab = TABS.find((t) => t.key === tabKey);
    if (!tab) return;
    this.setData({
      activeTab: tabKey,
      activeZone: tab.zone,
      componentList: COMPONENTS[tabKey],
    });
  },

  // 点击组件卡：切换布局
  onComponentPick(e) {
    const { key } = e.currentTarget.dataset;
    const activeTab = this.data.activeTab;
    const newLayout = Object.assign({}, this.data.layout, { [activeTab]: key });
    this.setData({ layout: newLayout });
    wx.vibrateShort({ type: 'light' });
  },

  // 重置
  onReset() {
    const self = this;
    wx.showModal({
      title: '重置设计',
      content: '确定要恢复默认衣柜布局吗？',
      confirmText: '重置',
      confirmColor: '#B88855',
      success(res) {
        if (res.confirm) {
          self.setData({ layout: DEFAULT_LAYOUT });
          wx.vibrateShort({ type: 'medium' });
        }
      },
    });
  },

  // 完成 / 保存
  onDone() {
    wx.setStorageSync(LAYOUT_KEY, this.data.layout);
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: '已保存你的衣柜设计', icon: 'none', duration: 1200 });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 400);
  },

  // 切换主题
  onToggleTheme() {
    const next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ isDark: next === 'dark' });
    }
    wx.vibrateShort({ type: 'light' });
  },
});
