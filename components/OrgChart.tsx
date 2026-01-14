import React, { useMemo } from 'react';
import { Official, Gender } from '../types';
import { Users, User, Briefcase, ChevronRight, Map, TreePine } from 'lucide-react';

interface OrgChartProps {
    officials: Official[];
}

interface OrgTreeNode {
    official: Official;
    children: OrgTreeNode[];
}

export const OrgChart: React.FC<OrgChartProps> = ({ officials }) => {
    const hierarchy = useMemo(() => {
        const nodes: Record<string, OrgTreeNode> = {};

        // Create nodes for everyone
        officials.forEach(o => {
            nodes[o.name] = { official: o, children: [] };
        });

        const roots: OrgTreeNode[] = [];

        // Build the tree
        officials.forEach(o => {
            const bossNode = o.bossName ? nodes[o.bossName] : null;
            if (bossNode && o.name !== o.bossName) {
                bossNode.children.push(nodes[o.name]);
            } else {
                roots.push(nodes[o.name]);
            }
        });

        return roots;
    }, [officials]);

    const renderNode = (node: OrgTreeNode, depth: number = 0) => {
        return (
            <div key={node.official.id} className="flex flex-col items-center">
                <div className={`
                    p-4 bg-white rounded-2xl border-2 transition-all shadow-sm hover:shadow-md group relative
                    ${depth === 0 ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}
                    w-64 mb-12
                `}>
                    <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto
                        ${node.official.gender === Gender.Female ? 'bg-rose-50 text-rose-600' :
                            node.official.gender === Gender.Male ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}
                    `}>
                        <User className="w-6 h-6" />
                    </div>

                    <div className="text-center">
                        <h4 className="text-sm font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight line-clamp-2">
                            {node.official.name}
                        </h4>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest truncate mb-2">
                            {node.official.position}
                        </p>
                        <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase truncate">
                                {node.official.department || 'Sin Depto'}
                            </span>
                        </div>
                    </div>

                    {node.children.length > 0 && (
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-slate-200"></div>
                    )}
                </div>

                {node.children.length > 0 && (
                    <div className="flex gap-8 relative mt-0">
                        {/* Horizontal Connection Line */}
                        {node.children.length > 1 && (
                            <div className="absolute top-0 left-[32px] right-[32px] h-0.5 bg-slate-200"></div>
                        )}

                        {node.children.map((child, index) => (
                            <div key={child.official.id} className="relative">
                                {/* Vertical Connectors to children */}
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-slate-200"></div>
                                {renderNode(child, depth + 1)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Map className="w-7 h-7 text-indigo-600" />
                        Organigrama Institucional
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">Visualización jerárquica de la estructura organizacional</p>
                </div>
                <div className="flex gap-2 bg-indigo-50 p-2 rounded-xl">
                    <TreePine className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">{officials.length} MIEMBROS</span>
                </div>
            </div>

            <div className="bg-slate-50/50 rounded-3xl border border-slate-200 p-12 min-h-[600px] overflow-auto flex justify-center custom-scrollbar">
                <div className="inline-block pt-8">
                    {hierarchy.length === 0 ? (
                        <div className="text-center p-20">
                            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest">No hay datos jerárquicos registrados</p>
                        </div>
                    ) : (
                        <div className="flex gap-20">
                            {hierarchy.map(root => renderNode(root))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Liderazgo Institucional</span>
                </div>
                <div className="flex items-center gap-2 border-l border-slate-100 pl-6">
                    <div className="w-3 h-3 border-2 border-slate-200 rounded-sm"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nivel Operativo</span>
                </div>
                <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    * Generado automáticamente basado en reportes de jefatura
                </div>
            </div>
        </div>
    );
};
