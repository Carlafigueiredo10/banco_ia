"use client";

import type { Opcao } from "@/lib/enums";

// Primitivas de formulário acessíveis (e-MAG): label associado, aria-describedby
// ligando erro/dica ao campo, aria-invalid, required marcado visual e semanticamente.

type Base = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
};

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

const labelStyle: React.CSSProperties = { fontWeight: 600, display: "block", marginBottom: 4 };
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
      <label htmlFor={props.id} style={labelStyle}>
        {props.label} {props.required && <span aria-hidden style={{ color: "#b3140e" }}>*</span>}
      </label>
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
      <label htmlFor={props.id} style={labelStyle}>
        {props.label} {props.required && <span aria-hidden style={{ color: "#b3140e" }}>*</span>}
      </label>
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
      <label htmlFor={props.id} style={labelStyle}>
        {props.label} {props.required && <span aria-hidden style={{ color: "#b3140e" }}>*</span>}
      </label>
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
