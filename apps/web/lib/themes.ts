export const FORM_CSS_VARIABLES = [
  "--form-bg",
  "--form-surface",
  "--form-primary",
  "--form-primary-fg",
  "--form-accent",
  "--form-text",
  "--form-muted",
  "--form-border",
  "--form-radius",
  "--form-font",
] as const;

export type FormCssVariable = (typeof FORM_CSS_VARIABLES)[number];
export type FormCssVariables = Record<FormCssVariable, string>;

const DEFAULT_VARS: FormCssVariables = {
  "--form-bg": "hsl(0 0% 100%)",
  "--form-surface": "hsl(0 0% 98%)",
  "--form-primary": "hsl(221 83% 53%)",
  "--form-primary-fg": "hsl(0 0% 100%)",
  "--form-accent": "hsl(221 83% 95%)",
  "--form-text": "hsl(222 47% 11%)",
  "--form-muted": "hsl(215 16% 47%)",
  "--form-border": "hsl(214 32% 91%)",
  "--form-radius": "0.5rem",
  "--form-font": '"Geist", sans-serif',
};

function theme(overrides: Partial<FormCssVariables>): FormCssVariables {
  return { ...DEFAULT_VARS, ...overrides };
}

export const THEMES = {
  default: theme({
    "--form-bg": "hsl(0 0% 100%)",
    "--form-surface": "hsl(0 0% 98%)",
    "--form-primary": "hsl(221 83% 53%)",
    "--form-primary-fg": "hsl(0 0% 100%)",
    "--form-accent": "hsl(221 83% 95%)",
    "--form-text": "hsl(222 47% 11%)",
    "--form-muted": "hsl(215 16% 47%)",
    "--form-border": "hsl(214 32% 91%)",
    "--form-font": '"Geist", sans-serif',
  }),
  anime: theme({
    "--form-bg": "hsl(330 100% 98%)",
    "--form-surface": "hsl(330 80% 96%)",
    "--form-primary": "hsl(330 80% 55%)",
    "--form-primary-fg": "hsl(0 0% 100%)",
    "--form-accent": "hsl(330 80% 92%)",
    "--form-text": "hsl(330 30% 15%)",
    "--form-muted": "hsl(330 20% 45%)",
    "--form-border": "hsl(330 40% 88%)",
    "--form-radius": "1rem",
    "--form-font": '"Nunito", sans-serif',
  }),
  movie: theme({
    "--form-bg": "hsl(0 0% 8%)",
    "--form-surface": "hsl(0 0% 14%)",
    "--form-primary": "hsl(45 100% 55%)",
    "--form-primary-fg": "hsl(0 0% 8%)",
    "--form-accent": "hsl(45 100% 15%)",
    "--form-text": "hsl(0 0% 95%)",
    "--form-muted": "hsl(0 0% 65%)",
    "--form-border": "hsl(45 30% 22%)",
    "--form-radius": "0.25rem",
    "--form-font": '"Playfair Display", serif',
  }),
  game: theme({
    "--form-bg": "hsl(240 20% 8%)",
    "--form-surface": "hsl(240 20% 14%)",
    "--form-primary": "hsl(120 100% 50%)",
    "--form-primary-fg": "hsl(240 20% 8%)",
    "--form-accent": "hsl(120 100% 10%)",
    "--form-text": "hsl(120 100% 90%)",
    "--form-muted": "hsl(120 40% 55%)",
    "--form-border": "hsl(120 40% 22%)",
    "--form-radius": "0",
    "--form-font": '"Press Start 2P", monospace',
  }),
  startup: theme({
    "--form-bg": "hsl(0 0% 100%)",
    "--form-surface": "hsl(262 83% 98%)",
    "--form-primary": "hsl(262 83% 58%)",
    "--form-primary-fg": "hsl(0 0% 100%)",
    "--form-accent": "hsl(262 83% 95%)",
    "--form-text": "hsl(222 47% 11%)",
    "--form-muted": "hsl(262 20% 45%)",
    "--form-border": "hsl(262 40% 90%)",
    "--form-font": '"Inter", sans-serif',
  }),
  tech_company: theme({
    "--form-bg": "hsl(210 40% 98%)",
    "--form-surface": "hsl(210 40% 96%)",
    "--form-primary": "hsl(199 89% 48%)",
    "--form-primary-fg": "hsl(0 0% 100%)",
    "--form-accent": "hsl(199 89% 92%)",
    "--form-text": "hsl(222 47% 11%)",
    "--form-muted": "hsl(210 16% 45%)",
    "--form-border": "hsl(199 40% 88%)",
    "--form-font": '"Roboto", sans-serif',
  }),
  os: theme({
    "--form-bg": "hsl(210 11% 15%)",
    "--form-surface": "hsl(210 11% 20%)",
    "--form-primary": "hsl(207 90% 54%)",
    "--form-primary-fg": "hsl(0 0% 100%)",
    "--form-accent": "hsl(207 90% 20%)",
    "--form-text": "hsl(0 0% 90%)",
    "--form-muted": "hsl(210 10% 60%)",
    "--form-border": "hsl(210 11% 28%)",
    "--form-radius": "0.375rem",
    "--form-font": '"JetBrains Mono", monospace',
  }),
  event: theme({
    "--form-bg": "hsl(270 50% 98%)",
    "--form-surface": "hsl(270 50% 96%)",
    "--form-primary": "hsl(270 70% 55%)",
    "--form-primary-fg": "hsl(0 0% 100%)",
    "--form-accent": "hsl(270 70% 92%)",
    "--form-text": "hsl(270 30% 15%)",
    "--form-muted": "hsl(270 20% 45%)",
    "--form-border": "hsl(270 40% 88%)",
    "--form-radius": "0.75rem",
    "--form-font": '"Poppins", sans-serif',
  }),
} satisfies Record<string, FormCssVariables>;

export type ThemeKey = keyof typeof THEMES;

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export function isThemeKey(value: string): value is ThemeKey {
  return value in THEMES;
}

export function getThemeVariables(theme: ThemeKey): FormCssVariables {
  return THEMES[theme];
}

export function resolveThemeKey(theme: string | null | undefined): ThemeKey {
  if (theme && isThemeKey(theme)) return theme;
  return "default";
}

/** Swatch classes for the form builder theme picker. */
export const THEME_PICKER_OPTIONS: {
  value: ThemeKey;
  label: string;
  color: string;
}[] = [
  { value: "default", label: "Default", color: "bg-gray-500" },
  { value: "anime", label: "Anime", color: "bg-pink-500" },
  { value: "movie", label: "Movie", color: "bg-red-500" },
  { value: "game", label: "Game", color: "bg-green-500" },
  { value: "startup", label: "Startup", color: "bg-orange-500" },
  { value: "tech_company", label: "Tech Co.", color: "bg-blue-500" },
  { value: "os", label: "OS", color: "bg-cyan-500" },
  { value: "event", label: "Event", color: "bg-yellow-500" },
];
