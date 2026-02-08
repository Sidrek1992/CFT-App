
import React, { Suspense, lazy, useState, useEffect, useRef, useMemo } from 'react';
import { FileEdit, Send, Plus, Database, LayoutDashboard, Upload, Download, AlertTriangle, X, RefreshCw, SkipForward, Trash2, FileSpreadsheet, Menu, Briefcase, CheckCircle2, Settings, ChevronDown, FolderPlus, PenLine, FolderInput, FolderOutput } from 'lucide-react';
import { Official, EmailTemplate, ViewState, ToastNotification, SavedTemplate, Gender, SortOption, FilterCriteria, OfficialDatabase } from './types';
import { OfficialForm } from './components/OfficialForm';
import { ToastContainer } from './components/ToastContainer';

const OfficialList = lazy(() => import('./components/OfficialList').then((mod) => ({ default: mod.OfficialList })));
const TemplateEditor = lazy(() => import('./components/TemplateEditor').then((mod) => ({ default: mod.TemplateEditor })));
const Generator = lazy(() => import('./components/Generator').then((mod) => ({ default: mod.Generator })));
const Dashboard = lazy(() => import('./components/Dashboard').then((mod) => ({ default: mod.Dashboard })));

let xlsxModulePromise: Promise<any> | null = null;
const getXlsxModule = async () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs').then((mod) => mod.default || mod);
  }
  return xlsxModulePromise;
};

// Safe ID generator that works in non-secure contexts (http) and fast loops
let idCounter = 0;
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2) + (idCounter++).toString(36);
};

// Helper to map excel gender string to Enum (Robust version)
const parseGender = (val: any): Gender => {
    if (!val) return Gender.Unspecified;
    const str = String(val).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (['male', 'masculino', 'hombre', 'm', 'varon', 'caballero', 'h', 'masc', 'senor', 'sr', 'don'].includes(str)) return Gender.Male;
    if (['female', 'femenino', 'mujer', 'f', 'sra', 'srta', 'dama', 'fem', 'senora', 'dona'].includes(str)) return Gender.Female;
    return Gender.Unspecified;
};

const safeParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const createDefaultDatabase = (officials: Official[] = INITIAL_OFFICIALS_DATA): OfficialDatabase => ({
  id: generateId(),
  name: 'Funcionarios CFT',
  officials: Array.isArray(officials) ? officials : [],
  createdAt: Date.now(),
});

const sanitizeDatabases = (input: unknown): OfficialDatabase[] => {
  if (!Array.isArray(input)) return [];
  return input
    .filter((db) => db && typeof db === 'object')
    .map((db: any) => ({
      id: String(db.id || generateId()),
      name: String(db.name || 'Base sin nombre'),
      officials: Array.isArray(db.officials) ? db.officials : [],
      createdAt: Number(db.createdAt) || Date.now(),
    }));
};

