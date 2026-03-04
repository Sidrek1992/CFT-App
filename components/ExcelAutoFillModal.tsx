import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Eye, Loader2, Merge } from 'lucide-react';
import { Official, Gender, buildFullName } from '../types';

// ─── Field definitions for auto-mapping ──────────────────────────────────────

interface FieldDef {
    key: keyof Official | '__nombresCompletos__';
    label: string;
    aliases: string[]; // lowercase, normalized (no accents)
    /** Si es true, esta columna se divide en primerNombre/segundoNombre/tercerNombre */
    splitIntoNameParts?: boolean;
}

const FIELD_DEFS: FieldDef[] = [
    // ── Campo especial: columna "Nombres" del Excel → divide en partes ──────────
    // Detecta columnas tipo "Nombres", "Nombres Propios", etc. y las separa automáticamente
    {
        key: '__nombresCompletos__', label: 'Nombres (dividir en partes)', splitIntoNameParts: true,
        aliases: ['nombres', 'nombres propios', 'nombre propio', 'first names', 'given names']
    },
    // ── Nombre desglosado ────────────────────────────────────────────────────
    { key: 'primerNombre', label: 'Primer Nombre', aliases: ['primer nombre', 'primernombre', '1er nombre', 'nombre1', 'p. nombre'] },
    { key: 'segundoNombre', label: 'Segundo Nombre', aliases: ['segundo nombre', 'segundonombre', '2do nombre', 'nombre2'] },
    { key: 'tercerNombre', label: 'Tercer Nombre', aliases: ['tercer nombre', 'tercernombre', '3er nombre', 'nombre3'] },
    { key: 'primerApellido', label: 'Apellido Paterno', aliases: ['primer apellido', 'primerapellido', 'apellido1', 'apellido paterno', 'p. apellido', 'apellido paterno (1)'] },
    { key: 'segundoApellido', label: 'Apellido Materno', aliases: ['segundo apellido', 'segundoapellido', 'apellido2', 'apellido materno', 'apellido materno (2)'] },
    // ── Nombre completo (fallback / retrocompatibilidad) ─────────────────────
    { key: 'name', label: 'Nombre Completo', aliases: ['nombre', 'name', 'nombre completo', 'full name'] },
    // ── Contacto ─────────────────────────────────────────────────────────────
    { key: 'email', label: 'Correo', aliases: ['correo', 'email', 'e-mail', 'correo electronico', 'mail'] },
    { key: 'telefono', label: 'Teléfono', aliases: ['telefono', 'teléfono', 'phone', 'fono', 'cel', 'celular', 'movil', 'móvil'] },
    // ── Personales ───────────────────────────────────────────────────────────
    { key: 'gender', label: 'Género', aliases: ['genero', 'género', 'gender', 'sexo', 'sex'] },
    { key: 'title', label: 'Título', aliases: ['titulo', 'título', 'title', 'tratamiento'] },
    { key: 'estadoCivil', label: 'Estado Civil', aliases: ['estado civil', 'estadocivil', 'civil', 'estado_civil'] },
    { key: 'hijos', label: 'N° Hijos', aliases: ['hijos', 'hijos a cargo', 'numero hijos', 'n hijos', 'nro hijos'] },
    // ── Laborales ────────────────────────────────────────────────────────────
    { key: 'department', label: 'Departamento', aliases: ['departamento', 'department', 'depto', 'area', 'unidad'] },
    { key: 'position', label: 'Cargo', aliases: ['cargo', 'position', 'puesto', 'rol'] },
    { key: 'stament', label: 'Estamento', aliases: ['estamento', 'stament', 'estamento funcionario'] },
    { key: 'tipoContrato', label: 'Tipo Contrato', aliases: ['tipo contrato', 'tipocontrato', 'contrato', 'tipo de contrato', 'modalidad contrato'] },
    { key: 'profesion', label: 'Profesión', aliases: ['profesion', 'profesión', 'titulo profesional', 'título profesional', 'carrera'] },
    { key: 'postGrado', label: 'Postgrado', aliases: ['postgrado', 'post grado', 'magister', 'magíster', 'doctorado', 'diplomado'] },
    // ── Jefatura ─────────────────────────────────────────────────────────────
    { key: 'bossName', label: 'Jefatura', aliases: ['jefatura', 'jefe', 'boss', 'bossname', 'nombre jefe', 'jefe directo'] },
    { key: 'bossPosition', label: 'Cargo Jefatura', aliases: ['cargojefatura', 'cargo jefatura', 'bossposition', 'cargo jefe'] },
    { key: 'bossEmail', label: 'Correo Jefatura', aliases: ['correojefatura', 'correo jefatura', 'bossemail', 'email jefe'] },
    // ── Fechas ───────────────────────────────────────────────────────────────
    { key: 'fechaIngreso', label: 'Fecha Ingreso', aliases: ['fecha ingreso', 'fechaingreso', 'ingreso', 'fecha de ingreso', 'start date'] },
    { key: 'fechaTermino', label: 'Fecha Término', aliases: ['fecha termino', 'fecha término', 'fechatermino', 'termino', 'vencimiento', 'end date', 'fecha vencimiento'] },
    { key: 'fechaCumpleanios', label: 'Cumpleaños', aliases: ['cumpleanos', 'cumpleaños', 'fecha cumpleanos', 'fecha cumpleaños', 'fechacumpleanios', 'birthday'] },
    // ── Otros ─────────────────────────────────────────────────────────────────
    { key: 'contactoEmergencia', label: 'Contacto Emergencia', aliases: ['contacto emergencia', 'contactoemergencia', 'emergencia', 'emergency contact'] },
    { key: 'direccion', label: 'Dirección', aliases: ['direccion', 'dirección', 'domicilio', 'address', 'direccion particular'] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function autoMapColumns(excelHeaders: string[]): Record<string, keyof Official | '__nombresCompletos__' | ''> {
    const mapping: Record<string, keyof Official | '__nombresCompletos__' | ''> = {};
    excelHeaders.forEach(header => {
        const norm = normalize(header);
        const match = FIELD_DEFS.find(f => f.aliases.includes(norm));
        mapping[header] = match ? (match.key as any) : '';
    });
    return mapping;
}

/** Divide una cadena de nombres propios en hasta 3 partes: primer, segundo, tercer nombre */
function splitNombresPropios(value: string): { primerNombre: string; segundoNombre: string; tercerNombre: string } {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    return {
        primerNombre: parts[0] ?? '',
        segundoNombre: parts[1] ?? '',
        tercerNombre: parts.slice(2).join(' '), // todo lo que quede va al tercero
    };
}

const parseGender = (val: any): Gender => {
    if (!val) return Gender.Unspecified;
    const str = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (['male', 'masculino', 'hombre', 'm', 'varon', 'caballero', 'h', 'masc', 'senor', 'sr', 'don'].includes(str)) return Gender.Male;
    if (['female', 'femenino', 'mujer', 'f', 'sra', 'srta', 'dama', 'fem', 'senora', 'dona'].includes(str)) return Gender.Female;
    return Gender.Unspecified;
};

/**
 * Fuzzy name matching: returns true if two name strings are "close enough"
 * using normalized token-set comparison (order-independent full-name match).
 */
function namesMatch(a: string, b: string): boolean {
    if (!a || !b) return false;
    const tokA = normalize(a).split(/\s+/).filter(Boolean).sort().join(' ');
    const tokB = normalize(b).split(/\s+/).filter(Boolean).sort().join(' ');
    if (tokA === tokB) return true;
    // Partial: all tokens of shorter name exist in longer (covers "Juan Pérez" vs "Juan Carlos Pérez González")
    const setA = new Set(tokA.split(' '));
    const setB = new Set(tokB.split(' '));
    const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
    const overlap = [...smaller].filter(t => larger.has(t)).length;
    // Require ≥75% of smaller set tokens to match
    return overlap >= Math.ceil(smaller.size * 0.75);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchResult {
    official: Official;
    excelRow: Record<string, any>;
    fieldsToFill: { field: keyof Official; label: string; oldValue: string; newValue: string }[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    officials: Official[];
    onMerge: (updatedOfficials: Official[]) => Promise<void>;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// Tipo extendido para incluir el campo virtual de nombres
type OfficialFieldOrVirtual = keyof Official | '__nombresCompletos__' | '';

// ─── Component ───────────────────────────────────────────────────────────────

export const ExcelAutoFillModal: React.FC<Props> = ({ isOpen, onClose, officials, onMerge, addToast }) => {
    type Step = 'upload' | 'mapping' | 'preview' | 'done';
    const [step, setStep] = useState<Step>('upload');
    const [fileName, setFileName] = useState('');
    const [excelData, setExcelData] = useState<Record<string, any>[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, OfficialFieldOrVirtual>>({});
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [mergeResult, setMergeResult] = useState<{ updated: number; fields: number }>({ updated: 0, fields: 0 });
    const fileRef = useRef<HTMLInputElement>(null);

    // ── Step 1: Upload ────────────────────────────────────────────────────
    const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const XLSX = await import('xlsx');
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
                addToast('El archivo Excel está vacío', 'error');
                return;
            }

            const headers = Object.keys(data[0]);
            setFileName(file.name);
            setExcelData(data);
            setExcelHeaders(headers);
            setColumnMapping(autoMapColumns(headers));
            setStep('mapping');
        } catch {
            addToast('Error al leer el archivo Excel', 'error');
        }
        e.target.value = '';
    }, [addToast]);

    // ── Step 2: Process mapping → preview ────────────────────────────
    const processMapping = useCallback(() => {
        // Separar el campo virtual __nombresCompletos__ de los campos reales
        const nombresCompletosCol = Object.entries(columnMapping).find(([, v]) => v === '__nombresCompletos__')?.[0];
        const activeMapping = Object.entries(columnMapping).filter(
            (entry): entry is [string, keyof Official] => entry[1] !== '' && entry[1] !== '__nombresCompletos__'
        );

        // Columnas identificadoras de persona
        const nameCol = activeMapping.find(([, v]) => v === 'name')?.[0];
        const primerNombreCol = activeMapping.find(([, v]) => v === 'primerNombre')?.[0];
        const primerApellidoCol = activeMapping.find(([, v]) => v === 'primerApellido')?.[0];
        const emailCol = activeMapping.find(([, v]) => v === 'email')?.[0];

        const hasIdentifier = nameCol || nombresCompletosCol || (primerNombreCol && primerApellidoCol) || emailCol;
        if (!hasIdentifier) {
            addToast('Debes mapear al menos Correo, Nombre Completo, Nombres o Primer Nombre + Apellido para identificar funcionarios', 'error');
            return;
        }

        const results: MatchResult[] = [];
        let unmatched = 0;

        excelData.forEach(row => {
            const rowEmail = emailCol ? String(row[emailCol] ?? '').trim().toLowerCase() : '';

            // ── Construir nombre candidato para matching ──────────────────────
            let rowName = nameCol ? String(row[nameCol] ?? '').trim() : '';

            // Si viene de columna "Nombres" (campo virtual), usar el valor completo para matching
            if (!rowName && nombresCompletosCol) {
                rowName = String(row[nombresCompletosCol] ?? '').trim();
            }

            // Si vienen columnas individuales de nombre, armar el nombre completo
            if (!rowName && primerNombreCol) {
                rowName = [
                    String(row[primerNombreCol] ?? ''),
                    activeMapping.find(([, v]) => v === 'segundoNombre')?.[0] ? String(row[activeMapping.find(([, v]) => v === 'segundoNombre')![0]] ?? '') : '',
                    activeMapping.find(([, v]) => v === 'tercerNombre')?.[0] ? String(row[activeMapping.find(([, v]) => v === 'tercerNombre')![0]] ?? '') : '',
                    primerApellidoCol ? String(row[primerApellidoCol] ?? '') : '',
                    activeMapping.find(([, v]) => v === 'segundoApellido')?.[0] ? String(row[activeMapping.find(([, v]) => v === 'segundoApellido')![0]] ?? '') : '',
                ].filter(s => s.trim()).join(' ').trim();
            }

            // ── Añadir apellidos al nombre para matching si viene de nombresCompletos ──
            // Ej: nombresCompletos="Juan Carlos" + primerApellido="Pérez" → rowName para matching = "Juan Carlos Pérez"
            if (nombresCompletosCol && primerApellidoCol && row[primerApellidoCol]) {
                const apellidos = [
                    String(row[primerApellidoCol] ?? ''),
                    activeMapping.find(([, v]) => v === 'segundoApellido')?.[0] ? String(row[activeMapping.find(([, v]) => v === 'segundoApellido')![0]] ?? '') : '',
                ].filter(s => s.trim()).join(' ');
                rowName = [rowName, apellidos].filter(Boolean).join(' ').trim();
            }

            // ── Match por email (exacto) → luego por nombre (fuzzy) ───────────
            let official: Official | undefined;

            if (rowEmail && rowEmail.includes('@')) {
                official = officials.find(o => o.email.trim().toLowerCase() === rowEmail);
            }

            if (!official && rowName) {
                official = officials.find(o => normalize(buildFullName(o)) === normalize(rowName));
                if (!official) {
                    official = officials.find(o => namesMatch(buildFullName(o), rowName));
                }
            }

            if (!official) {
                unmatched++;
                return;
            }

            // ── Determinar campos a rellenar (vacíos en BD, con valor en Excel) ──
            const fieldsToFill: MatchResult['fieldsToFill'] = [];

            // Campos regulares (excluir campos de identidad/nombre que se manejan aparte)
            const IDENTITY_SKIP = new Set(['name', 'email', 'primerNombre', 'segundoNombre', 'tercerNombre', 'primerApellido', 'segundoApellido']);
            activeMapping.forEach(([excelCol, fieldKey]) => {
                if (IDENTITY_SKIP.has(fieldKey)) return;

                const excelVal = row[excelCol];
                if (excelVal === undefined || excelVal === null || String(excelVal).trim() === '') return;

                const currentVal = official![fieldKey as keyof Official];
                const fieldDef = FIELD_DEFS.find(f => f.key === fieldKey);

                const isEmpty = currentVal === undefined || currentVal === null || String(currentVal).trim() === '';
                if (isEmpty) {
                    let newValue = String(excelVal).trim();
                    if (fieldKey === 'gender') newValue = parseGender(excelVal);
                    fieldsToFill.push({
                        field: fieldKey,
                        label: fieldDef?.label || fieldKey,
                        oldValue: String(currentVal ?? ''),
                        newValue,
                    });
                }
            });

            // ── Partes del nombre ────────────────────────────────────────────────
            // 1) Columna "Nombres" virtual → SIEMPRE dividir en primer/segundo/tercer nombre
            if (nombresCompletosCol && row[nombresCompletosCol]) {
                const rawNombres = String(row[nombresCompletosCol]).trim();
                const split = splitNombresPropios(rawNombres);

                ([
                    { field: 'primerNombre', label: 'Primer Nombre', value: split.primerNombre },
                    { field: 'segundoNombre', label: 'Segundo Nombre', value: split.segundoNombre },
                    { field: 'tercerNombre', label: 'Tercer Nombre', value: split.tercerNombre },
                ] as const).forEach(({ field, label, value }) => {
                    if (!value) return;
                    const current = (official as any)[field];
                    if (!current || String(current).trim() === '') {
                        fieldsToFill.push({
                            field: field as keyof Official,
                            label,
                            oldValue: String(current ?? ''),
                            newValue: value,
                        });
                    }
                });
            }

            // 2) Columnas individuales de nombre (primerNombre, primerApellido, etc.)
            const nameParts: Partial<Official> = {};
            if (primerNombreCol && row[primerNombreCol]) { nameParts.primerNombre = String(row[primerNombreCol]).trim(); }
            (['segundoNombre', 'tercerNombre', 'primerApellido', 'segundoApellido'] as const).forEach(key => {
                const col = activeMapping.find(([, v]) => v === key)?.[0];
                if (col && row[col]) nameParts[key] = String(row[col]).trim();
            });
            Object.entries(nameParts).forEach(([k, v]) => {
                if (!v) return;
                const current = (official as any)[k];
                if (!current || String(current).trim() === '') {
                    const def = FIELD_DEFS.find(f => f.key === k);
                    fieldsToFill.push({ field: k as keyof Official, label: def?.label || k, oldValue: String(current ?? ''), newValue: String(v) });
                }
            });

            if (fieldsToFill.length > 0) {
                results.push({ official, excelRow: row, fieldsToFill });
            }
        });

        setMatches(results);
        setUnmatchedCount(unmatched);
        setStep('preview');
    }, [columnMapping, excelData, officials, addToast]);

    // ── Step 3: Apply merge ──────────────────────────────────────────────
    const applyMerge = useCallback(async () => {
        setIsProcessing(true);
        try {
            const updatesMap = new Map<string, Partial<Official>>();
            let totalFields = 0;

            matches.forEach(m => {
                const patch: Partial<Official> = {};
                m.fieldsToFill.forEach(f => {
                    (patch as any)[f.field] = f.newValue;
                    totalFields++;
                });
                updatesMap.set(m.official.id, patch);
            });

            const merged = officials.map(o => {
                const patch = updatesMap.get(o.id);
                if (!patch) return o;
                const updated = { ...o, ...patch };
                // Rebuild full name if name parts changed
                if (patch.primerNombre || patch.primerApellido) {
                    updated.name = buildFullName(updated);
                }
                return updated;
            });

            await onMerge(merged);
            setMergeResult({ updated: matches.length, fields: totalFields });
            setStep('done');
            addToast(`${matches.length} funcionarios actualizados (${totalFields} campos rellenados)`, 'success');
        } catch {
            addToast('Error al aplicar los cambios', 'error');
        } finally {
            setIsProcessing(false);
        }
    }, [matches, officials, onMerge, addToast]);

    // ── Toggle row expansion ──────────────────────────────────────────────
    const toggleRow = (idx: number) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    };

    // ── Close & reset ─────────────────────────────────────────────────────
    const handleClose = () => {
        setStep('upload');
        setFileName('');
        setExcelData([]);
        setExcelHeaders([]);
        setColumnMapping({});
        setMatches([]);
        setUnmatchedCount(0);
        setExpandedRows(new Set());
        setMergeResult({ updated: 0, fields: 0 });
        onClose();
    };

    if (!isOpen) return null;

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <Merge className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Auto-rellenar desde Excel</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Completa campos vacíos de funcionarios existentes</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1 px-5 py-3 bg-slate-50 dark:bg-dark-900/50 border-b border-slate-200 dark:border-slate-700">
                    {(['upload', 'mapping', 'preview', 'done'] as Step[]).map((s, i) => {
                        const labels = ['Subir', 'Mapear', 'Revisar', 'Listo'];
                        const isActive = s === step;
                        const isPast = ['upload', 'mapping', 'preview', 'done'].indexOf(step) > i;
                        return (
                            <React.Fragment key={s}>
                                {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' :
                                    isPast ? 'text-emerald-600 dark:text-emerald-400' :
                                        'text-slate-400 dark:text-slate-500'
                                    }`}>
                                    {isPast ? '✓ ' : ''}{labels[i]}
                                </span>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* ──── STEP: Upload ──── */}
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="w-full max-w-sm border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all group"
                            >
                                <Upload className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors mb-3" />
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Haz clic para subir un archivo Excel</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">.xlsx o .xls</p>
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-4 max-w-sm text-center leading-relaxed space-y-1">
                                <p>Solo se rellenarán campos <strong>vacíos</strong> de funcionarios que ya existen.</p>
                                <p>La coincidencia se hace por <strong>correo</strong>, luego por <strong>nombre completo</strong> (tolerante a variaciones).</p>
                                <p>Si tu Excel tiene una columna <strong>"Nombres"</strong> con primer, segundo y tercer nombre juntos, asígnala a <strong>✂ Nombres (dividir en partes)</strong> para separarlos automáticamente.</p>
                            </div>
                        </div>
                    )}

                    {/* ──── STEP: Mapping ──── */}
                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                                <span className="font-medium">{fileName}</span>
                                <span className="text-slate-400">— {excelData.length} filas, {excelHeaders.length} columnas</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Verifica el mapeo de columnas. Las columnas se detectaron automáticamente.
                            </p>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {excelHeaders.map(header => (
                                    <div key={header} className="flex items-center gap-3 bg-slate-50 dark:bg-dark-900/50 rounded-lg px-3 py-2">
                                        <span className="text-sm font-mono text-slate-600 dark:text-slate-300 w-40 truncate flex-shrink-0" title={header}>
                                            {header}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                                        <select
                                            value={columnMapping[header] || ''}
                                            onChange={e => setColumnMapping(prev => ({ ...prev, [header]: e.target.value as OfficialFieldOrVirtual }))}
                                            className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        >
                                            <option value="">— Ignorar —</option>
                                            {FIELD_DEFS.map(f => (
                                                <option key={String(f.key)} value={String(f.key)}>
                                                    {f.splitIntoNameParts ? '✂ ' : ''}{f.label}
                                                </option>
                                            ))}
                                        </select>
                                        {columnMapping[header] && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ──── STEP: Preview ──── */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 text-center">
                                    <span className="block text-2xl font-bold text-emerald-700 dark:text-emerald-300">{matches.length}</span>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Con datos a rellenar</span>
                                </div>
                                <div className="flex-1 bg-slate-50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                                    <span className="block text-2xl font-bold text-slate-600 dark:text-slate-300">{unmatchedCount}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Sin match</span>
                                </div>
                                <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-lg p-3 text-center">
                                    <span className="block text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                        {matches.reduce((sum, m) => sum + m.fieldsToFill.length, 0)}
                                    </span>
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wide">Campos a llenar</span>
                                </div>
                            </div>

                            {matches.length === 0 ? (
                                <div className="text-center py-8">
                                    <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">No se encontraron campos vacíos para rellenar</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                        {unmatchedCount > 0
                                            ? `${unmatchedCount} filas del Excel no coincidieron con ningún funcionario. Verifica que el correo o el nombre coincidan exactamente.`
                                            : 'Todos los funcionarios coincidentes ya tienen esos campos completos.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {matches.map((m, idx) => (
                                        <div key={m.official.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => toggleRow(idx)}
                                                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-dark-900/50 hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{buildFullName(m.official)}</span>
                                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                                                        +{m.fieldsToFill.length} campos
                                                    </span>
                                                </div>
                                                {expandedRows.has(idx) ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                            </button>
                                            {expandedRows.has(idx) && (
                                                <div className="px-3 py-2 space-y-1 bg-white dark:bg-dark-800">
                                                    {m.fieldsToFill.map(f => (
                                                        <div key={f.field} className="flex items-center gap-2 text-xs">
                                                            <span className="text-slate-500 dark:text-slate-400 w-32 flex-shrink-0 font-medium">{f.label}</span>
                                                            <span className="text-slate-300 dark:text-slate-600 italic flex-shrink-0">vacío</span>
                                                            <ArrowRight className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                            <span className="text-emerald-700 dark:text-emerald-300 font-medium truncate">{f.newValue}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ──── STEP: Done ──── */}
                    {step === 'done' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Auto-rellenado completado</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Se actualizaron <strong>{mergeResult.updated}</strong> funcionarios
                                con <strong>{mergeResult.fields}</strong> campos rellenados.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-900/50">
                    {step === 'upload' && (
                        <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors">
                            Cancelar
                        </button>
                    )}

                    {step === 'mapping' && (
                        <>
                            <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors">
                                Volver
                            </button>
                            <button
                                onClick={processMapping}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Eye className="w-4 h-4" />
                                Previsualizar
                            </button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <button onClick={() => setStep('mapping')} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors">
                                Volver
                            </button>
                            {matches.length > 0 && (
                                <button
                                    onClick={applyMerge}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
                                    Aplicar ({matches.length} funcionarios)
                                </button>
                            )}
                        </>
                    )}

                    {step === 'done' && (
                        <div className="ml-auto">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
