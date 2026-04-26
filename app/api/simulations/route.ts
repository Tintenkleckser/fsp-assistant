export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json([], { status: 401 });
    const simulations = await prisma.userSimulation.findMany({
      where: { userId: user.id },
      include: {
        template: { select: { titleDe: true, titleTr: true } },
        evaluation: { select: { scores: true } },
        _count: { select: { interactions: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
    return NextResponse.json(simulations ?? []);
  } catch (error: any) {
    console.error('Simulations fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      console.error('POST /api/simulations: getAuthUser returned null - user not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { templateId, languageMode } = body ?? {};
    if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });
    const simulation = await prisma.userSimulation.create({
      data: {
        userId: user.id,
        templateId,
        languageMode: languageMode ?? 'bilingual',
        status: 'in_progress',
      },
    });
    return NextResponse.json(simulation);
  } catch (error: any) {
    console.error('Create simulation error:', error);
    return NextResponse.json({ error: 'Failed to create simulation' }, { status: 500 });
  }
}
