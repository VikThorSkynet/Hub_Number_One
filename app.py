import csv
import io
import json
import os
import re
import sqlite3
import unicodedata
from pathlib import Path
from datetime import datetime
from urllib.parse import urlsplit
from flask import Flask, request, jsonify, send_from_directory, abort
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('AGENDA_DATA', str(Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'AgendaTelefonica')))
if str(DATA).startswith('\\\\'):
    raise RuntimeError('AGENDA_DATA deve ser uma pasta local do servidor, não uma pasta de rede.')
DATA.mkdir(parents=True, exist_ok=True)
app = Flask(__name__, static_folder='static')
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', str(s or '').lower()) if not unicodedata.combining(c))

def phone(value):
    raw = str(value).strip()
    digits = re.sub(r'\D', '', raw)
    national = digits
    if national.startswith('0055'):
        national = national[4:]
    elif national.startswith('55') and (raw.startswith('+') or len(national) >= 12):
        national = national[2:]
    if national.startswith('0') and len(national) in (11, 12):
        national = national[1:]
    local = national[2:] if len(national) in (10, 11) else national
    reason = 'Menos de 9 dígitos sem DDD e país' if len(local) < 9 else ''
    if len(national) > 11 or (raw.startswith('+') and not digits.startswith('55')):
        reason = 'Formato internacional ou comprimento não reconhecido; revisar'
    return dict(value=raw, digits=digits, national=national, local=local, issue=reason)

class Connection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()

def db():
    con = sqlite3.connect(DATA / 'agenda.sqlite3', timeout=30, factory=Connection)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    return con

def init():
    with db() as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript('''
        CREATE TABLE IF NOT EXISTS contacts(id INTEGER PRIMARY KEY, data TEXT NOT NULL, search TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS records(source TEXT NOT NULL, identity TEXT NOT NULL, contact_id INTEGER NOT NULL REFERENCES contacts(id), PRIMARY KEY(source,identity));
        CREATE TABLE IF NOT EXISTS imports(id INTEGER PRIMARY KEY, source TEXT, filename TEXT, created TEXT, added INTEGER, updated INTEGER, skipped INTEGER);
        CREATE TABLE IF NOT EXISTS hub_links(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '');
        CREATE TABLE IF NOT EXISTS hub_notices(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, color TEXT NOT NULL, seconds INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
        ''')

def prepare(d):
    out = {k: str(d.get(k, '') or '').strip() for k in ('name','company','title','department','notes','emails')}
    values = d.get('phones', [])
    if isinstance(values, str): values = re.split(r'[;\n]', values)
    out['phones'] = list(dict.fromkeys(str(x).strip() for x in values if str(x).strip()))
    out['sources'] = d.get('sources', [])
    out['manual'] = bool(d.get('manual', False))
    if not out['name']: out['name'] = next(iter(out['phones']), '') or out['emails']
    return out

def save(c, d, cid=None):
    search = norm(' '.join(str(v) for v in d.values())) + ' ' + ' '.join(phone(p)['digits']+' '+phone(p)['national'] for p in d['phones'])
    if cid:
        c.execute('UPDATE contacts SET data=?,search=?,revision=revision+1 WHERE id=?', (json.dumps(d,ensure_ascii=False),search,cid))
    else:
        cid = c.execute('INSERT INTO contacts(data,search) VALUES(?,?)',(json.dumps(d,ensure_ascii=False),search)).lastrowid
    return cid

