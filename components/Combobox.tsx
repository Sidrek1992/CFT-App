import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  required?: boolean;
  type?: 'text' | 'email';
  id?: string;
}

const normalizeText = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const Combobox: React.FC<ComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder,
  icon,
  size = 'md',
  required = false,
  type = 'text',
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter suggestions based on current value
  const suggestions = value.trim()
    ? options.filter(o => normalizeText(o).includes(normalizeText(value)) && o !== value)
    : options;

  const showDropdown = open && suggestions.length > 0;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const selectOption = useCallback((option: string) => {
    onChange(option);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          selectOption(suggestions[activeIndex]);
        } else {
          setOpen(false);
        }
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        if (activeIndex >= 0) {
          selectOption(suggestions[activeIndex]);
        }
        setOpen(false);
        break;
    }
  };

  const isSm = size === 'sm';

  const inputBase = isSm
    ? 'w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all'
    : 'w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all';

  const paddingLeft = icon ? (isSm ? 'pl-9' : 'pl-10') : (isSm ? 'pl-3' : 'pl-4');
  const paddingRight = value ? 'pr-16' : 'pr-9';
  const paddingY = isSm ? 'py-2' : 'py-2';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Leading icon */}
      {icon && (
        <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none z-10"
          style={{ paddingLeft: isSm ? '10px' : '12px' }}>
          {icon}
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`${inputBase} ${paddingLeft} ${paddingRight} ${paddingY}`}
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-controls={showDropdown ? `${id ?? 'combo'}-listbox` : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${id ?? 'combo'}-opt-${activeIndex}` : undefined}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); onChange(''); inputRef.current?.focus(); }}
          className="absolute inset-y-0 right-8 flex items-center px-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Limpiar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Toggle chevron */}
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={e => {
          e.preventDefault();
          if (open) { setOpen(false); setActiveIndex(-1); }
          else { setOpen(true); inputRef.current?.focus(); }
        }}
        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        aria-label="Mostrar opciones"
      >
        <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown list */}
      {showDropdown && (
        <ul
          ref={listRef}
          id={`${id ?? 'combo'}-listbox`}
          role="listbox"
          className="absolute z-[200] mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-100"
        >
          {suggestions.map((option, index) => {
            const isActive = index === activeIndex;
            // Highlight matching part
            const norm = normalizeText(option);
            const normQuery = normalizeText(value);
            const start = norm.indexOf(normQuery);
            const end = start + normQuery.length;
            const before = option.slice(0, start);
            const match = option.slice(start, end);
            const after = option.slice(end);

            return (
              <li
                key={option}
                id={`${id ?? 'combo'}-opt-${index}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={e => { e.preventDefault(); selectOption(option); }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-700'
                }`}
              >
                {value.trim() && start >= 0 ? (
                  <span>
                    {before}
                    <strong className="font-semibold">{match}</strong>
                    {after}
                  </span>
                ) : (
                  <span>{option}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
