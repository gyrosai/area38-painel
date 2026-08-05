"use client";

import { useEffect, useState } from "react";
import {
  carregarPlacar, corDaFaixa, formatarPontos, horaDe, estaDesatualizado,
} from "@/lib/dados";

/* Cor oficial da Área 38. Não usar #0D417D — é a antiga. */
const AZUL = "#264D83";
const AZUL_ESC = "#1B3A66";

/* A TV recarrega sozinha; ninguém vai até a parede apertar F5. */
const INTERVALO_MS = 5 * 60 * 1000;

export default function Painel() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [agora, setAgora] = useState(null);
  const [altura, setAltura] = useState(1080);

  useEffect(() => {
    let vivo = true;
    const buscar = () =>
      carregarPlacar()
        .then((d) => vivo && (setDados(d), setErro(null)))
        // Mantém o último placar na tela em vez de trocar por erro:
        // internet caída não deve apagar o painel do escritório.
        .catch((e) => vivo && setErro(e.message));
    buscar();
    const medir = () => setAltura(window.innerHeight);
    medir();
    window.addEventListener("resize", medir);
    const t1 = setInterval(buscar, INTERVALO_MS);
    const t2 = setInterval(() => setAgora(new Date()), 30000);
    setAgora(new Date());
    return () => {
      vivo = false; clearInterval(t1); clearInterval(t2);
      window.removeEventListener("resize", medir);
    };
  }, []);

  if (!dados && erro) return <Aviso texto={`Não foi possível carregar o placar: ${erro}`} />;
  if (!dados) return <Aviso texto="Carregando placar…" />;

  const c = dados.corretores;
  const top3 = c.slice(0, 3);
  const resto = c.slice(3);
  const semHistorico = !dados.resumo.tem_historico;

  const maisPontuou = [...c]
    .filter((x) => x.ganho_semana != null && x.ganho_semana > 0)
    .sort((a, b) => b.ganho_semana - a.ganho_semana)[0];

  const maisPerto = [...c]
    .filter((x) => x.proxima_faixa)
    .sort((a, b) => a.proxima_faixa.faltam - b.proxima_faixa.faltam)[0];

  /* Dois fatores de escala. O primeiro ajusta ao tamanho da equipe: com 5
     corretores os cards crescem, com 15 encolhem. O segundo ajusta a altura
     real disponivel — numa TV em tela cheia sao 1080px, mas num navegador
     com barra de favoritos sobram bem menos, e o conteudo cortava embaixo. */
  const n = c.length;
  const porEquipe = n <= 6 ? 1.3 : n <= 9 ? 1.1 : n <= 12 ? 0.98 : 0.86;
  const porAltura = Math.min(1, altura / 1010);
  const esc = Math.max(0.62, porEquipe * porAltura);

  return (
    <main style={{ ...S.tela, fontSize: `${esc}rem` }}>
      <Topo dados={dados} agora={agora} erro={erro} />

      <div style={S.grade}>
        {/* ---------------------------------------------- coluna 1: ranking */}
        <section style={S.coluna}>
          <h2 style={S.tituloSecao}>Ranking do trimestre</h2>
          <div style={S.topo3}>
            {top3.map((x) => <CardTopo key={x.codigo} c={x} />)}
          </div>
          {resto.length > 0 && (
            <div style={S.listaResto}>
              {resto.map((x) => <LinhaResto key={x.codigo} c={x} />)}
            </div>
          )}
        </section>

        {/* --------------------------------------------- coluna 2: destaques */}
        <section style={S.coluna}>
          <h2 style={S.tituloSecao}>Destaques</h2>

          <div style={S.bloco}>
            <Rotulo texto="Quem mais pontuou na semana" />
            {maisPontuou ? (
              <div style={S.destaqueLinha}>
                <Avatar iniciais={maisPontuou.iniciais} />
                <div style={{ flex: 1 }}>
                  <div style={S.destaqueNome}>{maisPontuou.nome}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={S.destaqueValor}>+{formatarPontos(maisPontuou.ganho_semana)}</div>
                  <div style={S.destaqueCap}>pontos</div>
                </div>
              </div>
            ) : (
              <Placeholder texto={
                semHistorico
                  ? "Disponível depois de uma semana de apuração"
                  : "Nenhuma pontuação nova nos últimos 7 dias"} />
            )}
          </div>

          <div style={S.bloco}>
            <Rotulo texto="Mais perto de subir de faixa" />
            {maisPerto ? (
              <>
                <div style={S.destaqueLinha}>
                  <Avatar iniciais={maisPerto.iniciais} />
                  <div style={{ flex: 1 }}>
                    <div style={S.destaqueNome}>{maisPerto.nome}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={S.destaqueValor}>{formatarPontos(maisPerto.proxima_faixa.faltam)}</div>
                    <div style={S.destaqueCap}>
                      para {maisPerto.proxima_faixa.faixa} · {maisPerto.proxima_faixa.pct}%
                    </div>
                  </div>
                </div>
                <Barra
                  valor={maisPerto.pontos}
                  total={maisPerto.pontos + maisPerto.proxima_faixa.faltam}
                />
              </>
            ) : <Placeholder texto="Todos na faixa máxima" />}
          </div>

          <div style={{ ...S.bloco, background: AZUL_ESC, border: "none", flex: 1.3 }}>
            <Rotulo texto="Faixas do trimestre" claro />
            {dados.faixas.map((f) => (
              <div key={f.nome} style={S.faixaLinha}>
                <span style={S.faixaNome}>{f.nome}</span>
                <span style={S.faixaPts}>{formatarPontos(f.pts_minimo)} pts</span>
                <span style={S.faixaPct}>{f.pct}%</span>
              </div>
            ))}
            <div style={S.faixaNota}>
              Comissão aplicada no trimestre seguinte
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ coluna 3: números */}
        <aside style={S.coluna}>
          <div style={S.painelLateral}>
            <div style={S.contagem}>{dados.dias_restantes}</div>
            <div style={S.contagemCap}>
              {dados.dias_restantes === 1 ? "dia restante" : "dias restantes"}
            </div>
            <div style={S.divisor} />
            <Metrica valor={dados.resumo.corretores} rotulo="Corretores no programa" />
            <Metrica valor={dados.resumo.em_faixa} rotulo="Já em faixa" />
            <Metrica valor={formatarPontos(dados.resumo.total_pontos)} rotulo="Pontos somados" />
          </div>

          <div style={S.bloco}>
            <Rotulo texto="Como pontuar" />
            {[
              ["Cadastrar lead no CRM", 160],
              ["Captação exclusiva", 120],
              ["Feedback ao proprietário", 80],
              ["Captação sem exclusividade", 40],
            ].map(([t, p]) => (
              <div key={t} style={S.regraLinha}>
                <span style={S.regraTexto}>{t}</span>
                <span style={S.regraPts}>{p}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ peças */

function Topo({ dados, agora, erro }) {
  const velho = estaDesatualizado(dados.atualizado_em);
  return (
    <header style={S.topo}>
      <div>
        <div style={S.marca}>área 38</div>
        <div style={S.subMarca}>Liga Área 38 · Programa Trimestral</div>
      </div>
      <div style={S.topoCentro}>
        <div style={S.ciclo}>{dados.ciclo.replace("-", " · ")}</div>
        <div style={S.periodo}>A corrida do trimestre</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={S.relogio}>
          {agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
        </div>
        {/* Sem selo "ao vivo" fixo: se a atualização parar, a TV precisa
            dizer isso em vez de mentir para o escritório inteiro. */}
        <div style={{ ...S.status, color: velho || erro ? "#F59E0B" : "#86EFAC" }}>
          {erro ? "sem conexão · dados de " : velho ? "desatualizado · " : "atualizado "}
          {horaDe(dados.atualizado_em)}
        </div>
      </div>
    </header>
  );
}

/* Na TV, "11 cadastro de lead no CRM" ocupa a linha inteira e se le mal de
   longe. Rotulo curto, no plural certo. */
/* A comparacao ignora acento: o arquivo de regras e escrito sem acento para
   evitar problema de encoding no servidor Windows, entao "Captacao" chega
   sem acento aqui e nao casaria com a chave acentuada. */
const CURTO = [
  [/lead/i, ["lead", "leads"]],
  [/com exclusividade/i, ["captação exclusiva", "captações exclusivas"]],
  [/feedback/i, ["feedback", "feedbacks"]],
  [/sem exclusividade/i, ["captação", "captações"]],
];

function resumoDetalhe(detalhe) {
  if (!detalhe.length) return "sem pontuação registrada";
  return detalhe
    .map((d) => {
      const achado = CURTO.find(([re]) => re.test(d.criterio));
      const nome = achado ? achado[1][d.qtd === 1 ? 0 : 1] : d.criterio.toLowerCase();
      return `${d.qtd} ${nome}`;
    })
    .join(" · ");
}

function CardTopo({ c }) {
  const cor = corDaFaixa(c.faixa);
  return (
    <div style={{ ...S.card, background: cor.fundo, borderBottom: `3px solid ${cor.borda}` }}>
      <Avatar iniciais={c.iniciais} grande />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.cardNome}>{c.nome}</div>
        <div style={S.cardDetalhe}>{resumoDetalhe(c.detalhe)}</div>
        <div style={{ ...S.cardFaixa, color: cor.texto }}>
          {c.faixa
            ? `${c.faixa} · ${c.pct_comissao}% de comissão`
            : c.proxima_faixa
              ? `faltam ${formatarPontos(c.proxima_faixa.faltam)} pts para ${c.proxima_faixa.faixa}`
              : "—"}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={S.cardPontos}>{formatarPontos(c.pontos)}</div>
        <div style={S.cardPts}>pts</div>
      </div>
      <div style={S.posicao}>{c.posicao}º</div>
    </div>
  );
}

function LinhaResto({ c }) {
  const cor = corDaFaixa(c.faixa);
  return (
    <div style={S.linha}>
      <Avatar iniciais={c.iniciais} pequeno />
      <span style={S.linhaNome}>{c.nome}</span>
      {c.faixa && (
        <span style={{ ...S.selo, background: cor.fundo, color: cor.texto, borderColor: cor.borda }}>
          {c.faixa}
        </span>
      )}
      <span style={S.linhaPontos}>{formatarPontos(c.pontos)}</span>
      <Movimento valor={c.movimento} />
      <span style={S.linhaPos}>{c.posicao}º</span>
    </div>
  );
}

function Movimento({ valor }) {
  // null = ainda não há snapshot anterior. Melhor não mostrar nada do que
  // mostrar "—" e parecer que a pessoa não se mexeu.
  if (valor == null) return <span style={S.mov} />;
  if (valor === 0) return <span style={{ ...S.mov, color: "#94A3B8" }}>–</span>;
  const sobe = valor > 0;
  return (
    <span style={{ ...S.mov, color: sobe ? "#16A34A" : "#DC2626" }}>
      {sobe ? "↑" : "↓"}{Math.abs(valor)}
    </span>
  );
}

function Avatar({ iniciais, grande, pequeno }) {
  const t = grande ? "3.9em" : pequeno ? "1.9em" : "2.7em";
  return (
    <div style={{
      width: t, height: t, minWidth: t, borderRadius: "50%", background: AZUL, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: grande ? "1.3em" : pequeno ? "0.68em" : "0.95em",
      flexShrink: 0,
      letterSpacing: "-0.02em",
    }}>{iniciais}</div>
  );
}

function Barra({ valor, total }) {
  const pct = Math.min(100, Math.round((valor / total) * 100));
  return (
    <div style={S.barraFora}>
      <div style={{ ...S.barraDentro, width: `${pct}%` }} />
    </div>
  );
}

const Rotulo = ({ texto, claro }) => (
  <div style={{ ...S.rotulo, color: claro ? "rgba(255,255,255,.7)" : "#7B8794" }}>{texto}</div>
);

const Placeholder = ({ texto }) => <div style={S.placeholder}>{texto}</div>;

const Metrica = ({ valor, rotulo }) => (
  <div style={S.metrica}>
    <span style={S.metricaValor}>{valor}</span>
    <span style={S.metricaRotulo}>{rotulo}</span>
  </div>
);

const Aviso = ({ texto }) => (
  <main style={{ ...S.tela, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <p style={{ color: "#64748B", fontSize: 20 }}>{texto}</p>
  </main>
);

/* ----------------------------------------------------------------- estilos */
/* Dimensionado para TV 16:9 vista de longe: nada abaixo de 13px, números
   grandes, contraste alto. */

const S = {
  /* Altura travada em 100vh: a TV nao rola. Tudo tem que caber. */
  tela: {
    height: "100vh", overflow: "hidden",
    background: "linear-gradient(160deg,#EEF3F9 0%,#E2EAF4 100%)",
    fontFamily: "'Manrope',system-ui,sans-serif", color: "#1E293B",
    padding: "22px 30px 26px", boxSizing: "border-box",
    display: "flex", flexDirection: "column",
  },
  topo: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 18, marginBottom: 22, borderBottom: "1px solid #CDD9E6",
  },
  marca: { fontSize: 30, fontWeight: 800, color: AZUL, letterSpacing: "-0.03em", lineHeight: 1 },
  subMarca: { fontSize: 12, color: "#7B8794", marginTop: 4, fontWeight: 500 },
  topoCentro: { textAlign: "center" },
  ciclo: { fontSize: 22, fontWeight: 800, color: AZUL, letterSpacing: "-0.02em" },
  periodo: { fontSize: 12, color: "#7B8794", marginTop: 2 },
  relogio: { fontSize: 30, fontWeight: 800, color: AZUL, letterSpacing: "-0.02em", lineHeight: 1 },
  status: { fontSize: 11, marginTop: 5, fontWeight: 600 },

  grade: {
    display: "grid", gridTemplateColumns: "1.35fr 1fr 0.85fr", gap: 22,
    flex: 1, minHeight: 0,
  },
  coluna: { display: "flex", flexDirection: "column", minHeight: 0 },
  tituloSecao: { fontSize: 13, fontWeight: 700, color: "#5A6B7D", textTransform: "uppercase",
                 letterSpacing: "0.09em", margin: "0 0 12px" },

  topo3: { display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 },
  card: {
    display: "flex", alignItems: "center", gap: 14, padding: "1.05em 1.15em",
    borderRadius: 14, position: "relative", flex: 1, minHeight: 0,
    boxShadow: "0 1px 3px rgba(30,41,59,.06)",
  },
  cardNome: { fontSize: "1.55em", fontWeight: 800, letterSpacing: "-0.025em",
              lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis" },
  cardDetalhe: { fontSize: "0.76em", color: "#64748B", marginTop: 3, overflow: "hidden",
                 textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardFaixa: { fontSize: "0.82em", fontWeight: 700, marginTop: 5 },
  cardPontos: { fontSize: "1.9em", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 },
  cardPts: { fontSize: 11, color: "#7B8794", marginTop: 2 },
  posicao: { fontSize: "1.6em", fontWeight: 800, color: "#94A3B8", minWidth: 42, textAlign: "right" },

  listaResto: { background: "#fff", borderRadius: 14, padding: "6px 16px", marginTop: 12,
                boxShadow: "0 1px 3px rgba(30,41,59,.06)", flexShrink: 0,
                maxHeight: "42%", overflow: "hidden" },
  linha: { display: "flex", alignItems: "center", gap: 11, padding: "9px 0",
           borderBottom: "1px solid #EEF2F7" },
  linhaNome: { flex: 1, fontSize: "0.95em", fontWeight: 600 },
  linhaPontos: { fontSize: "0.95em", fontWeight: 800, minWidth: 58, textAlign: "right" },
  linhaPos: { fontSize: 13, color: "#94A3B8", minWidth: 30, textAlign: "right", fontWeight: 700 },
  mov: { fontSize: 12, fontWeight: 700, minWidth: 26, textAlign: "right" },
  selo: { fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
          border: "1px solid", textTransform: "uppercase", letterSpacing: "0.04em" },

  bloco: { background: "#fff", borderRadius: 14, padding: "16px 18px", marginBottom: 12,
           border: "1px solid #E3EAF2", boxShadow: "0 1px 3px rgba(30,41,59,.05)",
           flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
           justifyContent: "center" },
  rotulo: { fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.09em", marginBottom: 11 },
  destaqueLinha: { display: "flex", alignItems: "center", gap: 12 },
  destaqueNome: { fontSize: "1.3em", fontWeight: 800, letterSpacing: "-0.02em" },
  destaqueValor: { fontSize: "1.45em", fontWeight: 800, color: AZUL, letterSpacing: "-0.02em", lineHeight: 1 },
  destaqueCap: { fontSize: 11, color: "#7B8794", marginTop: 3 },
  placeholder: { fontSize: 13, color: "#94A3B8", fontStyle: "italic", padding: "6px 0" },

  barraFora: { height: 7, background: "#EDF2F7", borderRadius: 20, marginTop: 13, overflow: "hidden" },
  barraDentro: { height: "100%", background: `linear-gradient(90deg,${AZUL},#4A7BB8)`, borderRadius: 20 },

  faixaLinha: { display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                borderBottom: "1px solid rgba(255,255,255,.1)" },
  faixaNome: { flex: 1, fontSize: "0.95em", fontWeight: 700, color: "#fff" },
  faixaPts: { fontSize: 13, color: "rgba(255,255,255,.65)" },
  faixaPct: { fontSize: "1.05em", fontWeight: 800, color: "#fff", minWidth: 46, textAlign: "right" },
  faixaNota: { fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 10 },

  painelLateral: { background: AZUL, borderRadius: 14, padding: "22px 20px", color: "#fff",
                   marginBottom: 12, display: "flex", flexDirection: "column",
                   justifyContent: "center", flex: "0 0 auto" },
  contagem: { fontSize: "3.6em", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em" },
  contagemCap: { fontSize: 13, color: "rgba(255,255,255,.75)", marginTop: 4 },
  divisor: { height: 1, background: "rgba(255,255,255,.18)", margin: "18px 0 14px" },
  metrica: { display: "flex", alignItems: "baseline", gap: 9, marginBottom: 9 },
  metricaValor: { fontSize: "1.3em", fontWeight: 800, minWidth: 46 },
  metricaRotulo: { fontSize: 12, color: "rgba(255,255,255,.72)" },

  regraLinha: { display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, padding: "7px 0", borderBottom: "1px solid #EEF2F7" },
  regraTexto: { fontSize: "0.82em", color: "#475569", lineHeight: 1.3 },
  regraPts: { fontSize: "0.88em", fontWeight: 800, color: AZUL, flexShrink: 0 },
};
