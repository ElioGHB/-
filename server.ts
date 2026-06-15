/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "2mb" }));

const promptAnalysisSystemPrompt = [
  "你是资深 UI 设计提示词策略师。你的任务不是改写用户原句，而是分析设计任务的真实含义。",
  "请根据用户输入、需求拆解、关键词、平台搜索词、审美拆解和设计方向，判断它真正应该生成什么设计对象。",
  "不要机械复述关键词，必须把关键词转译成具体的设计对象、内容结构、视觉气质、色彩光效 and 输出约束。",
  "不同场景必须使用不同提示词逻辑：visual/ui 可以生成移动端页面或视觉页；icon 必须生成独立图标或 Logo，不要和页面截图绑定；asset 必须生成无文字背景或纹理素材，不要生成完整页面。",
  "输出只能是 JSON，不要 Markdown，不要解释。",
  "JSON schema:",
  "{",
  "  \"interpretations\": {",
  "    \"visual\": { \"realMeaning\": \"...\", \"pageKeywords\": \"...\", \"backgroundTone\": \"深色或浅色\", \"keyColor\": \"...\", \"glowColor\": \"...\", \"prompt\": \"极具视觉冲击力的...构图设计，唯美排版，优雅艺术海报风格，主色...，比例 --ar 3:4\" },",
  "    \"ui\": { \"realMeaning\": \"...\", \"pageKeywords\": \"...\", \"backgroundTone\": \"深色或浅色\", \"keyColor\": \"...\", \"glowColor\": \"...\", \"prompt\": \"干净现代的App用户界面设计...，主色...，比例 --ar 9:16\" },",
  "    \"icon\": { \"realMeaning\": \"...\", \"pageKeywords\": \"...\", \"backgroundTone\": \"深色或浅色\", \"keyColor\": \"...\", \"glowColor\": \"...\", \"prompt\": \"极简精致的...矢量图标设计，主色...，比例 --ar 1:1\" },",
  "    \"asset\": { \"realMeaning\": \"...\", \"pageKeywords\": \"...\", \"backgroundTone\": \"深色或浅色\", \"keyColor\": \"...\", \"glowColor\": \"...\", \"prompt\": \"抽象艺术风格的背景素材设计...，主色...，比例 --ar 16:9\" }",
  "  }",
  "}",
  "字段要求：",
  "1. realMeaning 说明真实设计意图，必须像设计师判断，不要泛泛而谈。",
  "2. pageKeywords 填入“页面要像什么”的关键词或短语，必须结合用户关键词，不能超过 28 个中文字符。",
  "3. backgroundTone 只能是 深色 或 浅色。",
  "4. keyColor 和 glowColor 必须来自输入含义匹配的色彩，例如科技感可用蓝紫/青蓝，大促可用暖橙/浅金，自然健康可用柔绿/浅青。",
  "5. prompt 必须为高品质、无描述性编号或步骤的生产环境 Midjourney 中文提示词，所有的结果用中文呈现。",
  "6. 针对不同类型必须指定对应的 aspect ratio 参数：visual 为 --ar 3:4，ui 为 --ar 9:16，icon 为 --ar 1:1，asset 为 --ar 16:9。"
].join("\n");

function buildUserPrompt(payload: any) {
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
        visual: "极具视觉冲击力的“(keywords)”构图设计，唯美排版，优雅艺术海报风格，(backgroundTone)氛围，柔和的空间弥散光配合(keyColor)和(glowColor)色，比例 --ar 3:4",
        ui: "干净且具有未来感的App用户界面截图设计，包含“(keywords)”，功能排版，响应式组件结构，精美干净的卡片，现代数字字体排版，主导色(keyColor)，比例 --ar 9:16",
        icon: "极简高级排版，(keywords)的矢量图标和设计Logo，扁平UI图标设计，简单的几何结构，纯色干净背景，主色(keyColor)，辅助色(glowColor)，无文字，比例 --ar 1:1",
        asset: "抽象艺术图形背景设计，高级氛围壁纸，中心留出干净大面积空间方便叠加内容，寓意“(keywords)”，高雅纹理，高级柔和光束，主调(keyColor)，微发散的(glowColor)色，比例 --ar 16:9"
      }
    },
    null,
    2
  );
}

function sanitizeModelResponse(value: any) {
  const interpretations = value?.interpretations ?? {};
  const cleaned: any = {};

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

function sanitizePromptText(value: any) {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, 1200);
}

function normalizeModelConfig(value: any) {
  return {
    apiUrl: typeof value?.apiUrl === "string" ? value.apiUrl.trim() : "",
    apiKey: typeof value?.apiKey === "string" ? value.apiKey.trim() : "",
    model: typeof value?.model === "string" ? value.model.trim() : ""
  };
}

