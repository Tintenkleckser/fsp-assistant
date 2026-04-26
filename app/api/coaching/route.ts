export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { userMessage, previousMessages, responseLanguage } = body ?? {};

    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    // Determine response language: default 'de'
    const respLang: 'de' | 'tr' | 'en' = responseLanguage === 'tr' ? 'tr' : responseLanguage === 'en' ? 'en' : 'de';

    // Load ALL user progress data for context
    const [progressEntries, completedSims] = await Promise.all([
      prisma.fspProgress.findMany({
        where: { userId: user.id },
        orderBy: { sessionDate: 'desc' },
        take: 20,
      }),
      prisma.userSimulation.findMany({
        where: { userId: user.id, status: 'completed' },
        include: {
          template: { select: { titleDe: true, type: true, difficulty: true } },
          evaluation: { select: { feedbackDe: true, scores: true, checklistResults: true, docScore: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 15,
      }),
    ]);

    // Build a detailed data summary for the AI
    const totalCompleted = completedSims.length;
    const byType: Record<string, { count: number; avgScore: number; scores: number[] }> = {};
    
    for (const sim of completedSims) {
      const type = sim.template?.type ?? 'unknown';
      if (!byType[type]) byType[type] = { count: 0, avgScore: 0, scores: [] };
      byType[type].count++;
      const scores = sim.evaluation?.scores as Record<string, number> | null;
      if (scores) {
        const vals = Object.values(scores).filter(v => typeof v === 'number');
        if (vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          byType[type].scores.push(avg);
        }
      }
    }
    for (const key of Object.keys(byType)) {
      const s = byType[key].scores;
      byType[key].avgScore = s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length * 10) / 10 : 0;
    }

    const typeNames: Record<string, string> = {
      patient_conversation: 'Teil 1: Arzt-Patienten-Gespr\u00e4ch (Anamnese)',
      documentation: 'Teil 2: Dokumentation',
      doctor_conversation: 'Teil 3: Arzt-Arzt-Gespr\u00e4ch (\u00dcbergabe)',
    };

    // Build feedback summaries from recent evaluations
    const recentFeedback = completedSims.slice(0, 5).map(sim => {
      const typeName = typeNames[sim.template?.type ?? ''] ?? sim.template?.type;
      const scores = sim.evaluation?.scores as Record<string, number> | null;
      const scoreStr = scores ? Object.entries(scores).map(([k, v]) => `${k}: ${v}/10`).join(', ') : 'keine';
      return `- ${sim.template?.titleDe} (${typeName}, ${sim.template?.difficulty}): Scores: ${scoreStr}. Feedback: ${(sim.evaluation?.feedbackDe ?? '').substring(0, 300)}`;
    }).join('\n');

    // Checklist weaknesses
    const weakPoints: string[] = [];
    for (const sim of completedSims.slice(0, 8)) {
      const results = sim.evaluation?.checklistResults as any[] | null;
      if (Array.isArray(results)) {
        for (const r of results) {
          if (r && r.fulfilled === false && r.commentDe) {
            weakPoints.push(`[${typeNames[sim.template?.type ?? ''] ?? ''}] ${r.commentDe}`);
          }
        }
      }
    }

    const progressSummary = progressEntries.slice(0, 10).map(p => {
      return `${p.sessionDate.toISOString().split('T')[0]}: ${p.topic ?? p.simulationType ?? '-'} \u2013 ${p.proficiencyLevel ?? '-'}/10`;
    }).join('\n');

    const dataSummary = `FORTSCHRITTSDATEN DES NUTZERS:

Gesamt abgeschlossene \u00dcbungen: ${totalCompleted}

Pro Pr\u00fcfungsteil:
${Object.entries(byType).map(([type, data]) => 
  `- ${typeNames[type] ?? type}: ${data.count} \u00dcbungen, \u00d8 ${data.avgScore}/10`
).join('\n')}
${Object.keys(byType).length === 0 ? '- Noch keine \u00dcbungen abgeschlossen.' : ''}

Nicht ge\u00fcbte Teile: ${['patient_conversation', 'documentation', 'doctor_conversation'].filter(t => !byType[t]).map(t => typeNames[t]).join(', ') || 'Keine \u2013 alle Teile ge\u00fcbt'}

Letzte Bewertungen:
${recentFeedback || 'Keine Bewertungen vorhanden.'}

Schwachstellen (nicht erf\u00fcllte Checklisten-Punkte):
${weakPoints.slice(0, 10).join('\n') || 'Keine spezifischen Schwachstellen erkannt.'}

Verlauf (letzte Sitzungen):
${progressSummary || 'Kein Verlauf vorhanden.'}`;

    // Language-specific rules
    const languageInstruction =
      respLang === 'tr'
        ? '- Cevapları her zaman Türkçe ver, ancak tıbbi terimleri Almancada bırak (örn. "Anamnese", "Dokumentation", "Übergabe").'
        : respLang === 'en'
          ? '- Always respond in English, but keep German medical/exam terms in German (e.g. "Anamnese", "Dokumentation", "Übergabe").'
          : '- Antworte immer auf Deutsch.';

    const systemPrompt = `Du bist ein erfahrener FSP-Coach f\u00fcr ausl\u00e4ndische \u00c4rzte in Deutschland. Deine Aufgabe ist es, dem Kandidaten ehrlich und ungeschminkt zu sagen, wo er steht.

Du hast Zugriff auf die kompletten Leistungsdaten des Nutzers (siehe unten). Nutze diese Daten aktiv in deinen Antworten.

DEINE REGELN:
- Sei DIREKT und EHRLICH \u2013 kein \"Alles super!\" wenn es nicht so ist
- Benenne konkrete Schw\u00e4chen und L\u00fccken
- Wenn Zeitvorgaben nicht eingehalten wurden, sage das klar
- Wenn ein Pr\u00fcfungsteil nie ge\u00fcbt wurde, weise darauf hin
- Gib konkrete, umsetzbare Vorschl\u00e4ge
- Sprich den Nutzer als Kandidat/in an
${languageInstruction}
- Halte dich kurz und pr\u00e4gnant (nicht mehr als 5-8 S\u00e4tze pro Antwort)
- Wenn der Nutzer keine \u00dcbungen gemacht hat, sage das direkt und motiviere zum Anfangen
- Beziehe dich auf die drei FSP-Teile: Anamnese, Dokumentation, \u00dcbergabe

${dataSummary}`;

    // Build messages
    const llmMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];
    for (const msg of (previousMessages ?? [])) {
      llmMessages.push({
        role: msg?.role === 'user' ? 'user' : 'assistant',
        content: msg?.content ?? '',
      });
    }
    llmMessages.push({ role: 'user', content: userMessage });

    // Call Mistral with streaming
    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: llmMessages,
        stream: true,
        max_tokens: 600,
        temperature: 0.5,
      }),
    });

    if (!llmResponse?.ok) {
      const errText = await llmResponse?.text?.();
      console.error('Coaching LLM error:', errText);
      return new Response(JSON.stringify({ error: 'LLM API error' }), { status: 500 });
    }

    // Stream response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmResponse.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
            for (const line of lines) {
              const data = line.replace('data: ', '').trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed?.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch (e) { /* skip unparseable */ }
            }
          }
        } catch (e) {
          console.error('Stream error:', e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Coaching route error:', error);
    return new Response(JSON.stringify({ error: 'Coaching failed' }), { status: 500 });
  }
}
