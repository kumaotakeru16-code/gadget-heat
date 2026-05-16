export type LocaleCode = "jp" | "en";

export interface Marketplace {
  id: string;
  name: string;
  note: string;
}

export interface Locale {
  code: LocaleCode;
  label: string;
  region: string;
  currency: string;
  timezone: string;
  markets: Marketplace[];
}

export const LOCALES: Record<LocaleCode, Locale> = {
  jp: {
    code: "jp",
    label: "JP",
    region: "Japan",
    currency: "¥",
    timezone: "JST",
    markets: [
      { id: "rakuten", name: "Rakuten", note: "MVP data source" },
      { id: "amazon", name: "Amazon.co.jp", note: "Common purchase route" },
    ],
  },
  en: {
    code: "en",
    label: "EN",
    region: "Global",
    currency: "$",
    timezone: "EST",
    markets: [
      { id: "bestbuy", name: "Best Buy", note: "MVP data source" },
      { id: "amazon", name: "Amazon.com", note: "Common purchase route" },
      { id: "bh", name: "B&H Photo", note: "Creator gear anchor" },
      { id: "manuf", name: "Manufacturer", note: "Direct" },
    ],
  },
};
