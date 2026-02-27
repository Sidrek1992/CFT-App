import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Official, Gender } from '../types';
import { Plus, Minus, Maximize2, Search, Users, Crown, Building2, X, Download, Printer, Layout, Focus, ChevronsUp, ChevronsDown, Camera, Check } from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { stratify, tree, hierarchy } from 'd3-hierarchy';
import { motion, AnimatePresence } from 'framer-motion';

interface OrgChartProps {
  officials: Official[];
}

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_W = 260;
const NODE_H = 110;
const V_GAP = 80;
const H_GAP = 40;

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#6366f1'
];

const normalize = (text: string) =>
  text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

// Helper to get color for a department
function getDepartmentColor(department: string, map: Map<string, string>) {
  if (!department) return '#94a3b8';
  const normDept = normalize(department);
  if (map.has(normDept)) return map.get(normDept)!;
  const color = COLORS[map.size % COLORS.length];
  map.set(normDept, color);
  return color;
}

// ─── Node Component ──────────────────────────────────────────────────────────
const NodeCard = ({
  node,
  isHighlighted,
  isDimmed,
  isSelected,
  onClick,
  onToggleCollapse,
  isCollapsed,
  deptColor,
  layout
}: any) => {
  const { data } = node;
  const hasChildren = node._children && node._children.length > 0;

  const accentColor = deptColor || (
    data.gender === Gender.Female ? '#ec4899' :
      data.gender === Gender.Male ? '#6366f1' : '#94a3b8'
  );

  const avatarBg =
    data.gender === Gender.Female ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300' :
      data.gender === Gender.Male ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' :
        'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(node); }}
      className={`
        w-full h-full rounded-xl border cursor-pointer select-none
        transition-all duration-300 overflow-visible relative
        ${isHighlighted
          ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-950/40 shadow-xl shadow-amber-200/50 dark:shadow-amber-900/40 scale-[1.02] z-10'
          : isSelected
            ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/40 scale-[1.02] z-10'
            : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/30'
        }
        ${isDimmed ? 'opacity-30 scale-95 grayscale-[50%]' : 'opacity-100'}
      `}
      style={{
        boxShadow: isHighlighted ? `0 0 20px -5px ${accentColor}` : undefined
      }}
    >
      <div className="h-1.5 w-full rounded-t-xl" style={{ backgroundColor: accentColor }} />

      <div className="px-3 py-2 flex items-start gap-3 h-[calc(100%-6px)]">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0 mt-1 shadow-sm ${avatarBg}`}>
          {data.profileImage ? (
            <img src={data.profileImage} alt={data.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            data.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {data.isBoss && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate leading-tight" title={data.name}>
                {data.name}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-snug" title={data.position}>
            {data.position}
          </p>
          {data.department && (
            <div className="flex items-center gap-1.5 mt-2 bg-slate-50 dark:bg-dark-900 px-2 py-1 rounded w-fit max-w-full">
              <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title={data.department}>
                {data.department}
              </p>
            </div>
          )}
        </div>
      </div>

      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(node.data.id);
          }}
          className={`
            absolute transition-all duration-200
            flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 shadow-sm
            hover:bg-slate-50 dark:hover:bg-dark-700 hover:scale-110 z-20 text-slate-500 dark:text-slate-400
            ${layout === 'vertical' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'}
          `}
        >
          {isCollapsed ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
        </button>
      )}
      {hasChildren && isCollapsed && (
        <div className={`absolute text-[10px] font-bold text-slate-400 bg-white dark:bg-dark-800 border-slate-200 dark:border-slate-700 border rounded-full px-1.5 py-0.5
            ${layout === 'vertical' ? 'bottom-0 left-1/2 translate-x-3 translate-y-3' : 'right-0 top-1/2 translate-x-3 -translate-y-4'}
         `}>
          {node._children.length}
        </div>
      )}
    </div>
  );
};

// ─── Detail panel ────────────────────────────────────────────────────────────
const DetailPanel: React.FC<{ node: any; onClose: () => void }> = ({ node, onClose }) => {
  const { data } = node;
  const genderLabel = data.gender === Gender.Male ? 'Masculino' : data.gender === Gender.Female ? 'Femenino' : 'No especificado';
  const genderColor = data.gender === Gender.Male ? 'text-indigo-600 dark:text-indigo-400' : data.gender === Gender.Female ? 'text-pink-600 dark:text-pink-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="absolute top-4 right-4 z-50 w-80 bg-white/95 dark:bg-dark-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300">
      <div className={`h-2 w-full ${data.gender === Gender.Female ? 'bg-pink-500' : data.gender === Gender.Male ? 'bg-indigo-500' : 'bg-slate-400'}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-inner ${data.gender === Gender.Female ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300' :
              data.gender === Gender.Male ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' :
                'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>
              {data.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-base text-slate-800 dark:text-white leading-tight">{data.name}</p>
              <p className={`text-xs font-medium mt-0.5 ${genderColor}`}>{genderLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {data.position && (
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">CARGO</p>
              <p className="text-slate-700 dark:text-slate-200 font-medium leading-snug">{data.position}</p>
            </div>
          )}
          {data.department && (
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">DEPARTAMENTO</p>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium bg-slate-50 dark:bg-dark-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <Building2 className="w-4 h-4 text-slate-400" />
                {data.department}
              </div>
            </div>
          )}
          {data.stament && (
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">ESTAMENTO</p>
              <p className="text-slate-700 dark:text-slate-200 font-medium">{data.stament}</p>
            </div>
          )}
          {data.email && (
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">CORREO ELECTRÓNICO</p>
              <a href={`mailto:${data.email}`} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline break-all inline-block truncate w-full">
                {data.email}
              </a>
            </div>
          )}
          {data.bossName && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1 flex items-center gap-1.5">
                <ChevronsUp className="w-3.5 h-3.5" />
                REPORTA A
              </p>
              <p className="text-slate-700 dark:text-slate-200 font-bold">{data.bossName}</p>
              {data.bossPosition && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{data.bossPosition}</p>}
            </div>
          )}
          {(node._children && node._children.length > 0) && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1 flex items-center gap-1.5">
                <ChevronsDown className="w-3.5 h-3.5" />
                EQUIPO A CARGO
              </p>
              <p className="text-slate-700 dark:text-slate-200">
                Supervisa a <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{node._children.length}</span> persona{node._children.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Control Components ──────────────────────────────────────────────────────
const Controls = ({ layout, setLayout, onExportPDF, onExportPNG, isExporting, toggleExpandAll, expandAllState }: any) => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 print-hide">
      <div className="flex flex-col bg-white/90 dark:bg-dark-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800" onClick={() => zoomIn()} title="Acercar">
          <Plus className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800" onClick={() => zoomOut()} title="Alejar">
          <Minus className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300" onClick={() => resetTransform()} title="Ajustar">
          <Focus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col bg-white/90 dark:bg-dark-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden mt-2">
        <button
          className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 flex justify-center"
          onClick={() => setLayout(layout === 'vertical' ? 'horizontal' : 'vertical')}
          title="Cambiar Diseño"
        >
          <Layout className={`w-4 h-4 transition-transform duration-300 ${layout === 'horizontal' ? 'rotate-90' : ''}`} />
        </button>
        <button
          className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 flex justify-center"
          onClick={toggleExpandAll}
          title={expandAllState ? "Contraer Todo" : "Expandir Todo"}
        >
          {expandAllState ? <ChevronsUp className="w-4 h-4" /> : <ChevronsDown className="w-4 h-4" />}
        </button>
        <button
          className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 flex justify-center"
          onClick={onExportPNG}
          disabled={isExporting}
          title="Exportar como PNG"
        >
          {isExporting ? <Check className="w-4 h-4 text-emerald-500" /> : <Camera className="w-4 h-4" />}
        </button>
        <button
          className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 flex justify-center"
          onClick={onExportPDF}
          disabled={isExporting}
          title="Exportar como PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


// ─── Main OrgChart ───────────────────────────────────────────────────────────

export const OrgChart: React.FC<OrgChartProps> = ({ officials }) => {
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<ReactZoomPanPinchRef>(null);

  const deptColors = useMemo(() => new Map<string, string>(), []);

  // ── Build tree ────────────────────────────────────────────────────────────
  //
  // Node shape used throughout: { ...Official fields, children?: Node[] }
  // i.e. the Official data is spread directly at the top level so that every
  // d3-hierarchy node satisfies:  node.data.name, node.data.id, etc.
  // This avoids the nested node.data.data.name pattern that caused the crash.
  //
  const { rootObj, orphanCount } = useMemo(() => {
    if (officials.length === 0) return { rootObj: null, orphanCount: 0 };

    // Map normalised name → id for bossName resolution
    const nameToId = new Map<string, string>();
    officials.forEach(o => {
      if (o.name) nameToId.set(normalize(o.name), o.id);
    });

    // Resolve parentId from bossName for each official
    const withParent = officials.map(o => ({
      ...o,
      name: o.name || '',   // guard: ensure name is always a string
      parentId: o.bossName ? nameToId.get(normalize(o.bossName)) : undefined,
    }));

    // Build id → node map (node data IS the official, children added below)
    const nodeMap = new Map<string, any>();
    withParent.forEach(o => nodeMap.set(o.id, { ...o }));

    let orphans = 0;
    const roots: any[] = [];

    withParent.forEach(o => {
      const node = nodeMap.get(o.id)!;
      if (o.parentId && nodeMap.has(o.parentId) && o.parentId !== o.id) {
        const parent = nodeMap.get(o.parentId)!;
        (parent.children ??= []).push(node);
      } else {
        if (o.bossName) orphans++;
        roots.push(node);
      }
    });

    // Wrap multiple roots under a single virtual root
    const finalRoot: any = roots.length === 1
      ? roots[0]
      : {
          id: 'dummy_root',
          name: 'Organización',
          gender: Gender.Unspecified,
          isBoss: true,
          email: '',
          position: '',
          department: '',
          title: '',
          bossName: '',
          bossPosition: '',
          bossEmail: '',
          children: roots,
        };

    try {
      const hierarchyRoot = hierarchy(finalRoot, (d: any) => d.children ?? null);
      // Store original children for collapse/expand logic
      hierarchyRoot.each((d: any) => { d._children = d.children; });
      return { rootObj: hierarchyRoot, orphanCount: orphans };
    } catch (e) {
      console.error('Error creating hierarchy', e);
      return { rootObj: null, orphanCount: 0 };
    }
  }, [officials]);

  // Handle collapsing — rebuild a filtered hierarchy from rootObj
  const treeData = useMemo(() => {
    if (!rootObj) return null;

    // Build id → d3-node lookup for fast access
    const nodeById = new Map<string, any>();
    rootObj.each((n: any) => nodeById.set(n.data.id, n));

    // Rebuild hierarchy respecting collapsed state
    const copy = hierarchy(rootObj.data, (d: any) => {
      if (collapsedNodes.has(d.id)) return null;
      const orig = nodeById.get(d.id);
      return orig?._children?.map((c: any) => c.data) ?? null;
    });

    // Carry _children refs so collapse buttons know child counts
    copy.each((d: any) => {
      const orig = nodeById.get(d.data.id);
      d._children = orig?._children ?? null;
    });

    const layoutTree = tree().nodeSize(
      layout === 'vertical'
        ? [NODE_W + H_GAP, NODE_H + V_GAP]
        : [NODE_H + H_GAP, NODE_W + V_GAP + 60]
    );

    return layoutTree(copy);
  }, [rootObj, collapsedNodes, layout]);

  // Compute bounding box
  const bounds = useMemo(() => {
    if (!treeData) return { width: 0, height: 0, minX: 0, minY: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    treeData.each(d => {
      const x = layout === 'vertical' ? d.x : d.y;
      const y = layout === 'vertical' ? d.y : d.x;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    const padding = 100;
    return {
      minX: minX - NODE_W / 2 - padding,
      minY: minY - padding,
      width: maxX - minX + NODE_W + padding * 2,
      height: maxY - minY + NODE_H + padding * 2
    };
  }, [treeData, layout]);

  // Highlight search
  const normQuery = normalize(searchQuery);
  const matchedPath = useMemo(() => {
    const path = new Set<string>();
    if (!normQuery || !treeData) return path;

    // Find matched nodes
    const matches: any[] = [];
    treeData.each(d => {
      if (normalize((d.data as any).name).includes(normQuery) || normalize((d.data as any).position || '').includes(normQuery)) {
        matches.push(d);
      }
    });

    // Add paths to root
    matches.forEach(m => {
      let curr = m;
      while (curr) {
        path.add(curr.data.id);
        curr = curr.parent;
      }
    });

    // Auto-center if exactly one match
    if (matches.length === 1 && wrapperRef.current) {
      setTimeout(() => {
        wrapperRef.current?.zoomToElement(`node-${matches[0].data.id}`, 1.2, 500, "easeOut");
      }, 100);
    }

    return path;
  }, [normQuery, treeData]);

  // Export functions
  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'organigrama.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', quality: 1, pixelRatio: 2 });
      const pdf = new jsPDF({
        orientation: bounds.width > bounds.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [bounds.width, bounds.height]
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, bounds.width, bounds.height);
      pdf.save('organigrama.pdf');
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleExpandAll = useCallback(() => {
    if (expandAll) {
      const allIds = new Set<string>();
      rootObj?.each(d => {
        if ((d as any)._children && (d as any)._children.length > 0) {
          allIds.add(d.data.id);
        }
      });
      setCollapsedNodes(allIds);
      setExpandAll(false);
    } else {
      setCollapsedNodes(new Set());
      setExpandAll(true);
    }
  }, [expandAll, rootObj]);

  if (officials.length === 0 || !treeData) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center p-8">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Sin organigrama</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Agrega funcionarios para visualizar la estructura.</p>
      </div>
    );
  }

  const nodes = treeData.descendants();
  const links = treeData.links();

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">

      {/* ── Topbar Search ── */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 shrink-0 z-30 relative shadow-sm print-hide">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-700/50 px-3 py-2 rounded-lg flex-1 max-w-md border border-slate-200 dark:border-slate-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar persona o cargo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-dark-900/50 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Users className="w-4 h-4 text-indigo-500" />
            {officials.length} Activos
          </div>
          {orphanCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50">
              {orphanCount} Sin Jefatura
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-50/50 dark:bg-dark-900/50">
        <TransformWrapper
          ref={wrapperRef}
          initialScale={0.8}
          minScale={0.1}
          maxScale={2}
          centerOnInit={true}
          wheel={{ step: 0.1 }}
        >
          <Controls
            layout={layout} setLayout={setLayout}
            onExportPDF={handleExportPDF} onExportPNG={handleExportPNG}
            isExporting={isExporting}
            toggleExpandAll={toggleExpandAll}
            expandAllState={expandAll}
          />
          <TransformComponent wrapperClass="!w-full !h-full" contentClass="">
            <div
              className="cursor-grab active:cursor-grabbing"
              style={{
                width: bounds.width || '100%',
                height: bounds.height || '100%',
                background: 'radial-gradient(circle, var(--dot-color, #cbd5e1) 1.5px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            >
              <style>{`
                .dark .cursor-grab { --dot-color: #334155; }
                .cursor-grab { --dot-color: #cbd5e1; }
                @media print {
                  body * { visibility: hidden; }
                  #org-chart-print-area, #org-chart-print-area * { visibility: visible; }
                  #org-chart-print-area { position: absolute; left: 0; top: 0; width: 100vw; height: 100vh; background: white !important; }
                  .print-hide { display: none !important; }
                }
              `}</style>

              <div
                id="org-chart-print-area"
                ref={chartRef}
                className="relative"
                style={{
                  width: bounds.width,
                  height: bounds.height,
                  transform: `translate(${-bounds.minX}px, ${-bounds.minY}px)`,
                  transformOrigin: '0 0'
                }}
              >
                {/* SVG Links */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
                  <AnimatePresence>
                    {links.map((link: any) => {
                      const id = `${link.source.data.id}-${link.target.data.id}`;

                      // Path generator based on layout
                      let d = '';
                      if (layout === 'vertical') {
                        const sx = link.source.x;
                        const sy = link.source.y + NODE_H / 2;
                        const tx = link.target.x;
                        const ty = link.target.y - NODE_H / 2;
                        const midY = (sy + ty) / 2;
                        d = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
                      } else {
                        const sx = link.source.y + NODE_W / 2;
                        const sy = link.source.x;
                        const tx = link.target.y - NODE_W / 2;
                        const ty = link.target.x;
                        const midX = (sx + tx) / 2;
                        d = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
                      }

                      const isPathHighlighted = normQuery ? matchedPath.has(link.source.data.id) && matchedPath.has(link.target.data.id) : false;
                      const isDimmed = normQuery && !isPathHighlighted;

                      return (
                        <motion.path
                          key={id}
                          initial={{ opacity: 0, pathLength: 0 }}
                          animate={{ opacity: isDimmed ? 0.2 : 1, pathLength: 1, d }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          fill="none"
                          stroke={isPathHighlighted ? '#818cf8' : 'currentColor'}
                          strokeWidth={isPathHighlighted ? 3 : 2}
                          className={`text-slate-300 dark:text-slate-600 transition-colors duration-300`}
                        />
                      );
                    })}
                  </AnimatePresence>
                </svg>

                {/* Nodes */}
                <AnimatePresence>
                  {nodes.map((node: any) => {
                    if (node.data.id === 'dummy_root') return null; // Hide dummy root

                    const x = layout === 'vertical' ? node.x : node.y;
                    const y = layout === 'vertical' ? node.y : node.x;

                    const isHighlighted = normQuery ? matchedPath.has(node.data.id) : false;
                    const isDimmed = normQuery ? !isHighlighted : false;
                    const isSelected = selectedNode?.data.id === node.data.id;
                    const isCollapsed = collapsedNodes.has(node.data.id);
                    const deptColor = getDepartmentColor(node.data.department, deptColors);

                    return (
                      <motion.div
                        id={`node-${node.data.id}`}
                        key={node.data.id}
                        className="absolute"
                        initial={{ opacity: 0, scale: 0.5, x: x - NODE_W / 2, y: y - NODE_H / 2 }}
                        animate={{ opacity: 1, scale: 1, x: x - NODE_W / 2, y: y - NODE_H / 2 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        style={{
                          width: NODE_W,
                          height: NODE_H,
                          zIndex: isSelected || isHighlighted ? 20 : 10
                        }}
                      >
                        <NodeCard
                          node={node}
                          isHighlighted={isHighlighted}
                          isDimmed={isDimmed}
                          isSelected={isSelected}
                          isCollapsed={isCollapsed}
                          deptColor={deptColor}
                          layout={layout}
                          onClick={(n: any) => setSelectedNode(prev => prev?.data.id === n.data.id ? null : n)}
                          onToggleCollapse={toggleCollapse}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {selectedNode && (
        <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
};
