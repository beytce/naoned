import sys, re, math
sys.path.insert(0, '.')
from iso import *
P='Orbit.dc.html'  # a file of the design canvas
R=46
sc=Scene(195, 300, 1.55)
def W(q,r): return (1.5*R*q, math.sqrt(3)*R*(r+q/2))
ring6=[(0,-1),(1,-1),(1,0),(0,1),(-1,1),(-1,0)]
tile(sc,0,0,R,'own')
for q,r in ring6:
    if (q,r)==(1,0): x,y=W(q,r); fog(sc,x,y,R); continue
    x,y=W(q,r); tile(sc,x,y,R,'own')
fondaco(sc,0,10,1.0)
x,y=W(1,-1); smoke=kiln(sc,x-4,y,1.1)
x,y=W(0,-1); plots(sc,x-10,y-2,0.8); windmill(sc,x+16,y-10,1.1)
x,y=W(-1,0); mine(sc,x,y,1.0)
x,y=W(-1,1)
for d in ((-12,-8),(4,-12),(-6,8)): pine(sc,x+d[0],y+d[1],1.05)
logs(sc,x+12,y+6,1.0)
x,y=W(0,1); barn(sc,x-4,y-2,0.9); logs(sc,x+14,y+6,0.9)
svg=render(sc,390,520)
def lab(q,r,text,color='#ECF5FF'):
    x,y=W(q,r)
    if r+q/2<0: sx,sy=sc.P((x,y-R*0.86,0)); sy-=52
    else: sx,sy=sc.P((x,y+R*0.86,0))
    return '  <span style="position: absolute; left: %dpx; top: %dpx; transform: translateX(-50%%); white-space: nowrap; font-size: 12px; font-weight: 700; color: %s; background: rgba(14,26,43,.78); padding: 1px 7px; border-radius: 6px; pointer-events: none">%s</span>\n'%(sx,sy-8,color,text)
def badge(q,r,n):
    x,y=W(q,r); sx,sy=sc.P((x,y,0))
    return '  <span class="num pop-badge" style="position: absolute; left: %dpx; top: %dpx; height: 24px; padding: 0 8px; border-radius: 999px; background: #1F7A60; color: #ECF5FF; font-size: 12px; display: flex; align-items: center; gap: 4px; box-shadow: 0 0 0 2px #6EE0B8, 0 4px 10px rgba(0,0,0,.4)">%s prêts</span>\n'%(sx+6,sy-78,n)
x,y=W(1,0); bx,by=sc.P((x,y,0))
plus='  <a href="Main.dc.html" aria-label="Bâtir un atelier ici" style="position: absolute; left: %dpx; top: %dpx; width: 52px; height: 52px; border-radius: 50%%; border: 1.5px dashed #6EC8F5; color: #6EC8F5; display: flex; align-items: center; justify-content: center; font-size: 28px; text-decoration: none; background: rgba(14,26,43,.5)">+</a>\n'%(bx-26,by-26)
smx,smy=smoke
block=('  <svg class="page-zoom" style="position: absolute; left: 0; top: 0" width="390" height="520" viewBox="0 0 390 520" role="img" aria-label="Votre fondaco et ses ateliers">\n    '+svg+'\n  </svg>\n'
 +'  <svg style="position: absolute; left: %dpx; top: %dpx" width="40" height="50" viewBox="0 0 40 50" aria-hidden="true"><circle class="puff" cx="18" cy="42" r="5" fill="#C9D6E6"></circle><circle class="puff b" cx="18" cy="42" r="5" fill="#C9D6E6"></circle><circle class="puff c" cx="18" cy="42" r="5" fill="#C9D6E6"></circle></svg>\n'%(smx-18,smy-44)
 +lab(1,-1,'Briqueterie')+lab(0,-1,'Ferme')+lab(-1,0,'Glaisière')+lab(-1,1,'Coupe de bois')+lab(0,1,'Scierie')+lab(1,0,'Bâtir ici','#6EC8F5')
 +badge(1,-1,8)+badge(-1,0,10)+plus)
s=open(P).read()
lines=s.split('\n')
a=next(i for i,l in enumerate(lines) if l.startswith('  <svg style="position: absolute; left: 30px; top: 146px"') or l.startswith('  <svg class="page-zoom" style="position: absolute; left: 0; top: 0" width="390" height="520"'))
b=next(i for i,l in enumerate(lines) if l.startswith('  <div class="sheetup"'))
s='\n'.join(lines[:a])+'\n'+block+'\n'+'\n'.join(lines[b:])
if '.sails{' not in s:
    s=s.replace('@media (prefers-reduced-motion:reduce)','.sails{animation:sails 6s linear infinite}\n@keyframes sails{to{transform:rotate(360deg)}}\n.pop-badge{animation:popin .45s cubic-bezier(.3,1.5,.5,1) both .6s}\n@media (prefers-reduced-motion:reduce)',1)
open(P,'w').write(s)
open('preview.html','w').write('<html><body style="margin:0;background:#16263E;position:relative">'+block+'</body></html>')
print(a,b)
