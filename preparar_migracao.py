"""Create a fresh migration archive outside the repository, without stopping SQLite."""
import argparse
from contextlib import closing
from datetime import datetime
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile

from backup_daily import run_backup


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, default=Path(os.environ.get('AGENDA_DATA', str(Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'AgendaTelefonica'))))
    args = parser.parse_args()
    data = args.data.resolve()
    if not (data / 'agenda.sqlite3').is_file():
        raise FileNotFoundError('Banco de origem não encontrado.')
    destination = data / 'migracao'
    destination.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='number-one-migracao-') as temp:
        staging = Path(temp)
        with closing(sqlite3.connect(data / 'agenda.sqlite3')) as src, closing(sqlite3.connect(staging / 'agenda.sqlite3')) as dst:
            src.backup(dst)
        for ext in ('png', 'jpg', 'webp'):
            image = data / ('class-map.' + ext)
            if image.is_file():
                shutil.copyfile(image, staging / image.name)
        archive = run_backup(staging)
        output = destination / ('hub-migracao-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f') + '.zip')
        shutil.copyfile(archive, output)
    print(output)


if __name__ == '__main__':
    main()
