
import React, { useState, useEffect, useRef } from 'react';
import { FileEdit, Send, Plus, Database, LayoutDashboard, Upload, Trash2, FileSpreadsheet, Menu, Briefcase, ChevronDown, FolderInput, FolderOutput, Settings as SettingsIcon, PenLine, AlertTriangle, UserX } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Official, EmailTemplate, ViewState, ToastNotification, SavedTemplate, Gender, SortOption, FilterCriteria, OfficialDatabase, SavedCc } from './types';
import { OfficialForm } from './components/OfficialForm';
import { OfficialList } from './components/OfficialList';
import { TemplateEditor } from './components/TemplateEditor';
import { Generator } from './components/Generator';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/ToastContainer';

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
  const [deletingOfficial, setDeletingOfficial] = useState<Official | null>(null);
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
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({ type: 'none' });

  useEffect(() => { localStorage.setItem('app_databases', JSON.stringify(databases)); }, [databases]);
  useEffect(() => { localStorage.setItem('active_db_id', activeDbId); }, [activeDbId]);
  useEffect(() => { localStorage.setItem('current_template', JSON.stringify(template)); }, [template]);
  useEffect(() => { localStorage.setItem('saved_templates', JSON.stringify(savedTemplates)); }, [savedTemplates]);
  useEffect(() => { localStorage.setItem('sent_history', JSON.stringify(sentHistory)); }, [sentHistory]);
  useEffect(() => { localStorage.setItem('saved_ccs', JSON.stringify(savedCcs)); }, [savedCcs]);

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
    } else {
      updateActiveOfficials(prev => [...prev, { ...data, id: generateId() }]);
      addToast("Funcionario creado", 'success');
    }
    setShowForm(false);
    setEditingOfficial(null);
  };

  const handleDeleteOfficialRequest = (official: Official) => {
    setDeletingOfficial(official);
  };

  const executeDeleteOfficial = () => {
    if (deletingOfficial) {
        updateActiveOfficials(prev => prev.filter(o => o.id !== deletingOfficial.id));
        addToast(`Registro de ${deletingOfficial.name} eliminado`, 'success');
        setDeletingOfficial(null);
    }
  };

  const handleClearDatabase = () => {
      setShowClearConfirm(true);
  };

  const executeClearDatabase = () => {
    updateActiveOfficials([]);
    addToast("Base de datos vaciada", 'success');
    setShowClearConfirm(false);
  };

  const handleNavigate = (target: ViewState, filter?: FilterCriteria) => {
    setView(target);
    if (filter) setFilterCriteria(filter);
    setIsMobileMenuOpen(false);
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
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Briefcase className="text-white w-6 h-6" />
            </div>
            <h1 className="text-white font-bold text-lg">Gestor AI</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => handleNavigate('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button onClick={() => handleNavigate('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'database' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                <Database className="w-5 h-5" /> Base de Datos
            </button>
            <button onClick={() => handleNavigate('template')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'template' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                <FileEdit className="w-5 h-5" /> Editor
            </button>
            <button onClick={() => handleNavigate('generate')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'generate' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                <Send className="w-5 h-5" /> Generar
            </button>
            <div className="pt-4 border-t border-slate-800 mt-4">
              <button onClick={() => handleNavigate('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                  <SettingsIcon className="w-5 h-5" /> Configuración
              </button>
            </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <span className="font-bold">Gestor AI</span>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2"><Menu /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
              <div className="max-w-7xl mx-auto">
                  {view === 'dashboard' && (
                    <Dashboard 
                      officials={officials} 
                      sentHistory={sentHistory} 
                      onNavigate={handleNavigate} 
                      onImport={handleImportClick} 
                      onExportExcel={handleExportExcel} 
                      onNewOfficial={() => handleNavigate('database')} 
                      onClearDatabase={handleClearDatabase} 
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
                            <OfficialList officials={officials} onEdit={(o) => { setEditingOfficial(o); setShowForm(true); }} onDelete={handleDeleteOfficialRequest} onBulkDelete={() => {}} onBulkUpdate={() => {}} onClearAll={handleClearDatabase} sortOption={sortOption} onSortChange={setSortOption} initialFilter={filterCriteria} onClearFilter={() => setFilterCriteria({ type: 'none' })} />
                        )}
                    </div>
                  )}

                  {view === 'template' && <TemplateEditor template={template} onChange={setTemplate} files={[]} onFilesChange={() => {}} officials={officials} onToast={addToast} savedTemplates={savedTemplates} onSaveTemplate={(n) => setSavedTemplates(prev => [...prev, { ...template, id: generateId(), name: n, createdAt: Date.now() }])} onDeleteTemplate={(id) => setSavedTemplates(prev => prev.filter(t => t.id !== id))} />}
                  
                  {view === 'generate' && <Generator officials={officials} template={template} files={[]} sentHistory={sentHistory} savedCcs={savedCcs} onMarkAsSent={(id) => setSentHistory(prev => [...prev, id])} onToast={addToast} />}

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
                    />
                  )}
              </div>
          </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN - ELIMINAR INDIVIDUAL */}
      {deletingOfficial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                  <div className="p-6 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                          <UserX className="w-8 h-8 text-rose-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">¿Eliminar Funcionario?</h3>
                      <p className="text-slate-500 mt-2 text-sm">
                          Estás a punto de eliminar permanentemente a <span className="font-bold text-slate-800">{deletingOfficial.name}</span>.
                      </p>
                  </div>
                  <div className="p-6 pt-0 flex gap-3">
                      <button 
                        onClick={() => setDeletingOfficial(null)}
                        className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={executeDeleteOfficial}
                        className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium shadow-md transition-colors"
                      >
                          Eliminar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE CONFIRMACIÓN - VACIAR BD */}
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
