'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send, Loader2, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function CoachingClient() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n?.language ?? 'de';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          previousMessages: messages, // send history without the current user message
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Fehler' }));
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: err?.error || 'Ein Fehler ist aufgetreten.' };
          return copy;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setStreaming(false);
        return;
      }

      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const current = accumulated;
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: current };
          return copy;
        });
      }
    } catch (e: any) {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: 'Netzwerkfehler. Bitte versuchen Sie es erneut.' };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col mx-auto w-full max-w-[800px] px-4 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Button variant="ghost" size="sm" className="mb-3 gap-2" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            {lang === 'tr' ? 'Kontrol Paneline D\u00f6n' : 'Zur\u00fcck zum Dashboard'}
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {lang === 'tr' ? 'FSP-Ko\u00e7luk' : 'FSP-Coaching'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lang === 'tr'
                  ? 'Yapay zeka ko\u00e7unuz \u2013 performans\u0131n\u0131z hakk\u0131nda d\u00fcr\u00fcst geri bildirim'
                  : 'Ihr KI-Coach \u2013 ehrliches Feedback zu Ihrem Leistungsstand'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: '300px', maxHeight: 'calc(100vh - 340px)' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground max-w-sm">
                    {lang === 'tr'
                      ? 'Ko\u00e7unuza bir soru sorun. Performans\u0131n\u0131z\u0131 analiz edecek ve d\u00fcr\u00fcst geri bildirim verecektir.'
                      : 'Fragen Sie Ihren Coach. Er analysiert Ihre Leistungsdaten und gibt Ihnen ehrliches Feedback.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      lang === 'tr' ? 'Nas\u0131l duruyorum?' : 'Wie stehe ich da?',
                      lang === 'tr' ? 'Zay\u0131f noktalar\u0131m neler?' : 'Wo sind meine L\u00fccken?',
                      lang === 'tr' ? 'Ne \u00e7al\u0131\u015fmal\u0131y\u0131m?' : 'Was sollte ich als N\u00e4chstes \u00fcben?',
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setInput(suggestion);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}>
                    {msg.content || (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {lang === 'tr' ? 'D\u00fc\u015f\u00fcn\u00fcyor...' : 'Denkt nach...'}
                      </span>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={lang === 'tr' ? 'Ko\u00e7unuza bir soru sorun...' : 'Fragen Sie Ihren Coach...'}
                  className="flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] max-h-[120px]"
                  rows={1}
                  disabled={streaming}
                />
                <Button
                  size="icon"
                  className="h-[44px] w-[44px] rounded-xl shrink-0"
                  disabled={!input.trim() || streaming}
                  onClick={handleSend}
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
