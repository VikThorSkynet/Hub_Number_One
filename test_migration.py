from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest
import zipfile

from backup_daily import run_backup
from restaurar_migracao import restore


class MigrationTests(unittest.TestCase):
    def test_restore_and_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'source'
            target = Path(folder) / 'target'
            source.mkdir()
            with closing(sqlite3.connect(source / 'agenda.sqlite3')) as db:
                db.execute('CREATE TABLE contacts (name TEXT)')
                db.execute('CREATE TABLE hub_events (title TEXT)')
                db.execute("INSERT INTO hub_events VALUES ('Evento ficticio')")
                db.commit()
            (source / 'class-map.png').write_bytes(b'fictional image')
            archive = run_backup(source)
            restore(archive, target)
            with closing(sqlite3.connect(target / 'agenda.sqlite3')) as db:
                self.assertEqual(db.execute('SELECT title FROM hub_events').fetchone()[0], 'Evento ficticio')
            self.assertEqual((target / 'class-map.png').read_bytes(), b'fictional image')
            with self.assertRaises(FileExistsError):
                restore(archive, target)

    def test_reject_unexpected_paths_and_invalid_database(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for files in ({'agenda.sqlite3': b'bad'}, {'agenda.sqlite3': b'bad', '../escape.txt': b'bad'}):
                archive = root / 'bad.zip'
                with zipfile.ZipFile(archive, 'w') as z:
                    for name, content in files.items():
                        z.writestr(name, content)
                with self.assertRaises((ValueError, sqlite3.DatabaseError)):
                    restore(archive, root / 'target')
                self.assertFalse((root / 'target' / 'agenda.sqlite3').exists())
                self.assertFalse((root / 'escape.txt').exists())
