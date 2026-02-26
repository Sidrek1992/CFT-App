import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Official, Gender } from '../types';
import { Plus, Minus, Maximize2, Search, Users, Crown, Building2, X } from 'lucide-react';

interface OrgChartProps {
  officials: Official[];
}

// ─── Tree data structures ───────────────────────────────────────────────────

interface TreeNode {
  data: Official;
  children: TreeNode[];
  // Computed layout
  x: number;          // center x
  y: number;          // top y
  subtreeWidth: number;
}

// ─── Layout constants ────────────────────────────────────────────────────────

const NODE_W = 220;
const NODE_H = 88;
const H_GAP  = 32;   // horizontal gap between siblings
const V_GAP  = 72;   // vertical gap between levels

// ─── Normalize helper ────────────────────────────────────────────────────────

const normalize = (text: string) =>
  text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ─── Tree builder ────────────────────────────────────────────────────────────

function buildTree(officials: Official[]): { roots: TreeNode[]; orphanCount: number } {
  const nodeMap = new Map<string, TreeNode>();

  officials.forEach(o => {
    nodeMap.set(normalize(o.name), {
      data: o,
      children: [],
      x: 0, y: 0, subtreeWidth: NODE_W,
    });
  });

  let orphanCount = 0;
  const childSet = new Set<string>();

  officials.forEach(o => {
    const key = normalize(o.name);
    const bossKey = normalize(o.bossName || '');
    const bossNode = bossKey ? nodeMap.get(bossKey) : undefined;
    const selfNode = nodeMap.get(key)!;

    if (bossNode && bossNode !== selfNode) {
      bossNode.children.push(selfNode);
      childSet.add(key);
    } else if (o.bossName) {
      orphanCount++;
    }
  });

  const roots = officials
    .filter(o => !childSet.has(normalize(o.name)))
    .map(o => nodeMap.get(normalize(o.name))!);

  return { roots, orphanCount };
}

// ─── Layout algorithm (Reingold-Tilford simplified) ─────────────────────────

function computeLayout(node: TreeNode, depth: number, xOffset: number): number {
  node.y = depth * (NODE_H + V_GAP);

  if (node.children.length === 0) {
    node.subtreeWidth = NODE_W;
    node.x = xOffset + NODE_W / 2;
    return NODE_W;
  }

  let totalWidth = 0;
  node.children.forEach((child, i) => {
    const childWidth = computeLayout(child, depth + 1, xOffset + totalWidth + (i > 0 ? H_GAP : 0));
    totalWidth += childWidth + (i > 0 ? H_GAP : 0);
  });

  node.subtreeWidth = totalWidth;
  // Center parent over children
  const firstChildX = node.children[0].x;
  const lastChildX  = node.children[node.children.length - 1].x;
  node.x = (firstChildX + lastChildX) / 2;

  return totalWidth;
}

function layoutForest(roots: TreeNode[]): { totalW: number; totalH: number } {
  let xCursor = 0;
  let totalH = 0;

  roots.forEach((root, i) => {
    const w = computeLayout(root, 0, xCursor + (i > 0 ? H_GAP * 2 : 0));
    xCursor += w + (i > 0 ? H_GAP * 2 : 0);
    // measure height by traversal
  });

  // Find total bounds
  const allNodes: TreeNode[] = [];
  const collect = (n: TreeNode) => { allNodes.push(n); n.children.forEach(collect); };
  roots.forEach(collect);

  const maxY = allNodes.reduce((m, n) => Math.max(m, n.y + NODE_H), 0);
  const maxX = allNodes.reduce((m, n) => Math.max(m, n.x + NODE_W / 2), 0);

  return { totalW: maxX + 40, totalH: maxY + 40 };
}

// ─── SVG Connector ───────────────────────────────────────────────────────────

