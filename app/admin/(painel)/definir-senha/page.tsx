"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Define a senha após o link de primeiro acesso / esqueci a senha.
// (Está sob o layout do painel, que já exige sessão de admin.)
export default function DefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      setErro("Não foi possível salvar a senha. O link pode ter expirado — peça outro no login.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "16px 0" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Definir senha</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Crie uma senha para acessar o painel. Nas próximas vezes, basta e-mail e senha.
      </p>
      <form onSubmit={salvar} noValidate>
        <label htmlFor="senha" style={lbl}>Nova senha</label>
        <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={ctrl} autoComplete="new-password" />

        <label htmlFor="confirma" style={lbl}>Confirme a senha</label>
        <input id="confirma" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} style={ctrl} autoComplete="new-password" />

        {erro && <p role="alert" style={{ color: "#b3140e", margin: "4px 0 12px" }}>{erro}</p>}

        <button type="submit" disabled={salvando} style={{ background: "var(--bbsia-azul)", color: "#fff", border: "none", borderRadius: 24, padding: "12px 28px", fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 8 }}>
          {salvando ? "Salvando…" : "Salvar senha e entrar"}
        </button>
      </form>
    </main>
  );
}

const lbl: React.CSSProperties = { fontWeight: 600, display: "block", marginBottom: 4, marginTop: 12 };
const ctrl: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #888", borderRadius: 4, fontSize: "1rem" };
