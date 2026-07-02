"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField, TextAreaField, SelectField, CheckboxField } from "./fields";
import { NIVEL_GOVERNO, UFS, AREA, LIMITES } from "@/lib/enums";
import { revisorSchema } from "@/lib/validation";

type CampoTexto =
  | "nome_completo" | "email" | "cargo" | "orgao" | "nivel_governo" | "uf"
  | "area_atuacao" | "indicacao" | "motivacao" | "website";

type FormState = Record<CampoTexto, string> & { consentimento_lgpd: boolean };

const inicial: FormState = {
  nome_completo: "", email: "", cargo: "", orgao: "", nivel_governo: "", uf: "",
  area_atuacao: "", indicacao: "", motivacao: "", website: "",
  consentimento_lgpd: false,
};

export default function RevisorForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const set = (campo: CampoTexto) => (v: string) => setForm((f) => ({ ...f, [campo]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);

    const parsed = revisorSchema.safeParse(form);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const mapa: Record<string, string> = {};
      for (const [k, v] of Object.entries(fe)) if (v && v[0]) mapa[k] = v[0];
      setErros(mapa);
      const primeiro = Object.keys(mapa)[0];
      if (primeiro) document.getElementById(primeiro)?.focus();
      setErroGeral("Revise os campos destacados.");
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const resp = await fetch("/api/revisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (resp.ok) {
        router.push("/revisores/obrigado");
        return;
      }
      const data = await resp.json().catch(() => ({}));
      setErroGeral(data?.erro ?? "Não foi possível enviar. Tente novamente.");
    } catch {
      setErroGeral("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Honeypot anti-spam: invisível e fora da ordem de tab */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off"
          value={form.website} onChange={(e) => set("website")(e.target.value)} />
      </div>

      <TextField id="nome_completo" label="Nome completo" required value={form.nome_completo} onChange={set("nome_completo")} error={erros.nome_completo} maxLength={LIMITES.nome_completo} />
      <TextField id="email" label="E-mail institucional" type="email" required value={form.email} onChange={set("email")} error={erros.email} maxLength={LIMITES.email} />
      <TextField id="cargo" label="Cargo (opcional)" value={form.cargo} onChange={set("cargo")} error={erros.cargo} maxLength={LIMITES.cargo} />
      <TextField id="orgao" label="Órgão / instituição" required value={form.orgao} onChange={set("orgao")} error={erros.orgao} maxLength={LIMITES.orgao} />
      <SelectField id="nivel_governo" label="Nível de governo" required value={form.nivel_governo} onChange={set("nivel_governo")} options={NIVEL_GOVERNO} error={erros.nivel_governo} />
      <SelectField id="uf" label="UF" required value={form.uf} onChange={set("uf")} options={UFS} error={erros.uf} />
      <SelectField id="area_atuacao" label="Área de atuação / competência para revisão" required value={form.area_atuacao} onChange={set("area_atuacao")} options={AREA} error={erros.area_atuacao} />
      <TextAreaField id="indicacao" label="Indicação" required rows={3} hint="Quem te indicou e em que contexto. Neste momento, a inscrição é para técnicos do governo / pessoas indicadas." value={form.indicacao} onChange={set("indicacao")} error={erros.indicacao} maxLength={2000} />
      <TextAreaField id="motivacao" label="Motivação" required rows={3} hint="Por que você quer contribuir com o pipeline de validação? Conte um pouco sobre você." value={form.motivacao} onChange={set("motivacao")} error={erros.motivacao} maxLength={2000} />

      <CheckboxField id="consentimento_lgpd" required checked={form.consentimento_lgpd} onChange={(v) => setForm((f) => ({ ...f, consentimento_lgpd: v }))} error={erros.consentimento_lgpd}>
        Li e concordo com o{" "}
        <Link href="/privacidade" target="_blank" style={{ color: "var(--bbsia-azul)", textDecoration: "underline" }}>
          aviso de privacidade
        </Link>
        .
      </CheckboxField>

      {erroGeral && (
        <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
          {erroGeral}
        </p>
      )}

      <button type="submit" disabled={enviando}
        style={{ background: "var(--bbsia-azul)", color: "#fff", border: "none", borderRadius: 24, padding: "14px 32px", fontSize: "1.05rem", fontWeight: 700, cursor: enviando ? "wait" : "pointer", opacity: enviando ? 0.7 : 1 }}>
        {enviando ? "Enviando…" : "Enviar inscrição"}
      </button>
    </form>
  );
}
