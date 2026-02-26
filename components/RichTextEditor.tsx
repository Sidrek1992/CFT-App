
import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, RemoveFormatting, Code, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onKeyUp?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  id?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, onChange, placeholder, minHeight = "300px", onKeyUp, id 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync initial value or external updates
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
        // Only update if significantly different to avoid cursor jumps
        if (value === '' && contentRef.current.innerHTML === '<br>') return;
        contentRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
        contentRef.current.focus();
        onChange(contentRef.current.innerHTML);
    }
  };

  const ToolbarButton = ({ icon: Icon, command, arg, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent losing focus
        execCommand(command, arg);
      }}
      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
      title={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className={`border rounded-lg overflow-hidden bg-white transition-all ${isFocused ? 'ring-2 ring-indigo-500 border-transparent' : 'border-slate-300'}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50 flex-wrap">
        <ToolbarButton icon={Bold} command="bold" title="Negrita (Ctrl+B)" />
        <ToolbarButton icon={Italic} command="italic" title="Cursiva (Ctrl+I)" />
        <ToolbarButton icon={Underline} command="underline" title="Subrayado (Ctrl+U)" />
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <ToolbarButton icon={List} command="insertUnorderedList" title="Lista con viñetas" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Lista numerada" />
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Alinear Izquierda" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Centrar" />
        <ToolbarButton icon={AlignRight} command="justifyRight" title="Alinear Derecha" />
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                const url = prompt('Ingrese la URL:');
                if (url) execCommand('createLink', url);
            }}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Insertar Enlace"
        >
            <LinkIcon className="w-4 h-4" />
        </button>
        <ToolbarButton icon={RemoveFormatting} command="removeFormat" title="Limpiar Formato" />
      </div>

      {/* Editor Area */}
      <div
        id={id}
        ref={contentRef}
        contentEditable
        className="p-4 outline-none overflow-auto text-sm text-slate-700 font-sans leading-relaxed"
        style={{ minHeight }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyUp={onKeyUp}
        placeholder={placeholder}
      />
      
      {/* Visual Placeholder if empty */}
      {!value && !isFocused && (
          <div className="absolute top-[88px] left-5 text-slate-400 text-sm pointer-events-none">
              {placeholder || 'Escribe aquí...'}
          </div>
      )}
    </div>
  );
};
