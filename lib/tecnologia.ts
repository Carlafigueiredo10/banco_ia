// Heurística LEVE (palavras-chave) para SUGERIR a tecnologia de IA a partir do que
// o contribuinte escreve (problema + como funciona). Roda no navegador, ao vivo.
// É só sugestão — o usuário confirma/edita, e a curadoria pode reajustar.
// Sem IA externa; quando a IA de triagem (Fase 2) chegar, melhora a mesma sugestão.

type Tecnologia =
  | "nlp" | "visao" | "ml_preditivo" | "recomendacao" | "otimizacao" | "fala";

const REGRAS: { tec: Tecnologia; termos: RegExp }[] = [
  { tec: "fala", termos: /\b(voz|áudio|audio|fala|falad|transcri|locu|liga(ç|c)(ã|a)o|telefonema|escuta|call)\w*/i },
  { tec: "visao", termos: /\b(imagem|imagens|foto|fotos|v(í|i)deo|sat(é|e)lite|visual|vis(ã|a)o computacional|reconhece\w* (a |as |de )?(imagem|rosto|placa)|raio-?x|tomografi|radiografi|c(â|a)mera|sensoriamento)\w*/i },
  { tec: "recomendacao", termos: /\b(recomend|suger|indica(ç|c)|sugest|personaliza\w* (conte(ú|u)do|oferta))\w*/i },
  { tec: "otimizacao", termos: /\b(otimiz|rota|roteiriz|aloca|escalon|agenda\w* autom|log(í|i)stic|fila\w* de atend|distribu\w* (recurso|equipe)|programa(ç|c)(ã|a)o linear)\w*/i },
  { tec: "ml_preditivo", termos: /\b(prev(ê|e|i|is)\w*|predi|classifica|estima|score|risco|fraude|evas(ã|a)o|churn|demanda|tend(ê|e)ncia|probabilidade|modelo preditivo)\w*/i },
  { tec: "nlp", termos: /\b(texto|textos|linguagem|documento|documentos|chat|chatbot|escrev|redigi|le(itura)?\b|resum|traduz|extra\w* (informa(ç|c)|dado)|ouvidoria|peti(ç|c)|processo\w* (judicia|administrativ)|sentiment|p(e|é)ti(ç|c))\w*/i },
];

// Retorna a tecnologia sugerida, ou null se nada bater com confiança.
export function inferirTecnologia(problema: string, comoFunciona = ""): Tecnologia | null {
  const texto = `${problema} ${comoFunciona}`;
  // Ordem das REGRAS define a prioridade quando há mais de um sinal
  // (voz/imagem são mais específicos que NLP/ML genéricos).
  for (const { tec, termos } of REGRAS) {
    if (termos.test(texto)) return tec;
  }
  return null;
}
