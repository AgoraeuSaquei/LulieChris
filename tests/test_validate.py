import importlib.util
import json
import struct
import tempfile
import unittest
import zlib
from pathlib import Path
from copy import deepcopy

spec=importlib.util.spec_from_file_location('validator',Path(__file__).resolve().parents[1]/'tools'/'validate.py')
v=importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

def png(category='hero', empty=False, full=False, edge=False, missing=False, extra=False, partial=False, size=(384,320)):
    w,h=size; raw=bytearray((w*4+1)*h)
    for y in range(h):
        for x in range(w):
            row,col=y//64,x//64; lx,ly=x%64,y%64
            used=row<5 and col<v.FRAMES[category][row] and 15<=lx<=45 and 10<=ly<=61
            if missing and row==0 and col==0: used=False
            if extra and row==4 and col==5 and lx==20 and ly==20: used=True
            if edge and x==64 and y==0: used=True
            if full or (used and not empty): raw[y*(w*4+1)+1+x*4:y*(w*4+1)+5+x*4]=bytes([80,40,20,128 if partial else 255])
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')

def entity(kind,id,x=100,y=400,**kw): return dict(kind=kind,id=id,x=x,y=y,**kw)
def campaign():
    ents=[entity('ground','g',0,462,width=1000),entity('spawn','s'),entity('gate','p',900,462),entity('checkpoint','c',500,462),entity('plate','a',320,448,width=64,height=12,channel='A'),entity('door','d',600,250,width=32,height=212,channel='A'),entity('crate','b',200,398,width=64,height=64),entity('enemy','e',700,448,type='plum',hp=1,ai=dict(mode='patrol',speed=55,range=90,damage=1)),entity('npc','n',400,448,type='healer',heal=True,healAmount=1,dialogue=[dict(speaker='healer',mood='feliz',text='Olá')])]
    levels=[dict(name=f'Fase {i}',width=1000,height=540,theme=0,entities=deepcopy(ents)) for i in range(1,9)]
    levels[-1]['entities'][2]['requiresBoss']=True; levels[-1]['entities'][-2].update(type='pumpkin',hp=8)
    return dict(schema='luli-map-editor-v1',version=4,sprite=dict(sheetWidth=384,sheetHeight=320,frame=64,columns=6,rows=5,baseline=61),spriteAssets={},heroSprites={},levels=levels)

def codes(r): return {i['code'] for i in r.issues}
def check(c): r=v.Report(); v.validate_campaign(c,r); return r

def sheet(data,category='hero'): r=v.Report(); v.inspect_sheet(data,category,'fixture',r); return r

class Tests(unittest.TestCase):
    def test_clean_campaign(self): self.assertEqual(check(campaign()).issues,[])
    def test_duplicate_and_unknown(self):
        c=campaign(); c['levels'][0]['entities'].append(entity('nope','s')); self.assertTrue({'DUP_ID','KIND'}<=codes(check(c)))
    def test_missing_required(self):
        c=campaign(); c['levels'][0]['entities'].pop(1); self.assertIn('REQUIRED_ENTITY',codes(check(c)))
    def test_invalid_enemy(self):
        c=campaign(); e=c['levels'][0]['entities'][-2]; e.update(type='bad',hp=0,ai={'mode':'bad','speed':-1},spriteId='missing'); self.assertTrue({'ENEMY_TYPE','HP','AI_MODE','AI_VALUE','SPRITE_REF'}<=codes(check(c)))
    def test_door_and_overlap(self):
        c=campaign(); e=c['levels'][0]['entities']; e[4]['channel']='B'; e[6].update(x=600,y=300); self.assertTrue({'UNLINKED_DOOR','CRATE_OVERLAP'}<=codes(check(c)))
    def test_dialogue(self):
        c=campaign(); c['levels'][0]['entities'][-1]['dialogue']=[{'speaker':'bad','text':''}]; self.assertTrue({'SPEAKER','DIALOGUE'}<=codes(check(c)))
    def test_boss_requirement(self):
        c=campaign(); c['levels'][-1]['entities'][-2]['type']='plum'; self.assertTrue({'MISSING_BOSS','FINAL_BOSS_HP'}<=codes(check(c)))
    def test_multiple_checkpoint_warning(self):
        c=campaign(); c['levels'][0]['entities'].append(entity('checkpoint','cc')); self.assertIn('MULTIPLE_CHECKPOINTS',codes(check(c)))
    def test_bounds(self):
        c=campaign(); c['levels'][0]['entities'][1]['x']=-1; self.assertIn('POSITION',codes(check(c)))
    def test_valid_sheets(self):
        for cat in v.FRAMES: self.assertEqual(sheet(png(cat),cat).issues,[])
    def test_empty_and_opaque(self):
        self.assertTrue({'EMPTY_SHEET','MISSING_FRAMES'}<=codes(sheet(png(empty=True))))
        self.assertIn('NO_TRANSPARENCY',codes(sheet(png(full=True))))
    def test_frame_warnings(self): self.assertTrue({'CELL_EDGE','MISSING_FRAMES','EXTRA_FRAMES','ALPHA_SOFT'}<=codes(sheet(png(edge=True,missing=True,extra=True,partial=True))))
    def test_invalid_png(self):
        self.assertIn('PNG_FORMAT',codes(sheet(png(size=(64,64)))))
        bad=bytearray(png()); bad[-1]^=1; self.assertIn('PNG_FORMAT',codes(sheet(bytes(bad))))
    def test_embedded_sprite(self):
        import base64
        c=campaign(); c['heroSprites']['luli']='custom'; c['spriteAssets']['custom']={'data':'data:image/png;base64,'+base64.b64encode(png()).decode()}; r=check(c); self.assertEqual(r.issues,[]); self.assertEqual(len(r.sheets),1)
    def test_parse_no_eval(self):
        with tempfile.TemporaryDirectory() as d:
            f=Path(d)/'levels.js'; f.write_text('window.LULI_CAMPAIGN = '+json.dumps(campaign())+';'); self.assertEqual(len(v.load_campaign(f)['levels']),8)
            f.write_text('window.LULI_CAMPAIGN = {}; alert(1);'); self.assertRaises(ValueError,v.load_campaign,f)
    def test_integration(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); mf=root/'levels.js'; mf.write_text('window.LULI_CAMPAIGN = '+json.dumps(campaign())+';')
            cache={cat:png(cat) for cat in v.FRAMES}
            for name,cat in v.SHEET_FILES.items():
                f=root/name; f.parent.mkdir(parents=True,exist_ok=True); f.write_bytes(cache[cat])
            r=v.run(root,mf); self.assertEqual(r.issues,[]); self.assertEqual(len(r.sheets),14); self.assertEqual(len(r.levels),8)
            (root/next(iter(v.SHEET_FILES))).unlink(); self.assertIn('READ_SPRITE',codes(v.run(root,mf)))

if __name__=='__main__': unittest.main()
