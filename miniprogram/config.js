// miniprogram/config.js
// 智能衣柜小程序 - 全局常量配置

const { envList } = require('./envList.js');

/** 云开发环境 ID（从 envList 读取第一项，未配置则为空字符串） */
const envId = (envList && envList[0] && envList[0].envId) || '';

/** 云数据库集合名 */
const COLLECTIONS = {
  USERS: 'users',
  FAMILIES: 'families',
  CLOTHES: 'clothes',
  OUTFITS: 'outfits',
  WEAR_LOGS: 'wearLogs',
};

/** 衣物大类 - key 对应数据库 category 字段 */
const CATEGORIES = [
  { key: 'top', label: '上装', icon: '👕' },
  { key: 'bottom', label: '下装', icon: '👖' },
  { key: 'dress', label: '连衣裙', icon: '👗' },
  { key: 'outer', label: '外套', icon: '🧥' },
  { key: 'shoes', label: '鞋靴', icon: '👟' },
  { key: 'accessory', label: '配饰', icon: '👜' },
];

/** 季节标签 */
const SEASONS = [
  { key: 'spring', label: '春' },
  { key: 'summer', label: '夏' },
  { key: 'autumn', label: '秋' },
  { key: 'winter', label: '冬' },
];

/** 常用颜色色板 */
const COLORS = [
  { key: 'white', label: '白色', hex: '#FFFFFF' },
  { key: 'black', label: '黑色', hex: '#2D3748' },
  { key: 'gray', label: '灰色', hex: '#A0AEC0' },
  { key: 'blue', label: '蓝色', hex: '#5B8DB8' },
  { key: 'navy', label: '藏青', hex: '#2C5282' },
  { key: 'red', label: '红色', hex: '#E53E3E' },
  { key: 'pink', label: '粉色', hex: '#F687B3' },
  { key: 'yellow', label: '黄色', hex: '#ECC94B' },
  { key: 'green', label: '绿色', hex: '#48BB78' },
  { key: 'brown', label: '棕色', hex: '#8B5A2B' },
  { key: 'beige', label: '米色', hex: '#E8DCC4' },
  { key: 'purple', label: '紫色', hex: '#805AD5' },
];

/** 场合标签 */
const OCCASIONS = [
  { key: 'daily', label: '日常' },
  { key: 'work', label: '通勤' },
  { key: 'date', label: '约会' },
  { key: 'party', label: '聚会' },
  { key: 'sport', label: '运动' },
  { key: 'travel', label: '旅行' },
  { key: 'formal', label: '正式' },
];

/** 风格标签 */
const STYLES = [
  { key: 'casual', label: '休闲' },
  { key: 'business', label: '商务' },
  { key: 'sweet', label: '甜美' },
  { key: 'cool', label: '酷飒' },
  { key: 'vintage', label: '复古' },
  { key: 'street', label: '街头' },
  { key: 'minimal', label: '极简' },
  { key: 'sport', label: '运动' },
];

/** 列表分页大小 */
const PAGE_SIZE = 20;

/** 主题色板（与 app.wxss 保持同步） */
const THEME = {
  primary: '#5B8DB8',
  primaryLight: '#7BA3C9',
  textMain: '#2D3748',
  textSub: '#718096',
  textAssist: '#A0AEC0',
  bgStart: '#F0F4F8',
  bgEnd: '#E8EEF4',
};

module.exports = {
  envId,
  COLLECTIONS,
  CATEGORIES,
  SEASONS,
  COLORS,
  OCCASIONS,
  STYLES,
  PAGE_SIZE,
  THEME,
};
