import type { KeywordResult, ModelConfig, PromptInterpretation, PromptScenarioId, RequirementAnalysis } from "../types";

export interface ModelPromptAnalysis {
  ok: boolean;
  interpretations: Partial<Record<PromptScenarioId, PromptInterpretation>>;
  error?: string;
}

interface PromptAnalysisApiResponse {
  interpretations?: Partial<Record<PromptScenarioId, PromptInterpretation>>;
}

export async function requestModelPromptAnalysis(
  result: KeywordResult,
  modelConfig: ModelConfig | null
): Promise<ModelPromptAnalysis> {
  try {
    const response = await fetch("/api/prompt-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sourceInput: result.sourceInput,
        analysis: result.analysis,
        chineseKeywords: result.chineseKeywords,
        englishKeywords: result.englishKeywords,
        platformSearchTerms: result.platformSearchTerms,
        searchCombinations: result.searchCombinations,
        aestheticInsights: result.aestheticInsights,
        designDirections: result.designDirections,
        promptScenarios: result.promptScenarios.map((scenario) => ({
          id: scenario.id,
          label: scenario.label,
          keywords: scenario.keywords,
          recommended: scenario.recommended
        })),
        modelConfig
      })
    });

    if (!response.ok) {
      const errorData = await readErrorResponse(response);
      return {
        ok: false,
        interpretations: {},
        error: errorData
      };
    }

    const data = (await response.json()) as PromptAnalysisApiResponse;
    const interpretations = normalizeInterpretations(data.interpretations ?? {});

    if (Object.keys(interpretations).length === 0) {
      return {
        ok: false,
        interpretations: {},
        error: "模型返回内容无法用于提示词生成"
      };
    }

    return { ok: true, interpretations };
  } catch {
    return {
      ok: false,
      interpretations: {},
      error: "模型请求异常，已回退本地规则"
    };
  }
}

function normalizeInterpretations(
  interpretations: Partial<Record<PromptScenarioId, PromptInterpretation>>
): Partial<Record<PromptScenarioId, PromptInterpretation>> {
  const entries = Object.entries(interpretations).filter(([key, value]) => {
    if (!isPromptScenarioId(key) || !value) return false;
    return (
      typeof value.realMeaning === "string" &&
      typeof value.pageKeywords === "string" &&
      (value.backgroundTone === "深色" || value.backgroundTone === "浅色") &&
      typeof value.keyColor === "string" &&
      typeof value.glowColor === "string" &&
      (value.prompt === undefined || typeof value.prompt === "string")
    );
  });

  return Object.fromEntries(entries) as Partial<Record<PromptScenarioId, PromptInterpretation>>;
}

function isPromptScenarioId(value: string): value is PromptScenarioId {
  return value === "visual" || value === "ui" || value === "icon" || value === "asset";
}

async function readErrorResponse(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `模型接口返回 ${response.status}`;
  } catch {
    return `模型接口返回 ${response.status}`;
  }
}

export function buildPromptAnalysisSystemPrompt(): string {
  return [
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
}

export function buildPromptAnalysisUserPrompt(payload: {
  sourceInput: string;
  analysis: RequirementAnalysis;
}): string {
  return JSON.stringify(
    {
      sourceInput: payload.sourceInput,
      analysis: payload.analysis,
      requiredPromptFormat: [
        "1、页面尺寸为 iPhone 截图比例，保留状态栏，750×1624。",
        "2、页面要像（关键词），不要像海报。",
        "3、背景可以用深色or浅色底，但不要恐怖、压抑。",
        "4、光效用柔和（关键词匹配的色彩），少量（关键词匹配的色彩）弥散光。",
        "5、整体要温暖、向上、有生命力、有仪式感。",
        "6、留白充足，页面要有真实 App 截图感。"
      ]
    },
    null,
    2
  );
}
