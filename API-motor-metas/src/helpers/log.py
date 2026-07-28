import logging
from pathlib import Path

from src.helpers.ambiente import caminho_base


caminho_log = Path(caminho_base()) / 'log' / 'api.log'
caminho_log.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(caminho_log, encoding='utf-8'),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger('api_motor_metas')


def registrar_log(mensagem, nivel='info'):
    """Registra uma mensagem de log em arquivo e console."""
    nivel_upper = nivel.upper()
    if nivel_upper == 'DEBUG':
        logger.debug(mensagem)
    elif nivel_upper == 'WARNING':
        logger.warning(mensagem)
    elif nivel_upper == 'ERROR':
        logger.error(mensagem)
    else:
        logger.info(mensagem)
