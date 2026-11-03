import sys, re, math, os
sys.path.insert(0, '.')
from iso import *
P = os.environ.get('CANVAS', '.') + '/Main.dc.html'
R = 38
SC = 1.38
sc = Scene(190, 425, SC)
def W(q, r): return (1.5 * R * q, math.sqrt(3) * R * (r + q / 2))
tiles = {
 (0,0):'own', (1,-1):'own', (1,0):'own', (0,1):'own', (-1,1):'own', (0,-1):'own', (-1,0):'own', (2,-1):'own',
 (2,0):'water', (1,1):'water', (2,-2):'water',
 (-1,-1):'seen', (0,-2):'seen', (-2,0):'seen', (-2,-1):'seen', (-1,-2):'seen', (1,-2):'seen',
}
EDGE_NB = [(1,0),(0,1),(-1,1)]
for (q,r),k in tiles.items():
    x,y = W(q,r)
    nb = {i: tiles.get((q+dq, r+dr)) for i,(dq,dr) in enumerate(EDGE_NB)}
    tile(sc, x, y, R, k, nb)
dirs=[(1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1)]
fogs=set()
for (q,r) in tiles:
    for dq,dr in dirs:
        n=(q+dq,r+dr)
        if n not in tiles: fogs.add(n)
buy=[]
for (q,r) in fogs:
    x,y=W(q,r); sx,sy=sc.P((x,y,0))
    if -60 < sx < 450 and 150 < sy < 640:
        fog(sc,x,y,R)
        if any(tiles.get((q+dq,r+dr))=='own' for dq,dr in dirs) and 20 < sx < 370 and 200 < sy < 600: buy.append((sx,sy))
def at(q,r,dx=0,dy=0): x,y=W(q,r); return x+dx,y+dy
# Vénétie, à vous
fx,fy=at(0,0); fondaco(sc,fx,fy+2,1.15)
kx,ky=at(1,-1); smoke=kiln(sc,kx-4,ky,1.0)
bx,by=at(1,0); barn(sc,bx,by,1.0)
px,py=at(0,1); ring(sc,px,py,27,.8); house(sc,px-8,py-4,1.0,0.5); house(sc,px+9,py+3,0.9,0.9); tower(sc,px+14,py-8,0.9,0.5,26); flag(sc,px-8,py-4,15)
for d in ((-10,-10),(6,-12),(-14,6),(2,4),(12,8)):
    x,y=at(-1,1,*d); pine(sc,x,y,1.0)
x,y=at(-1,1,-2,14); rock(sc,x,y,0.9,4)
x,y=at(0,-1); plots(sc,x,y,1.0); fence(sc,x-18,y+14,5,0.0)
x,y=at(-1,0,-14,-12); pine(sc,x,y,0.9); x,y=at(-1,0,14,-14); rock(sc,x,y,0.8,7)
vx,vy=at(2,-1); ring(sc,vx,vy,27,1.0,full=True); tower(sc,vx+8,vy-8,1.0,0.5,34); house(sc,vx-8,vy-2,0.95,0.3); house(sc,vx+4,vy+8,0.85,1.0,chimney=False)
x,y=at(2,0,-6,-2); dock(sc,x,y)
# Lombardie, vue (en retrait)
mx,my=at(-1,-1); ring(sc,mx,my,27,.4); house(sc,mx-6,my-4,0.95,0.6,roof=C['roofmuted']); house(sc,mx+8,my+5,0.85,0.2,roof=C['roofmuted'])
x,y=at(-2,0); mountain(sc,x,y,1.0,3,seen=True)
x,y=at(-1,-2); mountain(sc,x+2,y-2,0.8,5,snow=False,seen=True)
cx_,cy_=at(-2,-1); tower(sc,cx_+6,cy_-6,1.0,0.4,24,C['rockseen']); house(sc,cx_-8,cy_+4,0.9,0.5,roof=C['roofmuted'])
for d in ((-10,-6),(4,-12),(10,4),(-4,8)):
    x,y=at(0,-2,*d); pine(sc,x,y,0.95,muted=True)
