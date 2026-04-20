export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { retrieveHandbookContext } from '@/lib/handbook-rag';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const {
      simId,
      templateId,
      userMessage,
      turnNumber,
      languageMode,
      isLastTurn,
      previousMessages,
    } = body ?? {};

    if (!simId || !userMessage) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Get template
    const template = await prisma.simulationTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 });
    }

    const isBilingual = languageMode === 'bilingual';

    // Retrieve glossary from DB for bilingual mode
    let glossaryContext = '';
    if (isBilingual) {
      try {
        const glossaryTerms = await prisma.glossaryTerm.findMany({
          select: { termDe: true, termTr: true },
          take: 20,
        });
        glossaryContext = `\nGLOSSAR (Deutsch - Türkisch):\n${glossaryTerms.map(t => `- ${t.termDe} = ${t.termTr}`).join('\n')}`;
      } catch (e) {
        // Fallback: continue without glossary
      }
    }

    // RAG: Retrieve relevant handbook context based on the user message
    let handbookContext = '';
    try {
      handbookContext = await retrieveHandbookContext(userMessage, template.domain ?? 'medicine', 3);
    } catch (e) {
      // Fallback: continue without handbook context
    }

    // Build system prompt
    let systemPrompt = template.systemPrompt ?? '';
    if (handbookContext) {
      systemPrompt += `\n${handbookContext}`;
    }
    systemPrompt += `\n\nSPRACHMODUS: ${isBilingual ? 'BILINGUAL' : 'GERMAN_ONLY'}\n`;
    if (isBilingual) {
      systemPrompt += `
- Führe das Gespräch auf Deutsch.
- Wenn der Kandidat etwas nicht versteht, erkläre es zusätzlich auf Türkisch in eckigen Klammern [TR: ...].
- Gib Hinweise zweisprachig: Erst Deutsch, dann [TR: türkische Übersetzung].
${glossaryContext}`;
    } else {
      systemPrompt += `\n- Führe das Gespräch ausschließlich auf Deutsch.\n- Antworte niemals auf Türkisch.\n`;
    }

    if (isLastTurn) {
      systemPrompt += `\n\nWICHTIG: Dies ist die LETZTE Interaktion. Beende das Gespräch natürlich als Patient und bedanke dich beim Kandidaten. Sage etwas wie "Danke, dass Sie sich so gut um mich gekümmert haben."\n`;
    }

    // Build messages array
    const llmMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add previous conversation
    for (const msg of (previousMessages ?? [])) {
      llmMessages.push({
        role: msg?.role === 'user' ? 'user' : 'assistant',
        content: msg?.content ?? '',
      });
    }
    llmMessages.push({ role: 'user', content: userMessage });

    // Call LLM with streaming
    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: llmMessages,
        stream: true,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!llmResponse?.ok) {
      const errText = await llmResponse?.text?.();
      console.error('LLM API error:', errText);
      return new Response(JSON.stringify({ error: 'LLM API error' }), { status: 500 });
    }

    // Stream response back to client and collect full response
    let fullContent = '';
    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmResponse.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let partialRead = '';
        try {
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line?.startsWith?.('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed?.choices?.[0]?.delta?.content ?? '';
                  if (delta) fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (e: any) {
                  // skip
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          // Save interaction to database
          try {
            await prisma.simulationInteraction.create({
              data: {
                simulationId: simId,
                turnNumber: turnNumber ?? 1,
                userInput: userMessage,
                aiResponse: fullContent,
              },
            });
          } catch (dbErr: any) {
            console.error('DB save error:', dbErr);
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Stream route error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
