import type { ThemeTreeOut } from "../types/api";

function fmtRange(start: string, end: string | null) {
  const a = new Date(start).toLocaleString("zh-CN", { hour12: false });
  const b = end ? new Date(end).toLocaleString("zh-CN", { hour12: false }) : "进行中";
  return `${a} — ${b}`;
}

function ThemeNode({ node, depth }: { node: ThemeTreeOut; depth: number }) {
  return (
    <article
      className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 ${depth > 0 ? "ml-3 mt-3 border-l-2 border-l-amber-600/60 sm:ml-6" : ""}`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className={`font-semibold text-white ${depth === 0 ? "text-lg" : "text-base"}`}>
          {node.name}
        </h2>
        <span className="text-xs text-zinc-500">{node.slug}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{fmtRange(node.started_at, node.ended_at)}</p>
      {node.narrative ? (
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{node.narrative}</p>
      ) : null}

      {node.stocks.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">股票</p>
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1.5 pr-2 font-medium">代码</th>
                <th className="py-1.5 pr-2 font-medium">名称</th>
                <th className="py-1.5 pr-2 font-medium">角色</th>
                <th className="py-1.5 font-medium">rank</th>
              </tr>
            </thead>
            <tbody>
              {node.stocks.map((s) => (
                <tr key={`${s.code}-${s.role_name}-${s.rank}`} className="border-b border-zinc-800/80">
                  <td className="py-2 pr-2 font-mono text-zinc-200">{s.code}</td>
                  <td className="py-2 pr-2 text-zinc-300">{s.name}</td>
                  <td className="py-2 pr-2 text-zinc-400">{s.role_name}</td>
                  <td className="py-2 text-zinc-400">{s.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {node.stocks.some((s) => s.concepts?.length) ? (
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              {node.stocks.map((s) =>
                s.concepts?.length ? (
                  <li key={s.code}>
                    <span className="font-mono text-zinc-400">{s.code}</span>
                    {": "}
                    {s.concepts.map((c) => `${c.name}(${c.code})`).join(" · ")}
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">当日该主题下无有效角色记录</p>
      )}

      {node.children.map((ch) => (
        <ThemeNode key={ch.id} node={ch} depth={depth + 1} />
      ))}
    </article>
  );
}

export default function ThemeTree({ themes }: { themes: ThemeTreeOut[] }) {
  return (
    <div className="space-y-6">
      {themes.map((t) => (
        <ThemeNode key={t.id} node={t} depth={0} />
      ))}
    </div>
  );
}
