export const MUSIC_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Automatic · Indian mix" },
  { value: "hindi", label: "Hindi" },
  { value: "punjabi", label: "Punjabi" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "malayalam", label: "Malayalam" },
  { value: "kannada", label: "Kannada" },
  { value: "bengali", label: "Bengali" },
  { value: "marathi", label: "Marathi" },
  { value: "gujarati", label: "Gujarati" },
  { value: "english", label: "English" },
] as const;

export type MusicLanguage = (typeof MUSIC_LANGUAGE_OPTIONS)[number]["value"];

export function getMusicLanguageLabel(value?: string | null) {
  return MUSIC_LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ?? MUSIC_LANGUAGE_OPTIONS[0].label;
}

export function getMusicLanguageSearchTerm(value?: string | null) {
  const option = MUSIC_LANGUAGE_OPTIONS.find((item) => item.value === value);
  return option && option.value !== "auto" ? option.label : "Hindi";
}
