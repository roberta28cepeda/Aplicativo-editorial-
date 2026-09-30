"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">Calendário Editorial</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Organize suas ideias de conteúdo e suas artes em um só lugar.
        </p>

        {status === "sent" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Enviamos um link de acesso para <strong>{email}</strong>. Abra seu
            e-mail e clique no link para entrar.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-orange"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-orange px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-deep disabled:opacity-50"
            >
              {status === "sending" ? "Enviando..." : "Entrar com link mágico"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
