"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ScanLine, History, User, BookOpen, Leaf, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: ScanLine },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/education", label: "Food Guide", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-stone-100 px-4 py-6 fixed left-0 top-0">
      <div className="flex items-center gap-2 mb-10 px-2">
        <Leaf className="text-primary" size={22} />
        <span className="font-heading font-semibold text-lg text-stone-800">CycleEats</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-primary-soft text-primary"
                : "text-stone-600 hover:bg-stone-50"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
