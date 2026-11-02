"""A tiny low-poly isometric renderer to SVG: hex tiles and props, one light, one camera."""
import math, random
K = 0.58
L = (-0.45, 0.55, 0.85)
_l = math.sqrt(sum(c * c for c in L)); L = tuple(c / _l for c in L)

class Scene:
    def __init__(self, ox, oy, scale=1.0):
        self.ox, self.oy, self.s = ox, oy, scale
        self.ground = []   # svg strings drawn after tiles (rings, roads)
        self.tiles = []    # (depth, svg)
        self.objs = []     # (depth, svg)
    def P(self, p):
        x, y, z = p
        return (self.ox + x * self.s, self.oy + (K * y - z) * self.s)

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def rgbhex(c): return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(v)))) for v in c)
def shade(col, b):
    r = hexrgb(col)
    if b <= 1: return rgbhex(tuple(v * b for v in r))
    return rgbhex(tuple(v + (255 - v) * (b - 1) for v in r))
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def newell(pts):
    nx = ny = nz = 0
    for i in range(len(pts)):
        x1, y1, z1 = pts[i]; x2, y2, z2 = pts[(i + 1) % len(pts)]
        nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2)
    l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
    return (nx / l, ny / l, nz / l)
def centroid(pts): n = len(pts); return tuple(sum(p[i] for p in pts) / n for i in range(3))

def faces_svg(sc, faces, center, col, extra='', lo=0.62, hi=0.42, edge=None):
    out = []
    for f in faces:
        pts, c = (f, col) if isinstance(f, list) else f
        n = newell(pts)
        if dot(n, sub(centroid(pts), center)) < 0: n = (-n[0], -n[1], -n[2])
        if n[1] + K * n[2] <= 1e-4: continue
        b = lo + hi * max(0.0, dot(n, L))
        fill = shade(c, b)
        d = ' '.join('%.1f,%.1f' % sc.P(p) for p in pts)
        stroke = edge or fill
        out.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="0.6" stroke-linejoin="round"%s></polygon>' % (d, fill, stroke, extra))
    return ''.join(out)

def rot(x, y, a): c, s = math.cos(a), math.sin(a); return (x * c - y * s, x * s + y * c)

def box(sc, cx, cy, z0, w, d, h, a, col, top=None):
    cs = []
    for lx, ly in ((-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)):
        rx, ry = rot(lx, ly, a); cs.append((cx + rx, cy + ry))
    b = [(x, y, z0) for x, y in cs]; t = [(x, y, z0 + h) for x, y in cs]
    faces = [(t, top or col)] + [[b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]] for i in range(4)]
    return faces_svg(sc, faces, (cx, cy, z0 + h / 2), col)

def prism(sc, cx, cy, z0, r, h, n, col, r2=None, a=0, top=None, jit=None):
    r2 = r if r2 is None else r2
    b, t = [], []
    for i in range(n):
        ang = a + 2 * math.pi * i / n
        j = jit[i] if jit else 1
        b.append((cx + r * j * math.cos(ang), cy + r * j * math.sin(ang), z0))
        t.append((cx + r2 * j * math.cos(ang), cy + r2 * j * math.sin(ang), z0 + h))
    faces = [[b[i], b[(i + 1) % n], t[(i + 1) % n], t[i]] for i in range(n)]
    if r2 > 0.01: faces.append((t, top or col))
    return faces_svg(sc, faces, (cx, cy, z0 + h / 2), col)

def cone(sc, cx, cy, z0, r, h, n, col, a=0.3):
    b = [(cx + r * math.cos(a + 2 * math.pi * i / n), cy + r * math.sin(a + 2 * math.pi * i / n), z0) for i in range(n)]
    apex = (cx, cy, z0 + h)
    faces = [[b[i], b[(i + 1) % n], apex] for i in range(n)]
    return faces_svg(sc, faces, (cx, cy, z0 + h / 3), col, lo=0.55, hi=0.5)

def gable(sc, cx, cy, z0, w, d, rh, a, col, over=1.12):
    W, D = w / 2 * over, d / 2 * over
    def q(lx, ly, z): rx, ry = rot(lx, ly, a); return (cx + rx, cy + ry, z)
    b1, b2, b3, b4 = q(-W, -D, z0), q(W, -D, z0), q(W, D, z0), q(-W, D, z0)
    r1, r2 = q(-W, 0, z0 + rh), q(W, 0, z0 + rh)
    faces = [[b4, b3, r2, r1], [b1, r1, r2, b2], [b1, b4, r1], [b2, r2, b3]]
    return faces_svg(sc, faces, (cx, cy, z0 + rh / 3), col, lo=0.6, hi=0.45)

