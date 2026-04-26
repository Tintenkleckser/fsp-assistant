export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const allTerms = await prisma.glossaryTerm.findMany({
      orderBy: { termDe: 'asc' },
    });
    // Deduplicate by termDe (keep first occurrence)
    const seen = new Set<string>();
    const terms = (allTerms ?? []).filter((t) => {
      const key = t.termDe?.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return NextResponse.json(terms);
  } catch (error: any) {
    console.error('Glossary fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
