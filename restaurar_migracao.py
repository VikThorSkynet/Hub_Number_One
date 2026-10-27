import sys
from pathlib import Path
from contextlib import closing
import shutil
import sqlite3
import zipfile


def restore(archive, data):
    data = Path(data)
    if (data / 'agenda.sqlite3').exists():
        raise FileExistsError('O destino já possui banco; nenhum registro foi substituído.')
    allowed = {'agenda.sqlite3', 'class-map.png', 'class-map.jpg', 'class-map.webp', 'RESTAURAR.txt'}
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or 'agenda.sqlite3' not in names or set(names) - allowed or sum(i.file_size for i in z.infolist()) > 1024**3 or z.testzip():
            raise ValueError('Pacote de migração inválido.')
        data.mkdir(parents=True, exist_ok=True)
        temporary = data / 'migracao-validar.sqlite3'
        try:
            with z.open('agenda.sqlite3') as src, temporary.open('wb') as dst:
                shutil.copyfileobj(src, dst)
            with closing(sqlite3.connect(temporary)) as c:
                if c.execute('pragma integrity_check').fetchone()[0] != 'ok':
                    raise ValueError('Banco danificado.')
                tables = {r[0] for r in c.execute("select name from sqlite_master where type='table'")}
                if not {'contacts', 'hub_events'}.issubset(tables):
                    raise ValueError('Banco não reconhecido.')
            for name in names:
                if name.startswith('class-map.'):
                    with z.open(name) as src, (data / name).open('wb') as dst:
                        shutil.copyfileobj(src, dst)
            temporary.replace(data / 'agenda.sqlite3')
        finally:
            temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    restore(sys.argv[1], sys.argv[2])
