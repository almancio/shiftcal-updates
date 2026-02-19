import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="panel login-card">
        <h1 className="page-title">ShiftCal OTA Hub</h1>
        <p className="page-subtitle">
          Accede al panel para publicar OTA updates de Expo, editar el config remoto y revisar insights de uso.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
