import React, { useState, useMemo } from 'react';
import { Official, AbsenceRecord, AbsenceConfig } from '../types';
import { Calendar, TrendingUp, Calculator, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { calculateProgressiveDays, calculateProportionalDays } from '../utils';

interface ProjectionSimulatorProps {
    official: Official;
    absences: AbsenceRecord[];
    config: AbsenceConfig;
}

export const ProjectionSimulator: React.FC<ProjectionSimulatorProps> = ({ official, absences, config }) => {
    const [targetDate, setTargetDate] = useState(() => {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear.toISOString().split('T')[0];
    });

    const projection = useMemo(() => {
        if (!targetDate) return null;

        const target = new Date(targetDate);
        const today = new Date();

        // Calculate current balance
        const usedDays = absences
            .filter(a => a.officialId === official.id && a.type === 'Feriado Legal')
            .reduce((sum, a) => sum + a.days, 0);

        const progressiveDays = calculateProgressiveDays(official.entryDate || '', official.recognizedYears || 0);
        const currentLimit = config.legalHolidayLimit + progressiveDays;

        // Accurate current proportional (from entry date to today)
        const currentProportional = calculateProportionalDays(official.entryDate || '', config.legalHolidayLimit);

        // Future proportional (from entry date to target date)
        const futureProportional = calculateProportionalDays(official.entryDate || '', config.legalHolidayLimit, targetDate);

        const earnedBetweenNowAndThen = Math.max(0, futureProportional - currentProportional);
        const projectedBalance = (currentProportional + progressiveDays - usedDays) + earnedBetweenNowAndThen;

        return {
            currentLimit,
            usedDays,
            currentProportional,
            earnedBetweenNowAndThen,
            projectedBalance: Math.floor(projectedBalance * 100) / 100,
            monthsRemaining: Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        };
    }, [official, absences, targetDate, config]);

    return (
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30">
                        <TrendingUp className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Simulador de Proyección</h3>
                        <p className="text-slate-400 text-xs font-medium">Calcula tu saldo estimado de vacaciones a futuro</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">Fecha de Proyección</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Esta simulación considera tu tasa de acumulación actual de <strong>{(config.legalHolidayLimit / 12).toFixed(2)} días/mes</strong> y tus días progresivos reconocidos.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center">
                        {projection && (
                            <div className="space-y-8">
                                <div className="text-center lg:text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Saldo Proyectado</p>
                                    <h2 className="text-6xl font-black text-white flex items-center justify-center lg:justify-start gap-3">
                                        {projection.projectedBalance}
                                        <span className="text-2xl text-indigo-400">DÍAS</span>
                                    </h2>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Días a Ganar</p>
                                        <p className="text-xl font-bold text-emerald-400">+{projection.earnedBetweenNowAndThen.toFixed(2)}</p>
                                    </div>
                                    <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Meses Restantes</p>
                                        <p className="text-xl font-bold text-indigo-300">{projection.monthsRemaining}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Cálculo basado en reglamento institucional vigente</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
