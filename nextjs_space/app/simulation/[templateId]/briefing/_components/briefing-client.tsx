'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export function BriefingClient({ templateId }: { templateId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [bilingual, setBilingual] = useState(true);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const lang = i18n?.language ?? 'de';

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
      const res = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          languageMode: bilingual ? 'bilingual' : 'german_only',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('API error:', res.status, errData);
        if (res.status === 401) {
          setError(lang === 'tr' ? 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.' : 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        setError(errData?.error || (lang === 'tr' ? 'Bir hata oluştu.' : 'Ein Fehler ist aufgetreten.'));
        return;
      }
      const sim = await res.json();
      if (sim?.id) {
        router.push(`/simulation/${templateId}/chat?simId=${sim.id}`);
      } else {
        setError(lang === 'tr' ? 'Alıştırma oluşturulamadı.' : 'Übung konnte nicht erstellt werden.');
      }
    } catch (e: any) {
      console.error('Start simulation error:', e);
      setError(lang === 'tr' ? 'Bağlantı hatası.' : 'Verbindungsfehler.');
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
          <p className="text-muted-foreground">Szenario nicht gefunden</p>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>{t('common.back')}</Button>
        </div>
      </div>
    );
  }

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
              <Tabs defaultValue="de">
                <TabsList className="mb-4">
                  <TabsTrigger value="de">Deutsch</TabsTrigger>
                  <TabsTrigger value="tr">Türkçe</TabsTrigger>
                </TabsList>
                <TabsContent value="de">
                  <h2 className="font-display font-semibold text-lg mb-3">{template?.titleDe ?? ''}</h2>
                  <p className="text-sm leading-relaxed text-foreground/80">{template?.descriptionDe ?? ''}</p>
                </TabsContent>
                <TabsContent value="tr">
                  <h2 className="font-display font-semibold text-lg mb-3">{template?.titleTr ?? ''}</h2>
                  <p className="text-sm leading-relaxed text-foreground/80">{template?.descriptionTr ?? ''}</p>
                </TabsContent>
              </Tabs>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">{template?.difficulty ?? 'intermediate'}</Badge>
                <Badge variant="outline">Max. {template?.maxTurns ?? 8} Interaktionen</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Languages className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="font-medium">{t('simulation.languageMode')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {bilingual ? t('simulation.bilingual') : t('simulation.germanOnly')}
                    </p>
                  </div>
                </div>
                <Switch checked={bilingual} onCheckedChange={setBilingual} />
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
