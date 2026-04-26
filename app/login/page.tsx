'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message === 'Invalid login credentials'
          ? 'Ungültige Anmeldedaten'
          : signInError.message);
      } else {
        router.replace('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError('Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-20 w-20 mb-2">
            <img src="/synthema-logo.png" alt="SYNTHEMA – KI-gestützte Qualifizierung" className="h-full w-full object-contain" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t('common.appName')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('common.tagline')}</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t('common.login')}</CardTitle>
            <CardDescription>Melden Sie sich an, um fortzufahren</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e: any) => setEmail(e?.target?.value ?? '')}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Passwort"
                    value={password}
                    onChange={(e: any) => setPassword(e?.target?.value ?? '')}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Wird angemeldet...' : t('common.login')}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t('common.noAccount')}{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                {t('common.register')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