def parse_file(content, filename):
    if filename.lower().endswith('.xlsx'):
        wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        rows = list(wb.active.values)
        wb.close()
        if not rows: raise ValueError('Planilha vazia.')
        headers = [str(v or '').strip() for v in rows[0]]
        raw = [dict(zip(headers, [str(v) if v is not None else '' for v in row])) for row in rows[1:]]
    elif filename.lower().endswith('.csv'):
        try: text = content.decode('utf-8-sig')
        except UnicodeDecodeError: text = content.decode('cp1252')
        try: dialect = csv.Sniffer().sniff(text[:10000], delimiters=',;\t')
        except csv.Error: dialect = csv.excel
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        headers = reader.fieldnames or []
        raw = list(reader)
    else: raise ValueError('Use um arquivo CSV ou XLSX.')
    normalized = [norm(h) for h in headers]
    if not any(h in ('name','nome','first name','given name','telefone','celular') or re.match(r'phone \d+ - value',h) for h in normalized):
        raise ValueError('Cabeçalhos não reconhecidos. Use exportação Google CSV ou colunas Nome, Telefone, E-mail, Empresa, Cargo, Setor e Observações.')
    result = []
    for row in raw:
        r = {norm(k).strip(): str(v or '').strip() for k,v in row.items() if k}
        def get(*keys): return next((r[k] for k in keys if r.get(k)), '')
        name = get('name','nome') or ' '.join(filter(None,[get('first name','given name'),get('middle name','additional name'),get('last name','family name')]))
        phones = []
        for k,v in r.items():
            if re.match(r'phone \d+ - value$', k) or k in ('telefone','telefones','celular','ramal'):
                phones.extend(re.split(r'\s*:::?\s*|[;\n]', v))
        emails = '; '.join(v for k,v in r.items() if re.match(r'e-mail \d+ - value$',k) or k in ('email','e-mail'))
        d = prepare(dict(name=name,phones=phones,emails=emails,company=get('organization name','organization 1 - name','empresa'),title=get('organization title','organization 1 - title','cargo'),department=get('organization department','organization 1 - department','setor','departamento'),notes=get('notes','observacoes','observacao')))
        if d['name']: result.append(d)
    if not result: raise ValueError('Nenhum contato encontrado.')
    return result

def identity(d):
    return norm(d['name']) + '|' + '|'.join(sorted(phone(p)['national'] for p in d['phones'])) + '|' + norm(d['emails'])

def import_contacts(rows, source, filename):
    added = updated = skipped = 0
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        existing = [(r['id'],json.loads(r['data'])) for r in c.execute('SELECT * FROM contacts')]
        by_id = dict(existing)
        index = {}
        for cid,d in existing:
            index.setdefault(norm(d['name']), []).append(cid)
        for d in rows:
            key = identity(d)
            match = c.execute('SELECT contact_id FROM records WHERE source=? AND identity=?',(source,key)).fetchone()
            cid = match[0] if match else None
            if not cid:
                candidates=[]
                for candidate in index.get(norm(d['name']), []):
                    old=by_id[candidate]
                    shared = {phone(p)['national'] for p in old['phones']} & {phone(p)['national'] for p in d['phones']}
                    email_shared = set(norm(old['emails']).split('; ')) & set(norm(d['emails']).split('; ')) - {''}
                    if shared or email_shared: candidates.append(candidate)
                if len(candidates)==1: cid=candidates[0]
            if cid:
                old=by_id[cid]
                merged=dict(old)
                merged['sources']=list(dict.fromkeys(old['sources']+[source]))
                if not old['manual']:
                    for k in ('name','company','title','department','notes'):
                        if d[k]: merged[k]=d[k]
                    merged['phones']=list(dict.fromkeys(old['phones']+d['phones']))
                    merged['emails']='; '.join(dict.fromkeys(filter(None,old['emails'].split('; ')+d['emails'].split('; '))))
                if merged != old: save(c,merged,cid); updated+=1
                else: skipped+=1
                by_id[cid]=merged
            else:
                d['sources']=[source]
                cid=save(c,d)
                by_id[cid]=d
                index.setdefault(norm(d['name']),[]).append(cid)
                added+=1
            c.execute('INSERT OR IGNORE INTO records VALUES(?,?,?)',(source,key,cid))
        c.execute('INSERT INTO imports(source,filename,created,added,updated,skipped) VALUES(?,?,?,?,?,?)',(source,filename,datetime.now().isoformat(timespec='seconds'),added,updated,skipped))
    return dict(added=added,updated=updated,skipped=skipped,total=len(rows))

