import React, { useState, useMemo } from 'react';
import { AuditLog, UserRole } from '../types';
import { Search, History, Filter, Download, Trash2, Calendar, User, Activity } from 'lucide-react';

interface AuditLogsProps {
    logs: AuditLog[];
    onClearLogs: () => void;
    userRole: UserRole;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ logs, onClearLogs, userRole }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState<string>('all');

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.user.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;

            return matchesSearch && matchesModule;
        });
    }, [logs, searchTerm, moduleFilter]);

    const modules = useMemo(() => {
        const set = new Set(logs.map(l => l.module));
        return Array.from(set);
    }, [logs]);

    const formatTimestamp = (ts: number) => {
        const date = new Date(ts);
        return date.toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    if (userRole !== 'admin') {
        return (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Acceso Restringido</h3>
                <p className="text-slate-500">Solo los administradores pueden ver los registros de auditoría.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <History className="w-7 h-7 text-indigo-600" />
                        Registro de Auditoría
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">Seguimiento de acciones y cambios en el sistema</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            const csv = [
                                'Fecha,Usuario,Acción,Módulo,Detalles',
                                ...filteredLogs.map(l => `"${formatTimestamp(l.timestamp)}","${l.user}","${l.action}","${l.module}","${l.details.replace(/"/g, '""')}"`)
                            ].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Auditoria_${Date.now()}.csv`;
                            a.click();
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-wider"
                    >
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('¿Estás seguro de que deseas vaciar el historial de auditoría?')) {
                                onClearLogs();
                            }
                        }}
                        className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center gap-2 shadow-sm hover:bg-rose-100 transition-all font-bold text-xs uppercase tracking-wider"
                    >
                        <Trash2 className="w-4 h-4" /> Vaciar Historial
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por acción, detalle o usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Todos los Módulos</option>
                            {modules.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100">Fecha / Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100">Usuario</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100">Acción / Módulo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <History className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay registros que coincidan</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-700">{formatTimestamp(log.timestamp)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                                                    <User className="w-3.5 h-3.5 text-indigo-600" />
                                                </div>
                                                <span className="text-xs font-black text-slate-900">{log.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="text-xs font-black text-slate-900">{log.action}</span>
                                                </div>
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{log.module}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-md">
                                                {log.details}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Mostrando {filteredLogs.length} de {logs.length} registros
                    </span>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Gestor AI • Security Module
                    </div>
                </div>
            </div>
        </div>
    );
};
