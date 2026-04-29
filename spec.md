# 智能衣柜微信小程序 - 需求规格说明书

> 本文档涵盖项目规划阶段及后续迭代的所有功能设计，包括基础架构、数据模型、核心功能、AI能力、UI设计等。

---

## 1. 项目概述

### 1.1 项目定位
面向家庭用户的智能衣柜管理小程序，提供衣物数字化管理、AI个性化穿搭推荐、家庭共享搭配建议等功能。

### 1.2 核心功能
| 功能模块 | 描述 |
|---------|------|
| 衣物数字化管理 | 拍照上传、分类标签、属性管理（颜色/季节/材质/品牌等） |
| AI智能穿搭推荐 | 基于天气、场合、用户衣物库存的智能搭配推荐 |
| 家庭共享空间 | 2-5人家庭，独立衣物空间 + 共享搭配建议 |
| 穿搭日记 | 记录穿着历史，统计衣物使用频率 |
| 换季收纳 | 按季节筛选和管理衣物 |

### 1.3 技术栈
- **前端框架**：微信小程序原生框架（WXML / WXSS / JS）
- **云服务**：微信云开发（CloudBase）- 云数据库 + 云存储 + 云函数
- **AI能力**：腾讯混元大模型（`wx.cloud.extend.AI`）
- **天气服务**：和风天气API

---

## 2. 基础架构设计

### 2.1 前端页面结构
采用微信小程序分包加载架构：

```
主包（4个tabBar页）
├── pages/index/index          # 首页
├── pages/wardrobe/wardrobe    # 衣柜
├── pages/outfit/outfit        # 搭配
└── pages/profile/profile      # 我的

packageCloth（衣物管理分包）
├── pages/cloth-add/add        # 添加/编辑衣物
├── pages/cloth-detail/detail  # 衣物详情
└── pages/cloth-category/category  # 分类管理

packageOutfit（搭配分包）
├── pages/outfit-recommend/recommend  # AI智能推荐
├── pages/outfit-detail/detail        # 搭配详情
└── pages/outfit-create/create        # 创建搭配

packageFamily（家庭分包）
├── pages/family-manage/manage  # 家庭管理
└── pages/family-share/share    # 共享空间
```

### 2.2 数据流架构
```
小程序前端 → 云函数层 → 云数据库 / 云存储
```
- 所有数据操作通过云函数中转，前端不直接操作数据库
- 鉴权通过 `wx.cloud.getWXContext()` 获取 `_openid`

### 2.3 全局配置文件
| 文件 | 作用 |
|------|------|
| `miniprogram/config.js` | 全局常量：环境ID、集合名、分类/颜色/季节配置、分页大小 |
| `miniprogram/utils/api.js` | API封装：统一云函数调用、图片上传、错误处理 |
| `miniprogram/utils/auth.js` | 权限工具：登录状态、家庭信息、编辑权限校验 |

---

## 3. 数据模型设计

### 3.1 集合列表
| 集合名 | 说明 |
|--------|------|
| `users` | 用户信息 |
| `families` | 家庭信息 |
| `clothes` | 衣物数据 |
| `outfits` | 搭配方案 |
| `wearLogs` | 穿着记录 |

