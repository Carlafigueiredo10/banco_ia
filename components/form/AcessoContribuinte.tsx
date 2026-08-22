"use client";

import { useEffect, useState } from "react";

// Oferece, na tela de obrigado, o acesso para acompanhar e completar a solução recém-enviada.
//
// Só aparece se houver comprovante — quer dizer, se a submissão realmente veio do formulário nesta
// sessão. Quem chega em /contribuir/obrigado por link direto não vê nada, e é o certo: sem
// comprovante o pedido seria recusado do outro lado de qualquer forma.
export default function AcessoContribuinte() {
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [estado, setEstado] = useState<"pronto" | "enviando" | "enviado">("pronto");

  useEffect(() => {
    try {
      setComprovante(sessionStorage.getItem("bbsia:comprovante"));
    } catch {
      // storage bloqueado — simplesmente não oferecemos o acesso
    }
  }, []);

  if (!comprovante) return null;

  async function pedirAcesso() {
    setEstado("enviando");
    try {
      await fetch("/api/contribuinte/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comprovante }),
      });
    } catch {
      // A rota responde igual em qualquer caso; falha de rede não muda a mensagem que damos.
    }
    // Consome o comprovante: um clique, um pedido. Recarregar a página não repete o envio.
    try {
      sessionStorage.removeItem("bbsia:comprovante");
    } catch {
      /* idem */
    }
    setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <div style={caixa}>
        <p style={{ margin: 0, color: "#155724" }}>
          <strong>Link enviado.</strong> Se houver uma solução enviada com esse e-mail, o acesso
          acabou de chegar na sua caixa. Confira também o spam.
        </p>
      </div>
    );
  }

  return (
    <div style={caixa}>
      <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Quer acompanhar e completar sua solução?</p>
      <p style={{ margin: "0 0 12px", fontSize: ".92rem", color: "#444" }}>
        Enviamos um link para o e-mail que você informou. Por ele você vê o que já mandou, corrige e
        completa o que faltar — inclusive os resultados, que ajudam muito na avaliação.
      </p>
      <button type="button" onClick={pedirAcesso} disabled={estado === "enviando"} style={botao}>
        {estado === "enviando" ? "Enviando…" : "Receber link de acesso"}
      </button>
    </div>
  );
}

const caixa: React.CSSProperties = {
  background: "#eef3fb",
  border: "1px solid #c5d4ee",
  borderRadius: 8,
  padding: 16,
  margin: "24px 0",
  textAlign: "left",
};

const botao: React.CSSProperties = {
  background: "#1351b4",
  color: "#fff",
  border: "none",
  borderRadius: 20,
  padding: "10px 22px",
  fontWeight: 700,
  cursor: "pointer",
};
