export const AVATAR_STYLE_OPTIONS = [
  { value: "masculine", label: "Male avatar" },
  { value: "feminine", label: "Female avatar" },
  { value: "neutral", label: "Other / neutral avatar" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type AvatarStyle = (typeof AVATAR_STYLE_OPTIONS)[number]["value"];

export const CHAT_THEME_OPTIONS = [
  { id: "lime", label: "Electric lime", color: "#d6ff36", textColor: "#07100d" },
  { id: "violet", label: "Violet pop", color: "#bd8bff", textColor: "#100b19" },
  { id: "coral", label: "Tangerine coral", color: "#ff8064", textColor: "#1a0c08" },
  { id: "mint", label: "Mint wave", color: "#50edcd", textColor: "#061410" },
  { id: "pink", label: "Hot pink", color: "#ff79b8", textColor: "#170911" },
] as const;

export type ChatThemeId = (typeof CHAT_THEME_OPTIONS)[number]["id"];

export function getChatTheme(value?: string | null) {
  return CHAT_THEME_OPTIONS.find((theme) => theme.id === value) ?? CHAT_THEME_OPTIONS[0];
}

