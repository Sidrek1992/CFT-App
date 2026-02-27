
import React, { useState, useEffect, useRef, useMemo, lazy, Suspense, Component, ErrorInfo } from 'react';

// ─── Error Boundary for safe lazy component rendering ─────────────────────────
class OrgChartErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[OrgChart] Runtime error:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center p-8">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Error al cargar el Organigrama</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-4">{this.state.error?.message ?? 'Error desconocido'}</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
import { FileEdit, Send, Plus, Database, LayoutDashboard, Upload, Download, AlertTriangle, X, RefreshCw, SkipForward, Trash2, FileSpreadsheet, Menu, Briefcase, CheckCircle2, Settings, ChevronDown, FolderPlus, PenLine, FolderInput, FolderOutput, Network, LogOut, Moon, Sun, Inbox, Loader2, Shield } from 'lucide-react';
import { Official, EmailTemplate, ViewState, ToastNotification, SavedTemplate, Gender, SortOption, FilterCriteria, OfficialDatabase, Campaign, EmailLog, UserProfile, UserRole, ROLE_LABELS, ROLE_COLORS } from './types';
import { bootstrapUserProfile, subscribeToMyProfile, canEdit, canSendEmails, canManageRoles } from './services/rolesService';
import { useRBAC } from './hooks/useRBAC';
import { ProtectedView } from './components/rbac/ProtectedView';
import { OfficialForm } from './components/OfficialForm';
import { OfficialList } from './components/OfficialList';
import { OfficialDrawer } from './components/OfficialDrawer';
import { ToastContainer } from './components/ToastContainer';
import { dbService } from './services/dbService';
import { subscribeToAuthChanges, logout, initAutoRefreshForUser } from './services/authService';
import { clearTokenState } from './services/tokenService';
import { Login } from './components/Login';
import { User } from 'firebase/auth';

// ─── Lazy-loaded heavy components ────────────────────────────────────────────
// These chunks are only downloaded when the user navigates to those sections.
const TemplateEditor = lazy(() => import('./components/TemplateEditor').then(m => ({ default: m.TemplateEditor })));
const Generator      = lazy(() => import('./components/Generator').then(m => ({ default: m.Generator })));
const Dashboard      = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const OrgChart       = lazy(() => import('./components/OrgChart').then(m => ({ default: m.OrgChart })));
const InboxView      = lazy(() => import('./components/InboxView').then(m => ({ default: m.InboxView })));
const RolesManager   = lazy(() => import('./components/RolesManager').then(m => ({ default: m.RolesManager })));

// Shared loading skeleton shown while a lazy chunk is downloading
const LazyLoader: React.FC = () => (
    <div className="flex items-center justify-center h-64 w-full">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <p className="text-sm font-medium">Cargando módulo...</p>
        </div>
    </div>
);

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

