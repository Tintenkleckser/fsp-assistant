'use client';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen } from 'lucide-react';

interface GlossaryItem {
  termDe: string;
  termTr: string;
  contextDe: string;
  contextTr: string;
}

let cachedGlossary: GlossaryItem[] | null = null;

export function GlossaryTooltip({ text }: { text: string }) {
  const [glossary, setGlossary] = useState<GlossaryItem[]>(cachedGlossary ?? []);

  useEffect(() => {
    if (cachedGlossary) return;
    const load = async () => {
      try {
        const res = await fetch('/api/glossary');
        const data = await res?.json?.();
        cachedGlossary = data ?? [];
        setGlossary(data ?? []);
      } catch (e: any) {
        console.error('Glossary load error:', e);
      }
    };
    load();
  }, []);

  if (!text || (glossary ?? [])?.length === 0) {
    return <span className="whitespace-pre-wrap">{text ?? ''}</span>;
  }

  // Find glossary terms in text and wrap them
  const parts: Array<{ text: string; glossaryItem?: GlossaryItem }> = [];
  let remaining = text ?? '';

  // Sort by length descending to match longer terms first
  const sorted = [...(glossary ?? [])].sort((a: GlossaryItem, b: GlossaryItem) =>
    (b?.termDe?.length ?? 0) - (a?.termDe?.length ?? 0)
  );

  const processText = (input: string): Array<{ text: string; glossaryItem?: GlossaryItem }> => {
    const result: Array<{ text: string; glossaryItem?: GlossaryItem }> = [];
    let str = input ?? '';

    while (str?.length > 0) {
      let found = false;
      for (const item of sorted) {
        const term = item?.termDe ?? '';
        if (!term) continue;
        const idx = str.toLowerCase().indexOf(term.toLowerCase());
        if (idx >= 0) {
          if (idx > 0) result.push({ text: str.slice(0, idx) });
          result.push({ text: str.slice(idx, idx + term.length), glossaryItem: item });
          str = str.slice(idx + term.length);
          found = true;
          break;
        }
      }
      if (!found) {
        result.push({ text: str });
        break;
      }
    }
    return result;
  };

  const segments = processText(remaining);

  return (
    <TooltipProvider delayDuration={300}>
      <span className="whitespace-pre-wrap">
        {(segments ?? []).map((seg: any, idx: number) => {
          if (seg?.glossaryItem) {
            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <span className="border-b border-dashed border-primary/50 cursor-help text-primary/90 font-medium">
                    {seg?.text ?? ''}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 font-medium text-xs">
                      <BookOpen className="h-3 w-3" />
                      {seg.glossaryItem?.termDe ?? ''} → {seg.glossaryItem?.termTr ?? ''}
                    </div>
                    <p className="text-xs opacity-80">{seg.glossaryItem?.contextDe ?? ''}</p>
                    <p className="text-xs opacity-60 italic">{seg.glossaryItem?.contextTr ?? ''}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }
          return <span key={idx}>{seg?.text ?? ''}</span>;
        })}
      </span>
    </TooltipProvider>
  );
}
