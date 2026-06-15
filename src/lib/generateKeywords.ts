import type {
  AestheticInsight,
  DesignDirection,
  KeywordResult,
  Platform,
  PromptInterpretation,
  PromptScenario,
  PromptScenarioId,
  PromptSource,
  RequirementAnalysis
} from "../types";
import { categorySearchRules, fallbackRules, platformSearchRules, requirementRules, type RuleMatch } from "./rules";

const uniq = <T>(items: T[]): T[] => Array.from(new Set(items));

const normalize = (input: string): string => input.trim().toLowerCase();

interface MatchedTerms {
  zh: string[];
  en: string[];
  matched: boolean;
}

function matchRules(
  input: string,
  rules: RuleMatch[],
  fallback: { zh: string[]; en: string[] },
  options: { preserveSource?: boolean } = {}
): MatchedTerms {
  const sourceInput = input.trim();
  const normalizedInput = normalize(input);
  const matched = rules.filter((rule) =>
    rule.triggers.some((trigger) => normalizedInput.includes(trigger.toLowerCase()))
  );

  if (matched.length === 0) {
    if (options.preserveSource && sourceInput.length > 0) {
      return {
        zh: [sourceInput],
        en: [sourceInput],
        matched: false
      };
    }

    return { ...fallback, matched: false };
  }

  return {
    zh: uniq(matched.flatMap((rule) => rule.zh)),
    en: uniq(matched.flatMap((rule) => rule.en)),
    matched: true
  };
}

function createAnalysis(input: string): RequirementAnalysis {
  const designType = matchRules(input, requirementRules.designType, fallbackRules.designType).zh;
  const themeContent = matchRules(input, requirementRules.themeContent, fallbackRules.themeContent, {
    preserveSource: true
  }).zh;
  const visualStyle = matchRules(input, requirementRules.visualStyle, fallbackRules.visualStyle).zh;
  const useCase = matchRules(input, requirementRules.useCase, fallbackRules.useCase).zh;
  const mood = matchRules(input, requirementRules.mood, fallbackRules.mood).zh;

  return { designType, themeContent, visualStyle, useCase, mood };
}

function createKeywordPool(input: string) {
  const designType = matchRules(input, requirementRules.designType, fallbackRules.designType);
  const themeContent = matchRules(input, requirementRules.themeContent, fallbackRules.themeContent, {
    preserveSource: true
  });
  const visualStyle = matchRules(input, requirementRules.visualStyle, fallbackRules.visualStyle);
  const useCase = matchRules(input, requirementRules.useCase, fallbackRules.useCase);
  const mood = matchRules(input, requirementRules.mood, fallbackRules.mood);

  return {
    zh: uniq([
      ...designType.zh,
      ...themeContent.zh,
      ...visualStyle.zh,
      ...useCase.zh,
      ...mood.zh,
      "信息层级",
      "视觉焦点",
      "标题排版"
    ]),
    en: uniq([
      ...designType.en,
      ...themeContent.en,
      ...visualStyle.en,
      ...useCase.en,
      ...mood.en,
      "visual hierarchy",
      "hero typography",
      "cover layout"
    ])
  };
}

function isCommerceCampaign(analysis: RequirementAnalysis): boolean {
  return [...analysis.designType, ...analysis.themeContent, ...analysis.visualStyle].some((item) =>
    /618|大促|促销|购物节|电商/.test(item)
  );
}

function isAiTheme(analysis: RequirementAnalysis): boolean {
  return analysis.themeContent.some((item) => /AI|人工智能/.test(item));
}

function isUiScenario(analysis: RequirementAnalysis): boolean {
  return [...analysis.designType, ...analysis.themeContent, ...analysis.useCase].some((item) =>
    /UI|界面|网页|落地页|官网|SaaS|软件|产品展示|后台|App|小程序/.test(item)
  );
}

function isIconScenario(analysis: RequirementAnalysis): boolean {
  return analysis.designType.some((item) => /Logo|图标|标志/.test(item));
}

