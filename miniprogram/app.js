// app.js - 智能衣柜小程序入口
const { envId } = require('./config.js');

App({
  globalData: {
    env: envId,
    userInfo: null,      // 当前用户（含 _openid / familyId 等）
    familyInfo: null,    // 家庭信息
    systemInfo: null,    // 系统信息（状态栏高度等）
  },

  onLaunch() {
    // 系统信息（使用新 API 替代废弃的 getSystemInfoSync）
    try {
      var sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.globalData.systemInfo = sys;
    } catch (e) {
      console.warn('获取系统信息失败', e);
    }

    // 云开发初始化
    if (!wx.cloud) {
      console.warn('当前基础库不支持云能力（需 2.2.3+）');
      return;
    }
    try {
      wx.cloud.init({
        env: 'klgsdf-d4grlh1dd0a94f055',
        traceUser: true,
      });
      console.info('[云开发] 初始化成功，环境ID: klgsdf-d4grlh1dd0a94f055');
    } catch (e) {
      console.warn('wx.cloud.init 失败', e);
    }
  },
});
