import React, { useState } from 'react';
import { Mail, Chrome, AlertCircle } from 'lucide-react';
import { loginWithGoogle } from '../services/authService';

interface LoginProps { }

export const Login: React.FC<LoginProps> = () => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            console.error(err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError('Error al autenticar con Google. Asegúrate de usar tu cuenta institucional.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-dark-950">
            {/* Background Orbs */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 translate-y-1/3"></div>

            <div className="w-full max-w-md animate-fade-in-up">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Mail className="w-8 h-8 text-slate-900 dark:text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">CFT Estatal</h1>
                    <p className="text-slate-600 dark:text-slate-400">Plataforma de Correos Corporativos AI</p>
                </div>

                {/* Login Card */}
                <div className="glass-panel p-8 bento-card border border-slate-100 dark:border-white/5 relative z-10 shadow-2xl">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">Acceso Institucional</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm animate-shake">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 relative z-10" />
                            <p className="relative z-10">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
                            Para acceder a la plataforma, por favor utiliza tu cuenta institucional de Google.
                        </p>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-700 dark:text-slate-200 transition-all hover:-translate-y-1 shadow-lg shadow-slate-200/50 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Chrome className="w-6 h-6 text-primary-500" />
                            )}
                            {isLoading ? 'Autenticando...' : 'Iniciar Sesión con Google'}
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-8">
                        Sistema restringido. El acceso está monitoreado y registrado exclusivamente para personal del CFT Estatal.
                    </p>
                </div>
            </div>
        </div>
    );
};