@app.before_request
def same_origin():
    if request.method in ('POST','PUT','DELETE'):
        origin=request.headers.get('Origin')
        if origin and origin != request.host_url.rstrip('/'): abort(403)

@app.get('/')
def home(): return send_from_directory(app.static_folder,'hub.html')

@app.get('/lista-telefonica')
def directory(): return send_from_directory(app.static_folder,'index.html')

@app.get('/calculadora')
def calculator(): return send_from_directory(app.static_folder,'calculadora.html')

@app.get('/links')
def links_page(): return send_from_directory(app.static_folder,'links.html')

@app.get('/api/links')
def list_links():
    with db() as c:
        return jsonify([dict(r) for r in c.execute('SELECT * FROM hub_links ORDER BY title COLLATE NOCASE, id')])

@app.get('/avisos')
def notices_page(): return send_from_directory(app.static_folder,'avisos.html')

@app.get('/api/notices')
def list_notices():
    with db() as c:
        return jsonify([dict(r) for r in c.execute('SELECT * FROM hub_notices ORDER BY id')])

@app.route('/api/notices', methods=['POST'])
@app.route('/api/notices/<int:nid>', methods=['PUT'])
def save_notice(nid=None):
    data = request.get_json(silent=True)
    if not isinstance(data,dict): return jsonify(error='Dados inválidos.'),400
    title, body, color, seconds = [data.get(k) for k in ('title','body','color','seconds')]
    if (not isinstance(title,str) or not title.strip() or len(title)>100 or
        not isinstance(body,str) or len(body)>600 or color not in ('purple','blue','coral','yellow') or
        type(seconds) is not int or not 5<=seconds<=60):
        return jsonify(error='Informe título (até 100 caracteres), texto (até 600), uma cor da paleta e tempo de 5 a 60 segundos.'),400
    with db() as c:
        if nid is None:
            nid=c.execute('INSERT INTO hub_notices(title,body,color,seconds) VALUES(?,?,?,?)',(title.strip(),body.strip(),color,seconds)).lastrowid
        else:
            row=c.execute('SELECT revision FROM hub_notices WHERE id=?',(nid,)).fetchone()
            if not row: return jsonify(error='Aviso não encontrado. Atualize a página.'),404
            if data.get('revision')!=row['revision']: return jsonify(error='Este aviso foi alterado por outra pessoa. Atualize a página antes de editar.'),409
            changed=c.execute('UPDATE hub_notices SET title=?,body=?,color=?,seconds=?,revision=revision+1 WHERE id=? AND revision=?',(title.strip(),body.strip(),color,seconds,nid,data['revision'])).rowcount
            if not changed: return jsonify(error='Este aviso foi alterado por outra pessoa. Atualize a página.'),409
    return jsonify(id=nid),201 if request.method=='POST' else 200

@app.delete('/api/notices/<int:nid>')
def delete_notice(nid):
    with db() as c:
        if not c.execute('DELETE FROM hub_notices WHERE id=?',(nid,)).rowcount:
            return jsonify(error='Aviso não encontrado.'),404
    return jsonify(ok=True)

@app.post('/api/links')
def add_link():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict): return jsonify(error='Dados inválidos.'),400
    fields = [payload.get(k, '') for k in ('title', 'url', 'description')]
    if not all(isinstance(v, str) for v in fields): return jsonify(error='Dados inválidos.'),400
    title, url, description = [v.strip() for v in fields]
    try:
        parsed = urlsplit(url)
        valid = parsed.scheme in ('https', 'http') and bool(parsed.hostname) and not parsed.username and not any(ch.isspace() for ch in url)
    except ValueError:
        valid = False
    if not title or len(title)>120 or len(description)>500 or len(url)>2048 or not valid:
        return jsonify(error='Informe uma legenda (até 120 caracteres) e um endereço http:// ou https:// válido.'),400
    with db() as c:
        lid = c.execute('INSERT INTO hub_links(title,url,description) VALUES(?,?,?)', (title,url,description)).lastrowid
    return jsonify(id=lid),201