x,y=at(1,-2,-6,0); rock(sc,x,y,1.1,2,seen=True); x,y=at(1,-2,10,6); rock(sc,x,y,0.8,9,seen=True); x,y=at(1,-2,6,-10); pine(sc,x,y,0.8,muted=True)
# route du fondaco à Mantoue
pts=[sc.P((fx-14,fy+8,0)), sc.P(at(-1,0,4,0)+(0,)), sc.P((mx+2,my+14,0))]
road='M%.1f %.1f Q %.1f %.1f %.1f %.1f'%(pts[0][0],pts[0][1],pts[1][0],pts[1][1],pts[2][0],pts[2][1])
sc.ground.append('<path d="%s" fill="none" stroke="#22385A" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"></path><path class="march" d="%s" fill="none" stroke="#F4F8FC" stroke-width="1.6" stroke-dasharray="2 5" stroke-linecap="round"></path>'%(road,road))
svg=render(sc,390,844)
halo=('<defs><radialGradient id="edge" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1F3557" stop-opacity=".75"></stop><stop offset="1" stop-color="#16263E" stop-opacity="0"></stop></radialGradient></defs>'
      +'<ellipse cx="%.1f" cy="%.1f" rx="290" ry="200" fill="url(#edge)"></ellipse>'%sc.P((0,-20,0)))
# ---- HTML layer
def top_of(x,y,z): return sc.P((x,y,z))
def lab(q,r,text,color='#ECF5FF',dy=0):
    x,y=W(q,r); sx,sy=sc.P((x,y+R*0.93,-12))
    sy+=24+dy
    return '  <span class="place" style="position: absolute; left: %dpx; top: %dpx; transform: translateX(-50%%); white-space: nowrap; font-size: 12px; font-weight: 700; color: %s; background: rgba(14,26,43,.85); padding: 1px 7px; border-radius: 6px; pointer-events: none">%s</span>\n'%(sx,sy-24,color,text)
h=math.sqrt(3)*R*K*SC; w=2*R*SC; up=30
def hot(q,r,href,label):
    x,y=W(q,r); sx,sy=sc.P((x,y,0))
    Y=up+h/2
    return ('  <a href="%s" aria-label="%s" style="position: absolute; left: %dpx; top: %dpx; width: %dpx; height: %dpx; clip-path: polygon(100%% %dpx, 75%% 100%%, 25%% 100%%, 0%% %dpx, 25%% 0, 75%% 0)"></a>\n'
            %(href,label,sx-w/2,sy-Y,w,Y+h/2,Y,Y))
