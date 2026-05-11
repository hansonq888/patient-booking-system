import { AdminNav } from "./_components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col md:flex-row">
      <AdminNav />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
