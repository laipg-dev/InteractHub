import { useEffect, useState } from "react";

const DEFAULT_DELAY_MS = 350;

export const useDebouncedValue = <T,>(
  value: T,
  delayMs: number = DEFAULT_DELAY_MS,
) => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debouncedValue;
};

