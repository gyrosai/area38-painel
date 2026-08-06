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

/** Idade do dado, em dias de calendario.
 *
 *  A apuracao e diaria, entao QUALQUER dado de um dia anterior ja esta
 *  atrasado — nao adianta medir em horas. Um placar de ontem as 23h tem
 *  poucas horas de idade as 6h da manha, mas ja perdeu uma apuracao.
 */
export function diasDeAtraso(iso) {
  if (!iso) return 99;
  const d = new Date(iso);
  if (isNaN(d)) return 99;
  const hoje = new Date();
  const so = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.round((so(hoje) - so(d)) / 86400000);
}

export function estaDesatualizado(iso) {
  return diasDeAtraso(iso) >= 1;
}

/** Texto do estado, para o cabecalho. */
export function estadoDoDado(iso) {
  const dias = diasDeAtraso(iso);
  if (dias >= 99) return { texto: "sem data", cor: "alerta" };
  if (dias === 0) return { texto: "atualizado hoje", cor: "ok" };
  if (dias === 1) return { texto: "dados de ontem", cor: "alerta" };
  return { texto: `dados de ${dias} dias atrás`, cor: "alerta" };
}
