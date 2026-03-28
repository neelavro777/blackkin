"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Tag,
  FolderOpen,
  ShoppingCart,
  Users,
  Megaphone,
  Star,
  Ruler,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/tags", label: "Tags", icon: Tag },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/sizes", label: "Sizes & Colors", icon: Ruler },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r min-h-screen py-6 px-3 flex-shrink-0">
      <div className="mb-6 px-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Admin
        </p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
