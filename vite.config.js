import { defineConfig } from "vite";

const promptAnalysisSystemPrompt = [
  "你是资深 UI 设计提示词策略师。你的任务不是改写用户原句，而是分析设计任务的真实含义。",
  "请根据用户输入、需求拆解、关键词、平台搜索词、审美拆解和设计方向，判断它真正应该生成什么设计对象。",
  "不要机械复述关键词，必须把关键词转译成具体的设计对象、内容结构、视觉气质、色彩光效和输出约束。",
  "不同场景必须使用不同提示词逻辑：visual/ui 可以生成移动端页面或视觉页；icon 必须生成独立图标或 Logo，不要和页面截图绑定；asset 必须生成无文字背景或纹理素材，不要生成完整页面。",
  "输出只能是 JSON，不要 Markdown，不要解释。",
  "JSON schema:",
  "{",
  '  "interpretations": {',
  '    "visual": { "realMeaning": "...", "pageKeywords": "...", "backgroundTone": "深色或浅色", "keyColor": "...", "glowColor": "...", "prompt": "1、...\\n2、...\\n3、...\\n4、...\\n5、...\\n6、..." },',
  '    "ui": { "realMeaning": "...", "pageKeywords": "...", "backgroundTone": "深色或浅色", "keyColor": "...", "glowColor": "...", "prompt": "1、...\\n2、...\\n3、...\\n4、...\\n5、...\\n6、..." },',
  '    "icon": { "realMeaning": "...", "pageKeywords": "...", "backgroundTone": "深色或浅色", "keyColor": "...", "glowColor": "...", "prompt": "1、...\\n2、...\\n3、...\\n4、...\\n5、...\\n6、..." },',
  '    "asset": { "realMeaning": "...", "pageKeywords": "...", "backgroundTone": "深色或浅色", "keyColor": "...", "glowColor": "...", "prompt": "1、...\\n2、...\\n3、...\\n4、...\\n5、...\\n6、..." }',
  "  }",
  "}",
  "字段要求：",
  "1. realMeaning 说明真实设计意图，必须像设计师判断，不要泛泛而谈。",
  "2. pageKeywords 填入“页面要像什么”的关键词或短语，必须结合用户关键词，不能超过 28 个中文字符。",
  "3. backgroundTone 只能是 深色 或 浅色。",
  "4. keyColor 和 glowColor 必须来自输入含义匹配的色彩，例如科技感可用蓝紫/青蓝，大促可用暖橙/浅金，自然健康可用柔绿/浅青。",
  "5. prompt 必须严格使用 6 条格式，且第 2、4 条必须根据当前关键词生成具体内容。",
  "6. visual/ui 的 prompt 可以包含 iPhone 截图、状态栏、真实 App 截图感；icon 的 prompt 不得出现页面截图、状态栏、App 截图感；asset 的 prompt 不得要求完整页面。"
].join("\n");

export default defineConfig({
  plugins: [
    {
      name: "design-assistant-prompt-analysis",
      configureServer(server) {
        server.middlewares.use("/api/prompt-analysis", async (req, res) => {
          if (req.method !== "POST") {
            sendJson(res, 405, { error: "Method not allowed" });
            return;
          }

          try {
            const payload = await readJson(req);
            const requestConfig = normalizeModelConfig(payload?.modelConfig);
            const apiUrl = requestConfig.apiUrl || process.env.DESIGN_ASSISTANT_MODEL_API_URL;
            const apiKey = requestConfig.apiKey || process.env.DESIGN_ASSISTANT_MODEL_API_KEY;
            const model = requestConfig.model || process.env.DESIGN_ASSISTANT_MODEL;

            if (!apiUrl || !apiKey || !model) {
              sendJson(res, 503, {
                error: "Model backend is not configured"
              });
              return;
            }

            let modelResponse = await requestModelCompletion(apiUrl, apiKey, model, payload, true);

            if (!modelResponse.ok && shouldRetryWithoutJsonMode(modelResponse.status)) {
              modelResponse = await requestModelCompletion(apiUrl, apiKey, model, payload, false);
            }

            if (!modelResponse.ok) {
              const detail = await readModelError(modelResponse);
              sendJson(res, modelResponse.status, {
                error: detail
              });
              return;
            }

            const data = await modelResponse.json();
            const content = data?.choices?.[0]?.message?.content;
            const parsed = typeof content === "string" ? parseModelJson(content) : content;
            sendJson(res, 200, sanitizeModelResponse(parsed));
          } catch {
            sendJson(res, 500, {
              error: "Prompt analysis failed"
            });
          }
        });
      }
    }
  ]
});

function normalizeModelConfig(value) {
  return {
    apiUrl: typeof value?.apiUrl === "string" ? value.apiUrl.trim() : "",
    apiKey: typeof value?.apiKey === "string" ? value.apiKey.trim() : "",
    model: typeof value?.model === "string" ? value.model.trim() : ""
  };
}

