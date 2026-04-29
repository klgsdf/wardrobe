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
    // 系统信息
    try {
      const sys = wx.getSystemInfoSync();
      this.globalData.systemInfo = sys;
    } catch (e) {
      console.warn('getSystemInfoSync 失败', e);
    }

    // 云开发初始化（仅在配置了有效 envId 时才执行，避免空 env 导致 Error: timeout）
    if (!wx.cloud) {
      console.warn('当前基础库不支持云能力（需 2.2.3+）');
      return;
    }
    if (!this.globalData.env) {
      // envList.js 未配置环境 ID，跳过云初始化，业务页面可正常运行
      console.info('[云开发] 未配置 envId，已跳过 wx.cloud.init（如需云能力请在 miniprogram/envList.js 填入 envId）');
      return;
    }
    try {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    } catch (e) {
      console.warn('wx.cloud.init 失败', e);
    }
  },
});
