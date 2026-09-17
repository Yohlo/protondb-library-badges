export interface Throttled<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
}

export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number): Throttled<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: A;
  const throttled = ((...args: A) => {
    latest = args;
    timer ??= setTimeout(() => {
      timer = null;
      fn(...latest);
    }, ms);
  }) as Throttled<A>;
  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return throttled;
}
