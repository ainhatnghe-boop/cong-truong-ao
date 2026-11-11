# Dựng map nhiều dự án xây dựng cho game công trường ảo (Blender 5.2). Đơn vị mét, Z lên trên.
import math
import os
import unicodedata
from contextlib import contextmanager

import bpy
import numpy as np
from mathutils import Vector

DIR = r"D:\CHẤN HƯNG OFFLINE\01_CÔNG CỤ VÀ ỨNG DỤNG\21. Blender_MCP"
FONT = r"C:\Windows\Fonts\arialbd.ttf"

PAL = {
    "grass": (0.36, 0.48, 0.22), "dirt": (0.52, 0.39, 0.26), "dirt_dark": (0.38, 0.28, 0.19), "gravel": (0.55, 0.53, 0.49),
    "asphalt": (0.20, 0.20, 0.21), "line": (0.90, 0.90, 0.86), "kerb": (0.66, 0.65, 0.62), "walk": (0.72, 0.70, 0.66),
    "concrete": (0.68, 0.67, 0.64), "concrete_dk": (0.50, 0.49, 0.47), "blinding": (0.60, 0.59, 0.56), "rebar": (0.30, 0.20, 0.14),
    "brick": (0.66, 0.34, 0.24), "plaster": (0.90, 0.88, 0.82), "accent": (0.80, 0.55, 0.28), "glass": (0.22, 0.38, 0.50), "glass_dk": (0.10, 0.15, 0.20),
    "frame": (0.28, 0.29, 0.31), "steel": (0.52, 0.54, 0.56), "steel_dk": (0.27, 0.29, 0.32), "steel_blue": (0.20, 0.36, 0.56),
    "scaffold": (0.62, 0.64, 0.66), "plank": (0.70, 0.56, 0.36), "net": (0.14, 0.42, 0.28), "formwork": (0.74, 0.52, 0.28), "prop": (0.86, 0.44, 0.12),
    "hoard": (0.12, 0.34, 0.50), "hoard_top": (0.92, 0.92, 0.88), "cont_white": (0.88, 0.89, 0.87), "cont_blue": (0.25, 0.46, 0.68),
    "cont_gray": (0.62, 0.65, 0.66), "cont_orange": (0.85, 0.47, 0.16), "cont_green": (0.28, 0.54, 0.36), "roof": (0.36, 0.42, 0.50), "door": (0.30, 0.34, 0.42),
    "sign": (0.96, 0.96, 0.92), "sign_blue": (0.08, 0.24, 0.52), "sign_red": (0.74, 0.12, 0.12), "ink": (0.08, 0.09, 0.14), "white": (0.97, 0.97, 0.95),
    "crane": (0.93, 0.70, 0.08), "crane_red": (0.75, 0.15, 0.10), "cab": (0.88, 0.86, 0.72), "weight": (0.46, 0.46, 0.44),
    "tire": (0.06, 0.06, 0.07), "hub": (0.60, 0.60, 0.58), "machine": (0.90, 0.62, 0.08), "machine_dk": (0.18, 0.18, 0.19), "truck_w": (0.86, 0.87, 0.86), "truck_b": (0.16, 0.34, 0.60),
    "tank": (0.88, 0.89, 0.87), "tank_primer": (0.62, 0.34, 0.26), "pipe_o": (0.84, 0.46, 0.14), "pipe_g": (0.55, 0.58, 0.58), "pipe_y": (0.88, 0.76, 0.16),
    "ins": (0.62, 0.38, 0.22), "trafo": (0.50, 0.56, 0.54), "fin": (0.38, 0.43, 0.42), "cu": (0.72, 0.46, 0.22), "cone": (0.92, 0.38, 0.08),
    "trunk": (0.32, 0.22, 0.14), "leaf": (0.22, 0.42, 0.16), "leaf2": (0.32, 0.50, 0.18), "barrier": (0.90, 0.38, 0.10), "bag": (0.74, 0.70, 0.60), "pallet": (0.55, 0.42, 0.26),
}
NAMES = list(PAL)
SW = {n: i for i, n in enumerate(NAMES)}
CELLS = 16
TEX = 512
_stack = [(0.0, 0.0, 1.0, 0.0)]


@contextmanager
def at(x=0.0, y=0.0, deg=0.0):
    ox, oy, c, s = _stack[-1]
    r = math.radians(deg)
    c2, s2 = math.cos(r), math.sin(r)
    _stack.append((ox + c * x - s * y, oy + s * x + c * y, c * c2 - s * s2, s * c2 + c * s2))
    try:
        yield
    finally:
        _stack.pop()


def W(x, y, z):
    ox, oy, c, s = _stack[-1]
    return (ox + c * x - s * y, oy + s * x + c * y, z)


_text_cache = {}


def tessellate(txt):
    if txt in _text_cache:
        return _text_cache[txt]
    fc = bpy.data.curves.new("_t", "FONT")
    fc.body = txt
    fc.font = bpy.data.fonts.load(FONT, check_existing=True)
    fc.size = 1.0
    fc.resolution_u = 1
    fc.align_x = "CENTER"
    ob = bpy.data.objects.new("_t", fc)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    vs = [(v.co.x, v.co.y) for v in me.vertices]
    fs = [tuple(p.vertices) for p in me.polygons]
    ymid = (min(v[1] for v in vs) + max(v[1] for v in vs)) / 2 if vs else 0
    vs = [(x, y - ymid) for x, y in vs]
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.curves.remove(fc)
    bpy.data.meshes.remove(me)
    _text_cache[txt] = (vs, fs)
    return _text_cache[txt]


class M:
    def __init__(self):
        self.v, self.f, self.s = [], [], []

    def face(self, pts, sw):
        i = len(self.v)
        self.v += pts
        self.f.append(tuple(range(i, i + len(pts))))
        self.s.append(SW[sw])

    def quad(self, a, b, c, d, sw):
        self.face([W(*a), W(*b), W(*c), W(*d)], sw)

    def box(self, x0, x1, y0, y1, z0, z1, sw, bottom=False, top=True):
        a0, b0, c0, d0 = W(x0, y0, z0), W(x1, y0, z0), W(x1, y1, z0), W(x0, y1, z0)
        a1, b1, c1, d1 = W(x0, y0, z1), W(x1, y0, z1), W(x1, y1, z1), W(x0, y1, z1)
        if top:
            self.face([a1, b1, c1, d1], sw)
        if bottom:
            self.face([d0, c0, b0, a0], sw)
        self.face([a0, b0, b1, a1], sw)
        self.face([b0, c0, c1, b1], sw)
        self.face([c0, d0, d1, c1], sw)
        self.face([d0, a0, a1, d1], sw)

    def beam(self, p0, p1, t, sw):
        a, b = Vector(W(*p0)), Vector(W(*p1))
        d = (b - a)
        if d.length < 1e-5:
            return
        d.normalize()
        u = d.cross(Vector((0, 0, 1)))
        if u.length < 1e-4:
            u = Vector((1, 0, 0))
        u.normalize()
        v = d.cross(u)
        h = t / 2
        ring = [u * h + v * h, -u * h + v * h, -u * h - v * h, u * h - v * h]
        for i in range(4):
            j = (i + 1) % 4
            self.face([tuple(a + ring[i]), tuple(a + ring[j]), tuple(b + ring[j]), tuple(b + ring[i])], sw)

    def cyl(self, p0, p1, r0, sw, n=8, r1=None, caps=True, double=False):
        a, b = Vector(W(*p0)), Vector(W(*p1))
        d = (b - a).normalized()
        u = d.cross(Vector((0, 0, 1)))
        if u.length < 1e-4:
            u = Vector((1, 0, 0))
        u.normalize()
        v = d.cross(u)
        r1 = r0 if r1 is None else r1
        ring = [u * math.cos(2 * math.pi * i / n) + v * math.sin(2 * math.pi * i / n) for i in range(n)]
        low = [tuple(a + q * r0) for q in ring]
        high = [tuple(b + q * r1) for q in ring]
        i0 = len(self.v)
        self.v += low + high
        for i in range(n):
            j = (i + 1) % n
            self.f.append((i0 + i, i0 + j, i0 + n + j, i0 + n + i))
            self.s.append(SW[sw])
            if double:
                self.face([high[i], high[j], low[j], low[i]], sw)
        if caps:
            self.face(low[::-1], sw)
            self.face(high, sw)

    def text(self, txt, x, y, z, size, sw, flat=False):
        vs, fs = tessellate(txt)
        i = len(self.v)
        if flat:
            self.v += [W(x + a * size, y + b * size, z) for a, b in vs]
        else:
            self.v += [W(x + a * size, y, z + b * size) for a, b in vs]
        for f in fs:
            self.f.append(tuple(i + k for k in f))
            self.s.append(SW[sw])

    def tris(self):
        return sum(len(f) - 2 for f in self.f)


MAT = None