function isAssetScenario(analysis: RequirementAnalysis): boolean {
  return analysis.designType.some((item) => /背景|壁纸|纹理|肌理/.test(item));
}

function getRecommendedPromptScenarioId(analysis: RequirementAnalysis): PromptScenarioId {
  if (isIconScenario(analysis)) return "icon";
  if (isUiScenario(analysis)) return "ui";
  if (isAssetScenario(analysis)) return "asset";
  return "visual";
}

function getPromptKeywords(analysis: RequirementAnalysis): Record<PromptScenarioId, string[]> {
  const theme = firstTerm(analysis.themeContent, "创意主题");
  const designType = firstTerm(analysis.designType, "视觉设计");
  const style = firstTerm(analysis.visualStyle, "现代感");
  const useCase = firstTerm(analysis.useCase, "应用场景");
  const mood = firstTerm(analysis.mood, "清晰");

  return {
    visual: uniq([theme, designType, style, mood, useCase]).slice(0, 5),
    ui: uniq([theme, useCase, style, "信息层级", "组件状态"]).slice(0, 5),
    icon: uniq([theme, style, mood, "几何符号", "小尺寸识别"]).slice(0, 5),
    asset: uniq([theme, style, mood, "无文字背景", "空间氛围"]).slice(0, 5)
  };
}

function createLocalPromptInterpretations(analysis: RequirementAnalysis): Record<PromptScenarioId, PromptInterpretation> {
  const theme = firstTerm(analysis.themeContent, "设计任务");
  const style = firstTerm(analysis.visualStyle, "高级克制");
  const useCase = firstTerm(analysis.useCase, "真实 App 场景");
  const colors = getPromptColors(analysis);
  const backgroundTone = getPromptBackgroundTone(analysis);

  return {
    visual: {
      realMeaning: `${theme}不是单纯做一张封面图，而是把${useCase}里的核心信息转成一张真实移动端视觉页面。`,
      pageKeywords: `${theme}视觉页、${style}、${useCase}`,
      backgroundTone,
      keyColor: colors.keyColor,
      glowColor: colors.glowColor
    },
    ui: {
      realMeaning: `${theme}需要被理解为一个可操作的产品界面，重点是信息层级、功能入口和真实截图感。`,
      pageKeywords: `${theme}产品界面、${style}、清晰信息层级`,
      backgroundTone,
      keyColor: colors.keyColor,
      glowColor: colors.glowColor
    },
    icon: {
      realMeaning: `${theme}需要被提炼成独立的图标或 Logo 符号，重点是识别度、几何结构和小尺寸可读性。`,
      pageKeywords: `${theme}图标符号、${style}、品牌识别`,
      backgroundTone,
      keyColor: colors.keyColor,
      glowColor: colors.glowColor
    },
    asset: {
      realMeaning: `${theme}需要转化成可被后期复用的无文字背景或纹理素材，重点是氛围、光影、材质和留白。`,
      pageKeywords: `${theme}背景素材、${style}、柔和空间感`,
      backgroundTone,
      keyColor: colors.keyColor,
      glowColor: colors.glowColor
    }
  };
}

function getPromptColors(analysis: RequirementAnalysis): { keyColor: string; glowColor: string } {
  const text = [...analysis.themeContent, ...analysis.visualStyle, ...analysis.mood].join(" ");

  if (/科技|未来|数字|AI|人工智能|SaaS|软件/.test(text)) {
    return { keyColor: "蓝紫色", glowColor: "青蓝色" };
  }

  if (/618|大促|促销|电商|购物节|热烈/.test(text)) {
    return { keyColor: "暖橙色", glowColor: "浅金色" };
  }

  if (/自然|生命|健康|成长|绿色/.test(text)) {
    return { keyColor: "柔和绿色", glowColor: "浅青色" };
  }

  if (/美漫|漫画|高对比|强冲击/.test(text)) {
    return { keyColor: "克制紫色", glowColor: "柔和蓝色" };
  }

  return { keyColor: "品牌主色", glowColor: "浅紫色" };
}

