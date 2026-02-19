import { ShieldCheck } from 'lucide-react';

import { LoginForm } from '@/components/login-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-3 py-6">
      <Card className="w-full max-w-lg border-teal-900/20 bg-gradient-to-br from-card via-card to-teal-50/80">
        <CardHeader className="space-y-3">
          <Badge className="w-fit rounded-md px-2 py-1 text-[10px] uppercase tracking-wide">Admin Access</Badge>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="size-5 text-primary" />
            ShiftCal OTA Hub
          </CardTitle>
          <CardDescription>
            Accede al panel para publicar OTA updates, editar `config.json` en vivo y analizar comportamiento de tus
            usuarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
