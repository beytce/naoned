import sys, re, math
sys.path.insert(0, '.')
from iso import *
P='/tmp/claude-0/-home-user-naoned/784c1c8f-2706-5287-bdbe-0e04e85abeeb/scratchpad/fondaco/project/Main.dc.html'
R = 38
sc = Scene(190, 468, 1.25)
def W(q, r): return (1.5 * R * q, math.sqrt(3) * R * (r + q / 2))
tiles = {
 (0,0):'own', (1,-1):'own', (1,0):'own', (0,1):'own', (-1,1):'own', (0,-1):'own', (-1,0):'own', (2,-1):'own',
 (2,0):'water', (1,1):'water', (2,-2):'water',
 (-1,-1):'seen', (0,-2):'seen', (-2,0):'seen', (-2,-1):'seen', (-1,-2):'seen', (1,-2):'seen',
}
for (q,r),k in tiles.items():
    x,y = W(q,r); tile(sc, x, y, R, k)
dirs=[(1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1)]
fogs=set()
for (q,r) in tiles:
    for dq,dr in dirs:
        n=(q+dq,r+dr)
        if n not in tiles: fogs.add(n)
for (q,r) in fogs:
    x,y=W(q,r); sx,sy=sc.P((x,y,0))
    if -60 < sx < 450 and 150 < sy < 640: fog(sc,x,y,R)
def at(q,r,dx=0,dy=0): x,y=W(q,r); return x+dx,y+dy
# Vénétie
fx,fy=at(0,0); fondaco(sc,fx,fy+2,1.15)
kx,ky=at(1,-1); smoke=kiln(sc,kx-4,ky,1.0)
bx,by=at(1,0); barn(sc,bx,by,1.0)
px,py=at(0,1); ring(sc,px,py,27,.8); house(sc,px-8,py-4,1.0,0.5); house(sc,px+9,py+3,0.9,0.9); tower(sc,px+14,py-8,0.9,0.5,26); flag(sc,px-8,py-4,15)
for d in ((-10,-10),(6,-12),(-14,6),(2,4),(12,8)):
    x,y=at(-1,1,*d); pine(sc,x,y,1.0)
x,y=at(-1,1,-2,14); rock(sc,x,y,0.9,4)
x,y=at(0,-1); plots(sc,x,y,1.0); fence(sc,x-18,y+14,5,0.0)
x,y=at(-1,0,-14,-12); pine(sc,x,y,0.9); x,y=at(-1,0,14,-14); rock(sc,x,y,0.8,7)
vx,vy=at(2,-1); ring(sc,vx,vy,27,.75); tower(sc,vx+8,vy-8,1.0,0.5,34); house(sc,vx-8,vy-2,0.95,0.3); house(sc,vx+4,vy+8,0.85,1.0,chimney=False)
x,y=at(2,0,-6,-2); dock(sc,x,y)
# Lombardie, au nord-ouest
mx,my=at(-1,-1); ring(sc,mx,my,27,.4); house(sc,mx-6,my-4,0.95,0.6); house(sc,mx+8,my+5,0.85,0.2)
x,y=at(-2,0); mountain(sc,x,y,1.0,3)
x,y=at(-1,-2); mountain(sc,x+2,y-2,0.8,5,snow=False)
cx_,cy_=at(-2,-1); ring(sc,cx_,cy_,27,.98); tower(sc,cx_+6,cy_-6,1.0,0.4,24,C['rock2']); house(sc,cx_-8,cy_+4,0.9,0.5)
for d in ((-10,-6),(4,-12),(10,4),(-4,8)):
    x,y=at(0,-2,*d); pine(sc,x,y,0.95)
