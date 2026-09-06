"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api";

const items = [
  { href: "/dashboard", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/calendar", label: "Календарь" },
  { href: "/bookings", label: "Записи" },
  { href: "/payments", label: "Платежи" },
  { href: "/transactions", label: "Операции" },
  { href: "/ledger", label: "Проводки" },
  { href: "/receipts", label: "Чеки" },
  { href: "/settings", label: "Профиль" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    try {
      setLogoutError("");
      setIsLoggingOut(true);
      await logout();
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Не удалось выйти из аккаунта.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white">
      {logoutError && (
        <p className="absolute bottom-16 left-0 right-0 bg-rose-50 px-3 py-2 text-center text-xs text-rose-600">
          {logoutError}
        </p>
      )}
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-10">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center text-center text-[10px] leading-tight ${
                isActive ? "font-semibold text-slate-900" : "text-slate-500"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center text-center text-[10px] leading-tight text-slate-500 disabled:opacity-50"
        >
          {isLoggingOut ? "Выход…" : "Выйти"}
        </button>
      </div>
    </nav>
  );
}