// cloudfunctions/ai/index.js - AI 图像识别与搭配推荐云函数
// 使用腾讯云 TokenHub Hy3 preview 模型（OpenAI 兼容协议）
const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 腾讯云 TokenHub API 配置
// 注意：Authorization 使用 Secret Key（sk- 开头），不是 Key ID（ak- 开头）
// 文本搭配推荐使用 hy3-preview（纯文本模型）
const TOKENHUB_CONFIG = {
  apiKey: 'sk-IOR9dSjjMQAmbNgZCPfJylNlCZMZluFV9MdK0YEIeJTpb9kv',
  baseUrl: 'tokenhub.tencentmaas.com',
  path: '/v1/chat/completions',
  model: 'hy3-preview',
};

// 图像识别专用配置：使用 youtu-vita 多模态理解模型
// hy3-preview 不支持图像输入，必须用 youtu-vita 对衣物图片做视觉分析
const VITA_CONFIG = {
  apiKey: 'sk-IOR9dSjjMQAmbNgZCPfJylNlCZMZluFV9MdK0YEIeJTpb9kv',
  baseUrl: 'tokenhub.tencentmaas.com',
  path: '/v1/chat/completions',
  model: 'youtu-vita',
};



// 识别衣物的 prompt
const CLOTHING_PROMPT = `请分析这张图片中的衣物，返回以下信息（JSON格式）：
{
  "category": "衣物类别，只能是以下之一：上衣/裤子/裙子/连衣裙/外套/鞋/包/帽子/围巾",
  "colors": ["颜色列表，如：白色、黑色、灰色、蓝色、红色、粉色、黄色、绿色、棕色、米色、紫色、藏青"],
  "seasons": ["适合季节，如：春季、夏季、秋季、冬季"],
  "styles": ["风格，如：休闲、商务、甜美、酷、复古、街头、简约、运动"],
  "materials": ["材质，如：棉、麻、丝、羊毛、涤纶、牛仔、皮革、羊绒、尼龙、丝绒"]
}
只返回JSON，不要其他文字。`;

// AI 搭配推荐的系统提示词
const OUTFIT_SYSTEM_PROMPT = '你是一位专业的AI穿搭顾问。请根据用户提供的风格需求，推荐3套完整的服装搭配。每套搭配需要包含：上装/连衣裙、下装（如有）、配饰、鞋履。请用JSON格式返回，格式如下：{"outfits":[{"name":"搭配名称","items":[{"category":"上装","name":"单品名称"},{"category":"下装","name":"单品名称"},{"category":"配饰","name":"单品名称"},{"category":"鞋履","name":"单品名称"}]}]}。category只能是：上装、下装、连衣裙、外套、配饰、鞋履。请确保搭配风格统一、实用性强。【极其重要】你的所有输出内容（包括但不限于：搭配名称、单品名称、颜色、风格、材质、设计描述等）必须完全使用简体中文表达，绝对不能出现任何英文单词、英文字母或拼音缩写。如果用户输入的衣物上下文中包含英文词（如 beige、minimal、casual、business、gray、white、black 等），请必须翻译为对应的中文后再使用（如：beige→米色、minimal→极简、casual→休闲、business→商务、gray→灰色、white→白色、black→黑色）。';

/**
 * 通用调用腾讯云 TokenHub Chat Completions API
 * @param {Array} messages 消息数组
 * @param {boolean} stream 是否流式
 * @param {Object} config 可选，自定义配置（默认使用 TOKENHUB_CONFIG）
 */
function callTokenHubChat(messages, stream = false, config = TOKENHUB_CONFIG) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: config.model,
      messages: messages,
      stream: stream,
    });

    const options = {
      hostname: config.baseUrl,
      port: 443,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey,
      },
      timeout: 25000, // 单个HTTP请求25秒超时
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(new Error('解析响应失败: ' + data));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求TokenHub超时'));
    });

    req.on('error', (err) => { reject(err); });
    req.write(payload);
    req.end();
  });
}

