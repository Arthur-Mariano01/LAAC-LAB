/* Históricos do Bugômetro: Consulta a API real, plota gráficos SVG puros
   e atualiza a página via Polling Inteligente sem location.reload(). */

let pollingTimer = null;
let ultimoId = 0;

const SVGNS = "http://www.w3.org/2000/svg";
function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function renderizarGrafico(grafico) {
  const W = 640, H = 200, pad = 8;
  const tela = svg("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "220", preserveAspectRatio: "none" });
  for (let g = 0; g <= 4; g++) {
    const y = pad + (H - pad * 2) * (g / 4);
    tela.append(svg("line", { x1: 0, y1: y, x2: W, y2: y, stroke: "var(--border-soft)", "stroke-width": 1 }));
  }
  
  const n = grafico.rotulos.length;
  for (const serie of grafico.series) {
    if(serie.dados.length === 0) continue;
    const pontos = serie.dados.map((v, i) => {
      const valor = v || 0;
      const x = n > 1 ? (i / (n - 1)) * W : W / 2;
      const y = H - pad - (valor / 100) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    tela.append(svg("polyline", {
      points: pontos, fill: "none", stroke: "var(--brand)",
      "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round",
    }));
  }
  const legendas = Api.criar("div", { class: "row", style: "justify-content:space-between;font-size:11px;color:var(--text-dim);margin-top:6px" });
  grafico.rotulos.forEach((r, i) => { 
      if (n <= 5 || i % Math.ceil(n/5) === 0) legendas.append(Api.criar("span", {}, r)); 
  });
  return Api.criar("div", {}, tela, legendas);
}

function renderizarEvento(evt) {
  const nivel = evt.status_nivel || "stable";
  const cor = `var(--${nivel === "critical" ? "critical" : nivel === "warning" ? "warning" : "stable"})`;
  return Api.criar("div", { class: "activity-item", style: `border-left: 3px solid ${cor}; padding-left: 12px; margin-bottom: 14px;` },
    Api.criar("div", {},
      Api.criar("div", { class: "a-title" }, evt.descricao || "Pontuação atualizada"),
      Api.criar("div", { class: "a-sub" }, "Status atingido: " + nivel.toUpperCase())
    ),
    Api.criar("div", { class: "badge badge--" + nivel }, (evt.pontuacao || 0) + " pts"),
    Api.criar("div", { class: "a-when", style: "margin-top:4px; font-size:11px" }, evt.quando || "")
  );
}

// NOVA LÓGICA: Função para renderizar o card de Bug Detalhado
function renderizarBugReportado(bug) {
  const nivel = bug.severidade === "critica" ? "critical" : bug.severidade === "alta" ? "warning" : bug.severidade === "media" ? "warning" : "stable";
  const statusMap = { aberto: "Aberto", confirmado: "Confirmado", resolvido: "Resolvido", rejeitado: "Rejeitado" };
  const statusRotulo = statusMap[bug.status] || bug.status;

  return Api.criar("div", { class: "card", style: "margin-bottom: 12px; background: var(--surface-2); padding: 16px;" },
    Api.criar("div", { class: "row between", style: "margin-bottom: 10px;" },
      Api.criar("div", { class: "row", style: "gap: 8px" },
        Api.criar("div", { style: "font-weight: 800; font-size: 16px; color: var(--text);" }, bug.titulo),
        Api.badge(bug.severidade_rotulo, nivel)
      ),
      Api.criar("div", { class: "dim", style: "font-size: 12px;" }, bug.quando)
    ),
    Api.criar("div", { class: "row", style: "gap: 16px; margin-bottom: 14px; font-size: 13px; color: var(--text-muted);" },
      Api.criar("span", {}, "📁 Categoria: " + bug.categoria_rotulo),
      Api.criar("span", {}, "📌 Status: " + statusRotulo),
      Api.criar("span", {}, "👍 Confirmações: " + bug.confirmacoes)
    ),
    Api.criar("div", { style: "font-size: 14px; line-height: 1.5; color: var(--text-dim); background: rgba(0,0,0,0.1); padding: 12px; border-radius: 6px; border: 1px solid var(--border-soft);" }, 
      bug.descricao
    )
  );
}

async function atualizarTela(slug, periodo, silencioso) {
  if (!slug) {
      document.getElementById("hs-content").style.display = "none";
      document.getElementById("hs-empty-state").style.display = "block";
      return;
  }
  
  document.getElementById("hs-content").style.display = "block";
  document.getElementById("hs-empty-state").style.display = "none";

  // Atualiza o botão para redirecionar para a auditoria no Bugômetro
  document.getElementById("hs-link-bugometro").href = "/bugometro?jogo=" + encodeURIComponent(slug);

  if (!silencioso) {
      Api.carregando("hs-card-jogo", "Carregando jogo...");
      Api.carregando("hs-chart", "Carregando gráfico...");
      Api.carregando("hs-timeline", "Carregando eventos...");
      Api.carregando("hs-bugs-reportados", "Carregando relatório de bugs...");
  }

  try {
    const dados = await Api.pedir(`/api/v1/telas/historicos?jogo=${encodeURIComponent(slug)}&periodo=${periodo}&ultimo_id=${ultimoId}`);
    
    if (dados.mudou === false) {
        document.getElementById("hs-atualizado").textContent = "Atualizado agora";
        return; 
    }

    ultimoId = dados.ultimo_id;
    document.getElementById("hs-atualizado").textContent = "Atualizado agora";

    const cartao = Api.cartaoDeJogo(dados.jogo);
    cartao.append(Api.criar("div", { class: "row", style: "margin-top: 10px; gap: 12px;" },
        Api.criar("span", { class: "badge badge--warning" }, dados.estatisticas.bugs_ativos + " Bugs Ativos"),
        Api.criar("span", { class: "badge badge--stable" }, dados.estatisticas.resolvidos + " Resolvidos")
    ));
    document.getElementById("hs-card-jogo").replaceChildren(cartao);
    document.getElementById("hs-chart").replaceChildren(renderizarGrafico(dados.grafico));

    const tl = document.getElementById("hs-timeline");
    if (dados.eventos.length === 0) {
        Api.vazio("hs-timeline", "Nenhum histórico de oscilação no período.");
    } else {
        tl.replaceChildren(...dados.eventos.map(renderizarEvento));
    }

    // NOVA LÓGICA: Preenche o relatório de bugs
    const hostBugs = document.getElementById("hs-bugs-reportados");
    if (dados.bugs_reportados.length === 0) {
        Api.vazio("hs-bugs-reportados", "Nenhum bug reportado no momento.");
    } else {
        hostBugs.replaceChildren(...dados.bugs_reportados.map(renderizarBugReportado));
    }

  } catch (e) {
    if (Api.ehSessaoExpirada(e)) return;
    if (!silencioso) {
        Api.erro("hs-card-jogo", "Falha ao carregar.");
        Api.erro("hs-chart", "");
        Api.erro("hs-timeline", "");
        Api.erro("hs-bugs-reportados", "");
    }
    console.error("Erro em historicos.js:", e);
  }
}

function iniciarPolling() {
  const selector = document.getElementById("hs-jogo-selector");
  const periodo = document.getElementById("hs-periodo");
  
  const refetch = (silencioso = false) => {
     if(!silencioso) ultimoId = 0; 
     atualizarTela(selector.value, periodo.value, silencioso);
  };

  selector.addEventListener("change", () => refetch(false));
  periodo.addEventListener("change", () => refetch(false));

  pollingTimer = setInterval(() => refetch(true), 10000);
}

Api.aoCarregar(async () => {
  try {
    const catalogo = await Api.pedir("/api/v1/jogos?por_pagina=100&ordenar_por=nome");
    const sel = document.getElementById("hs-jogo-selector");
    catalogo.itens.forEach(j => {
        sel.append(Api.criar("option", { value: j.slug }, j.nome));
    });
    iniciarPolling();
  } catch (e) {
    if (Api.ehSessaoExpirada(e)) return;
    Api.erro("conteudo", "Não foi possível iniciar a página.");
    console.error(e);
  }
});