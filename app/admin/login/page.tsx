"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [estado, setEstado] = useState<"idle" | "entrando" | "enviando_link" | "link_enviado">("idle");
  const [erro, setErro] = useState("");

  // Login por senha (método principal)
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("entrando");
    setErro("");
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error || !data.user?.email) {
      setEstado("idle");
      setErro("E-mail ou senha inválidos. No primeiro acesso, use “Definir/esqueci a senha”.");
      return;
    }
    // Autorização é a tabela `admins` (RLS só deixa admin ver a própria linha)
    const { data: adm } = await supabase
      .from("admins")
      .select("email")
      .eq("email", data.user.email)
      .maybeSingle();
    if (!adm) {
      await supabase.auth.signOut();
      router.push("/admin/acesso-negado");
      return;
    }
    // Registra login na auditoria (best-effort)
    await supabase.from("auditoria").insert({ ator_email: data.user.email, acao: "login" });
    router.push("/admin");
    router.refresh();
  }

  // Primeiro acesso / esqueci a senha: manda um link que cria a conta (se preciso)
  // e leva direto para definir a senha. Depois disso, é só senha.
  async function definirSenha() {
    if (!email.trim()) {
      setErro("Digite seu e-mail primeiro.");
      return;
    }
    setEstado("enviando_link");
    setErro("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin/definir-senha`,
      },
    });
    if (error) {
      setEstado("idle");
      setErro("Não foi possível enviar o link. Tente novamente.");
      return;
    }
    setEstado("link_enviado");
  }

  return (
    <main id="conteudo" style={{ maxWidth: 420, margin: "0 auto", padding: "64px 20px", width: "100%" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>Área da coordenação</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>Entre com seu e-mail e senha.</p>

      {estado === "link_enviado" ? (
        <div role="status" style={{ background: "#eafaef", border: "1px solid #b6e3c6", borderRadius: 6, padding: 16 }}>
          📬 Enviamos um link para <strong>{email}</strong>. Abra o e-mail, clique no link e você poderá
          <strong> definir sua senha</strong>. Depois é só entrar com e-mail e senha.
        </div>
      ) : (
        <form onSubmit={entrar} noValidate>
          <label htmlFor="email" style={lbl}>E-mail</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={ctrl} />

          <label htmlFor="senha" style={lbl}>Senha</label>
          <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={ctrl} />

          {erro && <p role="alert" style={{ color: "#b3140e", margin: "4px 0 12px" }}>{erro}</p>}

          <button
            type="submit"
            disabled={estado === "entrando"}
            style={{ background: "var(--bbsia-azul)", color: "#fff", border: "none", borderRadius: 24, padding: "12px 28px", fontWeight: 600, cursor: "pointer", width: "100%" }}
          >
            {estado === "entrando" ? "Entrando…" : "Entrar"}
          </button>

          <button
            type="button"
            onClick={definirSenha}
            disabled={estado === "enviando_link"}
            style={{ background: "transparent", color: "var(--bbsia-azul)", border: "none", marginTop: 16, cursor: "pointer", textDecoration: "underline", fontSize: ".9rem", padding: 0 }}
          >
            {estado === "enviando_link" ? "Enviando…" : "Primeiro acesso ou esqueci a senha"}
          </button>
        </form>
      )}
    </main>
  );
}

const lbl: React.CSSProperties = { fontWeight: 600, display: "block", marginBottom: 4, marginTop: 12 };
const ctrl: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #888", borderRadius: 4, fontSize: "1rem" };
