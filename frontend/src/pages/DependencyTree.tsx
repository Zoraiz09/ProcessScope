import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Search,
  RefreshCw,
  FoldVertical,
  UnfoldVertical,
  Boxes,
  X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import type { ProcessTree, TreeNode } from "@/lib/types";

export default function DependencyTree() {
  const [tree, setTree] = useState<ProcessTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/processes/tree"));
      const data: ProcessTree = await r.json();
      setTree(data);
      // Expand the first two levels by default.
      const init = new Set<number>();
      for (const root of data.roots) {
        init.add(root.pid);
        for (const c of root.children) init.add(c.pid);
      }
      setExpanded(init);
    } catch {
      setTree(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const allPids = useMemo(() => {
    const ids: number[] = [];
    const walk = (n: TreeNode) => {
      ids.push(n.pid);
      n.children.forEach(walk);
    };
    tree?.roots.forEach(walk);
    return ids;
  }, [tree]);

  const toggle = (pid: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });

  const expandAll = () => setExpanded(new Set(allPids));
  const collapseAll = () => setExpanded(new Set());

  // When searching, compute which subtrees contain a match (and force-expand them).
  const q = query.trim().toLowerCase();
  const { matches, forced } = useMemo(() => {
    const matches = new Set<number>();
    const forced = new Set<number>();
    if (!q || !tree) return { matches, forced };
    const walk = (n: TreeNode): boolean => {
      const selfMatch =
        n.name.toLowerCase().includes(q) || String(n.pid).includes(q);
      let childMatch = false;
      for (const c of n.children) childMatch = walk(c) || childMatch;
      if (selfMatch) matches.add(n.pid);
      if (selfMatch || childMatch) forced.add(n.pid);
      return selfMatch || childMatch;
    };
    tree.roots.forEach(walk);
    return { matches, forced };
  }, [q, tree]);

  const effectiveExpanded = q ? forced : expanded;

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 border-2 border-ink bg-paper px-3 py-2 md:w-96">
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the tree by name or PID…"
            className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={15} className="text-muted hover:text-ink" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tree && <Pill variant="ghost"><Boxes size={12} /> {tree.count} processes · {tree.roots.length} roots</Pill>}
          {q && <Pill variant="lime">{matches.size} matches</Pill>}
          <button onClick={expandAll} className="pill bg-panel hover:bg-paper" title="expand all">
            <UnfoldVertical size={12} /> Expand
          </button>
          <button onClick={collapseAll} className="pill bg-panel hover:bg-paper" title="collapse all">
            <FoldVertical size={12} /> Collapse
          </button>
          <button onClick={load} className="pill bg-panel hover:bg-paper">
            <RefreshCw size={12} className={cn(loading && "animate-spin")} /> Reload
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Process Hierarchy" icon={<Boxes size={14} />} />
        <div className="overflow-x-auto p-2 font-mono text-sm">
          {loading && !tree ? (
            <div className="p-8 text-center text-muted">building process tree…</div>
          ) : !tree || tree.roots.length === 0 ? (
            <div className="p-8 text-center text-muted">no processes</div>
          ) : (
            <ul>
              {tree.roots.map((root) => (
                <TreeRow
                  key={root.pid}
                  node={root}
                  depth={0}
                  expanded={effectiveExpanded}
                  matches={matches}
                  searching={!!q}
                  onToggle={toggle}
                />
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  matches,
  searching,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<number>;
  matches: Set<number>;
  searching: boolean;
  onToggle: (pid: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.pid);
  const isMatch = searching && matches.has(node.pid);

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1.5 border-2 border-transparent py-1 pr-2 transition-colors hover:border-ink hover:bg-paper",
          isMatch && "bg-lime/40"
        )}
        style={{ paddingLeft: depth * 20 + 4 }}
      >
        <button
          onClick={() => hasChildren && onToggle(node.pid)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink transition-transform",
            hasChildren ? "bg-panel hover:bg-lime" : "border-transparent",
            isOpen && "rotate-90"
          )}
        >
          {hasChildren && <ChevronRight size={12} strokeWidth={3} />}
        </button>

        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 border border-ink",
            depth === 0 ? "bg-ink" : hasChildren ? "bg-lime-deep" : "bg-paper"
          )}
        />
        <span className={cn("font-semibold", isMatch && "text-ink")}>{node.name}</span>
        <span className="text-xs text-muted">pid {node.pid}</span>
        {hasChildren && (
          <span className="ml-1 border border-ink bg-paper px-1.5 text-[10px] text-ink-soft">
            {node.children.length}
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <ul className="relative">
          {node.children.map((c) => (
            <TreeRow
              key={c.pid}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              matches={matches}
              searching={searching}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
