"use client";

import { useEffect, useState } from "react";
import { enviarMetricaAguardando } from "@/lib/metrica";

// Botão "Tenho interesse": só REGISTRA o evento agregado (sinal de demanda). NÃO consulta contagem.
// Prevenção de duplo clique via sessionStorage (grava só APÓS sucesso). Sem login/fingerprint —
// não promete unicidade. Falha mantém o botão habilitado para nova tentativa.
type Estado = "idle" | "enviando" | "ok" | "erro";

export default function TenhoInteresse({ solucaoId, style }: { solucaoId: string; style?: React.CSSProperties }) {
  const [estado, setEstado] = useState<Estado>("idle");
  const chave = `bbsia:v1:interesse:${solucaoId}`;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(chave) === "1") setEstado("ok");
    } catch {
      /* sessionStorage indisponível: segue no idle */
    }
  }, [chave]);

  async function registrar() {
    if (estado === "enviando" || estado === "ok") return;
    setEstado("enviando");
    const ok = await enviarMetricaAguardando("interesse", solucaoId);
    if (ok) {
      setEstado("ok");
      try {
        sessionStorage.setItem(chave, "1"); // só após sucesso
      } catch {
        /* ok mesmo sem persistir */
      }
    } else {
      setEstado("erro"); // mantém habilitado para nova tentativa
    }
  }

  const registrado = estado === "ok";
  const enviando = estado === "enviando";
  const rotulo = registrado ? "✓ Interesse registrado" : enviando ? "Registrando…" : "♡ Tenho interesse";

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, ...style }}>
      <button
        type="button"
        onClick={registrar}
        disabled={registrado || enviando}
        style={{
          background: registrado ? "#e8f0e8" : "var(--bbsia-azul)",
          color: registrado ? "#155724" : "#fff",
          border: "none",
          borderRadius: 16,
          padding: "7px 18px",
          cursor: registrado || enviando ? "default" : "pointer",
          fontWeight: 600,
          fontSize: ".85rem",
        }}
      >
        {rotulo}
      </button>
      {estado === "erro" && (
        <span role="alert" style={{ fontSize: ".75rem", color: "#b3140e" }}>
          Não foi possível registrar agora.
        </span>
      )}
    </span>
  );
}