def face_quad(sc, cx, cy, z0, w, d, a, u0, u1, z1, z2, col, side='front'):
    """A flat quad (door, window) drawn on the +y face of a box, from u0 to u1 along its width."""
    def q(lx, ly, z): rx, ry = rot(lx, ly, a); return sc.P((cx + rx, cy + ry, z))
    y = d / 2 + 0.2
    pts = [q(u0, y, z0 + z1), q(u1, y, z0 + z1), q(u1, y, z0 + z2), q(u0, y, z0 + z2)]
    return '<polygon points="%s" fill="%s"></polygon>' % (' '.join('%.1f,%.1f' % p for p in pts), col)

# ---------- palette
C = dict(land='#E2C27A', landside='#C9A55E', soil='#2E486E', mist='#9FB3CC', mistside='#7F95B3', mistsoil='#22385A',
         water='#6EC8F5', pine='#3BA58A', trunk='#8A6A3A', rock='#A9BBD0', rock2='#8EA2BA', wall='#E9F0F8',
         roof='#3F6A9E', roofgold='#F2C24F', wood='#B08A4E', brick='#C0704A', door='#22385A', plot='#D9B866', snow='#F4F8FC')

def hexpts(cx, cy, R, z):
    return [(cx + R * math.cos(math.radians(60 * i)), cy + R * math.sin(math.radians(60 * i)), z) for i in range(6)]

def tile(sc, cx, cy, R, kind):
    top, side, soil, t0 = {
        'own': (C['land'], C['landside'], C['soil'], 0),
        'seen': (C['mist'], C['mistside'], C['mistsoil'], 0),
        'water': (C['water'], C['water'], C['soil'], -5),
    }[kind]
    out = []
    # soft shadow
    sx, sy = sc.P((cx + 4, cy + 10, -22))
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="rgba(0,0,0,.28)"></ellipse>' % (sx, sy, R * 1.02 * sc.s, R * K * 1.02 * sc.s))
    Ri = R - 1.6
    for z_top, z_bot, col in ((t0, -11, side), (-11, -22, soil)):
        tp, bt = hexpts(cx, cy, Ri, z_top), hexpts(cx, cy, Ri, z_bot)
        for i in (0, 1, 2):
            f = [bt[i], bt[i + 1], tp[i + 1], tp[i]]
            n = newell(f)
            if dot(n, sub(centroid(f), (cx, cy, (z_top + z_bot) / 2))) < 0: n = tuple(-v for v in n)
            b = 0.62 + 0.42 * max(0, dot(n, L))
            fc = shade(col, b)
            op = ' fill-opacity=".72"' if kind == 'water' and col == C['water'] else ''
            out.append('<polygon points="%s" fill="%s"%s stroke="%s" stroke-width="2.4" stroke-linejoin="round"%s></polygon>' % (
                ' '.join('%.1f,%.1f' % sc.P(p) for p in f), fc, op, fc, op.replace('fill-opacity', 'stroke-opacity')))
    tp = hexpts(cx, cy, Ri, t0)
    tc = shade(top, 0.98)
    op = ' fill-opacity=".8"' if kind == 'water' else ''
    out.append('<polygon points="%s" fill="%s"%s stroke="%s" stroke-width="4" stroke-linejoin="round"></polygon>' % (
        ' '.join('%.1f,%.1f' % sc.P(p) for p in tp), tc, op, tc))
    # rim light on the back edges
    bk = hexpts(cx, cy, Ri - 1, t0)
    out.append('<polyline points="%s" fill="none" stroke="#FFFFFF" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"></polyline>' % (
        ' '.join('%.1f,%.1f' % sc.P(p) for p in (bk[3], bk[4], bk[5], bk[0]))))
    if kind == 'water':
        for dx, dy in ((-8, -4), (6, 6)):
            a, b2 = sc.P((cx + dx - 6, cy + dy, t0)), sc.P((cx + dx + 6, cy + dy, t0))
            out.append('<path d="M%.1f %.1f q%.1f -3 %.1f 0" fill="none" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"></path>' % (a[0], a[1], (b2[0] - a[0]) / 2, b2[0] - a[0]))
    sc.tiles.append((cy, ''.join(out)))

