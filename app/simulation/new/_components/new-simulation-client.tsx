'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope, Users, ArrowLeft, Sparkles, Loader2, CheckCircle2,
  ChevronRight, ClipboardList, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIFFICULTY_LEVELS, SIMULATION_TYPES, pickLang } from '@/lib/topic-categories';

const typeIconMap: Record<string, any> = {
  Users,
  ClipboardList,
  Stethoscope,
};

export function NewSimulationClient() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n?.language ?? 'de';

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const difficulty = DIFFICULTY_LEVELS.find(d => d.id === selectedDifficulty);
  const simType = SIMULATION_TYPES.find(s => s.id === selectedType);

  const handleGenerate = async () => {
    if (!selectedDifficulty || !selectedType) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/simulation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: selectedDifficulty,
          simulationType: selectedType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Fehler bei der Generierung');
        return;
      }
      router.push(`/simulation/${data.id}/briefing`);
    } catch (e: any) {
      setError(e?.message || 'Netzwerkfehler');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[900px] px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            {t('simulation.backToDashboard')}
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {t('simulation.newSimTitle')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('simulation.newSimSubtitle')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 my-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm hidden sm:inline ${step >= s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s === 1 ? t('simulation.stepExamPart') : t('simulation.stepDifficulty')}
              </span>
              {s < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Prüfungsteil Selection */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-4">
                {t('simulation.whichPart')}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {SIMULATION_TYPES.map((st) => {
                  const Icon = typeIconMap[st.icon] || Users;
                  const isSelected = selectedType === st.id;
                  return (
                    <Card
                      key={st.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:ring-1 hover:ring-primary/30'
                      }`}
                      onClick={() => {
                        setSelectedType(st.id);
                        setTimeout(() => setStep(2), 300);
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                          }`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base">
                              {pickLang(lang, st.labelDe, st.labelTr, st.labelEn)}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {pickLang(lang, st.descriptionDe, st.descriptionTr, st.descriptionEn)}
                            </p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {st.timeLimitMin} Min.
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Difficulty + Generate */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {t('simulation.chooseDifficulty')}
                </h2>
              </div>

              {simType && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    {t('simulation.chosenPart')}
                  </span>
                  <span className="text-sm font-medium">{pickLang(lang, simType.labelDe, simType.labelTr, simType.labelEn)}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {DIFFICULTY_LEVELS.map((diff) => {
                  const isSelected = selectedDifficulty === diff.id;
                  const descriptions: Record<string, { de: string; tr: string; en: string }> = {
                    beginner: {
                      de: 'Kooperativer Patient, klare Symptome. Ideal für den Einstieg in die FSP-Vorbereitung.',
                      tr: 'Kolay hasta, net semptomlar. FSP hazırlığına başlamak için ideal.',
                      en: 'Cooperative patient with clear symptoms. Ideal for starting your FSP preparation.',
                    },
                    intermediate: {
                      de: 'Realistisches Szenario wie in der echten Prüfung. Patient stellt Rückfragen.',
                      tr: 'Gerçek sınava benzer senaryo. Hasta geri sorular sorar.',
                      en: 'Realistic scenario like in the real exam. The patient asks follow-up questions.',
                    },
                    advanced: {
                      de: 'Schwieriger Patient, Emotionen, Zeitdruck. Für die finale Prüfungsvorbereitung.',
                      tr: 'Zor hasta, duygusal durumlar, zaman baskısı. Son sınav hazırlığı için.',
                      en: 'Difficult patient, emotions, time pressure. For the final exam preparation.',
                    },
                  };
                  return (
                    <Card
                      key={diff.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:ring-1 hover:ring-primary/30'
                      }`}
                      onClick={() => setSelectedDifficulty(diff.id)}
                    >
                      <CardContent className="p-5">
                        <Badge variant={diff.badgeVariant} className="text-sm mb-3">
                          {pickLang(lang, diff.labelDe, diff.labelTr, diff.labelEn)}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {pickLang(lang, descriptions[diff.id]?.de, descriptions[diff.id]?.tr, descriptions[diff.id]?.en)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                size="lg"
                className="w-full gap-2"
                disabled={!selectedDifficulty || generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('simulation.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {t('simulation.generateExercise')}
                  </>
                )}
              </Button>

              {generating && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {t('simulation.generatingHint')}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
