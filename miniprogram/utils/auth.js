// miniprogram/utils/auth.js
// 登录态、家庭、权限相关工具

const { commonApi } = require('./api.js');

/** 从 globalData 取当前用户；不存在时拉取一次 */
async function getCurrentUser(forceReload = false) {
  const app = getApp();
  if (!app) return null;
  if (!forceReload && app.globalData && app.globalData.userInfo) {
    return app.globalData.userInfo;
  }
  const user = await commonApi.getUser();
  if (user && app.globalData) {
    app.globalData.userInfo = user;
  }
  return user;
}

/** 确保已登录（有 _openid），否则静默调用 getOpenId 初始化 */
async function ensureLogin() {
  const app = getApp();
  if (app && app.globalData && app.globalData.userInfo && app.globalData.userInfo._openid) {
    return app.globalData.userInfo;
  }
  // 未拉取过用户信息时，先尝试拉取
  return await getCurrentUser(true);
}

/** 是否已加入家庭 */
function hasFamily(user) {
  const target = user || (getApp() && getApp().globalData && getApp().globalData.userInfo);
  return !!(target && target.familyId);
}

/** 判断当前用户是否可编辑某件衣物 */
function canEditCloth(cloth) {
  const app = getApp();
  const me = app && app.globalData && app.globalData.userInfo;
  if (!cloth || !me) return false;
  return cloth._openid === me._openid;
}

/** 判断是否可查看某件衣物（所有者或家庭共享） */
function canViewCloth(cloth) {
  const app = getApp();
  const me = app && app.globalData && app.globalData.userInfo;
  if (!cloth || !me) return false;
  if (cloth._openid === me._openid) return true;
  return !!(cloth.isShared && cloth.familyId && cloth.familyId === me.familyId);
}

module.exports = {
  getCurrentUser,
  ensureLogin,
  hasFamily,
  canEditCloth,
  canViewCloth,
};