def fog(sc, cx, cy, R):
    pts = hexpts(cx, cy, R - 3, 0)
    sc.ground.insert(0, '<polygon points="%s" fill="rgba(110,200,245,.04)" stroke="rgba(244,197,84,.35)" stroke-width="1.2" stroke-dasharray="5 4" stroke-linejoin="round"></polygon>' % ' '.join('%.1f,%.1f' % sc.P(p) for p in pts))

# ---------- props
def pine(sc, x, y, s=1.0):
    o = prism(sc, x, y, 0, 1.6 * s, 4 * s, 5, C['trunk'])
    o += cone(sc, x, y, 3 * s, 6.5 * s, 10 * s, 6, C['pine'])
    o += cone(sc, x, y, 9 * s, 5 * s, 9 * s, 6, C['pine'], a=0.8)
    sc.objs.append((y, o))
def rock(sc, x, y, s=1.0, seed=1):
    random.seed(seed); jit = [0.8 + 0.4 * random.random() for _ in range(5)]
    sc.objs.append((y, prism(sc, x, y, 0, 7 * s, 6 * s, 5, C['rock'], r2=3.5 * s, a=seed, jit=jit)))
def mountain(sc, x, y, s=1.0, seed=3, snow=True):
    random.seed(seed); j = [0.85 + 0.3 * random.random() for _ in range(6)]
    o = prism(sc, x, y, 0, 24 * s, 18 * s, 6, C['rock2'], r2=15 * s, a=0.2, jit=j)
    o += prism(sc, x + 2 * s, y - 2 * s, 18 * s, 15 * s, 14 * s, 6, C['rock'], r2=7 * s, a=0.5, jit=j)
    o += prism(sc, x + 3 * s, y - 3 * s, 32 * s, 7 * s, 6 * s, 5, C['snow'] if snow else C['rock'], r2=2.5 * s, a=0.9)
    sc.objs.append((y, o))
def house(sc, x, y, s=1.0, a=0.5, roof=None, chimney=True):
    w, d, h = 14 * s, 11 * s, 9 * s
    o = box(sc, x, y, 0, w, d, h, a, C['wall'])
    o += face_quad(sc, x, y, 0, w, d, a, -2 * s, 2 * s, 0, 5.5 * s, C['door'])
    if chimney: o += box(sc, x + 4 * s, y - 2 * s, h, 2.6 * s, 2.6 * s, 7 * s, a, C['rock'])
    o += gable(sc, x, y, h, w, d, 6 * s, a, roof or C['roof'])
    sc.objs.append((y, o))
def tower(sc, x, y, s=1.0, a=0.5, h=30, roof=None):
    o = box(sc, x, y, 0, 7 * s, 7 * s, h * s, a, C['wall'])
    o += face_quad(sc, x, y, 0, 7 * s, 7 * s, a, -1.4 * s, 1.4 * s, (h - 8) * s, (h - 3) * s, C['door'])
    o += cone(sc, x, y, h * s, 5.6 * s, 9 * s, 4, roof or C['roof'], a=a + math.pi / 4)
    sc.objs.append((y, o))
def flag(sc, x, y, z, s=1.0):
    p0, p1 = sc.P((x, y, z)), sc.P((x, y, z + 16 * s))
    o = '<path d="M%.1f %.1fV%.1f" stroke="#22385A" stroke-width="1.4" stroke-linecap="round"></path>' % (p0[0], p0[1], p1[1])
    o += '<path class="flap" d="M%.1f %.1fh%.1fl-%.1f %.1f %.1f %.1fh-%.1fz" fill="#F2C24F" stroke="#9A6514" stroke-width=".6"></path>' % (
        p1[0], p1[1], 10 * s * sc.s, 3 * s * sc.s, 3 * s * sc.s, 3 * s * sc.s, 3 * s * sc.s, 10 * s * sc.s)
    sc.objs.append((y + 0.1, o))
def fondaco(sc, x, y, s=1.0):
    a = 0.45
    o = box(sc, x, y, 0, 30 * s, 20 * s, 14 * s, a, C['wall'])
    for u in (-10, -3.5, 3):
        o += face_quad(sc, x, y, 0, 30 * s, 20 * s, a, u * s, (u + 4.5) * s, 0, 8 * s, C['door'])
    o += gable(sc, x, y, 14 * s, 30 * s, 20 * s, 9 * s, a, C['roofgold'])
    sc.objs.append((y, o))
    tower(sc, x - 13 * s, y - 9 * s, s * 0.9, a, 34, C['roofgold'])
    flag(sc, x - 13 * s, y - 9 * s, 42 * s * 0.9, s)
