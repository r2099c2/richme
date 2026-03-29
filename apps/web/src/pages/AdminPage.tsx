import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiBase } from "../lib/config";
import {
  createTheme,
  fetchAdminThemes,
  patchTheme,
  postStocksBulk,
} from "../lib/api";
import { clearToken, getToken } from "../lib/auth";
import type { StockBulkItem, ThemeRow } from "../types/api";

function toIsoFromLocal(dtLocal: string): string {
  return new Date(dtLocal).toISOString();
}

function parseConceptCodes(s: string): string[] {
  return s
    .split(/[,，\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = getToken();

  useEffect(() => {
    if (!getToken()) navigate("/admin/login", { replace: true });
  }, [navigate]);

  const themesQ = useQuery({
    queryKey: ["admin", "themes"],
    queryFn: fetchAdminThemes,
    enabled: !!token,
  });

  const invalidatePublic = () =>
    qc.invalidateQueries({ queryKey: ["public-themes"], exact: false });

  const bulkMut = useMutation({
    mutationFn: postStocksBulk,
    onSuccess: invalidatePublic,
  });

  const [stockMode, setStockMode] = useState<"single" | "bulk">("single");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [regionSecondary, setRegionSecondary] = useState("");
  const [industry, setIndustry] = useState("");
  const [industrySecondary, setIndustrySecondary] = useState("");
  const [industrySegment, setIndustrySegment] = useState("");
  const [conceptCodesStr, setConceptCodesStr] = useState("");
  const [conceptsJson, setConceptsJson] = useState("[]");

  const [bulkJson, setBulkJson] = useState(
    JSON.stringify(
      {
        stocks: [
          {
            code: "000001",
            name: "示例",
            concept_codes: [],
            concepts: [{ code: "demo", name: "示例概念" }],
          },
        ],
      },
      null,
      2,
    ),
  );

  const [tParentId, setTParentId] = useState("");
  const [tSlug, setTSlug] = useState("");
  const [tName, setTName] = useState("");
  const [tNarrative, setTNarrative] = useState("");
  const [tStarted, setTStarted] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [tEnded, setTEnded] = useState("");

  const [editing, setEditing] = useState<ThemeRow | null>(null);
  const [eSlug, setESlug] = useState("");
  const [eName, setEName] = useState("");
  const [eNarrative, setENarrative] = useState("");
  const [eStarted, setEStarted] = useState("");
  const [eEnded, setEEnded] = useState("");

  const themeCreateMut = useMutation({
    mutationFn: createTheme,
    onSuccess: () => {
      void themesQ.refetch();
      invalidatePublic();
      setTSlug("");
      setTName("");
      setTNarrative("");
    },
  });

  const themePatchMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      patchTheme(id, body),
    onSuccess: () => {
      void themesQ.refetch();
      invalidatePublic();
      setEditing(null);
    },
  });

  function openEdit(t: ThemeRow) {
    setEditing(t);
    setESlug(t.slug);
    setEName(t.name);
    setENarrative(t.narrative ?? "");
    const s = new Date(t.started_at);
    s.setMinutes(s.getMinutes() - s.getTimezoneOffset());
    setEStarted(s.toISOString().slice(0, 16));
    if (t.ended_at) {
      const e = new Date(t.ended_at);
      e.setMinutes(e.getMinutes() - e.getTimezoneOffset());
      setEEnded(e.toISOString().slice(0, 16));
    } else setEEnded("");
  }

  function submitSingleStock(e: FormEvent) {
    e.preventDefault();
    let concepts: { code: string; name: string }[] = [];
    try {
      const parsed: unknown = JSON.parse(conceptsJson || "[]");
      if (!Array.isArray(parsed)) throw new Error("concepts 须为 JSON 数组");
      concepts = parsed as { code: string; name: string }[];
    } catch {
      alert("概念 JSON 解析失败，请检查格式");
      return;
    }
    const item: StockBulkItem = {
      code: code.trim(),
      name: name.trim(),
      region: region.trim() || null,
      region_secondary: regionSecondary.trim() || null,
      industry: industry.trim() || null,
      industry_secondary: industrySecondary.trim() || null,
      industry_segment: industrySegment.trim() || null,
      concept_codes: parseConceptCodes(conceptCodesStr),
      concepts,
    };
    bulkMut.mutate({ stocks: [item] });
  }

  function submitBulkJson(e: FormEvent) {
    e.preventDefault();
    try {
      const parsed: unknown = JSON.parse(bulkJson);
      let body: { stocks: StockBulkItem[] };
      if (Array.isArray(parsed)) body = { stocks: parsed as StockBulkItem[] };
      else if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { stocks?: unknown }).stocks)
      ) {
        body = parsed as { stocks: StockBulkItem[] };
      } else throw new Error("须为 { stocks: [...] } 或股票数组");
      bulkMut.mutate(body);
    } catch (err) {
      alert(err instanceof Error ? err.message : "JSON 无效");
    }
  }

  function submitThemeCreate(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      slug: tSlug.trim(),
      name: tName.trim(),
      narrative: tNarrative.trim() || null,
      started_at: toIsoFromLocal(tStarted),
    };
    const pid = tParentId.trim();
    if (pid) body.parent_id = Number(pid);
    if (tEnded.trim()) body.ended_at = toIsoFromLocal(tEnded);
    else body.ended_at = null;
    themeCreateMut.mutate(body);
  }

  function submitThemeEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const body: Record<string, unknown> = {
      slug: eSlug.trim(),
      name: eName.trim(),
      narrative: eNarrative.trim() || null,
      started_at: toIsoFromLocal(eStarted),
    };
    if (eEnded.trim()) body.ended_at = toIsoFromLocal(eEnded);
    else body.ended_at = null;
    themePatchMut.mutate({ id: editing.id, body });
  }

  if (!token) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">后台管理</h1>
        <div className="flex flex-wrap gap-3">
          <Link to="/" className="text-sm text-amber-500 hover:underline">
            市场主线
          </Link>
          <button
            type="button"
            onClick={() => {
              clearToken();
              navigate("/admin/login", { replace: true });
            }}
            className="text-sm text-zinc-400 hover:text-white"
          >
            退出登录
          </button>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        角色时段维护可稍后在 UI 中扩展，当前请用{" "}
        <a
          href={`${getApiBase()}/docs`}
          className="text-amber-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          API 文档
        </a>{" "}
        调用 <code className="text-zinc-400">POST /admin/themes/&#123;id&#125;/roles</code>
      </p>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-medium text-white">股票上传</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setStockMode("single")}
            className={`rounded px-3 py-1 ${stockMode === "single" ? "bg-amber-600 text-black" : "bg-zinc-800 text-zinc-300"}`}
          >
            单条表单
          </button>
          <button
            type="button"
            onClick={() => setStockMode("bulk")}
            className={`rounded px-3 py-1 ${stockMode === "bulk" ? "bg-amber-600 text-black" : "bg-zinc-800 text-zinc-300"}`}
          >
            多条 JSON
          </button>
        </div>

        {stockMode === "single" ? (
          <form onSubmit={submitSingleStock} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-1">
              <span className="text-zinc-400">代码 *</span>
              <input
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-1">
              <span className="text-zinc-400">名称 *</span>
              <input
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">地域</span>
              <input
                value={region}
                onChange={(ev) => setRegion(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">二级地域</span>
              <input
                value={regionSecondary}
                onChange={(ev) => setRegionSecondary(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">行业</span>
              <input
                value={industry}
                onChange={(ev) => setIndustry(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">二级行业</span>
              <input
                value={industrySecondary}
                onChange={(ev) => setIndustrySecondary(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-zinc-400">细分行业</span>
              <input
                value={industrySegment}
                onChange={(ev) => setIndustrySegment(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-zinc-400">概念代码（逗号分隔，可选）</span>
              <input
                value={conceptCodesStr}
                onChange={(ev) => setConceptCodesStr(ev.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                placeholder="pv, gf"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-zinc-400">概念 JSON（code+name，默认 []）</span>
              <textarea
                value={conceptsJson}
                onChange={(ev) => setConceptsJson(ev.target.value)}
                rows={4}
                className="font-mono rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={bulkMut.isPending}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
              >
                {bulkMut.isPending ? "提交中…" : "提交单条（bulk）"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitBulkJson} className="space-y-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">JSON：&#123; &quot;stocks&quot;: [ ... ] &#125; 或股票数组</span>
              <textarea
                value={bulkJson}
                onChange={(ev) => setBulkJson(ev.target.value)}
                rows={14}
                className="font-mono rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
              />
            </label>
            <button
              type="submit"
              disabled={bulkMut.isPending}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
            >
              {bulkMut.isPending ? "提交中…" : "提交批量"}
            </button>
          </form>
        )}
        {bulkMut.isSuccess ? (
          <p className="text-sm text-emerald-400">已更新 {bulkMut.data.updated} 条</p>
        ) : null}
        {bulkMut.isError ? (
          <p className="text-sm text-red-400">
            {bulkMut.error instanceof Error ? bulkMut.error.message : "失败"}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-medium text-white">新建主题</h2>
        <form onSubmit={submitThemeCreate} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">父主题 id（空=顶层）</span>
            <input
              value={tParentId}
              onChange={(ev) => setTParentId(ev.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">slug *</span>
            <input
              value={tSlug}
              onChange={(ev) => setTSlug(ev.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-400">名称 *</span>
            <input
              value={tName}
              onChange={(ev) => setTName(ev.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-400">叙事</span>
            <textarea
              value={tNarrative}
              onChange={(ev) => setTNarrative(ev.target.value)}
              rows={3}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">开始时间 *</span>
            <input
              type="datetime-local"
              value={tStarted}
              onChange={(ev) => setTStarted(ev.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">结束时间（空=进行中）</span>
            <input
              type="datetime-local"
              value={tEnded}
              onChange={(ev) => setTEnded(ev.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={themeCreateMut.isPending}
              className="rounded-md bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              {themeCreateMut.isPending ? "创建中…" : "创建主题"}
            </button>
          </div>
        </form>
        {themeCreateMut.isError ? (
          <p className="text-sm text-red-400">
            {themeCreateMut.error instanceof Error ? themeCreateMut.error.message : "失败"}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-medium text-white">主题列表</h2>
        {themesQ.isLoading ? <p className="text-zinc-500">加载中…</p> : null}
        {themesQ.isError ? (
          <p className="text-red-400">
            {themesQ.error instanceof Error ? themesQ.error.message : "加载失败"}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2 pr-2">id</th>
                <th className="py-2 pr-2">parent</th>
                <th className="py-2 pr-2">slug</th>
                <th className="py-2 pr-2">name</th>
                <th className="py-2 pr-2">ended</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {(themesQ.data ?? []).map((t) => (
                <tr key={t.id} className="border-b border-zinc-800/80">
                  <td className="py-2 pr-2 font-mono text-zinc-400">{t.id}</td>
                  <td className="py-2 pr-2 text-zinc-500">{t.parent_id ?? "—"}</td>
                  <td className="py-2 pr-2">{t.slug}</td>
                  <td className="py-2 pr-2">{t.name}</td>
                  <td className="py-2 pr-2 text-zinc-500">
                    {t.ended_at ? new Date(t.ended_at).toLocaleString("zh-CN") : "进行中"}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="text-amber-500 hover:underline"
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl"
            role="dialog"
            aria-labelledby="edit-theme-title"
          >
            <h3 id="edit-theme-title" className="text-lg font-medium text-white">
              编辑主题 #{editing.id}
            </h3>
            <form onSubmit={submitThemeEdit} className="mt-4 grid gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">slug</span>
                <input
                  value={eSlug}
                  onChange={(ev) => setESlug(ev.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">名称</span>
                <input
                  value={eName}
                  onChange={(ev) => setEName(ev.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">叙事</span>
                <textarea
                  value={eNarrative}
                  onChange={(ev) => setENarrative(ev.target.value)}
                  rows={3}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">开始</span>
                <input
                  type="datetime-local"
                  value={eStarted}
                  onChange={(ev) => setEStarted(ev.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">结束（清空=进行中）</span>
                <input
                  type="datetime-local"
                  value={eEnded}
                  onChange={(ev) => setEEnded(ev.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={themePatchMut.isPending}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  {themePatchMut.isPending ? "保存中…" : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-300"
                >
                  取消
                </button>
              </div>
            </form>
            {themePatchMut.isError ? (
              <p className="mt-2 text-sm text-red-400">
                {themePatchMut.error instanceof Error ? themePatchMut.error.message : "失败"}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
