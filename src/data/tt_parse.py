import re, json
def parse(path):
    items=[]; sec=None
    for ln in open(path, encoding='utf8'):
        ln=ln.rstrip('\n')
        if not ln.strip() or ln.startswith('#'): continue
        if ln.startswith('@'):
            g,tpl,unit=ln[1:].split('|'); sec=(g,tpl,unit); continue
        g,tpl,unit=sec
        if tpl=='{a}':
            m=re.match(r'(.*\S)\s+(\d+)$',ln); name=m.group(1); price=int(m.group(2)); a=b=c=''
        else:
            parts=ln.split(); price=int(parts[-1]); vals=parts[:-1]+['','','']; a,b,c=vals[0],vals[1],vals[2]
            name=tpl.format(a=a.replace('*','×').replace('-',' '),b=b.replace('*','×').replace('-',' '),c=c)
        u=unit.rstrip('*')
        items.append({'name':re.sub(r'\s+',' ',name).strip(),'grp':g,'unit':u,'price':price,'a':a,'b':b,'c':c,'sheetQ':unit.endswith('*')})
    return items
if __name__=='__main__':
    it=parse('data/tt_2026_05.txt'); print(len(it)); print(it[0], it[-1]); import collections; print(collections.Counter(i['grp'] for i in it))
