/**
 * Camada de dados do painel.
 *
 * A origem e decidida por variavel de ambiente, sem mudar nenhum componente:
 *
 *   NEXT_PUBLIC_PLACAR_URL  -> busca de uma URL (JSON publicado)
 *   (ausente)               -> le /placar.json de public/, gerado por exportar.py
 *
 * O painel nunca fala com o Loft nem com o banco de eventos. O banco guarda
 * payload bruto com nome e telefone de cliente; a TV fica numa parede e nao
 * tem login. So o placar ja agregado sai daqui.
 */

export async function carregarPlacar() {
  const url = process.env.NEXT_PUBLIC_PLACAR_URL || "/placar.json";
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`placar indisponivel (${r.status})`);
  return r.json();
}

/** Faixas em ordem de prestigio, com a cor de cada uma. */
export const CORES_FAIXA = {
  Ouro: { fundo: "linear-gradient(100deg,#FFF9EC 0%,#FDF1D6 100%)", borda: "#C9962E", texto: "#8A6516" },
  Prata: { fundo: "linear-gradient(100deg,#F8FAFC 0%,#E9EEF3 100%)", borda: "#94A3B8", texto: "#5A6B7D" },
  Bronze: { fundo: "linear-gradient(100deg,#FDF4EC 0%,#F7E6D5 100%)", borda: "#B87333", texto: "#8A5222" },
};

/** Estado de quem ainda nao alcancou a faixa minima.
 *  Aparece com tratamento neutro: o painel fica numa parede e e visto por
 *  todo o escritorio — marcar alguem de vermelho seria exposicao publica. */
export const SEM_FAIXA = { fundo: "#FFFFFF", borda: "#D7DEE7", texto: "#64748B" };

export function corDaFaixa(faixa) {
  return CORES_FAIXA[faixa] || SEM_FAIXA;
}

export function formatarPontos(n) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

/** Hora do "atualizado_em" para o rodape do painel. */
export function horaDe(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** O painel fica ligado o dia inteiro; se os dados pararem de atualizar,
 *  precisa ficar visivel em vez de mostrar numero velho como se fosse novo. */
export function estaDesatualizado(iso, horas = 26) {
  if (!iso) return true;
  return (Date.now() - new Date(iso).getTime()) > horas * 3600 * 1000;
}
