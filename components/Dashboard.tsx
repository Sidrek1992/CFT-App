import React, { useMemo, useRef } from 'react';
import { Official, Gender, ViewState, FilterCriteria } from '../types';
import { Users, Upload, UserPlus, Send, AlertTriangle, CheckCircle2, Download, Save, RefreshCw, FileSpreadsheet, Trash2 } from 'lucide-react';

interface DashboardProps {
  officials: Official[];
  sentHistory: string[];
  onNavigate: (view: ViewState, filter?: FilterCriteria) => void;
  onImport: () => void;
  onExportExcel: () => void;
  onNewOfficial: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onClearDatabase: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    officials, 
    sentHistory, 
    onNavigate,
    onImport,
    onExportExcel,
    onNewOfficial,
    onExportBackup,
    onImportBackup,
    onClearDatabase
}) => {
  const totalOfficials = officials.length;
  const backupInputRef = useRef<HTMLInputElement>(null);
  
  // Progress Stats
  const sentCount = officials.filter(o => sentHistory.includes(o.id)).length;
  const progressPercent = totalOfficials > 0 ? Math.round((sentCount / totalOfficials) * 100) : 0;

  // Gender Stats
  const maleCount = officials.filter(o => o.gender === Gender.Male).length;
  const femaleCount = officials.filter(o => o.gender === Gender.Female).length;
  const unspecifiedCount = officials.filter(o => o.gender === Gender.Unspecified).length;
  
  // Donut Chart Calculations
  const maleDeg = (maleCount / totalOfficials) * 360 || 0;
  const femaleDeg = (femaleCount / totalOfficials) * 360 || 0;
  // Calculate stops for conic-gradient
  const stop1 = maleDeg;
  const stop2 = maleDeg + femaleDeg;

  // Health Checks
  const missingBossCount = officials.filter(o => !o.bossName).length;
  const unspecifiedGenderCount = unspecifiedCount;
  const invalidEmailCount = officials.filter(o => !o.email.includes('@')).length;
  const isHealthy = missingBossCount === 0 && unspecifiedGenderCount === 0 && invalidEmailCount === 0 && totalOfficials > 0;

  // Top Departments Logic
  const topDepartments = useMemo(() => {
    const counts: Record<string, number> = {};
    officials.forEach(o => {
        const dept = o.department || 'Sin Dept.';
        counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Take top 5
  }, [officials]);

  const maxDeptCount = topDepartments[0]?.[1] || 1;

  const handleBackupImportClick = () => {
    if (backupInputRef.current) {
        backupInputRef.current.value = '';
        backupInputRef.current.click();
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        onImportBackup(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Hidden input for backup restore */}
      <input 
        type="file" 
        ref={backupInputRef}
        onChange={handleBackupFileChange}
        className="hidden"
        accept=".json"
      />

      {/* 1. Quick Actions & Progress Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Progress Card */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
             <div>
                 <h3 className="text-lg font-bold text-slate-800 mb-1">Progreso de Envíos</h3>
                 <p className="text-slate-500 text-sm mb-4">
                    Has contactado al <strong className="text-indigo-600">{progressPercent}%</strong> de tu base de datos actual.
                 </p>
             </div>
             <div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                    <span>Enviados: {sentCount}</span>
                    <span>Total: {totalOfficials}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-sm relative" 
                        style={{ width: `${progressPercent}%` }}
                    >
                         <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                    </div>
                </div>
             </div>
         </div>

         {/* Quick Actions */}
         <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex flex-col justify-between">
             <h3 className="font-bold mb-4">Acciones Rápidas</h3>
             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={onImport}
                    className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all group"
                 >
                     <Upload className="w-5 h-5 mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
                     <span className="text-xs font-medium">Importar</span>
                 </button>
                 <button 
                    onClick={onExportExcel}
                    className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all group"
                 >
                     <FileSpreadsheet className="w-5 h-5 mb-1 text-green-400 group-hover:scale-110 transition-transform" />
                     <span className="text-xs font-medium">Exportar</span>
                 </button>
                 <button 
                    onClick={onNewOfficial}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium text-xs border border-slate-700 transition-all group"
                 >
                     <UserPlus className="w-4 h-4 text-blue-400" />
                     Nuevo Funcionario
                 </button>
                 <button 
                    onClick={() => onNavigate('generate')}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-sm shadow-md transition-all"
                 >
                     <Send className="w-4 h-4" />
                     Continuar Envíos
                 </button>
                 <button 
                    type="button"
                    onClick={onClearDatabase}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 bg-red-900/20 hover:bg-red-900/30 text-red-200 border border-red-900/50 rounded-lg font-medium text-xs transition-all group mt-2"
                 >
                     <Trash2 className="w-4 h-4 text-red-500" />
                     Limpiar Base de Datos
                 </button>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 2. Top Departments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Top Departamentos
          </h3>
          <div className="space-y-4">
             {topDepartments.length === 0 ? (
                 <p className="text-sm text-slate-400 italic text-center py-4">No hay datos suficientes</p>
             ) : (
                topDepartments.map(([name, count], index) => (
                    <div 
                      key={name} 
                      className="relative cursor-pointer hover:bg-slate-50 p-1 rounded -mx-1 transition-colors"
                      onClick={() => onNavigate('database', { type: 'department', value: name === 'Sin Dept.' ? '' : name })}
                    >
                        <div className="flex justify-between text-xs mb-1 font-medium z-10 relative">
                            <span className="text-slate-700 truncate max-w-[180px]">{name}</span>
                            <span className="text-slate-500">{count} pers.</span>
                        </div>
                        <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${index === 0 ? 'bg-indigo-500' : 'bg-indigo-300'}`}
                                style={{ width: `${(count / maxDeptCount) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))
             )}
          </div>
        </div>

        {/* 4. Donut Chart (Gender) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative">
           <h3 className="absolute top-6 left-6 font-bold text-slate-800 text-sm">Distribución</h3>
           
           {totalOfficials === 0 ? (
               <div className="text-slate-400 text-sm italic mt-8">Sin datos</div>
           ) : (
               <div className="relative w-40 h-40 mt-4">
                   {/* CSS Conic Gradient Donut */}
                   <div 
                     className="w-full h-full rounded-full"
                     style={{
                        background: `conic-gradient(
                            #3b82f6 0deg ${stop1}deg, 
                            #ec4899 ${stop1}deg ${stop2}deg, 
                            #94a3b8 ${stop2}deg 360deg
                        )`
                     }}
                   ></div>
                   {/* Inner White Circle to make it a donut */}
                   <div className="absolute inset-0 m-auto w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                       <span className="text-2xl font-bold text-slate-800">{totalOfficials}</span>
                       <span className="text-[10px] text-slate-400 uppercase">Total</span>
                   </div>
               </div>
           )}
           
           <div className="flex gap-4 mt-6 text-xs">
               <div className="flex items-center gap-1.5">
                   <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                   <span className="text-slate-600">Hombres</span>
               </div>
               <div className="flex items-center gap-1.5">
                   <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                   <span className="text-slate-600">Mujeres</span>
               </div>
               <div className="flex items-center gap-1.5">
                   <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                   <span className="text-slate-600">Otros</span>
               </div>
           </div>
        </div>

        {/* 3. Database Health */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
           <h3 className="font-bold text-slate-800 mb-4 text-sm">Salud de Datos</h3>
           
           {totalOfficials === 0 ? (
               <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">Base de datos vacía</div>
           ) : isHealthy ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                       <CheckCircle2 className="w-8 h-8 text-green-600" />
                   </div>
                   <h4 className="font-bold text-green-700">Excelente</h4>
                   <p className="text-xs text-green-600 mt-1">Todos los registros tienen la información crítica completa.</p>
               </div>
           ) : (
               <div className="space-y-3">
                   {missingBossCount > 0 && (
                       <div 
                         onClick={() => onNavigate('database', { type: 'missingBoss' })}
                         className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                       >
                           <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                           <div>
                               <p className="text-xs font-bold text-red-800">{missingBossCount} Sin Jefatura</p>
                               <p className="text-[10px] text-red-600">Click para corregir.</p>
                           </div>
                       </div>
                   )}
                   {unspecifiedGenderCount > 0 && (
                       <div 
                         onClick={() => onNavigate('database', { type: 'missingGender' })}
                         className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                       >
                           <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                           <div>
                               <p className="text-xs font-bold text-amber-800">{unspecifiedGenderCount} Sin Género</p>
                               <p className="text-[10px] text-amber-600">Click para detectar con IA.</p>
                           </div>
                       </div>
                   )}
                    {invalidEmailCount > 0 && (
                       <div 
                         onClick={() => onNavigate('database', { type: 'invalidEmail' })}
                         className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                       >
                           <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                           <div>
                               <p className="text-xs font-bold text-red-800">{invalidEmailCount} Correo Inválido</p>
                               <p className="text-[10px] text-red-600">Formato incorrecto o vacío.</p>
                           </div>
                       </div>
                   )}
               </div>
           )}
        </div>

        {/* 5. Backup Section (New) */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 md:col-span-2 lg:col-span-3">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Save className="w-5 h-5 text-slate-400" />
                Copia de Seguridad
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-slate-600">
                    <p>Descarga un respaldo completo de tu sistema (funcionarios, plantillas e historial) para no perder datos al cambiar de equipo o borrar caché.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        onClick={onExportBackup}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        Descargar
                    </button>
                    <button 
                        onClick={handleBackupImportClick}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Restaurar
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}