function requestModelCompletion(apiUrl, apiKey, model, payload, useJsonMode) {
  const body = {
    model,
    messages: [
      {
        role: "system",
        content: promptAnalysisSystemPrompt
      },
      {
        role: "user",
        content: buildUserPrompt(payload)
      }
    ],
    temperature: 0.35
  };

  if (useJsonMode) {
    body.response_format = { type: "json_object" };
  }

  return fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function shouldRetryWithoutJsonMode(status) {
  return status === 400 || status === 422;
}

async function readModelError(response) {
  try {
    const data = await response.json();
    return data?.error?.message ?? data?.error ?? `模型请求失败：${response.status}`;
  } catch {
    return `模型请求失败：${response.status}`;
  }
}

function parseModelJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model response is not JSON");
    return JSON.parse(match[0]);
  }
}

function buildUserPrompt(payload) {
  return JSON.stringify(
    {
      sourceInput: payload?.sourceInput,
      analysis: payload?.analysis,
      chineseKeywords: payload?.chineseKeywords,
      englishKeywords: payload?.englishKeywords,
      platformSearchTerms: payload?.platformSearchTerms,
      searchCombinations: payload?.searchCombinations,
      aestheticInsights: payload?.aestheticInsights,
      designDirections: payload?.designDirections,
      promptScenarios: payload?.promptScenarios,
      scenarioPromptRules: {
        visual: [
          "1、页面尺寸为 iPhone 截图比例，保留状态栏，750×1624。",
          "2、页面要像（关键词），不要像海报。",
          "3、背景可以用深色or浅色底，但不要恐怖、压抑。",
          "4、光效用柔和（关键词匹配的色彩），少量（关键词匹配的色彩）弥散光。",
          "5、整体要温暖、向上、有生命力、有仪式感。",
          "6、留白充足，页面要有真实 App 截图感。"
        ],
        ui: [
          "1、页面尺寸为 iPhone 截图比例，保留状态栏，750×1624。",
          "2、页面要像（关键词对应的真实产品界面），不要像海报。",
          "3、背景可以用深色or浅色底，但不要恐怖、压抑。",
          "4、光效用柔和（关键词匹配的色彩），少量（关键词匹配的色彩）弥散光。",
          "5、整体要温暖、向上、有生命力、有仪式感。",
          "6、留白充足，信息层级清楚，页面要有真实 App 截图感。"
        ],
        icon: [
          "1、生成对象为独立图标 / Logo 符号，不生成页面截图，不生成海报。",
          "2、图标要表达（关键词对应的核心概念），一眼能识别。",
          "3、造型以简洁几何结构为主，强调轮廓、正负形、比例和小尺寸识别度。",
          "4、配色使用（关键词匹配的主色），少量（关键词匹配的辅助色）作为高光或辅助色。",
          "5、整体要高级、克制、有科技感，但保持温暖、向上、有生命力。",
          "6、输出为居中构图、干净背景、矢量感强、边缘清晰的图标方案，避免文字、水印、复杂场景。"
        ],
        asset: [
          "1、生成对象为无文字背景 / 纹理 / 氛围素材，不生成完整页面，不生成海报。",
          "2、素材要像（关键词对应的氛围素材），适合后期叠加 UI、标题或品牌信息。",
          "3、背景可以用深色or浅色底，但不要恐怖、压抑，不要出现具体文案。",
          "4、光效用柔和（关键词匹配的色彩），少量（关键词匹配的色彩）弥散光。",
          "5、整体要温暖、向上、有生命力、有仪式感，材质干净、有呼吸感。",
          "6、留白充足，画面中心和边缘都要可承载内容，避免人物大脸、复杂物体和模板化装饰。"
        ]
      }
    },
    null,
    2
  );
}

function sanitizeModelResponse(value) {
  const interpretations = value?.interpretations ?? {};
  const cleaned = {};

  for (const key of ["visual", "ui", "icon", "asset"]) {
    const item = interpretations[key];
    if (!item) continue;
    cleaned[key] = {
      realMeaning: String(item.realMeaning ?? "").slice(0, 120),
      pageKeywords: String(item.pageKeywords ?? "").slice(0, 40),
      backgroundTone: item.backgroundTone === "深色" ? "深色" : "浅色",
      keyColor: String(item.keyColor ?? "").slice(0, 16),
      glowColor: String(item.glowColor ?? "").slice(0, 16),
      prompt: sanitizePromptText(item.prompt)
    };
  }

  return { interpretations: cleaned };
}

function sanitizePromptText(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const hasSixSteps = ["1、", "2、", "3、", "4、", "5、", "6、"].every((prefix) => trimmed.includes(prefix));
  return hasSixSteps ? trimmed.slice(0, 900) : undefined;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