def kiln(sc, x, y, s=1.0):
    o = prism(sc, x, y, 0, 10 * s, 11 * s, 8, C['brick'], r2=8 * s)
    o += prism(sc, x, y, 11 * s, 8 * s, 5 * s, 8, C['brick'], r2=4 * s)
    o += prism(sc, x + 1 * s, y - 1 * s, 14 * s, 2.6 * s, 18 * s, 6, C['brick'], r2=2.2 * s)
    o += face_quad(sc, x, y, 0, 10 * s, 16 * s, 0, -3 * s, 3 * s, 0, 6 * s, '#F4C554')
    sc.objs.append((y, o))
    for dx, dy in ((12, 6), (14, -4)):
        sc.objs.append((y + dy, box(sc, x + dx * s, y + dy * s, 0, 7 * s, 5 * s, 4 * s, 0.4, C['brick']) + box(sc, x + dx * s, y + dy * s, 4 * s, 7 * s, 5 * s, 3 * s, 0.4, C['brick'])))
    return sc.P((x + 1 * s, y - 1 * s, 32 * s))
def barn(sc, x, y, s=1.0):
    a = 0.5
    o = box(sc, x, y, 0, 24 * s, 18 * s, 12 * s, a, C['wood'])
    o += face_quad(sc, x, y, 0, 24 * s, 18 * s, a, -5 * s, 5 * s, 0, 9 * s, C['door'])
    o += gable(sc, x, y, 12 * s, 24 * s, 18 * s, 9 * s, a, C['roof'])
    sc.objs.append((y, o))
def plots(sc, x, y, s=1.0):
    for dx, dy, w, d in ((-10, -8, 12, 8), (5, -8, 10, 8), (-8, 4, 9, 9), (6, 5, 12, 9)):
        sc.objs.append((y + dy - 50, box(sc, x + dx * s, y + dy * s, 0, w * s, d * s, 2 * s, 0.12, C['plot'])))
def fence(sc, x, y, n, a, s=1.0):
    o = ''
    for i in range(n):
        px, py = x + math.cos(a) * i * 5 * s, y + math.sin(a) * i * 5 * s
        o += box(sc, px, py, 0, 1.4 * s, 1.4 * s, 5 * s, 0, C['wood'])
    p0, p1 = sc.P((x, y, 3.5 * s)), sc.P((x + math.cos(a) * (n - 1) * 5 * s, y + math.sin(a) * (n - 1) * 5 * s, 3.5 * s))
    o += '<path d="M%.1f %.1fL%.1f %.1f" stroke="%s" stroke-width="1.4"></path>' % (p0[0], p0[1], p1[0], p1[1], shade(C['wood'], .8))
    sc.objs.append((y, o))
def dock(sc, x, y, s=1.0):
    sc.objs.append((y, box(sc, x, y, -3, 22 * s, 7 * s, 1.6 * s, 0.5, C['wood']) + box(sc, x - 8 * s, y + 4 * s, -8, 1.6 * s, 1.6 * s, 6.5, 0, C['wood'])))
def ring(sc, x, y, R, frac):
    cx, cy = sc.P((x, y, 0))
    rx, ry = R * sc.s, R * K * sc.s
    sc.ground.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="rgba(14,26,43,.35)" stroke-width="5"></ellipse>'
                     '<ellipse class="ringfill" cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="#6EE0B8" stroke-width="3.2" stroke-linecap="round" pathLength="100" stroke-dasharray="%d 100" transform="rotate(-90 %.1f %.1f)"></ellipse>'
                     % (cx, cy, rx, ry, cx, cy, ry, rx, int(frac * 100), cx, cy))
def render(sc, w, h):
    out = ''.join(sc.ground[:1]) if False else ''
    fogs = [g for g in sc.ground if 'stroke-dasharray="5 4"' in g]
    rest = [g for g in sc.ground if g not in fogs]
    body = ''.join(fogs) + ''.join(t for _, t in sorted(sc.tiles, key=lambda t: t[0])) + ''.join(rest) + ''.join(o for _, o in sorted(sc.objs, key=lambda o: o[0]))
    return body

