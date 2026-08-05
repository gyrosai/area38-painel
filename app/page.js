"use client";

import { useEffect, useState } from "react";
import {
  carregarPlacar, corDaFaixa, formatarPontos, horaDe, estaDesatualizado,
} from "@/lib/dados";

/* Cor oficial da Área 38. Não usar #0D417D — é a antiga. */
const AZUL = "#264D83";

/* Pódio: cor da POSIÇÃO, não da faixa. São coisas diferentes e o protótipo
   as misturava — nele o 1º lugar era dourado e também faixa Ouro. Na
   realidade o 1º colocado pode estar em Bronze, e é a faixa que define a
   comissão. Por isso a faixa aparece como selo explícito dentro do card. */
const PODIO = [
  { fundo: "linear-gradient(100deg,#FFFBF0 0%,#FBEECB 100%)", borda: "#C9962E",
    texto: "#8A6516", medalha: "#C9962E" },
  { fundo: "linear-gradient(100deg,#FAFBFC 0%,#E7ECF1 100%)", borda: "#94A3B8",
    texto: "#556475", medalha: "#94A3B8" },
  { fundo: "linear-gradient(100deg,#FDF6EF 0%,#F5E3D0 100%)", borda: "#B87333",
    texto: "#8A5222", medalha: "#B87333" },
];
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
  const curto = montarNomesCurtos(c);
  const top3 = c.slice(0, 3);
  const resto = c.slice(3);
  const semHistorico = !dados.resumo.tem_historico;

  /* Quanto do trimestre já passou. Cru do dado: início, fim e hoje. */
  const ini = new Date(dados.inicio + "T00:00:00");
  const fim = new Date(dados.fim + "T00:00:00");
  const total = Math.max(1, (fim - ini) / 86400000);
  const pctTrimestre = Math.min(100, Math.max(0,
    Math.round(((total - dados.dias_restantes) / total) * 100)));

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
            {top3.map((x) => <CardTopo key={x.codigo} c={x} nome={curto[x.codigo]} />)}
          </div>
          {resto.length > 0 && (
            <div style={S.listaResto}>
              {resto.map((x) => <LinhaResto key={x.codigo} c={x} nome={curto[x.codigo]} />)}
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
                  <div style={S.destaqueNome}>{curto[maisPontuou.codigo]}</div>
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
                    <div style={S.destaqueNome}>{curto[maisPerto.codigo]}</div>
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
            <div style={S.anelCentro}>
              <Anel pct={pctTrimestre} valor={`${pctTrimestre}%`} legenda="do trimestre" />
            </div>
            <div style={S.contagemLinha}>
              <span style={S.contagem}>{dados.dias_restantes}</span>
              <span style={S.contagemCap}>
                {dados.dias_restantes === 1 ? "dia restante" : "dias restantes"}
              </span>
            </div>
            <div style={S.divisor} />
            <Metrica valor={`${dados.resumo.em_faixa}/${dados.resumo.corretores}`}
                     rotulo="Corretores em faixa" />
            <Metrica valor={formatarPontos(dados.resumo.total_pontos)}
                     rotulo="Pontos somados no trimestre" />
          </div>

          {dados.conquistas?.length > 0 && (
            <div style={S.bloco}>
              <Rotulo texto="Conquistas" />
              {dados.conquistas.slice(0, 2).map((q, i) => (
                <div key={i} style={S.conquista}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.conquistaNome}>{curto[q.codigo] || q.nome}</div>
                    <div style={{ ...S.conquistaFaixa, color: corDaFaixa(q.faixa).texto }}>
                      faixa {q.faixa}
                    </div>
                  </div>
                  <span style={S.conquistaQuando}>
                    {q.dias === 0 ? "hoje" : q.dias === 1 ? "ontem" : `há ${q.dias}d`}
                  </span>
                </div>
              ))}
            </div>
          )}

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
      <div style={S.marcaBloco}>
        {/* O .ai original vinha com padding branco em volta; o SVG foi
            recortado no conteúdo, senão a logo apareceria pequena e
            desalinhada dentro de uma moldura invisível. */}
        <img src="/logo-area38.svg" alt="Área 38 Imobiliária" style={S.logo} />
        <div style={S.subMarca}>Liga Área 38<br />Programa Trimestral</div>
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

function CardTopo({ c, nome }) {
  const p = PODIO[c.posicao - 1] || PODIO[2];
  const faixa = corDaFaixa(c.faixa);
  return (
    <div style={{ ...S.card, background: p.fundo, borderBottom: `3px solid ${p.borda}` }}>
      <Avatar iniciais={c.iniciais} grande />
      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
        <div style={S.cardTopoLinha}>
          <span style={S.cardNome}>{nome || c.nome}</span>
          {c.faixa ? (
            <span style={{ ...S.selo, background: faixa.fundo, color: faixa.texto,
                           borderColor: faixa.borda }}>
              {c.faixa} · {c.pct_comissao}%
            </span>
          ) : (
            <span style={{ ...S.selo, background: "#F1F5F9", color: "#64748B",
                           borderColor: "#CBD5E1" }}>
              abaixo do mínimo
            </span>
          )}
        </div>
        <div style={S.cardDetalhe}>{resumoDetalhe(c.detalhe)}</div>
        <div style={{ ...S.cardFaixa, color: p.texto }}>
          {c.proxima_faixa
            ? `faltam ${formatarPontos(c.proxima_faixa.faltam)} pts para ${c.proxima_faixa.faixa} · ${c.proxima_faixa.pct}%`
            : "faixa máxima do trimestre"}
        </div>
        {c.proxima_faixa && (
          <Barra valor={c.pontos} total={c.pontos + c.proxima_faixa.faltam}
                 cor={p.borda} fina />
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={S.cardPontos}>{formatarPontos(c.pontos)}</div>
        <div style={S.cardPts}>pts</div>
      </div>
      <div style={{ ...S.posicao, color: p.medalha }}>{c.posicao}º</div>
    </div>
  );
}

function LinhaResto({ c, nome }) {
  const cor = corDaFaixa(c.faixa);
  return (
    <div style={S.linha}>
      <Avatar iniciais={c.iniciais} pequeno />
      <span style={S.linhaNome}>{nome || c.nome}</span>
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

/* Primeiro nome. Se dois corretores compartilham o primeiro nome, acrescenta
   a inicial do sobrenome: na TV, "Bruno" e "Bruno C." se lê melhor que dois
   nomes completos ocupando a linha inteira. */
function montarNomesCurtos(lista) {
  const contagem = {};
  lista.forEach((c) => {
    const p = String(c.nome || "").trim().split(/\s+/)[0];
    contagem[p] = (contagem[p] || 0) + 1;
  });
  const mapa = {};
  lista.forEach((c) => {
    const partes = String(c.nome || "").trim().split(/\s+/);
    mapa[c.codigo] = contagem[partes[0]] > 1 && partes[1]
      ? `${partes[0]} ${partes[1][0]}.`
      : partes[0];
  });
  return mapa;
}

const iniciaisDe = (nome) =>
  String(nome || "").split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase();

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

function Barra({ valor, total, cor, fina }) {
  const pct = Math.min(100, Math.round((valor / total) * 100));
  return (
    <div style={{ ...S.barraFora, height: fina ? 5 : 7, marginTop: fina ? 8 : 13 }}>
      <div style={{
        ...S.barraDentro, width: `${pct}%`,
        background: cor ? `linear-gradient(90deg,${cor},${cor}bb)` : S.barraDentro.background,
      }} />
    </div>
  );
}

/* Anel de progresso. O protótipo pedia percentuais em anel; aqui ele mostra
   o quanto do trimestre já passou — dado que existe, ao contrário das metas
   de escritório, que o CRM não tem. */
function Anel({ pct, valor, legenda, cor = "#7BD3A0", tamanho = 132 }) {
  const r = (tamanho - 16) / 2;
  const circ = 2 * Math.PI * r;
  const preenchido = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ position: "relative", width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none"
                stroke="rgba(255,255,255,.18)" strokeWidth="9" />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none"
                stroke={cor} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${preenchido} ${circ}`} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", color: "#fff",
      }}>
        <span style={{ fontSize: "1.5em", fontWeight: 800, lineHeight: 1,
                       letterSpacing: "-0.03em" }}>{valor}</span>
        <span style={{ fontSize: "0.62em", opacity: .78, marginTop: 3 }}>{legenda}</span>
      </div>
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
    paddingBottom: 16, marginBottom: 20, borderBottom: "1px solid #CDD9E6",
  },
  marcaBloco: { display: "flex", alignItems: "center", gap: 16 },
  /* A logo é quadrada e vista de longe: precisa de presença. */
  logo: { height: 84, width: "auto", display: "block", borderRadius: 16 },
  subMarca: { fontSize: 13, color: "#7B8794", fontWeight: 600, lineHeight: 1.35,
              maxWidth: 130 },
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
  cardTopoLinha: { display: "flex", alignItems: "center", gap: 10, minWidth: 0,
                   flexWrap: "nowrap" },
  cardNome: { fontSize: "1.5em", fontWeight: 800, letterSpacing: "-0.025em",
              lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis" },
  cardDetalhe: { fontSize: "0.76em", color: "#64748B", marginTop: 3, overflow: "hidden",
                 textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardFaixa: { fontSize: "0.78em", fontWeight: 700, marginTop: 5 },
  cardPontos: { fontSize: "1.9em", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 },
  cardPts: { fontSize: 11, color: "#7B8794", marginTop: 2 },
  posicao: { fontSize: "1.75em", fontWeight: 800, minWidth: 44, textAlign: "right",
             letterSpacing: "-0.03em" },

  listaResto: { background: "#fff", borderRadius: 14, padding: "6px 16px", marginTop: 12,
                boxShadow: "0 1px 3px rgba(30,41,59,.06)", flexShrink: 0,
                maxHeight: "42%", overflow: "hidden" },
  linha: { display: "flex", alignItems: "center", gap: 11, padding: "9px 0",
           borderBottom: "1px solid #EEF2F7" },
  linhaNome: { flex: 1, fontSize: "0.95em", fontWeight: 600 },
  linhaPontos: { fontSize: "0.95em", fontWeight: 800, minWidth: 58, textAlign: "right" },
  linhaPos: { fontSize: 13, color: "#94A3B8", minWidth: 30, textAlign: "right", fontWeight: 700 },
  mov: { fontSize: 12, fontWeight: 700, minWidth: 26, textAlign: "right" },
  selo: { fontSize: "0.6em", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
          border: "1px solid", textTransform: "uppercase", letterSpacing: "0.04em",
          whiteSpace: "nowrap", flexShrink: 0 },

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
  conquista: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
               borderBottom: "1px solid #EEF2F7" },
  conquistaNome: { fontSize: "0.9em", fontWeight: 700 },
  conquistaFaixa: { fontSize: "0.68em", fontWeight: 600, marginTop: 1 },
  conquistaQuando: { fontSize: "0.68em", color: "#94A3B8", whiteSpace: "nowrap" },

  barraFora: { height: 7, background: "rgba(30,41,59,.09)", borderRadius: 20,
               marginTop: 13, overflow: "hidden", width: "100%" },
  barraDentro: { height: "100%", background: `linear-gradient(90deg,${AZUL},#4A7BB8)`, borderRadius: 20 },

  faixaLinha: { display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                borderBottom: "1px solid rgba(255,255,255,.1)" },
  faixaNome: { flex: 1, fontSize: "0.95em", fontWeight: 700, color: "#fff" },
  faixaPts: { fontSize: 13, color: "rgba(255,255,255,.65)" },
  faixaPct: { fontSize: "1.05em", fontWeight: 800, color: "#fff", minWidth: 46, textAlign: "right" },
  faixaNota: { fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 10 },

  painelLateral: { background: AZUL, borderRadius: 14, padding: "20px", color: "#fff",
                   marginBottom: 12, display: "flex", flexDirection: "column",
                   justifyContent: "center", flex: "0 0 auto" },
  anelCentro: { display: "flex", justifyContent: "center", marginBottom: 14 },
  contagemLinha: { display: "flex", alignItems: "baseline", gap: 9,
                   justifyContent: "center" },
  contagem: { fontSize: "2em", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" },
  contagemCap: { fontSize: 13, color: "rgba(255,255,255,.75)" },
  divisor: { height: 1, background: "rgba(255,255,255,.18)", margin: "16px 0 13px" },
  metrica: { display: "flex", alignItems: "baseline", gap: 9, marginBottom: 9 },
  metricaValor: { fontSize: "1.3em", fontWeight: 800, minWidth: 46 },
  metricaRotulo: { fontSize: 12, color: "rgba(255,255,255,.72)" },

  regraLinha: { display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, padding: "7px 0", borderBottom: "1px solid #EEF2F7" },
  regraTexto: { fontSize: "0.82em", color: "#475569", lineHeight: 1.3 },
  regraPts: { fontSize: "0.88em", fontWeight: 800, color: AZUL, flexShrink: 0 },
};