function buildConnectors(roots: TreeNode[]): { paths: string[] } {
  const paths: string[] = [];

  const visit = (node: TreeNode) => {
    node.children.forEach(child => {
      const x1 = node.x;
      const y1 = node.y + NODE_H;
      const x2 = child.x;
      const y2 = child.y;
      const midY = (y1 + y2) / 2;
      // Smooth bezier connector
      paths.push(`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
      visit(child);
    });
  };

  roots.forEach(visit);
  return { paths };
}

// ─── Node Card (rendered as foreignObject) ──────────────────────────────────

interface NodeCardProps {
  node: TreeNode;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: (node: TreeNode) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, isHighlighted, isDimmed, onClick }) => {
  const { data } = node;

  const accentColor =
    data.gender === Gender.Female ? '#ec4899' :
    data.gender === Gender.Male   ? '#6366f1' : '#94a3b8';

  const avatarBg =
    data.gender === Gender.Female ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300' :
    data.gender === Gender.Male   ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' :
                                    'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';

  return (
    <foreignObject
      x={node.x - NODE_W / 2}
      y={node.y}
      width={NODE_W}
      height={NODE_H}
      style={{ overflow: 'visible' }}
    >
      <div
        onClick={() => onClick(node)}
        className={`
          w-full h-full rounded-xl border cursor-pointer select-none
          transition-all duration-200 overflow-hidden
          ${isHighlighted
            ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-950/40 shadow-lg shadow-amber-200/40 dark:shadow-amber-900/30 scale-105'
            : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/30'
          }
          ${isDimmed ? 'opacity-25 scale-95' : 'opacity-100'}
        `}
        style={{ transformOrigin: 'center center' }}
      >
        {/* Color accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

        <div className="px-3 py-2 flex items-start gap-2.5 h-[calc(100%-4px)]">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${avatarBg}`}>
            {data.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              {data.isBoss && <Crown className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate leading-tight" title={data.name}>
                {data.name}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight" title={data.position}>
              {data.position}
            </p>
            {data.department && (
              <div className="flex items-center gap-1 mt-1.5">
                <Building2 className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={data.department}>
                  {data.department}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </foreignObject>
  );
};

// ─── Detail panel ────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{ node: TreeNode; onClose: () => void }> = ({ node, onClose }) => {
  const { data } = node;
  const genderLabel = data.gender === Gender.Male ? 'Masculino' : data.gender === Gender.Female ? 'Femenino' : 'No especificado';
  const genderColor = data.gender === Gender.Male ? 'text-indigo-600 dark:text-indigo-400' : data.gender === Gender.Female ? 'text-pink-600 dark:text-pink-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="absolute bottom-4 right-4 z-20 w-72 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-200">
      {/* Header */}
      <div className={`h-1.5 w-full ${data.gender === Gender.Female ? 'bg-pink-500' : data.gender === Gender.Male ? 'bg-indigo-500' : 'bg-slate-400'}`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              data.gender === Gender.Female ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300' :
              data.gender === Gender.Male   ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' :
                                              'bg-slate-100 dark:bg-slate-700 text-slate-500'
            }`}>
              {data.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{data.name}</p>
              <p className={`text-xs font-medium ${genderColor}`}>{genderLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {data.position && (
            <div className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500 w-16 shrink-0">Cargo</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium">{data.position}</span>
            </div>
          )}
          {data.department && (
            <div className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500 w-16 shrink-0">Depto.</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium">{data.department}</span>
            </div>
          )}
          {data.stament && (
            <div className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500 w-16 shrink-0">Estamento</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium">{data.stament}</span>
            </div>
          )}
          {data.email && (
            <div className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500 w-16 shrink-0">Correo</span>
              <a
                href={`mailto:${data.email}`}
                className="text-indigo-600 dark:text-indigo-400 font-medium truncate hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {data.email}
              </a>
            </div>
          )}
          {data.bossName && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-slate-400 dark:text-slate-500 mb-1">Reporta a</p>
              <p className="text-slate-700 dark:text-slate-200 font-medium">{data.bossName}</p>
              {data.bossPosition && <p className="text-slate-400 dark:text-slate-500">{data.bossPosition}</p>}
            </div>
          )}
          {node.children.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-slate-400 dark:text-slate-500">
                Supervisa a <span className="font-bold text-slate-700 dark:text-slate-200">{node.children.length}</span> persona{node.children.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main OrgChart ───────────────────────────────────────────────────────────

export const OrgChart: React.FC<OrgChartProps> = ({ officials }) => {
  const [scale, setScale] = useState(0.85);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Build & layout ──────────────────────────────────────────────────────────
  const { roots, orphanCount, totalW, totalH, connectorPaths, allNodes } = useMemo(() => {
    const { roots, orphanCount } = buildTree(officials);
    const { totalW, totalH } = layoutForest(roots);
    const { paths: connectorPaths } = buildConnectors(roots);

    const allNodes: TreeNode[] = [];
    const collect = (n: TreeNode) => { allNodes.push(n); n.children.forEach(collect); };
    roots.forEach(collect);

    return { roots, orphanCount, totalW, totalH, connectorPaths, allNodes };
  }, [officials]);

  // ── Fit-to-screen on first load / data change ────────────────────────────
  useEffect(() => {
    if (!containerRef.current || totalW === 0) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const padding = 80;
    const fitScale = Math.min(
      (width  - padding) / totalW,
      (height - padding) / totalH,
      1
    );
    const s = Math.max(0.25, fitScale);
    setScale(s);
    setPosition({
      x: (width  - totalW * s) / 2,
      y: padding / 2,
    });
  }, [totalW, totalH]);

  // ── Search highlight ─────────────────────────────────────────────────────
  const normQuery = normalize(searchQuery);
  const highlightedIds = useMemo(() => {
    if (!normQuery) return new Set<string>();
    return new Set(
      allNodes
        .filter(n => normalize(n.data.name).includes(normQuery) || normalize(n.data.position).includes(normQuery))
        .map(n => n.data.id)
    );
  }, [normQuery, allNodes]);

  const hasSearch = normQuery.length > 0;

  // ── Pan handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch pan
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setPosition(p => ({ x: p.x + dx, y: p.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);
  const handleTouchEnd = useCallback(() => { lastTouch.current = null; }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(s => Math.min(Math.max(0.2, s + delta), 2));
  }, []);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current || totalW === 0) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const padding = 80;
    const s = Math.max(0.25, Math.min((width - padding) / totalW, (height - padding) / totalH, 1));
    setScale(s);
    setPosition({ x: (width - totalW * s) / 2, y: padding / 2 });
  }, [totalW, totalH]);

  const handleNodeClick = useCallback((node: TreeNode) => {
    setSelectedNode(prev => prev?.data.id === node.data.id ? null : node);
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────
  const bossCount = allNodes.filter(n => n.children.length > 0).length;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (officials.length === 0) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center p-8">
        <div className="w-16 h-16 bg-slate-100 dark:bg-dark-700 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Sin datos para mostrar</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Agrega funcionarios en la Base de Datos.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative select-none">

      {/* ── Toolbar (top bar) ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800/80 shrink-0 flex-wrap">

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setScale(s => Math.min(2, +(s + 0.1).toFixed(2)))}
            className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 transition-colors text-sm font-medium"
            title="Acercar"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-mono text-slate-500 dark:text-slate-400 border-x border-slate-200 dark:border-slate-600 py-1.5 min-w-[46px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.max(0.2, +(s - 0.1).toFixed(2)))}
            className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 transition-colors text-sm font-medium"
            title="Alejar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={fitToScreen}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors shrink-0"
          title="Ajustar a pantalla"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Ajustar
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar persona o cargo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {hasSearch && highlightedIds.size > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full font-medium">
              {highlightedIds.size} resultado{highlightedIds.size !== 1 ? 's' : ''}
            </span>
          )}
          {hasSearch && highlightedIds.size === 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-medium">
              Sin resultados
            </span>
          )}
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-dark-700 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            {officials.length} personas
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-dark-700 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {bossCount} con equipo
          </span>
          {orphanCount > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
              {orphanCount} sin jefatura
            </span>
          )}
        </div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          background: 'radial-gradient(circle, var(--dot-color, #e2e8f0) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <style>{`
          .dark .flex-1.overflow-hidden { --dot-color: #1e293b; }
          .flex-1.overflow-hidden { --dot-color: #e2e8f0; }
        `}</style>

        <svg
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            width: totalW,
            height: totalH,
            overflow: 'visible',
          }}
        >
          {/* ── Connector paths ── */}
          <g>
            {connectorPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                strokeWidth={1.5}
                className="stroke-slate-300 dark:stroke-slate-600"
              />
            ))}
          </g>

          {/* ── Nodes ── */}
          {allNodes.map(node => {
            const isHighlighted = hasSearch && highlightedIds.has(node.data.id);
            const isDimmed = hasSearch && !highlightedIds.has(node.data.id);
            const isSelected = selectedNode?.data.id === node.data.id;

            return (
              <g key={node.data.id} data-node="true">
                {/* Selection ring */}
                {isSelected && (
                  <rect
                    x={node.x - NODE_W / 2 - 3}
                    y={node.y - 3}
                    width={NODE_W + 6}
                    height={NODE_H + 6}
                    rx={15}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    opacity={0.8}
                  />
                )}
                <NodeCard
                  node={node}
                  isHighlighted={isHighlighted}
                  isDimmed={isDimmed}
                  onClick={handleNodeClick}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────────── */}
      {selectedNode && (
        <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      {/* ── Hint ──────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 text-[10px] text-slate-400 dark:text-slate-600 pointer-events-none">
        Scroll para zoom · Arrastra para mover · Click en nodo para detalles
      </div>
    </div>
  );
};
