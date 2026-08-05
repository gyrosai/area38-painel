# Painel da TV — Liga Área 38

Next.js. Consome o `placar.json` gerado pelo motor de pontuação.

## Rodar local

```bash
npm install
npm run dev          # http://localhost:3000
```

O painel lê `public/placar.json`. Para atualizar com dados reais:

```bash
cd ../gamificacao
python3 exportar.py --ciclo 2026-Q3 --saida ../dashboard/public/placar.json
```

## Publicar

O painel é estático. Duas opções:

**1. Vercel + JSON publicado** — o job diário gera o `placar.json` e faz push;
a Vercel serve. A TV abre a URL e pronto. Não expõe nada do Loft ao navegador.

**2. Supabase** — defina `NEXT_PUBLIC_PLACAR_URL` apontando para uma rota que
devolva o mesmo formato. A camada `lib/dados.js` já isola isso: nenhum
componente muda.

## Decisões de projeto

**A TV nunca fala com o Loft nem com o banco de eventos.** O banco guarda
payload bruto com nome e telefone de cliente, e a TV fica numa parede sem
login. Só o placar agregado sai.

**Sem selo "AO VIVO" fixo.** Se a atualização parar, o cabeçalho mostra a hora
do último dado e muda de cor. Um selo fixo mentiria para o escritório inteiro
quando a internet caísse.

**Erro não apaga o painel.** Se a busca falhar, o último placar continua na
tela com o aviso de desatualizado — melhor que tela de erro na parede.

**Quem está abaixo do mínimo aparece em tom neutro**, não em vermelho. O painel
é visto por todos; marcar alguém de vermelho é exposição pública.

**O layout escala com o tamanho da equipe.** Com 5 corretores os cards crescem;
com 15 encolhem. A TV não rola.

**Elementos que dependem de histórico** (setas de movimento, ganho da semana)
só aparecem quando houver snapshots suficientes. Antes disso o painel mostra
uma mensagem em vez de zero — zero pareceria desempenho ruim.

## Fonte

A Área 38 usa Circular Std, que é licenciada (Lineto) e não pode ser servida
na web sem a licença. O painel usa Manrope, que é a substituta mais próxima.

## Cor

Azul oficial `#264D83`. Não usar `#0D417D` — é a antiga.
