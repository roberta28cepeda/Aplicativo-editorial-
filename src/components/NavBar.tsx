"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/perfis", label: "Perfis" },
  { href: "/calendario", label: "Calendário" },
  { href: "/ideias", label: "Ideias" },
  { href: "/desempenho", label: "Desempenho" },
  { href: "/conexoes", label: "Conexões" },
];

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-sidebar px-3 py-6 text-[#f7f3ea] sm:w-[248px]">
      <div className="mb-7 flex items-center gap-2 px-2 font-serif text-xl tracking-tight text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange text-xs font-bold text-white">
          CE
        </span>
        Calendário Editorial
      </div>

      <nav className="flex flex-col gap-0.5">
        {LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-[42px] items-center rounded-md px-3 text-[13px] transition ${
                active
                  ? "bg-orange text-white shadow-[0_7px_18px_rgba(216,91,54,0.18)]"
                  : "text-[#a8aaa2] hover:bg-[#2b2c29] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#3c3d38] pt-3">
        <div className="flex items-center gap-2 px-2 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b69982] text-[10px] font-bold text-white">
            {email.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-[#dedbd1]">
            {email}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-left text-[11px] font-medium text-[#9a988e] hover:bg-[#2b2c29] hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
