import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin } from "../lib/api";
import { setToken } from "../lib/auth";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const m = useMutation({
    mutationFn: () => loginAdmin(password),
    onSuccess: (data) => {
      setToken(data.access_token);
      navigate("/admin", { replace: true });
    },
  });

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">后台登录</h1>
        <p className="mt-1 text-sm text-zinc-500">使用环境变量中配置的管理员密码</p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">密码</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            required
          />
        </label>
        {m.isError ? (
          <p className="text-sm text-red-400">
            {m.error instanceof Error ? m.error.message : "登录失败"}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={m.isPending}
          className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
        >
          {m.isPending ? "登录中…" : "登录"}
        </button>
      </form>
      <p className="text-center text-sm text-zinc-500">
        <Link to="/" className="text-amber-500 hover:underline">
          返回市场主线
        </Link>
      </p>
    </div>
  );
}
