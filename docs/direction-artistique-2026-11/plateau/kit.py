import sys,re,math
sys.path.insert(0,'.')
from iso import *
R=38
sc=Scene(78,120,1.25)
items=[('own','fondaco'),('own','kiln'),('own','town'),('own','pines'),('seen','mountain'),('water','dock')]
for i,(k,what) in enumerate(items):
    x=i*104; y=0
    tile(sc,x,y,R,k)
    if what=='fondaco': fondaco(sc,x,y+2,0.9)
    if what=='kiln': kiln(sc,x-4,y,1.0)
    if what=='town': ring(sc,x,y,27,.7); house(sc,x-8,y-4,1.0,0.5); house(sc,x+9,y+3,0.9,0.9); tower(sc,x+14,y-8,0.9,0.5,26)
    if what=='pines':
        for d in ((-10,-8),(6,-12),(-6,8),(10,6)): pine(sc,x+d[0],y+d[1],1.0)
    if what=='mountain': mountain(sc,x,y,1.0,3)
    if what=='dock': dock(sc,x-6,y)
svg=render(sc,790,240)
P='System.dc.html'  # a file of the design canvas
s=open(P).read()
if 'aria-label="Le kit de tuiles"' in s:
    s=re.sub(r'(<svg width="788" height="230" viewBox="0 0 788 230" role="img" aria-label="Le kit de tuiles">).*?(</svg><div style="display: flex; justify-content: space-around)', lambda mm: mm.group(1)+svg+mm.group(2), s, count=1, flags=re.S)
    open(P,'w').write(s); open('prev_kit.html','w').write('<html><body style="margin:0;background:#122036"><svg width="788" height="230">'+svg+'</svg></body></html>'); raise SystemExit
m=re.search(r'(<span[^>]*>Les lieux, en médailles</span>\s*)<div class="sea".*?</div>\s*<span[^>]*>.*?</span>',s,re.S)
caps=''.join('<span style="width: 130px; text-align: center; font-size: 13px; color: #A9BCD4">%s</span>'%t for t in ('Votre fondaco','Un atelier','Une ville et sa jauge','Une forêt','Une terre vue','La lagune'))
new=(m.group(1)+'<div style="border-radius: 20px; border: 1px solid rgba(169,188,212,.2); background: #122036; padding: 10px 0 14px; display: flex; flex-direction: column; gap: 6px; overflow: hidden">'
 +'<svg width="788" height="230" viewBox="0 0 788 230" role="img" aria-label="Le kit de tuiles">'+svg+'</svg>'
 +'<div style="display: flex; justify-content: space-around; padding: 0 6px">'+caps+'</div></div>'
 +'<span style="font-size: 13px; color: #A9BCD4; line-height: 1.45">Un monde en tuiles hexagonales épaisses, deux strates (terre, puis socle bleu nuit), coins adoucis, une seule lumière venue du haut à gauche. Des modèles low-poly en trois tons, sans contour : sapins lagune, rochers et montagnes gris-bleu, murs blancs, toits bleus ; l’or seulement pour ce qui est à vous (toits du fondaco et de la Casa, fanions). Vos terres sont sable-or, les terres vues gris-bleu, la lagune lapis translucide, l’inconnu en pointillés.</span>')
s=s.replace(m.group(0),new)
s=s.replace('Les lieux, en médailles','Le monde en tuiles')
open(P,'w').write(s); print('ok')
open('prev_kit.html','w').write('<html><body style="margin:0;background:#122036"><svg width="788" height="230">'+svg+'</svg></body></html>')
