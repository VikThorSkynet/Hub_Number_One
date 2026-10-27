"""Daily SQLite snapshot and optional Google Drive desktop synchronization."""
import argparse
from datetime import date
import json
import logging
import os
from pathlib import Path
import re
import shutil
import sqlite3
from contextlib import closing
import tempfile
import zipfile

ARCHIVE = re.compile(r'^number-one-diario-\d{4}-\d{2}-\d{2}\.zip$')
KEEP = 30


def prune(folder):
    archives = sorted((p for p in folder.iterdir() if p.is_file() and ARCHIVE.fullmatch(p.name)), key=lambda p: p.name, reverse=True)
    for old in archives[KEEP:]:
        old.unlink()


def run_backup(data, drive=None, today=None):
    data = Path(data).resolve()
    if str(data).startswith('\\\\'):
        raise ValueError('A pasta do banco precisa estar no disco local do servidor.')
    source = data / 'agenda.sqlite3'
    if not source.is_file():
        raise FileNotFoundError('Banco não encontrado; confira AGENDA_DATA e a conta do servidor.')
    local = data / 'backups-diarios'
    local.mkdir(exist_ok=True)
    name = f'number-one-diario-{today or date.today().isoformat()}.zip'
    target = local / name
    if not target.exists():
        with tempfile.TemporaryDirectory(prefix='number-one-backup-') as temp:
            snapshot = Path(temp) / 'agenda.sqlite3'
            # The SQLite backup API safely snapshots the database while the hub is running.
            with closing(sqlite3.connect(source)) as src, closing(sqlite3.connect(snapshot)) as dst:
                src.backup(dst)
                if dst.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise RuntimeError('A verificação do banco falhou; backup anterior preservado.')
            staging = local / (name + '.tmp')
            try:
                with zipfile.ZipFile(staging, 'w', zipfile.ZIP_DEFLATED) as archive:
                    archive.write(snapshot, 'agenda.sqlite3')
                    for ext in ('png', 'jpg', 'webp'):
                        image = data / ('class-map.' + ext)
                        if image.is_file():
                            archive.write(image, image.name)
                    archive.writestr('RESTAURAR.txt', 'Pare o servidor. Extraia agenda.sqlite3 e class-map.* para a pasta local de dados configurada em AGENDA_DATA. Preserve uma cópia dos dados atuais antes de substituir. Reinicie o servidor.\n')
                with zipfile.ZipFile(staging) as archive:
                    if archive.testzip():
                        raise RuntimeError('O arquivo de backup está danificado.')
                staging.replace(target)
            finally:
                staging.unlink(missing_ok=True)
    prune(local)
    if drive:
        destination = Path(drive)
        # Never create a disconnected drive root and accidentally report cloud success.
        if not destination.is_dir():
            raise FileNotFoundError('Pasta do Google Drive indisponível. O backup local foi preservado.')
        if destination.resolve() == local.resolve():
            raise ValueError('Escolha uma pasta diferente da pasta de backups locais.')
        for archive in sorted(local.glob('number-one-diario-*.zip')):
            if not ARCHIVE.fullmatch(archive.name):
                continue
            copied = destination / archive.name
            if copied.exists() and copied.stat().st_size == archive.stat().st_size:
                continue
            staging = destination / (archive.name + '.tmp')
            try:
                shutil.copyfile(archive, staging)
                with zipfile.ZipFile(staging) as check:
                    if check.testzip():
                        raise RuntimeError('Falha na cópia para a pasta sincronizada.')
                staging.replace(copied)
            finally:
                staging.unlink(missing_ok=True)
        prune(destination)
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, default=Path(os.environ.get('AGENDA_DATA', str(Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'AgendaTelefonica'))))
    parser.add_argument('--drive-folder', type=Path)
    parser.add_argument('--local-only', action='store_true')
    args = parser.parse_args()
    args.data.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=args.data / 'backup-diario.log', level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    config_path = args.data / 'backup-config.json'
    try:
        config = json.loads(config_path.read_text(encoding='utf-8-sig')) if config_path.exists() else {}
        drive = None if args.local_only else (args.drive_folder or config.get('drive_folder'))
        result = run_backup(args.data, drive)
        logging.info('Backup local pronto: %s. Destino sincronizado: %s', result, drive or 'não configurado')
        print(f'Backup local pronto: {result}')
        print('Cópia na pasta sincronizada pronta; o envio depende do Google Drive para computador.' if drive else 'Backup local; Google Drive não usado nesta execução.')
    except Exception:
        logging.exception('Falha no backup diário')
        raise


if __name__ == '__main__':
    main()
