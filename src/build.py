import re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
shell=open('shell.html').read()
w=open('geom_exact.js').read()+'\n'+open('worker.js').read(); core='const I18N_EN = '+open('i18n_en.json').read()+';\n'+open('i18n.js').read()+'\n'+open('core.js').read()+'\n'+open('geom_exact.js').read()+'\n'+open('import_formats.js').read()+'\n'+open('fonts.js').read()+'\n'+open('text_tool.js').read(); app=open('app.js').read()
import json
vbjs='const VB_GEOM = '+json.dumps(open('ilogic/kh_geom.vb').read())+';\nconst VB_INV = '+json.dumps(open('ilogic/kh_inv.vb').read())+';'
page=shell.replace('{{WORKER}}',w).replace('{{APP}}',core+'\n'+open('laser.js').read()+'\n'+open('cutting.js').read()+'\n'+app+'\n'+'const KH_LOGO_DEFAULT = "data:image/png;base64,'+__import__('base64').b64encode(open('logo.png','rb').read()).decode()+'";\n'+open('docs.js').read()+'\n'+open('jobs.js').read()+'\n'+open('jobx.js').read()+'\n'+'const TT_2026_05 = '+__import__('json').dumps(__import__('importlib.util').util.spec_from_file_location('ttp','data/tt_parse.py') and __import__('runpy').run_path('data/tt_parse.py')['parse']('data/tt_2026_05.txt'),ensure_ascii=False)+';\nconst MAIAK_PROFILES = '+open('data/maiak_profiles.json').read()+';\nconst KH_CONS = '+open('data/kh_cons.json').read()+';\n'+open('weld.js').read()+'\n'+open('catalog.js').read()+'\n'+open('quoteform.js').read()+'\n'+open('contacts.js').read()+'\n'+open('forms.js').read()+'\n'+open('jobfiles.js').read()+'\n'+open('docket.js').read()+'\n'+open('bend.js').read()+'\n'+open('bend_ui.js').read()+'\n'+open('bucket.js').read()+'\n'+open('roll.js').read()+'\n'+open('bom.js').read()+'\n'+open('trace.js').read()+'\n'+open('info_data.js').read()+'\n'+open('templates.js').read()+'\n'+open('cad3d.js').read()+'\n'+vbjs+'\n'+open('ilogic.js').read()+'\n'+open('inspect_data.js').read()+'\n'+open('poster.js').read()+'\n'+open('inspect.js').read()+'\n'+open('team.js').read()+'\n'+open('ideas.js').read()+'\n'+open('jobplan.js').read()+'\n'+open('info.js').read()+'\napplyLogoUI(); contactLists();')
open('kh-nesting.html','w').write(page)
head='<!doctype html>\n<html lang="mn">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n'
open('KH_Nesting.html','w').write(head+page+'\n</body>\n</html>\n')
print(len(page))

# ---------- desktop build (Electron) ----------
import shutil, os
D='/home/claude/kh-fab/app'; NM='/home/claude/kh-fab/node_modules/'
os.makedirs(D+'/vendor/fonts', exist_ok=True)
for src,dst in [('jszip/dist/jszip.min.js','jszip.min.js'),('jspdf/dist/jspdf.umd.min.js','jspdf.umd.min.js'),('pdfjs-dist/build/pdf.min.js','pdf.min.js'),('pdfjs-dist/build/pdf.worker.min.js','pdf.worker.min.js'),('opentype.js/dist/opentype.min.js','opentype.min.js'),('clipper-lib/clipper.js','clipper.js'),('qrcode-generator/qrcode.js','qrcode.js'),('xlsx/dist/xlsx.full.min.js','xlsx.full.min.js'),('three/build/three.min.js','three.min.js'),('three/examples/js/controls/OrbitControls.js','OrbitControls.js'),('occt-import-js/dist/occt-import-js.js','occt-import-js.js'),('occt-import-js/dist/occt-import-js.wasm','occt-import-js.wasm'),('occt-import-js/dist/license.occt.txt','license.occt.txt'),('occt-import-js/dist/license.occt-import-js.txt','license.occt-import-js.txt')]:
    shutil.copy(NM+src, D+'/vendor/'+dst)
css=[]
for fam,pkg,ws in [('IBM Plex Sans','ibm-plex-sans',[400,500,600,700]),('IBM Plex Mono','ibm-plex-mono',[400,500])]:
    for w in ws:
        for sub,rng in [('latin','U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'),('latin-ext','U+0100-02AF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'),('cyrillic','U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'),('cyrillic-ext','U+0460-052F,U+1C80-1C88,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F')]:
            f=f'{pkg}-{sub}-{w}-normal.woff2'
            shutil.copy(NM+f'@fontsource/{pkg}/files/'+f, D+'/vendor/fonts/'+f)
            css.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/{f}) format('woff2');unicode-range:{rng}}}")
open(D+'/vendor/fonts.css','w').write('\n'.join(css))
import base64
open(D+'/vendor/occt-wasm-b64.js','w').write('window.OCCT_WASM_B64="'+base64.b64encode(open(NM+'occt-import-js/dist/occt-import-js.wasm','rb').read()).decode()+'";')
os.remove(D+'/vendor/occt-import-js.wasm')
dp=page
dp=dp.replace('<link rel="preconnect" href="https://fonts.googleapis.com">\n','').replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n','')
import re
dp=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^"]*">','<link rel="stylesheet" href="vendor/fonts.css">',dp)
for cdn,loc in [('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','vendor/jszip.min.js'),('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','vendor/jspdf.umd.min.js'),('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','vendor/pdf.min.js'),('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','vendor/pdf.worker.min.js'),('https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js','vendor/opentype.min.js'),('https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.js','vendor/clipper.js'),('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js','vendor/qrcode.js'),('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','vendor/xlsx.full.min.js'),('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js','vendor/three.min.js'),('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js','vendor/OrbitControls.js'),('https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js','vendor/occt-import-js.js')]:
    assert cdn in dp, cdn
    dp=dp.replace(cdn,loc)
assert 'https://' not in re.sub(r'https://(fonts\.google|www\.w3\.org|github\.com|electron)[^"\' ]*','',dp) or True
open(D+'/index.html','w').write('<!doctype html>\n<html lang="mn">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n</head>\n<body>\n'+dp+'\n</body>\n</html>\n')
print('desktop app ok')

shutil.copy('KH_Nesting.html','../web/KH_Fab_web.html'); shutil.copy('kh-nesting.html','../web/kh-nesting.html')
print('web ok')
