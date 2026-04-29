// pages/outfit/outfit.js - 智能搭配推荐页
const THEME_KEY = 'wardrobe_theme';

Page({
  data: {
    // 状态栏
    statusBarHeight: 44,
    navBarHeight: 44,

    // 主题（与首页共享 storage）
    isDark: false,

    // 统计数据（仅用于 hero 文案占位，后续接真实衣物总数）
    stats: { total: 40 },

    // 天气（TODO：接入和风/腾讯定位）
    weather: {
      icon: '🌤',
      city: '北京',
      temp: '18℃',
      desc: '多云',
      suggestion: '建议穿薄外套 + 长裤',
    },

    // 今日推荐搭配
    todayOutfit: {
      match: 92,
      title: '通勤极简 · 蓝白配色',
      chips: ['☀️ 适合 18℃', '🏢 通勤场景', '🧺 已洗净'],
      items: [
        { icon: '👔', name: '白衬衫' },  // 左上（大）
        { icon: '👖', name: '深蓝长裤' }, // 左下（中）
        { icon: '🧥', name: '薄风衣' },  // 右上（大）
        { icon: '👟', name: '小白鞋' },  // 右中（小）
        { icon: '👜', name: '托特包' },  // 右下（小）
      ],
    },

    // 交互状态
    liked: false,
    saved: false,

    // 风格标签
    styles: [
      { id: 'all',    name: '# 全部',   active: true  },
      { id: 'work',   name: '# 通勤',   active: false },
      { id: 'date',   name: '# 约会',   active: false },
      { id: 'casual', name: '# 休闲',   active: false },
      { id: 'sport',  name: '# 运动',   active: false },
      { id: 'home',   name: '# 居家',   active: false },
    ],

    // 更多推荐（双列）
    morePicks: [
      { id: 'p1', title: '周末休闲', match: 87, emoji: '👕',
        cover: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', liked: false },
      { id: 'p2', title: '户外探索', match: 83, emoji: '🧥',
        cover: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', liked: true  },
      { id: 'p3', title: '约会甜美', match: 90, emoji: '👗',
        cover: 'linear-gradient(135deg, #FCE7F3, #FBCFE8)', liked: false },
      { id: 'p4', title: '运动活力', match: 78, emoji: '🏃',
        cover: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', liked: false },
    ],

    // 最近搭配（横滑）
    recent: [
      { id: 'r1', date: '昨天',    title: '通勤极简', emoji: '👔',
        cover: 'linear-gradient(135deg, #E0E7FF, #C7D2FE)' },
      { id: 'r2', date: '3 天前',  title: '周末户外', emoji: '🧥',
        cover: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' },
      { id: 'r3', date: '5 天前',  title: '居家舒适', emoji: '👚',
        cover: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' },
      { id: 'r4', date: '一周前',  title: '运动清爽', emoji: '🏃',
        cover: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)' },
    ],
  },

  onLoad() {
    this.initSystemInfo();
    this.initTheme();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onPullDownRefresh() {
    // TODO: 接入真实 AI 推荐接口
    setTimeout(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已为你刷新推荐', icon: 'none' });
    }, 600);
  },

  /* ============ 初始化 ============ */
  initSystemInfo() {
    const app = getApp();
    const sys = (app && app.globalData && app.globalData.systemInfo) || wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      navBarHeight: 44,
    });
  },

  initTheme() {
    let isDark = false;
    try {
      const v = wx.getStorageSync(THEME_KEY);
      isDark = v === 'dark';
    } catch (_) {}
    this.setData({ isDark });
  },

  /* ============ 顶部按钮 ============ */
  onOpenHistory() {
    wx.showToast({ title: '搭配历史即将上线', icon: 'none' });
  },

  /* ============ Hero / 再来一套 ============ */
  onRegenerate() {
    wx.vibrateShort({ type: 'medium' });
    wx.showLoading({ title: 'AI 生成中...', mask: true });
    // TODO: 调用云函数生成新搭配
    setTimeout(() => {
      wx.hideLoading();
      const newMatch = 85 + Math.floor(Math.random() * 14);
      this.setData({
        'todayOutfit.match': newMatch,
        liked: false,
      });
      wx.showToast({ title: '搭配已更新', icon: 'success' });
    }, 800);
  },

  /* ============ 天气 ============ */
  onWeatherTap() {
    wx.showToast({ title: '天气详情即将上线', icon: 'none' });
  },

  /* ============ 反馈互动 ============ */
  onLike() {
    wx.vibrateShort({ type: 'light' });
    this.setData({ liked: !this.data.liked });
  },

  onDislike() {
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '已收到反馈，将调整风格', icon: 'none' });
  },

  onSave() {
    wx.vibrateShort({ type: 'light' });
    const saved = !this.data.saved;
    this.setData({ saved });
    wx.showToast({ title: saved ? '已加入收藏' : '已取消收藏', icon: 'none' });
  },

  /* ============ 风格标签 ============ */
  onStyleTap(e) {
    const id = e.currentTarget.dataset.id;
    const styles = this.data.styles.map(function (s) {
      return { id: s.id, label: s.label, icon: s.icon, active: s.id === id };
    });
    this.setData({ styles });
    wx.vibrateShort({ type: 'light' });
  },

  /* ============ 更多推荐 ============ */
  onPickTap(e) {
    const id = e.currentTarget.dataset.id;
    const p = this.data.morePicks.find(x => x.id === id);
    if (!p) return;
    wx.showToast({ title: `查看：${p.title}`, icon: 'none' });
  },

  onPickLike(e) {
    const id = e.currentTarget.dataset.id;
    const morePicks = this.data.morePicks.map(function (p) {
      if (p.id !== id) return p;
      return {
        id: p.id,
        title: p.title,
        tag: p.tag,
        emoji: p.emoji,
        match: p.match,
        liked: !p.liked
      };
    });
    this.setData({ morePicks });
    wx.vibrateShort({ type: 'light' });
  },
});
