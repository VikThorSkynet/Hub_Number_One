from datetime import date, timedelta
from pathlib import Path
import sqlite3
from contextlib import closing
import tempfile
import unittest
import zipfile

from backup_daily import run_backup


class DailyBackupTests(unittest.TestCase):
    def test_snapshot_daily_retention_and_mirror(self):
        with tempfile.TemporaryDirectory() as temp:
            data = Path(temp) / 'data'
            drive = Path(temp) / 'drive'
            data.mkdir(); drive.mkdir()
            with closing(sqlite3.connect(data / 'agenda.sqlite3')) as db:
                db.execute('CREATE TABLE example (value TEXT)')
                db.execute('INSERT INTO example VALUES (?)', ('Dado fictício',))
                db.commit()
            (data / 'class-map.png').write_bytes(b'example image')
            (drive / 'outro-arquivo.txt').write_text('Preservar')
            for offset in range(33):
                day = (date(2026, 1, 1) + timedelta(days=offset)).isoformat()
                last = run_backup(data, drive, day)
            self.assertEqual(len(list((data / 'backups-diarios').glob('*.zip'))), 30)
            self.assertEqual(len(list(drive.glob('*.zip'))), 30)
            self.assertTrue((drive / 'outro-arquivo.txt').exists())
            self.assertFalse((drive / 'number-one-diario-2026-01-01.zip').exists())
            before = last.read_bytes()
            self.assertEqual(run_backup(data, drive, '2026-02-02').read_bytes(), before)
            with zipfile.ZipFile(last) as archive:
                self.assertIsNone(archive.testzip())
                self.assertIn('class-map.png', archive.namelist())
                archive.extract('agenda.sqlite3', Path(temp) / 'restore')
            with closing(sqlite3.connect(Path(temp) / 'restore' / 'agenda.sqlite3')) as restored:
                self.assertEqual(restored.execute('SELECT value FROM example').fetchone()[0], 'Dado fictício')

    def test_offline_drive_keeps_local_and_missing_db_not_created(self):
        with tempfile.TemporaryDirectory() as temp:
            data = Path(temp)
            with self.assertRaises(FileNotFoundError):
                run_backup(data)
            self.assertFalse((data / 'agenda.sqlite3').exists())
            with closing(sqlite3.connect(data / 'agenda.sqlite3')) as db:
                db.execute('CREATE TABLE example (value TEXT)')
            with self.assertRaises(FileNotFoundError):
                run_backup(data, data / 'not-mounted', '2026-01-01')
            self.assertTrue((data / 'backups-diarios' / 'number-one-diario-2026-01-01.zip').exists())
            drive = data / 'mounted'
            drive.mkdir()
            run_backup(data, drive, '2026-01-02')
            self.assertEqual(len(list(drive.glob('*.zip'))), 2)


if __name__ == '__main__':
    unittest.main()
