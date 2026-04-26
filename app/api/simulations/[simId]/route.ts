export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ simId: string }> }
) {
  try {
    const { simId } = await params;
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const simulation = await prisma.userSimulation.findFirst({
      where: { id: simId ?? '', userId: user.id },
      include: {
        template: true,
        interactions: { orderBy: { turnNumber: 'asc' } },
        evaluation: true,
      },
    });
    if (!simulation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(simulation);
  } catch (error: any) {
    console.error('Fetch simulation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
