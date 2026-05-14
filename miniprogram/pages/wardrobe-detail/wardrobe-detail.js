// pages/wardrobe-detail/wardrobe-detail.js - 衣柜详情页（分区管理）
var THEME_KEY = 'wardrobe_theme';
var WARDROBE_LIST_KEY = 'wardrobe_list';
// 分区类型标签
var ZONE_TYPES = [
  { type: 'shelf',   label: '隔板层' },
  { type: 'hanger',  label: '挂衣区' },
  { type: 'drawer',  label: '抽屉' },
  { type: 'box',     label: '收纳盒' },
  { type: 'shoe',    label: '鞋区' },
];

// 生成唯一ID
function genId() {
  return 'z_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

Page({
  data: {
    statusBarHeight: 44,
    navPadHeight: 88,
    isDark: false,

    // 当前衣柜数据
    wardrobeId: '',
    wardrobe: null,

    // 添加分区弹窗
    showAddZone: false,
    addZoneForm: {
      name: '',
      type: 'shelf',
    },
    zoneTypes: ZONE_TYPES,

    // 重命名分区弹窗
    showRenameZone: false,
    renameZoneForm: {
      zoneId: '',
      name: '',
    },

    // 选择模式（从 add-favorite 进入）
    selectMode: false,
  },

  onLoad: function (options) {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { statusBarHeight: 44 });
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    var navPadHeight = statusBarHeight + 44;
    var theme = wx.getStorageSync(THEME_KEY) || 'light';
    var selectMode = options && options.from === 'add-favorite';

    this.setData({
      statusBarHeight: statusBarHeight,
      navPadHeight: navPadHeight,
      isDark: theme === 'dark',
      wardrobeId: options.id || '',
      selectMode: selectMode,
    });

    this._loadWardrobe();
  },

  onShow: function () {
    this._loadWardrobe();
  },

  // 加载衣柜数据
  _loadWardrobe: function () {
    var list = wx.getStorageSync(WARDROBE_LIST_KEY) || [];
    var wardrobe = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === this.data.wardrobeId) {
        wardrobe = list[i];
        break;
      }
    }
    if (!wardrobe) {
      wx.showToast({ title: '衣柜不存在', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 1000);
      return;
    }
    this.setData({ wardrobe: wardrobe });
    wx.setNavigationBarTitle({ title: wardrobe.name });
  },

  // 保存衣柜数据到 storage
  _saveWardrobe: function () {
    var list = wx.getStorageSync(WARDROBE_LIST_KEY) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === this.data.wardrobeId) {
        list[i] = this.data.wardrobe;
        break;
      }
    }
    wx.setStorageSync(WARDROBE_LIST_KEY, list);
  },

  // ===== 添加分区 =====
  onShowAddZone: function () {
    wx.vibrateShort({ type: 'light' });
    this.setData({
      showAddZone: true,
      addZoneForm: { name: '', type: 'shelf' },
    });
  },

  onHideAddZone: function () {
    this.setData({ showAddZone: false });
  },

  onAddZoneTypeSelect: function (e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ 'addZoneForm.type': type });
    wx.vibrateShort({ type: 'light' });
  },

  onAddZoneNameInput: function (e) {
    this.setData({ 'addZoneForm.name': e.detail.value });
  },

  onConfirmAddZone: function () {
    var form = this.data.addZoneForm;
    var name = (form.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入分区名称', icon: 'none' });
      return;
    }
    var wardrobe = this.data.wardrobe;
    var zones = wardrobe.zones.slice();
    zones.push({
      id: genId(),
      name: name,
      type: form.type,
      count: 0,
    });
    wardrobe.zones = zones;
    this.setData({ wardrobe: wardrobe, showAddZone: false });
    this._saveWardrobe();
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: '已添加分区', icon: 'none', duration: 1000 });
  },

  // ===== 点击分区 =====
  onZoneTap: function (e) {
    var zoneId = e.currentTarget.dataset.id;
    var zone = null;
    var zones = this.data.wardrobe.zones;
    for (var i = 0; i < zones.length; i++) {
      if (zones[i].id === zoneId) { zone = zones[i]; break; }
    }
    if (!zone) return;

    wx.vibrateShort({ type: 'light' });
    if (this.data.selectMode) {
      // 选择模式：跳转到衣物列表
      wx.navigateTo({
        url: '/pages/zone-clothes/zone-clothes?wardrobeId=' + this.data.wardrobeId + '&zoneId=' + zoneId + '&zoneName=' + encodeURIComponent(zone.name) + '&from=add-favorite',
      });
    } else {
      // 正常模式：跳转到衣物瀑布流页面
      wx.navigateTo({
        url: '/pages/zone-clothes/zone-clothes?wardrobeId=' + this.data.wardrobeId + '&zoneId=' + zoneId + '&zoneName=' + encodeURIComponent(zone.name),
      });
    }
  },

  // ===== 长按分区：操作菜单 =====
  onZoneLongPress: function (e) {
    if (this.data.selectMode) return;
    var zoneId = e.currentTarget.dataset.id;
    var self = this;
    var zone = null;
    var zones = this.data.wardrobe.zones;
    for (var i = 0; i < zones.length; i++) {
      if (zones[i].id === zoneId) { zone = zones[i]; break; }
    }
    if (!zone) return;

    wx.vibrateShort({ type: 'medium' });
    wx.showActionSheet({
      itemList: ['查看衣物', '重命名', '删除'],
      success: function (res) {
        if (res.tapIndex === 0) {
          self.onZoneTap(e);
        } else if (res.tapIndex === 1) {
          self._showRenameZone(zoneId);
        } else if (res.tapIndex === 2) {
          self._deleteZone(zoneId, zone.name);
        }
      },
    });
  },

  // ===== 重命名分区（弹窗方式） =====
  _showRenameZone: function (zoneId) {
    var currentName = '';
    var zones = this.data.wardrobe.zones;
    for (var i = 0; i < zones.length; i++) {
      if (zones[i].id === zoneId) { currentName = zones[i].name; break; }
    }
    this.setData({
      showRenameZone: true,
      renameZoneForm: { zoneId: zoneId, name: currentName },
    });
  },

  onHideRenameZone: function () {
    this.setData({ showRenameZone: false });
  },

  onRenameZoneNameInput: function (e) {
    this.setData({ 'renameZoneForm.name': e.detail.value });
  },

  onConfirmRenameZone: function () {
    var form = this.data.renameZoneForm;
    var name = (form.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入分区名称', icon: 'none' });
      return;
    }
    var wardrobe = this.data.wardrobe;
    for (var j = 0; j < wardrobe.zones.length; j++) {
      if (wardrobe.zones[j].id === form.zoneId) {
        wardrobe.zones[j].name = name;
        break;
      }
    }
    this.setData({ wardrobe: wardrobe, showRenameZone: false });
    this._saveWardrobe();
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '已重命名', icon: 'none', duration: 1000 });
  },

  // ===== 删除分区 =====
  _deleteZone: function (zoneId, name) {
    var self = this;
    wx.showModal({
      title: '删除「' + name + '」',
      content: '删除后不可恢复，确定要删除吗？',
      confirmText: '删除',
      confirmColor: '#E74C3C',
      success: function (res) {
        if (res.confirm) {
          var wardrobe = self.data.wardrobe;
          wardrobe.zones = wardrobe.zones.filter(function (z) {
            return z.id !== zoneId;
          });
          self.setData({ wardrobe: wardrobe });
          self._saveWardrobe();
          wx.vibrateShort({ type: 'medium' });
          wx.showToast({ title: '已删除', icon: 'none', duration: 1000 });
        }
      },
    });
  },

  // 返回
  onBack: function () {
    wx.navigateBack();
  },

  // 切换主题
  onToggleTheme: function () {
    var next = this.data.isDark ? 'light' : 'dark';
    wx.setStorageSync(THEME_KEY, next);
    this.setData({ isDark: next === 'dark' });
    wx.vibrateShort({ type: 'light' });
  },
});
