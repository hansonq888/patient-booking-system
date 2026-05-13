import { AdminNav } from "./_components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col md:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:border"
      >
        Skip to main content
      </a>
      <AdminNav />
      <main id="main-content" className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
