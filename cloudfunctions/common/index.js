// cloudfunctions/common/index.js - 公共云函数（含天气查询）
// 天气数据来源：open-meteo.com（免费，无需 API Key）
// 反向地理编码：bigdatacloud.net（免费，无需 API Key），失败时回退 open-meteo geocoding
const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/* ========== HTTPS 工具 ========== */
function httpsGetJson(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'wechat-miniprogram/wardrobe',
          'Accept': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('JSON解析失败: ' + e.message)); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error('请求超时'));
    });
  });
}

/* ========== 天气代码映射（WMO 标准） ========== */
const WEATHER_CODE_MAP = {
  0:  { type: 'sunny',  desc: '晴' },
  1:  { type: 'sunny',  desc: '晴' },
  2:  { type: 'cloudy', desc: '多云' },
  3:  { type: 'cloudy', desc: '阴' },
  45: { type: 'cloudy', desc: '雾' },
  48: { type: 'cloudy', desc: '雾凇' },
  51: { type: 'rainy',  desc: '小毛毛雨' },
  53: { type: 'rainy',  desc: '毛毛雨' },
  55: { type: 'rainy',  desc: '大毛毛雨' },
  56: { type: 'rainy',  desc: '冻毛毛雨' },
  57: { type: 'rainy',  desc: '冻毛毛雨' },
  61: { type: 'rainy',  desc: '小雨' },
  63: { type: 'rainy',  desc: '中雨' },
  65: { type: 'rainy',  desc: '大雨' },
  66: { type: 'rainy',  desc: '冻雨' },
  67: { type: 'rainy',  desc: '冻雨' },
  71: { type: 'snowy',  desc: '小雪' },
  73: { type: 'snowy',  desc: '中雪' },
  75: { type: 'snowy',  desc: '大雪' },
  77: { type: 'snowy',  desc: '雪粒' },
  80: { type: 'rainy',  desc: '阵雨' },
  81: { type: 'rainy',  desc: '中阵雨' },
  82: { type: 'rainy',  desc: '强阵雨' },
  85: { type: 'snowy',  desc: '阵雪' },
  86: { type: 'snowy',  desc: '强阵雪' },
  95: { type: 'rainy',  desc: '雷阵雨' },
  96: { type: 'rainy',  desc: '雷阵雨伴冰雹' },
  99: { type: 'rainy',  desc: '雷阵雨伴大冰雹' },
};

/* ========== 反向地理编码：获取城市名称 ========== */
async function reverseGeocode(lat, lon) {
  // 优先使用 bigdatacloud（中文支持较好）
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
    const data = await httpsGetJson(url, 4000);
    if (data) {
      const city = data.city || data.locality || data.principalSubdivision || data.countryName;
      if (city) return city;
    }
  } catch (e) {
    console.warn('[reverseGeocode] bigdatacloud 失败:', e.message);
  }
  // 回退：open-meteo 的 geocoding 反查（按距离排序）
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=zh&format=json`;
    const data = await httpsGetJson(url, 4000);
    if (data && data.results && data.results.length) {
      return data.results[0].name || data.results[0].admin1 || '当前位置';
    }
  } catch (e) {
    console.warn('[reverseGeocode] open-meteo 失败:', e.message);
  }
  return '当前位置';
}

/* ========== 实时天气 ========== */
async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
  const data = await httpsGetJson(url, 6000);
  if (!data || !data.current) {
    throw new Error('天气数据为空');
  }
  return data.current;
}

/* ========== 主入口：getWeather ========== */
async function getWeather(event) {
  const lat = Number(event.lat);
  const lon = Number(event.lon);
  if (!isFinite(lat) || !isFinite(lon)) {
    return { success: false, message: '缺少有效经纬度' };
  }
  try {
    const [current, city] = await Promise.all([
      fetchCurrentWeather(lat, lon),
      reverseGeocode(lat, lon),
    ]);
    const code = current.weather_code;
    const isDay = current.is_day === 1 || current.is_day === true;
    let info = WEATHER_CODE_MAP[code] || { type: 'sunny', desc: '晴' };
    // 夜间晴天单独标记，便于前端切换月亮图标
    if (!isDay && info.type === 'sunny') {
      info = { type: 'night', desc: '晴夜' };
    }
    const tempNum = Math.round(Number(current.temperature_2m));
    return {
      success: true,
      data: {
        type: info.type,
        desc: info.desc,
        temp: (isFinite(tempNum) ? tempNum : '--') + '℃',
        city: city || '当前位置',
        lat,
        lon,
      },
    };
  } catch (err) {
    console.error('[getWeather] 失败:', err && err.message);
    return { success: false, message: '天气获取失败: ' + (err && err.message) };
  }
}

/* ========== getOpenId（顺带提供） ========== */
async function getOpenId() {
  const wxContext = cloud.getWXContext();
  return {
    success: true,
    data: {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
    },
  };
}

/* ========== 路由 ========== */
exports.main = async (event) => {
  const { action } = event || {};
  switch (action) {
    case 'getWeather':
      return getWeather(event);
    case 'getOpenId':
      return getOpenId();
    default:
      return { success: false, message: '未知 action: ' + action };
  }
};