/**
 * 调用腾讯云 TokenHub 多模态理解 API（图像识别）
 * 使用 youtu-vita 模型对衣物图片做视觉分析
 */
function callTokenHubVision(imageUrl) {
  return callTokenHubChat([
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: CLOTHING_PROMPT },
      ],
    },
  ], false, VITA_CONFIG);
}

/**
 * 解析 YT-VITA 返回的 JSON 为标签数组
 */
function parseVitaResponse(content) {
  // 提取 JSON 内容（可能包含 markdown 代码块）
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  // 也尝试直接找 { ... }
  if (!jsonStr.startsWith('{')) {
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) jsonStr = braceMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  const tags = [];

  // 转换为前端期望的 tags 格式：[{ name, confidence }]
  if (parsed.category) {
    tags.push({ name: parsed.category, confidence: 95 });
  }
  if (parsed.colors && Array.isArray(parsed.colors)) {
    parsed.colors.forEach((c) => tags.push({ name: c, confidence: 90 }));
  }
  if (parsed.seasons && Array.isArray(parsed.seasons)) {
    parsed.seasons.forEach((s) => tags.push({ name: s, confidence: 85 }));
  }
  if (parsed.styles && Array.isArray(parsed.styles)) {
    parsed.styles.forEach((st) => tags.push({ name: st, confidence: 80 }));
  }
  if (parsed.materials && Array.isArray(parsed.materials)) {
    parsed.materials.forEach((m) => tags.push({ name: m, confidence: 75 }));
  }

  return tags;
}

/**
 * 将腾讯云 fileID 转为临时 URL
 */
async function getTempImageUrl(fileID) {
  try {
    const res = await cloud.getTempFileURL({ fileList: [fileID] });
    if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
      return res.fileList[0].tempFileURL;
    }
  } catch (e) {
    console.warn('[getTempImageUrl] 获取临时链接失败:', e);
  }
  return fileID;
}

/**
 * 调用 AI 搭配推荐（使用腾讯云 TokenHub Hy3 preview）
 */
