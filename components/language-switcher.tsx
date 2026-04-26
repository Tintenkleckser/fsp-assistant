'use client';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type LangCode = 'de' | 'tr' | 'en';

const LANG_LABEL: Record<LangCode, string> = {
  de: 'DE',
  tr: 'TR',
  en: 'EN',
};

const LANG_FLAG: Record<LangCode, string> = {
  de: '🇩🇪',
  tr: '🇹🇷',
  en: '🇬🇧',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = ((i18n?.language ?? 'de').split('-')[0] as LangCode);
  const safeLang: LangCode = (['de', 'tr', 'en'] as LangCode[]).includes(currentLang) ? currentLang : 'de';

  const change = (lang: LangCode) => {
    i18n?.changeLanguage?.(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 font-medium">
          <Globe className="h-4 w-4" />
          <span>{LANG_LABEL[safeLang]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {(['de', 'tr', 'en'] as LangCode[]).map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => change(code)}
            className="gap-2 cursor-pointer"
          >
            <span className="text-base leading-none">{LANG_FLAG[code]}</span>
            <span className="flex-1">
              {code === 'de' ? 'Deutsch' : code === 'tr' ? 'Türkçe' : 'English'}
            </span>
            {safeLang === code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
