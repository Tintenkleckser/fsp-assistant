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
    const simType = template?.type || 'patient_conversation';
    const rawChecklist = template?.checklist;
    const checklist: any[] = Array.isArray(rawChecklist) ? rawChecklist : [];
    const hasChecklist = checklist.length > 0;
    const hasDocumentation = !!(documentation || sim?.documentation);
    const docText = documentation || sim?.documentation || '';
    const requiresDoc = simType === 'documentation';

    // RAG context
    let handbookContext = '';
    try {
      const topicFromTemplate = template?.titleDe ?? template?.descriptionDe ?? '';
      handbookContext = await retrieveEvaluationContext(topicFromTemplate, template?.domain ?? 'medicine');
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

    // Type-specific evaluation instructions for FSP (Fachsprachenprüfung) – 3 Teile
    const typeInstructions: Record<string, string> = {
      patient_conversation: `WICHTIG FÜR TEIL 1: ARZT-PATIENTEN-GESPRÄCH (ANAMNESE):
- Medizinische Fachsprache gegenüber dem Patienten ist ein FEHLER und muss negativ bewertet werden.
- Bewerte: Laienverständliche Sprache, aktives Zuhören, Empathie, systematische Anamneseerhebung.
- Prüfe, ob der Kandidat auf Patientenfragen SOFORT eingegangen ist (nicht ans Ende geschoben).
- Prüfe, ob Allergien, Vorerkrankungen, Medikation, Sozialanamnese erfragt wurden.
- Es geht um SPRACHKOMPETENZ, nicht um medizinisches Wissen.`,
      documentation: `WICHTIG FÜR TEIL 2: DOKUMENTATION:
- Aufgabe A (Kurzdokumentation): Halbsätze/Stichworte, schnell, alle wichtigen Infos.
- Aufgabe B (Aufnahmebericht): Ganze Sätze, ausführlich, strukturiert.
- Patientenangaben NICHT in Fachsprache übersetzen.
- Verdachtsdiagnose MUSS in Fachsprache sein.
- Bewerte den Unterschied zwischen Kurzdoku und Aufnahmebericht.
- Bewerte: Vollständigkeit, Struktur, korrekte Zuordnung.`,
      doctor_conversation: `WICHTIG FÜR TEIL 3: ARZT-ARZT-GESPRÄCH (ÜBERGABE):
- Medizinische Fachsprache ist GEFORDERT.
- Medizinische Fehler werden NICHT bewertet – nur Sprachkompetenz.
- Bewerte: Strukturierte Fallvorstellung, korrekte Fachtermini, Flüssigkeit.
- Bewerte, ob der Kandidat fachsprachlich verständlich kommuniziert.
- Prüfe die Struktur: Patient, Anamnese, Befund, Verdachtsdiagnose, Procedere.`,
    };

    // Documentation section
    let docPromptSection = '';
    if (requiresDoc && hasDocumentation) {
      docPromptSection = `\n\nVOM KANDIDATEN ERSTELLTE DOKUMENTATION:\n---\n${docText}\n---\nBewerte die Dokumentation auf: Vollständigkeit, korrekte Fachsprache, Struktur, ob alle relevanten Beobachtungen und Maßnahmen enthalten sind.`;
    } else if (requiresDoc && !hasDocumentation) {
      docPromptSection = `\n\nHINWEIS: Der Kandidat hat KEINE Dokumentation erstellt. Dies ist ein erheblicher Mangel und muss in der Bewertung berücksichtigt werden.`;
    }

    const evaluationPrompt = `Du bist ein erfahrener Prüfer für die Fachsprachenprüfung (FSP) für ausländische Ärzte in Deutschland.

Simulationstyp: ${simType === 'patient_conversation' ? 'Teil 1: Arzt-Patienten-Gespräch (Anamnese)' : simType === 'documentation' ? 'Teil 2: Dokumentation' : 'Teil 3: Arzt-Arzt-Gespräch (Übergabe)'}
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

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
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
      const cleanContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      evalResult = JSON.parse(cleanContent);
      console.log('Evaluation parsed successfully. Keys:', Object.keys(evalResult));
      console.log('Scores:', JSON.stringify(evalResult?.scores));
      console.log('checklistResults count:', Array.isArray(evalResult?.checklistResults) ? evalResult.checklistResults.length : 'not an array');
    } catch (e: any) {
      console.error('Failed to parse evaluation JSON:', rawContent);
      evalResult = {
        checklistResults: [],
        scores: { fachsprache: 5, struktur: 5, empathie: 5 },
        feedback_de: 'Bewertung konnte nicht korrekt generiert werden.',
        feedback_tr: isBilingual ? 'Değerlendirme doğru bir şekilde oluşturulamadı.' : '',
      };
    }

    // Normalize checklistResults: flatten nested arrays and ensure correct structure
    let rawResults = evalResult.checklistResults;
    if (!Array.isArray(rawResults)) rawResults = [];
    // Flatten nested arrays like [[{...}]] → [{...}]
    while (rawResults.length > 0 && Array.isArray(rawResults[0])) {
      rawResults = rawResults.flat();
    }
    // Map to expected structure if Mistral returned a different format
    evalResult.checklistResults = rawResults.map((r: any, idx: number) => {
      // If it already has the expected structure
      if (r.id && (r.fulfilled !== undefined || r.score !== undefined)) {
        return {
          id: String(r.id),
          fulfilled: r.fulfilled ?? (Number(r.score) >= 5),
          score: Number(r.score) || 0,
          commentDe: r.commentDe || r.comment_de || r.comment || '',
          commentTr: r.commentTr || r.comment_tr || '',
        };
      }
      // Alternative format from Mistral: { task, correct, expectedAnswer, candidateAnswer }
      const matchingChecklistItem = checklist[idx];
      const isFulfilled = r.correct === true || r.fulfilled === true || r.passed === true;
      return {
        id: matchingChecklistItem?.id || String(idx + 1),
        fulfilled: isFulfilled,
        score: r.score != null ? Number(r.score) : (isFulfilled ? 8 : 3),
        commentDe: r.commentDe || r.comment_de || r.comment || r.feedback ||
          (r.task ? `${r.task}: ${r.candidateAnswer || r.candidate_answer || ''}` : '') ||
          (isFulfilled ? 'Korrekt' : 'Nicht erfüllt'),
        commentTr: r.commentTr || r.comment_tr || '',
      };
    });
    console.log('Normalized checklistResults count:', evalResult.checklistResults.length);

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

      await prisma.fspProgress.create({
        data: {
          userId: user.id,
          topic: template?.titleDe ?? simType,
          proficiencyLevel: avgScore,
          feedbackSummary: (evalResult?.feedback_de ?? '').substring(0, 500),
          newVocabulary: [],
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
