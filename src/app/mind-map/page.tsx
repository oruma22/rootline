'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { X, ZoomIn, ZoomOut, Maximize2, Link2, Unlink, ArrowUpRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type EntryTag = 'idea' | 'thought' | 'plan';
type LinkRelation = 'related' | 'branched';

interface NodeEntry {
  id: string;
  title: string;
  body: string;
  tag: EntryTag;
  dateLabel: string;
  x: number;
  y: number;
}

interface EdgeLink {
  id: string;
  from: string;
  to: string;
  relation: LinkRelation;
}

const NODE_W = 160;
const NODE_H = 90;

const tagNoteStyle: Record<EntryTag, { bg: string; border: string; ring: string }> = {
  idea:    { bg: '#FFFBEB', border: '#F0E68C', ring: '#D97706' },
  thought: { bg: '#F0F4FF', border: '#C7D2FE', ring: '#4338CA' },
  plan:    { bg: '#F0FFF4', border: '#BBF7D0', ring: '#16A34A' },
};

export default function MindMapPage() {
  const [nodes, setNodes] = useState<NodeEntry[]>([]);
  const [edges, setEdges] = useState<EdgeLink[]>([]);
  const [graphLoaded, setGraphLoaded] = useState(false);

  // Selection for linking: up to 2 nodes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Link mode: when 2 nodes selected, show relation picker
  const [linkPickerVisible, setLinkPickerVisible] = useState(false);

  // View transform
  const [transform, setTransform] = useState({ x: 60, y: 60, scale: 1 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [didDrag, setDidDrag] = useState(false);

  // Entry detail modal
  const [selectedEntry, setSelectedEntry] = useState<NodeEntry | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  const supabase = createClient();
  const { user } = useAuth();

  // ─── Load from Supabase on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Load full node data from idea_tree_nodes
      const { data: nodeRows, error: nodeErr } = await supabase
        .from('idea_tree_nodes')
        .select('id, title, body, tag, date_label, x, y')
        .eq('user_id', user.id);

      if (nodeErr) {
        console.error('Failed to load idea_tree_nodes:', nodeErr.message);
      }

      if (nodeRows && nodeRows.length > 0) {
        setNodes(
          nodeRows.map((r) => ({
            id: r.id,
            title: r.title ?? '',
            body: r.body ?? '',
            tag: (r.tag ?? 'thought') as EntryTag,
            dateLabel: r.date_label ?? '',
            x: r.x ?? 80,
            y: r.y ?? 40,
          }))
        );
      }

      // Load edges
      const { data: edgeRows } = await supabase
        .from('idea_tree_edges')
        .select('id, from_node, to_node, relation')
        .eq('user_id', user.id);

      if (edgeRows && edgeRows.length > 0) {
        setEdges(edgeRows.map((r) => ({
          id: r.id,
          from: r.from_node,
          to: r.to_node,
          relation: r.relation as LinkRelation,
        })));
      }

      setGraphLoaded(true);
    };

    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist node positions (debounced) ─────────────────────────────────────
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user || !graphLoaded) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      const upsertRows = nodes.map((n) => ({
        id: n.id,
        user_id: user.id,
        title: n.title,
        body: n.body,
        tag: n.tag,
        date_label: n.dateLabel,
        x: n.x,
        y: n.y,
      }));
      await supabase
        .from('idea_tree_nodes')
        .upsert(upsertRows, { onConflict: 'id' });
    }, 500);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [nodes, user, graphLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist edges whenever they change ─────────────────────────────────────
  const prevEdgesRef = useRef<EdgeLink[]>([]);
  useEffect(() => {
    if (!user || !graphLoaded) return;

    const prev = prevEdgesRef.current;
    const prevIds = new Set(prev.map((e) => e.id));
    const currIds = new Set(edges.map((e) => e.id));

    const added = edges.filter((e) => !prevIds.has(e.id));
    const removedIds = prev.filter((e) => !currIds.has(e.id)).map((e) => e.id);

    const persist = async () => {
      if (added.length > 0) {
        await supabase.from('idea_tree_edges').insert(
          added.map((e) => ({
            id: e.id,
            user_id: user.id,
            from_node: e.from,
            to_node: e.to,
            relation: e.relation,
          }))
        );
      }
      if (removedIds.length > 0) {
        await supabase
          .from('idea_tree_edges')
          .delete()
          .in('id', removedIds)
          .eq('user_id', user.id);
      }
    };

    persist();
    prevEdgesRef.current = edges;
  }, [edges, user, graphLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  const screenToCanvas = useCallback((cx: number, cy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (cx - rect.left - transform.x) / transform.scale,
      y: (cy - rect.top - transform.y) / transform.scale,
    };
  }, [transform]);

  // Edge path
  const getEdgePath = (from: NodeEntry, to: NodeEntry) => {
    const x1 = from.x + NODE_W / 2;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x + NODE_W / 2;
    const y2 = to.y + NODE_H / 2;
    const cx1 = x1 + (x2 - x1) * 0.4;
    const cy1 = y1;
    const cx2 = x1 + (x2 - x1) * 0.6;
    const cy2 = y2;
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  const getEdgeBetween = (idA: string, idB: string) =>
    edges.find(
      (e) => (e.from === idA && e.to === idB) || (e.from === idB && e.to === idA)
    );

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const svgPt = screenToCanvas(e.clientX, e.clientY);
    setDraggingNode(nodeId);
    setDragOffset({ x: svgPt.x - node.x, y: svgPt.y - node.y });
    setDidDrag(false);
  };

  const handleNodeClick = (e: React.MouseEvent, node: NodeEntry) => {
    e.stopPropagation();
    if (didDrag) return;

    setSelectedIds((prev) => {
      if (prev.includes(node.id)) {
        const next = prev.filter((id) => id !== node.id);
        setLinkPickerVisible(false);
        return next;
      }
      if (prev.length === 0) {
        return [node.id];
      }
      if (prev.length === 1) {
        const next = [prev[0], node.id];
        setLinkPickerVisible(true);
        return next;
      }
      setLinkPickerVisible(false);
      return [node.id];
    });
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, node: NodeEntry) => {
    e.stopPropagation();
    setSelectedEntry(node);
    setSelectedIds([]);
    setLinkPickerVisible(false);
  };

  const connectNodes = (relation: LinkRelation) => {
    if (selectedIds.length !== 2) return;
    const [a, b] = selectedIds;
    if (getEdgeBetween(a, b)) {
      setSelectedIds([]);
      setLinkPickerVisible(false);
      return;
    }
    const newEdge: EdgeLink = {
      id: `e-${Date.now()}`,
      from: a,
      to: b,
      relation,
    };
    setEdges((prev) => [...prev, newEdge]);
    setSelectedIds([]);
    setLinkPickerVisible(false);
  };

  const disconnectNodes = () => {
    if (selectedIds.length !== 2) return;
    const [a, b] = selectedIds;
    setEdges((prev) =>
      prev.filter(
        (e) => !((e.from === a && e.to === b) || (e.from === b && e.to === a))
      )
    );
    setSelectedIds([]);
    setLinkPickerVisible(false);
  };

  const handleEdgeClick = (edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setSelectedIds([]);
    setLinkPickerVisible(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const isCanvas =
      target === canvasRef.current ||
      target.tagName === 'svg' || target.classList.contains('canvas-bg');
    if (isCanvas) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelectedIds([]);
      setLinkPickerVisible(false);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingNode) {
        setDidDrag(true);
        const svgPt = screenToCanvas(e.clientX, e.clientY);
        setNodes((prev) =>
          prev.map((n) =>
            n.id === draggingNode
              ? { ...n, x: svgPt.x - dragOffset.x, y: svgPt.y - dragOffset.y }
              : n
          )
        );
      } else if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [draggingNode, dragOffset, isPanning, panStart, screenToCanvas]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.ctrlKey || e.metaKey) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform((t) => {
        const newScale = Math.min(Math.max(t.scale * delta, 0.3), 3);
        const scaleRatio = newScale / t.scale;
        return {
          scale: newScale,
          x: mouseX - scaleRatio * (mouseX - t.x),
          y: mouseY - scaleRatio * (mouseY - t.y),
        };
      });
    } else {
      const scrollSpeed = 1.2;
      setTransform((t) => ({
        ...t,
        x: t.x - e.deltaX * scrollSpeed,
        y: t.y - e.deltaY * scrollSpeed,
      }));
    }
  };

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }));
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(t.scale * 0.8, 0.3) }));
  const resetView = () => setTransform({ x: 60, y: 40, scale: 1 });

  const twoSelected = selectedIds.length === 2;
  const alreadyLinked = twoSelected ? !!getEdgeBetween(selectedIds[0], selectedIds[1]) : false;

  const nodeA = twoSelected ? getNodeById(selectedIds[0]) : null;
  const nodeB = twoSelected ? getNodeById(selectedIds[1]) : null;

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0"
          style={{ backgroundColor: 'var(--card)' }}
        >
          <div>
            <h1 className="text-base font-semibold text-foreground font-serif">Idea Tree</h1>
            <p className="text-xs text-muted-foreground">
              {nodes.length} entries · {edges.length} connections ·{' '}
              {selectedIds.length === 0
                ? 'click a node to select, double-click to open'
                : selectedIds.length === 1
                ? 'select a second node to link or unlink'
                : alreadyLinked
                ? 'nodes are linked — disconnect or cancel' :'choose connection type or cancel'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={zoomOut} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all" title="Zoom out"><ZoomOut size={14} /></button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(transform.scale * 100)}%</span>
            <button onClick={zoomIn} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all" title="Zoom in"><ZoomIn size={14} /></button>
            <button onClick={resetView} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all" title="Reset view"><Maximize2 size={14} /></button>
          </div>
        </div>

        {/* Link action bar — shown when 2 nodes selected */}
        {twoSelected && (
          <div
            className="flex items-center gap-3 px-6 py-2.5 border-b border-border flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,251,235,0.95)' }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{nodeA?.title || 'Node A'}</span>
              <span className="text-muted-foreground text-xs">↔</span>
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{nodeB?.title || 'Node B'}</span>
            </div>
            {alreadyLinked ? (
              <>
                <span className="text-xs text-muted-foreground">Already linked</span>
                <button
                  onClick={disconnectNodes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}
                >
                  <Unlink size={12} />
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">Connect as:</span>
                <button
                  onClick={() => connectNodes('related')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
                  style={{ backgroundColor: '#F0F4FF', borderColor: '#C7D2FE', color: '#4338CA' }}
                >
                  <Link2 size={12} />
                  Related
                </button>
                <button
                  onClick={() => connectNodes('branched')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
                  style={{ backgroundColor: '#FFF7ED', borderColor: '#FED7AA', color: '#C2410C' }}
                >
                  <ArrowUpRight size={12} />
                  Branched from
                </button>
              </>
            )}
            <button
              onClick={() => { setSelectedIds([]); setLinkPickerVisible(false); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          style={{
            backgroundColor: 'var(--background)',
            backgroundImage: 'radial-gradient(circle, rgba(92,61,46,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            cursor: isPanning ? 'grabbing' : draggingNode ? 'grabbing' : 'default',
          }}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
        >
          {/* Empty state */}
          {graphLoaded && nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-serif">No entries yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create journal entries to see them appear here</p>
              </div>
            </div>
          )}

          <svg
            ref={canvasRef}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              <marker id="arrow-related" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="rgba(92,61,46,0.35)" />
              </marker>
              <marker id="arrow-branched" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="rgba(192,57,43,0.45)" />
              </marker>
            </defs>
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              {/* Edges */}
              {edges.map((edge) => {
                const fromNode = getNodeById(edge.from);
                const toNode = getNodeById(edge.to);
                if (!fromNode || !toNode) return null;
                const isBranched = edge.relation === 'branched';
                const isHighlighted =
                  selectedIds.includes(edge.from) && selectedIds.includes(edge.to);
                return (
                  <g key={edge.id}>
                    <path
                      d={getEdgePath(fromNode, toNode)}
                      stroke="transparent"
                      strokeWidth={12}
                      fill="none"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleEdgeClick(edge.id)}
                    />
                    <path
                      d={getEdgePath(fromNode, toNode)}
                      stroke={
                        isHighlighted
                          ? '#DC2626'
                          : isBranched
                          ? 'rgba(192,57,43,0.55)'
                          : 'rgba(92,61,46,0.4)'
                      }
                      strokeWidth={isHighlighted ? 2 : 1.5}
                      strokeDasharray={isBranched ? '5 3' : '4 2'}
                      fill="none"
                      markerEnd={isBranched ? 'url(#arrow-branched)' : 'url(#arrow-related)'}
                      style={{ pointerEvents: 'none' }}
                    />
                    {isHighlighted && (() => {
                      const fx = fromNode.x + NODE_W / 2;
                      const fy = fromNode.y + NODE_H / 2;
                      const tx = toNode.x + NODE_W / 2;
                      const ty = toNode.y + NODE_H / 2;
                      const mx = (fx + tx) / 2;
                      const my = (fy + ty) / 2;
                      return (
                        <g
                          transform={`translate(${mx}, ${my})`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleEdgeClick(edge.id)}
                        >
                          <circle r={10} fill="#DC2626" opacity={0.9} />
                          <line x1="-4" y1="-4" x2="4" y2="4" stroke="white" strokeWidth={1.8} strokeLinecap="round" />
                          <line x1="4" y1="-4" x2="-4" y2="4" stroke="white" strokeWidth={1.8} strokeLinecap="round" />
                        </g>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const style = tagNoteStyle[node.tag];
                const isSelected = selectedIds.includes(node.id);
                return (
                  <foreignObject
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    width={NODE_W}
                    height={NODE_H}
                    style={{ overflow: 'visible', cursor: draggingNode === node.id ? 'grabbing' : 'pointer' }}
                    onMouseDown={(e) => handleNodeMouseDown(e as unknown as React.MouseEvent, node.id)}
                    onClick={(e) => handleNodeClick(e as unknown as React.MouseEvent, node)}
                    onDoubleClick={(e) => handleNodeDoubleClick(e as unknown as React.MouseEvent, node)}
                  >
                    <div
                      style={{
                        width: `${NODE_W}px`,
                        height: `${NODE_H}px`,
                        backgroundColor: style.bg,
                        border: isSelected
                          ? `2px solid ${style.ring}`
                          : `1px solid ${style.border}`,
                        borderRadius: '2px 8px 8px 2px',
                        boxShadow: isSelected
                          ? `0 0 0 3px ${style.ring}40, 1px 2px 8px rgba(92,61,46,0.22)`
                          : '1px 2px 6px rgba(92,61,46,0.18), 0 1px 2px rgba(92,61,46,0.1)',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        userSelect: 'none',
                        transition: 'box-shadow 0.15s, border 0.15s',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: node.tag === 'idea' ? '#D97706' : node.tag === 'thought' ? '#4338CA' : '#16A34A',
                        }} />
                        <span style={{ fontSize: '10px', color: '#8B7355' }}>{node.dateLabel}</span>
                        {isSelected && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: '9px',
                            fontWeight: 700,
                            color: style.ring,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            {selectedIds.indexOf(node.id) === 0 ? '① selected' : '② selected'}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '12px', fontWeight: 600, color: '#2C1810',
                        lineHeight: '16px', overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', margin: 0,
                      }}>
                        {node.title || 'Untitled entry'}
                      </p>
                      <p style={{
                        fontSize: '10px', color: '#8B7355', lineHeight: '14px',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        margin: 0, flex: 1,
                      }}>
                        {node.body}
                      </p>
                    </div>
                  </foreignObject>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div
            className="absolute bottom-4 left-4 flex flex-wrap items-center gap-4 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground"
            style={{ backgroundColor: 'rgba(255,253,247,0.92)', backdropFilter: 'blur(4px)' }}
          >
            <span className="font-medium text-foreground">Legend</span>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="rgba(92,61,46,0.45)" strokeWidth="1.5" strokeDasharray="4 2" /></svg>
              <span>Related</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="rgba(192,57,43,0.55)" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
              <span>Branched from</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#D97706' }} />
              <span>Idea</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#4338CA' }} />
              <span>Thought</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#16A34A' }} />
              <span>Plan</span>
            </div>
            <div className="border-l border-border pl-3 text-muted-foreground/70">
              Scroll to pan · Ctrl+Scroll to zoom · Drag canvas to pan · Click node to select · Double-click to open
            </div>
          </div>
        </div>
      </div>

      {/* Entry detail modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(44,24,16,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="notebook-card w-full max-w-lg mx-4 fade-in"
            style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-0 px-4 py-2 border-b border-border/40 flex-shrink-0"
              style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`modal-binding-${i}`}
                  className="w-3 h-3 rounded-full border-2 border-border mx-2"
                  style={{ backgroundColor: 'var(--background)' }}
                />
              ))}
              <span className="ml-auto text-xs text-muted-foreground font-serif italic">Rootline</span>
            </div>

            <div className="flex overflow-hidden flex-1">
              <div
                className="flex-shrink-0"
                style={{ width: '40px', borderRight: '2px solid rgba(192,57,43,0.35)', backgroundColor: 'rgba(250,247,240,0.5)' }}
              />
              <div className="flex-1 overflow-y-auto custom-scroll p-5">
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={selectedEntry.tag} />
                  <span className="text-xs text-muted-foreground">{selectedEntry.dateLabel}</span>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="ml-auto p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
                <h2 className="text-xl font-semibold font-serif text-foreground mb-4 leading-snug">
                  {selectedEntry.title || 'Untitled entry'}
                </h2>
                <p className="text-sm font-serif text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedEntry.body}
                </p>

                {(() => {
                  const connected = edges
                    .filter((e) => e.from === selectedEntry.id || e.to === selectedEntry.id)
                    .map((e) => {
                      const otherId = e.from === selectedEntry.id ? e.to : e.from;
                      const other = getNodeById(otherId);
                      return other ? { ...other, relation: e.relation, edgeId: e.id } : null;
                    })
                    .filter(Boolean);
                  if (connected.length === 0) return (
                    <div className="mt-5 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground italic">No connections yet. Close this modal and select two nodes on the canvas to link them.</p>
                    </div>
                  );
                  return (
                    <div className="mt-5 pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Link2 size={12} className="text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">Connected entries</span>
                      </div>
                      <div className="space-y-1.5">
                        {connected.map((c) => c && (
                          <div
                            key={`conn-${c.id}`}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/60 text-left"
                            style={{ backgroundColor: 'var(--background)' }}
                          >
                            <StatusBadge status={c.tag} />
                            <span className="text-xs font-medium text-foreground flex-1 truncate">{c.title}</span>
                            <span className="text-xs text-muted-foreground" style={{ fontSize: '10px' }}>
                              {c.relation === 'branched' ? '↱ branched' : '↔ related'}
                            </span>
                            <button
                              onClick={() => {
                                setEdges((prev) => prev.filter((e) => e.id !== c.edgeId));
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Remove connection"
                            >
                              <Unlink size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
