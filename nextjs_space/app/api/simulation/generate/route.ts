export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { retrieveHandbookContext } from '@/lib/handbook-rag';
import { TOPIC_CATEGORIES, DIFFICULTY_LEVELS, SIMULATION_TYPES } from '@/lib/topic-categories';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, difficulty, simulationType } = body ?? {};

    if (!topicId || !difficulty || !simulationType) {
      return NextResponse.json({ error: 'Fehlende Felder: topicId, difficulty, simulationType' }, { status: 400 });
    }

    const topic = TOPIC_CATEGORIES.find(t => t.id === topicId);
    if (!topic) {
      return NextResponse.json({ error: 'Unbekanntes Thema' }, { status: 400 });
    }

    const diffLevel = DIFFICULTY_LEVELS.find(d => d.id === difficulty);
    if (!diffLevel) {
      return NextResponse.json({ error: 'Unbekannter Schwierigkeitsgrad' }, { status: 400 });
    }

    const simType = SIMULATION_TYPES.find(s => s.id === simulationType);

    // Retrieve context for this topic
    let handbookContext = '';
    try {
      handbookContext = await retrieveHandbookContext(topic.keywords.join(' '), 'medicine', 3);
    } catch (e) { /* continue without */ }

    const typeLabels: Record<string, string> = {
      vocab_test: 'Verständnistest (Teil 1): Fachsprache \u2194 Patientensprache, Lat./Griech. \u2194 Deutsch',
      free_conversation: 'Freies Gespräch (Teil 2): Allgemeines ärztliches Gespräch',
      patient_conversation: 'Arzt-Patient-Gespräch (Teil 3): Anamneseerhebung in laienverständlicher Sprache',
      documentation: 'Dokumentation (Teil 4): Anamnesebogen ausfüllen, Verdachtsdiagnose, Untersuchungsanforderungen',
      comprehension: 'Textverständnis (Teil 5): Arztbrief/Befunde lesen, Telefonanrufe verstehen',
      doctor_conversation: 'Arzt-Arzt-Gespräch (Teil 6): Fallvorstellung in medizinischer Fachsprache',
    };

    const difficultyInstructions: Record<string, string> = {
      beginner: 'EINSTEIGER: Klare Aufgabenstellung, kooperativer Patient, Grundlagenwissen.',
      intermediate: 'MITTEL: Komplexere Situation, mehrere Differentialdiagnosen möglich.',
      advanced: 'FORTGESCHRITTEN: Anspruchsvoller Fall mit Komplikationen und Komorbiditäten.',
    };

    const maxTurns = difficulty === 'beginner' ? 8 : difficulty === 'intermediate' ? 10 : 12;

    const checklistGuidance: Record<string, string> = {
      vocab_test: `CHECKLISTE FÜR VERSTÄNDNISTEST:\n- Prüfe korrekte Übersetzungen Fachsprache \u2194 Patientensprache\n- Prüfe korrekte Lat./Griech. Terminologie\n- NUR Übersetzungen, keine Erklärungen\n- Eine Übersetzung pro Begriff`,
      free_conversation: `CHECKLISTE FÜR FREIES GESPRÄCH:\n- Sprachverständnis, Ausdrucksfähigkeit, Flüssigkeit\n- Grammatik, Wortschatz, Kohärenz\n- Medizinisches Wissen wird NICHT bewertet`,
      patient_conversation: `CHECKLISTE FÜR ARZT-PATIENT-GESPRÄCH:\n- Fachsprache beim Patienten ist ein FEHLER\n- Prüfe: Laienverständliche Sprache, systematische Anamnese\n- Prüfe: Sofortiges Eingehen auf Patientenfragen\n- Prüfe: Allergien, Vorerkrankungen, Medikation, Sozialanamnese erfragt\n- Baue Ängste/Sorgen beim Patienten ein`,
      documentation: `CHECKLISTE FÜR DOKUMENTATION:\n- Aktuelle Anamnese in ganzen Sätzen (Seite 1)\n- Ab Seite 2: Stichpunkte erlaubt\n- Verdachtsdiagnose in FACHSPRACHE\n- Patientenangaben NICHT in Fachsprache übersetzen\n- Untersuchungsanforderungen vollständig`,
      comprehension: `CHECKLISTE FÜR TEXTVERSTÄNDNIS:\n- Korrekte, kurze Antworten auf Fragen zum Arztbrief\n- Korrekte Zusammenfassung von Telefoninformationen\n- Keine überflüssigen Informationen`,
      doctor_conversation: `CHECKLISTE FÜR ARZT-ARZT-GESPRÄCH:\n- Fachsprache ist GEFORDERT\n- Strukturierte Fallvorstellung\n- Med. Fehler werden NICHT bewertet, nur Sprachkompetenz\n- Flüssigkeit und korrekter Einsatz von Fachtermini`,
    };

    const requiresDocumentation = simulationType === 'patient_conversation' || simulationType === 'documentation' || simulationType === 'comprehension';

    const generatePrompt = `Du bist ein Experte für die Fachsprachenprüfung (FSP) für ausländische Ärzte in Deutschland.

Erstelle ein realistisches FSP-Prüfungsszenario zum medizinischen Thema "${topic.titleDe}" (${topic.descriptionDe}).

Prüfungsteil: ${typeLabels[simulationType] || simulationType}
Schwierigkeitsgrad: ${difficultyInstructions[difficulty] || difficulty}
${handbookContext ? `\n${handbookContext}\n` : ''}

${checklistGuidance[simulationType] || ''}

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "titleDe": "Kurzer Titel auf Deutsch",
  "titleTr": "Gleicher Titel auf Türkisch",
  "descriptionDe": "Ausführliche Aufgabenstellung (3-5 Sätze) auf Deutsch.",
  "descriptionTr": "Gleiche Aufgabenstellung auf Türkisch",
  "systemPrompt": "Detaillierte Rollenanweisung. Bei Patientengesprächen: Name, Alter, Beschwerden, Persönlichkeit. Bei Arzt-Arzt: Falldaten, erwartete Fachsprache. Mindestens 200 Wörter.",
  "evaluationCriteria": ["Kriterium1", "Kriterium2"],
  "checklist": [
    {"id": "1", "textDe": "Aufgabe auf Deutsch", "textTr": "Türkische Übersetzung", "category": "Kategorie", "weight": 1-3}
  ]
}

CHECKLIST-REGELN:
- 8-15 spezifische Items
- weight: 1=normal, 2=wichtig, 3=kritisch
- Items müssen spezifisch zum FSP-Teil und Szenario passen
${requiresDocumentation ? '- Füge Items der Kategorie "Dokumentation" hinzu' : ''}

WICHTIG:
- Realistisches medizinisches Szenario
- Korrekte Fachterminologie im systemPrompt
- An Schwierigkeitsgrad anpassen`;

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: generatePrompt }],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => 'Unknown error');
      console.error('LLM API error:', llmResponse.status, errText);
      return NextResponse.json({ error: 'LLM-API-Fehler. Bitte versuchen Sie es erneut.' }, { status: 502 });
    }

    const llmData = await llmResponse.json();
    const content = llmData?.choices?.[0]?.message?.content ?? '';

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse LLM response:', content);
      return NextResponse.json({ error: 'Szenario konnte nicht generiert werden. Bitte versuchen Sie es erneut.' }, { status: 500 });
    }

    const template = await prisma.simulationTemplate.create({
      data: {
        domain: 'medicine',
        type: simulationType,
        difficulty,
        titleDe: parsed.titleDe || `${topic.titleDe} - ${diffLevel.labelDe}`,
        titleTr: parsed.titleTr || `${topic.titleTr} - ${diffLevel.labelTr}`,
        descriptionDe: parsed.descriptionDe || topic.descriptionDe,
        descriptionTr: parsed.descriptionTr || topic.descriptionTr,
        systemPrompt: parsed.systemPrompt || '',
        evaluationCriteria: parsed.evaluationCriteria || ['Fachsprache', 'Kommunikation', 'Medizinisches Fachwissen'],
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
        maxTurns,
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Generate simulation error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Simulation-Generierung: ' + (error?.message || 'Unbekannt') },
      { status: 500 }
    );
  }
}
