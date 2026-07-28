"use client";

import { useEffect, useRef } from "react";
import { enviarMetrica, type RotaMedida } from "@/lib/metrica";

// Registra UMA visita por montagem da página. Não renderiza nada e não lê nada
// do visitante — só informa qual rota foi aberta.
export default function RegistraVisita({ rota }: { rota: RotaMedida }) {
  const enviado = useRef(false);

  useEffect(() => {
    // O StrictMode do dev monta o efeito duas vezes; o ref sobrevive à remontagem
    // do mesmo componente, então conta uma vez só.
    if (enviado.current) return;
    enviado.current = true;
    enviarMetrica("pagina", rota);
  }, [rota]);

  return null;
}
