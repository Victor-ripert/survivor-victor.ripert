/**
 * Safely reads a Vite-injected environment variable (`import.meta.env.*`).
 * Wrapped because `import.meta.env` is a Vite-only feature: under Jest (no
 * Vite involved) it's absent at runtime even though the `vite/client`
 * types claim it's always there, and reading a property off `undefined`
 * throws instead of returning `undefined`. Shared by anything that needs a
 * `VITE_*` value outside of Vite's own dev/build process — currently
 * `VideoEmbed` and `httpClient` — so this fallback-handling only exists
 * once instead of being copy-pasted at each call site.
 */
export function getEnv(key: string, fallback: string): string {
  try {
    const value = import.meta.env[key] as string | undefined;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
