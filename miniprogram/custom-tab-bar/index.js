// custom-tab-bar/index.js - 手绘线条风自定义 TabBar
var THEME_KEY = 'wardrobe_theme';

Component({
  data: {
    selected: 0,
    isDark: false,
  },

  lifetimes: {
    attached: function () {
      try {
        var theme = wx.getStorageSync(THEME_KEY) || 'light';
        this.setData({ isDark: theme === 'dark' });
      } catch (e) {}
    },
  },

  /* 页面 show 时同步主题（跨页切换自动跟随） */
  pageLifetimes: {
    show: function () {
      try {
        var theme = wx.getStorageSync(THEME_KEY) || 'light';
        var next = theme === 'dark';
        if (next !== this.data.isDark) {
          this.setData({ isDark: next });
        }
      } catch (e) {}
    },
  },

  methods: {
    // 切换 tab
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path  = e.currentTarget.dataset.path;
      if (index === this.data.selected) return;
      wx.switchTab({ url: path });
    },

    // 中间 Add 按钮：弹出添加衣物选项
    onAdd() {
      wx.vibrateShort({ type: 'medium' });
      const self = this;
      wx.showActionSheet({
        itemList: ['拍照添加', '从相册选择', '手动录入'],
        success: function (res) {
          if (res.tapIndex === 0) {
            self.chooseWithCamera();
          } else if (res.tapIndex === 1) {
            self.chooseFromAlbum();
          } else if (res.tapIndex === 2) {
            wx.navigateTo({ url: '/pages/add-cloth/add-cloth' });
          }
        },
      });
    },

    chooseWithCamera() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera'],
        success: function (res) {
          var tempFilePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
          if (tempFilePath) {
            wx.navigateTo({ url: '/pages/add-cloth/add-cloth?tempFilePath=' + tempFilePath });
          }
        },
      });
    },

    chooseFromAlbum() {
      wx.chooseMedia({
        count: 9,
        mediaType: ['image'],
        sourceType: ['album'],
        success: function (res) {
          var tempFilePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
          if (tempFilePath) {
            wx.navigateTo({ url: '/pages/add-cloth/add-cloth?tempFilePath=' + tempFilePath });
          }
        },
      });
    },
  },
});
