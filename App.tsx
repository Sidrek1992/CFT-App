
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileEdit, Send, Plus, Database, LayoutDashboard, Upload, Trash2, FileSpreadsheet, Menu, Briefcase, ChevronDown, FolderInput, FolderOutput, Settings as SettingsIcon, PenLine, AlertTriangle, Calendar, Clock, Undo2, Bell, Users, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Official, EmailTemplate, ViewState, ToastNotification, SavedTemplate, Gender, SortOption, FilterCriteria, OfficialDatabase, SavedCc, AbsenceRecord, CompensatoryHourRecord, AbsenceConfig, AuditLog, UserRole } from './types';
import { OfficialForm } from './components/OfficialForm';
import { OfficialList } from './components/OfficialList';
import { TemplateEditor } from './components/TemplateEditor';
import { Generator } from './components/Generator';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/ToastContainer';
import { Absenteeism } from './components/Absenteeism';
import { CompensatoryHours } from './components/CompensatoryHours';
import { AbsenceCalendar } from './components/AbsenceCalendar';
import { useNotifications } from './components/NotificationSystem';
import { AuditLogs } from './components/AuditLogs';
import { OrgChart } from './components/OrgChart';

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const INITIAL_OFFICIALS_DATA: Official[] = [
  { id: generateId(), name: "David Alejandro Alarcón Sandoval", rut: "12.345.678-9", gender: Gender.Male, title: "Sr.", position: "Coordinador", department: "Subdirección Académica", email: "d.alarcon@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Natalia Carolina Álvarez Rojas", rut: "9.876.543-2", gender: Gender.Female, title: "Sra.", position: "Coordinador", department: "Subdirección Académica", email: "n.alvarez@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" }
];

