import sys, re, math
sys.path.insert(0,'.')
import iso
from iso import *
PROJ='/tmp/claude-0/-home-user-naoned/784c1c8f-2706-5287-bdbe-0e04e85abeeb/scratchpad/fondaco/project/'
R=38
def W(q,r): return (1.5*R*q, math.sqrt(3)*R*(r+q/2))
# ---- Orders: Padoue
sc=Scene(240,128,1.45)
for (q,r),k in {(0,0):'own',(-1,0):'own',(-2,1):'own',(1,0):'water',(-1,1):'own'}.items():
    x,y=W(q,r); tile(sc,x,y,R,k)
for (q,r) in [(0,-1),(1,-1),(-1,-1),(-2,0)]:
    x,y=W(q,r); fog(sc,x,y,R)
ring(sc,0,0,27,.8); house(sc,-8,-4,1.0,0.5); house(sc,9,3,0.9,0.9); tower(sc,14,-8,0.9,0.5,26); flag(sc,-8,-4,15)
x,y=W(-1,0)
for d in ((-10,-8),(8,-10)): pine(sc,x+d[0],y+d[1],0.9)
x,y=W(-1,1); rock(sc,x+8,y-6,0.8,3)
x,y=W(-2,1); fondaco(sc,x,y+2,0.8)
x,y=W(1,0); dock(sc,x-6,y)
p0=sc.P(W(-2,1)+(0,)); p1=sc.P(W(-1,0)+(0,)); p2=sc.P((0-14,0+14,0))
road='M%.1f %.1f Q %.1f %.1f %.1f %.1f'%(p0[0]+10,p0[1]+12,p1[0],p1[1]+8,p2[0],p2[1])
sc.ground.append('<path d="%s" fill="none" stroke="#22385A" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"></path><path class="march" d="%s" fill="none" stroke="#6EC8F5" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"></path>'%(road,road))
svg_orders=render(sc,390,230); mule_at=sc.P(W(-1,0)+(0,))
# ---- Casa
sc=Scene(205,178,1.6)
for (q,r),k in {(0,0):'own',(-1,0):'own',(1,0):'water',(1,-1):'own',(0,-1):'own',(-1,1):'water'}.items():
    x,y=W(q,r); tile(sc,x,y,R,k)
palazzo(sc,0,4,1.15)
x,y=W(-1,0)
for d in ((-10,-6),(6,-12),(-2,8)): pine(sc,x+d[0],y+d[1],1.0)
x,y=W(1,-1); house(sc,x-4,y,0.95,0.6); 
x,y=W(0,-1); plots(sc,x,y,0.9)
x,y=W(1,0); dock(sc,x-8,y+2)
svg_casa=render(sc,390,272)
# ---- Remise header
sc=Scene(300,58,0.95)
for (q,r),k in {(0,0):'own',(-1,0):'own',(1,-1):'own'}.items():
    x,y=W(q,r); tile(sc,x,y,R,k)
barn(sc,0,0,1.1); cart(sc,-55,4,1.0); cart(sc,-62,-14,0.9,1.2); fence(sc,40,-6,4,1.4)
x,y=W(1,-1); pine(sc,x,y,0.9); pine(sc,x+10,y+6,0.8)
svg_remise=render(sc,390,104)
# write
_o=open(PROJ+'Orders.dc.html').read()
MULESVG=re.search(r'<div class="bob" role="img" aria-label="La mule charg[^"]*"[^>]*>\n(.*?)\n  </div>',_o,re.S).group(1)
def put(fn, start_pat, end_pat, new, keep_end=True):
    s=open(PROJ+fn).read(); lines=s.split('\n')
    a=next(i for i,l in enumerate(lines) if re.match(start_pat,l))
    b=next(i for i,l in enumerate(lines) if i>a and re.match(end_pat,l))
    lines=lines[:a]+[new]+lines[b+(0 if keep_end else 1):]
    open(PROJ+fn,'w').write('\n'.join(lines))
mdiv='  <div class="bob" role="img" aria-label="La mule chargée, en route" style="position: absolute; left: %dpx; top: %dpx">\n'%(mule_at[0]-20,mule_at[1]-34)+MULESVG+'\n  </div>\n'
put('Orders.dc.html', r'  <svg style="position: absolute; left: 0; top: 0" width="390" height="230"', r'  <div class="sheetup"',
    '  <svg style="position: absolute; left: 0; top: 0" width="390" height="230" viewBox="0 0 390 230" role="img" aria-label="Padoue et la route depuis votre fondaco">\n    '+svg_orders+'\n  </svg>\n'+mdiv)
put('Casa.dc.html', r'    <svg style="position: absolute; left: 0; top: 0" width="390" height="272"', r'    </svg>',
    '    <svg style="position: absolute; left: 0; top: 0" width="390" height="272" viewBox="0 0 390 272" role="img" aria-label="Le palais de la Maison">\n      '+svg_casa+'\n    </svg>', keep_end=False)
put('Remise.dc.html', r'    <svg style="position: absolute; left: 0; top: 0" width="390" height="104"', r'    </svg>',
    '    <svg style="position: absolute; left: 0; top: 0" width="390" height="104" viewBox="0 0 390 104" role="img" aria-label="La Remise">\n      '+svg_remise+'\n    </svg>', keep_end=False)
open('prev_orders.html','w').write('<html><body style="margin:0;background:#16263E"><svg width="390" height="230">'+svg_orders+'</svg><br><svg width="390" height="272" style="background:#1D304D">'+svg_casa+'</svg><br><svg width="390" height="104" style="background:#1D304D">'+svg_remise+'</svg></body></html>')
print('ok')
