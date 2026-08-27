from pathlib import Path

from test_frontend import _sem_comentarios

RAIZ = Path(__file__).resolve().parents[1]


def test_casca_js_busca_jogos_e_abre_explorar():
    texto = _sem_comentarios((RAIZ / "view/estatico/js/casca.js").read_text(encoding="utf-8"))
    assert "casca-busca" in texto
    assert "/api/v1/telas/explorar?" in texto
    assert "/explorar?busca=" in texto
    assert "/jogo/" in texto


def test_explorar_lê_busca_da_url():
    texto = _sem_comentarios(
        (RAIZ / "view/estatico/js/explorar.js").read_text(encoding="utf-8")
    )
    assert 'location.search).get("busca")' in texto
    assert 'getElementById("ex-busca").value = inicial' in texto


def test_topo_da_casca_tem_o_campo_de_busca(cliente):
    html = cliente.get("/").get_data(as_text=True)
    assert 'id="casca-busca"' in html
    assert 'id="casca-busca-sugestoes"' in html
