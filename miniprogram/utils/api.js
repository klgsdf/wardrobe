// miniprogram/utils/api.js
// 统一云函数调用封装。本轮仅提供签名与降级，待云函数部署后替换实现。

/**
 * 统一云函数调用
 * @param {string} name 云函数名
 * @param {string} action 动作
 * @param {object} data 参数
 * @returns {Promise<any>}
 */
async function callCloud(name, action, data = {}) {
  try {
    const res = await wx.cloud.callFunction({
      name,
      data: { action, ...data },
    });
    const result = res && res.result;
    if (result && result.success === false) {
      const msg = (result && result.message) || '服务异常';
      wx.showToast({ title: msg, icon: 'none' });
      return null;
    }
    return (result && result.data !== undefined) ? result.data : result;
  } catch (err) {
    // 云函数未部署或网络错误 - 静默降级，便于 UI 独立调试
    console.warn(`[callCloud] ${name}.${action} 调用失败:`, err);
    return null;
  }
}

/**
 * 上传图片到云存储
 * @param {string} filePath 本地临时文件路径
 * @param {string} dir 云存储目录前缀
 * @returns {Promise<string|null>} 成功返回 fileID
 */
async function uploadImage(filePath, dir = 'clothes') {
  try {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const ext = (filePath.split('.').pop() || 'jpg').toLowerCase();
    const cloudPath = `${dir}/${ts}_${rand}.${ext}`;
    const res = await wx.cloud.uploadFile({ cloudPath, filePath });
    return res && res.fileID;
  } catch (err) {
    console.warn('[uploadImage] 上传失败:', err);
    wx.showToast({ title: '图片上传失败', icon: 'none' });
    return null;
  }
}

/* ========== 分域 API 聚合 ========== */

const commonApi = {
  getOpenId: () => callCloud('common', 'getOpenId'),
  getUser: () => callCloud('common', 'getUser'),
  upsertUser: (data) => callCloud('common', 'upsertUser', data),
  getWeather: (lat, lon) => callCloud('common', 'getWeather', { lat, lon }),
};

const clothApi = {
  addCloth: (data) => callCloud('cloth', 'addCloth', data),
  updateCloth: (id, data) => callCloud('cloth', 'updateCloth', { id, ...data }),
  deleteCloth: (id) => callCloud('cloth', 'deleteCloth', { id }),
  getClothList: (params) => callCloud('cloth', 'getClothList', params),
  getClothDetail: (id) => callCloud('cloth', 'getClothDetail', { id }),
};

const outfitApi = {
  createOutfit: (data) => callCloud('outfit', 'createOutfit', data),
  getOutfitList: (params) => callCloud('outfit', 'getOutfitList', params),
  getOutfitDetail: (id) => callCloud('outfit', 'getOutfitDetail', { id }),
  getRecommend: (params) => callCloud('outfit', 'getRecommend', params),
  markWorn: (id) => callCloud('outfit', 'markWorn', { id }),
  toggleFavorite: (id) => callCloud('outfit', 'toggleFavorite', { id }),
};

const familyApi = {
  createFamily: (data) => callCloud('family', 'createFamily', data),
  joinFamily: (inviteCode) => callCloud('family', 'joinFamily', { inviteCode }),
  getFamily: () => callCloud('family', 'getFamily'),
  getMembers: () => callCloud('family', 'getMembers'),
  leaveFamily: () => callCloud('family', 'leaveFamily'),
};

module.exports = {
  callCloud,
  uploadImage,
  commonApi,
  clothApi,
  outfitApi,
  familyApi,
};
