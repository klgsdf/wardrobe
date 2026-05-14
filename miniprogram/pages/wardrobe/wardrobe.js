// pages/wardrobe/wardrobe.js - 衣柜管理列表页
var THEME_KEY = 'wardrobe_theme';
var WARDROBE_LIST_KEY = 'wardrobe_list';

// 衣柜类型预设
var WARDROBE_TYPES = [
  { type: 'closet',     label: '衣柜', icon: 'closet' },
  { type: 'drawer',     label: '抽屉柜', icon: 'drawer' },
  { type: 'shoe-rack',  label: '鞋柜', icon: 'shoe' },
  { type: 'shelf',      label: '置物架', icon: 'shelf' },
  { type: 'seasonal',   label: '换季收纳', icon: 'box' },
];

// 生成唯一ID
function genId() {
  return 'w_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// 默认衣柜列表（首次使用）
var DEFAULT_WARDROBES = [
  {
    id: 'w_default_1',
    name: '主柜',
    type: 'closet',
    desc: '日常衣物存放',
    itemCount: 0,
    zones: [
      { id: 'z_1', name: '上层隔板', type: 'shelf', count: 0 },
      { id: 'z_2', name: '挂衣区', type: 'hanger', count: 0 },
      { id: 'z_3', name: '下层抽屉', type: 'drawer', count: 0 },
    ],
    createdAt: Date.now(),
  },
  {
    id: 'w_default_2',
    name: '鞋柜',
    type: 'shoe-rack',
    desc: '鞋子收纳',
    itemCount: 0,
    zones: [
      { id: 'z_1', name: '常用区', type: 'shelf', count: 0 },
      { id: 'z_2', name: '换季区', type: 'shelf', count: 0 },
    ],
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'w_default_3',
    name: '配饰抽屉',
    type: 'drawer',
    desc: '围巾、帽子、腰带',
    itemCount: 0,
    zones: [
      { id: 'z_1', name: '第一层', type: 'drawer', count: 0 },
      { id: 'z_2', name: '第二层', type: 'drawer', count: 0 },
      { id: 'z_3', name: '第三层', type: 'drawer', count: 0 },
    ],
    createdAt: Date.now() - 172800000,
  },
];

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    menuBtnTop: 32,
    menuBtnHeight: 32,
    isDark: false,

    // 衣柜列表
    wardrobes: [],
    totalItems: 0,
    totalZones: 0,

    // 添加弹窗
    showAddSheet: false,
    addForm: {
      name: '',
      type: 'closet',
      desc: '',
    },

    // 衣柜类型选项
    typeOptions: WARDROBE_TYPES,

    // 选择模式（从 add-favorite 进入）
    selectMode: false,
  },

  onLoad: function (options) {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44 });
    var menuBtn = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    var navPadHeight = menuBtn ? (menuBtn.bottom + 8) : (statusBarHeight + 44);
    var menuBtnTop = menuBtn ? menuBtn.top : (statusBarHeight + 4);
    var menuBtnHeight = menuBtn ? menuBtn.height : 32;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';

    this.setData({
      statusBarHeight: statusBarHeight,
      navPadHeight: navPadHeight,
      menuBtnTop: menuBtnTop,
      menuBtnHeight: menuBtnHeight,
      isDark: theme === 'dark',
    });

    this._loadWardrobes();
  },

  onShow: function () {
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    if ((theme === 'dark') !== this.data.isDark) {
      this.setData({ isDark: theme === 'dark' });
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, isDark: theme === 'dark' });
    }
    // 每次显示时重新加载列表（从详情页返回可能数据变了）
    this._loadWardrobes();

    // 检查是否从 add-favorite 进入选择模式
    var selectModeSource = wx.getStorageSync('__wardrobe_select_mode');
    this.setData({ selectMode: !!selectModeSource });
  },

  // 加载衣柜列表
  _loadWardrobes: function () {
    var list = wx.getStorageSync(WARDROBE_LIST_KEY);
    if (!list || !list.length) {
      list = DEFAULT_WARDROBES;
      wx.setStorageSync(WARDROBE_LIST_KEY, list);
    }
    var totalItems = 0;
    var totalZones = 0;
    for (var i = 0; i < list.length; i++) {
      totalItems += list[i].itemCount || 0;
      totalZones += (list[i].zones || []).length;
    }
    this.setData({ wardrobes: list, totalItems: totalItems, totalZones: totalZones });
  },

  // 保存衣柜列表
  _saveWardrobes: function () {
    wx.setStorageSync(WARDROBE_LIST_KEY, this.data.wardrobes);
  },

  // ===== 添加衣柜 =====
  onShowAddSheet: function () {
    wx.vibrateShort({ type: 'light' });
    this.setData({
      showAddSheet: true,
      addForm: { name: '', type: 'closet', desc: '' },
    });
  },

  onHideAddSheet: function () {
    this.setData({ showAddSheet: false });
  },

  onAddFormNameInput: function (e) {
    this.setData({ 'addForm.name': e.detail.value });
  },

  onAddFormDescInput: function (e) {
    this.setData({ 'addForm.desc': e.detail.value });
  },

  onTypeSelect: function (e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ 'addForm.type': type });
    wx.vibrateShort({ type: 'light' });
  },

  onConfirmAdd: function () {
    var form = this.data.addForm;
    var name = (form.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入衣柜名称', icon: 'none' });
      return;
    }

    // 根据类型生成默认分区
    var defaultZones = this._getDefaultZones(form.type);

    var newWardrobe = {
      id: genId(),
      name: name,
      type: form.type,
      desc: form.desc || this._getTypeLabel(form.type),
      itemCount: 0,
      zones: defaultZones,
      createdAt: Date.now(),
    };

    var list = this.data.wardrobes.slice();
    list.unshift(newWardrobe);
    this.setData({ wardrobes: list, showAddSheet: false });
    this._saveWardrobes();
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: '已添加「' + name + '」', icon: 'none', duration: 1200 });
  },

  // 根据类型返回默认分区
  _getDefaultZones: function (type) {
    var zonesMap = {
      'closet': [
        { id: 'z_1', name: '上层隔板', type: 'shelf', count: 0 },
        { id: 'z_2', name: '挂衣区', type: 'hanger', count: 0 },
        { id: 'z_3', name: '下层抽屉', type: 'drawer', count: 0 },
      ],
      'drawer': [
        { id: 'z_1', name: '第一层', type: 'drawer', count: 0 },
        { id: 'z_2', name: '第二层', type: 'drawer', count: 0 },
        { id: 'z_3', name: '第三层', type: 'drawer', count: 0 },
      ],
      'shoe-rack': [
        { id: 'z_1', name: '常用区', type: 'shelf', count: 0 },
        { id: 'z_2', name: '换季区', type: 'shelf', count: 0 },
      ],
      'shelf': [
        { id: 'z_1', name: '上层', type: 'shelf', count: 0 },
        { id: 'z_2', name: '中层', type: 'shelf', count: 0 },
        { id: 'z_3', name: '下层', type: 'shelf', count: 0 },
      ],
      'seasonal': [
        { id: 'z_1', name: '夏季衣物', type: 'box', count: 0 },
        { id: 'z_2', name: '冬季衣物', type: 'box', count: 0 },
      ],
    };
    return zonesMap[type] || zonesMap['closet'];
  },

  _getTypeLabel: function (type) {
    for (var i = 0; i < WARDROBE_TYPES.length; i++) {
      if (WARDROBE_TYPES[i].type === type) return WARDROBE_TYPES[i].label;
    }
    return '衣柜';
  },

  // ===== 点击衣柜条目 =====
  onWardrobeTap: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.vibrateShort({ type: 'light' });
    if (this.data.selectMode) {
      // 选择模式：跳转到分区列表
      wx.navigateTo({
        url: '/pages/wardrobe-detail/wardrobe-detail?id=' + id + '&from=add-favorite',
      });
    } else {
      // 正常模式：进入详情
      wx.navigateTo({ url: '/pages/wardrobe-detail/wardrobe-detail?id=' + id });
    }
  },

  // ===== 长按衣柜条目 → 删除 =====
  onWardrobeLongPress: function (e) {
    if (this.data.selectMode) return;
    var id = e.currentTarget.dataset.id;
    var self = this;
    var wardrobe = null;
    for (var i = 0; i < this.data.wardrobes.length; i++) {
      if (this.data.wardrobes[i].id === id) {
        wardrobe = this.data.wardrobes[i];
        break;
      }
    }
    if (!wardrobe) return;

    wx.showActionSheet({
      itemList: ['重命名', '删除'],
      success: function (res) {
        if (res.tapIndex === 0) {
          self._renameWardrobe(id);
        } else if (res.tapIndex === 1) {
          self._deleteWardrobe(id, wardrobe.name);
        }
      },
    });
  },

  _renameWardrobe: function (id) {
    var self = this;
    var currentName = '';
    for (var i = 0; i < this.data.wardrobes.length; i++) {
      if (this.data.wardrobes[i].id === id) {
        currentName = this.data.wardrobes[i].name;
        break;
      }
    }
    wx.showModal({
      title: '重命名衣柜',
      editable: true,
      placeholderText: '输入新名称',
      content: currentName,
      success: function (res) {
        if (res.confirm && res.content) {
          var name = res.content.trim();
          if (!name) return;
          var list = self.data.wardrobes.slice();
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
              list[i].name = name;
              break;
            }
          }
          self.setData({ wardrobes: list });
          self._saveWardrobes();
          wx.vibrateShort({ type: 'light' });
        }
      },
    });
  },

  _deleteWardrobe: function (id, name) {
    var self = this;
    wx.showModal({
      title: '删除「' + name + '」',
      content: '删除后不可恢复，确定要删除吗？',
      confirmText: '删除',
      confirmColor: '#E74C3C',
      success: function (res) {
        if (res.confirm) {
          var list = self.data.wardrobes.filter(function (w) {
            return w.id !== id;
          });
          self.setData({ wardrobes: list });
          self._saveWardrobes();
          wx.vibrateShort({ type: 'medium' });
          wx.showToast({ title: '已删除', icon: 'none', duration: 1000 });
        }
      },
    });
  },

  // 切换主题
  onToggleTheme: function () {
    var next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ isDark: next === 'dark' });
    }
    wx.vibrateShort({ type: 'light' });
  },
});