function getPromptBackgroundTone(analysis: RequirementAnalysis): "深色" | "浅色" {
  const text = [...analysis.visualStyle, ...analysis.mood].join(" ");
  return /科技|未来|数字|夜间|酷|强冲击/.test(text) ? "深色" : "浅色";
}

function firstTerm(items: string[], fallback: string): string {
  return items.find((item) => item.trim().length > 0) ?? fallback;
}

function createShortSearchPhrases(analysis: RequirementAnalysis): { zh: string[]; en: string[] } {
  if (isCommerceCampaign(analysis)) {
    return {
      zh: ["618大促", "促销海报", "电商主视觉", "活动会场"],
      en: ["sale poster", "campaign visual", "ecommerce banner", "shopping festival"]
    };
  }

  if (isAiTheme(analysis)) {
    return {
      zh: ["AI封面", "科技海报", "人工智能", "科技背景"],
      en: ["AI cover", "tech poster", "artificial intelligence", "tech background"]
    };
  }

  const theme = firstTerm(analysis.themeContent, "创意主题");
  const designType = firstTerm(analysis.designType, "视觉设计");
  const style = firstTerm(analysis.visualStyle, "现代感");
  const useCase = firstTerm(analysis.useCase, "灵感搜索");

  return {
    zh: uniq([theme, designType, style, useCase]).slice(0, 4),
    en: ["visual design", "key visual", "poster layout", "design inspiration"]
  };
}

function createPlatformTerms(analysis: RequirementAnalysis): Record<Platform, string[]> {
  const phrases = createShortSearchPhrases(analysis);
  const platformLeadTerms: Record<Platform, string> = {
    dribbble: phrases.en[1] ?? "key visual",
    behance: phrases.en[1] ?? "campaign visual",
    pinterest: phrases.en[0] ?? "design moodboard",
    huaban: phrases.zh[0] ?? "主视觉",
    awwwards: isCommerceCampaign(analysis) ? "campaign landing" : "website hero",
    fontsInUse: "title typography",
    unsplash: phrases.en[3] ?? "visual background"
  };

  return (Object.keys(platformSearchRules) as Platform[]).reduce<Record<Platform, string[]>>((acc, platform) => {
    acc[platform] = [platformLeadTerms[platform] ?? platformSearchRules[platform][0]];
    return acc;
  }, {} as Record<Platform, string[]>);
}

function createSearchCombinations(analysis: RequirementAnalysis): string[] {
  const phrases = createShortSearchPhrases(analysis);
  return uniq([phrases.zh[0], phrases.zh[1], phrases.en[0], phrases.en[1]]).filter(Boolean);
}

function createCategorySearches(analysis: RequirementAnalysis, englishKeywords: string[]) {
  const themeZh = analysis.themeContent.slice(0, 2).join(" ");
  const styleZh = analysis.visualStyle.slice(0, 2).join(" ");
  const themeEn = createKeywordSafeText(englishKeywords.slice(0, 2), "creative concept");
  const styleEn = createKeywordSafeText(englishKeywords.slice(2, 5), "modern design");

  return Object.entries(categorySearchRules).map(([category, rule]) => ({
    category: category as keyof typeof categorySearchRules,
    label: rule.label,
    purpose: rule.purpose,
    zhQuery: `${themeZh} ${styleZh} ${rule.zhSuffix}`.trim(),
    enQuery: `${themeEn} ${styleEn} ${rule.enSuffix}`.trim(),
    platforms: rule.platforms
  }));
}

function createKeywordSafeText(items: string[], fallback: string): string {
  return items.length > 0 ? items.join(" ") : fallback;
}

