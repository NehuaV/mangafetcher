export type Result<T, E = Error> = readonly [T, null] | readonly [null, E];

export function ok<T>(value: T): Result<T, never> {
  return [value, null];
}

export function err<E = Error>(error: E): Result<never, E> {
  return [null, error];
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(toError(error));
  }
}

export type Chapter = {
  url: string;
  index: number;
  name: string;
};

export type ChapterImage = Chapter & {
  url: string;
  imageName: string;
  retryCount?: number;
};
