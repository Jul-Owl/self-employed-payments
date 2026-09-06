"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError, fetchAuthenticatedUser } from "@/lib/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAuthentication() {
      try {
        await fetchAuthenticatedUser();
        if (active) {
          setIsChecking(false);
        }
      } catch (requestError) {
        if (active) {
          if (
            requestError instanceof ApiRequestError &&
            (requestError.status === 401 || requestError.status === 403)
          ) {
            router.replace("/login");
            return;
          }

          setError("Не удалось проверить авторизацию. Обновите страницу.");
          setIsChecking(false);
        }
      }
    }

    void checkAuthentication();

    return () => {
      active = false;
    };
  }, [router]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-slate-600">Проверяем авторизацию…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-center text-sm text-rose-600">{error}</p>
      </main>
    );
  }

  return <>{children}</>;
}
