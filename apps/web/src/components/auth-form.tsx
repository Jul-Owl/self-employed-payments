"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isRegistration = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isRegistration) {
        await register({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
        });
      } else {
        await login({ email: email.trim(), password });
      }

      router.replace("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось выполнить авторизацию.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center bg-slate-100 px-4 py-8">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Платформа для самозанятых</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {isRegistration ? "Регистрация" : "Вход"}
        </h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegistration && (
            <label className="block text-sm font-medium text-slate-700">
              Имя
              <input
                className="input mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="input mt-1"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Пароль
            <input
              className="input mt-1"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegistration ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting
              ? "Подождите…"
              : isRegistration
                ? "Зарегистрироваться"
                : "Войти"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          {isRegistration ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
          <Link
            className="font-medium text-slate-900 underline"
            href={isRegistration ? "/login" : "/register"}
          >
            {isRegistration ? "Войти" : "Зарегистрироваться"}
          </Link>
        </p>
      </section>
    </main>
  );
}