CRATE='<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l9-4 9 4v9l-9 4-9-4z" fill="#C49A5A" stroke="#7A5A2E" stroke-width="1.2" stroke-linejoin="round"></path><path d="M3 8l9 4 9-4 M12 12v9" fill="none" stroke="#7A5A2E" stroke-width="1.2"></path><path d="M3 8l9 4 9-4-9-4z" fill="#E2C27A" stroke="#7A5A2E" stroke-width="1.2" stroke-linejoin="round"></path></svg>'
fsx,fsy=top_of(fx-13*1.15,fy-9*1.15,60)
ready=('  <a href="Orbit.dc.html" class="floaty" aria-label="18 lots prêts au fondaco" style="position: absolute; left: %dpx; top: %dpx; height: 44px; padding: 0 12px 0 8px; border-radius: 999px; background: #1F7A60; box-shadow: 0 0 0 2px #6EE0B8, 0 6px 14px rgba(0,0,0,.45); display: flex; align-items: center; gap: 6px; text-decoration: none; color: #ECF5FF; font-family: \'Archivo\', sans-serif; font-stretch: 125%%; font-weight: 800; font-size: 14px">%s 18</a>\n'%(fsx+6,fsy-30,CRATE))
psx,psy=top_of(px-36,py+6,8)
deliver=('  <a href="Orders.dc.html" class="floaty" aria-label="Padoue : une commande livrable maintenant" style="position: absolute; left: %dpx; top: %dpx; width: 44px; height: 44px; border-radius: 50%%; background: rgba(14,26,43,.85); box-shadow: 0 0 0 2px #F4C554; display: flex; align-items: center; justify-content: center">%s</a>\n'%(psx-22,psy-44,CRATE.replace('width="18" height="18"','width="24" height="24"')))
labpos=[sc.P((W(q,r)[0],W(q,r)[1]+R*0.93,-12)) for q,r in ((0,1),(2,-1),(-1,-1),(-2,-1))]
buy=[(x,y) for x,y in buy if all(abs(x-a)>50 or abs(y+24-b)>40 for a,b in labpos)]
tokens=''.join('  <button aria-label="Acheter cette case · 300 d" class="buy" style="position: absolute; left: %dpx; top: %dpx; width: 44px; height: 44px; border-radius: 50%%; border: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0"><span style="width: 30px; height: 30px; border-radius: 50%%; background: rgba(14,26,43,.85); box-shadow: 0 0 0 1.5px rgba(244,197,84,.7); color: #F4C554; font-size: 18px; line-height: 30px; text-align: center">+</span></button>\n'%(sx-22,sy-22) for sx,sy in buy)
msx,msy=sc.P((mx,my+R*0.93,-12))
arrive=('  <span style="position: absolute; left: %dpx; top: %dpx; white-space: nowrap; font-size: 12px; font-weight: 600; color: #6EC8F5; background: rgba(14,26,43,.85); padding: 1px 7px; border-radius: 6px; box-shadow: 0 0 0 1px rgba(110,200,245,.5); pointer-events: none">Mule · 4 min</span>\n'%(msx-40,msy+18))
src=open(P).read()
lines=src.split('\n')
start=next(i for i,l in enumerate(lines) if l.startswith('  <svg style="position: absolute; left: 0; top: 0" width="390" height="844"'))
end=next(i for i,l in enumerate(lines) if l.startswith('  <div style="position: absolute; left: 0; top: 0; width: 390px; padding: 12px 12px 26px;'))
old='\n'.join(lines[start:end])
roaddiv=re.search(r'  <div class="road".*?\n  </div>',old,re.S).group(0)
coins=re.search(r'(<span class="coinup" .*?</span>\n.*?<span class="coinup b num".*?</span>)',old,re.S).group(1)
mfx,mfy=sc.P((mx+2,my+14,0))
smx,smy=smoke
block=('  <svg style="position: absolute; left: 0; top: 0" width="390" height="844" viewBox="0 0 390 844" role="img" aria-label="La carte : la Vénétie, à vous, et la Lombardie, vue">\n    '+halo+svg+'\n  </svg>\n'
 +'  <svg style="position: absolute; left: %dpx; top: %dpx" width="40" height="50" viewBox="0 0 40 50" aria-hidden="true"><circle class="puff" cx="18" cy="42" r="4" fill="#C9D6E6"></circle><circle class="puff b" cx="18" cy="42" r="4" fill="#C9D6E6"></circle><circle class="puff c" cx="18" cy="42" r="4" fill="#C9D6E6"></circle></svg>\n'%(smx-18,smy-44)
 +lab(0,1,'Padoue')+lab(2,-1,'Venise')+lab(-1,-1,'Mantoue','#C5D3E4')+lab(-2,-1,'Brescia','#C5D3E4')
 +'  <span class="fell" style="position: absolute; left: 22px; top: 640px; font-size: 16px; color: rgba(169,200,230,.35)">Mare Adriaticum</span>\n'
 +hot(0,0,'Orbit.dc.html','Votre fondaco')+hot(1,-1,'Orbit.dc.html','La briqueterie')+hot(0,1,'Orders.dc.html','Padoue')+hot(2,-1,'Orders.dc.html','Venise')+hot(-1,-1,'Orders.dc.html','Mantoue')+hot(1,0,'Remise.dc.html','La Remise')
 +tokens+ready+deliver+arrive
 +'  <div aria-hidden="true" style="position: absolute; left: %dpx; top: %dpx; width: 70px; height: 40px; pointer-events: none">\n    %s\n  </div>\n'%(mfx-30,mfy-40,coins)
 +roaddiv+'\n')
src=src.replace(old,block)
src=re.sub(r"\.road\{offset-path:path\('[^']*'\)",".road{offset-path:path('%s')"%road,src)
css='''.fogb{animation:fogb 6s ease-in-out infinite}
@keyframes fogb{0%,100%{stroke-opacity:.10}50%{stroke-opacity:.22}}
.wave{animation:wave 5s ease-in-out infinite alternate}
@keyframes wave{from{transform:translateX(-3px)}to{transform:translateX(3px)}}
.ripple-e{animation:ripplee 4s ease-out infinite}
@keyframes ripplee{0%{transform:scale(1);opacity:.9}70%,100%{transform:scale(1.5);opacity:0}}
.floaty{animation:floaty 1.4s ease-in-out infinite}
@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.buy span{animation:buyg 3s ease-in-out infinite}
@keyframes buyg{0%,100%{box-shadow:0 0 0 1.5px rgba(244,197,84,.5)}50%{box-shadow:0 0 0 1.5px rgba(244,197,84,.95),0 0 10px rgba(244,197,84,.45)}}
'''
if '.fogb{' not in src:
    src=src.replace('@media (prefers-reduced-motion:reduce)',css+'@media (prefers-reduced-motion:reduce)',1)
open(P,'w').write(src)
print(start,end,len(buy))
