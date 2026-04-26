export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { simId, force } = body ?? {};
    if (!simId) {
      return NextResponse.json({ error: 'simId required' }, { status: 400 });
    }

    // Load simulation with evaluation, template, interactions
    const sim = await prisma.userSimulation.findFirst({
      where: { id: simId, userId: user.id },
      include: {
        template: true,
        evaluation: true,
        interactions: { orderBy: { turnNumber: 'asc' } },
      },
    });

    if (!sim) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }
    if (!sim.evaluation) {
      return NextResponse.json({ error: 'No evaluation yet. Please complete the simulation first.' }, { status: 400 });
    }

    // Skip LLM call if coaching feedback already exists (use cached version) - unless force=true
    if (!force && sim.evaluation.coachingFeedbackDe && sim.evaluation.coachingFeedbackDe.trim().length > 0) {
      return NextResponse.json({
        coachingFeedbackDe: sim.evaluation.coachingFeedbackDe,
        coachingFeedbackTr: sim.evaluation.coachingFeedbackTr ?? '',
        cached: true,
      });
    }

    const isBilingual = sim.languageMode === 'bilingual';
    const isBilingualEn = sim.languageMode === 'bilingual_en';
    const simType = sim.template?.type ?? 'patient_conversation';
    const checklist: any[] = Array.isArray(sim.template?.checklist) ? (sim.template.checklist as any[]) : [];
    const checklistResults: any[] = Array.isArray(sim.evaluation.checklistResults) ? (sim.evaluation.checklistResults as any[]) : [];

    // Build conversation transcript
    const transcript = sim.interactions.map((i) => {
      const role = simType === 'patient_conversation' ? 'Patient' : 'Prüfer';
      return `Kandidat: ${i.userInput}\n${role}: ${i.aiResponse}`;
    }).join('\n\n');

    // Build per-item summary for LLM
    const itemSummaries = checklist.map((item: any, idx: number) => {
      const result = checklistResults.find((r: any) => String(r?.id) === String(item?.id)) ?? checklistResults[idx];
      const score = result?.score != null ? Number(result.score) : (result?.fulfilled ? 8 : 3);
      const weightLabel = item?.weight >= 3 ? 'KRITISCH' : item?.weight === 2 ? 'WICHTIG' : 'normal';
      return `${idx + 1}. "${item?.textDe ?? ''}" (Gewichtung: ${weightLabel}) – Punktzahl: ${score}/10`;
    }).join('\n');

    const docSection = sim.documentation
      ? `\n\nERSTELLTE DOKUMENTATION:\n---\n${sim.documentation.substring(0, 1500)}\n---`
      : '';

    const langInstruction = isBilingual
      ? 'Antworte mit detailliertem Coaching-Feedback auf Deutsch UND Türkisch.'
      : isBilingualEn
      ? 'Antworte mit detailliertem Coaching-Feedback auf Deutsch UND Englisch (im tr-Feld).'
      : 'Antworte mit detailliertem Coaching-Feedback ausschließlich auf Deutsch.';

    const prompt = `Du bist ein erfahrener FSP-Coach (Fachsprachenprüfung für ausländische Ärzte).
Der Kandidat hat eine Übung absolviert. Du gibst persönliches, konstruktives Coaching-Feedback.

AUFGABE:
${sim.template?.titleDe ?? ''}
${sim.template?.descriptionDe ?? ''}

CHECKLISTEN-ERGEBNIS:
${itemSummaries}

GESPRÄCHSVERLAUF:
${transcript.substring(0, 4000)}
${docSection}

Deine Aufgabe: Schreibe ein **detailliertes, persönliches Coaching-Feedback** mit folgenden Abschnitten:

1. **Stärken** (2-3 Sätze): Was hat der Kandidat besonders gut gemacht? Konkrete Beispiele aus dem Gespräch.
2. **Verbesserungspotenzial** (3-5 Sätze): Wo sind die größten Lücken? Konkrete Beispiele und alternative Formulierungen.
3. **Konkrete Tipps** (3-5 Bulletpoints): Was sollte der Kandidat beim nächsten Mal anders machen? Mit Beispielsätzen, die er auswendig lernen kann.
4. **Lern-Empfehlung**: Welche Punkte aus der Checkliste sollten als nächstes priorisiert werden?

WICHTIG:
- Nutze konkrete Zitate und Formulierungen aus dem Gespräch.
- Sei ehrlich und direkt, aber wertschätzend.
- Gib alternative Beispielsätze, die der Kandidat lernen kann.
- Fokus auf SPRACHKOMPETENZ, nicht auf medizinisches Fachwissen.

${langInstruction}

Gib deine Antwort als JSON zurück:
{
  "coachingFeedbackDe": "Vollständiges Feedback auf Deutsch mit Markdown-Formatierung (## Überschriften, **fett**, - Bullets)",
  "coachingFeedbackTr": "${isBilingual ? 'Komplettes Türkisches Feedback mit Markdown' : isBilingualEn ? 'Complete English feedback with Markdown formatting' : ''}"
}

Respond with raw JSON only. Do not include code blocks or markdown wrappers.`;

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'Du bist ein erfahrener FSP-Coach. Antworte ausschließlich mit validem JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 3500,
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    });

    if (!llmResponse?.ok) {
      const errText = await llmResponse?.text?.();
      console.error('Coaching feedback LLM error:', errText);
      return NextResponse.json({ error: 'Coaching feedback generation failed' }, { status: 500 });
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData?.choices?.[0]?.message?.content ?? '{}';

    let parsed: any;
    try {
      const cleanContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (e: any) {
      console.error('Failed to parse coaching feedback JSON:', rawContent.substring(0, 500));
      return NextResponse.json({ error: 'Failed to parse coaching feedback' }, { status: 500 });
    }

    const coachingFeedbackDe = String(parsed?.coachingFeedbackDe ?? parsed?.coaching_feedback_de ?? '').trim();
    const coachingFeedbackTr = String(parsed?.coachingFeedbackTr ?? parsed?.coaching_feedback_tr ?? '').trim();

    if (!coachingFeedbackDe) {
      return NextResponse.json({ error: 'Empty coaching feedback' }, { status: 500 });
    }

    // Save to DB
    await prisma.evaluation.update({
      where: { id: sim.evaluation.id },
      data: {
        coachingFeedbackDe,
        coachingFeedbackTr: coachingFeedbackTr || null,
      },
    });

    return NextResponse.json({
      coachingFeedbackDe,
      coachingFeedbackTr,
      cached: false,
    });
  } catch (error: any) {
    console.error('Coaching feedback route error:', error);
    return NextResponse.json({ error: 'Coaching feedback failed' }, { status: 500 });
  }
}