@app.delete('/api/links/<int:lid>')
def delete_link(lid):
    with db() as c:
        if not c.execute('DELETE FROM hub_links WHERE id=?', (lid,)).rowcount:
            return jsonify(error='Este link já foi excluído. Atualize a página.'),404
    return jsonify(ok=True)

@app.get('/api/contacts')
def contacts():
    tokens=norm(request.args.get('q','')).split()
    with db() as c: rows=c.execute('SELECT * FROM contacts').fetchall()
    result=[]
    for row in rows:
        if not all(t in row['search'] for t in tokens): continue
        d=json.loads(row['data']); d.update(id=row['id'],revision=row['revision'])
        d['checks']=[phone(p) for p in d['phones']]
        if request.args.get('issues')=='1' and not any(p['issue'] for p in d['checks']): continue
        result.append(d)
    result.sort(key=lambda d:(not norm(d['name']).startswith(norm(request.args.get('q',''))),norm(d['name'])))
    return jsonify(result)

@app.post('/api/contacts')
def create():
    d=prepare(request.get_json()); d['manual']=True; d['sources']=['Cadastro manual']
    if not d['name']: return jsonify(error='Informe nome ou telefone.'),400
    with db() as c: cid=save(c,d)
    return jsonify(id=cid)

@app.put('/api/contacts/<int:cid>')
def edit(cid):
    payload=request.get_json(); d=prepare(payload)
    if not d['name']: return jsonify(error='Informe nome ou telefone.'),400
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        row=c.execute('SELECT * FROM contacts WHERE id=?',(cid,)).fetchone()
        if not row: abort(404)
        if payload.get('revision') != row['revision']: return jsonify(error='Outro usuário alterou este contato. Feche e abra novamente antes de salvar.'),409
        d['sources']=json.loads(row['data'])['sources']; d['manual']=True
        save(c,d,cid)
    return jsonify(ok=True)

@app.post('/api/import')
def upload():
    file=request.files.get('file'); source=request.form.get('source','').strip()
    if not file or not source: return jsonify(error='Selecione o arquivo e informe a origem.'),400
    try:
        rows=parse_file(file.read(),file.filename)
        if request.form.get('preview')=='1':
            return jsonify(total=len(rows),issues=sum(any(phone(p)['issue'] for p in d['phones']) for d in rows),sample=rows[:5])
        return jsonify(import_contacts(rows,source,file.filename))
    except (ValueError,KeyError,csv.Error) as e: return jsonify(error=str(e)),400
    except Exception:
        app.logger.exception('Falha de importação')
        return jsonify(error='Não foi possível ler o arquivo. Verifique se é um CSV ou XLSX válido e não protegido.'),400

@app.get('/api/imports')
def history():
    with db() as c: return jsonify([dict(r) for r in c.execute('SELECT * FROM imports ORDER BY id DESC LIMIT 100')])

@app.get('/api/export')
def export():
    output=io.StringIO(); writer=csv.writer(output,delimiter=';')
    writer.writerow(['Nome','Telefones','E-mail','Empresa','Cargo','Setor','Observações'])
    with db() as c:
        for row in c.execute('SELECT data FROM contacts'):
            d=json.loads(row[0]); values=[d['name'],'; '.join(d['phones']),d['emails'],d['company'],d['title'],d['department'],d['notes']]
            writer.writerow(["'"+v if v.startswith(('=','+','-','@')) else v for v in values])
    return app.response_class('\ufeff'+output.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename=agenda.csv'})

@app.post('/api/backup')
def backup():
    folder=ROOT/'backups'; folder.mkdir(exist_ok=True)
    target=folder/('agenda-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.sqlite3')
    with db() as src, sqlite3.connect(target) as dest: src.backup(dest)
    return jsonify(message='Backup salvo na pasta backups do projeto.')

init()
if __name__=='__main__':
    from waitress import serve
    port=int(os.environ.get('AGENDA_PORT','4050'))
    print(f'Agenda disponível em http://localhost:{port} | Banco: {DATA}',flush=True)
    serve(app,host='0.0.0.0',port=port,threads=6)
