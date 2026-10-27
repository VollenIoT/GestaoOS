import { useState, useEffect } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';

// Cache em memória para não precisar reler o disco nas re-renderizações do React
const imageCache = new Map<string, string>();

/**
 * Remove aspas envolventes e espaços do caminho copiado
 */
export function cleanImagePath(src?: string): string {
  if (!src || !src.trim()) return '';
  let trimmed = src.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Retorna uma URL síncrona preliminar para o caminho da imagem.
 */
export function resolveImageSrc(src?: string): string {
  const clean = cleanImagePath(src);
  if (!clean) return '';

  if (
    clean.startsWith('data:') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('asset:')
  ) {
    return clean;
  }

  if (imageCache.has(clean)) {
    return imageCache.get(clean)!;
  }

  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      return convertFileSrc(clean);
    }
  } catch (err) {
    console.warn('Erro ao converter caminho de arquivo no Tauri:', err);
  }

  return clean.startsWith('file://') ? clean : `file:///${clean.replace(/\\/g, '/')}`;
}

/**
 * Lê o arquivo de imagem diretamente pelo comando nativo em Rust do Tauri
 * e retorna como Data URL base64 ultra-compatível.
 */
export async function fetchLocalImageDataUrl(src?: string): Promise<string> {
  const clean = cleanImagePath(src);
  if (!clean) return '';

  if (
    clean.startsWith('data:') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:')
  ) {
    return clean;
  }

  if (imageCache.has(clean)) {
    return imageCache.get(clean)!;
  }

  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const dataUrl = await invoke<string>('read_local_image_data_url', { path: clean });
      if (dataUrl) {
        imageCache.set(clean, dataUrl);
        return dataUrl;
      }
    }
  } catch (err) {
    console.warn('Não foi possível ler imagem via comando nativo Rust:', err);
  }

  const fallback = resolveImageSrc(clean);
  return fallback;
}

/**
 * Hook React para carregar de forma confiável e reativa imagens de caminhos locais do Windows.
 */
export function useImageSource(src?: string) {
  const [displaySrc, setDisplaySrc] = useState<string>(() => resolveImageSrc(src));
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const clean = cleanImagePath(src);
    if (!clean) {
      setDisplaySrc('');
      setHasError(false);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    // Se já for data URL ou web URL
    if (
      clean.startsWith('data:') ||
      clean.startsWith('http://') ||
      clean.startsWith('https://') ||
      clean.startsWith('blob:')
    ) {
      setDisplaySrc(clean);
      setIsLoading(false);
      return;
    }

    // Se já estiver em cache
    if (imageCache.has(clean)) {
      setDisplaySrc(imageCache.get(clean)!);
      setIsLoading(false);
      return;
    }

    fetchLocalImageDataUrl(clean)
      .then((res) => {
        if (isMounted) {
          if (res) {
            setDisplaySrc(res);
            setHasError(false);
          } else {
            setHasError(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  return { displaySrc, hasError, setHasError, isLoading };
}