const INITIAL_OFFICIALS_DATA: Official[] = [
    { id: generateId(), name: "David Alejandro Alarcón Sandoval", gender: Gender.Male, title: "Sr.", position: "Coordinador", department: "Subdirección Académica", stament: "Técnico", email: "d.alarcon@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
    { id: generateId(), name: "Natalia Carolina Álvarez Rojas", gender: Gender.Female, title: "Sra.", position: "Coordinador", department: "Subdirección Académica", stament: "Técnico", email: "n.alvarez@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" },
    { id: generateId(), name: "Carlos Alberto Araos Uribe", gender: Gender.Male, title: "Sr.", position: "Rector", department: "Rectoría", stament: "Directivo", email: "rector@cftestatalaricayparinacota.cl", bossName: "", bossPosition: "", bossEmail: "" }
];

export default function App() {
    // --- AUTH STATE ---
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((currentUser) => {
            setUser(currentUser);
            setLoadingAuth(false);
            // Start silent token auto-refresh when user is authenticated
            if (currentUser) {
                initAutoRefreshForUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, []);

    // Bootstrap + real-time profile subscription
    useEffect(() => {
        if (!user) {
            setUserProfile(null);
            return;
        }
        let unsubProfile: (() => void) | null = null;

        bootstrapUserProfile(user).then(profile => {
            setUserProfile(profile);
            // Subscribe to live role changes (e.g. superadmin changes role from another tab)
            unsubProfile = subscribeToMyProfile(user.uid, (updated) => {
                if (updated) setUserProfile(updated);
            });
        }).catch(err => {
            console.error('[App] bootstrapUserProfile error:', err);
        });

        return () => { unsubProfile?.(); };
    }, [user]);

    // Derived permissions from role
    const userRole = userProfile?.role ?? 'reader';
    const canEditDb    = canEdit(userRole);
    const canSendMails = canSendEmails(userRole);
    const canManage    = canManageRoles(userRole);

    // Centralized RBAC context
    const rbac = useRBAC(userRole);

    // --- STATE ---

    const [databases, setDatabases] = useState<OfficialDatabase[]>(() => {
        // Migration: Initial empty state, will be hydrated from Firestore
        return [
            {
                id: generateId(),
                name: 'Funcionarios CFT',
                officials: INITIAL_OFFICIALS_DATA,
                campaigns: [],
                createdAt: Date.now()
            }
        ];
    });

    const [activeDbId, setActiveDbId] = useState<string>(() => {
        const savedActive = localStorage.getItem('active_db_id');
        return savedActive || (databases.length > 0 ? databases[0].id : '');
    });

    // Derived State: The officials of the currently selected database
    const activeDbIndex = databases.findIndex(db => db.id === activeDbId);
    const activeDatabase = activeDbIndex >= 0 ? databases[activeDbIndex] : databases[0];
    const officials = activeDatabase?.officials || [];
    const campaigns = activeDatabase?.campaigns || [];

    const [view, setView] = useState<ViewState>('dashboard');
    const [editingOfficial, setEditingOfficial] = useState<Official | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [drawerOfficial, setDrawerOfficial] = useState<Official | null>(null);

    const [template, setTemplate] = useState<EmailTemplate>({
        subject: '',
        body: 'Estimado/a {nombre},<br><br>Escribe aquí el contenido del correo...<br><br>Atentamente,<br>[Su Nombre]'
    });

    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);

    // True once the Firestore shared config snapshot has arrived at least once
    const [configLoaded, setConfigLoaded] = useState(false);


    const [files, setFiles] = useState<File[]>([]);

    // Bug #9: sentHistory is now derived from all campaign logs of the active DB
    // This ensures it stays in sync across users and sessions without a separate local copy
    const [sentHistory, setSentHistory] = useState<string[]>([]);

    // Derive sentHistory from campaign logs whenever campaigns change
    const derivedSentHistory = useMemo(() => {
        const ids = new Set<string>();
        campaigns.forEach(c => c.logs.forEach(l => ids.add(l.officialId)));
        return Array.from(ids);
    }, [campaigns]);

    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Dark Mode State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // Database UI States
    const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
    const [dbModal, setDbModal] = useState<{ isOpen: boolean, mode: 'create' | 'rename', value: string }>({
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

    // Keep refs to Firestore unsubscribe functions so handleLogout can cancel them
    // before calling signOut (avoids permission-denied errors mid-flight)
    const unsubscribeDbRef = useRef<(() => void) | null>(null);
    const unsubscribeConfigRef = useRef<(() => void) | null>(null);

    // --- PERSISTENCE ---

    // Real-time synchronization — only when authenticated
    useEffect(() => {
        if (!user) return;

        unsubscribeDbRef.current = dbService.subscribeToDatabases((dbs) => {
            if (dbs.length > 0) {
                setDatabases(dbs);
                setActiveDbId(prev => {
                    const exists = dbs.some(db => db.id === prev);
                    return exists ? prev : dbs[0].id;
                });
            }
        });

        unsubscribeConfigRef.current = dbService.subscribeToSharedConfig((config) => {
            if (config) {
                if (config.template) setTemplate(config.template);
                if (config.savedTemplates) setSavedTemplates(config.savedTemplates);
                if (config.sentHistory) setSentHistory(config.sentHistory);
            }
            setConfigLoaded(true);
        });

        return () => {
            unsubscribeDbRef.current?.();
            unsubscribeConfigRef.current?.();
            unsubscribeDbRef.current = null;
            unsubscribeConfigRef.current = null;
        };
    }, [user]);

    useEffect(() => { localStorage.setItem('active_db_id', activeDbId); }, [activeDbId]);

    // Always-fresh refs so the debounced auto-save never captures stale closures
    const templateRef      = useRef(template);
    const savedTemplatesRef = useRef(savedTemplates);
    useEffect(() => { templateRef.current = template; },       [template]);
    useEffect(() => { savedTemplatesRef.current = savedTemplates; }, [savedTemplates]);

    // Persist shared configurations to Firestore with a debounce to prevent excessive writes.
    // Uses refs instead of closure values so the write always uses the latest state,
    // even if React batched several state updates before the timer fires.
    useEffect(() => {
        if (!user) return;
        const timer = setTimeout(() => {
            dbService.saveSharedConfig({
                template: templateRef.current,
                savedTemplates: savedTemplatesRef.current,
            }).catch((err) => {
                console.error('[auto-save] Error al guardar en Firestore:', err);
            });
        }, 1500);
        return () => clearTimeout(timer);
    }, [template, savedTemplates, user]);

    // --- HELPERS ---
    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToasts(prev => [...prev, { id: generateId(), message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Helper to update the officials list of the CURRENT active database
    // Bug #6: Returns the promise so callers can handle errors if needed
    const updateActiveDb = async (updater: (db: OfficialDatabase) => OfficialDatabase) => {
        const activeDb = databases.find(db => db.id === activeDbId);
        if (activeDb) {
            const updatedDb = updater(activeDb);
            try {
                await dbService.saveDatabase(updatedDb);
            } catch (err) {
                console.error("Error al guardar cambios en Firestore:", err);
                addToast("Error al guardar los cambios. Verifica tu conexión.", 'error');
                throw err;
            }
        }
    };

    // ─── Migration helper — exposed on window for one-time use from dev console ─
    // Usage: await window.__migrateFixBossName('Carlos Araos Uribe', 'Carlos Alberto Araos Uribe')
    useEffect(() => {
        (window as any).__migrateFixBossName = async (oldName: string, newName: string) => {
            console.log(`\n🔍 Buscando "${oldName}" en ${databases.length} base(s)...`);
            let totalFixed = 0;
            for (const database of databases) {
                let modified = false;
                const updatedOfficials = database.officials.map(o => {
                    let changed = false;
                    const updated = { ...o };
                    if (o.bossName === oldName) { updated.bossName = newName; changed = true; }
                    if (o.name === oldName) { updated.name = newName; changed = true; }
                    if (changed) {
                        console.log(`  ✅ [${database.name}] ${o.name}: bossName "${oldName}" → "${newName}"`);
                        totalFixed++;
                        modified = true;
                    }
                    return updated;
                });
                if (modified) {
                    await dbService.saveDatabase({ ...database, officials: updatedOfficials });
                    console.log(`  💾 Base "${database.name}" guardada.`);
                }
            }
            console.log(`\n📊 ${totalFixed} campo(s) corregido(s). Recarga la app si no ves los cambios.`);
            return totalFixed;
        };
        return () => { delete (window as any).__migrateFixBossName; };
    }, [databases]);


    const updateActiveDbOfficials = async (newOfficials: Official[] | ((prev: Official[]) => Official[])) => {
        await updateActiveDb(db => ({
            ...db,
            officials: typeof newOfficials === 'function' ? newOfficials(db.officials) : newOfficials
        }));
    };

    // --- HANDLERS ---

    // Campaign Handlers
    const handleCampaignCreate = (name: string): Campaign => {
        const newCampaign: Campaign = {
            id: generateId(),
            name,
            subject: template.subject,
            createdAt: Date.now(),
            status: 'draft',
            logs: []
        };

        updateActiveDb(db => ({
            ...db,
            campaigns: [...(db.campaigns || []), newCampaign]
        }));

        return newCampaign;
    };

    const handleLogEmail = (campaignId: string, logData: Omit<EmailLog, 'id' | 'campaignId' | 'status'>, logId?: string) => {
        const newLog: EmailLog = {
            ...logData,
            id: logId ?? generateId(),
            campaignId,
            status: 'sent'
        };

        // Bug #9: sentHistory is now derived from campaign logs (derivedSentHistory),
        // so we only need to persist the log in the campaign — no separate sentHistory update needed.
        updateActiveDb(db => ({
            ...db,
            campaigns: (db.campaigns || []).map(c =>
                c.id === campaignId
                    ? { ...c, logs: [...c.logs, newLog] }
                    : c
            )
        }));
    };

    // View Handlers
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

    // --- DATABASE MANAGEMENT HANDLERS ---
    const handleCreateDatabase = () => {
        setDbModal({ isOpen: true, mode: 'create', value: '' });
    };

    const handleRenameDatabase = () => {
        setDbModal({ isOpen: true, mode: 'rename', value: activeDatabase.name });
    };

    const submitDbModal = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = dbModal.value.trim();
        if (!name) return;

        if (dbModal.mode === 'create') {
            const newDb: OfficialDatabase = {
                id: generateId(),
                name,
                officials: [],
                campaigns: [],
                createdAt: Date.now()
            };
            try {
                await dbService.saveDatabase(newDb);
                setActiveDbId(newDb.id);
                addToast(`Base de datos "${name}" creada`, 'success');
            } catch (err) {
                console.error("Error al crear base de datos:", err);
                addToast("Error al crear la base de datos", 'error');
            }
        } else {
            const activeDb = databases.find(db => db.id === activeDbId);
            if (activeDb) {
                const updatedDb = { ...activeDb, name };
                try {
                    await dbService.saveDatabase(updatedDb);
                    addToast("Nombre actualizado", 'success');
                } catch (err) {
                    console.error("Error al renombrar base de datos:", err);
                    addToast("Error al renombrar la base de datos", 'error');
                }
            }
        }
        setDbModal({ ...dbModal, isOpen: false });
    };

    const handleDeleteDatabase = async () => {
        if (databases.length <= 1) {
            addToast("No puedes eliminar la única base de datos.", "error");
            return;
        }
        if (confirm(`¿Estás seguro de que deseas ELIMINAR COMPLETAMENTE la base de datos "${activeDatabase.name}"? Esta acción no se puede deshacer.`)) {
            const idToDelete = activeDbId;
            const newDbs = databases.filter(db => db.id !== idToDelete);
            // Optimistic UI: switch to another DB immediately
            setActiveDbId(newDbs[0].id);
            try {
                await dbService.deleteDatabase(idToDelete);
                addToast("Base de datos eliminada", 'success');
            } catch (err) {
                console.error("Error al eliminar base de datos:", err);
                addToast("Error al eliminar la base de datos", 'error');
                // Revert optimistic update on failure
                setActiveDbId(idToDelete);
            }
        }
    };

    const handleExportDatabase = () => {
        const jsonStr = JSON.stringify(activeDatabase, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `DB_${activeDatabase.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast(`Base de datos "${activeDatabase.name}" exportada`, "success");
    };

    const handleImportDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
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

                    // Explicitly save the newly constructed database to Firestore
                    await dbService.saveDatabase(newDb);

                    // We don't necessarily need to setDatabases here as the real-time listener will pick it up,
                    // but to have immediate UI response and set as active:
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

    // Template Handlers — persist directly to Firestore for immediate response
    const handleSaveTemplate = async (name: string, category: import('./types').TemplateCategory) => {
        const newTemplate: SavedTemplate = {
            ...template,
            id: generateId(),
            name,
            category,
            archived: false,
            createdAt: Date.now()
        };
        const updated = [...savedTemplates, newTemplate];
        setSavedTemplates(updated);
        try {
            await dbService.saveSharedConfig({ template, savedTemplates: updated });
            addToast(`Plantilla "${name}" guardada en Firebase`, 'success');
        } catch (e) {
            console.error('Error guardando plantilla:', e);
            addToast('Error al guardar plantilla', 'error');
        }
    };

    const handleArchiveTemplate = async (id: string, archived: boolean) => {
        const updated = savedTemplates.map(t => t.id === id ? { ...t, archived } : t);
        setSavedTemplates(updated);
        try {
            await dbService.saveSharedConfig({ template, savedTemplates: updated });
            addToast(archived ? 'Plantilla archivada' : 'Plantilla restaurada', 'success');
        } catch (e) {
            console.error('Error archivando plantilla:', e);
            addToast('Error al archivar plantilla', 'error');
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (window.confirm("¿Eliminar esta plantilla?")) {
            const updated = savedTemplates.filter(t => t.id !== id);
            setSavedTemplates(updated);
            try {
                await dbService.saveSharedConfig({ template, savedTemplates: updated });
                addToast("Plantilla eliminada", 'success');
            } catch (e) {
                console.error('Error eliminando plantilla:', e);
                addToast('Error al eliminar plantilla', 'error');
            }
        }
    };

    // Import/Export
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        // async callback so we can properly await updateActiveDbOfficials → Firestore persistence
        reader.onload = async (evt) => {
            try {
                const buffer = evt.target?.result;
                const XLSX = await import('xlsx');
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
                        id: generateId(),
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
                    // Store conflict for user to resolve — resolution will await Firestore in resolveImportConflict
                    setImportConflict({ newOfficials: newUnique, duplicates });
                } else {
                    // Directly persist to Firestore (await ensures the save completes)
                    await updateActiveDbOfficials(prev => [...prev, ...newUnique]);
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

    const resolveImportConflict = async (action: 'skip' | 'overwrite') => {
        if (!importConflict) return;

        if (action === 'skip') {
            // Only add the new unique ones
            if (importConflict.newOfficials.length > 0) {
                await updateActiveDbOfficials(prev => [...prev, ...importConflict.newOfficials]);
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

            await updateActiveDbOfficials(prev => {
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

        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeDatabase.name.substring(0, 30));
        XLSX.writeFile(wb, `${activeDatabase.name.replace(/\s+/g, '_')}_Export.xlsx`);
        addToast("Archivo Excel exportado", "success");
    };

    const handleExportBackup = () => {
        // Bug #9: sentHistory removed from backup — it is derived from campaign logs in each DB
        const backup = {
            timestamp: Date.now(),
            databases, // Export ALL databases (campaigns with logs included)
            activeDbId,
            template,
            savedTemplates
        };
        const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `backup_gestor_completo_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast("Copia de seguridad completa descargada", "success");
    };

    const handleImportBackup = async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                // Handle legacy backups
                if (json.officials && !json.databases) {
                    const legacyDb: OfficialDatabase = {
                        id: generateId(),
                        name: 'Restaurado (Legacy)',
                        officials: json.officials,
                        campaigns: [],
                        createdAt: Date.now()
                    };
                    await dbService.saveDatabase(legacyDb);
                    setActiveDbId(legacyDb.id);
                }
                // Handle new backups
                else if (json.databases && Array.isArray(json.databases)) {
                    // Persist all restored databases to Firestore
                    await Promise.all(
                        (json.databases as OfficialDatabase[]).map(db => dbService.saveDatabase(db))
                    );
                    if (json.activeDbId) setActiveDbId(json.activeDbId);
                }

                if (json.template) setTemplate(json.template);
                if (json.savedTemplates) setSavedTemplates(json.savedTemplates);
                addToast("Sistema restaurado exitosamente", "success");
            } catch (err) {
                console.error("Error al importar backup:", err);
                addToast("Archivo de respaldo inválido o error al restaurar", "error");
            }
        };
        reader.readAsText(file);
    };

    const handleLogout = async () => {
        console.log("Cerrando sesión...");

        // 1. Force local state update IMMEDIATELY to show Login screen
        setUser(null);

        // 2. Cancel Firestore listeners
        unsubscribeDbRef.current?.();
        unsubscribeConfigRef.current?.();
        unsubscribeDbRef.current = null;
        unsubscribeConfigRef.current = null;

        // 3. Clear storage (clearTokenState handles all session token keys)
        localStorage.removeItem('active_db_id');
        localStorage.removeItem('current_template');
        localStorage.removeItem('saved_templates');
        localStorage.removeItem('officialFormDraft');
        clearTokenState();

        // 4. Attempt Firebase sign out in background
        try {
            await logout();
        } catch (error) {
            console.warn("Firebase signOut error (ignoring for UI):", error);
        }
    };

    if (loadingAuth) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-dark-950 text-slate-800 dark:text-slate-200 overflow-hidden font-sans relative">
            {/* Decorative background blurs — subtle in light, vivid in dark */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary-300/20 dark:bg-primary-900/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 z-0"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 z-0"></div>

            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Hidden File Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
            <input type="file" ref={dbImportInputRef} onChange={handleImportDatabase} className="hidden" accept=".json" />

            {/* --- SIDEBAR --- */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 glass-panel border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} m-4 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl`}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <Briefcase className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-slate-900 dark:text-white font-extrabold text-xl tracking-tight">GDP Cloud</h1>
                            <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-widest mt-0.5">Gestor Email</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-colors"
                        title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>

                {/* Database Switcher */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/50 bg-slate-900/5 dark:bg-black/10">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Base de Datos</span>
                        <button onClick={() => setIsDbMenuOpen(!isDbMenuOpen)} className="hover:text-primary-400 transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
                            className="w-full bg-white dark:bg-dark-900/70 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-900 dark:text-white p-3 rounded-xl flex items-center justify-between text-sm transition-all border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-inner group"
                        >
                            <span className="truncate flex-1 text-left font-medium group-hover:text-primary-300 transition-colors">{activeDatabase.name}</span>
                            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>

                        {/* Dropdown Menu */}
                        {isDbMenuOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-slate-100 dark:bg-dark-800 rounded-xl shadow-xl border border-slate-300 dark:border-slate-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    {databases.map(db => (
                                        <button
                                            key={db.id}
                                            onClick={() => { setActiveDbId(db.id); setIsDbMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${activeDbId === db.id ? 'bg-primary-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-700'}`}
                                        >
                                            <span className="truncate">{db.name}</span>
                                            {activeDbId === db.id && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-slate-300 dark:border-slate-700 p-2 space-y-1">
                                    {rbac.canCreateDb && (
                                        <button onClick={() => { handleCreateDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-primary-600 dark:text-primary-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded-lg flex items-center gap-2">
                                            <Plus className="w-3 h-3" /> Crear Nueva BD
                                        </button>
                                    )}
                                    {rbac.canImport && (
                                        <button onClick={() => { dbImportInputRef.current?.click(); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded-lg flex items-center gap-2">
                                            <FolderInput className="w-3 h-3" /> Importar BD (JSON)
                                        </button>
                                    )}
                                    {(rbac.canRenameDb || rbac.canExport || rbac.canDeleteDb) && (
                                        <div className="border-t border-slate-300 dark:border-slate-700 my-1"></div>
                                    )}
                                    {rbac.canRenameDb && (
                                        <button onClick={() => { handleRenameDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded-lg flex items-center gap-2">
                                            <PenLine className="w-3 h-3" /> Renombrar Actual
                                        </button>
                                    )}
                                    {rbac.canExport && (
                                        <button onClick={() => { handleExportDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded-lg flex items-center gap-2">
                                            <FolderOutput className="w-3 h-3" /> Exportar Actual (JSON)
                                        </button>
                                    )}
                                    {rbac.canDeleteDb && databases.length > 1 && (
                                        <button onClick={() => { handleDeleteDatabase(); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded-lg flex items-center gap-2">
                                            <Trash2 className="w-3 h-3" /> Eliminar Actual
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-2 text-right">
                        {officials.length} registros
                    </p>
                </div>

                <nav className="flex-1 min-h-0 px-3 py-2 space-y-1">
                    {/* Dashboard — all roles */}
                    {rbac.canView('dashboard') && (
                        <button
                            onClick={() => handleNavigate('dashboard')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${view === 'dashboard' ? 'bg-primary-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-primary-500/50' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                        >
                            <LayoutDashboard className={`w-5 h-5 flex-shrink-0 ${view === 'dashboard' ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'}`} />
                            Dashboard
                        </button>
                    )}

                    {/* Database — all roles (mutations gated inside) */}
                    {rbac.canView('database') && (
                        <button
                            onClick={() => handleNavigate('database')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${view === 'database' ? 'bg-primary-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-primary-500/50' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                        >
                            <Database className={`w-5 h-5 flex-shrink-0 ${view === 'database' ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'}`} />
                            Base de Datos
                        </button>
                    )}

                    {/* Org chart — all roles */}
                    {rbac.canView('orgChart') && (
                        <button
                            onClick={() => handleNavigate('orgChart')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${view === 'orgChart' ? 'bg-primary-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-primary-500/50' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                        >
                            <Network className={`w-5 h-5 flex-shrink-0 ${view === 'orgChart' ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'}`} />
                            Organigrama
                        </button>
                    )}

                    {/* Template editor — superadmin, admin */}
                    {rbac.canView('template') && (
                        <button
                            onClick={() => handleNavigate('template')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${view === 'template' ? 'bg-primary-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-primary-500/50' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                        >
                            <FileEdit className={`w-5 h-5 flex-shrink-0 ${view === 'template' ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'}`} />
                            Editor Plantilla
                        </button>
                    )}

                    {/* Generator — superadmin, admin, operator */}
                    {rbac.canView('generate') && (
                        <button
                            onClick={() => handleNavigate('generate')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${view === 'generate' ? 'bg-primary-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-primary-500/50' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                        >
                            <Send className={`w-5 h-5 flex-shrink-0 ${view === 'generate' ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'}`} />
                            Generar y Enviar
                        </button>
                    )}

                    {/* Inbox — superadmin, admin, operator */}
                    {rbac.canView('inbox') && (
                        <button
                            onClick={() => handleNavigate('inbox')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${view === 'inbox' ? 'bg-primary-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-primary-500/50' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                        >
                            <Inbox className={`w-5 h-5 flex-shrink-0 ${view === 'inbox' ? 'text-primary-100' : 'text-slate-600 dark:text-slate-400'}`} />
                            Bandeja de Respuestas
                        </button>
                    )}

                    {/* Roles panel — superadmin only */}
                    {rbac.canView('roles') && (
                        <>
                            <div className="my-2 border-t border-slate-200 dark:border-slate-800/50" />
                            <button
                                onClick={() => handleNavigate('roles')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${view === 'roles' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-red-500/50' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                            >
                                <Shield className={`w-5 h-5 flex-shrink-0 ${view === 'roles' ? 'text-red-100' : 'text-slate-600 dark:text-slate-400'}`} />
                                Gestión de Roles
                            </button>
                        </>
                    )}
                </nav>

                <div className="px-3 pb-3 pt-1 shrink-0">
                    <div className="glass-panel rounded-xl p-3 border border-slate-100 dark:border-white/5 shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{user.email}</span>
                                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full border ${userProfile ? ROLE_COLORS[userProfile.role] : 'text-slate-500 dark:text-slate-500'}`}>
                                        {userProfile ? ROLE_LABELS[userProfile.role] : 'Cargando...'} · Online
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                    className="p-1.5 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors"
                                    title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
                                >
                                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                                    title="Cerrar Sesión"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 w-full">

                {/* Mobile Header */}
                <div className="lg:hidden glass-panel border-b border-slate-200 dark:border-white/10 p-4 flex items-center justify-between m-4 rounded-3xl mb-0 sticky top-4 z-20">
                    <div className="flex items-center gap-3 font-bold text-slate-900 dark:text-white">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-white" />
                        </div>
                        Gestor AI
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">

                    {/* Overlay for mobile menu */}
                    {isMobileMenuOpen && (
                        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
                    )}

                    {/* View Content */}
                    <div className="max-w-7xl mx-auto">

                        {view === 'dashboard' && (
                            <ProtectedView allowed={rbac.canView('dashboard')} role={userRole} resource="Dashboard">
                                <Suspense fallback={<LazyLoader />}>
                                    <Dashboard
                                        officials={officials}
                                        campaigns={campaigns}
                                        sentHistory={derivedSentHistory}
                                        onNavigate={handleNavigate}
                                        onImport={() => fileInputRef.current?.click()}
                                        onExportExcel={handleExportExcel}
                                        onNewOfficial={() => { setView('database'); setShowForm(true); setEditingOfficial(null); }}
                                        onExportBackup={handleExportBackup}
                                        onImportBackup={handleImportBackup}
                                        onClearDatabase={handleClearDatabaseRequest}
                                    />
                                </Suspense>
                            </ProtectedView>
                        )}

                        {view === 'database' && (
                            <ProtectedView allowed={rbac.canView('database')} role={userRole} resource="Base de Datos">
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                Base de Datos: <span className="text-indigo-600 dark:text-indigo-400">{activeDatabase.name}</span>
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400">Administrando registros para {activeDatabase.name}.</p>
                                        </div>
                                        {!showForm && (
                                            <div className="flex gap-2">
                                                {/* Import — superadmin, admin only */}
                                                {rbac.canImport && (
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="px-3 py-2 bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 flex items-center gap-2 text-sm font-medium transition-colors"
                                                        title="Importar Excel a esta BD"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Importar</span>
                                                    </button>
                                                )}
                                                {/* Export — superadmin, admin only */}
                                                {rbac.canExport && (
                                                    <button
                                                        onClick={handleExportExcel}
                                                        className="px-3 py-2 bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 flex items-center gap-2 text-sm font-medium transition-colors"
                                                        title="Exportar Excel de esta BD"
                                                    >
                                                        <FileSpreadsheet className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Exportar</span>
                                                    </button>
                                                )}
                                                {/* Add official — superadmin, admin only */}
                                                {rbac.canAddOff && (
                                                    <button
                                                        onClick={() => { setEditingOfficial(null); setShowForm(true); }}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Nuevo
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {showForm ? (
                                        <OfficialForm
                                            initialData={editingOfficial}
                                            existingOfficials={officials}
                                            onSave={handleSaveOfficial}
                                            onCancel={() => { setShowForm(false); setEditingOfficial(null); }}
                                            onViewProfile={(official) => {
                                                setShowForm(false);
                                                setEditingOfficial(null);
                                                setFilterCriteria({ type: 'search', value: official.name });
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <OfficialList
                                                officials={officials}
                                                onEdit={rbac.canEditOff ? handleEditOfficial : undefined}
                                                onDelete={rbac.canDeleteOff ? handleDeleteOfficial : undefined}
                                                onBulkDelete={rbac.canDeleteOff ? handleBulkDelete : undefined}
                                                onBulkUpdate={rbac.canEditOff ? handleBulkUpdate : undefined}
                                                sortOption={sortOption}
                                                onSortChange={setSortOption}
                                                initialFilter={filterCriteria}
                                                onClearFilter={handleClearFilter}
                                                onQuickView={(o) => setDrawerOfficial(o)}
                                            />
                                            <OfficialDrawer
                                                official={drawerOfficial}
                                                allOfficials={officials}
                                                campaigns={campaigns}
                                                onClose={() => setDrawerOfficial(null)}
                                                onEdit={rbac.canEditOff ? (o) => { setDrawerOfficial(null); handleEditOfficial(o); } : undefined}
                                                onDelete={rbac.canDeleteOff ? (id) => { setDrawerOfficial(null); handleDeleteOfficial(id); } : undefined}
                                                onViewOfficial={(o) => setDrawerOfficial(o)}
                                            />
                                        </>
                                    )}
                                </div>
                            </ProtectedView>
                        )}

                        {view === 'orgChart' && (
                            <ProtectedView allowed={rbac.canView('orgChart')} role={userRole} resource="Organigrama">
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Organigrama</h2>
                                            <p className="text-slate-500 dark:text-slate-400">Visualización jerárquica basada en las jefaturas de la base de datos.</p>
                                        </div>
                                    </div>
                                    <OrgChartErrorBoundary>
                                        <Suspense fallback={<LazyLoader />}>
                                            <OrgChart officials={officials} />
                                        </Suspense>
                                    </OrgChartErrorBoundary>
                                </div>
                            </ProtectedView>
                        )}

                        {view === 'template' && (
                            <ProtectedView allowed={rbac.canView('template')} role={userRole} resource="Editor de Plantilla">
                                <div className="h-[calc(100vh-8rem)]">
                                    <div className="mb-4 flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Editor de Plantilla</h2>
                                            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                Diseña el correo base. Tus plantillas se guardan automáticamente en
                                                <span className="inline-flex items-center gap-1 text-orange-500 dark:text-orange-400 font-medium">
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 32 32" fill="currentColor"><path d="M19.62 11.558l-3.203 9.983-3.202-9.983H6.501L3 21.541l-3.501-9.983H-2l4.001 11.425h2.8l3.201-9.184 3.2 9.184H14l4-11.425z" transform="translate(7 5)" /></svg>
                                                    Firebase
                                                </span>
                                            </p>
                                        </div>
                                        {!configLoaded && (
                                            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-dark-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                                                Cargando plantillas...
                                            </div>
                                        )}
                                    </div>
                                    <Suspense fallback={<LazyLoader />}>
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
                                            onArchiveTemplate={handleArchiveTemplate}
                                        />
                                    </Suspense>
                                </div>
                            </ProtectedView>
                        )}


                        {view === 'generate' && (
                            <ProtectedView allowed={rbac.canView('generate')} role={userRole} resource="Generador de Correos">
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Generador de Correos</h2>
                                            <p className="text-slate-500 dark:text-slate-400">Enviando a base de datos: <strong className="text-indigo-600 dark:text-indigo-400">{activeDatabase.name}</strong></p>
                                        </div>
                                    </div>
                                    <Suspense fallback={<LazyLoader />}>
                                        <Generator
                                            officials={officials}
                                            template={template}
                                            files={files}
                                            campaigns={campaigns}
                                            databaseId={activeDatabase.id}
                                            onCampaignCreate={handleCampaignCreate}
                                            onLogEmail={handleLogEmail}
                                            onToast={(msg, type) => addToast(msg, type)}
                                        />
                                    </Suspense>
                                </div>
                            </ProtectedView>
                        )}

                        {view === 'inbox' && (
                            <ProtectedView allowed={rbac.canView('inbox')} role={userRole} resource="Bandeja de Respuestas">
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Bandeja de Respuestas</h2>
                                            <p className="text-slate-500 dark:text-slate-400">Respuestas de los funcionarios a tus correos enviados</p>
                                        </div>
                                    </div>
                                    <Suspense fallback={<LazyLoader />}>
                                        <InboxView
                                            campaigns={campaigns}
                                            onToast={(msg, type) => addToast(msg, type)}
                                            savedTemplates={savedTemplates}
                                        />
                                    </Suspense>
                                </div>
                            </ProtectedView>
                        )}

                        {view === 'roles' && (
                            <ProtectedView allowed={rbac.canView('roles')} role={userRole} resource="Gestión de Roles">
                                {userProfile && (
                                    <div className="space-y-6">
                                        <Suspense fallback={<LazyLoader />}>
                                            <RolesManager
                                                currentUser={userProfile}
                                                onToast={(msg, type) => addToast(msg, type)}
                                            />
                                        </Suspense>
                                    </div>
                                )}
                            </ProtectedView>
                        )}
                    </div>
                </div>
            </main>

            {/* Database Create/Rename Modal */}
            {dbModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 dark:bg-dark-900/60 p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {dbModal.mode === 'create' ? 'Nueva Base de Datos' : 'Renombrar Base de Datos'}
                            </h3>
                        </div>
                        <form onSubmit={submitDbModal} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={dbModal.value}
                                    onChange={(e) => setDbModal({ ...dbModal, value: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ej. Honorarios 2024"
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setDbModal({ ...dbModal, isOpen: false })}
                                    className="px-4 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 font-medium text-sm transition-colors"
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
                    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100 dark:border-red-900/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-red-50 dark:bg-red-950/30 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/40">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-red-900 dark:text-red-300">¿Vaciar Base de Datos?</h3>
                            <p className="text-red-700 dark:text-red-400 mt-2 text-sm">
                                Estás a punto de eliminar todos los registros de <strong>"{activeDatabase.name}"</strong>.
                            </p>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed text-center">
                                Se eliminarán <strong>{officials.length} registros</strong>. Esta acción es irreversible para esta lista específica.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 px-4 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 font-medium transition-colors"
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
                    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-100 dark:border-amber-900/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-6 flex items-start gap-4 border-b border-amber-100 dark:border-amber-900/40">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300">Conflicto de Importación</h3>
                                <p className="text-amber-700 dark:text-amber-400 mt-1 text-sm">
                                    El archivo contiene registros que ya existen en <strong>{activeDatabase.name}</strong>.
                                </p>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-slate-50 dark:bg-dark-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                    <span className="block text-2xl font-bold text-slate-700 dark:text-white">{importConflict.newOfficials.length}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Nuevos</span>
                                </div>
                                <div className="flex-1 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 text-center">
                                    <span className="block text-2xl font-bold text-amber-700 dark:text-amber-300">{importConflict.duplicates.length}</span>
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">Duplicados</span>
                                </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                                ¿Qué deseas hacer con los <strong>{importConflict.duplicates.length} registros duplicados</strong>?
                            </p>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => setImportConflict(null)}
                                    className="px-4 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 font-medium text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <div className="flex-1 flex gap-2">
                                    <button
                                        onClick={() => resolveImportConflict('skip')}
                                        className="flex-1 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 font-medium text-sm transition-colors flex items-center justify-center gap-2"
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
                    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-red-100 dark:border-red-900/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-red-50 dark:bg-red-950/30 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/40">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-3">
                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-red-900 dark:text-red-300">¿Eliminar Funcionario?</h3>
                            <p className="text-red-700 dark:text-red-400 mt-1 text-sm">
                                Esta acción solo afecta a la base <strong>{activeDatabase.name}</strong>.
                            </p>
                        </div>
                        <div className="p-4 flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 px-4 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 font-medium transition-colors text-sm"
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
