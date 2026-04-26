export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { retrieveHandbookContext } from '@/lib/handbook-rag';
import { DIFFICULTY_LEVELS, SIMULATION_TYPES } from '@/lib/topic-categories';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { difficulty, simulationType } = body ?? {};

    if (!difficulty || !simulationType) {
      return NextResponse.json({ error: 'Fehlende Felder: difficulty, simulationType' }, { status: 400 });
    }

    const diffLevel = DIFFICULTY_LEVELS.find(d => d.id === difficulty);
    if (!diffLevel) {
      return NextResponse.json({ error: 'Unbekannter Schwierigkeitsgrad' }, { status: 400 });
    }

    const simType = SIMULATION_TYPES.find(s => s.id === simulationType);
    if (!simType) {
      return NextResponse.json({ error: 'Unbekannter Prüfungsteil' }, { status: 400 });
    }

    // Retrieve generic medical context for emergency/admission scenarios
    let handbookContext = '';
    try {
      const keywords = 'Notaufnahme Aufnahme Anamnese Patient Krankenhaus';
      handbookContext = await retrieveHandbookContext(keywords, 'medicine', 3);
    } catch (e) { /* continue without */ }

    const typeLabels: Record<string, string> = {
      patient_conversation: 'Teil 1: Arzt-Patienten-Gespräch (Anamnese) \u2013 Verstehen und Sprechen in laienverständlicher Sprache',
      documentation: 'Teil 2: Dokumentation \u2013 Schnelle Kurzdokumentation (Halbsätze) UND ausführlicher Aufnahmebericht (ganze Sätze)',
      doctor_conversation: 'Teil 3: Arzt-Arzt-Gespräch (Übergabe) \u2013 Fallvorstellung in medizinischer Fachsprache',
    };

    const difficultyInstructions: Record<string, string> = {
      beginner: 'EINSTEIGER: Kooperativer Patient, klare Symptome, einfache Situation. Notaufnahme oder station\u00e4re Aufnahme.',
      intermediate: 'MITTEL: Realistisches Szenario wie in der Prüfung. Patient hat Rückfragen und Sorgen.',
      advanced: 'FORTGESCHRITTEN: Schwieriger Patient, emotional, mehrere Beschwerden, Zeitdruck.',
    };

    const maxTurns = difficulty === 'beginner' ? 8 : difficulty === 'intermediate' ? 10 : 12;

    const checklistGuidance: Record<string, string> = {
      patient_conversation: `CHECKLISTE FÜR ARZT-PATIENTEN-GESPRÄCH (ANAMNESE):
- Fachsprache beim Patienten ist ein FEHLER
- Prüfe: Laienverständliche Sprache, systematische Anamnese
- Prüfe: Sofortiges Eingehen auf Patientenfragen
- Prüfe: Allergien, Vorerkrankungen, Medikation, Sozialanamnese erfragt
- Baue Ängste/Sorgen beim Patienten ein
- Der Schwerpunkt liegt auf SPRACHKOMPETENZ, nicht medizinischem Wissen`,
      documentation: `CHECKLISTE FÜR DOKUMENTATION:
- Aufgabe A: Schnelle Kurzdokumentation in Halbsätzen/Stichworten
- Aufgabe B: Ausführlicher Aufnahmebericht in ganzen Sätzen
- Verdachtsdiagnose in FACHSPRACHE
- Patientenangaben NICHT in Fachsprache übersetzen
- Untersuchungsanforderungen vollständig
- Prüfe den Unterschied zwischen Kurzdoku und Aufnahmebericht`,
      doctor_conversation: `CHECKLISTE FÜR ARZT-ARZT-GESPRÄCH (ÜBERGABE):
- Fachsprache ist GEFORDERT
- Strukturierte Fallvorstellung: Patient, Anamnese, Befund, Verdachtsdiagnose, Procedere
- Med. Fehler werden NICHT bewertet, nur Sprachkompetenz
- Flüssigkeit und korrekter Einsatz von Fachtermini
- Der Prüfer (Oberärztin/Oberarzt) stellt Rückfragen`,
    };

    const scenarioGuidance = `SZENARIO-ANFORDERUNGEN:
- Das Szenario spielt in einer Notaufnahme oder bei einer stationären Aufnahme
- Typische Patientensituation (Bauchschmerzen, Brustschmerzen, Atemnot, Sturz, Rückenschmerzen, etc.)
- Der Patient ist ein LAIE und spricht einfache Sprache
- Es geht um SPRACHKOMPETENZ, NICHT um medizinisches Fachwissen
- Erfinde einen konkreten Patienten mit Name, Alter, Beruf, Vorerkrankungen, Allergien
- Der Patient muss Sorgen und Ängste haben, die er im Gespräch äußert`;

    const generatePrompt = `Du bist ein Experte für die Fachsprachenprüfung (FSP) für ausländische Ärzte in Deutschland.

WICHTIG: Die FSP prüft SPRACHKOMPETENZ im klinischen Alltag, NICHT medizinisches Fachwissen.

Erstelle ein realistisches FSP-Prüfungsszenario für:
Prüfungsteil: ${typeLabels[simulationType] || simulationType}
Schwierigkeitsgrad: ${difficultyInstructions[difficulty] || difficulty}

${scenarioGuidance}

${checklistGuidance[simulationType] || ''}

${handbookContext ? `\nKONTEXT AUS LEHRBUCH:\n${handbookContext}\n` : ''}

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "titleDe": "Kurzer Titel auf Deutsch (z.B. 'Anamnese: Brustschmerzen in der Notaufnahme')",
  "titleTr": "Gleicher Titel auf Türkisch",
  "descriptionDe": "Aufgabenstellung (3-5 Sätze) mit konkretem Patientenfall. Auf Deutsch.",
  "descriptionTr": "Gleiche Aufgabenstellung auf Türkisch",
  "systemPrompt": "Detaillierte Rollenanweisung für die KI. Bei Teil 1: Du spielst den PATIENTEN (Laie!). Bei Teil 2: Du bist der Prüfer und gibst die Dokumentationsaufgabe. Bei Teil 3: Du spielst die Oberärztin/den Oberarzt. Mindestens 250 Wörter mit konkreten Patientendaten.",
  "evaluationCriteria": ["Kriterium1", "Kriterium2"],
  "checklist": [
    {"id": "1", "textDe": "Prüfpunkt auf Deutsch", "textTr": "Türkische Übersetzung", "category": "Kategorie", "weight": 1-3}
  ]
}

CHECKLIST-REGELN:
- 8-12 spezifische Items
- weight: 1=normal, 2=wichtig, 3=kritisch
- Items müssen SPRACHKOMPETENZ prüfen, nicht medizinisches Wissen`;

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
        max_tokens: 2500,
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
        titleDe: parsed.titleDe || `FSP ${simType.shortDe} - ${diffLevel.labelDe}`,
        titleTr: parsed.titleTr || `FSP ${simType.shortTr} - ${diffLevel.labelTr}`,
        descriptionDe: parsed.descriptionDe || simType.descriptionDe,
        descriptionTr: parsed.descriptionTr || simType.descriptionTr,
        systemPrompt: parsed.systemPrompt || '',
        evaluationCriteria: parsed.evaluationCriteria || ['Sprachkompetenz', 'Kommunikation'],
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
