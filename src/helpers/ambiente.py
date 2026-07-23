import os
from pathlib import Path


def carregar_variavel(nome, valor_padrao=None, obrigatoria=False):
    """Lê uma variável de ambiente com suporte a valor padrão e obrigatoriedade."""
    valor = os.getenv(nome, valor_padrao)

    if obrigatoria and (valor is None or str(valor).strip() == ''):
        raise ValueError(f'A variável de ambiente {nome} é obrigatória')

    return valor


def bool_ambiente(nome, valor_padrao=False):
    """Converte uma variável de ambiente para valor booleano."""
    valor = os.getenv(nome)
    if valor is None:
        return valor_padrao
    return valor.strip().lower() in {'1', 'true', 'yes', 'on'}


def caminho_base():
    """Retorna o diretório base do projeto."""
    return Path(__file__).resolve().parent.parent.parent
