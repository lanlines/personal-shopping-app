export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(error: unknown): Result<never> {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}