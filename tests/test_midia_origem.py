from app.services.midia_catalogo import extras_do_slug, para_origem


def test_imagens_do_youtube_nao_passam_pelo_proxy():
    extras = extras_do_slug("cyberpunk-2077")
    assert extras["trailer"]["embed"].startswith("https://www.youtube.com/embed/")
    assert extras["imagens"][0]["src"].startswith("https://i.ytimg.com/")


def test_youtube_nao_e_proxied():
    extras = extras_do_slug("palworld")
    assert extras["trailer"]["embed"].startswith("https://www.youtube.com/embed/")


def test_para_origem_ignora_caminho_local():
    assert para_origem("/media/capa.jpg") == "/media/capa.jpg"
    assert para_origem("") == ""


def test_origem_recusa_host_alheio(cliente):
    assert cliente.get("/media/origem?u=https://evil.example/x.jpg").status_code == 400
    assert cliente.get("/media/origem?u=http://cdn.akamai.steamstatic.com/x").status_code == 400


def test_origem_repassa_arquivo_permitido(cliente, monkeypatch):
    class Fake:
        status = 200
        headers = {"Content-Type": "image/jpeg", "Content-Length": "4"}

        def read(self, n=-1):
            if getattr(self, "_done", False):
                return b""
            self._done = True
            return b"JPEG"

        def close(self):
            return None

    def fake_urlopen(pedido, timeout=25):
        assert "steamstatic.com" in pedido.full_url
        return Fake()

    monkeypatch.setattr("app.controllers.paginas_controller.urlopen", fake_urlopen)
    resposta = cliente.get(
        "/media/origem?u=https://cdn.akamai.steamstatic.com/steam/apps/1/x.jpg"
    )
    assert resposta.status_code == 200
    assert resposta.data == b"JPEG"