### 3.2 用户表（users）
```js
{
  _openid: string,          // 微信openid
  nickName: string,         // 昵称
  avatarUrl: string,        // 头像
  familyId: string,         // 所属家庭ID
  role: string,             // admin / member
  preferences: {
    style: Array<string>,   // 偏好风格
    colors: Array<string>,  // 偏好颜色
  },
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.3 衣物表（clothes）
```js
{
  _openid: string,          // 所有者
  familyId: string,         // 家庭ID
  name: string,             // 名称
  images: Array<string>,    // 图片fileID列表
  category: string,         // 大类（top/bottom/dress/outer/shoes/accessory）
  subCategory: string,      // 子类
  color: string,            // 主色调
  season: Array<string>,    // 适用季节
  material: string,         // 材质
  brand: string,            // 品牌
  size: string,             // 尺码
  price: number,            // 价格
  purchaseDate: Date,       // 购买日期
  style: Array<string>,     // 风格标签
  occasions: Array<string>, // 适用场合
  isShared: boolean,        // 是否对家庭共享
  status: string,           // active / inactive（软删除）
  wearCount: number,        // 穿着次数
  lastWornAt: Date,         // 最后穿着时间
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.4 搭配表（outfits）
```js
{
  _openid: string,          // 创建者
  familyId: string,
  name: string,             // 搭配名称
  description: string,      // 描述
  clothes: Array<{          // 组成衣物
    clothId: string,
    category: string,
    image: string,
  }>,
  isAIRecommended: boolean, // 是否AI推荐
  aiSource: string,         // hunyuan / rule
  recommendReason: string,  // 推荐理由
  weather: Object,          // 推荐时天气
  occasion: string,         // 场合
  isFavorite: boolean,      // 是否收藏
  wornCount: number,        // 穿着次数
  isShared: boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

---

## 4. 功能模块设计

### 4.1 首页（pages/index）
**布局结构**：
1. 自定义磨砂导航栏（`navigationStyle: custom`）
2. 欢迎语 + 当前日期
3. 天气玻璃卡片（温度/城市/湿度/风向/体感）
4. AI穿搭推荐渐变横幅
5. 核心功能宫格（5宫格：衣物管理/穿搭日记/换季收纳/智能搭配/洗衣提醒）
6. 快捷操作栏
7. 家庭提示（未加入家庭时显示）

**交互逻辑**：
- `initPage()`：加载用户信息、天气、今日推荐
- `loadWeather()`：获取定位后调 `commonApi.getWeather`
- `loadTodayRecommend()`：调 `outfitApi.getRecommend`
- 支持下拉刷新

### 4.2 衣柜页（pages/wardrobe）
**功能**：
- 搜索栏：按名称搜索衣物
- 分类筛选：横向滚动胶囊标签（全部/上装/下装/连衣裙/外套/鞋靴/配饰）
- 双视图切换：网格视图（3列卡片）/ 列表视图
- 触底分页加载（每页20条）
- 浮动添加按钮（跳转 `cloth-add`）

**数据加载**：
- `loadClothList(true)` 重置加载，`loadClothList()` 加载更多
- 支持 `category` 和 `keyword` 双重筛选

### 4.3 衣物详情（packageCloth/pages/cloth-detail）
**展示内容**：
- Swiper图片轮播（最多5张）
- 基础信息：名称、分类、颜色
- 详细属性：季节、材质、品牌、尺码、价格、购买日期
- 风格/场合标签
- 穿着统计：次数、最后穿着时间
- 操作按钮：编辑、删除（软删除）

### 4.4 添加/编辑衣物（packageCloth/pages/cloth-add）
**双模式支持**：
- **新增模式**：`mode=add`，上传图片后调 `clothApi.addCloth`
- **编辑模式**：`mode=edit&id=xxx`，加载现有数据回填，调 `clothApi.updateCloth`

**图片处理**：
- `existingImages`：已有云存储图片（`cloud://` 开头）
- `newImages`：新选择的临时图片
- 删除时区分来源，提交时合并保留图片 + 新上传图片

**表单字段**：
名称*、图片*、分类*、子分类、颜色*、季节*、材质、品牌、尺码、价格、购买日期、风格、场合、共享开关

### 4.5 搭配页（pages/outfit）
**功能**：
- 顶部操作栏：智能推荐按钮 + 创建搭配按钮
- Tab切换：我的 / 收藏 / 共享
- 搭配卡片列表：横向衣物缩略图 + 名称/描述/标签
- 触底加载更多

### 4.6 AI智能推荐（packageOutfit/pages/outfit-recommend）
**流程**：
1. 检查定位权限
2. 加载天气信息
3. 用户选择场合（picker）
4. 点击"获取推荐"调 `outfitApi.getRecommend({ occasion, weather })`
5. 展示推荐结果卡片

### 4.7 搭配详情（packageOutfit/pages/outfit-detail）
**展示内容**：
- 搭配名称 + AI标签/场合标签
- 推荐理由 + 描述
- 推荐时天气信息
- 创建者信息（头像/昵称）
- 衣物组合列表（每件衣物的图片/名称/分类/颜色）
- 统计：穿着次数、收藏状态、共享状态
- 底部操作栏：标记已穿 + 收藏/取消收藏

### 4.8 家庭管理（packageFamily/pages/family-manage）
**功能**：
- 已加入家庭：展示家庭名称、邀请码（可复制）、成员列表、退出按钮
- 未加入家庭：创建家庭表单 / 输入邀请码加入
- 邀请码：6位随机字符串（`Math.random().toString(36).substring(2, 8).toUpperCase()`）

---

## 5. AI能力设计

### 5.1 推荐引擎架构（双引擎）
```
用户请求推荐
    │
    ▼
优先尝试混元大模型（hunyuan云函数）
    │
    ├── 成功 → 使用混元AI推荐结果，标记 aiSource='hunyuan'
    │
    └── 失败（任何原因：未开通/超时/解析失败）
            │
            ▼
    降级到规则引擎（温度筛选 + 组合生成）
            │
            ▼
    标记 aiSource='rule'
```

### 5.2 腾讯混元大模型集成
**实现方式**：微信云开发原生AI扩展（`wx.cloud.extend.AI`）

**云函数**：`cloudfunctions/hunyuan/index.js`
- `action: recommendOutfit`：穿搭推荐
- `action: chat`：通用对话

**调用方式**：
```js
const model = cloud.extend.AI.createModel('hunyuan-exp')
const res = await model.streamText({
  data: {
    model: 'hunyuan-turbos-latest',
    messages: [{ role: 'user', content: prompt }]
  }
})
```

**Prompt设计**：
- 输入：衣物清单（ID/名称/分类/颜色/材质/风格）、天气信息、场合
- 输出要求：严格JSON格式，包含 `outfits` 数组（每套含名称/描述/衣物列表/推荐理由）
- 解析：云函数内收集流式输出 → 提取JSON块 → 校验衣物有效性

**安全性**：无需管理API密钥，权限由云开发环境统一管控

### 5.3 规则引擎（降级方案）
**温度筛选**：
- ≥25°C → 夏季衣物
- 15-25°C → 春秋衣物
- <15°C → 冬季衣物

**组合策略**：
- 上衣(top) + 下装(bottom) + 鞋靴(shoes) 为必选项
- 温度<20°C 时加入外套(outer)
- 轮询取各分类第 i 件衣物生成3套搭配

### 5.4 和风天气API
**云函数**：`cloudfunctions/common/index.js` - `getWeather(lat, lon)`

**接口**：
1. `geoapi.qweather.com/v2/city/lookup?location=lon,lat` → 获取城市名称
2. `devapi.qweather.com/v7/weather/now?location=lon,lat` → 获取实时天气

**返回字段**：city, temp, condition, humidity, windLevel, weatherCode, feelsLike, windDir, pressure, vis, obsTime

**配置**：`QWEATHER_KEY` 常量（需替换为实际API Key），未配置时返回兜底数据

---

## 6. UI设计规范

### 6.1 设计风格
- **风格定位**：极简轻科技风
- **核心特征**：玻璃态磨砂卡片、低饱和度雾感配色、大圆角、柔和阴影
- **适配比例**：375:667（iPhone SE 基准，基于 rpx 自适应）

### 6.2 色彩系统
| 角色 | 色值 |
|------|------|
| 页面背景 | `#F0F4F8` / `#E8EEF4` 渐变 |
| 主色调 | `#5B8DB8` |
| 主色浅 | `#7BA3C9` |
| 卡片背景 | `rgba(255,255,255,0.72)` |
| 卡片边框 | `rgba(255,255,255,0.6)` |
| 阴影 | `rgba(91,141,184,0.08)` |
| 文字主色 | `#2D3748` |
| 文字次色 | `#718096` |
| 文字辅助 | `#A0AEC0` |

### 6.3 组件规范
- **玻璃态卡片**：`background: rgba(255,255,255,0.72)` + `border: 1px solid rgba(255,255,255,0.6)` + `backdrop-filter: blur(20rpx)` + `box-shadow: 0 8rpx 32rpx rgba(91,141,184,0.08)`
- **主按钮**：`linear-gradient(135deg, #7BA3C9, #5B8DB8)` + `border-radius: 40rpx` + 柔和投影
- **圆角规范**：标签16rpx / 卡片28-32rpx / 大按钮40rpx
- **按压反馈**：`:active` 态 `transform: scale(0.97)`

### 6.4 页面样式应用
| 页面 | 关键样式 |
|------|---------|
| 首页 | 自定义导航栏、天气玻璃卡片、AI推荐渐变横幅、5宫格功能入口 |
| 衣柜 | 玻璃态搜索框、胶囊分类标签、大圆角衣物卡片、渐变浮动按钮 |
| 搭配 | 玻璃态操作栏、Tab下划线渐变、大圆角搭配卡片 |
| 个人中心 | 渐变玻璃态用户卡片、青蓝统计数字、大圆角菜单列表 |

---

## 7. 云函数接口

### 7.1 common 云函数
| action | 功能 |
|--------|------|
| `getOpenId` | 获取用户openid |
| `getUser` | 获取用户信息（含家庭信息、统计） |
| `upsertUser` | 创建/更新用户 |
| `getWeather` | 获取天气（和风天气API） |

### 7.2 cloth 云函数
| action | 功能 |
|--------|------|
| `addCloth` | 添加衣物（自动注入familyId） |
| `updateCloth` | 更新衣物（权限校验） |
| `deleteCloth` | 软删除衣物 |
| `getClothList` | 分页获取衣物列表（支持筛选） |
| `getClothDetail` | 获取衣物详情 |

### 7.3 outfit 云函数
| action | 功能 |
|--------|------|
| `createOutfit` | 创建搭配 |
| `getOutfitList` | 分页获取搭配列表（补充衣物图片） |
| `getOutfitDetail` | 获取搭配详情（聚合衣物信息+创建者信息） |
| `getRecommend` | AI推荐（混元+规则引擎双引擎） |
| `markWorn` | 标记已穿（更新搭配/衣物穿着次数，记录日志） |
| `toggleFavorite` | 切换收藏状态 |

### 7.4 family 云函数
| action | 功能 |
|--------|------|
| `createFamily` | 创建家庭（生成唯一邀请码） |
| `joinFamily` | 通过邀请码加入家庭 |
| `getFamily` | 获取家庭信息 |
| `getMembers` | 获取家庭成员列表（聚合用户信息） |
| `leaveFamily` | 退出家庭 |

### 7.5 hunyuan 云函数
| action | 功能 |
|--------|------|
| `recommendOutfit` | 混元大模型穿搭推荐 |
| `chat` | 通用对话（支持思维链） |

---

## 8. 安全设计

### 8.1 鉴权机制
- 所有云函数通过 `cloud.getWXContext().OPENID` 获取真实openid
- 前端无法伪造openid，所有操作强制鉴权

### 8.2 权限模型
| 操作 | 权限规则 |
|------|---------|
| 编辑衣物 | 仅 `_openid === 当前用户` |
| 删除衣物 | 仅所有者，软删除保留数据 |
| 查看搭配 | 自己的搭配 或 `isShared=true` 的家庭共享搭配 |
| 标记已穿 | 仅搭配所有者 |
| 混元AI调用 | 通过云函数中转，前端不接触密钥 |

### 8.3 数据隔离
- 衣物默认仅自己可见，`isShared=true` 时对家庭可见
- 搭配同理，独立空间 + 共享模型

---

## 9. 项目文件结构

```
cloth2/
├── cloudfunctions/
│   ├── common/        # 通用：openid/用户/天气
│   ├── cloth/         # 衣物管理
│   ├── family/        # 家庭管理
│   ├── outfit/        # 搭配管理 + AI推荐
│   └── hunyuan/       # 混元大模型封装
├── miniprogram/
│   ├── pages/
│   │   ├── index/     # 首页
│   │   ├── wardrobe/  # 衣柜
│   │   ├── outfit/    # 搭配
│   │   └── profile/   # 我的
│   ├── packageCloth/  # 衣物分包
│   ├── packageOutfit/ # 搭配分包
│   ├── packageFamily/ # 家庭分包
│   ├── utils/
│   │   ├── api.js     # API封装
│   │   └── auth.js    # 权限工具
│   ├── app.js         # 应用入口
│   ├── app.json       # 全局配置
│   ├── app.wxss       # 全局样式
│   └── config.js      # 全局常量
└── spec.md            # 本文档
```

---

## 10. 部署配置清单

### 10.1 云开发环境配置
- [ ] 开通微信云开发，获取环境ID
- [ ] 在 `miniprogram/config.js` 和 `app.js` 中配置 `envId`
- [ ] 创建数据库集合：users, families, clothes, outfits, wearLogs

### 10.2 云函数部署
```bash
# 每个云函数目录下执行
cd cloudfunctions/common && npm install
cd cloudfunctions/cloth && npm install
cd cloudfunctions/family && npm install
cd cloudfunctions/outfit && npm install
cd cloudfunctions/hunyuan && npm install
```

### 10.3 第三方服务配置
- [ ] **和风天气**：在 `cloudfunctions/common/index.js` 中替换 `QWEATHER_KEY`
- [ ] **混元AI**：在微信云开发控制台开通「AI」扩展能力

### 10.4 前端构建
```bash
cd miniprogram && npm install
# 微信开发者工具 → 工具 → 构建 npm
```

---

*文档版本：v1.0 | 最后更新：基于当前代码库完整功能*
