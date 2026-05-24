"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Главная" },
  { href: "/payments", label: "Платежи" },
  { href: "/transactions", label: "Операции" },
  { href: "/receipts", label: "Чеки" },
  { href: "/settings", label: "Профиль" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white">
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-5">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center text-center text-xs ${
                isActive ? "font-semibold text-slate-900" : "text-slate-500"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}