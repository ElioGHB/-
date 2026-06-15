import type { InspirationCategory, Platform } from "../types";

export interface RuleMatch {
  triggers: string[];
  zh: string[];
  en: string[];
}

export const requirementRules = {
  designType: [
    {
      triggers: ["公众号封面", "封面", "头图", "自媒体"],
      zh: ["公众号封面", "自媒体封面"],
      en: ["WeChat article cover", "social media cover"]
    },
    {
      triggers: ["海报", "poster"],
      zh: ["海报设计", "视觉海报"],
      en: ["poster design", "visual poster"]
    },
    {
      triggers: ["banner", "横幅", "广告图", "运营图", "活动图"],
      zh: ["运营活动图", "Banner设计"],
      en: ["campaign banner", "promotional banner"]
    },
    {
      triggers: ["包装", "包装设计", "package", "packaging"],
      zh: ["包装设计", "产品包装"],
      en: ["packaging design", "product packaging"]
    },
    {
      triggers: ["ui", "UI", "界面", "App", "app", "小程序", "后台", "dashboard", "仪表盘", "产品界面"],
      zh: ["UI界面", "产品界面"],
      en: ["user interface", "product interface"]
    },
    {
      triggers: ["618", "大促", "促销", "电商", "年中大促", "购物节"],
      zh: ["电商大促主视觉", "促销活动海报"],
      en: ["ecommerce campaign key visual", "sale promotion poster"]
    },
    {
      triggers: ["logo", "Logo", "标志", "品牌符号", "图标", "icon", "Icon"],
      zh: ["Logo设计", "图标设计", "品牌标志"],
      en: ["logo design", "icon design", "brand mark"]
    },
    {
      triggers: ["标题字", "字体", "字标", "typography"],
      zh: ["标题字设计", "字体设计"],
      en: ["title typography", "lettering design"]
    },
    {
      triggers: ["纹理", "肌理", "texture"],
      zh: ["纹理设计", "视觉肌理"],
      en: ["texture design", "visual texture"]
    },
    {
      triggers: ["壁纸", "背景", "wallpaper"],
      zh: ["壁纸设计", "背景视觉"],
      en: ["wallpaper design", "background visual"]
    },
    {
      triggers: ["落地页", "网页", "网站", "官网", "产品页", "首屏"],
      zh: ["网页设计", "落地页"],
      en: ["web design", "landing page"]
    }
  ],
  themeContent: [
    {
      triggers: ["AI工具", "AI 工具", "人工智能", "ai tool", "aitool"],
      zh: ["AI工具", "人工智能"],
      en: ["AI tools", "artificial intelligence"]
    },
    {
      triggers: ["SaaS", "saas", "软件"],
      zh: ["SaaS产品", "软件工具"],
      en: ["SaaS product", "software tool"]
    },
    {
      triggers: ["品牌", "brand"],
      zh: ["品牌传播", "品牌视觉"],
      en: ["brand campaign", "brand identity"]
    },
    {
      triggers: ["618", "大促", "促销", "电商", "年中大促", "购物节"],
      zh: ["618大促", "年中购物节", "电商促销"],
      en: ["618 shopping festival", "mid-year sale", "ecommerce promotion"]
    }
  ],
  visualStyle: [
    {
      triggers: ["科技感", "科技", "未来感", "cyber", "tech"],
      zh: ["科技感", "未来感", "数字界面"],
      en: ["futuristic", "technology", "digital interface"]
    },
    {
      triggers: ["美漫", "漫画", "comic"],
      zh: ["美漫风", "漫画质感", "高对比插画"],
      en: ["American comic style", "comic book illustration", "bold ink"]
    },
    {
      triggers: ["极简", "简洁", "minimal"],
      zh: ["极简风", "留白", "清爽版式"],
      en: ["minimal design", "clean layout", "white space"]
    },
    {
      triggers: ["高级", "高端", "精致", "premium", "luxury"],
      zh: ["高级感", "精致质感"],
      en: ["premium design", "refined visual"]
    },
    {
      triggers: ["温暖", "治愈", "亲和", "warm", "friendly"],
      zh: ["温暖感", "亲和氛围"],
      en: ["warm tone", "friendly atmosphere"]
    },
    {
      triggers: ["618", "大促", "促销", "电商", "年中大促", "购物节"],
      zh: ["大促氛围", "醒目促销", "高转化版式"],
      en: ["sale campaign design", "bold promotional layout", "conversion-focused visual"]
    }
  ],
  useCase: [
    {
      triggers: ["公众号", "自媒体", "小红书", "社媒"],
      zh: ["社交传播", "内容封面"],
      en: ["editorial social post", "content cover"]
    },
    {
      triggers: ["官网", "产品页", "landing", "界面", "App", "app", "小程序", "后台", "dashboard"],
      zh: ["产品展示", "官网首屏", "界面设计"],
      en: ["product showcase", "website hero", "interface design"]
    },
    {
      triggers: ["618", "大促", "促销", "电商", "年中大促", "购物节"],
      zh: ["电商转化", "活动营销"],
      en: ["ecommerce conversion", "campaign marketing"]
    }
  ],
  mood: [
    {
      triggers: ["科技感", "未来感", "AI", "人工智能"],
      zh: ["专业", "前沿", "智能"],
      en: ["professional", "cutting edge", "intelligent"]
    },
    {
      triggers: ["美漫", "漫画"],
      zh: ["强冲击", "戏剧化", "动感"],
      en: ["high impact", "dramatic", "dynamic"]
    },
    {
      triggers: ["高级", "高端", "精致", "premium", "luxury"],
      zh: ["品质感", "可信赖", "克制"],
      en: ["premium", "trustworthy", "restrained"]
    },
    {
      triggers: ["温暖", "治愈", "亲和", "warm", "friendly"],
      zh: ["温和", "亲近", "舒适"],
      en: ["warm", "approachable", "comfortable"]
    },
    {
      triggers: ["618", "大促", "促销", "电商", "年中大促", "购物节"],
      zh: ["热烈", "优惠感", "强行动号召"],
      en: ["energetic", "discount-driven", "strong call to action"]
    }
  ]
} satisfies Record<string, RuleMatch[]>;

