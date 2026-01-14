import { Official, CompensatoryHourRecord } from '../types';
import { Clock, Plus, Trash2, Search, TrendingUp, TrendingDown, AlertCircle, BarChart3 } from 'lucide-react';
import { BalanceHistoryChart } from './BalanceHistoryChart';

interface CompensatoryHoursProps {
    officials: Official[];
    records: CompensatoryHourRecord[];
    onAddRecord: (record: Omit<CompensatoryHourRecord, 'id'>) => void;
    onDeleteRecord: (id: string) => void;
    onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CompensatoryHours: React.FC<CompensatoryHoursProps> = ({
    officials,
    records,
    onAddRecord,
    onDeleteRecord,
    onToast
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [selectedOfficialId, setSelectedOfficialId] = useState('');
    const [type, setType] = useState<'Requirement' | 'Compensation'>('Requirement');
    const [date, setDate] = useState('');
    const [hours, setHours] = useState(0);
    const [isHolidayOrWeekend, setIsHolidayOrWeekend] = useState(false);
    const [description, setDescription] = useState('');

    const calculateTotal = (h: number, isHoliday: boolean, t: 'Requirement' | 'Compensation') => {
        if (t === 'Compensation') return h; // No surcharge for compensation (taking time off)
        const rate = isHoliday ? 1.5 : 1.25;
        return h * rate;
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOfficialId || !date || hours <= 0) {
            onToast("Por favor complete los campos obligatorios", "error");
            return;
        }

        const currentBalance = getOfficialBalance(selectedOfficialId);

        if (type === 'Compensation' && hours > currentBalance) {
            onToast(`Saldo insuficiente. El funcionario solo dispone de ${currentBalance}h.`, "error");
            return;
        }

        const rate = type === 'Compensation' ? 1 : (isHolidayOrWeekend ? 1.5 : 1.25);
        const totalCalculated = calculateTotal(hours, isHolidayOrWeekend, type);

        onAddRecord({
            officialId: selectedOfficialId,
            date,
            hours,
            type,
            isHolidayOrWeekend,
            rate,
            totalCalculated,
            description
        });

        onToast("Registro de horas procesado", "success");
        setShowAddForm(false);
        resetForm();
    };

    const resetForm = () => {
        setSelectedOfficialId('');
        setType('Requirement');
        setDate('');
        setHours(0);
        setIsHolidayOrWeekend(false);
        setDescription('');
    };

    const getOfficialBalance = (officialId: string) => {
        const officialRecords = records.filter(r => r.officialId === officialId);
        const earned = officialRecords
            .filter(r => r.type === 'Requirement')
            .reduce((acc, r) => acc + r.totalCalculated, 0);
        const used = officialRecords
            .filter(r => r.type === 'Compensation')
            .reduce((acc, r) => acc + r.hours, 0);
        return earned - used;
    };

    const filteredRecords = records.filter(record => {
        const official = officials.find(o => o.id === record.officialId);
        if (!official) return false;
        return official.name.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-slate-800">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="text-indigo-600" /> Horas Compensatorias
                    </h2>
                    <p className="text-slate-500 text-sm">Gestión de horas extras y compensaciones con recargo</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 shadow-md hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Registrar Horas
                </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <span className="font-bold">Recordatorio de Recargos:</span> Las horas trabajadas en días hábiles tienen un <span className="font-bold uppercase">25%</span> de recargo. Sábados, domingos y festivos tienen un <span className="font-bold uppercase">50%</span> de recargo. Las horas compensadas (descanso) no tienen recargo.
                </div>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Funcionario</label>
                            <select
                                value={selectedOfficialId}
                                onChange={(e) => setSelectedOfficialId(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Seleccione un funcionario...</option>
                                {officials.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Registro</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as 'Requirement' | 'Compensation')}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="Requirement">Horas Trabajadas (Suma)</option>
                                <option value="Compensation">Horas Compensadas (Resta)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Cantidad de Horas</label>
                            <input
                                type="number"
                                value={hours}
                                onChange={(e) => setHours(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                min="0.5"
                                step="0.5"
                            />
                        </div>
                        {type === 'Requirement' && (
                            <div className="flex items-center gap-3 pt-6">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isHolidayOrWeekend}
                                        onChange={(e) => setIsHolidayOrWeekend(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700">Festivo / Sábado / Domingo</span>
                                </label>
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Descripción</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Motivo..."
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                            <div className="text-xs text-slate-500">
                                {type === 'Requirement' ? (
                                    <p>Cálculo: {hours}h × {isHolidayOrWeekend ? '1.5' : '1.25'} = <span className="font-bold text-indigo-600">{calculateTotal(hours, isHolidayOrWeekend, type)}h a favor</span></p>
                                ) : (
                                    <p>Cálculo: <span className="font-bold text-rose-600">{hours}h de descanso</span></p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddForm(false); resetForm(); }}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors"
                                >
                                    Registrar
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por funcionario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                <th className="px-6 py-4">Funcionario</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-center">Horas Base</th>
                                <th className="px-6 py-4 text-center">Factor</th>
                                <th className="px-6 py-4 text-center">Total Calc.</th>
                                <th className="px-6 py-4">Saldo Actual</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.length > 0 ? filteredRecords.map(record => {
                                const official = officials.find(o => o.id === record.officialId);
                                const balance = official ? getOfficialBalance(official.id) : 0;
                                return (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                    {official ? official.name.charAt(0) : '?'}
                                                </div>
                                                <span className="font-bold text-slate-800">{official ? official.name : 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 tabular-nums">
                                            {record.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {record.type === 'Requirement' ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                        <TrendingUp className="w-3 h-3" /> Extra
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-2 py-1 rounded border border-rose-100">
                                                        <TrendingDown className="w-3 h-3" /> Comp.
                                                    </span>
                                                )}
                                                {record.isHolidayOrWeekend && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">X1.5</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium">
                                            {record.hours}h
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-400">
                                            {record.type === 'Requirement' ? `x${record.rate}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-slate-800">
                                            {record.type === 'Requirement' ? `+${record.totalCalculated}h` : `-${record.hours}h`}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {balance}h
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    if (confirm("¿Eliminar este registro?")) onDeleteRecord(record.id);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400 italic">
                                        No hay registros de horas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
