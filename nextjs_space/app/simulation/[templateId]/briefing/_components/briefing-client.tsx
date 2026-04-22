'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Play, BookOpen, Languages, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Template {
  id: string;
  titleDe: string;
  titleTr: string;
  descriptionDe: string;
  descriptionTr: string;
  difficulty: string;
  maxTurns: number;
}

type SupportLang = 'none' | 'tr' | 'en';

export function BriefingClient({ templateId }: { templateId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [supportLang, setSupportLang] = useState<SupportLang>('tr');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const lang = i18n?.language ?? 'de';

  // Default support language based on UI language
  useEffect(() => {
    if (lang === 'en') setSupportLang('en');
    else if (lang === 'tr') setSupportLang('tr');
    else setSupportLang('tr');
    // Only set on initial mount or lang change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch('/api/templates');
        const data = await res?.json?.();
        const found = (data ?? []).find((t: Template) => t?.id === templateId);
        setTemplate(found ?? null);
      } catch (e: any) {
        console.error('Fetch template error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [templateId]);

  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      // Map support language to legacy languageMode for backward compatibility
      let languageMode = 'german_only';
      if (supportLang === 'tr') languageMode = 'bilingual';
      else if (supportLang === 'en') languageMode = 'bilingual_en';

      const res = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          languageMode,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('API error:', res.status, errData);
        if (res.status === 401) {
          setError(t('simulation.sessionExpired'));
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        setError(errData?.error || t('simulation.anErrorOccurred'));
        return;
      }
      const sim = await res.json();
      if (sim?.id) {
        router.push(`/simulation/${templateId}/chat?simId=${sim.id}`);
      } else {
        setError(t('simulation.exerciseNotCreated'));
      }
    } catch (e: any) {
      console.error('Start simulation error:', e);
      setError(t('simulation.connectionError'));
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t('simulation.exerciseNotCreated')}</p>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>{t('common.back')}</Button>
        </div>
      </div>
    );
  }

  const supportOptions: Array<{ code: SupportLang; labelKey: string }> = [
    { code: 'none', labelKey: 'simulation.supportLangNone' },
    { code: 'tr', labelKey: 'simulation.supportLangTurkish' },
    { code: 'en', labelKey: 'simulation.supportLangEnglish' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[800px] px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" className="mb-4" onClick={() => router.push('/dashboard')}>
            ← {t('common.back')}
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight">{t('simulation.briefing')}</h1>
          </div>
          <p className="text-muted-foreground mb-6">{t('simulation.briefingSubtitle')}</p>

          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="font-display font-semibold text-lg mb-3">
                {lang === 'tr' ? (template?.titleTr ?? template?.titleDe ?? '') : (template?.titleDe ?? '')}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                {lang === 'tr'
                  ? (template?.descriptionTr ?? template?.descriptionDe ?? '')
                  : (template?.descriptionDe ?? '')}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">{template?.difficulty ?? 'intermediate'}</Badge>
                <Badge variant="outline">Max. {template?.maxTurns ?? 8} {t('simulation.turnsRemaining')}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Languages className="h-5 w-5 text-primary" />
                <div>
                  <Label className="font-medium">{t('simulation.supportLanguageLabel')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {supportLang === 'none'
                      ? t('simulation.germanOnly')
                      : supportLang === 'tr'
                      ? t('simulation.bilingual')
                      : t('simulation.bilingualEn')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {supportOptions.map((opt) => (
                  <Button
                    key={opt.code}
                    type="button"
                    variant={supportLang === opt.code ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => setSupportLang(opt.code)}
                  >
                    {t(opt.labelKey)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertTriangle className="inline h-4 w-4 mr-2" />
              {error}
            </div>
          )}
          <Button onClick={handleStart} loading={starting} className="w-full gap-2" size="lg">
            <Play className="h-5 w-5" />
            {t('simulation.startExam')}
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