function createAestheticInsights(analysis: RequirementAnalysis): AestheticInsight[] {
  const theme = analysis.themeContent.join(" / ");
  const style = analysis.visualStyle.join(" / ");
  const isTech = analysis.visualStyle.some((item) => /科技|未来|数字/.test(item));
  const isComic = analysis.visualStyle.some((item) => /美漫|漫画|高对比/.test(item));

  return [
    {
      title: "视觉焦点",
      observation: `${theme}需要在首屏形成一个可被快速识别的中心符号。`,
      action: isTech ? "用发光界面、数据轨迹或 AI 图形做主焦点，周围留出标题安全区。" : "把主题提炼成一个主图形，减少同级元素竞争。"
    },
    {
      title: "构图节奏",
      observation: `${style}适合用强弱分明的前景、中景和背景层次。`,
      action: isComic ? "使用斜向动势、爆炸框或粗描边，让封面在列表里更有冲击力。" : "用大标题加次级说明组成稳定阅读路径。"
    },
    {
      title: "材质气质",
      observation: "参考图不要只看颜色，还要拆出纹理、光影、颗粒和边缘处理。",
      action: "为背景准备一组纹理关键词，再与主题关键词组合搜索，避免结果只停留在普通模板。"
    },
    {
      title: "字体策略",
      observation: "标题字决定第一眼的专业度，不能只依赖默认字体。",
      action: "优先搜索 Fonts In Use / Behance 的标题排版案例，提取字重、字距、描边和投影规则。"
    }
  ];
}

function createDesignDirections(analysis: RequirementAnalysis, chineseKeywords: string[]): DesignDirection[] {
  const theme = analysis.themeContent[0] ?? "创意主题";
  const style = analysis.visualStyle.slice(0, 2).join(" / ");
  const designType = analysis.designType[0] ?? "视觉设计";
  const isCommerceCampaign = analysis.themeContent.some((item) => /618|大促|促销|购物节|电商/.test(item));

  if (isCommerceCampaign) {
    return [
      {
        title: "利益点优先方向",
        summary: `把${theme}的折扣、满减或爆品信息放到第一视觉层，适合快速传达活动价值。`,
        steps: ["先确定 1 个最大利益点", "用大数字和强对比色建立视觉焦点", "把活动时间和按钮信息放在次级层"],
        keywords: chineseKeywords.slice(0, 5)
      },
      {
        title: "大促主视觉方向",
        summary: "用商品、礼盒、标签、光效和冲刺动势组成高转化活动画面。",
        steps: ["选择核心商品或活动符号", "建立前景商品和背景氛围的层次", "用价格牌、角标或优惠券强化促销感"],
        keywords: ["大促主视觉", "优惠券", "爆品", "活动氛围"]
      },
      {
        title: "标题字强化方向",
        summary: "先做 618 主标题字，再围绕标题补充商品、利益点和活动信息。",
        steps: ["放大 618 数字或主标题", "用描边、投影、金属或发光效果提高识别", "控制副文案数量，避免挤满画面"],
        keywords: ["618标题字", "促销字体", "大数字排版", style]
      },
      {
        title: "落地页首屏方向",
        summary: "把活动主视觉改造成可点击的网页首屏或电商会场入口。",
        steps: ["首屏保留主标题、利益点、行动按钮", "背景使用活动氛围图，不抢 CTA", "移动端优先检查文字和按钮可读性"],
        keywords: ["电商首屏", "活动会场", "CTA按钮", "高转化版式"]
      }
    ];
  }

  return [
    {
      title: "强符号封面方向",
      summary: `把${theme}压缩成一个大符号，适合${designType}的第一眼识别。`,
      steps: ["先画一个中心图形或图标", "标题区固定在上方或左侧", "背景只保留一组低对比纹理"],
      keywords: chineseKeywords.slice(0, 5)
    },
    {
      title: "参考图拆解方向",
      summary: "先找 12 张参考图，再按构图、字体、材质、配色四类拆解，不直接照搬单张图。",
      steps: ["每个平台打开 1 个搜索组合", "收藏最接近目标气质的 2 张", "提炼共同特征后再进入设计"],
      keywords: ["构图", "字体", "材质", "配色"]
    },
    {
      title: "标题字优先方向",
      summary: "先解决标题气质，再补插画和背景，适合公众号封面和海报。",
      steps: ["确定主标题 6-10 个字", "搜索同风格标题字", "用描边、投影或高光强化阅读"],
      keywords: ["标题字", "字重对比", "排版层级", style]
    },
    {
      title: "无文字底图方向",
      summary: "先生成或搜集无文字底图，再在设计软件里单独处理标题、品牌和行动信息。",
      steps: ["先确定画面主体和背景氛围", "底图阶段避开内嵌文字", "最后单独处理标题与版式"],
      keywords: ["无文字背景", "视觉焦点", "后期排版"]
    }
  ];
}

