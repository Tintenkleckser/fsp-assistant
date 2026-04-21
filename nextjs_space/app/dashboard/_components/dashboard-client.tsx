'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Trophy, Clock, TrendingUp, TrendingDown, ChevronRight, BarChart3, Users, Stethoscope, Sparkles, Filter, X, ClipboardList, Target, BookOpen, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIFFICULTY_LEVELS, SIMULATION_TYPES } from '@/lib/topic-categories';

interface SimTemplate {
  id: string;
  titleDe: string;
  titleTr: string;
  descriptionDe: string;
  descriptionTr: string;
  difficulty: string;
  type: string;
  maxTurns: number;
}

interface SimHistory {
  id: string;
  templateId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  template: { titleDe: string; titleTr: string };
  evaluation: { scores: any } | null;
  _count: { interactions: number };
}

interface ProgressEntry {
  id: string;
  sessionDate: string;
  topic: string | null;
  proficiencyLevel: number | null;
  feedbackSummary: string | null;
  newVocabulary: string[];
  simulationType: string | null;
}

export function DashboardClient() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<SimTemplate[]>([]);
  const [history, setHistory] = useState<SimHistory[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const lang = i18n?.language ?? 'de';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, hRes, pRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/simulations'),
          fetch('/api/progress'),
        ]);
        const tData = await tRes?.json?.();
        const hData = await hRes?.json?.();
        const pData = await pRes?.json?.();
        setTemplates(tData ?? []);
        setHistory(hData ?? []);
        setProgress(pData ?? []);
      } catch (e: any) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completed = (history ?? [])?.filter?.((s: SimHistory) => s?.status === 'completed') ?? [];
  const avgScores = completed?.length > 0
    ? completed.reduce((acc: any, s: SimHistory) => {
        const scores = s?.evaluation?.scores ?? {};
        Object.keys(scores ?? {}).forEach((key: string) => {
          acc[key] = (acc[key] ?? 0) + (Number(scores[key]) || 0);
        });
        return acc;
      }, {} as Record<string, number>)
    : {};
  const avgTotal = Object.keys(avgScores ?? {})?.length > 0
    ? Object.values(avgScores ?? {}).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0) as number / Object.keys(avgScores ?? {}).length / (completed?.length || 1)
    : 0;

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">{t('dashboard.welcome')}</h1>
          <p className="text-muted-foreground mb-8">{t('dashboard.subtitle')}</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.completedCount')}</p>
                    <p className="text-2xl font-bold">{completed?.length ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.avgScore')}</p>
                    <p className="text-2xl font-bold">{avgTotal > 0 ? avgTotal?.toFixed?.(1) ?? '0' : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.inProgress')}</p>
                    <p className="text-2xl font-bold">{(history ?? [])?.filter?.((s: SimHistory) => s?.status === 'in_progress')?.length ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Progress Section */}
        {progress.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
            <h2 className="font-display text-xl font-bold tracking-tight mb-4">{t('dashboard.progressTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Average Proficiency */}
              {(() => {
                const withScores = progress.filter(p => p.proficiencyLevel != null);
                const avg = withScores.length > 0
                  ? (withScores.reduce((sum, p) => sum + (p.proficiencyLevel ?? 0), 0) / withScores.length)
                  : 0;
                return (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('dashboard.avgProficiency')}</p>
                          <p className="text-2xl font-bold">{avg > 0 ? `${avg.toFixed(1)}/10` : '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Trend */}
              {(() => {
                const withScores = progress.filter(p => p.proficiencyLevel != null);
                let trendType: 'improving' | 'stable' | 'declining' = 'stable';
                if (withScores.length >= 2) {
                  const recent = withScores.slice(0, Math.ceil(withScores.length / 2));
                  const older = withScores.slice(Math.ceil(withScores.length / 2));
                  const recentAvg = recent.reduce((s, p) => s + (p.proficiencyLevel ?? 0), 0) / recent.length;
                  const olderAvg = older.reduce((s, p) => s + (p.proficiencyLevel ?? 0), 0) / older.length;
                  if (recentAvg > olderAvg + 0.5) trendType = 'improving';
                  else if (recentAvg < olderAvg - 0.5) trendType = 'declining';
                }
                const TrendIcon = trendType === 'improving' ? ArrowUpRight : trendType === 'declining' ? ArrowDownRight : Minus;
                const trendColor = trendType === 'improving' ? 'text-green-600 bg-green-500/10' : trendType === 'declining' ? 'text-red-600 bg-red-500/10' : 'text-yellow-600 bg-yellow-500/10';
                return (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${trendColor}`}>
                          <TrendIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('dashboard.trend')}</p>
                          <p className="text-lg font-semibold">{t(`dashboard.${trendType}`)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Vocabulary Count */}
              {(() => {
                const allVocab = new Set(progress.flatMap(p => p.newVocabulary ?? []));
                return (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('dashboard.vocabularyLearned')}</p>
                          <p className="text-2xl font-bold">{allVocab.size}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* Progress Chart (simple bar visualization) */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-4">{t('dashboard.recentSessions')}</p>
                <div className="space-y-3">
                  {progress.slice(0, 8).map((entry) => {
                    const level = entry.proficiencyLevel ?? 0;
                    const pct = Math.min(level * 10, 100);
                    const barColor = level >= 7 ? 'bg-green-500' : level >= 5 ? 'bg-yellow-500' : 'bg-red-500';
                    return (
                      <div key={entry.id} className="flex items-center gap-3">
                        <div className="w-32 sm:w-48 text-xs text-muted-foreground truncate shrink-0">
                          {entry.topic ?? entry.simulationType ?? '-'}
                        </div>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                            {level > 0 ? `${level}/10` : '-'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">
                          {entry.sessionDate ? new Date(entry.sessionDate).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Available Scenarios */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-bold tracking-tight">{t('dashboard.availableScenarios')}</h2>
            <Button className="gap-2" onClick={() => router.push('/simulation/new')}>
              <Sparkles className="h-4 w-4" />
              {lang === 'tr' ? 'Yeni Simülasyon Oluştur' : 'Neue Simulation erstellen'}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1 mr-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{lang === 'tr' ? 'Filtre:' : 'Filter:'}</span>
            </div>
            {DIFFICULTY_LEVELS.map(d => (
              <Badge
                key={d.id}
                variant={filterDifficulty === d.id ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => setFilterDifficulty(filterDifficulty === d.id ? null : d.id)}
              >
                {lang === 'tr' ? d.labelTr : d.labelDe}
              </Badge>
            ))}
            <span className="text-muted-foreground">|</span>
            {SIMULATION_TYPES.map(st => ({ id: st.id, de: st.shortDe, tr: st.shortTr })).map(tp => (
              <Badge
                key={tp.id}
                variant={filterType === tp.id ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => setFilterType(filterType === tp.id ? null : tp.id)}
              >
                {lang === 'tr' ? tp.tr : tp.de}
              </Badge>
            ))}
            {(filterDifficulty || filterType) && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => { setFilterDifficulty(null); setFilterType(null); }}>
                <X className="h-3 w-3" />
                {lang === 'tr' ? 'Sıfırla' : 'Zurücksetzen'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {(templates ?? [])
              .filter((tmpl: SimTemplate) => {
                if (filterDifficulty && tmpl.difficulty !== filterDifficulty) return false;
                if (filterType && tmpl.type !== filterType) return false;
                return true;
              })
              .map((tmpl: SimTemplate, idx: number) => {
              const typeConfig: Record<string, { icon: any; label: string; labelTr: string; color: string }> = {
                patient_conversation: { icon: Users, label: 'Teil 1: Anamnese', labelTr: 'Bölüm 1: Öykü Alma', color: 'text-green-600 bg-green-500/10' },
                documentation: { icon: ClipboardList, label: 'Teil 2: Dokumentation', labelTr: 'Bölüm 2: Dokümantasyon', color: 'text-teal-600 bg-teal-500/10' },
                doctor_conversation: { icon: Stethoscope, label: 'Teil 3: Übergabe', labelTr: 'Bölüm 3: Devir Teslim', color: 'text-orange-600 bg-orange-500/10' },
              };
              const difficultyConfig: Record<string, { label: string; labelTr: string; variant: 'default' | 'secondary' | 'destructive' }> = {
                beginner: { label: 'Einsteiger', labelTr: 'Başlangıç', variant: 'secondary' },
                intermediate: { label: 'Mittel', labelTr: 'Orta', variant: 'default' },
                advanced: { label: 'Fortgeschritten', labelTr: 'İleri', variant: 'destructive' },
              };
              const tc = typeConfig[tmpl?.type] ?? typeConfig.patient_conversation;
              const dc = difficultyConfig[tmpl?.difficulty] ?? difficultyConfig.intermediate;
              const TypeIcon = tc.icon;

              return (
                <motion.div
                  key={tmpl?.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.08 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 group cursor-pointer h-full flex flex-col" onClick={() => router.push(`/simulation/${tmpl?.id}/briefing`)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tc.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <Badge variant={dc.variant} className="text-xs shrink-0">
                          {lang === 'tr' ? dc.labelTr : dc.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight mt-2 group-hover:text-primary transition-colors">
                        {lang === 'tr' ? tmpl?.titleTr : tmpl?.titleDe}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground font-medium">
                        {lang === 'tr' ? tc.labelTr : tc.label} • {tmpl?.maxTurns ?? 8} Turns
                      </span>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {lang === 'tr' ? tmpl?.descriptionTr : tmpl?.descriptionDe}
                      </p>
                      <Button className="gap-2 w-full group-hover:bg-primary/90" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/simulation/${tmpl?.id}/briefing`); }}>
                        <Play className="h-4 w-4" />
                        {t('common.startSimulation')}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {(templates ?? []).filter((tmpl: SimTemplate) => {
              if (filterDifficulty && tmpl.difficulty !== filterDifficulty) return false;
              if (filterType && tmpl.type !== filterType) return false;
              return true;
            }).length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="mb-3">{lang === 'tr' ? 'Bu filtreyle eşleşen senaryo yok.' : 'Keine Szenarien für diesen Filter gefunden.'}</p>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push('/simulation/new')}>
                    <Sparkles className="h-4 w-4" />
                    {lang === 'tr' ? 'Yeni oluştur' : 'Neu erstellen'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Past Simulations */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="font-display text-xl font-bold tracking-tight mb-4">{t('dashboard.pastSimulations')}</h2>
          {(history ?? [])?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{t('dashboard.noSimulations')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(history ?? []).map((sim: SimHistory) => (
                <Card key={sim?.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  if (sim?.status === 'completed') {
                    router.push(`/evaluation/${sim?.id}`);
                  } else {
                    router.push(`/simulation/${sim?.templateId}/chat?simId=${sim?.id}`);
                  }
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">
                            {lang === 'tr' ? sim?.template?.titleTr : sim?.template?.titleDe}
                          </h3>
                          <Badge variant={sim?.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {sim?.status === 'completed' ? t('dashboard.completed') : t('dashboard.inProgress')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sim?.startedAt ? new Date(sim.startedAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'de-DE') : ''}
                          {sim?.evaluation?.scores ? ` \u2022 Ø ${(Object.values(sim.evaluation.scores ?? {}).reduce((a: any, b: any) => (Number(a)||0) + (Number(b)||0), 0) as number / (Object.keys(sim.evaluation.scores ?? {})?.length || 1))?.toFixed?.(1)}/10` : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
