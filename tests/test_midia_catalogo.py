import json
from pathlib import Path

from app.services.jogo_service import gerar_slug
from app.services.midia_catalogo import extras_do_slug

RAIZ = Path(__file__).resolve().parents[1]


def test_palworld_traz_trailer_imagens_historia_e_requisitos():
    extras = extras_do_slug("palworld")
    assert extras["legenda"]
    assert "Pals" in extras["historia"]
    assert extras["tempo_medio"] == "40h"
    trailer = extras["trailer"] or {}
    assert trailer.get("embed") or trailer.get("mp4") or trailer.get("hls")
    assert len(extras["imagens"]) >= 4
    assert extras["requisitos"]["minimo"]
    assert extras["requisitos"]["recomendado"]


def test_slug_desconhecido_nao_quebra():
    extras = extras_do_slug("jogo-que-nao-existe")
    assert extras["imagens"] == []
    assert extras["trailer"] is None
    assert extras["requisitos"]["minimo"] == []
    assert extras["tags"] == []


def test_todo_jogo_do_explorar_tem_trailer_e_fotos():
    jogos = json.loads((RAIZ / "dados" / "jogos_steam.json").read_text(encoding="utf-8"))
    for jogo in jogos:
        slug = jogo.get("slug") or gerar_slug(jogo["name"])
        extras = extras_do_slug(slug)
        trailer = extras["trailer"] or {}
        assert extras["imagens"], f"{slug} sem fotos"
        assert trailer.get("embed") or trailer.get("mp4") or trailer.get("hls"), (
            f"{slug} sem trailer"
        )