async function recommendOutfit(styleInput, clothesContext) {
  // 构建用户提示词
  let userPrompt = '我想要"' + styleInput + '"风格的穿搭推荐。请推荐3套完整的服装搭配，每套包含上装/连衣裙、下装、配饰、鞋履。';

  // 如果有真实衣物数据，加入上下文
  if (clothesContext && clothesContext.length > 0) {
    userPrompt += '我的衣柜里有以下衣物可供搭配：' + clothesContext + '。请优先使用我衣柜里的衣物进行推荐，如果没有合适的再自由发挥。';
  }

  // 使用腾讯云 TokenHub Hy3 preview 模型进行搭配推荐
  const result = await callTokenHubChat([
    { role: 'system', content: OUTFIT_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ], false, TOKENHUB_CONFIG);

  // 检查 API 返回错误
  if (result.error) {
    throw new Error('AI推荐失败: ' + (result.error.message || JSON.stringify(result.error)));
  }

  const choices = result.choices;
  if (!choices || choices.length === 0) {
    throw new Error('模型未返回内容');
  }

  const content = choices[0].message && choices[0].message.content;
  if (!content) {
    throw new Error('模型返回内容为空');
  }

  console.log('[ai] 搭配推荐返回文本:', content);

  // 尝试从文本中提取JSON
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  if (!jsonStr.startsWith('{')) {
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) jsonStr = braceMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  return parsed;
}

// 主入口
exports.main = async (event, context) => {
  // 设置云函数超时时间为20秒（覆盖默认3秒）
  context.callbackWaitsForEmptyEventLoop = false;
  
  const { action, imageUrl, styleInput, clothesContext } = event;

  // 如果没有配置密钥，返回模拟数据（便于前端调试）
  if (!TOKENHUB_CONFIG.apiKey) {
    console.warn('[ai] 未配置 API Key，返回模拟数据');
    if (action === 'recognizeImage') {
      return {
        success: true,
        data: {
          tags: [
            { name: '上衣', confidence: 95 },
            { name: '蓝色', confidence: 92 },
            { name: '棉', confidence: 88 },
            { name: '休闲', confidence: 85 },
            { name: '夏季', confidence: 80 },
          ],
        },
      };
    }
    if (action === 'recommendOutfit') {
      return {
        success: true,
        data: {
          outfits: [
            {
              name: '温柔通勤风',
              items: [
                { category: '上装', name: '米白色针织衫' },
                { category: '下装', name: '卡其色阔腿裤' },
                { category: '配饰', name: '珍珠耳环' },
                { category: '鞋履', name: '裸色单鞋' },
              ],
            },
            {
              name: '干练职场风',
              items: [
                { category: '上装', name: '白色衬衫' },
                { category: '下装', name: '黑色西装裤' },
                { category: '配饰', name: '简约手表' },
                { category: '鞋履', name: '黑色高跟鞋' },
              ],
            },
            {
              name: '知性优雅风',
              items: [
                { category: '连衣裙', name: '藏青色连衣裙' },
                { category: '配饰', name: '丝巾' },
                { category: '鞋履', name: '棕色乐福鞋' },
              ],
            },
          ],
        },
      };
    }
  }

  if (action === 'recognizeImage') {
    if (!imageUrl) {
      return { success: false, message: '缺少图片地址' };
    }

    // 如果是云存储 fileID，先获取临时 URL
    let finalUrl = imageUrl;
    if (imageUrl.startsWith('cloud://')) {
      finalUrl = await getTempImageUrl(imageUrl);
    }

    try {
      console.log('[ai] 开始调用腾讯云 TokenHub 多模态识别，图片URL:', finalUrl);
      const result = await callTokenHubVision(finalUrl);
      console.log('[ai] TokenHub 返回:', JSON.stringify(result));

      // 检查 API 返回错误
      if (result.error) {
        console.error('[ai] TokenHub API 错误:', result.error);
        return {
          success: false,
          message: '识别失败: ' + (result.error.message || JSON.stringify(result.error)),
        };
      }

      // 提取模型返回内容
      const choices = result.choices;
      if (!choices || choices.length === 0) {
        console.warn('[ai] TokenHub 无返回内容');
        return { success: false, message: '模型未返回内容' };
      }

      const content = choices[0].message && choices[0].message.content;
      if (!content) {
        console.warn('[ai] TokenHub 返回内容为空');
        return { success: false, message: '模型返回内容为空' };
      }

      console.log('[ai] 模型返回文本:', content);

      // 解析 JSON 响应为标签
      const tags = parseVitaResponse(content);
      console.log('[ai] 解析后标签:', JSON.stringify(tags));

      return { success: true, data: { tags: tags } };
    } catch (err) {
      console.error('[ai] TokenHub 识别失败:', err);
      return { success: false, message: '识别服务异常: ' + (err.message || JSON.stringify(err)) };
    }
  }

  if (action === 'recommendOutfit') {
    if (!styleInput) {
      return { success: false, message: '缺少风格输入' };
    }

    try {
      console.log('[ai] 开始搭配推荐，风格:', styleInput);
      const result = await recommendOutfit(styleInput, clothesContext);
      console.log('[ai] 搭配推荐结果:', JSON.stringify(result));

      if (!result.outfits || !Array.isArray(result.outfits) || result.outfits.length === 0) {
        return { success: false, message: 'AI未返回有效搭配数据' };
      }

      return { success: true, data: result };
    } catch (err) {
      console.error('[ai] 搭配推荐失败:', err);
      return { success: false, message: '搭配推荐服务异常: ' + (err.message || JSON.stringify(err)) };
    }
  }

  return { success: false, message: '未知 action: ' + action };
};
