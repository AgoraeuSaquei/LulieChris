#!/usr/bin/env python3
"""Validação offline, somente leitura, de Luli & Chris (Python 3.9+)."""
import argparse
import base64
import binascii
import json
import math
import re
import struct
import sys
import zlib
from pathlib import Path

ENEMIES = {'plum','lemon','pepper','pumpkin','bat','vine'}
NPCS = {'guardian','apple','melon','strawberry','guard','healer'}
HEROES = {'luli','chris'}
ACTORS = HEROES | NPCS | {'narrator'}
KINDS = {'ground','platform','enemy','fruit','event','gate','spawn','npc','solid','door','plate','crate','checkpoint'}
RECTS = {'solid','door','plate','crate'}
MODES = {'patrol','chase','jump','fly','stationary'}
TRIGGERS = {'enter','talk','collect','enemyDefeated'}
ACTIONS = {'toast','dialog','heal','checkpoint','gate'}
FRAMES = {'hero': (4,6,4,2,4), 'enemy': (4,4,3,2,3), 'npc': (4,4,3,2,1)}
SHEET_FILES = {**{f'assets/characters/{x}/spritesheet.png':'hero' for x in HEROES}, **{f'assets/enemies/sheets/{x}_sheet.png':'enemy' for x in ENEMIES}, **{f'assets/npcs/sheets/{x}_sheet.png':'npc' for x in NPCS}}
MAX_PNG = 4_000_000

def num(x):
    return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)

def positive(x): return num(x) and x > 0

def integer(x): return num(x) and int(x)==x

def nonempty(x): return isinstance(x,str) and bool(x.strip())

class Report:
    def __init__(self): self.issues=[]; self.sheets=[]; self.levels=[]
    def add(self,severity,code,where,message):
        self.issues.append(dict(severity=severity,code=code,where=where,message=message))
    def error(self,*a): self.add('ERROR',*a)
    def warn(self,*a): self.add('WARN',*a)
    def result(self):
        return dict(summary={s:sum(i['severity']==s for i in self.issues) for s in ('ERROR','WARN')},levels=self.levels,sheets=self.sheets,issues=self.issues)

def load_campaign(path):
    text=path.read_text(encoding='utf-8-sig').strip()
    if path.suffix.lower()=='.js':
        m=re.fullmatch(r'window\.LULI_CAMPAIGN\s*=\s*(\{.*\})\s*;?\s*',text,re.S)
        if not m: raise ValueError('Esperado window.LULI_CAMPAIGN = { JSON };')
        text=m.group(1)
    return json.loads(text,parse_constant=lambda x: (_ for _ in ()).throw(ValueError('Número JSON inválido: '+x)))

def paeth(a,b,c):
    p=a+b-c; pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
    return a if pa<=pb and pa<=pc else b if pb<=pc else c