export default function App() {
  const [databases, setDatabases] = useState<OfficialDatabase[]>(() => {
    const saved = localStorage.getItem('app_databases');
    if (saved) return JSON.parse(saved);
    return [{ id: generateId(), name: 'Base Principal', officials: INITIAL_OFFICIALS_DATA, createdAt: Date.now() }];
  });

  const [activeDbId, setActiveDbId] = useState<string>(() => {
    const saved = localStorage.getItem('active_db_id');
    return saved || (databases.length > 0 ? databases[0].id : '');
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeDatabase = databases.find(db => db.id === activeDbId) || databases[0];
  const officials = activeDatabase.officials;

  const [view, setView] = useState<ViewState>('dashboard');
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate>(() => {
    const saved = localStorage.getItem('current_template');
    return saved ? JSON.parse(saved) : { subject: '', body: 'Estimado/a {nombre},\n\nEscriba aquí el contenido...\n\nAtentamente,\n[Su Nombre]' };
  });

  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(() => {
    const saved = localStorage.getItem('saved_templates');
    return saved ? JSON.parse(saved) : [];
  });

  const [sentHistory, setSentHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('sent_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedCcs, setSavedCcs] = useState<SavedCc[]>(() => {
    const saved = localStorage.getItem('saved_ccs');
    return saved ? JSON.parse(saved) : [];
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(true);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(true);
  const [absences, setAbsences] = useState<AbsenceRecord[]>(() => {
    const saved = localStorage.getItem('app_absences');
    return saved ? JSON.parse(saved) : [];
  });
  const [compensatoryHours, setCompensatoryHours] = useState<CompensatoryHourRecord[]>(() => {
    const saved = localStorage.getItem('app_compensatory_hours');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => JSON.parse(localStorage.getItem('isAdmin') || 'false'));
  const [absenceConfig, setAbsenceConfig] = useState<AbsenceConfig>(() => {
    const saved = localStorage.getItem('absence_config');
    const parsed = saved ? JSON.parse(saved) : { legalHolidayLimit: 20, administrativeLeaveLimit: 6, customLeaves: [] };
    return { ...parsed, customLeaves: parsed.customLeaves || [] };
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('app_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('user_role');
    return (saved as UserRole) || 'admin';
  });
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({ type: 'none' });

  useEffect(() => { localStorage.setItem('app_databases', JSON.stringify(databases)); }, [databases]);
  useEffect(() => { localStorage.setItem('active_db_id', activeDbId); }, [activeDbId]);
  useEffect(() => { localStorage.setItem('current_template', JSON.stringify(template)); }, [template]);
  useEffect(() => { localStorage.setItem('saved_templates', JSON.stringify(savedTemplates)); }, [savedTemplates]);
  useEffect(() => { localStorage.setItem('sent_history', JSON.stringify(sentHistory)); }, [sentHistory]);
  useEffect(() => { localStorage.setItem('saved_ccs', JSON.stringify(savedCcs)); }, [savedCcs]);
  useEffect(() => { localStorage.setItem('app_absences', JSON.stringify(absences)); }, [absences]);
  useEffect(() => { localStorage.setItem('app_compensatory_hours', JSON.stringify(compensatoryHours)); }, [compensatoryHours]);
  useEffect(() => localStorage.setItem('isAdmin', JSON.stringify(isAdmin)), [isAdmin]);
  useEffect(() => localStorage.setItem('absence_config', JSON.stringify(absenceConfig)), [absenceConfig]);
  useEffect(() => localStorage.setItem('app_audit_logs', JSON.stringify(auditLogs)), [auditLogs]);
  useEffect(() => localStorage.setItem('user_role', userRole), [userRole]);

  const addAuditLog = (action: string, details: string, module: string) => {
    const newLog: AuditLog = {
      id: generateId(),
      timestamp: Date.now(),
      user: userRole === 'admin' ? 'Administrador' : 'Visualizador',
      action,
      details,
      module
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 1000)); // Limit to 1000 logs
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts(prev => [...prev, { id: generateId(), message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateActiveOfficials = (newOfficials: Official[] | ((prev: Official[]) => Official[])) => {
    setDatabases(prev => prev.map(db => {
      if (db.id === activeDbId) {
        const updated = typeof newOfficials === 'function' ? newOfficials(db.officials) : newOfficials;
        return { ...db, officials: updated };
      }
      return db;
    }));
  };

  const handleSaveOfficial = (data: Omit<Official, 'id'>) => {
    if (editingOfficial) {
      updateActiveOfficials(prev => prev.map(o => o.id === editingOfficial.id ? { ...data, id: editingOfficial.id } : o));
      addToast("Funcionario actualizado", 'success');
      addAuditLog('Actualizar Funcionario', `Se actualizó a ${data.name}`, 'Directorio');
    } else {
      updateActiveOfficials(prev => [...prev, { ...data, id: generateId() }]);
      addToast("Funcionario creado", 'success');
      addAuditLog('Crear Funcionario', `Se creó a ${data.name}`, 'Directorio');
    }
    setShowForm(false);
    setEditingOfficial(null);
  };

  const handleDeleteOfficial = (id: string) => {
    if (confirm("¿Eliminar este registro?")) {
      const official = officials.find(o => o.id === id);
      updateActiveOfficials(prev => prev.filter(o => o.id !== id));
      addToast("Registro eliminado", 'success');
      addAuditLog('Eliminar Funcionario', `Se eliminó a ${official?.name || id}`, 'Directorio');
    }
  };

  const handleClearDatabase = () => {
    setShowClearConfirm(true);
  };

  const executeClearDatabase = () => {
    updateActiveOfficials([]);
    addToast("Base de datos vaciada", 'success');
    addAuditLog('Vaciar Base de Datos', `Se eliminaron todos los registros de ${activeDatabase.name}`, 'Sistema');
    setShowClearConfirm(false);
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = useNotifications(officials, absences);
  const notificationCount = notifications.length;

  const handleNavigate = (target: ViewState, filter?: FilterCriteria) => {
    setView(target);
    if (filter) setFilterCriteria(filter);
    setIsMobileMenuOpen(false);
    setShowNotifications(false);
  };

  const handleAddAbsence = (a: Omit<AbsenceRecord, 'id'>) => {
    setAbsences(prev => [...prev, { ...a, id: generateId() }]);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newOfficials: Official[] = data.map((row: any) => ({
          id: generateId(),
          name: row.Nombre || row.nombre || '',
          rut: row.RUT || row.rut || '',
          email: row.Email || row.email || row.Correo || row.correo || '',
          department: row.Departamento || row.departamento || row.Unidad || row.unidad || '',
          position: row.Cargo || row.cargo || '',
          gender: (row.Genero || row.género || '').toLowerCase().includes('f') ? Gender.Female : (row.Genero || row.género || '').toLowerCase().includes('m') ? Gender.Male : Gender.Unspecified,
          title: row.Titulo || row.titulo || 'Sr./Sra.',
          bossName: row.Jefatura || row.jefatura || '',
          bossPosition: row.CargoJefatura || row.cargo_jefatura || '',
          bossEmail: row.EmailJefatura || row.email_jefatura || '',
          phone: row.Telefono || row.teléfono || '',
          entryDate: row.Ingreso || row.ingreso || '',
          contractEndDate: row.Vencimiento || row.vencimiento || ''
        }));

        if (newOfficials.length === 0) {
          addToast("No se encontraron datos válidos en el archivo", "error");
          return;
        }

        updateActiveOfficials(prev => [...prev, ...newOfficials]);
        addToast(`Importados ${newOfficials.length} funcionarios correctamente`, "success");
        addAuditLog('Importación Masiva', `Se importaron ${newOfficials.length} funcionarios vía Excel`, 'Directorio');
      } catch (err) {
        console.error(err);
        addToast("Error al procesar el archivo Excel", "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleExportExcel = () => {
    if (officials.length === 0) {
      addToast("No hay datos para exportar", "error");
      return;
    }

    const exportData = officials.map(o => ({
      'Nombre': o.name,
      'RUT': o.rut,
      'Email': o.email,
      'Departamento': o.department,
      'Cargo': o.position,
      'Género': o.gender,
      'Título': o.title,
      'Ingreso': o.entryDate,
      'Vencimiento': o.contractEndDate,
      'Teléfono': o.phone,
      'Jefatura': o.bossName
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Funcionarios");
    XLSX.writeFile(wb, `Funcionarios_${activeDatabase.name}_${Date.now()}.xlsx`);
    addToast("Base de datos exportada", "success");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Briefcase className="text-white w-6 h-6" />
            </div>
            <h1 className="text-white font-bold text-lg">Gestor AI</h1>
          </div>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-xl transition-all relative group ${showNotifications ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
            title="Notificaciones"
          >
            <Bell className={`w-5 h-5 ${notificationCount > 0 ? (showNotifications ? 'text-white' : 'text-amber-400') : 'text-slate-400'}`} />
            {notificationCount > 0 && (
              <span className={`absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 ${showNotifications ? 'border-indigo-600' : 'border-slate-900'} group-hover:scale-110 transition-transform`}>
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-20 left-6 right-6 lg:left-2 lg:right-auto lg:w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100] animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Notificaciones Recientes</span>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600"><Undo2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">No hay notificaciones</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                      <div className={`p-2 rounded-xl shrink-0 ${notif.priority === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                        <notif.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">{notif.title}</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{notif.officialName}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{notif.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className="w-full p-3 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors border-t border-indigo-100"
                >
                  Ver Panel Completo
                </button>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => handleNavigate('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <div className="pt-2">
            <button
              onClick={() => setIsDatabaseOpen(!isDatabaseOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-3">
                <Database className="w-5 h-5" /> Base de Datos
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDatabaseOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDatabaseOpen && (
              <div className="mt-1 ml-4 border-l border-slate-800 pl-2 space-y-1">
                <button onClick={() => handleNavigate('database')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === 'database' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                  <Briefcase className="w-4 h-4" /> Funcionarios
                </button>
                <button
                  onClick={() => setView('absenteeism')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${view === 'absenteeism' || view === 'calendar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <Calendar className="w-5 h-5" /> Ausentismo
                </button>
                <button onClick={() => handleNavigate('compensatory-hours')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === 'compensatory-hours' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                  <Clock className="w-4 h-4" /> Horas Comp.
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button onClick={() => handleNavigate('org-chart')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'org-chart' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
              <Users className="w-5 h-5" /> Organigrama
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsBulkEmailOpen(!isBulkEmailOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-3">
                <Send className="w-5 h-5" /> Correos Masivos
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isBulkEmailOpen ? 'rotate-180' : ''}`} />
            </button>

            {isBulkEmailOpen && (
              <div className="mt-1 ml-4 border-l border-slate-800 pl-2 space-y-1">
                <button onClick={() => handleNavigate('template')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === 'template' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                  <FileEdit className="w-4 h-4" /> Editor
                </button>
                <button onClick={() => handleNavigate('generate')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === 'generate' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                  <Send className="w-4 h-4" /> Generar
                </button>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
            <button onClick={() => handleNavigate('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
              <SettingsIcon className="w-5 h-5" /> Configuración
            </button>
            <button onClick={() => handleNavigate('audit-logs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'audit-logs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
              <FileText className="w-5 h-5" /> Auditoría
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <span className="font-bold">Gestor AI</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-xl transition-colors relative ${showNotifications ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
            >
              <Bell className={`w-5 h-5 ${notificationCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {notificationCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2"><Menu /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {view === 'dashboard' && (
              <Dashboard
                officials={officials}
                absences={absences}
                sentHistory={sentHistory}
                onNavigate={handleNavigate}
                onImport={handleImportClick}
                onExportExcel={handleExportExcel}
                onNewOfficial={() => { setEditingOfficial(null); setShowForm(true); setView('database'); }}
                onClearDatabase={handleClearDatabase}
                isAdmin={isAdmin}
              />
            )}

            {view === 'database' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">Directorio de Funcionarios</h2>
                  <div className="flex gap-2">
                    <button onClick={handleImportClick} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-50"><Upload className="w-4 h-4" /> Importar</button>
                    {!showForm && <button onClick={() => { setEditingOfficial(null); setShowForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 shadow-sm"><Plus className="w-4 h-4" /> Nuevo</button>}
                  </div>
                </div>
                {showForm ? (
                  <OfficialForm initialData={editingOfficial} existingOfficials={officials} onSave={handleSaveOfficial} onCancel={() => setShowForm(false)} />
                ) : (
                  <OfficialList
                    officials={officials}
                    absences={absences}
                    compensatoryRecords={compensatoryHours}
                    config={absenceConfig}
                    onEdit={(o) => { setEditingOfficial(o); setShowForm(true); }}
                    onDelete={handleDeleteOfficial}
                    onBulkDelete={() => { }}
                    onBulkUpdate={() => { }}
                    onClearAll={handleClearDatabase}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    initialFilter={filterCriteria}
                    onClearFilter={() => setFilterCriteria({ type: 'none' })}
                  />
                )}
              </div>
            )}

            {view === 'absenteeism' && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setView('absenteeism')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${view === 'absenteeism' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    Listado
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    Visor Mensual
                  </button>
                </div>
                {view === 'absenteeism' && (
                  <Absenteeism
                    officials={officials}
                    absences={absences}
                    onAddAbsence={handleAddAbsence}
                    onDeleteAbsence={(id) => setAbsences(prev => prev.filter(a => a.id !== id))}
                    onToast={addToast}
                    config={absenceConfig}
                  />
                )}
              </div>
            )}

            {view === 'calendar' && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setView('absenteeism')}
                    className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold text-sm transition-all"
                  >
                    Listado
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm transition-all shadow-lg"
                  >
                    Visor Mensual
                  </button>
                </div>
                <AbsenceCalendar
                  officials={officials}
                  absences={absences}
                />
              </div>
            )}

            {view === 'compensatory-hours' && (
              <CompensatoryHours
                officials={officials}
                records={compensatoryHours}
                onAddRecord={(r) => setCompensatoryHours(prev => [...prev, { ...r, id: generateId() }])}
                onDeleteRecord={(id) => setCompensatoryHours(prev => prev.filter(r => r.id !== id))}
                onToast={addToast}
              />
            )}

            {view === 'template' && <TemplateEditor template={template} onChange={setTemplate} files={[]} onFilesChange={() => { }} officials={officials} onToast={addToast} savedTemplates={savedTemplates} onSaveTemplate={(n) => setSavedTemplates(prev => [...prev, { ...template, id: generateId(), name: n, createdAt: Date.now() }])} onDeleteTemplate={(id) => setSavedTemplates(prev => prev.filter(t => t.id !== id))} />}

            {view === 'generate' && <Generator officials={officials} template={template} files={[]} sentHistory={sentHistory} savedCcs={savedCcs} onMarkAsSent={(id) => setSentHistory(prev => [...prev, id])} onToast={addToast} />}

            {view === 'org-chart' && <OrgChart officials={officials} />}

            {view === 'audit-logs' && (
              <AuditLogs
                logs={auditLogs}
                onClearLogs={() => setAuditLogs([])}
                userRole={userRole}
              />
            )}

            {view === 'settings' && (
              <Settings
                savedCcs={savedCcs}
                onAddCc={(l, e) => {
                  setSavedCcs(prev => [...prev, { id: generateId(), label: l, email: e }]);
                  addToast("CC Permanente guardado", "success");
                }}
                onDeleteCc={(id) => {
                  setSavedCcs(prev => prev.filter(cc => cc.id !== id));
                  addToast("CC Permanente eliminado", "info");
                }}
                userRole={userRole}
                onSetUserRole={setUserRole}
                absenceConfig={absenceConfig}
                onUpdateAbsenceConfig={setAbsenceConfig}
              />
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN PROFESIONAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100 animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-900">¿Vaciar Base de Datos?</h3>
              <p className="text-red-700 mt-2 text-sm">
                Estás a punto de eliminar todos los registros de <strong>"{activeDatabase.name}"</strong>.
              </p>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm mb-6 leading-relaxed text-center">
                Se eliminarán <strong>{officials.length} registros</strong>. Esta acción es irreversible para esta lista específica.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeClearDatabase}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Vaciar Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