x,y=at(1,-2,-6,0); rock(sc,x,y,1.1,2); x,y=at(1,-2,10,6); rock(sc,x,y,0.8,9); x,y=at(1,-2,6,-10); pine(sc,x,y,0.8)
# road fondaco -> Mantoue
pts=[sc.P((fx-14,fy+8,0)), sc.P(at(-1,0,4,0)+(0,)), sc.P((mx+2,my+14,0))]
road='M%.1f %.1f Q %.1f %.1f %.1f %.1f'%(pts[0][0],pts[0][1],pts[1][0],pts[1][1],pts[2][0],pts[2][1])
sc.ground.append('<path d="%s" fill="none" stroke="#22385A" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"></path><path class="march" d="%s" fill="none" stroke="#F4F8FC" stroke-width="1.6" stroke-dasharray="2 5" stroke-linecap="round"></path>'%(road,road))
svg=render(sc,390,844)
def lab(q,r,text,cls='place',color='#ECF5FF',dy=0,dz=0):
    x,y=W(q,r); sx,sy=sc.P((x,y+R*0.86,0))
    return '  <span class="%s" style="position: absolute; left: %dpx; top: %dpx; transform: translateX(-50%%); white-space: nowrap; font-size: 12px; font-weight: 700; color: %s; background: rgba(14,26,43,.78); padding: 1px 7px; border-radius: 6px; pointer-events: none">%s</span>\n'%(cls,sx,sy-8+dy,color,text)
def hot(q,r,href,label):
    x,y=W(q,r); sx,sy=sc.P((x,y,0))
    return '  <a href="%s" aria-label="%s" style="position: absolute; left: %dpx; top: %dpx; width: 84px; height: 84px; border-radius: 50%%"></a>\n'%(href,label,sx-42,sy-60)
src=open(P).read()
lines=src.split('\n')
start=next(i for i,l in enumerate(lines) if l.startswith('  <svg style="position: absolute; left: 0; top: 0" width="390" height="844"'))
end=next(i for i,l in enumerate(lines) if l.startswith('  <div style="position: absolute; left: 0; top: 0; width: 390px; padding: 12px 12px 26px;'))
old='\n'.join(lines[start:end])
roaddiv=re.search(r'  <div class="road".*?\n  </div>',old,re.S).group(0)
mfx,mfy=sc.P((mx+8,my+12,0))
coins=re.search(r'(<span class="coinup" .*?</span>\n.*?<span class="coinup b num".*?</span>)',old,re.S).group(1)
smx,smy=smoke
block=('  <svg style="position: absolute; left: 0; top: 0" width="390" height="844" viewBox="0 0 390 844" role="img" aria-label="La carte : la Vénétie, à vous, et la Lombardie, vue">\n    '+svg+'\n  </svg>\n'
 +'  <svg style="position: absolute; left: %d; top: %d" width="40" height="50" viewBox="0 0 40 50" aria-hidden="true">\n'%(smx-18,smy-44)
 +'    <circle class="puff" cx="18" cy="42" r="4" fill="#C9D6E6"></circle>\n    <circle class="puff b" cx="18" cy="42" r="4" fill="#C9D6E6"></circle>\n    <circle class="puff c" cx="18" cy="42" r="4" fill="#C9D6E6"></circle>\n  </svg>\n'
 +lab(0,0,'Fondaco Beytce',color='#F6D27A',dy=-6)+lab(0,1,'Padoue')+lab(2,-1,'Venise')+lab(-1,-1,'Mantoue')+lab(-2,-1,'Brescia')
 +'  <span class="fell" style="position: absolute; left: 210px; top: 560px; font-size: 22px; color: rgba(169,200,230,.45); transform: rotate(-12deg)">Mare Adriaticum</span>\n'
 +hot(0,0,'Orbit.dc.html','Votre fondaco')+hot(0,1,'Orders.dc.html','Padoue')+hot(1,0,'Remise.dc.html','La Remise')
 +'  <div aria-hidden="true" style="position: absolute; left: %dpx; top: %dpx; width: 70px; height: 40px; pointer-events: none">\n    %s\n  </div>\n'%(mfx-30,mfy-40,coins)
 +roaddiv+'\n')
src=src.replace(old,block)
src=re.sub(r"\.road\{offset-path:path\('[^']*'\)",".road{offset-path:path('%s')"%road.replace('Q','Q'),src)
open(P,'w').write(src)
print(start,end,len(svg))
