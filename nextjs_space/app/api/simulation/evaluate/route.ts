export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { retrieveEvaluationContext } from '@/lib/handbook-rag';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { simId, templateId, languageMode, messages, documentation } = body ?? {};

    if (!simId) {
      return NextResponse.json({ error: 'simId required' }, { status: 400 });
    }

    const template = await prisma.simulationTemplate.findUnique({
      where: { id: templateId },
    });

    const sim = await prisma.userSimulation.findUnique({
      where: { id: simId },
    });

    const isBilingual = languageMode === 'bilingual';
    const simType = template?.type || 'oral_exam';
    const checklist = (template?.checklist as any[]) || [];
    const hasChecklist = checklist.length > 0;
    const hasDocumentation = !!(documentation || sim?.documentation);
    const docText = documentation || sim?.documentation || '';
    const requiresDoc = simType === 'patient_conversation' || simType === 'written_task' || simType === 'documentation' || simType === 'comprehension';

    // RAG context
    let handbookContext = '';
    try {
      const topicFromTemplate = template?.titleDe ?? template?.descriptionDe ?? '';
      handbookContext = await retrieveEvaluationContext(topicFromTemplate, template?.domain ?? 'nursing');
    } catch (e) { /* continue */ }

    // Build conversation text
    const conversationText = (messages ?? []).map((m: any) => {
      const role = m?.role === 'user' ? 'Kandidat' : (simType === 'patient_conversation' ? 'Patient' : 'Prüfer');
      return `${role}: ${m?.content ?? ''}`;
    }).join('\n');

    // Build checklist section for prompt
    let checklistPromptSection = '';
    if (hasChecklist) {
      checklistPromptSection = `\nCHECKLISTE - Bewerte JEDEN Punkt einzeln:\n${checklist.map((item: any, i: number) => 
        `${i + 1}. [ID: ${item.id}] ${item.textDe} (Kategorie: ${item.category}, Gewichtung: ${item.weight === 3 ? 'KRITISCH' : item.weight === 2 ? 'Wichtig' : 'Normal'})`
      ).join('\n')}\n`;
    }

    // Type-specific evaluation instructions for FSP (Fachsprachenprüfung)
    const typeInstructions: Record<string, string> = {
      patient_conversation: `WICHTIG FÜR ARZT-PATIENT-GESPRÄCH (FSP Teil 3):
- Medizinische Fachsprache gegenüber dem Patienten ist ein FEHLER und muss negativ bewertet werden.
- Bewerte: Laienverständliche Sprache, aktives Zuhören, Empathie, systematische Anamneseerhebung.
- Prüfe, ob der Kandidat auf Patientenfragen SOFORT eingegangen ist (nicht ans Ende geschoben).
- Prüfe, ob Allergien, Vorerkrankungen, Medikation, Sozialanamnese erfragt wurden.`,
      vocab_test: `WICHTIG FÜR VERSTÄNDNISTEST (FSP Teil 1):
- Bewerte Übersetzungen, NICHT Erklärungen.
- Fachsprache → Patientensprache: Einfache deutsche Wörter erwartet.
- Deutsch → Latein/Griechisch: Korrekte Fachterminologie erwartet.
- Nur EINE Übersetzung pro Begriff (mehrere = Punktverlust).`,
      free_conversation: `WICHTIG FÜR FREIES GESPRÄCH (FSP Teil 2):
- Bewerte Sprachverständnis und Ausdrucksfähigkeit.
- Bewerte Flüssigkeit, Grammatik, Wortschatz, Kohärenz.
- Medizinisches Wissen wird NICHT bewertet.`,
      documentation: `WICHTIG FÜR DOKUMENTATION (FSP Teil 4):
- Aktuelle Anamnese auf Seite 1 in GANZEN SÄTZEN (Pflicht).
- Ab Seite 2: Stichpunkte erlaubt.
- Patientenangaben NICHT in Fachsprache übersetzen (Anamnese ≠ Arztbrief).
- Verdachtsdiagnose MUSS in Fachsprache sein.
- Bewerte: Vollständigkeit, Struktur, korrekte Zuordnung.`,
      comprehension: `WICHTIG FÜR TEXTVERSTÄNDNIS (FSP Teil 5):
- Antworten müssen KURZ und PRÄZISE sein.
- Überflüssig lange Antworten = Punktverlust.
- Bewerte korrektes Verständnis der Fragen.
- Bewerte korrekte Wiedergabe der Telefoninformationen.`,
      doctor_conversation: `WICHTIG FÜR ARZT-ARZT-GESPRÄCH (FSP Teil 6):
- Medizinische Fachsprache ist GEFORDERT.
- Medizinische Fehler werden NICHT bewertet – nur Sprachkompetenz.
- Bewerte: Strukturierte Fallvorstellung, korrekte Fachtermini, Flüssigkeit.
- Bewerte, ob der Kandidat fachsprachlich verständlich kommuniziert.`,
    };

    // Documentation section
    let docPromptSection = '';
    if (requiresDoc && hasDocumentation) {
      docPromptSection = `\n\nVOM KANDIDATEN ERSTELLTE DOKUMENTATION:\n---\n${docText}\n---\nBewerte die Dokumentation auf: Vollständigkeit, korrekte Fachsprache, Struktur, ob alle relevanten Beobachtungen und Maßnahmen enthalten sind.`;
    } else if (requiresDoc && !hasDocumentation) {
      docPromptSection = `\n\nHINWEIS: Der Kandidat hat KEINE Dokumentation erstellt. Dies ist ein erheblicher Mangel und muss in der Bewertung berücksichtigt werden.`;
    }

    const evaluationPrompt = `Du bist ein erfahrener Prüfer für die Fachsprachenprüfung (FSP) für ausländische Ärzte in Deutschland.

Simulationstyp: ${simType === 'patient_conversation' ? 'Patientengespräch' : simType === 'oral_exam' ? 'Mündliche Prüfung' : 'Schriftliche Aufgabe'}
Aufgabenstellung: ${template?.descriptionDe || ''}

${typeInstructions[simType] || ''}
${handbookContext}
${checklistPromptSection}

GESPRÄCH:
${conversationText}
${docPromptSection}

Gib deine Bewertung im folgenden JSON-Format zurück:
{
  "checklistResults": [
    ${hasChecklist ? checklist.map((item: any) => `{"id": "${item.id}", "fulfilled": true/false, "score": 0-10, "commentDe": "Kurzer Kommentar", "commentTr": "${isBilingual ? 'Kısa yorum' : ''}"}`).join(',\n    ') : '[]'}
  ],
  "scores": {
    ${simType === 'patient_conversation'
      ? '"verstaendlichkeit": <1-10>,\n    "informationserhebung": <1-10>,\n    "empathie": <1-10>,\n    "beobachtung": <1-10>'
      : '"fachsprache": <1-10>,\n    "struktur": <1-10>,\n    "fachwissen": <1-10>'}
  },
  ${requiresDoc ? `"docScore": ${hasDocumentation ? '<1-10>' : '0'},
  "docFeedbackDe": "${hasDocumentation ? 'Feedback zur Dokumentation' : 'Keine Dokumentation erstellt. Dies ist ein erheblicher Mangel.'}",
  "docFeedbackTr": "${isBilingual ? (hasDocumentation ? 'Dokümantasyon hakkında geri bildirim' : 'Dokümantasyon oluşturulmadı. Bu önemli bir eksikliktir.') : ''}",` : ''}
  "feedback_de": "Ausführliches Feedback auf Deutsch (5-8 Sätze). Gehe auf die Checklisten-Ergebnisse ein.",
  "feedback_tr": "${isBilingual ? 'Aynı geri bildirimin Türkçe çevirisi, 5-8 cümle' : ''}"
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: 'Du bist ein Prüfungsbewerter. Antworte ausschließlich mit validem JSON.' },
          { role: 'user', content: evaluationPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!llmResponse?.ok) {
      const errText = await llmResponse?.text?.();
      console.error('Evaluation LLM error:', errText);
      return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData?.choices?.[0]?.message?.content ?? '{}';

    let evalResult: any;
    try {
      evalResult = JSON.parse(rawContent);
    } catch (e: any) {
      console.error('Failed to parse evaluation JSON:', rawContent);
      evalResult = {
        checklistResults: [],
        scores: { fachsprache: 5, struktur: 5, empathie: 5 },
        feedback_de: 'Bewertung konnte nicht korrekt generiert werden.',
        feedback_tr: isBilingual ? 'Değerlendirme doğru bir şekilde oluşturulamadı.' : '',
      };
    }

    // Save evaluation
    const evaluation = await prisma.evaluation.upsert({
      where: { simulationId: simId },
      update: {
        feedbackDe: evalResult?.feedback_de ?? '',
        feedbackTr: evalResult?.feedback_tr ?? '',
        scores: evalResult?.scores ?? {},
        checklistResults: evalResult?.checklistResults ?? [],
        docFeedbackDe: evalResult?.docFeedbackDe ?? null,
        docFeedbackTr: evalResult?.docFeedbackTr ?? null,
        docScore: evalResult?.docScore != null ? Number(evalResult.docScore) : null,
      },
      create: {
        simulationId: simId,
        feedbackDe: evalResult?.feedback_de ?? '',
        feedbackTr: evalResult?.feedback_tr ?? '',
        scores: evalResult?.scores ?? {},
        checklistResults: evalResult?.checklistResults ?? [],
        docFeedbackDe: evalResult?.docFeedbackDe ?? null,
        docFeedbackTr: evalResult?.docFeedbackTr ?? null,
        docScore: evalResult?.docScore != null ? Number(evalResult.docScore) : null,
      },
    });

    // Mark simulation as completed
    await prisma.userSimulation.update({
      where: { id: simId },
      data: { status: 'completed', completedAt: new Date() },
    });

    // Save progress entry
    try {
      const scores = evalResult?.scores ?? {};
      const scoreValues = Object.values(scores).filter((v: any) => typeof v === 'number') as number[];
      const avgScore = scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
        : null;

      // Extract new vocabulary from conversation
      const vocabTerms: string[] = [];
      if (evalResult?.checklistResults) {
        for (const item of evalResult.checklistResults) {
          if (item?.commentDe && item.commentDe.length > 3) {
            // Extract medical terms mentioned in comments
            const termMatch = item.commentDe.match(/[A-ZÄÖÜ][a-zäöüß]+(?:[-][a-zäöüß]+)*/g);
            if (termMatch) vocabTerms.push(...termMatch.slice(0, 3));
          }
        }
      }

      await prisma.fspProgress.create({
        data: {
          userId: user.id,
          topic: template?.titleDe ?? simType,
          proficiencyLevel: avgScore,
          feedbackSummary: (evalResult?.feedback_de ?? '').substring(0, 500),
          newVocabulary: [...new Set(vocabTerms)].slice(0, 20),
          rawTranscript: conversationText.substring(0, 5000),
          simulationId: simId,
          simulationType: simType,
        },
      });
    } catch (progressErr: any) {
      console.error('Failed to save progress (non-critical):', progressErr?.message);
    }

    return NextResponse.json({ id: evaluation?.id, evaluationId: evaluation?.id });
  } catch (error: any) {
    console.error('Evaluation route error:', error);
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}