def logs(sc, x, y, s=1.0):
    o = ''
    for i, (dx, dz) in enumerate(((-4, 0), (0, 0), (4, 0), (-2, 3.4), (2, 3.4))):
        o += prism(sc, x + dx * s, y, dz * s + 1.7 * s, 1.7 * s, 0.01, 6, C['wood'])  # placeholder end
    # simple log pile as boxes along x
    o = ''
    for dx, dz in ((-4, 0), (0, 0), (4, 0), (-2, 3.2), (2, 3.2), (0, 6.4)):
        o += box(sc, x + dx * s, y, dz * s, 3.4 * s, 12 * s, 3.2 * s, 0, C['wood'], top=shade(C['wood'], 1.15))
    sc.objs.append((y, o))
def mine(sc, x, y, s=1.0):
    random.seed(11); j = [0.8 + 0.4 * random.random() for _ in range(7)]
    o = prism(sc, x, y - 4 * s, 0, 18 * s, 14 * s, 7, C['rock2'], r2=9 * s, a=0.3, jit=j)
    o += prism(sc, x + 2 * s, y - 6 * s, 14 * s, 9 * s, 7 * s, 6, C['rock'], r2=4 * s, a=0.7)
    sc.objs.append((y - 4, o))
    o = box(sc, x + 2 * s, y + 9 * s, 0, 10 * s, 4 * s, 8 * s, 0.1, C['wood'])
    o += face_quad(sc, x + 2 * s, y + 9 * s, 0, 10 * s, 4 * s, 0.1, -3 * s, 3 * s, 0, 6 * s, C['door'])
    o += box(sc, x + 2 * s, y + 9 * s, 8 * s, 13 * s, 6 * s, 1.6 * s, 0.1, C['wood'])
    sc.objs.append((y + 9, o))
    for dx, dy in ((-12, 10), (-8, 14)):
        sc.objs.append((y + dy, prism(sc, x + dx * s, y + dy * s, 0, 3.4 * s, 3 * s, 6, C['brick'], r2=1.2 * s)))
def windmill(sc, x, y, s=1.0):
    o = prism(sc, x, y, 0, 6 * s, 18 * s, 8, C['wall'], r2=4.2 * s)
    o += cone(sc, x, y, 18 * s, 5 * s, 6 * s, 8, C['roof'])
    hx, hy = sc.P((x, y + 5 * s, 16 * s))
    L_ = 13 * s * sc.s
    o += '<g class="sails" style="transform-origin: %.1fpx %.1fpx">' % (hx, hy)
    for ang in (0, 90, 180, 270):
        a = math.radians(ang + 20)
        ex, ey = hx + L_ * math.cos(a), hy + L_ * math.sin(a) * 0.9
        px, py = -math.sin(a) * 3 * s * sc.s, math.cos(a) * 3 * s * sc.s
        o += '<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="%s" stroke="%s" stroke-width=".6"></polygon>' % (
            hx, hy, ex, ey, ex + px, ey + py, hx + px * 0.3, hy + py * 0.3, C['plot'], shade(C['wood'], .8))
    o += '</g><circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"></circle>' % (hx, hy, 1.6 * s * sc.s, shade(C['wood'], .7))
    sc.objs.append((y, o))

def palazzo(sc, x, y, s=1.0):
    a = 0.4
    w, d, h = 30 * s, 18 * s, 22 * s
    o = box(sc, x, y, 0, w, d, h, a, C['wall'])
    for u in (-11, -4.5, 2, 8.5):
        o += face_quad(sc, x, y, 0, w, d, a, u * s, (u + 3) * s, 13 * s, 19 * s, C['door'])
    for u in (-9, 4):
        o += face_quad(sc, x, y, 0, w, d, a, u * s, (u + 5) * s, 0, 8 * s, C['door'])
    o += face_quad(sc, x, y, 0, w, d, a, -15 * s, 15 * s, 10.5 * s, 11.5 * s, '#F2C24F')
    o += gable(sc, x, y, h, w, d, 8 * s, a, C['roofgold'])
    sc.objs.append((y, o))
    flag(sc, x + 10 * s, y - 4 * s, h + 6 * s, s)
def cart(sc, x, y, s=1.0, a=0.3):
    o = box(sc, x, y, 3 * s, 12 * s, 7 * s, 4 * s, a, C['wood'])
    for u in (-1, 1):
        rx, ry = rot(0, u * 4.2 * s, a)
        o += prism(sc, x + rx, y + ry, 0, 3 * s, 0.01, 8, shade(C['wood'], .7))
    sc.objs.append((y, o))
