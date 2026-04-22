'use client';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, BookOpen, LogOut, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/synthema-logo.png" alt="SYNTHEMA" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">{t('common.appName')}</span>
        </Link>
        <nav className="flex items-center gap-1">
          {user && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.dashboard')}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/coaching" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.coaching')}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/glossary" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.glossary')}</span>
                </Link>
              </Button>
            </>
          )}
          <LanguageSwitcher />
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
