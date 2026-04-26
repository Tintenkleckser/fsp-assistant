'use client';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler';
import { I18nProvider } from '@/components/i18n-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <I18nProvider>
        {children}
        <Toaster />
        <ChunkLoadErrorHandler />
      </I18nProvider>
    </ThemeProvider>
  );
}
