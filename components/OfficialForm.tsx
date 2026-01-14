import { Official, Gender } from '../types';
import { detectGenderAndTitle } from '../services/geminiService';
import { validateRUT, formatRUT } from '../utils';
import { Sparkles, User, Mail, Briefcase, Save, X, Building2, Crown, Eraser, BadgeCheck, UserCheck, Calendar, Phone, MapPin, Heart, ShieldAlert, Fingerprint, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OfficialFormProps {
  initialData?: Official | null;
  existingOfficials: Official[];
  onSave: (official: Omit<Official, 'id'>) => void;
  onCancel: () => void;
}

export const OfficialForm: React.FC<OfficialFormProps> = ({ initialData, existingOfficials, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [stament, setStament] = useState('');
  const [isBoss, setIsBoss] = useState(false);
  const [bossName, setBossName] = useState('');
  const [bossPosition, setBossPosition] = useState('');
  const [bossEmail, setBossEmail] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Unspecified);
  const [title, setTitle] = useState('Sr./Sra.');

  // Nuevos campos
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setRut(initialData.rut || '');
      setEmail(initialData.email);
      setDepartment(initialData.department || '');
      setPosition(initialData.position);
      setStament(initialData.stament || '');
      setIsBoss(initialData.isBoss || false);
      setBossName(initialData.bossName);
      setBossPosition(initialData.bossPosition);
      setBossEmail(initialData.bossEmail);
      setGender(initialData.gender);
      setTitle(initialData.title);
      setBirthDate(initialData.birthDate || '');
      setPhone(initialData.phone || '');
      setAddress(initialData.address || '');
      setEntryDate(initialData.entryDate || '');
      setContractEndDate(initialData.contractEndDate || '');
      setEmergencyContactName(initialData.emergencyContactName || '');
      setEmergencyContactPhone(initialData.emergencyContactPhone || '');
    }
  }, [initialData]);

  const uniqueDepartments = useMemo(() =>
    [...new Set(existingOfficials.map(o => o.department).filter(Boolean))].sort(),
    [existingOfficials]);

  const handleAnalyzeName = async () => {
    if (!name) return;
    setIsAnalyzing(true);
    const result = await detectGenderAndTitle(name);
    setGender(result.gender);
    setTitle(result.title);
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name, rut, email, department, position, stament, isBoss, bossName, bossPosition, bossEmail, gender, title,
      birthDate, phone, address, entryDate, contractEndDate, emergencyContactName, emergencyContactPhone
    });
  };

  const SectionTitle = ({ icon: Icon, text }: { icon: any, text: string }) => (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4 mt-8 first:mt-0">
      <Icon className="w-5 h-5 text-indigo-600" />
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{text}</h4>
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">
            {initialData ? 'Editar Expediente' : 'Nueva Ficha de Funcionario'}
          </h3>
          <p className="text-slate-500 text-sm">Complete toda la información personal e institucional del funcionario.</p>
        </div>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <SectionTitle icon={User} text="Identificación y Contacto" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
            <div className="flex gap-2">
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nombre completo" />
              <button type="button" onClick={handleAnalyzeName} disabled={!name || isAnalyzing} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-2 transition-colors font-bold text-xs">
                {isAnalyzing ? <span className="animate-spin text-lg">✦</span> : <Sparkles className="w-4 h-4" />} IA
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
            <div className="relative">
              <Fingerprint className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={rut}
                onChange={(e) => setRut(formatRUT(e.target.value))}
                className={`pl-10 w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-colors ${rut ? (validateRUT(rut) ? 'border-emerald-200 bg-emerald-50 focus:ring-emerald-500' : 'border-rose-200 bg-rose-50 focus:ring-rose-500') : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                placeholder="12.345.678-9"
              />
              <div className="absolute right-3 top-2.5">
                {rut && (
                  validateRUT(rut) ?
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>
            {rut && !validateRUT(rut) && (
              <p className="text-[10px] text-rose-600 mt-1 font-bold animate-pulse">RUT inválido</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Institucional</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="correo@empresa.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Género</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value={Gender.Unspecified}>No definido</option>
              <option value={Gender.Male}>Masculino</option>
              <option value={Gender.Female}>Femenino</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Sr. / Sra. / Dr." />
          </div>
        </div>

        <SectionTitle icon={MapPin} text="Información Personal" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="+56 9..." />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Particular</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Calle, Número, Ciudad" />
          </div>
        </div>

        <SectionTitle icon={Building2} text="Información Institucional" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
            <input type="text" list="depts" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <datalist id="depts">{uniqueDepartments.map(d => <option key={d} value={d} />)}</datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
            <input required type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Ingreso</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fin de Contrato</label>
            <input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <SectionTitle icon={Heart} text="Seguridad y Emergencia" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-rose-50 p-4 rounded-xl border border-rose-100">
          <div>
            <label className="block text-sm font-medium text-rose-900 mb-1">Contacto de Emergencia</label>
            <input type="text" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className="w-full px-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-rose-900 mb-1">Teléfono Emergencia</label>
            <input type="text" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className="w-full px-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" placeholder="+56 9..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-8 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition-colors">Cancelar</button>
          <button type="submit" className="px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all flex items-center gap-2">
            <Save className="w-5 h-5" />
            {initialData ? 'Actualizar Expediente' : 'Guardar Funcionario'}
          </button>
        </div>
      </form>
    </div>
  );
};