interface PromptGenerationOptions {
  promptSource?: PromptSource;
  promptInterpretations?: Partial<Record<PromptScenarioId, PromptInterpretation>>;
}

function createPromptText(id: PromptScenarioId, interpretation: PromptInterpretation): string {
  if (interpretation.prompt && isValidPromptText(interpretation.prompt)) {
    return interpretation.prompt.trim();
  }

  if (id === "icon") {
    return [
      "1、生成对象为独立图标 / Logo 符号，不生成页面截图，不生成海报。",
      `2、图标要表达${interpretation.pageKeywords}，核心概念清晰，一眼能识别。`,
      "3、造型以简洁几何结构为主，强调轮廓、正负形、比例和小尺寸识别度。",
      `4、配色使用${interpretation.keyColor}为主色，少量${interpretation.glowColor}作为高光或辅助色，避免复杂渐变堆叠。`,
      "5、整体要高级、克制、有科技感，但保持温暖、向上、有生命力。",
      "6、输出为居中构图、干净背景、矢量感强、边缘清晰的图标方案，避免文字、水印、复杂场景和真实照片。"
    ].join("\n");
  }

  if (id === "asset") {
    return [
      "1、生成对象为无文字背景 / 纹理 / 氛围素材，不生成完整页面，不生成海报。",
      `2、素材要像${interpretation.pageKeywords}，适合后期叠加 UI、标题或品牌信息。`,
      `3、背景可以用${interpretation.backgroundTone}底，但不要恐怖、压抑，不要出现具体文案。`,
      `4、光效用柔和${interpretation.keyColor}，少量${interpretation.glowColor}弥散光，控制亮度和层次。`,
      "5、整体要温暖、向上、有生命力、有仪式感，材质干净、有呼吸感。",
      "6、留白充足，画面中心和边缘都要可承载内容，避免人物大脸、复杂物体和模板化装饰。"
    ].join("\n");
  }

  return [
    "1、页面尺寸为 iPhone 截图比例，保留状态栏，750×1624。",
    `2、页面要像${interpretation.pageKeywords}，不要像海报。`,
    `3、背景可以用${interpretation.backgroundTone}底，但不要恐怖、压抑。`,
    `4、光效用柔和${interpretation.keyColor}，少量${interpretation.glowColor}弥散光。`,
    "5、整体要温暖、向上、有生命力、有仪式感。",
    "6、留白充足，页面要有真实 App 截图感。"
  ].join("\n");
}

function isValidPromptText(prompt: string): boolean {
  return ["1、", "2、", "3、", "4、", "5、", "6、"].every((prefix) => prompt.includes(prefix));
}

