import { useState, useEffect } from 'react';

/**
 * Hook para debouncing de valores com atraso configurável (padrão: 300ms).
 * Otimiza buscas e filtros evitando recomputações a cada caractere digitado.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
