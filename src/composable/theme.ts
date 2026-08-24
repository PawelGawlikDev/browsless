import { extensionStorage } from '@/lib/extensionStorage';
import { ref, onMounted } from 'vue';
type ThemeId = 'light' | 'dark' | 'system';
const themes: Array<{
  name: string;
  id: ThemeId;
}> = [
  { name: 'Light', id: 'light' },
  { name: 'Dark', id: 'dark' },
  { name: 'System', id: 'system' },
];
const isPreferDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
export const useTheme = () => {
  const activeTheme = ref<ThemeId>('system');
  const setTheme = async (theme: ThemeId) => {
    const isValidTheme = themes.some(({ id }) => id === theme);
    if (!isValidTheme) return;
    let isDarkTheme = theme === 'dark';
    if (theme === 'system') isDarkTheme = isPreferDark();
    document.documentElement.classList.toggle('dark', isDarkTheme);
    activeTheme.value = theme;
    await extensionStorage.local.set({ theme });
  };
  const getTheme = async (): Promise<ThemeId> => {
    let { theme } = await extensionStorage.local.get('theme');
    if (!theme) theme = 'system';
    return theme as ThemeId;
  };
  const init = async () => {
    const theme = await getTheme();
    await setTheme(theme);
  };
  onMounted(async () => {
    activeTheme.value = await getTheme();
  });
  return {
    init,
    themes,
    activeTheme,
    set: setTheme,
    get: getTheme,
  };
};
