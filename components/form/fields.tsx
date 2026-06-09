"use client";

import { useState } from "react";
import type { Opcao } from "@/lib/enums";

// Primitivas de formulário acessíveis (e-MAG): label associado, aria-describedby
// ligando erro/dica ao campo, aria-invalid, required marcado visual e semanticamente.

type Base = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  ajuda?: React.ReactNode;
};

// Rótulo com botão "?" opcional que revela uma explicação (acessível: aria-expanded
// + aria-controls; o painel é uma região rotulada). Letramento como proteção.
function LabelComAjuda(props: { id: string; label: string; required?: boolean; ajuda?: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <label htmlFor={props.id} style={{ fontWeight: 600 }}>
          {props.label} {props.required && <span aria-hidden style={{ color: "#b3140e" }}>*</span>}
        </label>
        {props.ajuda && (
          <button
            type="button"
            onClick={() => setAberta((v) => !v)}
            aria-expanded={aberta}
            aria-controls={`${props.id}-ajuda`}
            aria-label={aberta ? "Esconder explicação" : "O que é isto?"}
            title="O que é isto?"
            style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
              border: "1px solid var(--bbsia-azul)", background: aberta ? "var(--bbsia-azul)" : "#fff",
              color: aberta ? "#fff" : "var(--bbsia-azul)", cursor: "pointer", fontWeight: 700,
              fontSize: ".8rem", lineHeight: 1, padding: 0,
            }}
          >
            ?
          </button>
        )}
      </div>
      {props.ajuda && aberta && (
        <div
          id={`${props.id}-ajuda`}
          role="region"
          aria-label={`Explicação: ${props.label}`}
          style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 6, padding: 12, marginBottom: 8, fontSize: ".88rem", lineHeight: 1.5 }}
        >
          {props.ajuda}
        </div>
      )}
    </div>
  );
}

function Erro({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <span id={id} role="alert" style={{ color: "#b3140e", fontSize: ".85rem", display: "block", marginTop: 4 }}>
      {msg}
    </span>
  );
}

function Dica({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <span id={id} style={{ color: "#555", fontSize: ".85rem", display: "block", marginTop: 4 }}>
      {texto}
    </span>
  );
}

const controlStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #888",
  borderRadius: 4,
  fontSize: "1rem",
  fontFamily: "inherit",
  background: "#fff",
};

function described(base: { id: string; hint?: string; error?: string }) {
  const ids: string[] = [];
  if (base.hint) ids.push(`${base.id}-hint`);
  if (base.error) ids.push(`${base.id}-err`);
  return ids.join(" ") || undefined;
}

export function TextField(
  props: Base & {
    value: string;
    onChange: (v: string) => void;
    type?: string;
    maxLength?: number;
    placeholder?: string;
  }
) {
  return (
    <div style={{ marginBottom: 20 }}>
      <LabelComAjuda id={props.id} label={props.label} required={props.required} ajuda={props.ajuda} />
      <Dica id={`${props.id}-hint`} texto={props.hint} />
      <input
        id={props.id}
        name={props.id}
        type={props.type ?? "text"}
        value={props.value}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        required={props.required}
        aria-required={props.required}
        aria-invalid={!!props.error}
        aria-describedby={described(props)}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ ...controlStyle, borderColor: props.error ? "#b3140e" : "#888" }}
      />
      <Erro id={`${props.id}-err`} msg={props.error} />
    </div>
  );
}

export function TextAreaField(
  props: Base & { value: string; onChange: (v: string) => void; maxLength?: number; rows?: number }
) {
  return (
    <div style={{ marginBottom: 20 }}>
      <LabelComAjuda id={props.id} label={props.label} required={props.required} ajuda={props.ajuda} />
      <Dica id={`${props.id}-hint`} texto={props.hint} />
      <textarea
        id={props.id}
        name={props.id}
        rows={props.rows ?? 3}
        value={props.value}
        maxLength={props.maxLength}
        required={props.required}
        aria-required={props.required}
        aria-invalid={!!props.error}
        aria-describedby={described(props)}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ ...controlStyle, resize: "vertical", borderColor: props.error ? "#b3140e" : "#888" }}
      />
      <Erro id={`${props.id}-err`} msg={props.error} />
    </div>
  );
}

export function SelectField(
  props: Base & { value: string; onChange: (v: string) => void; options: Opcao[]; placeholder?: string }
) {
  return (
    <div style={{ marginBottom: 20 }}>
      <LabelComAjuda id={props.id} label={props.label} required={props.required} ajuda={props.ajuda} />
      <Dica id={`${props.id}-hint`} texto={props.hint} />
      <select
        id={props.id}
        name={props.id}
        value={props.value}
        required={props.required}
        aria-required={props.required}
        aria-invalid={!!props.error}
        aria-describedby={described(props)}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ ...controlStyle, borderColor: props.error ? "#b3140e" : "#888" }}
      >
        <option value="">{props.placeholder ?? "Selecione…"}</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Erro id={`${props.id}-err`} msg={props.error} />
    </div>
  );
}

export function CheckboxField(
  props: Omit<Base, "label"> & { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }
) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={props.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input
          id={props.id}
          name={props.id}
          type="checkbox"
          checked={props.checked}
          required={props.required}
          aria-required={props.required}
          aria-invalid={!!props.error}
          aria-describedby={described(props)}
          onChange={(e) => props.onChange(e.target.checked)}
          style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
        />
        <span>
          {props.children} {props.required && <span aria-hidden style={{ color: "#b3140e" }}>*</span>}
        </span>
      </label>
      <Erro id={`${props.id}-err`} msg={props.error} />
    </div>
  );
}
