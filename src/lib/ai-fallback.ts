/**
 * Timeout-with-fallback wrapper for AI-backed calls.
 *
 * Every AI feature races its real call against a 10s timer. If the timer wins,
 * we ignore the pending call and return pre-written content so a live demo
 * never hangs. Callers mark the result so the UI can render a subtle indicator.
 */

export const AI_TIMEOUT_MS = 10_000;

export interface RacedResult<T> {
  value: T;
  isFallback: boolean;
}

/** Dev-only escape hatch: ?forceTimeout=true always resolves the timeout branch. */
export function isForcedTimeout(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("forceTimeout") === "true";
  } catch {
    return false;
  }
}

export async function raceWithFallback<T>(
  featureName: string,
  run: (signal: AbortSignal) => Promise<T>,
  fallback: () => T,
  timeoutMs: number = AI_TIMEOUT_MS,
): Promise<RacedResult<T>> {
  const controller = new AbortController();
  const forced = isForcedTimeout();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), forced ? 0 : timeoutMs);
  });

  const realPromise = forced
    ? new Promise<T>(() => {})
    : run(controller.signal);
  // Never surface an unhandled rejection from the abandoned call.
  realPromise.catch(() => undefined);

  try {
    const outcome = await Promise.race([realPromise, timeoutPromise]);
    if (outcome === TIMEOUT) {
      controller.abort();
      console.warn(`[fallback] ${featureName} used pre-written response due to timeout`);
      return { value: fallback(), isFallback: true };
    }
    return { value: outcome as T, isFallback: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const TIMEOUT = Symbol("ai-timeout");
