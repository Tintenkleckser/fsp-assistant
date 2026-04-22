'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, ArrowLeft, RotateCcw, MessageSquare, Award, TrendingUp, CheckCircle2, XCircle, ClipboardList, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChecklistResult {
  id: string;
  fulfilled: boolean;
  score: number;
  commentDe: string;
  commentTr: string;
}

interface EvalData {
  id: string;
  status: string;
  templateId?: string;
  template: { titleDe: string; titleTr: string; type: string; checklist: any[] };
  evaluation: {
    feedbackDe: string;
    feedbackTr: string;
    scores: Record<string, number>;
    checklistResults: ChecklistResult[];
    docFeedbackDe: string | null;
    docFeedbackTr: string | null;
    docScore: number | null;
  } | null;
  documentation: string | null;
  interactions: Array<{ userInput: string; aiResponse: string; turnNumber: number }>;
}

export function EvaluationClient({ simId }: { simId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n?.language ?? 'de';
  const [data, setData] = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/simulations/${simId}`);
        const d = await res?.json?.();
        setData(d ?? null);
      } catch (e: any) {
        console.error('Evaluation fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    if (simId) fetchData();
  }, [simId]);

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

  const scores = data?.evaluation?.scores ?? {};
  const scoreKeys = Object.keys(scores ?? {});
  // Flatten nested arrays and ensure correct structure
  let rawChecklistResults = data?.evaluation?.checklistResults ?? [];
  if (!Array.isArray(rawChecklistResults)) rawChecklistResults = [];
  while (rawChecklistResults.length > 0 && Array.isArray(rawChecklistResults[0])) {
    rawChecklistResults = rawChecklistResults.flat();
  }
  const checklistResults: ChecklistResult[] = rawChecklistResults.map((r: any, idx: number) => ({
    id: String(r?.id ?? idx + 1),
    fulfilled: r?.fulfilled ?? r?.correct ?? false,
    score: Number(r?.score) || 0,
    commentDe: r?.commentDe || r?.comment_de || r?.comment || r?.task || '',
    commentTr: r?.commentTr || r?.comment_tr || '',
  }));
  const rawChecklist = data?.template?.checklist;
  const checklist: any[] = Array.isArray(rawChecklist) ? rawChecklist : [];
  const hasChecklist = checklistResults.length > 0;
  const docScore = data?.evaluation?.docScore;
  const hasDoc = data?.documentation != null && data.documentation.length > 0;
  const simType = data?.template?.type || 'patient_conversation';

  // Calculate overall score - prefer scores object, use checklist as supplement
  let avgScore = 0;
  if (scoreKeys.length > 0) {
    const total = scoreKeys.reduce((sum: number, key: string) => sum + (Number(scores[key]) || 0), 0);
    avgScore = total / scoreKeys.length;
  } else if (hasChecklist) {
    // Fallback: calculate from checklist scores
    const totalWeight = checklistResults.reduce((sum: number, r: ChecklistResult) => {
      const matchingItem = checklist.find((c: any) => String(c.id) === String(r.id));
      return sum + (Number(matchingItem?.weight) || 1);
    }, 0);
    const weightedScore = checklistResults.reduce((sum: number, r: ChecklistResult) => {
      const matchingItem = checklist.find((c: any) => String(c.id) === String(r.id));
      const weight = Number(matchingItem?.weight) || 1;
      const score = Number(r.score) || 0;
      return sum + (score / 10) * weight;
    }, 0);
    avgScore = totalWeight > 0 ? (weightedScore / totalWeight) * 10 : 0;
  }

  // Include doc score in overall if applicable
  if (docScore != null) {
    avgScore = (avgScore * 0.7) + (docScore * 0.3);
  }

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number): string => {
    if (score >= 8) return 'bg-green-600';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const scoreLabels: Record<string, { de: string; tr: string }> = {
    fachsprache: { de: 'Fachsprache', tr: 'Tıbbi Terminoloji' },
    struktur: { de: 'Struktur', tr: 'Yapı' },
    empathie: { de: 'Empathie', tr: 'Empati' },
    fachwissen: { de: 'Fachwissen', tr: 'Uzmanlık Bilgisi' },
    verstaendlichkeit: { de: 'Verständlichkeit', tr: 'Anlaşılırlık' },
    informationserhebung: { de: 'Informationserhebung', tr: 'Bilgi Toplama' },
    beobachtung: { de: 'Beobachtung & Erkennung', tr: 'Gözlem & Tanıma' },
  };

  // Group checklist by category - handle both matched and unmatched results
  const checklistByCategory: Record<string, { item: any; result: ChecklistResult }[]> = {};
  if (hasChecklist) {
    const usedResultIds = new Set<string>();
    // First: match checklist items to results
    checklist.forEach((item: any) => {
      const result = checklistResults.find((r: ChecklistResult) => String(r.id) === String(item.id));
      if (!result) return;
      usedResultIds.add(result.id);
      const cat = item.category || 'Ergebnis';
      if (!checklistByCategory[cat]) checklistByCategory[cat] = [];
      checklistByCategory[cat].push({ item, result });
    });
    // Second: add any unmatched results (Mistral returned different IDs)
    checklistResults.forEach((result: ChecklistResult) => {
      if (usedResultIds.has(result.id)) return;
      const cat = 'Ergebnis';
      if (!checklistByCategory[cat]) checklistByCategory[cat] = [];
      checklistByCategory[cat].push({
        item: { id: result.id, textDe: result.commentDe, textTr: result.commentTr, weight: 1, category: cat },
        result,
      });
    });
  }

  const fulfilledCount = checklistResults.filter(r => r.fulfilled).length;
  const totalCount = checklistResults.length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[800px] px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" className="mb-4" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('evaluation.backToDashboard')}
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight">{t('evaluation.title')}</h1>
          </div>
          <p className="text-muted-foreground mb-6">
            {lang === 'tr' ? data?.template?.titleTr : data?.template?.titleDe}
          </p>

          {/* Overall Score */}
          <Card className="mb-6 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-6">
                <div className="h-20 w-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <span className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>
                    {avgScore?.toFixed?.(1) ?? '0'}
                  </span>
                </div>
                <div>
                  <p className="font-display font-semibold text-lg">{t('evaluation.overall')}</p>
                  <p className="text-sm text-muted-foreground">{t('evaluation.outOf')}</p>
                  {hasChecklist && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('evaluation.checklist')}: {fulfilledCount}/{totalCount} {t('evaluation.fulfilled')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Results */}
          {hasChecklist && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {t('evaluation.checklistResults')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(checklistByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-foreground/80 mb-3 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {items.map(({ item, result }) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            result.fulfilled
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {result.fulfilled
                              ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                              : <XCircle className="h-5 w-5 text-red-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {lang === 'tr' ? item.textTr : item.textDe}
                              </span>
                              {item.weight >= 3 && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  {t('simulation.critical')}
                                </Badge>
                              )}
                              {item.weight === 2 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {t('simulation.important')}
                                </Badge>
                              )}
                              <span className={`text-xs font-bold ml-auto ${getScoreColor(result.score)}`}>
                                {result.score}/10
                              </span>
                            </div>
                            {result.commentDe && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {lang === 'tr' ? (result.commentTr || result.commentDe) : result.commentDe}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Individual Scores */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                {t('evaluation.scores')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {scoreKeys.map((key: string) => {
                const score = Number(scores[key]) || 0;
                const label = scoreLabels[key] ?? { de: key, tr: key };
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{lang === 'tr' ? label.tr : label.de}</span>
                      <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}/10</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score * 10}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className={`h-full rounded-full ${getProgressColor(score)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Documentation Evaluation */}
          {(docScore != null || (simType === 'documentation' && data?.documentation)) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  {t('evaluation.docEvaluation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {docScore != null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {t('evaluation.docScore')}
                      </span>
                      <span className={`text-sm font-bold ${getScoreColor(docScore)}`}>{docScore}/10</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${docScore * 10}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full rounded-full ${getProgressColor(docScore)}`}
                      />
                    </div>
                  </div>
                )}
                {data?.evaluation?.docFeedbackDe && (
                  <div className="mt-3">
                    <Tabs defaultValue="de">
                      <TabsList className="mb-2">
                        <TabsTrigger value="de">Deutsch</TabsTrigger>
                        <TabsTrigger value="tr">Türkçe</TabsTrigger>
                      </TabsList>
                      <TabsContent value="de">
                        <p className="text-sm leading-relaxed">{data.evaluation.docFeedbackDe}</p>
                      </TabsContent>
                      <TabsContent value="tr">
                        <p className="text-sm leading-relaxed">{data.evaluation?.docFeedbackTr || 'Geri bildirim mevcut değil.'}</p>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
                {hasDoc && (
                  <details className="mt-2">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                      {t('evaluation.showSubmittedDoc')}
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <pre className="text-xs whitespace-pre-wrap">{data?.documentation}</pre>
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          {/* Feedback */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                {t('evaluation.feedback')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="de">
                <TabsList className="mb-4">
                  <TabsTrigger value="de">Deutsch</TabsTrigger>
                  <TabsTrigger value="tr">Türkçe</TabsTrigger>
                </TabsList>
                <TabsContent value="de">
                  <p className="text-sm leading-relaxed">{data?.evaluation?.feedbackDe ?? 'Kein Feedback verfügbar.'}</p>
                </TabsContent>
                <TabsContent value="tr">
                  <p className="text-sm leading-relaxed">{data?.evaluation?.feedbackTr ?? 'Geri bildirim mevcut değil.'}</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Conversation Review */}
          {(data?.interactions ?? [])?.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('evaluation.conversationHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {(data?.interactions ?? []).map((interaction: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <div className="bg-primary/5 rounded-lg p-3">
                        <p className="text-xs font-medium text-primary mb-1">{t('simulation.you')}</p>
                        <p className="text-sm">{interaction?.userInput ?? ''}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('simulation.examiner')}</p>
                        <p className="text-sm">{interaction?.aiResponse ?? ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              {t('evaluation.backToDashboard')}
            </Button>
            <Button className="flex-1 gap-2" onClick={() => {
              const tid = (data as any)?.templateId ?? (data as any)?.template_id;
              if (tid) router.push(`/simulation/${tid}/briefing`);
              else router.push('/dashboard');
            }}>
              <RotateCcw className="h-4 w-4" />
              {t('evaluation.newSimulation')}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
