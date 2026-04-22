'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Play, BookOpen, Languages, AlertTriangle, ClipboardList, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChecklistItem {
  id: string;
  textDe: string;
  textTr: string;
  weight: number;
  category?: string;
}

interface Template {
  id: string;
  titleDe: string;
  titleTr: string;
  descriptionDe: string;
  descriptionTr: string;
  difficulty: string;
  maxTurns: number;
  checklist?: ChecklistItem[] | any;
}

type SupportLang = 'none' | 'tr' | 'en';

export function BriefingClient({ templateId }: { templateId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [supportLang, setSupportLang] = useState<SupportLang>('tr');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
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

          {Array.isArray(template?.checklist) && template.checklist.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="font-medium">{t('simulation.checklistPreviewTitle')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {template.checklist.length} {t('simulation.checklistItems')}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChecklist(v => !v)}
                    className="gap-1.5 shrink-0"
                  >
                    {showChecklist ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">
                      {showChecklist ? t('simulation.hideChecklist') : t('simulation.showChecklist')}
                    </span>
                  </Button>
                </div>
                <AnimatePresence initial={false}>
                  {showChecklist && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-3 italic">
                          {t('simulation.checklistHint')}
                        </p>
                        <ul className="space-y-2">
                          {(template.checklist as ChecklistItem[]).map((item) => (
                            <li key={item.id} className="flex items-start gap-2 text-sm">
                              <span className={`inline-block mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                                item.weight >= 3 ? 'bg-red-500' : item.weight >= 2 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                              <span className="flex-1 leading-relaxed">
                                {lang === 'tr' ? (item.textTr || item.textDe) : item.textDe}
                                {item.weight >= 3 && (
                                  <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                                    {t('simulation.critical')}
                                  </Badge>
                                )}
                                {item.weight === 2 && (
                                  <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                                    {t('simulation.important')}
                                  </Badge>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            {t('simulation.critical')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                            {t('simulation.important')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            {t('simulation.normal')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}

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