const INITIAL_OFFICIALS_DATA: Official[] = [
  { id: generateId(), name: "David Alejandro Alarcón Sandoval", gender: Gender.Male, title: "Sr.", position: "Coordinador", department: "Subdirección Académica", stament: "Técnico", email: "d.alarcon@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Natalia Carolina Álvarez Rojas", gender: Gender.Female, title: "Sra.", position: "Coordinador", department: "Subdirección Académica", stament: "Técnico", email: "n.alvarez@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Yoselin Estefanía Aranda Valderrama", gender: Gender.Female, title: "Sra.", position: "Coordinador", department: "Subdirección Académica", stament: "Técnico", email: "y.aranda@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Carlos Alberto Araos Uribe", gender: Gender.Male, title: "Sr.", position: "Rector", department: "Rectoría", stament: "Directivo", email: "rector@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Gloria Noemí Bolaño Gavia", gender: Gender.Female, title: "Sra.", position: "Encargada de Finanzas", department: "Dirección Académica", stament: "Técnico", email: "g.bolano@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Rubén Boris Calderón Jaques", gender: Gender.Male, title: "Sr.", position: "Auxiliar de Operaciones", department: "Adquisiciones y Servicios", stament: "Auxiliar", email: "r.calderon@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "David Alberto Campos Araya", gender: Gender.Male, title: "Sr.", position: "Subdirector", department: "Subdirección de Administración y Finanzas", stament: "Profesional", email: "contabilidad@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Jennifer Roxana Cancino Andrade", gender: Gender.Female, title: "Sra.", position: "Auxiliar", department: "Servicios Generales", stament: "Auxiliar", email: "jennifer.cancino@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Marcelo Alejandro Cárdenas Neira", gender: Gender.Male, title: "Sr.", position: "Jefe de Carrera", department: "Subdirección Académica", stament: "Profesional", email: "jc.informatica@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Aníbal Raúl Carrasco Mamani", gender: Gender.Male, title: "Sr.", position: "Asistente encargado", department: "Conectividad y Redes", stament: "Administrativo", email: "asis.conectividad@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Jacqueline Carmen Castillo Roblero", gender: Gender.Female, title: "Sra.", position: "Subdirector", department: "DIAC", stament: "Profesional", email: "vinculacion@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Juan Carlos Cejas Rivera", gender: Gender.Male, title: "Sr.", position: "Encargado de Adquisiciones", department: "Adquisiciones y Servicios", stament: "Técnico", email: "adquisiciones@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Guillermo Javier Cid Araneda", gender: Gender.Male, title: "Sr.", position: "Subdirector", department: "Subdirección Académica", stament: "Profesional", email: "areasformativas@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Ana Karen Cofré Segovia", gender: Gender.Female, title: "Sra.", position: "Asistente encargado", department: "Subdirección de Administración y Finanzas", stament: "Técnico", email: "asistente.gestiondepersonas@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Mercedes Del Carmen Corrales Salas", gender: Gender.Female, title: "Sra.", position: "Subdirector", department: "Dirección Académica", stament: "Directivo", email: "diac@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Sebastián Alejandro Díaz Campos", gender: Gender.Male, title: "Sr.", position: "Profesional", department: "Adquisiciones y Servicios", stament: "Profesional", email: "compraspublicas@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Karen Yanira Díaz Corona", gender: Gender.Female, title: "Sra.", position: "Profesional", department: "DIAC", stament: "Profesional", email: "serviciosocial@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Nicol Camila Díaz Tupa", gender: Gender.Female, title: "Sra.", position: "Asistente De", department: "DEA", stament: "Administrativo", email: "asistente.contable@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Silvia Yanet Esquivel Díaz", gender: Gender.Female, title: "Sra.", position: "Asistente De", department: "RECTORÍA", stament: "Administrativo", email: "asistente.rectoria@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Sebastián Ignacio Flores Briones", gender: Gender.Male, title: "Sr.", position: "Coordinador", department: "DIAC", stament: "Profesional", email: "s.flores@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
  { id: generateId(), name: "Alfonso Eleazar Fuentes Díaz", gender: Gender.Male, title: "Sr.", position: "Asistente De", department: "DEA", stament: "Administrativo", email: "a.fuentes@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" }
];

export default function App() {
  // --- STATE ---
  
  // Databases State (Migration Logic Included)
  const [databases, setDatabases] = useState<OfficialDatabase[]>(() => {
    const savedDbs = sanitizeDatabases(safeParseJson(localStorage.getItem('app_databases'), []));
    if (savedDbs.length > 0) {
      return savedDbs;
    }
    
    // Migration: If no DBs exist but old officials_db exists, migrate it.
    const initialData = safeParseJson(localStorage.getItem('officials_db'), INITIAL_OFFICIALS_DATA);
    return [createDefaultDatabase(Array.isArray(initialData) ? initialData : INITIAL_OFFICIALS_DATA)];
  });

  const [activeDbId, setActiveDbId] = useState<string>(() => {
      const savedActive = localStorage.getItem('active_db_id');
      const exists = savedActive ? databases.some((db) => db.id === savedActive) : false;
      return exists ? savedActive as string : (databases[0]?.id || '');
  });

  // Derived State: The officials of the currently selected database
  const activeDbIndex = databases.findIndex(db => db.id === activeDbId);
  const activeDatabase = activeDbIndex >= 0 ? databases[activeDbIndex] : databases[0];
  const officials = activeDatabase?.officials || [];

  const [view, setView] = useState<ViewState>('dashboard');
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [template, setTemplate] = useState<EmailTemplate>(() => {
    return safeParseJson(localStorage.getItem('current_template'), { subject: '', body: 'Estimado/a {nombre},\n\nEscriba aquí el contenido del correo...\n\nAtentamente,\n[Su Nombre]' });
  });

  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(() => {
    return safeParseJson(localStorage.getItem('saved_templates'), []);
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [sentHistory, setSentHistory] = useState<string[]>(() => {
     return safeParseJson(localStorage.getItem('sent_history'), []);
  });
  
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Database UI States
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const [dbModal, setDbModal] = useState<{isOpen: boolean, mode: 'create' | 'rename', value: string}>({
      isOpen: false,
      mode: 'create',
      value: ''
  });
  
  // Import Conflict State
  const [importConflict, setImportConflict] = useState<{
      newOfficials: Official[];
      duplicates: { existing: Official; incoming: Official }[];
  } | null>(null);
  
  // List State (Persisted in App to survive view changes)
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({ type: 'none' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbImportInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE ---
  useEffect(() => { 
      localStorage.setItem('app_databases', JSON.stringify(databases)); 
      // Legacy support/backup (optional, keeping it in sync with active DB for safety)
      if (activeDatabase) {
         localStorage.setItem('officials_db', JSON.stringify(activeDatabase.officials));
      }
  }, [databases, activeDatabase]);

  useEffect(() => { localStorage.setItem('active_db_id', activeDbId); }, [activeDbId]);
  useEffect(() => {
    if (databases.length === 0) {
      const fallback = createDefaultDatabase();
      setDatabases([fallback]);
      setActiveDbId(fallback.id);
      return;
    }

    if (!databases.some((db) => db.id === activeDbId)) {
      setActiveDbId(databases[0].id);
    }
  }, [databases, activeDbId]);
  useEffect(() => { localStorage.setItem('current_template', JSON.stringify(template)); }, [template]);
  useEffect(() => { localStorage.setItem('saved_templates', JSON.stringify(savedTemplates)); }, [savedTemplates]);
  useEffect(() => { localStorage.setItem('sent_history', JSON.stringify(sentHistory)); }, [sentHistory]);

  // --- HELPERS ---
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts(prev => [...prev, { id: generateId(), message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Helper to update the officials list of the CURRENT active database
  const updateActiveDbOfficials = (newOfficials: Official[] | ((prev: Official[]) => Official[])) => {
      setDatabases(prevDbs => {
          return prevDbs.map(db => {
              if (db.id === activeDbId) {
                  const updatedOfficials = typeof newOfficials === 'function' 
                    ? newOfficials(db.officials) 
                    : newOfficials;
                  return { ...db, officials: updatedOfficials };
              }
              return db;
          });
      });
  };

  // --- HANDLERS ---
  const handleNavigate = (targetView: ViewState, filter?: FilterCriteria) => {
      setView(targetView);
      if (filter) setFilterCriteria(filter);
      if (targetView === 'database') setShowForm(false);
      setIsMobileMenuOpen(false);
  };

  const handleClearFilter = () => {
    setFilterCriteria({ type: 'none' });
  };

  const handleSaveOfficial = (data: Omit<Official, 'id'>) => {
    if (editingOfficial) {
      updateActiveDbOfficials(prev => prev.map(o => o.id === editingOfficial.id ? { ...data, id: editingOfficial.id } : o));
      addToast("Funcionario actualizado correctamente", 'success');
    } else {
      updateActiveDbOfficials(prev => [...prev, { ...data, id: generateId() }]);
      addToast("Funcionario creado correctamente", 'success');
    }
    setShowForm(false);
    setEditingOfficial(null);
  };

  const handleDeleteOfficial = (id: string) => {
    setDeleteId(id);
  };

  const confirmDeleteOfficial = () => {
    if (deleteId) {
        updateActiveDbOfficials(prev => prev.filter(o => o.id !== deleteId));
        addToast("Funcionario eliminado", 'success');
        setDeleteId(null);
    }
  };

  const handleBulkDelete = (ids: string[]) => {
      if (window.confirm(`¿Estás seguro de que deseas eliminar ${ids.length} funcionarios seleccionados?`)) {
          updateActiveDbOfficials(prev => prev.filter(o => !ids.includes(o.id)));
          addToast(`${ids.length} funcionarios eliminados`, 'success');
      }
  };
  
  const handleClearDatabaseRequest = () => {
    if (officials.length === 0) {
        addToast("La base de datos ya está vacía.", "info");
        return;
    }
    setShowClearConfirm(true);
  };

  const executeClearDatabase = () => {
     updateActiveDbOfficials([]);
     setEditingOfficial(null);
     setShowForm(false);
     setShowClearConfirm(false);
     addToast(`Base de datos "${activeDatabase.name}" vaciada`, 'success');
  };

  const handleBulkUpdate = (ids: string[], field: keyof Official, value: any) => {
      updateActiveDbOfficials(prev => prev.map(o => ids.includes(o.id) ? { ...o, [field]: value } : o));
      addToast(`${ids.length} registros actualizados`, 'success');
  };

  const handleEditOfficial = (official: Official) => {
      setEditingOfficial(official);
      setShowForm(true);
      setView('database');
  };

  const handleMarkAsSent = (id: string) => {
      if (!sentHistory.includes(id)) {
          setSentHistory(prev => [...prev, id]);
      }
  };

  // --- DATABASE MANAGEMENT HANDLERS ---
  const handleCreateDatabase = () => {
      setDbModal({ isOpen: true, mode: 'create', value: '' });
  };

  const handleRenameDatabase = () => {
      setDbModal({ isOpen: true, mode: 'rename', value: activeDatabase.name });
  };

  const submitDbModal = (e: React.FormEvent) => {
      e.preventDefault();
      const name = dbModal.value.trim();
      if (!name) return;

      if (dbModal.mode === 'create') {
          const newDb: OfficialDatabase = {
              id: generateId(),
              name,
              officials: [],
              createdAt: Date.now()
          };
          setDatabases(prev => [...prev, newDb]);
          setActiveDbId(newDb.id);
          addToast(`Base de datos "${name}" creada`, 'success');
      } else {
          setDatabases(prev => prev.map(db => db.id === activeDbId ? { ...db, name } : db));
          addToast("Nombre actualizado", 'success');
      }
      setDbModal({ ...dbModal, isOpen: false });
  };

  const handleDeleteDatabase = () => {
      if (databases.length <= 1) {
          addToast("No puedes eliminar la única base de datos.", "error");
          return;
      }
      if (confirm(`¿Estás seguro de que deseas ELIMINAR COMPLETAMENTE la base de datos "${activeDatabase.name}"? Esta acción no se puede deshacer.`)) {
          const newDbs = databases.filter(db => db.id !== activeDbId);
          setDatabases(newDbs);
          setActiveDbId(newDbs[0].id);
          addToast("Base de datos eliminada", 'success');
      }
  };

  const handleExportDatabase = () => {
      const jsonStr = JSON.stringify(activeDatabase, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DB_${activeDatabase.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(`Base de datos "${activeDatabase.name}" exportada`, "success");
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const importedDb = JSON.parse(event.target?.result as string);
              if (importedDb.officials && Array.isArray(importedDb.officials)) {
                  // Ensure unique ID for the imported DB to prevent collisions
                  const newDb: OfficialDatabase = {
                      ...importedDb,
                      id: generateId(),
                      name: importedDb.name + ' (Importada)',
                      createdAt: Date.now()
                  };
                  setDatabases(prev => [...prev, newDb]);
                  setActiveDbId(newDb.id);
                  addToast(`Base de datos "${importedDb.name}" importada exitosamente`, "success");
              } else {
                  addToast("Formato de base de datos inválido", "error");
              }
          } catch (err) {
              console.error(err);
              addToast("Error al leer el archivo", "error");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  // Template Handlers
  const handleSaveTemplate = (name: string) => {
      const newTemplate: SavedTemplate = {
          ...template,
          id: generateId(),
          name,
          createdAt: Date.now()
      };
      setSavedTemplates(prev => [...prev, newTemplate]);
      addToast("Plantilla guardada", 'success');
  };

  const handleDeleteTemplate = (id: string) => {
      if (window.confirm("¿Eliminar esta plantilla?")) {
          setSavedTemplates(prev => prev.filter(t => t.id !== id));
          addToast("Plantilla eliminada", 'success');
      }
  };

  // Import/Export
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await getXlsxModule();
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
            addToast("El archivo Excel parece vacío", "error");
            return;
        }

        const parsedOfficials: Official[] = data.map((row: any) => {
          // Explicitly check for Spanish "Género" and other common variations
          const rawGender = row['Género'] || row['Genero'] || row['gender'] || row['Gender'] || row['sex'] || row['sexo'];
          
          return {
            id: generateId(), // Temporary ID, might be discarded if duplicate
            name: row.Nombre || row.name || 'Sin Nombre',
            email: row.Correo || row.email || '',
            gender: parseGender(rawGender),
            title: row.Titulo || 'Sr./Sra.',
            department: row.Departamento || row.department || '',
            position: row.Cargo || row.position || '',
            stament: row.Estamento || '',
            bossName: row.Jefatura || '',
            bossPosition: row.CargoJefatura || '',
            bossEmail: row.CorreoJefatura || ''
          };
        });

        // Verification Logic
        const newUnique: Official[] = [];
        const duplicates: { existing: Official; incoming: Official }[] = [];

        // Helper to find existing official
        const findExisting = (incoming: Official) => {
            // Check by Email first
            if (incoming.email && incoming.email.includes('@')) {
                const match = officials.find(o => o.email.trim().toLowerCase() === incoming.email.trim().toLowerCase());
                if (match) return match;
            }
            // Fallback: Check by Name if email is missing or invalid
            if (!incoming.email || !incoming.email.includes('@')) {
                const match = officials.find(o => o.name.trim().toLowerCase() === incoming.name.trim().toLowerCase());
                if (match) return match;
            }
            return undefined;
        };

        parsedOfficials.forEach(incoming => {
            const existing = findExisting(incoming);
            if (existing) {
                duplicates.push({ existing, incoming });
            } else {
                newUnique.push(incoming);
            }
        });

        if (duplicates.length > 0) {
            setImportConflict({ newOfficials: newUnique, duplicates });
        } else {
            updateActiveDbOfficials(prev => [...prev, ...newUnique]);
            addToast(`${newUnique.length} funcionarios importados a "${activeDatabase.name}"`, 'success');
        }

      } catch (err) {
        console.error(err);
        addToast("Error al procesar el archivo Excel", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const resolveImportConflict = (action: 'skip' | 'overwrite') => {
      if (!importConflict) return;

      if (action === 'skip') {
          // Only add the new unique ones
          if (importConflict.newOfficials.length > 0) {
              updateActiveDbOfficials(prev => [...prev, ...importConflict.newOfficials]);
              addToast(`${importConflict.newOfficials.length} funcionarios nuevos importados`, 'success');
          } else {
              addToast("No se importaron registros (todos eran duplicados)", 'info');
          }
      } else if (action === 'overwrite') {
          // Map incoming duplicates by their MATCHING existing ID
          const updatesMap = new Map();
          importConflict.duplicates.forEach(d => {
              updatesMap.set(d.existing.id, d.incoming);
          });

          updateActiveDbOfficials(prev => {
              // Update existing officials if they are in the map
              const updatedExisting = prev.map(o => {
                  if (updatesMap.has(o.id)) {
                      const incomingData = updatesMap.get(o.id);
                      // Preserve the ID of the existing record to maintain history/references
                      return { ...incomingData, id: o.id }; 
                  }
                  return o;
              });
              // Append new unique officials
              return [...updatedExisting, ...importConflict.newOfficials];
          });
          
          addToast(`${importConflict.newOfficials.length} nuevos y ${importConflict.duplicates.length} actualizados`, 'success');
      }

      setImportConflict(null);
  };

  const handleExportExcel = async () => {
      const dataToExport = officials.map(o => ({
          Nombre: o.name,
          Correo: o.email,
          'Género': o.gender,
          Titulo: o.title,
          Departamento: o.department,
          Cargo: o.position,
          Estamento: o.stament,
          Jefatura: o.bossName,
          CargoJefatura: o.bossPosition,
          CorreoJefatura: o.bossEmail
      }));

      const XLSX = await getXlsxModule();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeDatabase.name.substring(0, 30));
      XLSX.writeFile(wb, `${activeDatabase.name.replace(/\s+/g, '_')}_Export.xlsx`);
      addToast("Archivo Excel exportado", "success");
  };

  const handleExportBackup = () => {
      const backup = {
          timestamp: Date.now(),
          databases, // Export ALL databases
          activeDbId,
          template,
          savedTemplates,
          sentHistory
      };
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_gestor_completo_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Copia de seguridad completa descargada", "success");
  };

  const handleImportBackup = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              // Handle legacy backups
              if (json.officials && !json.databases) {
                   const legacyDb: OfficialDatabase = {
                       id: generateId(),
                       name: 'Restaurado (Legacy)',
                       officials: json.officials,
                       createdAt: Date.now()
                   };
                   setDatabases(prev => [...prev, legacyDb]);
                   setActiveDbId(legacyDb.id);
              } 
              // Handle new backups
              else if (json.databases) {
                  const importedDatabases = sanitizeDatabases(json.databases);
                  if (importedDatabases.length === 0) {
                      addToast('El respaldo no contiene bases de datos válidas', 'error');
                      return;
                  }

                  setDatabases(importedDatabases);
                  const importedActive = typeof json.activeDbId === 'string' ? json.activeDbId : '';
                  const hasImportedActive = importedDatabases.some((db) => db.id === importedActive);
                  setActiveDbId(hasImportedActive ? importedActive : importedDatabases[0].id);
              }
              
              if (json.template) setTemplate(json.template);
              if (json.savedTemplates) setSavedTemplates(json.savedTemplates);
              if (json.sentHistory) setSentHistory(json.sentHistory);
              addToast("Sistema restaurado exitosamente", "success");
          } catch (err) {
              addToast("Archivo de respaldo inválido", "error");
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
      <input type="file" ref={dbImportInputRef} onChange={handleImportDatabase} className="hidden" accept=".json" />

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
                <Briefcase className="text-white w-6 h-6" />
            </div>
            <div>
                <h1 className="text-white font-bold text-lg leading-tight">Gestor AI</h1>
                <p className="text-xs text-slate-500">Correos Corporativos</p>
            </div>
        </div>

        {/* Database Switcher */}
        <div className="px-4 py-4 border-b border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Base de Datos</span>
                <button onClick={() => setIsDbMenuOpen(!isDbMenuOpen)} className="hover:text-white transition-colors">
                    <Settings className="w-3 h-3" />
                </button>
            </div>
            
            <div className="relative">
                <button 
                    onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg flex items-center justify-between text-sm transition-colors border border-slate-700"
                >
                    <span className="truncate flex-1 text-left font-medium">{activeDatabase.name}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isDbMenuOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                        <div className="max-h-48 overflow-y-auto">
                            {databases.map(db => (
                                <button
                                    key={db.id}
                                    onClick={() => { setActiveDbId(db.id); setIsDbMenuOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${activeDbId === db.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                                >
                                    <span className="truncate">{db.name}</span>
                                    {activeDbId === db.id && <CheckCircle2 className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                        <div className="border-t border-slate-700 p-1 space-y-1">
                             <button onClick={() => { handleCreateDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-xs text-indigo-400 hover:bg-slate-700 rounded flex items-center gap-2">
                                <Plus className="w-3 h-3" /> Crear Nueva BD
                             </button>
                             <button onClick={() => { dbImportInputRef.current?.click(); setIsDbMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-700 rounded flex items-center gap-2">
                                <FolderInput className="w-3 h-3" /> Importar BD (JSON)
                             </button>
                             <div className="border-t border-slate-700 my-1"></div>
                             <button onClick={() => { handleRenameDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-700 rounded flex items-center gap-2">
                                <PenLine className="w-3 h-3" /> Renombrar Actual
                             </button>
                             <button onClick={() => { handleExportDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-700 rounded flex items-center gap-2">
                                <FolderOutput className="w-3 h-3" /> Exportar Actual (JSON)
                             </button>
                             {databases.length > 1 && (
                                <button onClick={() => { handleDeleteDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-xs text-red-400 hover:bg-slate-700 rounded flex items-center gap-2">
                                    <Trash2 className="w-3 h-3" /> Eliminar Actual
                                </button>
                             )}
                        </div>
                    </div>
                )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-right">
                {officials.length} registros
            </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
                onClick={() => handleNavigate('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
            </button>
            <button 
                onClick={() => handleNavigate('database')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'database' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <Database className="w-5 h-5" />
                Base de Datos
            </button>
            <button 
                onClick={() => handleNavigate('template')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'template' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <FileEdit className="w-5 h-5" />
                Editor Plantilla
            </button>
            <button 
                onClick={() => handleNavigate('generate')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === 'generate' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <Send className="w-5 h-5" />
                Generar y Enviar
            </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">Estado del Sistema</p>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-medium text-slate-300">BD: {activeDatabase.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-xs font-medium text-slate-300">v1.3.1 Multi-DB</span>
                </div>
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Gestor AI ({activeDatabase.name})
              </div>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  <Menu className="w-6 h-6" />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
              
              {/* Overlay for mobile menu */}
              {isMobileMenuOpen && (
                  <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
              )}

              {/* View Content */}
              <div className="max-w-7xl mx-auto">
                  
                  <Suspense fallback={<div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">Cargando vista...</div>}>
                  {view === 'dashboard' && (
                      <Dashboard 
                        officials={officials} 
                        sentHistory={sentHistory}
                        onNavigate={handleNavigate}
                        onImport={() => fileInputRef.current?.click()}
                        onExportExcel={handleExportExcel}
                        onNewOfficial={() => { setView('database'); setShowForm(true); setEditingOfficial(null); }}
                        onExportBackup={handleExportBackup}
                        onImportBackup={handleImportBackup}
                        onClearDatabase={handleClearDatabaseRequest}
                      />
                  )}

                  {view === 'database' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                      Base de Datos: <span className="text-indigo-600">{activeDatabase.name}</span>
                                  </h2>
                                  <p className="text-slate-500">Administrando registros para {activeDatabase.name}.</p>
                              </div>
                              {!showForm && (
                                  <div className="flex gap-2">
                                     <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-colors"
                                        title="Importar Excel a esta BD"
                                     >
                                         <Upload className="w-4 h-4" />
                                         <span className="hidden sm:inline">Importar</span>
                                     </button>
                                     <button 
                                        onClick={handleExportExcel}
                                        className="px-3 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-colors"
                                        title="Exportar Excel de esta BD"
                                     >
                                         <FileSpreadsheet className="w-4 h-4" />
                                         <span className="hidden sm:inline">Exportar</span>
                                     </button>
                                     <button 
                                        onClick={() => { setEditingOfficial(null); setShowForm(true); }}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
                                      >
                                          <Plus className="w-4 h-4" />
                                          Nuevo
                                      </button>
                                  </div>
                              )}
                          </div>

                          {showForm ? (
                              <OfficialForm 
                                initialData={editingOfficial}
                                existingOfficials={officials}
                                onSave={handleSaveOfficial}
                                onCancel={() => { setShowForm(false); setEditingOfficial(null); }}
                              />
                          ) : (
                              <OfficialList 
                                officials={officials}
                                onEdit={handleEditOfficial}
                                onDelete={handleDeleteOfficial}
                                onBulkDelete={handleBulkDelete}
                                onBulkUpdate={handleBulkUpdate}
                                sortOption={sortOption}
                                onSortChange={setSortOption}
                                initialFilter={filterCriteria}
                                onClearFilter={handleClearFilter}
                              />
                          )}
                      </div>
                  )}

                  {view === 'template' && (
                      <div className="h-[calc(100vh-8rem)]">
                           <div className="mb-4">
                              <h2 className="text-2xl font-bold text-slate-800">Editor de Plantilla</h2>
                              <p className="text-slate-500">Diseña el correo base. (La plantilla se comparte entre bases de datos).</p>
                          </div>
                          <TemplateEditor 
                            template={template}
                            onChange={setTemplate}
                            files={files}
                            onFilesChange={setFiles}
                            officials={officials}
                            onToast={(msg, type) => addToast(msg, type)}
                            savedTemplates={savedTemplates}
                            onSaveTemplate={handleSaveTemplate}
                            onDeleteTemplate={handleDeleteTemplate}
                          />
                      </div>
                  )}

                  {view === 'generate' && (
                       <div className="space-y-6">
                           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                  <h2 className="text-2xl font-bold text-slate-800">Generador de Correos</h2>
                                  <p className="text-slate-500">Enviando a base de datos: <strong className="text-indigo-600">{activeDatabase.name}</strong></p>
                              </div>
                          </div>
                          <Generator 
                            officials={officials}
                            template={template}
                            files={files}
                            sentHistory={sentHistory}
                            onMarkAsSent={handleMarkAsSent}
                            onToast={(msg, type) => addToast(msg, type)}
                          />
                       </div>
                  )}
                  </Suspense>
              </div>
          </div>
      </main>

      {/* Database Create/Rename Modal */}
      {dbModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800">
                          {dbModal.mode === 'create' ? 'Nueva Base de Datos' : 'Renombrar Base de Datos'}
                      </h3>
                  </div>
                  <form onSubmit={submitDbModal} className="p-6">
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                          <input 
                            autoFocus
                            type="text" 
                            value={dbModal.value}
                            onChange={(e) => setDbModal({ ...dbModal, value: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ej. Honorarios 2024"
                          />
                      </div>
                      <div className="flex gap-3 justify-end">
                          <button 
                            type="button"
                            onClick={() => setDbModal({ ...dbModal, isOpen: false })}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                            type="submit"
                            disabled={!dbModal.value.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {dbModal.mode === 'create' ? 'Crear' : 'Guardar'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Confirmation Modal for Clearing Database */}
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

      {/* Import Conflict Modal */}
      {importConflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-100 animate-in zoom-in-95 duration-200">
                  <div className="bg-amber-50 p-6 flex items-start gap-4 border-b border-amber-100">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-amber-900">Conflicto de Importación</h3>
                          <p className="text-amber-700 mt-1 text-sm">
                              El archivo contiene registros que ya existen en <strong>{activeDatabase.name}</strong>.
                          </p>
                      </div>
                  </div>
                  <div className="p-6">
                      <div className="flex gap-4 mb-6">
                          <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                              <span className="block text-2xl font-bold text-slate-700">{importConflict.newOfficials.length}</span>
                              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Nuevos</span>
                          </div>
                          <div className="flex-1 bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
                              <span className="block text-2xl font-bold text-amber-700">{importConflict.duplicates.length}</span>
                              <span className="text-xs text-amber-600 font-medium uppercase tracking-wide">Duplicados</span>
                          </div>
                      </div>

                      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                          ¿Qué deseas hacer con los <strong>{importConflict.duplicates.length} registros duplicados</strong>?
                      </p>

                      <div className="flex flex-col gap-3 sm:flex-row">
                           <button 
                            onClick={() => setImportConflict(null)}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                          >
                              Cancelar
                          </button>
                          <div className="flex-1 flex gap-2">
                             <button 
                                onClick={() => resolveImportConflict('skip')}
                                className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <SkipForward className="w-4 h-4" />
                                Omitir
                            </button>
                            <button 
                                onClick={() => resolveImportConflict('overwrite')}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Actualizar
                            </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Confirmation Modal for Deleting Single Official */}
      {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-red-100 animate-in zoom-in-95 duration-200">
                  <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                          <Trash2 className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="text-lg font-bold text-red-900">¿Eliminar Funcionario?</h3>
                      <p className="text-red-700 mt-1 text-sm">
                          Esta acción solo afecta a la base <strong>{activeDatabase.name}</strong>.
                      </p>
                  </div>
                  <div className="p-4 flex gap-3">
                      <button 
                        onClick={() => setDeleteId(null)}
                        className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm"
                      >
                          Cancelar
                  </button>
                      <button 
                        onClick={confirmDeleteOfficial}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-colors text-sm"
                      >
                          Eliminar
                  </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
