import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight text-white">
            Richme
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link to="/" className="text-zinc-400 hover:text-white">
              市场主线
            </Link>
            <Link to="/admin" className="text-zinc-400 hover:text-white">
              后台
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
