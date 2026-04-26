export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ simId: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { simId } = await params;
    const body = await request.json();
    const { documentation } = body ?? {};

    const sim = await prisma.userSimulation.findFirst({
      where: { id: simId, userId: user.id },
    });

    if (!sim) {
      return NextResponse.json({ error: 'Simulation nicht gefunden' }, { status: 404 });
    }

    const updated = await prisma.userSimulation.update({
      where: { id: simId },
      data: { documentation: documentation || '' },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error: any) {
    console.error('Documentation save error:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
  }
}
