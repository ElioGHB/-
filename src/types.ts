export type Platform =
  | "dribbble"
  | "behance"
  | "pinterest"
  | "huaban"
  | "awwwards"
  | "fontsInUse"
  | "unsplash";

export interface RequirementAnalysis {
  designType: string[];
  themeContent: string[];
  visualStyle: string[];
  useCase: string[];
  mood: string[];
}

export interface ModelConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export type InspirationCategory = "logo" | "poster" | "texture" | "wallpaper" | "typography";

export interface CategorySearch {
  category: InspirationCategory;
  label: string;
  purpose: string;
  zhQuery: string;
  enQuery: string;
  platforms: Platform[];
}

export interface AestheticInsight {
  title: string;
  observation: string;
  action: string;
}

export interface DesignDirection {
  title: string;
  summary: string;
  steps: string[];
  keywords: string[];
}

export type PromptScenarioId = "visual" | "ui" | "icon" | "asset";

export type PromptSource = "local" | "model";

export interface PromptInterpretation {
  realMeaning: string;
  pageKeywords: string;
  backgroundTone: "深色" | "浅色";
  keyColor: string;
  glowColor: string;
  prompt?: string;
}

export interface PromptScenario {
  id: PromptScenarioId;
  label: string;
  description: string;
  keywords: string[];
  recommended: boolean;
  zh: string;
  interpretation: PromptInterpretation;
}

export interface KeywordResult {
  sourceInput: string;
  analysis: RequirementAnalysis;
  chineseKeywords: string[];
  englishKeywords: string[];
  platformSearchTerms: Record<Platform, string[]>;
  categorySearches: CategorySearch[];
  aestheticInsights: AestheticInsight[];
  designDirections: DesignDirection[];
  searchCombinations: string[];
  promptScenarios: PromptScenario[];
  aiPrompts: {
    zh: string[];
  };
  promptSource: PromptSource;
  promptSourceLabel: string;
  codexWorkflowPrompt: string;
}
