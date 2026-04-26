export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json([], { status: 401 });

    const progress = await prisma.fspProgress.findMany({
      where: { userId: user.id },
      orderBy: { sessionDate: 'desc' },
      take: 50,
    });
    return NextResponse.json(progress ?? []);
  } catch (error: any) {
    console.error('Progress fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { topic, proficiencyLevel, feedbackSummary, newVocabulary, rawTranscript, simulationId, simulationType } = body ?? {};

    const entry = await prisma.fspProgress.create({
      data: {
        userId: user.id,
        topic: topic ?? null,
        proficiencyLevel: proficiencyLevel != null ? Number(proficiencyLevel) : null,
        feedbackSummary: feedbackSummary ?? null,
        newVocabulary: newVocabulary ?? [],
        rawTranscript: rawTranscript ?? null,
        simulationId: simulationId ?? null,
        simulationType: simulationType ?? null,
      },
    });
    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Progress create error:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
