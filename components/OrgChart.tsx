
import React, { useMemo, useState, useRef } from 'react';
import { Official, Gender } from '../types';
import { Plus, Minus, Maximize, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface OrgChartProps {
  officials: Official[];
}

interface TreeNode {
  data: Official;
  children: TreeNode[];
}

// Helper to normalize text for comparisons
const normalize = (text: string) => text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const OrgChart: React.FC<OrgChartProps> = ({ officials }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchName, setSearchName] = useState('');

  // Tree Construction
  const { treeRoots, orphanCount } = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    
    // 1. Create nodes
    officials.forEach(o => {
      nodeMap.set(normalize(o.name), { data: o, children: [] });
    });

    // 2. Connect children to parents
    let orphans = 0;
    
    officials.forEach(o => {
      const currentNode = nodeMap.get(normalize(o.name))!;
      const bossNameNorm = normalize(o.bossName || '');

      if (bossNameNorm && nodeMap.has(bossNameNorm)) {
        const bossNode = nodeMap.get(bossNameNorm);
        if (bossNode && bossNode !== currentNode) {
            bossNode.children.push(currentNode);
        } else {
            roots.push(currentNode);
        }
      } else {
        roots.push(currentNode);
        if (o.bossName) orphans++;
      }
    });

    return { treeRoots: roots, orphanCount: orphans };
  }, [officials]);

  // Zoom & Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(s => Math.min(Math.max(0.2, s + delta), 2));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const centerChart = () => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative">
      
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-lg rounded-lg p-2 border border-slate-200">
        <div className="flex items-center gap-1 border-b border-slate-100 pb-2 mb-2">
            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Plus className="w-4 h-4" /></button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Minus className="w-4 h-4" /></button>
        </div>
        <button onClick={centerChart} className="p-2 hover:bg-slate-100 rounded text-slate-600 flex items-center gap-2 text-xs font-medium" title="Centrar">
            <Maximize className="w-4 h-4" /> Centrar
        </button>
        <div className="relative pt-2 border-t border-slate-100">
             <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-32 px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-500"
             />
             <Search className="w-3 h-3 text-slate-600 dark:text-slate-400 absolute right-2 top-4" />
        </div>
      </div>

      {/* Stats Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur shadow-sm rounded-lg p-3 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="font-bold text-slate-700">{officials.length}</span> Funcionarios
          </div>
          <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-700">{treeRoots.length}</span> Líderes (Raíz)
          </div>
          {orphanCount > 0 && (
             <div className="flex items-center gap-2 text-amber-600 mt-2 pt-2 border-t border-slate-100">
                 <span className="font-bold">{orphanCount}</span> sin jefatura encontrada
             </div>
          )}
      </div>

      {/* Chart Canvas */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden cursor-move ${isDragging ? 'cursor-grabbing' : ''} bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center top',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            className="min-w-full min-h-full flex justify-center p-20"
        >
            <div className="flex gap-12">
                {treeRoots.length === 0 ? (
                    <div className="text-center text-slate-600 dark:text-slate-400 mt-20">
                        <p className="text-lg font-medium">No hay datos para mostrar</p>
                        <p className="text-sm">Agrega funcionarios en la Base de Datos.</p>
                    </div>
                ) : (
                    treeRoots.map(node => (
                        <TreeNodeComponent key={node.data.id} node={node} highlight={searchName} />
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

const TreeNodeComponent: React.FC<{ node: TreeNode, highlight: string }> = ({ node, highlight }) => {
    const [collapsed, setCollapsed] = useState(false);
    const hasChildren = node.children.length > 0;
    
    // Highlight Logic
    const isHighlighted = highlight && normalize(node.data.name).includes(normalize(highlight));
    const isParentOfHighlight = highlight && JSON.stringify(node).toLowerCase().includes(highlight.toLowerCase());

    return (
        <div className="flex flex-col items-center">
            {/* Node Card */}
            <div 
                className={`
                    relative z-10 w-64 rounded-xl border transition-all duration-300 shadow-sm
                    ${isHighlighted ? 'ring-4 ring-amber-300 border-amber-500 bg-amber-50 scale-105' : 'bg-white border-slate-200 hover:shadow-md hover:border-indigo-300'}
                    ${highlight && !isHighlighted && !isParentOfHighlight ? 'opacity-30 blur-[1px]' : 'opacity-100'}
                `}
            >
                <div className={`h-1.5 w-full rounded-t-xl ${node.data.gender === Gender.Female ? 'bg-pink-500' : node.data.gender === Gender.Male ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                <div className="p-3">
                    <div className="flex items-start gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${node.data.gender === Gender.Female ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {node.data.name.charAt(0)}
                         </div>
                         <div className="min-w-0">
                             <p className="text-sm font-bold text-slate-800 leading-tight truncate" title={node.data.name}>
                                 {node.data.name}
                             </p>
                             <p className="text-xs text-slate-500 dark:text-slate-500 font-medium truncate mt-0.5" title={node.data.position}>
                                 {node.data.position}
                             </p>
                         </div>
                    </div>
                    {node.data.department && (
                        <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wide truncate">
                            {node.data.department}
                        </div>
                    )}
                </div>

                {/* Collapse Button */}
                {hasChildren && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
                        className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm z-20"
                    >
                        {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </button>
                )}
            </div>

            {/* Children Connector Lines & Rendering */}
            {hasChildren && !collapsed && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Line down from parent */}
                    <div className="w-px h-8 bg-slate-300"></div>
                    
                    {/* Horizontal connector line container */}
                    <div className="flex relative pt-4">
                        {node.children.map((child, index) => (
                            <div key={child.data.id} className="flex flex-col items-center px-4 relative">
                                {/* Horizontal Lines */}
                                {index > 0 && (
                                    <div className="absolute top-0 left-0 w-[50%] h-px bg-slate-300 -translate-y-[1px]"></div>
                                )}
                                {index < node.children.length - 1 && (
                                    <div className="absolute top-0 right-0 w-[50%] h-px bg-slate-300 -translate-y-[1px]"></div>
                                )}
                                
                                {/* Vertical line to child */}
                                <div className="absolute top-0 left-1/2 w-px h-8 bg-slate-300 -translate-x-1/2 -translate-y-[1px]"></div>

                                {/* Child Node */}
                                <div className="mt-8">
                                    <TreeNodeComponent node={child} highlight={highlight} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
