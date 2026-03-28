import { redirect } from "next/navigation";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Navbar } from "@/components/Navbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/login?next=/admin");
  }

  const user = await fetchAuthQuery(api.users.getCurrentUserWithRole);
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
