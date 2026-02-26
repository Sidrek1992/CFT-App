
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EmailTemplate, Official, SavedTemplate, Gender } from '../types';
import { generateTemplateWithAI } from '../services/geminiService';
import { EmailEditor } from './EmailEditor';
import { FileText, Paperclip, Info, Sparkles, Eye, Save, Bookmark, Trash2, Download, CloudUpload, Upload, FileJson } from 'lucide-react';

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
  }, [template]);

  const insertVariable = (variable: string) => {
    // Basic insertion for RichText - appends to end if not focused or inserts at cursor
    // Since we use contentEditable, explicit cursor tracking is complex. 
    // We'll append it to the body for simplicity in this implementation, 
    // or rely on the user copying it.
    // Better approach: execCommand insertHTML
    const editor = document.getElementById('body-editor');
    if (editor) {
      editor.focus();
      document.execCommand('insertText', false, variable);
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
      // AI returns plain text mostly, convert newlines to <br> for HTML editor
      const htmlBody = result.body.replace(/\n/g, '<br>');
      onChange({
        subject: result.subject,
        body: htmlBody
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 space-y-4">

        {/* AI Generator Section */}
        <div className="bg-indigo-900 rounded-xl p-6 text-slate-900 dark:text-white shadow-lg relative overflow-hidden">
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
                  className="w-full bg-indigo-950/50 border border-indigo-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white placeholder-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
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
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="font-medium text-slate-800 dark:text-white">Editor</h3>
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
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-600"
                title="Importar archivo JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                Importar
              </button>
              <button
                onClick={handleExportJSON}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-600"
                title="Exportar archivo JSON"
              >
                <FileJson className="w-3.5 h-3.5" />
                Exportar
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button
                onClick={handleSaveClick}
                className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                title="Guardar Plantilla (Ctrl + S)"
              >
                <Save className="w-4 h-4" />
                Guardar Plantilla
              </button>
            </div>
          </div>

          {showSaveDialog && (
            <div className="mb-4 p-4 bg-slate-50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-700 rounded-lg flex items-end gap-3 animate-in fade-in duration-200">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre de la plantilla</label>
                <input
                  autoFocus
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej. Recordatorio Mensual"
                />
              </div>
              <button onClick={confirmSave} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors">
                Guardar
              </button>
              <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                Cancelar
              </button>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asunto del Correo</label>
            <input
              type="text"
              value={template.subject}
              onChange={(e) => onChange({ ...template, subject: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              placeholder="Ej. Memorándum Importante"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cuerpo del Correo (HTML)</label>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 bg-slate-50 dark:bg-dark-900/50 p-2 rounded border border-slate-100 dark:border-slate-700 flex gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Usa el editor para dar formato. <strong>Nota:</strong> Al usar "Enviar" (mailto), el formato enriquecido se perderá. Usa la descarga <strong>.EML</strong> para conservar negritas, colores y listas.</p>
            </div>

            <div className="relative">
              <EmailEditor
                content={template.body}
                onChange={(newHtml) => onChange({ ...template, body: newHtml })}
              />
            </div>

            {/* Variables Disponibles (Picker) */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Variables Disponibles</h3>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">(Click para insertar)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => insertVariable(v.value)}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full transition-colors border border-indigo-100 dark:border-indigo-800"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-medium text-slate-800 dark:text-white">Adjuntos (Simulación)</h3>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800/50 mb-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Estos archivos se adjuntarán automáticamente en el archivo <strong>.EML</strong> generado.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-dark-900/50'}`}
          >
            <CloudUpload className={`w-10 h-10 mb-2 ${isDragging ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`} />
            <div className="flex flex-col items-center">
              <label className="cursor-pointer px-4 py-2 bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm mb-2">
                Seleccionar Archivos
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-500">o arrastra y suelta aquí</p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                {files.length} archivo(s) seleccionado(s)
              </span>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li key={index} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-dark-900/50 rounded border border-slate-100 dark:border-slate-700 group hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span className="truncate max-w-xs text-slate-700 dark:text-slate-200 font-medium">{file.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">({Math.round(file.size / 1024)} KB)</span>
                    </div>
                    <button onClick={() => removeFile(index)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 px-2 transition-colors">
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
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            Mis Plantillas
          </h3>
          {savedTemplates.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay plantillas guardadas</p>
          ) : (
            <ul className="space-y-2">
              {savedTemplates.map(t => (
                <li key={t.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 dark:hover:bg-dark-700 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                  <div className="flex-1 cursor-pointer" onClick={() => loadTemplate(t)}>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">{t.subject}</p>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => loadTemplate(t)}
                      title="Cargar"
                      className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(t.id)}
                      title="Eliminar"
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
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
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-6">
          <div className="bg-slate-100 dark:bg-dark-900/70 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Vista Previa
            </h3>
            {previewOfficial && (
              <span className="text-xs bg-slate-200 dark:bg-dark-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                {previewOfficial.name}
              </span>
            )}
          </div>
          <div className="p-4">
            {!previewOfficial ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                Agrega funcionarios para ver cómo queda el correo.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Asunto</span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">{previewContent.subject || '(Sin asunto)'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Cuerpo</span>
                  <div
                    className="mt-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-dark-900/50 p-2 rounded border border-slate-100 dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewContent.body }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
