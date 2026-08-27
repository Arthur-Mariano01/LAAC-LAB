/* Comportamento da casca: tema, item ativo, avatar e card de nível.

   O markup da casca é copiado em cada página; só o comportamento é
   compartilhado. O item ativo vem de <body data-tela="..."> e não do
   HTML, para que as cópias possam ser byte a byte idênticas. */

function aplicarTema() {
  const raiz = document.documentElement;
  if (localStorage.getItem("tema") === "claro") raiz.classList.add("light");
  const botao = document.getElementById("alternar-tema");
  if (!botao) return;
  botao.addEventListener("click", () => {
    raiz.classList.toggle("light");
    localStorage.setItem("tema", raiz.classList.contains("light") ? "claro" : "escuro");
  });
}

function marcarItemAtivo() {
  const tela = document.body.dataset.tela;
  if (!tela) return;
  const item = document.querySelector(`.nav-item[data-tela="${tela}"]`);
  if (item) item.classList.add("is-active");
}

async function preencherUsuario() {
  const eu = await Api.pedir("/api/v1/eu");
  const nome = document.getElementById("sb-nome");
  if (nome) nome.textContent = eu.apelido || eu.nome_usuario;
  const nivel = document.getElementById("sb-nivel");
  if (nivel) nivel.textContent = "Nível " + eu.nivel;
  const xp = document.getElementById("sb-xp");
  if (xp) xp.textContent = `${eu.xp} / ${eu.xp_max} XP`;
  const barra = document.getElementById("sb-xp-barra");
  if (barra && eu.xp_max) {
    barra.style.width = Math.round((eu.xp / eu.xp_max) * 100) + "%";
  }
  document.querySelectorAll(".js-avatar").forEach((a) => {
    a.textContent = Api.iniciaisDe(eu.nome_usuario);
    a.style.background = eu.cor_avatar;
  });
}

function irParaResultadosDaBusca(texto) {
  const q = (texto || "").trim();
  if (!q) return;
  const destino = "/explorar?busca=" + encodeURIComponent(q);
  if (document.body.dataset.tela === "explorar") {
    const campoPagina = document.getElementById("ex-busca");
    if (campoPagina) {
      campoPagina.value = q;
      history.replaceState(null, "", destino);
      campoPagina.dispatchEvent(new Event("input"));
    } else {
      location.href = destino;
    }
    return;
  }
  location.href = destino;
}

function fecharSugestoes(painel) {
  if (!painel) return;
  painel.hidden = true;
  painel.replaceChildren();
}

function pintarSugestoes(painel, jogos, consulta) {
  if (!jogos.length) {
    painel.hidden = false;
    painel.replaceChildren(
      Api.criar("div", { class: "search-sugestao search-sugestao--vazia" },
        "Nenhum jogo com “" + consulta + "”.")
    );
    return;
  }
  painel.hidden = false;
  painel.replaceChildren(
    ...jogos.map((jogo) =>
      Api.criar(
        "a",
        { class: "search-sugestao", href: "/jogo/" + jogo.slug, role: "option" },
        Api.criar("span", { class: "search-sugestao-nome" }, jogo.nome),
        Api.criar("span", { class: "search-sugestao-ir" }, "Abrir vitrine")
      )
    )
  );
}

function ligarBuscaDoTopo() {
  const campo = document.getElementById("casca-busca");
  const painel = document.getElementById("casca-busca-sugestoes");
  if (!campo || !painel) return;

  const inicial = new URLSearchParams(location.search).get("busca");
  if (inicial && !campo.value) campo.value = inicial;

  let temporizador = null;
  let pedido = 0;

  campo.addEventListener("input", () => {
    const texto = campo.value.trim();
    clearTimeout(temporizador);
    if (!texto) {
      fecharSugestoes(painel);
      return;
    }
    temporizador = setTimeout(async () => {
      const sequencia = ++pedido;
      try {
        const dados = await Api.pedir(
          "/api/v1/telas/explorar?busca=" + encodeURIComponent(texto) + "&por_pagina=8"
        );
        if (sequencia !== pedido) return;
        pintarSugestoes(painel, dados.itens || [], texto);
      } catch (erro) {
        if (Api.ehSessaoExpirada(erro)) return;
        if (sequencia !== pedido) return;
        painel.hidden = false;
        painel.replaceChildren(
          Api.criar("div", { class: "search-sugestao search-sugestao--vazia" },
            "Não foi possível buscar agora.")
        );
      }
    }, 280);
  });

  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      fecharSugestoes(painel);
      return;
    }
    if (evento.key === "Enter") {
      evento.preventDefault();
      fecharSugestoes(painel);
      irParaResultadosDaBusca(campo.value);
    }
  });

  document.addEventListener("click", (evento) => {
    if (!evento.target.closest(".search")) fecharSugestoes(painel);
  });
}

Api.aoCarregar(async () => {
  aplicarTema();
  marcarItemAtivo();
  // As telas de autenticação não têm sidebar e não têm token: pedir
  // /api/v1/eu daria 401, que redirecionaria o login para o login.
  if (document.body.dataset.casca === "auth") return;
  ligarBuscaDoTopo();
  await preencherUsuario();
});
