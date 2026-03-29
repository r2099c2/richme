import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ThemeTree from "../components/ThemeTree";
import { fetchPublicThemesByDate } from "../lib/api";

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MarketPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const date = useMemo(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
    return todayYmd();
  }, [dateParam]);

  useEffect(() => {
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const next = new URLSearchParams(searchParams);
      next.set("date", date);
      setSearchParams(next, { replace: true });
    }
    // 仅挂载时补齐 ?date=，避免丢 ?concepts=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const includeConcepts = searchParams.get("concepts") === "1";

  const q = useQuery({
    queryKey: ["public-themes", date, includeConcepts],
    queryFn: () => fetchPublicThemesByDate(date, includeConcepts),
    enabled: !!date,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white sm:text-2xl">市场主线</h1>
        <p className="mt-1 text-sm text-zinc-500">按自然日聚合（与 API 上海时区日界一致）</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">日期</span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const v = e.target.value;
              const next = new URLSearchParams(searchParams);
              next.set("date", v);
              setSearchParams(next);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={includeConcepts}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.checked) next.set("concepts", "1");
              else next.delete("concepts");
              setSearchParams(next);
            }}
            className="rounded border-zinc-600"
          />
          展示概念标签
        </label>
      </div>

      {q.isLoading ? <p className="text-zinc-500">加载中…</p> : null}
      {q.isError ? (
        <p className="text-sm text-red-400">{q.error instanceof Error ? q.error.message : "请求失败"}</p>
      ) : null}

      {q.isSuccess ? (
        q.data.themes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
            当日无与日期相交的主题，可尝试其他日期。
          </p>
        ) : (
          <ThemeTree themes={q.data.themes} />
        )
      ) : null}
    </div>
  );
}