async function requestCustomModelCompletion(apiUrl: string, apiKey: string, model: string, payload: any, useJsonMode: boolean) {
  const body: any = {
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

function shouldRetryWithoutJsonMode(status: number) {
  return status === 400 || status === 422;
}

// Handler for prompts
app.post("/api/prompt-analysis", async (req, res) => {
  try {
    const payload = req.body;
    const requestConfig = normalizeModelConfig(payload?.modelConfig);

    const customApiUrl = requestConfig.apiUrl || process.env.DESIGN_ASSISTANT_MODEL_API_URL;
    const customApiKey = requestConfig.apiKey || process.env.DESIGN_ASSISTANT_MODEL_API_KEY;
    const customModelName = requestConfig.model || process.env.DESIGN_ASSISTANT_MODEL;

    // 1. If we have custom API credentials configured, use them (OpenAI, DeepSeek, etc. compatible)
    if (customApiUrl && customApiKey && customModelName) {
      console.log(`[AI Studio Server] Routing request to custom model endpoint: ${customModelName}`);
      let modelResponse = await requestCustomModelCompletion(customApiUrl, customApiKey, customModelName, payload, true);

      if (!modelResponse.ok && shouldRetryWithoutJsonMode(modelResponse.status)) {
        modelResponse = await requestCustomModelCompletion(customApiUrl, customApiKey, customModelName, payload, false);
      }

      if (!modelResponse.ok) {
        let errMessage = `自定义模型接口请求失败: ${modelResponse.status}`;
        try {
          const detail = await modelResponse.json();
          errMessage = detail?.error?.message ?? detail?.error ?? errMessage;
        } catch (err) {
          console.error("[AI Studio Server] Error parsing custom model error response:", err);
        }
        res.status(modelResponse.status).json({ error: errMessage });
        return;
      }

      const data = await modelResponse.json();
      const content = data?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      res.json(sanitizeModelResponse(parsed));
      return;
    }

    // 2. Otherwise description: if GEMINI_API_KEY is available, use our premium native Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY") {
      console.log("[AI Studio Server] Prompt analysis invoking Gemini API via @google/genai SDK");
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${promptAnalysisSystemPrompt}\n\n以下是需要分析的设计简报和结构化关键词数据：\n${buildUserPrompt(payload)}`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              interpretations: {
                type: Type.OBJECT,
                properties: {
                  visual: {
                    type: Type.OBJECT,
                    properties: {
                      realMeaning: { type: Type.STRING },
                      pageKeywords: { type: Type.STRING },
                      backgroundTone: { type: Type.STRING },
                      keyColor: { type: Type.STRING },
                      glowColor: { type: Type.STRING },
                      prompt: { type: Type.STRING }
                    },
                    required: ["realMeaning", "pageKeywords", "backgroundTone", "keyColor", "glowColor", "prompt"]
                  },
                  ui: {
                    type: Type.OBJECT,
                    properties: {
                      realMeaning: { type: Type.STRING },
                      pageKeywords: { type: Type.STRING },
                      backgroundTone: { type: Type.STRING },
                      keyColor: { type: Type.STRING },
                      glowColor: { type: Type.STRING },
                      prompt: { type: Type.STRING }
                    },
                    required: ["realMeaning", "pageKeywords", "backgroundTone", "keyColor", "glowColor", "prompt"]
                  },
                  icon: {
                    type: Type.OBJECT,
                    properties: {
                      realMeaning: { type: Type.STRING },
                      pageKeywords: { type: Type.STRING },
                      backgroundTone: { type: Type.STRING },
                      keyColor: { type: Type.STRING },
                      glowColor: { type: Type.STRING },
                      prompt: { type: Type.STRING }
                    },
                    required: ["realMeaning", "pageKeywords", "backgroundTone", "keyColor", "glowColor", "prompt"]
                  },
                  asset: {
                    type: Type.OBJECT,
                    properties: {
                      realMeaning: { type: Type.STRING },
                      pageKeywords: { type: Type.STRING },
                      backgroundTone: { type: Type.STRING },
                      keyColor: { type: Type.STRING },
                      glowColor: { type: Type.STRING },
                      prompt: { type: Type.STRING }
                    },
                    required: ["realMeaning", "pageKeywords", "backgroundTone", "keyColor", "glowColor", "prompt"]
                  }
                },
                required: ["visual", "ui", "icon", "asset"]
              }
            },
            required: ["interpretations"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini API returned an empty response.");
      }

      console.log(`[AI Studio Server] Gemini API raw response: ${responseText}`);
      const parsed = JSON.parse(responseText.trim());
      res.json(sanitizeModelResponse(parsed));
      return;
    }

    // 3. Fallback/Error if neither is configured
    res.status(503).json({
      error: "请在「大模型配置」中提供您的 API Key 与接口名称，或直接联系管理员配置 GEMINI_API_KEY。"
    });
  } catch (error: any) {
    console.error("[AI Studio Server] Error in /api/prompt-analysis:", error);
    res.status(500).json({
      error: error?.message || "由于服务器故障或配置问题，灵感需求模型拆解失败"
    });
  }
});

// Serve frontend with Vite middleware in dev, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("[AI Studio Server] Dev server loaded with Vite middleware");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[AI Studio Server] Prod server serving built static directory: " + distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI Studio Server] Web framework loaded on port ${PORT}`);
  });
}

void startServer();
