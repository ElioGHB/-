import type { Platform } from "../types";

interface PlatformConfig {
  label: string;
  buildUrl: (query: string) => string;
}

export const platforms: Record<Platform, PlatformConfig> = {
  dribbble: {
    label: "Dribbble",
    buildUrl: (query) => `https://dribbble.com/search/${encodeURIComponent(query)}`
  },
  behance: {
    label: "Behance",
    buildUrl: (query) => `https://www.behance.net/search/projects/${encodeURIComponent(query)}`
  },
  pinterest: {
    label: "Pinterest",
    buildUrl: (query) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`
  },
  huaban: {
    label: "花瓣网",
    buildUrl: (query) => `https://huaban.com/search?q=${encodeURIComponent(query)}`
  },
  awwwards: {
    label: "Awwwards",
    buildUrl: (query) => `https://www.awwwards.com/search/websites/?text=${encodeURIComponent(query)}`
  },
  fontsInUse: {
    label: "FontsInUse",
    buildUrl: (query) => `https://fontsinuse.com/search?terms=${encodeURIComponent(query)}`
  },
  unsplash: {
    label: "Unsplash",
    buildUrl: (query) => `https://unsplash.com/s/photos/${encodeURIComponent(query)}`
  }
};

export function buildPlatformSearchUrl(platform: Platform, query: string): string {
  return platforms[platform].buildUrl(query);
}

export function openPlatformSearch(platform: Platform, query: string): void {
  window.open(buildPlatformSearchUrl(platform, query), "_blank", "noopener,noreferrer");
}