def png_pixels(data):
    """Decodifica PNG oficial RGBA8 não entrelaçado, com CRC e limite de saída."""
    if len(data)>MAX_PNG or data[:8]!=b'\x89PNG\r\n\x1a\n': raise ValueError('PNG inválido ou acima do limite')
    pos=8; header=None; chunks=[]; ended=False
    while pos+12<=len(data):
        length=struct.unpack_from('>I',data,pos)[0]; end=pos+12+length
        if end>len(data): raise ValueError('Chunk PNG truncado')
        tag=data[pos+4:pos+8]; body=data[pos+8:end-4]
        if binascii.crc32(tag+body)&0xffffffff != struct.unpack_from('>I',data,end-4)[0]: raise ValueError('CRC PNG inválido')
        if pos==8 and tag!=b'IHDR': raise ValueError('IHDR ausente')
        if tag==b'IHDR':
            if header is not None or length!=13: raise ValueError('IHDR inválido')
            header=struct.unpack('>IIBBBBB',body)
        elif tag==b'IDAT': chunks.append(body)
        elif tag==b'IEND':
            if length: raise ValueError('IEND inválido')
            ended=True; pos=end; break
        pos=end
    if not header or not chunks or not ended or pos!=len(data): raise ValueError('Estrutura PNG incompleta')
    w,h,depth,color,comp,flt,interlace=header
    if (w,h)!=(384,320): raise ValueError(f'Dimensão {w}x{h}; esperado 384x320')
    if (depth,color,comp,flt,interlace)!=(8,6,0,0,0): raise ValueError('Exportar como PNG RGBA 8 bits, não entrelaçado')
    stride=w*4; expected=(stride+1)*h
    decoder=zlib.decompressobj(); raw=decoder.decompress(b''.join(chunks),expected+1)
    if len(raw)!=expected or not decoder.eof or decoder.unconsumed_tail or decoder.unused_data: raise ValueError('Dados PNG inconsistentes')
    prev=bytearray(stride); alpha=bytearray(w*h)
    for y in range(h):
        start=y*(stride+1); f=raw[start]; row=bytearray(raw[start+1:start+1+stride])
        if f>4: raise ValueError('Filtro PNG inválido')
        if f:
            for x in range(stride):
                a=row[x-4] if x>=4 else 0; b=prev[x]; c=prev[x-4] if x>=4 else 0
                row[x]=(row[x]+(a if f==1 else b if f==2 else (a+b)//2 if f==3 else paeth(a,b,c)))&255
        alpha[y*w:(y+1)*w]=row[3::4]; prev=row
    return alpha

def inspect_sheet(data,category,where,r):
    try: alpha=png_pixels(data)
    except (ValueError,zlib.error,struct.error) as e: r.error('PNG_FORMAT',where,str(e)); return
    cells=[]; edges=[]; anchors=[]; missing=[]; extras=[]
    for row in range(5):
        line=[]
        for col in range(6):
            coords=[(x,y) for y in range(64) for x in range(64) if alpha[(row*64+y)*384+col*64+x]]
            slot=f'L{row+1}C{col+1}'; line.append(bool(coords))
            expected=category is not None and col<FRAMES[category][row]
            if expected and not coords: missing.append(slot)
            if category is not None and not expected and coords: extras.append(slot)
            if coords:
                xs,ys=zip(*coords); bounds=[min(xs),min(ys),max(xs),max(ys)]
                if bounds[0]==0 or bounds[1]==0 or bounds[2]==63 or bounds[3]==63: edges.append(slot)
                if category=='hero' and row in (0,1,3,4) and expected:
                    anchors.append(dict(slot=slot,bottom=bounds[3],delta=bounds[3]-61))
        cells.append(''.join('1' if c else '0' for c in line))
    zero=alpha.count(0); opaque=alpha.count(255); partial=len(alpha)-zero-opaque
    r.sheets.append(dict(path=where,category=category,dimensions=[384,320],transparent=zero,opaque=opaque,partial=partial,occupied=cells,edge_cells=edges,hero_anchors=anchors))
    if zero==0: r.error('NO_TRANSPARENCY',where,'Nenhum pixel totalmente transparente')
    if zero==len(alpha): r.error('EMPTY_SHEET',where,'Spritesheet completamente vazio')
    if missing: r.error('MISSING_FRAMES',where,'Quadros usados pelo motor vazios: '+', '.join(missing))
    if extras: r.warn('EXTRA_FRAMES',where,'Quadros fora da sequência atual do leitor: '+', '.join(extras))
    if edges: r.warn('CELL_EDGE',where,'Pixels não transparentes nas bordas: '+', '.join(edges))
    if partial and partial/(partial+opaque)>.9: r.warn('ALPHA_SOFT',where,'Mais de 90% dos pixels visíveis têm alfa parcial; revisar sobre fundos reais')
    if any(abs(a['delta'])>6 for a in anchors): r.warn('HERO_ANCHOR',where,'Quadros terrestres distantes da referência y=61; verificar visualmente')

def overlaps(a,b):
    return a['x']<b['x']+b['width'] and a['x']+a['width']>b['x'] and a['y']<b['y']+b['height'] and a['y']+a['height']>b['y']

def rect_ok(e): return all(num(e.get(k)) for k in ('x','y')) and all(positive(e.get(k)) for k in ('width','height'))

def validate_dialogue(lines,where,r):
    if not isinstance(lines,list): r.error('DIALOGUE',where,'Diálogo deve ser uma lista'); return
    for i,line in enumerate(lines,1):
        loc=f'{where}/fala {i}'
        if not isinstance(line,dict): r.error('DIALOGUE',loc,'Fala deve ser objeto'); continue
        actor=line.get('speaker')
        if not isinstance(actor,str) or actor not in ACTORS: r.error('SPEAKER',loc,'Personagem desconhecido')
        if not nonempty(line.get('mood')) or not nonempty(line.get('text')): r.error('DIALOGUE',loc,'Expressão ou texto ausente')

def validate_campaign(c,r):
    if not isinstance(c,dict): r.error('CAMPAIGN','campanha','Objeto esperado'); return
    if c.get('schema')!='luli-map-editor-v1': r.error('SCHEMA','campanha','Schema incompatível com o editor atual')
    if c.get('version')!=4: r.warn('VERSION','campanha','Versão diferente da referência 4; revisar compatibilidade')
    sp=c.get('sprite'); expected={'sheetWidth':384,'sheetHeight':320,'frame':64,'columns':6,'rows':5,'baseline':61}
    if not isinstance(sp,dict) or any(sp.get(k)!=v for k,v in expected.items()): r.error('SPRITE_SCHEMA','campanha','Metadados de sprites incompatíveis')
    assets=c.get('spriteAssets',{}); heroes=c.get('heroSprites',{})
    if not isinstance(assets,dict): r.error('ASSETS','campanha','spriteAssets deve ser objeto'); assets={}
    if not isinstance(heroes,dict): r.error('ASSETS','campanha','heroSprites deve ser objeto'); heroes={}
    categories={k:set() for k in assets}
    def ref(value,category,where):
        if value in ('',None): return
        if not isinstance(value,str) or value not in assets: r.error('SPRITE_REF',where,'Referência a sprite personalizado inexistente'); return
        categories[value].add(category)
    for h in HEROES: ref(heroes.get(h),'hero',h)
    levels=c.get('levels')
    if not isinstance(levels,list) or not levels: r.error('LEVELS','campanha','Lista de fases vazia ou inválida'); return
    if len(levels)!=8: r.warn('LEVEL_COUNT','campanha',f'{len(levels)} fases; referência atual possui 8')
    for ix,l in enumerate(levels,1):
        where=f'Fase {ix}'
        if not isinstance(l,dict): r.error('LEVEL',where,'Objeto esperado'); continue
        where+=' '+str(l.get('name','')); w,h=l.get('width'),l.get('height'); ents=l.get('entities')
        if not integer(w) or not integer(h) or not (480<=w<=32000 and 540<=h<=2160): r.error('LEVEL_SIZE',where,'Dimensões fora dos limites aceitos pelo motor'); continue
        if not nonempty(l.get('name')): r.error('LEVEL_NAME',where,'Nome ausente')
        if not integer(l.get('theme')) or not 0<=l['theme']<=2: r.error('THEME',where,'Tema deve ser 0, 1 ou 2')
        if not isinstance(ents,list): r.error('ENTITIES',where,'entities deve ser lista'); continue
        counts={}; ids=set(); plates=set(); doors=[]; crates=[]; solids=[]; gates=[]; bosses=[]
        for i,e in enumerate(ents,1):
            loc=f'{where}/entidade {i}'
            if not isinstance(e,dict): r.error('ENTITY',loc,'Objeto esperado'); continue
            k=e.get('kind'); eid=e.get('id'); loc+=f' ({eid})'
            if not nonempty(eid): r.error('ID',loc,'ID ausente ou inválido')
            elif eid in ids: r.error('DUP_ID',loc,'ID duplicado na fase')
            else: ids.add(eid)
            if not isinstance(k,str) or k not in KINDS: r.error('KIND',loc,'Tipo de entidade desconhecido'); continue
            counts[k]=counts.get(k,0)+1
            if not num(e.get('x')) or not num(e.get('y')): r.error('POSITION',loc,'Coordenadas não numéricas'); continue
            x,y=e['x'],e['y']
            if not (0<=x<w and 0<=y<=h): r.error('POSITION',loc,'Origem fora da fase')
            if k in RECTS or k in {'ground','platform','event'}:
                if not positive(e.get('width')): r.error('WIDTH',loc,'Largura inválida')
                elif x+e['width']>w: r.warn('RECT_BOUNDS',loc,'Largura ultrapassa o mapa; motor pode ajustar ou recortar')
            if k in RECTS:
                if not positive(e.get('height')): r.error('HEIGHT',loc,'Altura inválida')
                elif y+e['height']>h: r.warn('RECT_BOUNDS',loc,'Altura ultrapassa o mapa')
                if k in {'door','plate'}:
                    ch=e.get('channel')
                    if not nonempty(ch): r.error('CHANNEL',loc,'Canal ausente')
                    else:
                        norm=ch.strip()[:40]
                        if norm!=ch: r.warn('CHANNEL_NORMALIZED',loc,'Canal será normalizado pelo motor')
                        if k=='plate': plates.add(norm)
                        else: doors.append((norm,loc))
                if rect_ok(e):
                    if k=='crate': crates.append((e,loc))
                    elif k in {'solid','door'}: solids.append((e,loc))
            if k=='gate': gates.append(e)
            if k=='enemy':
                t=e.get('type')
                if not isinstance(t,str) or t not in ENEMIES: r.error('ENEMY_TYPE',loc,'Inimigo desconhecido')
                if t=='pumpkin': bosses.append(e)
                if not integer(e.get('hp')) or not positive(e['hp']): r.error('HP',loc,'Vida deve ser inteiro positivo')
                ai=e.get('ai')
                if ai is not None:
                    if not isinstance(ai,dict): r.error('AI',loc,'IA deve ser objeto')
                    else:
                        if not isinstance(ai.get('mode'),str) or ai['mode'] not in MODES: r.error('AI_MODE',loc,'Modo de IA desconhecido')
                        for key in ('speed','range','aggro','jumpInterval','damage'):
                            v=ai.get(key)
                            if key in ai and (not num(v) or v<0 or (key in {'jumpInterval','damage'} and v<=0) or (key=='damage' and not integer(v))): r.error('AI_VALUE',loc,f'Parâmetro inválido: {key}')
                ref(e.get('spriteId'),'enemy',loc)
            if k=='npc':
                t=e.get('type')
                if not isinstance(t,str) or t not in NPCS: r.error('NPC_TYPE',loc,'NPC desconhecido')
                ref(e.get('spriteId'),'npc',loc)
                if 'dialogue' in e: validate_dialogue(e['dialogue'],loc,r)
                if e.get('heal') and (not integer(e.get('healAmount',1)) or not positive(e.get('healAmount',1))): r.error('HEAL',loc,'Cura inválida')
            if k=='fruit' and (not integer(e.get('value',1)) or not positive(e.get('value',1))): r.error('FRUIT_VALUE',loc,'Valor da fruta inválido')
            if k=='event':
                tr,ac=e.get('trigger'),e.get('action')
                if not isinstance(tr,str) or tr not in TRIGGERS: r.error('TRIGGER',loc,'Gatilho desconhecido')
                if not isinstance(ac,str) or ac not in ACTIONS: r.error('ACTION',loc,'Ação desconhecida')
                if 'dialogue' in e: validate_dialogue(e['dialogue'],loc,r)
                if ac=='dialog' and not e.get('dialogue'): r.error('EMPTY_DIALOGUE',loc,'Evento de diálogo sem falas')
        for k in ('spawn','gate'):
            if counts.get(k,0)!=1: r.error('REQUIRED_ENTITY',where,f'Esperado exatamente um {k}')
        if not counts.get('ground'): r.warn('NO_GROUND',where,'Nenhum segmento de chão')
        if not counts.get('checkpoint'): r.warn('NO_CHECKPOINT',where,'Nenhum checkpoint configurado')
        if counts.get('checkpoint',0)>1: r.warn('MULTIPLE_CHECKPOINTS',where,'Motor de referência lê apenas o primeiro checkpoint')
        for ch,loc in doors:
            if ch not in plates: r.error('UNLINKED_DOOR',loc,f'Porta sem placa no canal {ch}')
        for a,loc in crates:
            for b,bloc in solids:
                if overlaps(a,b): r.warn('CRATE_OVERLAP',loc,f'Caixa sobreposta a {bloc}; verificar no jogo')
        if any(g.get('requiresBoss') for g in gates) and not bosses: r.error('MISSING_BOSS',where,'Portal exige chefe, mas nenhum foi configurado')
        if ix==8 and (len(bosses)!=1 or bosses[0].get('hp')!=8): r.warn('FINAL_BOSS_HP',where,'Referência: um chefe com 8 pontos de vida')
        r.levels.append(dict(name=l.get('name'),index=ix,width=w,height=h,counts=counts))
    for key,a in assets.items():
        where=f'spriteAssets/{key}'; data=a.get('data') if isinstance(a,dict) else None
        if not isinstance(data,str) or not data.startswith('data:image/png;base64,') or len(data)>2_900_000: r.error('EMBEDDED_SPRITE',where,'Data URI PNG inválida ou acima do limite do motor'); continue
        try: raw=base64.b64decode(data.split(',',1)[1],validate=True)
        except (ValueError,binascii.Error): r.error('EMBEDDED_SPRITE',where,'Base64 inválido'); continue
        for cat in sorted(categories[key]) or [None]: inspect_sheet(raw,cat,where,r)

def run(root,mapfile):
    r=Report()
    try: validate_campaign(load_campaign(mapfile),r)
    except (OSError,ValueError) as e: r.error('READ_CAMPAIGN',str(mapfile),str(e))
    for name,cat in sorted(SHEET_FILES.items()):
        try: data=(root/name).read_bytes()
        except OSError as e: r.error('READ_SPRITE',name,str(e)); continue
        inspect_sheet(data,cat,name,r)
    return r

def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parent.parent,help='Raiz do jogo'); ap.add_argument('--map',type=Path,help='JSON do editor ou levels.js'); ap.add_argument('--json',type=Path,help='Gravar relatório JSON no caminho indicado'); ap.add_argument('--strict',action='store_true',help='Tratar avisos como falha para código de saída'); args=ap.parse_args()
    root=args.root.resolve(); r=run(root,args.map or root/'levels.js'); result=r.result()
    for i in r.issues: print(f"{i['severity']} [{i['code']}] {i['where']}: {i['message']}")
    print(f"Fases: {len(r.levels)} | Spritesheets lidos: {len(r.sheets)} | Erros: {result['summary']['ERROR']} | Avisos: {result['summary']['WARN']}")
    if args.json: args.json.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return 1 if result['summary']['ERROR'] or (args.strict and result['summary']['WARN']) else 0

if __name__=='__main__': sys.exit(main())
