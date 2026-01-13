import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EmailTemplate, Official, SavedTemplate, Gender } from '../types';
import { generateTemplateWithAI } from '../services/geminiService';
import { FileText, Paperclip, Info, Sparkles, Layout, Eye, Save, Bookmark, Trash2, Download, CloudUpload, Upload, FileJson } from 'lucide-react';

interface TemplateEditorProps {
  template: EmailTemplate;
  onChange: (template: EmailTemplate) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  officials: Official[];
  onToast: (message: string, type: 'success' | 'error') => void;
  
  // New props for persistence
  savedTemplates: SavedTemplate[];
  onSaveTemplate: (name: string) => void;
  onDeleteTemplate: (id: string) => void;
}

const VARIABLES = [
  { label: 'Nombre Completo', value: '{nombre}' },
  { label: 'Primer Nombre', value: '{nombres}' },
  { label: 'Apellidos', value: '{apellidos}' },
  { label: 'Título (Sr/Sra)', value: '{titulo}' },
  { label: 'Estimado/a (Adj)', value: '{estimado}' },
  { label: 'Departamento', value: '{departamento}' },
  { label: 'Cargo', value: '{cargo}' },
  { label: 'Correo', value: '{correo}' },
  { label: 'Nombre Jefatura', value: '{jefatura_nombre}' },
  { label: 'Cargo Jefatura', value: '{jefatura_cargo}' },
];

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ 
  template, onChange, files, onFilesChange, officials, onToast,
  savedTemplates, onSaveTemplate, onDeleteTemplate
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Autocomplete State
  const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  
  // Preview Logic
  const previewOfficial = officials[0];
  
  const previewContent = useMemo(() => {
    if (!previewOfficial) return { subject: template.subject, body: "Agrega un funcionario a la base de datos para ver la vista previa real." };
    
    let body = template.body;
    
    // Calculate dynamic gender adjective
    let estimadoVar = 'Estimado/a';
    if (previewOfficial.gender === Gender.Male) estimadoVar = 'Estimado';
    if (previewOfficial.gender === Gender.Female) estimadoVar = 'Estimada';

    // Parse Name Parts
    const nameParts = previewOfficial.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    let lastName = '';
    
    // Heuristic: If name has > 2 parts, assume last 2 are surnames (Standard Spanish Format)
    if (nameParts.length > 2) {
        lastName = nameParts.slice(-2).join(' ');
    } else if (nameParts.length === 2) {
        lastName = nameParts[1];
    }

    body = body.replace(/{nombre}/g, previewOfficial.name);
    body = body.replace(/{nombres}/g, firstName);
    body = body.replace(/{apellidos}/g, lastName);
    body = body.replace(/{titulo}/g, previewOfficial.title);
    body = body.replace(/{estimado}/g, estimadoVar);
    body = body.replace(/{departamento}/g, previewOfficial.department || '[DEPARTAMENTO]');
    body = body.replace(/{cargo}/g, previewOfficial.position);
    body = body.replace(/{correo}/g, previewOfficial.email);
    body = body.replace(/{jefatura_nombre}/g, previewOfficial.bossName || 'N/A');
    body = body.replace(/{jefatura_cargo}/g, previewOfficial.bossPosition || 'N/A');

    return {
      subject: template.subject,
      body
    };
  }, [template, previewOfficial]);

  // Hotkey for Saving
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleSaveClick();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [template]); // Dependency needed to access current template state

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = template.body;
      const newBody = text.substring(0, start) + variable + text.substring(end);
      onChange({ ...template, body: newBody });
      
      // Restore focus
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onFilesChange([...files, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesChange([...files, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  const handleAiGeneration = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const result = await generateTemplateWithAI(aiPrompt);
      onChange({
        subject: result.subject,
        body: result.body
      });
      onToast("Plantilla generada exitosamente", "success");
      setShowAiInput(false);
    } catch (error) {
      onToast("Error al generar plantilla", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveClick = () => {
    if (!template.subject && !template.body) {
      onToast("La plantilla está vacía", "error");
      return;
    }
    setShowSaveDialog(true);
  };

  const confirmSave = () => {
    if (!saveName.trim()) return;
    onSaveTemplate(saveName);
    setSaveName('');
    setShowSaveDialog(false);
  };

  const loadTemplate = (t: SavedTemplate) => {
    if (window.confirm("¿Reemplazar el contenido actual con esta plantilla?")) {
      onChange({ subject: t.subject, body: t.body });
    }
  };

  const handleExportJSON = () => {
      const dataStr = JSON.stringify(template, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plantilla_correo_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onToast("Plantilla exportada", "success");
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.subject !== undefined && json.body !== undefined) {
                  onChange({ subject: json.subject, body: json.body });
                  onToast("Plantilla importada correctamente", "success");
              } else {
                  onToast("Formato de archivo inválido", "error");
              }
          } catch (err) {
              console.error(err);
              onToast("Error al leer el archivo", "error");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset
  };

  // --- Autocomplete Logic ---
  const getCaretCoordinates = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    const div = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    Array.from(style).forEach(prop => {
        div.style.setProperty(prop, style.getPropertyValue(prop));
    });

    div.style.position = 'absolute';
    div.style.top = '0px';
    div.style.left = '0px';
    div.style.visibility = 'hidden';
    div.style.height = 'auto';
    div.style.width = style.width;
    div.style.whiteSpace = 'pre-wrap';
    div.style.overflow = 'hidden';

    const text = textarea.value.substring(0, textarea.selectionStart);
    div.textContent = text;
    
    const span = document.createElement('span');
    span.textContent = '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    
    const rect = textarea.getBoundingClientRect();
    const lh = parseInt(style.lineHeight);
    const lineHeight = isNaN(lh) ? 20 : lh;
    
    const top = rect.top + window.scrollY + span.offsetTop - textarea.scrollTop + lineHeight;
    const left = rect.left + window.scrollX + span.offsetLeft;
    
    document.body.removeChild(div);

    return { top, left };
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '{') {
      const { top, left } = getCaretCoordinates();
      setMenuPosition({ top, left });
    } else if (menuPosition && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter' || e.key === '}')) {
      setMenuPosition(null);
    }
  };

  // Close menu if clicked outside
  useEffect(() => {
    const handleClick = () => setMenuPosition(null);
    if (menuPosition) {
        window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [menuPosition]);

  const insertFromAutocomplete = (value: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Assuming the user just typed '{', so we replace the '{' (at start - 1) with the full variable
    const text = template.body;
    // Check if the previous char is indeed '{'
    let replaceStart = start;
    if (text[start - 1] === '{') {
        replaceStart = start - 1;
    }

    const newBody = text.substring(0, replaceStart) + value + text.substring(end);
    onChange({ ...template, body: newBody });
    setMenuPosition(null);

    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(replaceStart + value.length, replaceStart + value.length);
    }, 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 space-y-4">
        
        {/* AI Generator Section */}
        <div className="bg-indigo-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-700 rounded-full opacity-50 blur-xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  Generador Mágico de Plantillas
                </h3>
                <p className="text-indigo-200 text-sm mt-1">Describe qué tipo de correo necesitas y deja que Gemini lo escriba por ti.</p>
              </div>
              <button 
                onClick={() => setShowAiInput(!showAiInput)}
                className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-xs font-medium transition-colors border border-indigo-700"
              >
                {showAiInput ? 'Ocultar' : 'Abrir Generador'}
              </button>
            </div>

            {showAiInput && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ej: Escribe un correo formal invitando a la fiesta de fin de año el viernes a las 5pm. Menciona que es obligatoria."
                  className="w-full bg-indigo-950/50 border border-indigo-700 rounded-lg p-3 text-sm text-white placeholder-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                />
                <div className="flex justify-end">
                   <button
                    onClick={handleAiGeneration}
                    disabled={!aiPrompt || isGenerating}
                    className="px-4 py-2 bg-white text-indigo-900 rounded-lg font-medium hover:bg-indigo-50 transition-all flex items-center gap-2 text-sm shadow-md"
                  >
                    {isGenerating ? (
                      <span className="animate-spin w-4 h-4 border-2 border-indigo-900 border-t-transparent rounded-full"></span>
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isGenerating ? 'Escribiendo...' : 'Generar Correo'}
                  </button>
                </div>
              </div>
            )}
            
            {/* AI Loading Skeleton */}
            {isGenerating && (
                <div className="mt-4 space-y-2 animate-pulse">
                    <div className="h-2 bg-indigo-800 rounded w-full"></div>
                    <div className="h-2 bg-indigo-800 rounded w-5/6"></div>
                    <div className="h-2 bg-indigo-800 rounded w-4/6"></div>
                </div>
            )}
          </div>
        </div>

        {/* Main Editor */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="font-medium text-slate-800">Editor</h3>
            <div className="flex items-center gap-2">
                <input 
                    type="file" 
                    ref={templateFileInputRef} 
                    onChange={handleImportJSON} 
                    accept=".json" 
                    className="hidden" 
                />
                <button
                    onClick={() => templateFileInputRef.current?.click()}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
                    title="Importar archivo JSON"
                >
                    <Upload className="w-3.5 h-3.5" />
                    Importar
                </button>
                <button
                    onClick={handleExportJSON}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
                    title="Exportar archivo JSON"
                >
                    <FileJson className="w-3.5 h-3.5" />
                    Exportar
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button
                  onClick={handleSaveClick}
                  className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  title="Guardar Plantilla (Ctrl + S)"
                >
                  <Save className="w-4 h-4" />
                  Guardar Plantilla
                </button>
            </div>
          </div>

          {showSaveDialog && (
             <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-end gap-3 animate-in fade-in duration-200">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de la plantilla</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    placeholder="Ej. Recordatorio Mensual"
                  />
                </div>
                <button onClick={confirmSave} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                  Guardar
                </button>
                <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700">
                  Cancelar
                </button>
             </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Asunto del Correo</label>
            <input
              type="text"
              value={template.subject}
              onChange={(e) => onChange({ ...template, subject: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none font-medium"
              placeholder="Ej. Memorándum Importante"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">Cuerpo del Correo</label>
            </div>
            <div className="text-xs text-slate-500 mb-2 bg-slate-50 p-2 rounded border border-slate-100 flex gap-2">
                <Info className="w-4 h-4 mt-0.5" />
                <p>El formato (negritas/cursivas) se conserva al usar el botón <strong>Copiar</strong>. Para envíos directos (botón Enviar), se usará texto plano.</p>
            </div>
            
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    id="body-textarea"
                    value={template.body}
                    onChange={(e) => onChange({ ...template, body: e.target.value })}
                    onKeyUp={handleKeyUp}
                    className="w-full h-96 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none font-mono text-sm leading-relaxed resize-none"
                    placeholder="Escribe el contenido del correo aquí..."
                />
                
                {/* Autocomplete Menu */}
                {menuPosition && (
                   <div 
                     className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                     style={{ top: menuPosition.top, left: menuPosition.left }}
                   >
                       <div className="bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-100">
                           Insertar Variable
                       </div>
                       <div className="max-h-48 overflow-y-auto">
                           {VARIABLES.map(v => (
                               <button
                                   key={v.value}
                                   onClick={(e) => { e.stopPropagation(); insertFromAutocomplete(v.value); }}
                                   className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex flex-col"
                               >
                                   <span className="font-medium text-indigo-600">{v.value}</span>
                                   <span className="text-[10px] text-slate-400">{v.label}</span>
                               </button>
                           ))}
                       </div>
                   </div>
                )}
            </div>
            
            {/* Variables Disponibles (Picker) */}
            <div className="mt-4 pt-4 border-t border-slate-100">
               <div className="flex items-center gap-2 mb-3">
                 <FileText className="w-4 h-4 text-indigo-600" />
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Variables Disponibles</h3>
                 <span className="text-[10px] text-slate-400">(Click para insertar)</span>
               </div>
               <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => insertVariable(v.value)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full transition-colors border border-indigo-100"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-medium text-slate-800">Adjuntos (Simulación)</h3>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Nota: Debido a restricciones de seguridad de los navegadores, los archivos <strong>no pueden adjuntarse automáticamente</strong> al abrir su cliente de correo. Esta sección le ayuda a verificar qué archivos deben ir en cada envío y los incluye en la descarga .EML.
            </p>
          </div>

          <div 
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
             className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
          >
             <CloudUpload className={`w-10 h-10 mb-2 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
             <div className="flex flex-col items-center">
                <label className="cursor-pointer px-4 py-2 bg-white text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 shadow-sm mb-2">
                Seleccionar Archivos
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>
                <p className="text-xs text-slate-400">o arrastra y suelta aquí</p>
             </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                    {files.length} archivo(s) seleccionado(s)
                </span>
                <ul className="space-y-2">
                {files.map((file, index) => (
                    <li key={index} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100 group hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                             <Paperclip className="w-3 h-3 text-slate-400" />
                             <span className="truncate max-w-xs text-slate-600 font-medium">{file.name}</span>
                             <span className="text-[10px] text-slate-400">({Math.round(file.size / 1024)} KB)</span>
                        </div>
                        <button onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500 px-2 transition-colors">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </li>
                ))}
                </ul>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-1 space-y-6">
        
        {/* Saved Templates List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-h-64 overflow-y-auto">
           <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            Mis Plantillas
          </h3>
          {savedTemplates.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No hay plantillas guardadas</p>
          ) : (
            <ul className="space-y-2">
              {savedTemplates.map(t => (
                <li key={t.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex-1 cursor-pointer" onClick={() => loadTemplate(t)}>
                    <p className="text-sm font-medium text-slate-700">{t.name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{t.subject}</p>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={() => loadTemplate(t)} 
                       title="Cargar"
                       className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                     >
                        <Download className="w-3 h-3" />
                     </button>
                     <button 
                       onClick={() => onDeleteTemplate(t.id)}
                       title="Eliminar"
                       className="p-1 text-red-500 hover:bg-red-50 rounded"
                     >
                        <Trash2 className="w-3 h-3" />
                     </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Live Preview Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
             <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vista Previa
                </h3>
                {previewOfficial && (
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                         {previewOfficial.name}
                    </span>
                )}
             </div>
             <div className="p-4">
                {!previewOfficial ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                        Agrega funcionarios para ver cómo queda el correo.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Asunto</span>
                            <p className="text-sm font-medium text-slate-800 leading-tight">{previewContent.subject || '(Sin asunto)'}</p>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cuerpo</span>
                            <div className="mt-1 text-xs text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded border border-slate-100">
                                {previewContent.body}
                            </div>
                        </div>
                    </div>
                )}
             </div>
        </div>

      </div>
    </div>
  );
};