/** Per-device preferences (intro seen, guide hidden, banners closed). Never game state. */
export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`comptoirs:${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(`comptoirs:${key}`, value);
    } catch {
      // Private mode or storage blocked: preferences are simply not kept.
    }
  },
};