def make_material():
    global MAT
    for name, kind in (("T_MAP_PALETTE", bpy.data.images), ("M_MAP", bpy.data.materials)):
        if name in kind:
            kind.remove(kind[name])
    arr = np.ones((TEX, TEX, 4), dtype=np.float32)
    cell = TEX // CELLS
    for i, key in enumerate(NAMES):
        cx, cy = i % CELLS, i // CELLS
        arr[cy * cell:(cy + 1) * cell, cx * cell:(cx + 1) * cell, :3] = PAL[key]
    img = bpy.data.images.new("T_MAP_PALETTE", TEX, TEX, alpha=False)
    img.pixels.foreach_set(arr.ravel())
    img.filepath_raw = os.path.join(DIR, "21.3 T_MAP_PALETTE.png")
    img.file_format = "PNG"
    img.save()
    img.pack()
    MAT = bpy.data.materials.new("M_MAP")
    MAT.use_nodes = True
    nt = MAT.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest"
    nt.links.new(tex.outputs[0], bsdf.inputs[0])
    bsdf.inputs["Roughness"].default_value = 0.8


def finish(m, name, coll):
    if not m.f:
        return None
    me = bpy.data.meshes.new(name)
    me.from_pydata(m.v, [], m.f)
    me.update()
    uv = me.uv_layers.new(name="UVMap")
    data = []
    for f, s in zip(m.f, m.s):
        u, v = ((s % CELLS) + 0.5) / CELLS, ((s // CELLS) + 0.5) / CELLS
        data += [u, v] * len(f)
    uv.uv.foreach_set("vector", data)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    me.set_sharp_from_angle(angle=math.radians(40))
    me.materials.append(MAT)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


# ---------- thiết bị dùng chung ----------
def lattice(m, x, y, z0, z1, w, sw, pitch=4.0, leg=0.14, brace=0.06):
    h = w / 2
    cs = [(-h, -h), (h, -h), (h, h), (-h, h)]
    for cx, cy in cs:
        m.beam((x + cx, y + cy, z0), (x + cx, y + cy, z1), leg, sw)
    n = max(1, round((z1 - z0) / pitch))
    for k in range(n + 1):
        z = z0 + (z1 - z0) * k / n
        for i in range(4):
            a, b = cs[i], cs[(i + 1) % 4]
            m.beam((x + a[0], y + a[1], z), (x + b[0], y + b[1], z), brace, sw)
            if k < n:
                z2 = z0 + (z1 - z0) * (k + 1) / n
                p, q = (a, b) if k % 2 == 0 else (b, a)
                m.beam((x + p[0], y + p[1], z), (x + q[0], y + q[1], z2), brace, sw)


def tower_crane(m, x, y, h, jib, deg):
    with at(x, y, 0):
        m.box(-2.6, 2.6, -2.6, 2.6, 0, 0.7, "concrete_dk")
        lattice(m, 0, 0, 0.7, h, 1.9, "crane", 4.0, 0.18, 0.07)
    with at(x, y, deg):
        z = h + 1.3
        m.box(-1.3, 1.3, -1.3, 1.3, h, z, "crane")
        m.box(0.2, 2.0, -2.0, -1.0, h - 1.4, h + 1.1, "cab")
        m.box(0.3, 1.9, -2.03, -1.97, h - 0.5, h + 0.7, "glass_dk")
        n = round(jib / 4)
        for side in (-0.75, 0.75):
            m.beam((1, side, z), (jib, side, z), 0.14, "crane")
        m.beam((1, 0, z + 1.6), (jib, 0, z + 0.3), 0.14, "crane")
        for k in range(n):
            x0 = 1 + (jib - 1) * k / n
            x1 = 1 + (jib - 1) * (k + 1) / n
            ztop0 = z + 1.6 - 1.3 * k / n
            ztop1 = z + 1.6 - 1.3 * (k + 1) / n
            for side in (-0.75, 0.75):
                m.beam((x0, side, z), ((x0 + x1) / 2, 0, (ztop0 + ztop1) / 2), 0.06, "crane")
                m.beam(((x0 + x1) / 2, 0, (ztop0 + ztop1) / 2), (x1, side, z), 0.06, "crane")
            m.beam((x1, -0.75, z), (x1, 0.75, z), 0.05, "crane")
        cj = jib * 0.32
        m.box(-cj, -1, -0.8, 0.8, z, z + 0.45, "crane")
        m.box(-cj, -cj + 3.6, -1.1, 1.1, z - 2.2, z, "weight")
        top = z + 8.5
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            m.beam((sx * 1.0, sy * 1.0, z), (0, 0, top), 0.14, "crane")
        m.beam((0, 0, top), (jib * 0.62, 0, z + 0.9), 0.05, "steel_dk")
        m.beam((0, 0, top), (jib * 0.28, 0, z + 1.3), 0.05, "steel_dk")
        m.beam((0, 0, top), (-cj + 1, 0, z + 0.45), 0.05, "steel_dk")
        m.box(jib - 0.8, jib, -0.9, 0.9, z - 0.15, z + 0.25, "crane_red")
        hx = jib * 0.62
        hz = h * 0.56
        m.box(hx - 0.8, hx + 0.8, -0.9, 0.9, z - 0.35, z, "machine_dk")
        m.beam((hx, 0, z - 0.3), (hx, 0, hz), 0.04, "steel_dk")
        m.box(hx - 0.3, hx + 0.3, -0.2, 0.2, hz - 0.8, hz, "crane")
        for i in range(-3, 4):
            m.beam((hx - 3, i * 0.11, hz - 1.5), (hx + 3, i * 0.11, hz - 1.5), 0.04, "rebar")
        m.beam((hx, 0, hz - 0.8), (hx - 2, 0.2, hz - 1.5), 0.02, "steel_dk")
        m.beam((hx, 0, hz - 0.8), (hx + 2, -0.2, hz - 1.5), 0.02, "steel_dk")


def wheel(m, x, y, r=0.55, w=0.4, z=None):
    z = r if z is None else z
    m.cyl((x, y - w / 2, z), (x, y + w / 2, z), r, "tire", n=10)
    m.cyl((x, y + w / 2, z), (x, y + w / 2 + 0.01, z), r * 0.55, "hub", n=8, caps=True)
    m.cyl((x, y - w / 2, z), (x, y - w / 2 - 0.01, z), r * 0.55, "hub", n=8, caps=True)


def truck_base(m, cab_col):
    m.box(-3.4, 3.4, -1.0, 1.0, 0.75, 1.15, "machine_dk")
    m.box(2.0, 3.8, -1.2, 1.2, 1.1, 3.1, cab_col)
    m.box(3.78, 3.82, -1.05, 1.05, 2.1, 2.95, "glass_dk")
    for sx in (-1, 1):
        m.box(2.3, 3.5, sx * 1.2 - 0.02, sx * 1.2 + 0.02, 2.1, 2.95, "glass_dk")
    for wx in (3.0, -1.6, -3.0):
        for sy in (-1.05, 1.05):
            wheel(m, wx, sy, 0.52, 0.4)


def dump_truck(m, x, y, deg, raised=False):
    with at(x, y, deg):
        truck_base(m, "truck_w")
        m.box(-3.7, 1.8, -1.25, 1.25, 1.15, 2.7, "truck_b")
        m.box(-3.6, 1.7, -1.1, 1.1, 2.7, 3.05, "dirt")


def mixer(m, x, y, deg):
    with at(x, y, deg):
        truck_base(m, "truck_b")
        m.cyl((-3.5, 0, 2.0), (-1.0, 0, 2.6), 0.75, "cont_gray", n=14, r1=1.3)
        m.cyl((-1.0, 0, 2.6), (1.7, 0, 3.0), 1.3, "cont_gray", n=14, r1=0.55)
        for wx, h in ((-3, 2.1), (1.4, 2.6)):
            m.box(wx - 0.1, wx + 0.1, -0.9, 0.9, 1.15, h, "machine_dk")


def loader(m, x, y, deg):
    with at(x, y, deg):
        for wx in (1.6, -1.6):
            for sy in (-1.25, 1.25):
                wheel(m, wx, sy, 0.95, 0.75)
        m.box(-3, 0.3, -1.1, 1.1, 1.0, 2.2, "machine")
        m.box(0.3, 2.4, -1.0, 1.0, 1.0, 1.9, "machine")
        m.box(-1.4, 0.3, -0.95, 0.95, 2.2, 3.9, "glass_dk")
        m.box(-1.5, 0.4, -1.05, 1.05, 3.85, 4.05, "machine")
        for sy in (-0.65, 0.65):
            m.beam((1.8, sy, 2.0), (4.5, sy, 1.0), 0.26, "machine")
        m.box(4.3, 5.6, -1.6, 1.6, 0.3, 1.4, "machine_dk")


def excavator(m, x, y, deg, z=0.0):
    with at(x, y, deg):
        for sy in (-1.3, 1.3):
            m.box(-2.3, 2.3, sy - 0.35, sy + 0.35, z, z + 0.85, "tire")
        m.box(-2.0, 1.4, -1.25, 1.25, z + 0.85, z + 2.1, "machine")
        m.box(0.2, 1.5, 0.1, 1.2, z + 2.1, z + 3.2, "glass_dk")
        m.box(0.1, 1.6, 0.0, 1.3, z + 3.2, z + 3.32, "machine")
        m.beam((1.0, -0.4, z + 1.6), (3.9, -0.4, z + 4.5), 0.42, "machine")
        m.beam((3.9, -0.4, z + 4.5), (6.0, -0.4, z + 1.6), 0.3, "machine")
        m.box(5.6, 6.8, -0.95, 0.15, z + 0.7, z + 1.6, "machine_dk")


def mobile_crane(m, x, y, deg, boom, ang, load_key=None):
    with at(x, y, deg):
        m.box(-5.0, 5.0, -1.25, 1.25, 1.0, 1.9, "crane")
        m.box(3.2, 5.0, -1.25, 1.25, 1.9, 3.3, "crane")
        m.box(4.98, 5.02, -1.0, 1.0, 2.2, 3.1, "glass_dk")
        for wx in (-3.8, -2.2, 2.0, 3.6):
            for sy in (-1.15, 1.15):
                wheel(m, wx, sy, 0.62, 0.45)
        for ox in (-3.8, 3.0):
            for sy in (-1, 1):
                m.beam((ox, sy * 1.2, 1.2), (ox, sy * 3.3, 0.5), 0.26, "crane_red")
                m.box(ox - 0.35, ox + 0.35, sy * 3.3 - 0.35, sy * 3.3 + 0.35, 0.0, 0.25, "steel_dk")
        m.box(-3.2, 1.2, -1.1, 1.1, 1.9, 2.8, "crane")
        m.box(-3.2, -1.7, -1.1, 1.1, 2.8, 4.0, "weight")
        r = math.radians(ang)
        tip = (-1.0 + boom * math.cos(r), 0.0, 2.8 + boom * math.sin(r))
        m.beam((-1.0, 0, 2.8), tip, 0.62, "crane")
        m.beam(tip, (tip[0], 0, 2.6), 0.04, "steel_dk")
        return tip


def rebar_bundle(m, x, y, deg, l=9, n=6, z=0.12):
    with at(x, y, deg):
        for sy in (-0.7, 0.7):
            m.box(-l * 0.3 - 0.1, -l * 0.3 + 0.1, sy - 0.5, sy + 0.5, 0, 0.1, "pallet")
        for i in range(n):
            yy = (i - n / 2) * 0.12
            m.beam((-l / 2, yy, z + 0.08), (l / 2, yy, z + 0.08), 0.06, "rebar")


def pipe_stack(m, x, y, deg, l=6, r=0.3, rows=3, sw="concrete_dk"):
    with at(x, y, deg):
        for row in range(rows):
            for i in range(rows - row):
                ix = (i - (rows - row - 1) / 2) * (2 * r + 0.02)
                z = r + row * r * 1.75
                m.cyl((ix, -l / 2, z), (ix, l / 2, z), r, sw, n=10, double=False)


def brick_pallet(m, x, y, n=1):
    for i in range(n):
        xx = x + i * 1.6
        m.box(xx - 0.6, xx + 0.6, y - 0.5, y + 0.5, 0, 0.12, "pallet")
        m.box(xx - 0.55, xx + 0.55, y - 0.45, y + 0.45, 0.12, 1.0, "brick")


def bags(m, x, y):
    m.box(x - 0.7, x + 0.7, y - 0.6, y + 0.6, 0, 0.12, "pallet")
    m.box(x - 0.62, x + 0.62, y - 0.52, y + 0.52, 0.12, 0.85, "bag")


def form_stack(m, x, y):
    m.box(x - 1.3, x + 1.3, y - 0.65, y + 0.65, 0, 0.5, "formwork")


def cone(m, x, y):
    m.cyl((x, y, 0.0), (x, y, 0.7), 0.17, "cone", n=6, r1=0.03, caps=False)
    m.box(x - 0.2, x + 0.2, y - 0.2, y + 0.2, 0, 0.04, "tire")


def light_tower(m, x, y):
    m.box(x - 1, x + 1, y - 0.6, y + 0.6, 0.3, 1.2, "machine")
    m.cyl((x, y, 1.2), (x, y, 8.5), 0.06, "steel_dk", n=6)
    m.box(x - 0.8, x + 0.8, y - 0.1, y + 0.1, 8.5, 9.0, "white")


def lot_edge(m, x0, x1, y, z0=0.0, h=2.5):
    n = max(1, round((x1 - x0) / 5))
    for k in range(n):
        a = x0 + (x1 - x0) * k / n
        b = x0 + (x1 - x0) * (k + 1) / n
        m.box(a, b, y - 0.05, y + 0.05, z0, z0 + h - 0.35, "hoard")
        m.box(a, b, y - 0.06, y + 0.06, z0 + h - 0.35, z0 + h, "hoard_top")
        m.box(a - 0.06, a + 0.06, y - 0.2, y + 0.2, z0, z0 + h + 0.05, "steel_dk")


class Site:
    def __init__(self, code, cx, cy, rot, title, coll_root):
        self.code, self.cx, self.cy, self.rot, self.title = code, cx, cy, rot, title
        self.coll = bpy.data.collections.new(code)
        coll_root.children.link(self.coll)
        self.parts = {}

    def b(self, key):
        return self.parts.setdefault(key, M())

    def done(self):
        total = 0
        for key, m in self.parts.items():
            finish(m, f"{self.code}_{key}", self.coll)
            total += m.tris()
        print(self.code, self.title, "tam giac", total, "doi tuong", len(self.parts))
        return total


# ---------- phòng ban ----------
def office(m, x, y, w, d, h, z0, label, body="cont_white", roof="roof", ground=True):
    with at(x, y):
        base = z0 + (0.25 if ground else 0.0)
        if ground:
            for sx in (-w / 2 + 0.5, w / 2 - 0.5):
                m.box(sx - 0.3, sx + 0.3, -d / 2, d / 2, z0, base, "concrete_dk")
        m.box(-w / 2, w / 2, -d / 2, d / 2, base, base + h, body, bottom=True)
        m.box(-w / 2 - 0.15, w / 2 + 0.15, -d / 2 - 0.15, d / 2 + 0.15, base + h, base + h + 0.12, roof)
        fy = -d / 2
        dx = -w * 0.3 if w > 5 else 0.0
        m.box(dx - 0.53, dx + 0.53, fy - 0.03, fy, base, base + 2.18, "frame")
        m.box(dx - 0.47, dx + 0.47, fy - 0.05, fy, base, base + 2.1, "door")
        m.box(dx + 0.3, dx + 0.4, fy - 0.1, fy - 0.05, base + 1.0, base + 1.06, "hub")
        windows = [w * 0.05, w * 0.3] if w > 5 else []
        for wx in windows:
            m.box(wx - 0.75, wx + 0.75, fy - 0.03, fy, base + 0.95, base + 2.15, "frame")
            m.box(wx - 0.68, wx + 0.68, fy - 0.05, fy, base + 1.02, base + 2.08, "glass")
        bw = min(w * 0.72, max(2.6, 0.26 * len(label) + 0.7))
        sx = 0.0 if w <= 5 else w * 0.12
        m.box(sx - bw / 2, sx + bw / 2, fy - 0.07, fy, base + h - 0.56, base + h - 0.06, "sign_blue")
        m.text(label, sx, fy - 0.075, base + h - 0.31, min(0.32, (bw - 0.2) / max(1, len(label) * 0.6)), "white")
        if w > 5:
            m.box(w * 0.42 - 0.45, w * 0.42 + 0.45, fy - 0.3, fy, base + 1.7, base + 2.3, "white")
        if ground:
            m.box(dx - 0.8, dx + 0.8, fy - 0.9, fy, z0, base - 0.06, "concrete")
            m.box(dx - 0.8, dx + 0.8, fy - 1.2, fy - 0.9, z0, z0 + 0.1, "concrete")


def stair_flight(m, x, y0, y1, z0, z1, w=1.0):
    n = max(4, round((z1 - z0) / 0.19))
    for i in range(n):
        t = i / n
        y = y0 + (y1 - y0) * t
        z = z0 + (z1 - z0) * (i + 1) / n
        m.box(x - w / 2, x + w / 2, y - 0.14, y + 0.14, z - 0.04, z, "steel_dk")
    for sx in (-w / 2, w / 2):
        m.beam((x + sx, y0, z0), (x + sx, y1, z1), 0.09, "steel_dk")
        m.beam((x + sx, y0, z0 + 1.05), (x + sx, y1, z1 + 1.05), 0.04, "cont_orange")
        m.beam((x + sx, y0, z0), (x + sx, y0, z0 + 1.05), 0.04, "cont_orange")


def camp(s, x0=-42.0, y_a=-20.0, y_b=-31.5):
    upper = [("P. AN TOÀN", "cont_green"), ("PHÒNG HỌP", "cont_white"), ("P. VẬT TƯ", "cont_gray")]
    lower = [("BAN CHỈ HUY", "cont_blue"), ("P. KỸ THUẬT", "cont_white"), ("P. QS - HỢP ĐỒNG", "cont_gray")]
    front = [("NHÀ ĂN", "cont_orange"), ("Y TẾ", "cont_white"), ("KHO", "cont_gray")]
    w, d, h = 9.0, 3.2, 3.0
    def key(t):
        plain = unicodedata.normalize("NFD", t.upper().replace("Đ", "D"))
        plain = "".join(c for c in plain if not unicodedata.combining(c))
        plain = "".join(c for c in plain.replace(" ", "_") if c.isalnum() or c == "_")
        while "__" in plain:
            plain = plain.replace("__", "_")
        return "PB_" + plain
    for i, ((a, ca), (b, cb), (c, cc)) in enumerate(zip(lower, upper, front)):
        x = x0 + i * (w + 0.6)
        office(s.b(key(a)), x, y_a, w, d, h, 0.0, a, ca)
        office(s.b(key(b)), x, y_a, w, d, h, 3.4, b, cb, ground=False)
        office(s.b(key(c)), x, y_b, w, d, h, 0.0, c, cc)
    m = s.b("PB_LOI_DI")
    x1 = x0 + 2 * (w + 0.6) + w / 2
    yf = y_a - d / 2
    m.box(x0 - w / 2 - 1.5, x1, yf - 1.3, yf, 3.27, 3.4, "steel_dk", bottom=True)
    n = 12
    for k in range(n + 1):
        px = x0 - w / 2 - 1.5 + (x1 - x0 + w / 2 + 1.5) * k / n
        m.beam((px, yf - 1.28, 3.4), (px, yf - 1.28, 4.45), 0.05, "cont_orange")
        if k % 3 == 0:
            m.beam((px, yf - 1.25, 0.0), (px, yf - 1.25, 3.3), 0.1, "steel_dk")
    m.beam((x0 - w / 2 - 1.5, yf - 1.28, 4.45), (x1, yf - 1.28, 4.45), 0.05, "cont_orange")
    stair_flight(m, x0 - w / 2 - 0.9, yf - 5.4, yf - 0.1, 0.0, 3.4)
    # cột cờ, bảng khẩu hiệu
    for i, c in enumerate(["crane_red", "sign_blue"]):
        fx = x0 + 30 + i * 2.2
        m.cyl((fx, y_b - 1.0, 0), (fx, y_b - 1.0, 8.0), 0.05, "hub", n=6)
        m.box(fx, fx + 1.5, y_b - 1.02, y_b - 0.98, 6.9, 7.9, c)
    bx = x0 + 30.0
    m.box(bx - 5, bx + 5, y_b + 6.0, y_b + 6.08, 1.0, 3.0, "sign")
    m.box(bx - 5, bx - 4.85, y_b + 5.98, y_b + 6.1, 0, 3.0, "steel_dk")
    m.box(bx + 4.85, bx + 5, y_b + 5.98, y_b + 6.1, 0, 3.0, "steel_dk")
    m.text("AN TOÀN LÀ TRÊN HẾT", bx, y_b + 5.99, 2.0, 0.62, "sign_red")


def lot(s, pit=None, ground="dirt"):
    n = s.b("NEN")
    X0, X1, Y0, Y1 = -50.0, 50.0, -40.0, 40.0
    if pit:
        px0, px1, py0, py1 = pit
        for a in [(X0, px0, Y0, Y1), (px1, X1, Y0, Y1), (px0, px1, Y0, py0), (px0, px1, py1, Y1)]:
            n.quad((a[0], a[2], 0.02), (a[1], a[2], 0.02), (a[1], a[3], 0.02), (a[0], a[3], 0.02), ground)
    else:
        n.quad((X0, Y0, 0.02), (X1, Y0, 0.02), (X1, Y1, 0.02), (X0, Y1, 0.02), ground)
    # bãi sỏi quanh khu văn phòng và đường vào
    n.quad((-50, -40, 0.04), (-18, -40, 0.04), (-18, -11, 0.04), (-50, -11, 0.04), "gravel")
    n.quad((-5, -40, 0.05), (5, -40, 0.05), (5, -2, 0.05), (-5, -2, 0.05), "gravel")
    h = s.b("RANH_GIOI")
    lot_edge(h, X0, -6, Y0)
    lot_edge(h, 6, X1, Y0)
    lot_edge(h, X0, X1, Y1)
    with at(X0, 0, -90):
        lot_edge(h, -40, 40, 0)
    with at(X1, 0, 90):
        lot_edge(h, -40, 40, 0)
    for sx in (-6, 6):
        h.box(sx - 0.25, sx + 0.25, Y0 - 0.25, Y0 + 0.25, 0, 6.2, "steel_blue")
    h.box(-6.3, 6.3, Y0 - 0.2, Y0 + 0.2, 5.0, 6.2, "sign_blue")
    h.text(s.title, 0, Y0 - 0.215, 5.6, min(0.72, 11.5 / max(1, len(s.title) * 0.62)), "white")
    office(s.b("PB_BAO_VE"), 9.0, Y0 + 3.0, 3.2, 2.6, 2.7, 0.0, "BẢO VỆ", "cont_white", "cont_orange")
    h.box(-5.5, 5.5, Y0 - 0.08, Y0 + 0.08, 0.8, 0.95, "barrier")
    camp(s)


def scaffold(m, net, x0, x1, z0, z1, y=-1.1, bay=2.5, lift=2.5, net_to=None):
    nx = max(1, round((x1 - x0) / bay))
    nz = max(1, round((z1 - z0) / lift))
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx
        m.beam((x, y, z0), (x, y, z1), 0.08, "scaffold")
        if i % 2 == 0:
            m.beam((x, y + 0.85, z0), (x, y + 0.85, z1), 0.07, "scaffold")
    for k in range(nz + 1):
        z = z0 + (z1 - z0) * k / nz
        m.beam((x0, y, z), (x1, y, z), 0.06, "scaffold")
        if k % 2 == 0:
            m.box(x0, x1, y + 0.1, y + 0.8, z, z + 0.05, "plank")
    for i in range(0, nx, 3):
        x = x0 + (x1 - x0) * i / nx
        x2 = x0 + (x1 - x0) * min(i + 2, nx) / nx
        for k in range(0, nz, 2):
            z = z0 + (z1 - z0) * k / nz
            z2 = z0 + (z1 - z0) * min(k + 2, nz) / nz
            m.beam((x, y, z), (x2, y, z2), 0.05, "scaffold")
    if net_to:
        net.quad((x0, y - 0.05, z0), (x1, y - 0.05, z0), (x1, y - 0.05, net_to), (x0, y - 0.05, net_to), "net")
        net.quad((x1, y - 0.04, z0), (x0, y - 0.04, z0), (x0, y - 0.04, net_to), (x1, y - 0.04, net_to), "net")


def sides(w, d):
    return [(0, -d / 2, 0, w), (w / 2, 0, 90, d), (0, d / 2, 180, w), (-w / 2, 0, -90, d)]


def wall_bay(m, a, b, z, h, mode, wall="plaster"):
    t = 0.2
    sill, head = 0.9, 2.45
    if mode == "glass":
        m.box(a, b, -0.16, -0.02, z, z + h, "glass")
        m.box(a - 0.03, a + 0.03, -0.2, -0.14, z, z + h, "frame")
        m.box(a, b, -0.2, -0.14, z - 0.04, z + 0.04, "frame")
        m.box(a + (b - a) / 2 - 0.02, a + (b - a) / 2 + 0.02, -0.19, -0.15, z, z + h, "frame")
        return
    pier = (b - a) * 0.2
    col = wall if mode == "window" else "brick"
    m.box(a, a + pier, -t / 2, t / 2, z, z + h, col)
    m.box(b - pier, b, -t / 2, t / 2, z, z + h, col)
    m.box(a + pier, b - pier, -t / 2, t / 2, z, z + sill, col)
    m.box(a + pier, b - pier, -t / 2, t / 2, z + head, z + h, col)
    if mode == "window":
        m.box(a + pier, b - pier, -0.06, 0.02, z + sill, z + head, "glass")
        m.box(a + pier, b - pier, -0.09, -0.03, z + sill - 0.04, z + sill + 0.03, "frame")
        m.box(a + pier, b - pier, -0.09, -0.03, z + head - 0.03, z + head + 0.04, "frame")
        mid = (a + b) / 2
        m.box(mid - 0.03, mid + 0.03, -0.09, -0.03, z + sill, z + head, "frame")


def rc_building(s, cx, cy, nx, ny, bay, floors, fh, mode_of, key="KET_CAU", accent=False):
    m = s.b(key)
    w, d = nx * bay, ny * bay
    with at(cx, cy):
        m.box(-w / 2 - 0.5, w / 2 + 0.5, -d / 2 - 0.5, d / 2 + 0.5, 0, 0.3, "concrete_dk")
        for f in range(floors):
            z = 0.3 + f * fh
            for i in range(nx + 1):
                for j in range(ny + 1):
                    x, y = -w / 2 + i * bay, -d / 2 + j * bay
                    m.box(x - 0.3, x + 0.3, y - 0.3, y + 0.3, z, z + fh - 0.25, "concrete", top=False)
            m.box(-w / 2 - 0.4, w / 2 + 0.4, -d / 2 - 0.4, d / 2 + 0.4, z + fh - 0.25, z + fh, "concrete", bottom=True)
            mode = mode_of(f)
            if mode:
                for sx, sy, deg, l in sides(w, d):
                    n = round(l / bay)
                    with at(sx, sy, deg):
                        for b_i in range(n):
                            a = -l / 2 + b_i * bay + 0.3
                            wall_bay(m, a, a + bay - 0.6, z, fh - 0.25, mode)
        top = 0.3 + floors * fh
        # lõi thang bộ - thang máy
        cw, cd = min(5.0, bay * 0.9), min(4.0, bay * 0.8)
        h_core = top + 2.8
        m.box(-cw / 2 - 0.25, -cw / 2, -cd / 2, cd / 2, 0.3, h_core, "concrete_dk")
        m.box(cw / 2, cw / 2 + 0.25, -cd / 2, cd / 2, 0.3, h_core, "concrete_dk")
        m.box(-cw / 2, cw / 2, cd / 2, cd / 2 + 0.25, 0.3, h_core, "concrete_dk")
        # cột chờ và thép chờ tầng trên cùng
        r = s.b("THEP_CHO")
        for i in range(nx + 1):
            for j in range(ny + 1):
                x, y = -w / 2 + i * bay, -d / 2 + j * bay
                m.box(x - 0.3, x + 0.3, y - 0.3, y + 0.3, top, top + 1.2, "concrete")
                for a, b in ((-0.2, -0.2), (0.2, -0.2), (0.2, 0.2), (-0.2, 0.2)):
                    r.beam((x + a, y + b, top + 1.2), (x + a, y + b, top + 2.5), 0.05, "rebar")
                r.beam((x - 0.2, y - 0.2, top + 2.0), (x + 0.2, y - 0.2, top + 2.0), 0.03, "rebar")
                r.beam((x - 0.2, y + 0.2, top + 2.0), (x + 0.2, y + 0.2, top + 2.0), 0.03, "rebar")
        # lan can biên sàn trên cùng
        e = s.b("LAN_CAN")
        for sx, sy, deg, l in sides(w + 0.7, d + 0.7):
            with at(sx, sy, deg):
                k = max(1, round(l / 2.5))
                for q in range(k + 1):
                    px = -l / 2 + l * q / k
                    e.beam((px, 0, top), (px, 0, top + 1.1), 0.05, "barrier")
                e.beam((-l / 2, 0, top + 1.1), (l / 2, 0, top + 1.1), 0.05, "barrier")
                e.beam((-l / 2, 0, top + 0.55), (l / 2, 0, top + 0.55), 0.04, "barrier")
        # ván khuôn sàn đang làm ở một góc
        fx0, fx1 = 0.0, w / 2 + 0.4
        m.box(fx0, fx1, -d / 2 - 0.4, 0.0, top + 2.15, top + 2.25, "formwork")
        for xi in np.arange(fx0 + 0.6, fx1, 1.5):
            for yi in np.arange(-d / 2, 0.0, 1.5):
                m.beam((float(xi), float(yi), top), (float(xi), float(yi), top + 2.15), 0.05, "prop")
        return top


def hoist(m, x, y, h):
    lattice(m, x, y, 0.3, h, 0.9, "scaffold", 3.0, 0.08, 0.04)
    z = h * 0.55
    m.box(x - 1.3, x + 1.3, y - 2.6, y - 0.6, z, z + 2.3, "crane")
    m.box(x - 1.32, x + 1.32, y - 2.2, y - 1.0, z + 1.0, z + 2.0, "glass_dk")
    m.box(x - 2, x + 2, y - 3.0, y + 1.0, 0, 0.3, "concrete_dk")


# ---------- 6 dự án ----------
def da1(s):
    lot(s)
    g, t, v = s.b("GIAN_GIAO"), s.b("THIET_BI"), s.b("VAT_TU")
    def m_a(f):
        return "window" if f < 6 else "brick" if f < 11 else None
    def m_b(f):
        return "brick" if f < 4 else None
    top = rc_building(s, 2.0, 14.0, 4, 3, 6.0, 16, 3.3, m_a)
    top2 = rc_building(s, 34.0, 14.0, 4, 3, 6.0, 9, 3.3, m_b)
    net = s.b("LUOI_AN_TOAN")
    for sx, sy, deg, l in sides(24.8, 18.8):
        with at(2.0 + sx, 14.0 + sy, deg):
            scaffold(g, net, -l / 2, l / 2, 0.3, top - 6, y=-1.1, net_to=top * 0.34 if deg == -90 else None)
    for sx, sy, deg, l in sides(24.8, 18.8):
        with at(34.0 + sx, 14.0 + sy, deg):
            scaffold(g, net, -l / 2, l / 2, 0.3, top2, y=-1.1)
    tower_crane(t, 18.0, 14.0, 72.0, 46.0, 28.0)
    hoist(t, 2.0, 3.7, top - 3.0)
    mixer(t, 0.0, -14.0, 90.0)
    dump_truck(t, 28.0, -22.0, 180.0)
    light_tower(t, 18.0, -6.0)
    rebar_bundle(v, 25.0, -9.0, 0, 11, 7)
    rebar_bundle(v, 35.0, -9.0, 8, 9, 6)
    brick_pallet(v, 26.0, -16.0, 5)
    bags(v, 40.0, -16.0)
    bags(v, 42.0, -16.0)
    form_stack(v, 40.0, -22.0)
    form_stack(v, 44.0, -24.0)
    pipe_stack(v, 12.0, -14.0, 90.0, 5.0, 0.22, 3, "pipe_g")
    for i in range(5):
        cone(t, -3.5 + i * 1.8, -4.5)


def da2(s):
    lot(s)
    g, t, v = s.b("GIAN_GIAO"), s.b("THIET_BI"), s.b("VAT_TU")
    def mode(f):
        return "glass" if f < 4 else "brick" if f < 7 else None
    top = rc_building(s, 18.0, 12.0, 4, 4, 7.0, 10, 3.9, mode)
    tower_crane(t, 40.0, 12.0, 58.0, 42.0, 200.0)
    net = s.b("LUOI_AN_TOAN")
    with at(18.0 + 28.8 / 2 + 0.0, 12.0, 90):
        scaffold(g, net, -14.4, 14.4, 4 * 3.9, top, y=-1.1, net_to=top - 2.0)
    with at(18.0, 12.0 - 14.4, 0):
        scaffold(g, net, -14.4, 14.4, 7 * 3.9, top, y=-1.1)
    hoist(t, 18.0, -3.3, top - 2.0)
    mobile_crane(t, -8.0, 12.0, 90.0, 26.0, 62.0)
    mixer(t, 12.0, -22.0, 180.0)
    v.box(25.0, 33.0, -20.0, -16.0, 0, 0.2, "pallet")
    for i in range(10):
        v.box(25.5 + i * 0.75, 25.8 + i * 0.75, -18.5, -17.5, 0.2, 3.2, "glass")
    rebar_bundle(v, 40.0, -14.0, 90.0, 10, 7)
    form_stack(v, 40.0, -30.0)
    bags(v, 30.0, -28.0)
    brick_pallet(v, 24.0, -30.0, 4)


def da3(s):
    lot(s)
    k, t, v = s.b("KHUNG_THEP"), s.b("THIET_BI"), s.b("VAT_TU")
    x0, x1, h, ridge = 5.0, 35.0, 9.0, 12.5
    n = s.b("NEN")
    n.quad((x0 - 1, -28, 0.08), (x1 + 1, -28, 0.08), (x1 + 1, 26, 0.08), (x0 - 1, 26, 0.08), "blinding")
    ys = [-26.0 + 6.0 * i for i in range(10)]
    for i, y in enumerate(ys):
        for x in (x0, x1):
            k.box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 0, 0.5, "concrete_dk")
        if i >= 7:
            for x in (x0, x1):
                for a, b in ((-0.25, -0.25), (0.25, -0.25), (0.25, 0.25), (-0.25, 0.25)):
                    k.beam((x + a, y + b, 0.5), (x + a, y + b, 0.95), 0.05, "steel_dk")
            continue
        for x in (x0, x1):
            k.box(x - 0.25, x + 0.25, y - 0.15, y + 0.15, 0.5, h, "steel_blue")
        mid = (x0 + x1) / 2
        k.beam((x0, y, h + 0.15), (mid, y, ridge), 0.42, "steel_blue")
        k.beam((x1, y, h + 0.15), (mid, y, ridge), 0.42, "steel_blue")
    for i in range(6):
        y0, y1 = ys[i], ys[i + 1]
        for j in range(0, 11):
            t2 = j / 10
            for sgn in (0, 1):
                xa = x0 + (20 * 0) if False else None
            xl = x0 + (15.0 * t2)
            xr = x1 - (15.0 * t2)
            z = h + 0.5 + (ridge - h) * t2
            k.beam((xl, y0, z), (xl, y1, z), 0.1, "steel_dk")
            k.beam((xr, y0, z), (xr, y1, z), 0.1, "steel_dk")
    mid = (x0 + x1) / 2
    roof_end = ys[4]
    for xa, xb in ((x0 - 0.3, mid), (x1 + 0.3, mid)):
        for yy, flip in ((1, False), (0, True)):
            k.quad((xa, ys[0], h + 0.6 + 0.05 * yy), (xb, ys[0], ridge + 0.4), (xb, roof_end, ridge + 0.4), (xa, roof_end, h + 0.6 + 0.05 * yy), "roof") if (xa < xb) ^ flip else k.quad((xb, ys[0], ridge + 0.4), (xa, ys[0], h + 0.6 + 0.05 * yy), (xa, roof_end, h + 0.6 + 0.05 * yy), (xb, roof_end, ridge + 0.4), "roof")
    # tường tôn một đoạn
    k.box(x0 - 0.3, x0 - 0.15, ys[0], ys[3], 0.3, h, "cont_white")
    k.box(x1 + 0.15, x1 + 0.3, ys[0], ys[3], 0.3, h, "cont_white")
    tip = mobile_crane(t, -10.0, 8.0, 0.0, 22.0, 66.0)
    t.beam((-8.0, 7.0, 9.0), (2.0, 7.0, 9.0), 0.0, "steel_dk")
    with at(-10.0, 8.0):
        t.box(tip[0] - 0.2, tip[0] + 0.2, -0.2, 0.2, 12.2, 12.8, "crane")
        t.beam((tip[0] - 7, 0, 11.4), (tip[0] + 7, 0, 11.4), 0.42, "steel_blue")
        t.beam((tip[0], 0, 12.4), (tip[0] - 6, 0, 11.5), 0.03, "steel_dk")
        t.beam((tip[0], 0, 12.4), (tip[0] + 6, 0, 11.5), 0.03, "steel_dk")
    for i in range(3):
        for j in range(3):
            v.beam((42.0, -24 + i * 1.0, 0.25 + j * 0.45), (42.0, -12 + i * 1.0, 0.25 + j * 0.45), 0.4, "steel_blue")
    for i in range(6):
        v.box(38.0, 46.0, 1 + i * 1.3, 2 + i * 1.3, 0, 0.35, "roof")
    dump_truck(t, -12.0, -5.0, 90.0)
    light_tower(t, 2.0, 30.0)


def da4(s):
    px0, px1, py0, py1 = -14.0, 44.0, -20.0, 30.0
    depth = -7.0
    lot(s, (px0, px1, py0, py1))
    k, t, v = s.b("TANG_HAM"), s.b("THIET_BI"), s.b("VAT_TU")
    n = s.b("NEN")
    n.quad((px0, py0, depth), (px1, py0, depth), (px1, py1, depth), (px0, py1, depth), "dirt_dark")
    n.quad((px0 + 18, py0 + 4, depth + 0.06), (px1 - 2, py0 + 4, depth + 0.06), (px1 - 2, py1 - 3, depth + 0.06), (px0 + 18, py1 - 3, depth + 0.06), "blinding")
    # tường cừ larsen so le
    def sheet(a, b, sign_y):
        l = b - a
        cnt = max(1, round(l / 0.6))
        for i in range(cnt):
            x, x2 = a + l * i / cnt, a + l * (i + 1) / cnt
            off0, off1 = (0.0, 0.22) if i % 2 == 0 else (0.22, 0.0)
            k.quad((x, off0, depth), (x2, off1, depth), (x2, off1, 0.5), (x, off0, 0.5), "steel_dk")
    ramp_y0, ramp_y1 = -18.0, -11.5
    with at(0, py0):
        sheet(px0, px1, 1)
    with at(0, py1, 180):
        sheet(-px1, -px0, 1)
    with at(px1, 0, 90):
        sheet(py0, py1, 1)
    with at(px0, 0, -90):
        sheet(-py1, -ramp_y1, 1)
        sheet(-ramp_y0, -py0, 1)
    def cap(a, b, c, d):
        k.box(a, b, c, d, 0.0, 0.75, "concrete_dk")
    cap(px0 - 0.5, px1 + 0.5, py0 - 0.7, py0)
    cap(px0 - 0.5, px1 + 0.5, py1, py1 + 0.7)
    cap(px1, px1 + 0.7, py0, py1)
    cap(px0 - 0.7, px0, ramp_y1, py1)
    # lan can miệng hố
    e = s.b("LAN_CAN")
    for (x0, y0, x1, y1) in [(px0 - 0.5, py0 - 0.6, px1 + 0.5, py0 - 0.6), (px0 - 0.5, py1 + 0.6, px1 + 0.5, py1 + 0.6), (px1 + 0.6, py0, px1 + 0.6, py1), (px0 - 0.6, ramp_y1, px0 - 0.6, py1)]:
        length = math.hypot(x1 - x0, y1 - y0)
        c = max(1, round(length / 2.5))
        for q in range(c + 1):
            px, py = x0 + (x1 - x0) * q / c, y0 + (y1 - y0) * q / c
            e.beam((px, py, 0.75), (px, py, 1.9), 0.05, "barrier")
        e.beam((x0, y0, 1.9), (x1, y1, 1.9), 0.05, "barrier")
        e.beam((x0, y0, 1.3), (x1, y1, 1.3), 0.05, "barrier")
    # dốc xuống hố
    rx1 = 12.0
    ramp = [(px0, ramp_y0, 0.04), (rx1, ramp_y0, depth + 0.1), (rx1, ramp_y1, depth + 0.1), (px0, ramp_y1, 0.04)]
    n.quad(*ramp, "gravel")
    n.face([W(px0, ramp_y0, 0.04), W(px0, ramp_y0, depth), W(rx1, ramp_y0, depth)][::-1], "dirt_dark")
    n.face([W(px0, ramp_y1, 0.04), W(rx1, ramp_y1, depth), W(px0, ramp_y1, depth)][::-1], "dirt_dark")
    n.quad((-50 + 36, -40, 0.05), (-5, -40, 0.05), (-5, -18, 0.05), (-14, -18, 0.05), "gravel") if False else None
    n.quad((-18, ramp_y0, 0.05), (px0, ramp_y0, 0.05), (px0, ramp_y1, 0.05), (-18, ramp_y1, 0.05), "gravel")
    n.quad((-5, -18, 0.05), (-5, -11.5, 0.05), (-18, -11.5, 0.05), (-18, -18, 0.05), "gravel")
    # hệ chống: dầm vòng và thanh chống ngang
    z_s = -2.2
    for x0, x1, y0, y1 in [(px0 + 0.2, px1 - 0.2, py0 + 0.25, py0 + 0.65), (px0 + 0.2, px1 - 0.2, py1 - 0.65, py1 - 0.25), (px1 - 0.65, px1 - 0.25, py0, py1), (px0 + 0.25, px0 + 0.65, ramp_y1, py1)]:
        k.box(x0, x1, y0, y1, z_s - 0.3, z_s + 0.3, "steel_dk")
    x = px0 + 18.0
    while x < px1 - 2:
        k.box(x - 0.2, x + 0.2, py0 + 0.6, py1 - 0.6, z_s - 0.2, z_s + 0.2, "machine")
        for y in (py0 + 16.0, py0 + 33.0):
            k.box(x - 0.15, x + 0.15, y - 0.15, y + 0.15, depth, z_s - 0.2, "steel_dk")
        x += 9.0
    # cột và lồng thép mọc từ đáy hố
    r = s.b("THEP_CHO")
    for i in range(6):
        for j in range(4):
            xc, yc = px0 + 22.0 + i * 6.0, py0 + 8.0 + j * 10.0
            k.box(xc - 1.1, xc + 1.1, yc - 1.1, yc + 1.1, depth, depth + 0.9, "concrete")
            tall = (i + j) % 3
            ztop = depth + 3.0 + tall * 3.4
            k.box(xc - 0.4, xc + 0.4, yc - 0.4, yc + 0.4, depth + 0.9, ztop, "concrete_dk")
            for a, b in ((-0.3, -0.3), (0.3, -0.3), (0.3, 0.3), (-0.3, 0.3), (0, -0.3), (0, 0.3), (-0.3, 0), (0.3, 0)):
                r.beam((xc + a, yc + b, ztop), (xc + a, yc + b, ztop + 3.6), 0.05, "rebar")
            for q in range(5):
                z = ztop + 0.5 + q * 0.7
                for u, v2, u2, v3 in ((-0.3, -0.3, 0.3, -0.3), (0.3, -0.3, 0.3, 0.3), (0.3, 0.3, -0.3, 0.3), (-0.3, 0.3, -0.3, -0.3)):
                    r.beam((xc + u, yc + v2, z), (xc + u2, yc + v3, z), 0.03, "rebar")
    # lưới thép sàn đáy một phần
    for i in range(30):
        y = 1.0 + i * 0.5
        r.beam((12.0, y, depth + 0.2), (30.0, y, depth + 0.2), 0.03, "rebar")
    for i in range(36):
        x = 12.0 + i * 0.5
        r.beam((x, 1.0, depth + 0.24), (x, 15.5, depth + 0.24), 0.03, "rebar")
    excavator(t, -2.0, 20.0, 40.0, z=depth)
    dump_truck(t, 2.0, -14.75, 0.0) if False else None
    with at(0, 0):
        dump_truck(t, -24.0, -14.75, 0.0)
    loader(t, 8.0, 8.0, 160.0) if False else None
    tower_crane(t, -20.0, 18.0, 44.0, 42.0, -15.0)
    v_s = s.b("VAT_TU")
    rebar_bundle(v_s, -8.0, -28.0, 0, 11, 7)
    rebar_bundle(v_s, 8.0, -30.0, 0, 11, 7)
    rebar_bundle(v_s, 24.0, -29.0, 0, 9, 6)
    pipe_stack(v_s, 38.0, -30.0, 0.0, 7.0, 0.5, 3)
    for i in range(8):
        cone(t, -13.0 + i * 1.6, -19.0)
    # bãi đất đào
    n.cyl((30.0, 36.0, 0.0), (30.0, 36.0, 2.6), 5.0, "dirt_dark", n=8, r1=0.9, caps=True)


def da5(s):
    lot(s, ground="gravel")
    k, t, v = s.b("TRAM_BIEN_AP"), s.b("THIET_BI"), s.b("VAT_TU")
    def mode(f):
        return "brick" if f == 0 else None
    top = rc_building(s, 32.0, -22.0, 3, 2, 5.0, 2, 3.6, mode, key="NHA_DIEU_KHIEN")
    net = s.b("LUOI_AN_TOAN")
    g = s.b("GIAN_GIAO")
    with at(32.0, -27.0, 0):
        scaffold(g, net, -7.9, 7.9, 0.3, top, y=-1.1)
    # giàn thanh cái
    mast_xs = [-14.0, 0.0, 14.0, 28.0, 42.0]
    for row_y, h in ((20.0, 11.0), (32.0, 8.0)):
        for x in mast_xs:
            k.box(x - 1.0, x + 1.0, row_y - 1.0, row_y + 1.0, 0, 0.5, "concrete_dk")
            lattice(k, x, row_y, 0.5, h, 0.9, "steel", 2.5, 0.09, 0.04)
        for i in range(len(mast_xs) - 1):
            a, b = mast_xs[i], mast_xs[i + 1]
            for dy, dz in ((-0.4, 0.0), (0.4, 0.0), (0.0, 0.9)):
                k.beam((a, row_y + dy, h + dz), (b, row_y + dy, h + dz), 0.08, "steel")
            n = 6
            for q in range(n):
                xa = a + (b - a) * q / n
                xb = a + (b - a) * (q + 1) / n
                k.beam((xa, row_y - 0.4, h), ((xa + xb) / 2, row_y, h + 0.9), 0.04, "steel")
                k.beam(((xa + xb) / 2, row_y, h + 0.9), (xb, row_y + 0.4, h), 0.04, "steel")
    # sứ cách điện và dây dẫn
    def insulator(x, y, z0, h=2.2):
        c = 5
        for q in range(c):
            z = z0 + h * q / c
            k.cyl((x, y, z), (x, y, z + h / c * 0.8), 0.18, "ins", n=6, r1=0.1, caps=False)
    for i in range(len(mast_xs) - 1):
        bx = (mast_xs[i] + mast_xs[i + 1]) / 2
        installed = i < 3
        pad = "concrete_dk"
        for py in (-12.0, 10.0, 26.0):
            for ph in (-1.5, 0, 1.5):
                k.box(bx + ph - 0.45, bx + ph + 0.45, py - 0.45, py + 0.45, 0, 0.4, pad)
                if installed and py != -12.0:
                    k.cyl((bx + ph, py, 0.4), (bx + ph, py, 3.0), 0.12, "steel", n=6)
                    insulator(bx + ph, py, 3.0)
                    k.beam((bx + ph, py, 5.2), (bx + ph, 20.0, 11.0), 0.04, "cu")
        # máy biến áp
        k.box(bx - 3.4, bx + 3.4, -3.4, 5.0, 0, 0.6, "concrete")
        if installed:
            k.box(bx - 2.2, bx + 2.2, -1.5, 2.6, 0.6, 4.2, "trafo")
            for q in range(11):
                fx = bx - 2.1 + q * 0.42
                k.box(fx - 0.06, fx + 0.06, -2.1, -1.5, 0.9, 3.8, "fin")
                k.box(fx - 0.06, fx + 0.06, 2.6, 3.2, 0.9, 3.8, "fin")
            k.cyl((bx, 3.4, 4.3), (bx, 0.6, 4.3), 0.45, "trafo", n=8) if False else None
            k.cyl((bx - 2.0, 0.5, 4.7), (bx + 2.0, 0.5, 4.7), 0.42, "trafo", n=10)
            for ph in (-1.4, 0, 1.4):
                insulator(bx + ph, 1.8, 4.2, 2.0)
    # mương cáp
    k.box(-14.0, 44.0, -7.0, -5.8, 0, 0.32, "concrete")
    k.box(-14.0, 44.0, 14.0, 15.2, 0, 0.32, "concrete")
    # thi công
    mobile_crane(t, 44.0, 6.0, 90.0, 18.0, 58.0)
    v.box(-12.0, -8.0, -28.0, -25.5, 0, 0.3, "pallet")
    v.cyl((-8.0, -32.0, 1.3), (-8.0, -30.5, 1.3), 1.3, "cu", n=14)
    v.cyl((-3.0, -32.0, 1.3), (-3.0, -30.5, 1.3), 1.3, "cu", n=14)
    v.box(-16.0, 4.0, 0.0 - 36.0, -34.8, 0, 0.5, "concrete") if False else None
    pipe_stack(v, 4.0, -30.0, 90.0, 5.0, 0.15, 4, "steel")
    dump_truck(t, 8.0, -14.0, 180.0)


def tank(k, x, y, r, h, body, roof=True, ring_stairs=True):
    with at(x, y):
        k.cyl((0, 0, 0), (0, 0, 0.6), r + 0.8, "concrete", n=36)
        k.cyl((0, 0, 0.6), (0, 0, h), r, body, n=36, caps=False, double=not roof)
        for z in np.arange(2.5, h, 2.5):
            k.cyl((0, 0, float(z)), (0, 0, float(z) + 0.05), r + 0.03, "steel_dk", n=36, caps=False)
        if roof:
            k.cyl((0, 0, h), (0, 0, h + 1.6), r, "white", n=36, r1=1.0)
            n = 28
            for i in range(n):
                a0, a1 = -2.2 + i * 0.09, -2.2 + (i + 1) * 0.09
                z0, z1 = 0.6 + (h - 0.6) * i / n, 0.6 + (h - 0.6) * (i + 1) / n
                c0, s0, c1, s1 = math.cos(a0), math.sin(a0), math.cos(a1), math.sin(a1)
                ro, ri = r + 1.1, r + 0.1
                k.quad((ro * c0, ro * s0, z0), (ro * c1, ro * s1, z1), (ri * c1, ri * s1, z1), (ri * c0, ri * s0, z0), "steel_dk") if False else k.face([W(ri * c0, ri * s0, z0), W(ri * c1, ri * s1, z1), W(ro * c1, ro * s1, z1), W(ro * c0, ro * s0, z0)], "steel_dk")
                k.beam((ro * c0, ro * s0, z0), (ro * c0, ro * s0, z0 + 1.1), 0.05, "pipe_y")
                k.beam((ro * c0, ro * s0, z0 + 1.1), (ro * c1, ro * s1, z1 + 1.1), 0.05, "pipe_y")


def ring_scaffold(g, x, y, r, z1):
    n = 24
    pts = [(x + (r + 1.2) * math.cos(2 * math.pi * i / n), y + (r + 1.2) * math.sin(2 * math.pi * i / n)) for i in range(n)]
    for i, (a, b) in enumerate(pts):
        g.beam((a, b, 0.6), (a, b, z1), 0.08, "scaffold")
        a2, b2 = pts[(i + 1) % n]
        for z in np.arange(2.5, z1, 2.5):
            g.beam((a, b, float(z)), (a2, b2, float(z)), 0.06, "scaffold")


def da6(s):
    lot(s)
    k, t, v = s.b("BON_BE"), s.b("THIET_BI"), s.b("VAT_TU")
    x0, x1, y0, y1 = -16.0, 48.0, -3.0, 37.0
    for a, b, c, d in [(x0, x1, y0, y0 + 0.4), (x0, x1, y1 - 0.4, y1), (x0, x0 + 0.4, y0, y1), (x1 - 0.4, x1, y0, y1)]:
        k.box(a, b, c, d, 0, 1.3, "concrete_dk")
    n = s.b("NEN")
    n.quad((x0, y0, 0.06), (x1, y0, 0.06), (x1, y1, 0.06), (x0, y1, 0.06), "gravel")
    tank(k, 2.0, 18.0, 13.0, 14.0, "tank")
    tank(k, 34.0, 18.0, 13.0, 7.5, "tank_primer", roof=False)
    g = s.b("GIAN_GIAO")
    ring_scaffold(g, 34.0, 18.0, 13.0, 9.0)
    # tấm tôn thành bể chờ lắp
    for i in range(5):
        v.box(10.0 + i * 0.1, 18.0 + i * 0.1, -32.0, -30.0, i * 0.1, i * 0.1 + 0.08, "tank_primer")
    # giá ống
    h = 5.0
    px = -14.0
    while px <= 46.0:
        k.box(px - 0.4, px + 0.4, -10.4, -9.6, 0, 0.3, "concrete_dk")
        k.box(px - 0.4, px + 0.4, -6.4, -5.6, 0, 0.3, "concrete_dk")
        for py in (-10.0, -6.0):
            k.box(px - 0.12, px + 0.12, py - 0.12, py + 0.12, 0.3, h, "steel_blue")
        k.box(px - 0.12, px + 0.12, -10.1, -5.9, h, h + 0.25, "steel_blue")
        px += 6.0
    for py, r, sw, z in ((-9.2, 0.3, "pipe_o", 0.4), (-8.2, 0.22, "pipe_g", 0.3), (-7.2, 0.3, "pipe_y", 0.4), (-6.5, 0.18, "pipe_g", 0.25)):
        k.cyl((-14.0, py, h + z), (46.0, py, h + z), r, sw, n=8, caps=False)
    # nối bồn vào giá ống
    for tx, built in ((2.0, True), (34.0, False)):
        k.cyl((tx, 5.0, 1.5), (tx, -7.2, 1.5), 0.25, "pipe_y" if built else "steel", n=8, caps=False)
        k.cyl((tx, -7.2, 1.5), (tx, -7.2, 5.4), 0.25, "pipe_y" if built else "steel", n=8, caps=False)
    # trạm bơm
    k.box(20.0, 30.0, -21.0, -15.0, 0, 0.4, "concrete")
    for i in range(3):
        ix = 22.0 + i * 3.0
        k.box(ix - 0.6, ix + 0.6, -19.0, -17.0, 0.4, 1.4, "pipe_o")
        k.cyl((ix, -17.0, 1.0), (ix, -9.2, 5.3), 0.14, "pipe_g", n=6, caps=False)
    mobile_crane(t, 34.0, -1.0, 0.0, 22.0, 62.0)
    pipe_stack(v, 40.0, -22.0, 90.0, 8.0, 0.3, 4, "pipe_g")
    pipe_stack(v, 44.0, -32.0, 90.0, 8.0, 0.4, 3, "pipe_o")
    light_tower(t, 12.0, -26.0)
    mixer(t, 4.0, -24.0, 90.0)


# ---------- đường và cây ----------
LOT_X = [(-166, -66), (-50, 50), (66, 166)]
LOT_Y = [(10, 90), (-90, -10)]


def world(coll):
    g, r, c = M(), M(), M()
    xs = [-205, -166, -66, -50, 50, 66, 166, 205]
    ys = [-125, -90, -10, 10, 90, 125]
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if any(a < cx < b for a, b in LOT_X) and any(a < cy < b for a, b in LOT_Y):
                continue
            g.quad((xs[i], ys[j], 0), (xs[i + 1], ys[j], 0), (xs[i + 1], ys[j + 1], 0), (xs[i], ys[j + 1], 0), "grass")
    z = 0.06
    r.quad((-205, -7, z), (205, -7, z), (205, 7, z), (-205, 7, z), "asphalt")
    for xc in (-58, 58):
        r.quad((xc - 5, -125, z), (xc + 5, -125, z), (xc + 5, 125, z), (xc - 5, 125, z), "asphalt")
    zl = 0.09
    x = -200
    while x < 200:
        r.quad((x, -0.12, zl), (x + 3, -0.12, zl), (x + 3, 0.12, zl), (x, 0.12, zl), "line")
        x += 6
    for xc in (-58, 58):
        y = -122
        while y < 122:
            if abs(y) > 8:
                r.quad((xc - 0.1, y, zl), (xc + 0.1, y, zl), (xc + 0.1, y + 3, zl), (xc - 0.1, y + 3, zl), "line")
            y += 6
    # vỉa hè dọc trục chính
    for y0, y1 in ((-10, -7), (7, 10)):
        for x0, x1 in [(-205, -63), (-53, 53), (63, 205)]:
            r.box(x0, x1, y0, y1, 0, 0.15, "walk")
    # đường vào cổng từng dự án
    for a, b in LOT_X:
        cx = (a + b) / 2
        for sy in (1, -1):
            y0, y1 = sorted((sy * 7, sy * 10.05))
            r.quad((cx - 5, y0, 0.17), (cx + 5, y0, 0.17), (cx + 5, y1, 0.17), (cx - 5, y1, 0.17), "gravel")
    # cột đèn đường
    for x in range(-195, 200, 26):
        if any(abs(x - v) < 7 for v in (-116, -58, 0, 58, 116)):
            continue
        for sy in (-8.6, 8.6):
            r.cyl((x, sy, 0.15), (x, sy, 8.0), 0.09, "steel_dk", n=6)
            dir_ = -1 if sy > 0 else 1
            r.beam((x, sy, 8.0), (x, sy + dir_ * 1.8, 8.5), 0.07, "steel_dk")
            r.box(x - 0.2, x + 0.2, sy + dir_ * 1.8 - 0.3, sy + dir_ * 1.8 + 0.3, 8.42, 8.56, "white")
    # cây ven lô đất
    rng = np.random.default_rng(21)
    def tree(x, y):
        h = float(rng.uniform(5.0, 8.5))
        rr = float(rng.uniform(1.8, 3.0))
        c.cyl((x, y, 0), (x, y, h * 0.45), 0.2, "trunk", n=5, caps=False)
        sw = "leaf" if rng.random() < 0.5 else "leaf2"
        c.cyl((x, y, h * 0.35), (x, y, h * 0.8), rr, sw, n=7, r1=rr * 0.5)
        c.cyl((x, y, h * 0.75), (x, y, h), rr * 0.65, sw, n=7, r1=0.1)
    for yy in (97.0, 105.0, 114.0, -97.0, -105.0, -114.0):
        x = -198
        while x < 198:
            if all(abs(x - v) > 7 for v in (-58, 58)):
                tree(x + float(rng.uniform(-3, 3)), yy + float(rng.uniform(-3, 3)))
            x += 14
    for yy in range(-120, 121, 14):
        for xx in (-178, -190, 178, 190):
            if abs(yy) > 14:
                tree(xx + float(rng.uniform(-3, 3)), yy + float(rng.uniform(-3, 3)))
    finish(g, "MAP_NEN_CO", coll)
    finish(r, "MAP_DUONG", coll)
    finish(c, "MAP_CAY", coll)
    return g.tris() + r.tris() + c.tris()


SITES = [
    ("DA1_CHUNG_CU", -116, 50, 0, "DỰ ÁN 1 - CHUNG CƯ CAO TẦNG", da1),
    ("DA2_VAN_PHONG", 0, 50, 0, "DỰ ÁN 2 - TÒA VĂN PHÒNG", da2),
    ("DA3_NHA_XUONG", 116, 50, 0, "DỰ ÁN 3 - NHÀ XƯỞNG THÉP", da3),
    ("DA4_TANG_HAM", -116, -50, 180, "DỰ ÁN 4 - TẦNG HẦM", da4),
    ("DA5_TRAM_BIEN_AP", 0, -50, 180, "DỰ ÁN 5 - TRẠM BIẾN ÁP", da5),
    ("DA6_KHO_XANG_DAU", 116, -50, 180, "DỰ ÁN 6 - KHO XĂNG DẦU", da6),
]


def clear():
    root = bpy.data.collections.get("MAP")
    if root:
        def wipe(c):
            for ch in list(c.children):
                wipe(ch)
            for o in list(c.objects):
                me = o.data
                bpy.data.objects.remove(o, do_unlink=True)
                if me and me.users == 0:
                    bpy.data.meshes.remove(me)
            bpy.data.collections.remove(c)
        wipe(root)


def main():
    clear()
    root = bpy.data.collections.new("MAP")
    bpy.context.scene.collection.children.link(root)
    make_material()
    total = world(root)
    for code, cx, cy, rot, title, fn in SITES:
        s = Site(code, cx, cy, rot, title, root)
        with at(cx, cy, rot):
            fn(s)
        total += s.done()
    print("TONG TAM GIAC", total)


main()
