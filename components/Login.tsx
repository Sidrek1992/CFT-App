import React, { useState } from 'react';
import { Mail, Lock, LogIn, Chrome, AlertCircle } from 'lucide-react';
import { loginWithEmail, loginWithGoogle } from '../services/authService';

interface LoginProps { }

export const Login: React.FC<LoginProps> = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Por favor ingresa correo y contraseña.');
            return;
        }

        setError(null);
        setIsLoading(true);
        try {
            await loginWithEmail(email, password);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
            } else {
                setError('Ocurrió un error al intentar acceder.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            console.error(err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError('Error al autenticar con Google.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-dark-950">
            {/* Background Orbs */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 translate-y-1/3"></div>

            <div className="w-full max-w-md animate-fade-in-up">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-2">CFT Estatal</h1>
                    <p className="text-slate-400">Plataforma de Correos Corporativos AI</p>
                </div>

                {/* Login Card */}
                <div className="glass-panel p-8 bento-card border border-white/5 relative z-10 shadow-2xl">

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm animate-shake">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 relative z-10" />
                            <p className="relative z-10">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-white placeholder-slate-500 transition-all outline-none"
                                    placeholder="admin@cftestatalaricayparinacota.cl"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-white placeholder-slate-500 transition-all outline-none"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative group overflow-hidden flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white border border-primary-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                            <LogIn className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">{isLoading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-white/5"></div>
                        <span className="text-xs font-semibold text-slate-500">O</span>
                        <div className="flex-1 h-px bg-white/5"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold text-slate-300 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <Chrome className="w-5 h-5 text-slate-400" />
                        Continuar con Google
                    </button>

                    <p className="text-center text-xs text-slate-500 mt-6">
                        Solo el personal autorizado puede acceder a esta plataforma.
                    </p>
                </div>
            </div>
        </div>
    );
};
