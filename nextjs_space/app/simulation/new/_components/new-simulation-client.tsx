'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope, MessageSquare, ShieldCheck, Activity, Heart, HeartPulse,
  AlertTriangle, ClipboardList, Thermometer, PenTool, Users, ArrowLeft,
  Sparkles, Loader2, CheckCircle2, Syringe, ChevronRight, BookOpen,
  MessageCircle, FileText, Brain, Scissors, Scan, Baby, Bone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOPIC_CATEGORIES, DIFFICULTY_LEVELS, SIMULATION_TYPES, type TopicCategory } from '@/lib/topic-categories';

const iconMap: Record<string, any> = {
  Stethoscope, MessageSquare, ShieldCheck, Activity, Heart, HeartPulse,
  AlertTriangle, ClipboardList, Thermometer, PenTool, Users, Syringe,
  Brain, Scissors, Scan, Baby, Bone,
  Bandage: ShieldCheck, // fallback
};

const typeIconMap: Record<string, any> = {
  MessageSquare, Users, PenTool, ClipboardList, BookOpen,
  MessageCircle, FileText, Stethoscope,
};

export function NewSimulationClient() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n?.language ?? 'de';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topic = TOPIC_CATEGORIES.find(t => t.id === selectedTopic);
  const difficulty = DIFFICULTY_LEVELS.find(d => d.id === selectedDifficulty);
  const simType = SIMULATION_TYPES.find(s => s.id === selectedType);

  const handleGenerate = async () => {
    if (!selectedTopic || !selectedDifficulty || !selectedType) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/simulation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: selectedTopic,
          difficulty: selectedDifficulty,
          simulationType: selectedType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Fehler bei der Generierung');
        return;
      }
      // Redirect to briefing page of the newly created template
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
            {lang === 'tr' ? 'Kontrol Paneline D\u00f6n' : 'Zur\u00fcck zum Dashboard'}
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {lang === 'tr' ? 'Yeni Sim\u00fclasyon Olu\u015ftur' : 'Neue Simulation erstellen'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lang === 'tr'
                  ? 'Konu, zorluk seviyesi ve t\u00fcr se\u00e7in \u2013 yapay zeka sizin i\u00e7in bir senaryo olu\u015ftursun'
                  : 'W\u00e4hlen Sie Thema, Schwierigkeitsgrad und Typ \u2013 die KI erstellt Ihr Szenario'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 my-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm hidden sm:inline ${step >= s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s === 1 ? (lang === 'tr' ? 'Konu' : 'Thema') : s === 2 ? (lang === 'tr' ? 'Zorluk' : 'Schwierigkeit') : (lang === 'tr' ? 'T\u00fcr' : 'Typ')}
              </span>
              {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Topic Selection */}
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
                {lang === 'tr' ? 'Hangi konuyu \u00e7al\u0131\u015fmak istiyorsunuz?' : 'Welches Thema m\u00f6chten Sie \u00fcben?'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TOPIC_CATEGORIES.map((cat) => {
                  const Icon = iconMap[cat.icon] || Stethoscope;
                  const isSelected = selectedTopic === cat.id;
                  return (
                    <Card
                      key={cat.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:ring-1 hover:ring-primary/30'
                      }`}
                      onClick={() => {
                        setSelectedTopic(cat.id);
                        setTimeout(() => setStep(2), 300);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm leading-tight">
                              {lang === 'tr' ? cat.titleTr : cat.titleDe}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {lang === 'tr' ? cat.descriptionTr : cat.descriptionDe}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Difficulty Selection */}
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
                  {lang === 'tr' ? 'Zorluk seviyesini se\u00e7in' : 'Schwierigkeitsgrad w\u00e4hlen'}
                </h2>
              </div>

              {topic && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    {lang === 'tr' ? 'Se\u00e7ilen konu: ' : 'Gew\u00e4hltes Thema: '}
                  </span>
                  <span className="text-sm font-medium">{lang === 'tr' ? topic.titleTr : topic.titleDe}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DIFFICULTY_LEVELS.map((diff) => {
                  const isSelected = selectedDifficulty === diff.id;
                  const descriptions: Record<string, { de: string; tr: string }> = {
                    beginner: {
                      de: 'Einfache Situationen mit kooperativen Patienten. Ideal f\u00fcr den Einstieg und zum Aufbau von Grundlagenwissen.',
                      tr: 'Kolay durumlar, i\u015fbirlik\u00e7i hastalar. Ba\u015flang\u0131\u00e7 ve temel bilgi olu\u015fturma i\u00e7in ideal.',
                    },
                    intermediate: {
                      de: 'Moderate Komplexit\u00e4t mit mehreren Aspekten. Fachwissen und gute Kommunikation werden erwartet.',
                      tr: 'Orta karma\u015f\u0131kl\u0131kta, birden fazla y\u00f6n i\u00e7eren durumlar. Uzmanl\u0131k bilgisi ve iyi ileti\u015fim beklenir.',
                    },
                    advanced: {
                      de: 'Komplexe Szenarien mit Komplikationen und schwierigen Gespr\u00e4chssituationen. Tiefes Fachwissen erforderlich.',
                      tr: 'Komplikasyonlar ve zor g\u00f6r\u00fc\u015fme durumlar\u0131 i\u00e7eren karma\u015f\u0131k senaryolar. Derin uzmanl\u0131k bilgisi gerektirir.',
                    },
                    extreme: {
                      de: 'Hochkomplexe Notfallsituationen, ethische Dilemmata, Zeitdruck. Nur f\u00fcr sehr erfahrene Kandidaten!',
                      tr: 'Y\u00fcksek karma\u015f\u0131kl\u0131kta acil durumlar, etik ikilemler, zaman bask\u0131s\u0131. Sadece \u00e7ok deneyimli adaylar i\u00e7in!',
                    },
                  };
                  return (
                    <Card
                      key={diff.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:ring-1 hover:ring-primary/30'
                      }`}
                      onClick={() => {
                        setSelectedDifficulty(diff.id);
                        setTimeout(() => setStep(3), 300);
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant={diff.badgeVariant} className="text-sm">
                            {lang === 'tr' ? diff.labelTr : diff.labelDe}
                          </Badge>
                          {diff.id === 'extreme' && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {lang === 'tr' ? descriptions[diff.id]?.tr : descriptions[diff.id]?.de}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Type Selection + Generate */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {lang === 'tr' ? 'Sim\u00fclasyon t\u00fcr\u00fcn\u00fc se\u00e7in' : 'Simulationstyp w\u00e4hlen'}
                </h2>
              </div>

              {/* Summary */}
              <div className="mb-4 p-3 rounded-lg bg-muted/50 flex flex-wrap gap-3">
                {topic && (
                  <div>
                    <span className="text-xs text-muted-foreground">{lang === 'tr' ? 'Konu' : 'Thema'}: </span>
                    <span className="text-sm font-medium">{lang === 'tr' ? topic.titleTr : topic.titleDe}</span>
                  </div>
                )}
                {difficulty && (
                  <div>
                    <span className="text-xs text-muted-foreground"> | {lang === 'tr' ? 'Zorluk' : 'Schwierigkeit'}: </span>
                    <Badge variant={difficulty.badgeVariant} className="text-xs">
                      {lang === 'tr' ? difficulty.labelTr : difficulty.labelDe}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {SIMULATION_TYPES.map((st) => {
                  const Icon = typeIconMap[st.icon] || MessageSquare;
                  const isSelected = selectedType === st.id;
                  return (
                    <Card
                      key={st.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:ring-1 hover:ring-primary/30'
                      }`}
                      onClick={() => setSelectedType(st.id)}
                    >
                      <CardContent className="p-5 text-center">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-medium text-sm">
                          {lang === 'tr' ? st.labelTr : st.labelDe}
                        </h3>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                size="lg"
                className="w-full gap-2"
                disabled={!selectedType || generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {lang === 'tr' ? 'Senaryo olu\u015fturuluyor...' : 'Szenario wird generiert...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {lang === 'tr' ? 'Sim\u00fclasyonu Olu\u015ftur' : 'Simulation generieren'}
                  </>
                )}
              </Button>

              {generating && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {lang === 'tr'
                    ? 'Yapay zeka, ders kitab\u0131na dayal\u0131 bir senaryo olu\u015fturuyor. Bu birka\u00e7 saniye s\u00fcrebilir...'
                    : 'Die KI erstellt ein Szenario basierend auf dem Lehrbuch. Dies kann einige Sekunden dauern...'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
