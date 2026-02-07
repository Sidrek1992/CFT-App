import React from 'react';
import { Mail, Sparkles, Shield, Database } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  loading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, loading = false }) => {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-white">
        <section className="lg:col-span-3 p-8 md:p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#60a5fa_0%,_transparent_45%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 border border-white/15 mb-6">
              <Mail className="w-4 h-4 text-indigo-200" />
              <span className="text-sm font-medium text-indigo-100">CFT Correos</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">Gestor de Correos Corporativos</h1>
            <p className="mt-3 text-sm md:text-base text-slate-200 max-w-xl">
              Gestiona bases de funcionarios, redacta contenido con IA y envia correos desde Gmail en un solo flujo.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                <Sparkles className="w-5 h-5 text-indigo-200 mb-2" />
                <p className="text-sm font-semibold">IA Integrada</p>
                <p className="text-xs text-slate-200 mt-1">Redaccion asistida y mejora de contenido.</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                <Database className="w-5 h-5 text-indigo-200 mb-2" />
                <p className="text-sm font-semibold">Multi-Base</p>
                <p className="text-xs text-slate-200 mt-1">Organiza funcionarios por base de datos.</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                <Shield className="w-5 h-5 text-indigo-200 mb-2" />
                <p className="text-sm font-semibold">Acceso Seguro</p>
                <p className="text-xs text-slate-200 mt-1">Sesion protegida con Google OAuth.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 p-8 md:p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-900">Iniciar sesion</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Usa la misma cuenta de Gmail con la que enviaras los correos.
          </p>

          <button
            onClick={onLogin}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                Conectando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">
              Al iniciar sesion, se creara tu perfil de usuario automaticamente y podras enviar correos con esa cuenta.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
