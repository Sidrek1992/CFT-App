
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CompensatoryHourRecord } from '../types';

interface BalanceHistoryChartProps {
    records: CompensatoryHourRecord[];
    officialId: string;
}

export const BalanceHistoryChart: React.FC<BalanceHistoryChartProps> = ({ records, officialId }) => {
    const data = useMemo(() => {
        const officialRecords = records
            .filter(r => r.officialId === officialId)
            .sort((a, b) => a.date.localeCompare(b.date));

        let balance = 0;
        return officialRecords.map(r => {
            if (r.type === 'Requirement') {
                balance += r.totalCalculated;
            } else {
                balance -= r.hours;
            }
            return {
                date: r.date,
                balance: balance
            };
        });
    }, [records, officialId]);

    if (data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-xl">
                Sin historial para mostrar
            </div>
        );
    }

    return (
        <div className="h-64 w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Evolución de Saldo (Horas)</h4>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="date"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#94a3b8' }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
