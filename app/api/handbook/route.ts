export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const domain = searchParams.get('domain') || 'nursing';
    const part = searchParams.get('part');

    const where: any = { domain };
    if (part) {
      where.partNumber = parseInt(part);
    }
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ];
    }

    const sections = await prisma.handbookSection.findMany({
      where,
      select: {
        id: true,
        partNumber: true,
        title: true,
        keywords: true,
        content: true,
      },
      orderBy: [{ partNumber: 'asc' }, { sectionIdx: 'asc' }],
      take: 20,
    });

    // Return summary (truncated content) for listing
    const result = sections.map(s => ({
      ...s,
      content: s.content.length > 300 ? s.content.substring(0, 300) + '...' : s.content,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Handbook API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
