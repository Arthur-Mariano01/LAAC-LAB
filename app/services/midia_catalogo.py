"""Mídia extra da tela de detalhe (galeria, trailer, requisitos).

Não passa pelo banco: o seed do catálogo não guarda screenshots nem
trailer. O JSON em `dados/midia_jogos.json` completa o que a tela da
loja precisa, indexado pelo slug do jogo.
"""
import json
from pathlib import Path

_ARQUIVO = Path(__file__).resolve().parents[2] / "dados" / "midia_jogos.json"
_cache = None

REQUISITOS_VAZIOS = {"minimo": [], "recomendado": []}


def _catalogo() -> dict:
    global _cache
    if _cache is None:
        if _ARQUIVO.exists():
            _cache = json.loads(_ARQUIVO.read_text(encoding="utf-8"))
        else:
            _cache = {}
    return _cache


def extras_do_slug(slug: str) -> dict:
    bruto = _catalogo().get(slug or "") or {}
    requisitos = bruto.get("requisitos") or {}
    return {
        "legenda": bruto.get("legenda") or "",
        "historia": bruto.get("historia") or "",
        "tempo_medio": bruto.get("tempo_medio") or "",
        "tags": list(bruto.get("tags") or []),
        "trailer": bruto.get("trailer") or None,
        "imagens": list(bruto.get("imagens") or []),
        "requisitos": {
            "minimo": list(requisitos.get("minimo") or []),
            "recomendado": list(requisitos.get("recomendado") or []),
        },
    }
