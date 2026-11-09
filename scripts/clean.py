import openpyxl, json, re, sys
wb=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True)
def c(v):
    if v is None: return ''
    s=str(v).replace('\xa0',' ').replace('​','').replace('\t','')
    return re.sub(r'\s+',' ',s).strip()
# HIPPY tab emails keyed by (county, group)
hemail={}
for r in list(wb['HIPPY'].iter_rows(values_only=True))[1:]:
    if c(r[1])=='HIPPY' and c(r[12]): hemail[(c(r[0]).lower(),c(r[2]).lower())]=c(r[12])
ages=['Prenatal','Birth to 1','1 to 2','2 to 3','3 to 4','4 to 5','5 and older']
sites={}; notes=[]
for r in list(wb['Overall'].iter_rows(values_only=True))[1:]:
    r=r[:22]; prog=c(r[2])
    if prog not in ('PAT','HIPPY'): continue
    county=c(r[1]); group=c(r[3])
    email=c(r[13]); web=c(r[12]); phone=c(r[11])
    if not email and prog=='HIPPY': email=hemail.get((county.lower(),group.lower()),'')
    if '@' in web and not email: email,web=web,''
    elif '@' in web: web=''
    if web and not web.startswith('http'): web='https://'+web
    phone=re.sub(r'[^\x20-\x7e]','',phone)
    key=(prog,group.lower().rstrip('. '))
    s=sites.setdefault(key,dict(program=prog,name=group,address=c(r[5]) or c(r[4]),city=c(r[6]),zip=c(r[8]),
        phone=phone,website=web,email=email,ages=[a for a,v in zip(ages,r[14:21]) if c(v).lower()=='x'],
        languages=sorted({l.strip().title() for l in c(r[21]).split(';') if l.strip()}),counties=[]))
    if county and county not in s['counties']: s['counties'].append(county)
    if email and not s['email']: s['email']=email
for s in sites.values():
    s['name']=s['name'].replace('District 11','District 11)').replace(' –',' – ')
out=sorted(sites.values(),key=lambda s:(s['program'],s['name']))
# 'key' is a stable name for each listing. The update form and the staff screen use it to match a request to a site.
import unicodedata
slug=lambda t: re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')
for i,s in enumerate(out): s['id']=i; s['key']=slug(s['program']+' '+s['name']); s['counties'].sort()
assert len({s['key'] for s in out})==len(out), 'two sites ended up with the same key'
print(json.dumps(out,indent=1,ensure_ascii=False))