function createPromptScenarios(analysis: RequirementAnalysis, options: PromptGenerationOptions = {}): PromptScenario[] {
  const recommendedId = getRecommendedPromptScenarioId(analysis);
  const promptKeywords = getPromptKeywords(analysis);
  const localInterpretations = createLocalPromptInterpretations(analysis);
  const interpretations: Record<PromptScenarioId, PromptInterpretation> = {
    visual: options.promptInterpretations?.visual ?? localInterpretations.visual,
    ui: options.promptInterpretations?.ui ?? localInterpretations.ui,
    icon: options.promptInterpretations?.icon ?? localInterpretations.icon,
    asset: options.promptInterpretations?.asset ?? localInterpretations.asset
  };

  const scenarios: PromptScenario[] = [
    {
      id: "visual",
      label: "视觉页面",
      description: interpretations.visual.realMeaning,
      keywords: promptKeywords.visual,
      recommended: recommendedId === "visual",
      interpretation: interpretations.visual,
      zh: createPromptText("visual", interpretations.visual)
    },
    {
      id: "ui",
      label: "UI界面",
      description: interpretations.ui.realMeaning,
      keywords: promptKeywords.ui,
      recommended: recommendedId === "ui",
      interpretation: interpretations.ui,
      zh: createPromptText("ui", interpretations.ui)
    },
    {
      id: "icon",
      label: "图标/Logo",
      description: interpretations.icon.realMeaning,
      keywords: promptKeywords.icon,
      recommended: recommendedId === "icon",
      interpretation: interpretations.icon,
      zh: createPromptText("icon", interpretations.icon)
    },
    {
      id: "asset",
      label: "背景/素材",
      description: interpretations.asset.realMeaning,
      keywords: promptKeywords.asset,
      recommended: recommendedId === "asset",
      interpretation: interpretations.asset,
      zh: createPromptText("asset", interpretations.asset)
    }
  ];

  return scenarios.sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

function createAiPrompts(promptScenarios: PromptScenario[]) {
  const recommended = promptScenarios.find((scenario) => scenario.recommended) ?? promptScenarios[0];
  return {
    zh: [recommended.zh]
  };
}

function createCodexWorkflowPrompt(resultDraft: {
  sourceInput: string;
  analysis: RequirementAnalysis;
  chineseKeywords: string[];
  englishKeywords: string[];
}): string {
  return [
    `请按“灵感雷达 InspoRadar”工作流处理这个设计任务：${resultDraft.sourceInput}`,
    "1. 先拆解需求：设计类型、主题内容、视觉风格、应用场景、情绪方向。",
    "2. 分别列出 Logo、海报、纹理、壁纸、标题字五类搜索关键词，中文和英文都要给。",
    "3. 针对 Dribbble、Behance、Pinterest、花瓣网、Awwwards、Fonts In Use、Unsplash 给出可直接搜索的短关键词或短语。",
    "4. 如果可以联网，请立刻搜索参考图并列出图片链接；如果不能联网，就输出搜索入口和检索策略。",
    "5. 对参考方向做审美拆解：构图、字体、色彩、材质、信息层级。",
    "6. 总结 3-5 个今天就能上手的设计方向，每个方向包含执行步骤。",
    "7. 最后用 6 条移动端截图提示词格式输出提示词：750×1624、保留状态栏、像真实 App 页面、不要像海报、匹配关键词色彩和柔和弥散光。"
  ].join("\n");
}

export function generateKeywords(input: string, options: PromptGenerationOptions = {}): KeywordResult {
  const analysis = createAnalysis(input);
  const keywordPool = createKeywordPool(input);
  const platformSearchTerms = createPlatformTerms(analysis);
  const categorySearches = createCategorySearches(analysis, keywordPool.en);
  const aestheticInsights = createAestheticInsights(analysis);
  const designDirections = createDesignDirections(analysis, keywordPool.zh);
  const searchCombinations = createSearchCombinations(analysis);
  const promptSource = options.promptSource ?? "local";
  const promptScenarios = createPromptScenarios(analysis, options);
  const aiPrompts = createAiPrompts(promptScenarios);
  const codexWorkflowPrompt = createCodexWorkflowPrompt({
    sourceInput: input.trim(),
    analysis,
    chineseKeywords: keywordPool.zh,
    englishKeywords: keywordPool.en
  });

  return {
    sourceInput: input.trim(),
    analysis,
    chineseKeywords: keywordPool.zh,
    englishKeywords: keywordPool.en,
    platformSearchTerms,
    categorySearches,
    aestheticInsights,
    designDirections,
    searchCombinations,
    promptScenarios,
    aiPrompts,
    promptSource,
    promptSourceLabel: promptSource === "model" ? "大模型分析" : "本地规则",
    codexWorkflowPrompt
  };
}
