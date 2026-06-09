"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "enviado" | "erro">("idle");
  const [msg, setMsg] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setMsg("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Não cria usuário novo: só e-mails já previstos como admin entram.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/admin`,
      },
    });
    if (error) {
      setEstado("erro");
      setMsg("Não foi possível enviar o link. Verifique o e-mail e tente novamente.");
      return;
    }
    setEstado("enviado");
  }

  return (
    <main
      id="conteudo"
      style={{ maxWidth: 420, margin: "0 auto", padding: "64px 20px", width: "100%" }}
    >
      <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>Área da coordenação</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Entre com seu e-mail institucional. Enviaremos um <strong>link de acesso</strong> (sem senha).
      </p>

      {estado === "enviado" ? (
        <div role="status" style={{ background: "#eafaef", border: "1px solid #b6e3c6", borderRadius: 6, padding: 16 }}>
          📬 Link enviado para <strong>{email}</strong>. Abra o e-mail e clique para entrar.
        </div>
      ) : (
        <form onSubmit={enviar} noValidate>
          <label htmlFor="email" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #888", borderRadius: 4, fontSize: "1rem", marginBottom: 16 }}
          />
          {estado === "erro" && (
            <p role="alert" style={{ color: "#b3140e", marginBottom: 12 }}>{msg}</p>
          )}
          <button
            type="submit"
            disabled={estado === "enviando"}
            style={{ background: "var(--bbsia-azul)", color: "#fff", border: "none", borderRadius: 24, padding: "12px 28px", fontWeight: 600, cursor: "pointer" }}
          >
            {estado === "enviando" ? "Enviando…" : "Enviar link de acesso"}
          </button>
        </form>
      )}
    </main>
  );
}
