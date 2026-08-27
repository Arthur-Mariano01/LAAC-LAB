from app.services.midia_catalogo import extras_do_slug


def test_palworld_traz_trailer_imagens_historia_e_requisitos():
    extras = extras_do_slug("palworld")
    assert extras["legenda"]
    assert "Pals" in extras["historia"]
    assert extras["tempo_medio"] == "40h"
    assert extras["trailer"]["embed"].startswith("https://www.youtube.com/embed/")
    assert len(extras["imagens"]) >= 4
    assert extras["requisitos"]["minimo"]
    assert extras["requisitos"]["recomendado"]
    assert "Mundo aberto" in extras["tags"]


def test_slug_desconhecido_nao_quebra():
    extras = extras_do_slug("jogo-que-nao-existe")
    assert extras["imagens"] == []
    assert extras["trailer"] is None
    assert extras["requisitos"]["minimo"] == []
    assert extras["tags"] == []