export const fallbackRules = {
  designType: {
    zh: ["视觉设计"],
    en: ["visual design"]
  },
  themeContent: {
    zh: ["创意主题"],
    en: ["creative concept"]
  },
  visualStyle: {
    zh: ["现代感", "清晰层级"],
    en: ["modern design", "clear hierarchy"]
  },
  useCase: {
    zh: ["灵感搜索"],
    en: ["inspiration search"]
  },
  mood: {
    zh: ["清晰", "有辨识度"],
    en: ["clear", "distinctive"]
  }
};

export const platformSearchRules: Record<Platform, string[]> = {
  huaban: ["主视觉", "海报设计", "标题字"],
  dribbble: ["视觉设计灵感", "大促画页", "版式参考"],
  behance: ["主视觉设计", "品牌活动设计", "社论版式"],
  pinterest: ["设计情绪板", "海报版式灵感", "视觉参考"],
  awwwards: ["落地页灵感", "网站首屏设计", "活动网站"],
  fontsInUse: ["编辑排版", "标题排版", "展示字体"],
  unsplash: ["背景纹理", "产品场景", "氛围效果"]
};

export const categorySearchRules: Record<
  InspirationCategory,
  {
    label: string;
    purpose: string;
    zhSuffix: string;
    enSuffix: string;
    platforms: Platform[];
  }
> = {
  logo: {
    label: "Logo",
    purpose: "提取品牌符号、图形记忆点和图标化处理方式",
    zhSuffix: "Logo 标志 品牌符号",
    enSuffix: "logo brand mark symbol",
    platforms: ["dribbble", "behance", "pinterest", "huaban"]
  },
  poster: {
    label: "海报",
    purpose: "寻找主视觉构图、标题层级和画面冲击力",
    zhSuffix: "海报 主视觉 版式",
    enSuffix: "poster key visual editorial layout",
    platforms: ["behance", "pinterest", "dribbble", "huaban"]
  },
  texture: {
    label: "纹理",
    purpose: "补充背景材质、光影颗粒和视觉质感",
    zhSuffix: "纹理 肌理 背景材质",
    enSuffix: "texture material grain background",
    platforms: ["pinterest", "huaban", "unsplash", "behance"]
  },
  wallpaper: {
    label: "壁纸",
    purpose: "寻找大面积背景、氛围光和空间层次",
    zhSuffix: "壁纸 背景 视觉氛围",
    enSuffix: "wallpaper background atmosphere",
    platforms: ["unsplash", "pinterest", "huaban", "dribbble"]
  },
  typography: {
    label: "标题字",
    purpose: "参考字体气质、字重对比和标题字处理",
    zhSuffix: "标题字 字体 排版",
    enSuffix: "title typography lettering",
    platforms: ["fontsInUse", "behance", "pinterest", "huaban"]
  }
};
