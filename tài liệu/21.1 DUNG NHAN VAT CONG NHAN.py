# Dựng 2 nhân vật công nhân cho game công trường ảo (Blender 5.2).
# Đơn vị mét, Z lên trên, nhân vật quay mặt về -Y, tư thế chữ T để gắn xương trên Mixamo.
import math
import os

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT_DIR = r"D:\CHẤN HƯNG OFFLINE\01_CÔNG CỤ VÀ ỨNG DỤNG\21. Blender_MCP"
COLL = "NHAN_VAT"
WORK = "_TAM"

# Bảng màu sRGB; mỗi màu là một ô trên texture chung, cả nhân vật chỉ 1 material.
PALETTE = {
    "skin_a": (0.80, 0.60, 0.47), "skin_b": (0.62, 0.43, 0.31),
    "lip_a": (0.62, 0.36, 0.32), "lip_b": (0.46, 0.26, 0.22),
    "hair": (0.05, 0.04, 0.04), "eye": (0.92, 0.91, 0.88), "iris": (0.13, 0.08, 0.05),
    "helmet": (0.93, 0.93, 0.90), "helmet_rib": (0.84, 0.84, 0.81),
    "coverall": (0.82, 0.83, 0.81), "coverall_trim": (0.66, 0.68, 0.67),
    "shirt_dark": (0.09, 0.11, 0.17), "shirt_trim": (0.05, 0.06, 0.10),
    "pants_work": (0.20, 0.17, 0.12), "pants_trim": (0.13, 0.11, 0.08),
    "vest": (0.91, 0.86, 0.06), "reflect": (0.70, 0.71, 0.70), "zip": (0.22, 0.22, 0.20),
    "boot_black": (0.07, 0.07, 0.07), "boot_brown": (0.23, 0.15, 0.09), "sole": (0.03, 0.03, 0.03),
    "skin_c": (0.86, 0.66, 0.54), "lip_c": (0.72, 0.34, 0.34), "hair_c": (0.13, 0.07, 0.04),
    "shirt_blue": (0.27, 0.44, 0.62), "shirt_blue_trim": (0.17, 0.30, 0.45),
    "pants_navy": (0.09, 0.12, 0.21), "pants_navy_trim": (0.06, 0.08, 0.14),
}
CELLS = 8
TEX_SIZE = 256
SWATCH = list(PALETTE)

CHARACTERS = {
    "CONG_NHAN_A": dict(skin="skin_a", lip="lip_a", shirt="coverall", shirt_trim="coverall_trim",
                        pants="coverall", pants_trim="coverall_trim", boot="boot_black",
                        torso_o=0.008, sleeve_k=1.12, pants_k=1.09,
                        bands=[("v", 0.105, 0.022), ("h", 1.045, 0.024)], knee=False, x=-2.0),
    "CONG_NHAN_B": dict(skin="skin_b", lip="lip_b", shirt="shirt_dark", shirt_trim="shirt_trim",
                        pants="pants_work", pants_trim="pants_trim", boot="boot_brown",
                        torso_o=0.0, sleeve_k=1.05, pants_k=1.06,
                        bands=[("v", 0.095, 0.020), ("h", 1.045, 0.020), ("h", 1.135, 0.020)],
                        knee=True, x=0.0),
    "CONG_NHAN_C": dict(skin="skin_c", lip="lip_c", hair="hair_c", shirt="shirt_blue", shirt_trim="shirt_blue_trim",
                        pants="pants_navy", pants_trim="pants_navy_trim", boot="boot_black",
                        torso_o=0.0, sleeve_k=0.92, pants_k=0.98,
                        bands=[("v", 0.092, 0.018), ("h", 1.05, 0.018)],
                        knee=False, x=2.0, female=True, sh=0.022, scale=0.94),
}


# ---------- tiện ích ----------
def work_coll():
    return bpy.data.collections[WORK]


def mk(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    work_coll().objects.link(ob)
    return ob


def remove(*objs):
    for o in objs:
        me = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if me.users == 0:
            bpy.data.meshes.remove(me)


def apply_all(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    new = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = new
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return ob


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def decimate(ob, target):
    n = tris(ob)
    if n > target:
        m = ob.modifiers.new("d", "DECIMATE")
        m.ratio = target / n
        apply_all(ob)
    return ob


def fix_normals(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()


def merge(objs, name):
    bm = bmesh.new()
    for o in objs:
        bm.from_mesh(o.data)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    work_coll().objects.link(ob)
    remove(*objs)
    return ob


def bvh(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t


def front_y(tree, x, z):
    hit = tree.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
    return hit[0].y if hit[0] else None


def top_z(tree, x, y):
    hit = tree.ray_cast(Vector((x, y, 4)), Vector((0, 0, -1)))
    return hit[0].z if hit[0] else None


def cr(a, b, c, d, t):
    return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t ** 3)


def resample(rings, sub):
    if sub <= 1:
        return rings
    out, n = [], len(rings)
    for i in range(n - 1):
        p0, p1, p2, p3 = rings[max(i - 1, 0)], rings[i], rings[i + 1], rings[min(i + 2, n - 1)]
        for s in range(sub):
            out.append(tuple(cr(p0[k], p1[k], p2[k], p3[k], s / sub) for k in range(7)))
    out.append(rings[-1])
    return out


def r(x, y, z, a, bf, bb=None, p=2.0):
    return (x, y, z, a, bf, bf if bb is None else bb, p)


def loft(name, rings, axis="Z", segs=20, sub=3):
    """Mặt quét qua các vòng elip: r(tâm x,y,z, bán kính a, b phía trước/dưới, b phía sau/trên, độ vuông p)."""
    rings = resample(rings, sub)
    verts, faces = [], []
    for ring in rings:
        cx, cy, cz, a, bf, bb, p = ring
        a, bf, bb, p = max(a, 1e-4), max(bf, 1e-4), max(bb, 1e-4), max(p, 1.2)
        for j in range(segs):
            th = 2 * math.pi * j / segs
            c, s = math.cos(th), math.sin(th)
            u = math.copysign(abs(c) ** (2 / p), c) * a
            v = math.copysign(abs(s) ** (2 / p), s) * (bb if s > 0 else bf)
            verts.append({"Z": (cx + u, cy + v, cz), "X": (cx, cy + u, cz + v), "Y": (cx + u, cy, cz + v)}[axis])
    n = len(rings)
    for i in range(n - 1):
        for j in range(segs):
            k = (j + 1) % segs
            faces.append((i * segs + j, i * segs + k, (i + 1) * segs + k, (i + 1) * segs + j))
    c0, c1 = len(verts), len(verts) + 1
    for ring, idx in ((rings[0], c0), (rings[-1], c1)):
        verts.append(ring[:3])
    for j in range(segs):
        k = (j + 1) % segs
        faces.append((j, c0, k))
        faces.append(((n - 1) * segs + j, (n - 1) * segs + k, c1))
    ob = mk(name, verts, faces)
    fix_normals(ob)
    return ob


def prism_y(name, outline_xz, y0, y1):
    n = len(outline_xz)
    verts = [(x, y0, z) for x, z in outline_xz] + [(x, y1, z) for x, z in outline_xz]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    faces += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    ob = mk(name, verts, faces)
    fix_normals(ob)
    return ob


def ellipse_y(name, x, z, rx, rz, y0, y1, n=40):
    return prism_y(name, [(x + rx * math.cos(2 * math.pi * i / n), z + rz * math.sin(2 * math.pi * i / n)) for i in range(n)], y0, y1)


def boolean(ob, tool, op):
    m = ob.modifiers.new("b", "BOOLEAN")
    m.operation = op
    m.solver = "EXACT"
    m.object = tool
    apply_all(ob)
    return ob


def blob(objs, name, voxel, target, wrinkle=0.0):
    """Hợp nhiều khối thành một lớp vỏ liền (áo liền tay, quần liền ống), thêm nếp vải rồi giảm lưới."""
    ob = merge(objs, name)
    m = ob.modifiers.new("r", "REMESH")
    m.mode = "VOXEL"
    m.voxel_size = voxel
    s = ob.modifiers.new("s", "SMOOTH")
    s.factor = 0.6
    s.iterations = 8
    tex = None
    if wrinkle:
        tex = bpy.data.textures.new("_nep_vai", "CLOUDS")
        tex.noise_scale = 0.055
        d = ob.modifiers.new("n", "DISPLACE")
        d.texture = tex
        d.texture_coords = "GLOBAL"
        d.strength = wrinkle
        d.mid_level = 0.5
    apply_all(ob)
    if tex:
        bpy.data.textures.remove(tex)
    return decimate(ob, target)


# ---------- bảng màu / vật liệu ----------
def palette_uv(swatch):
    i = SWATCH.index(swatch)
    return ((i % CELLS) + 0.5) / CELLS, ((i // CELLS) + 0.5) / CELLS


def make_material():
    name = "T_CONG_NHAN_PALETTE"
    if name in bpy.data.images:
        bpy.data.images.remove(bpy.data.images[name])
    img = bpy.data.images.new(name, TEX_SIZE, TEX_SIZE, alpha=False)
    cell = TEX_SIZE // CELLS
    px = [0.0, 0.0, 0.0, 1.0] * (TEX_SIZE * TEX_SIZE)
    for i, key in enumerate(SWATCH):
        cx, cy = i % CELLS, i // CELLS
        col = PALETTE[key]
        for y in range(cy * cell, (cy + 1) * cell):
            for x in range(cx * cell, (cx + 1) * cell):
                o = (y * TEX_SIZE + x) * 4
                px[o:o + 3] = col
    img.pixels.foreach_set(px)
    path = os.path.join(OUT_DIR, "21.1 T_CONG_NHAN_PALETTE.png")
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    img.pack()

    mname = "M_CONG_NHAN"
    if mname in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[mname])
    mat = bpy.data.materials.new(mname)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest"
    nt.links.new(tex.outputs[0], bsdf.inputs[0])
    bsdf.inputs["Roughness"].default_value = 0.72
    return mat


def set_uv(ob, swatch):
    me = ob.data
    uv = me.uv_layers.new(name="UVMap")
    u, v = palette_uv(swatch)
    n = len(me.loops)
    uv.uv.foreach_set("vector", [u, v] * n)


# ---------- các bộ phận ----------
def torso_rings(o, female=False):
    table = [
        (1.00, 0.166, 0.106, 0.112), (1.06, 0.150, 0.098, 0.096), (1.12, 0.150, 0.100, 0.096),
        (1.21, 0.162, 0.110, 0.100), (1.30, 0.174, 0.118, 0.106), (1.38, 0.180, 0.106, 0.098),
        (1.425, 0.176, 0.082, 0.078), (1.46, 0.112, 0.060, 0.060), (1.49, 0.066, 0.050, 0.052),
    ]
    if female:
        table = [
            (1.00, 0.172, 0.108, 0.116), (1.06, 0.142, 0.092, 0.094), (1.12, 0.130, 0.088, 0.088),
            (1.21, 0.138, 0.102, 0.090), (1.30, 0.150, 0.126, 0.094), (1.38, 0.156, 0.100, 0.088),
            (1.425, 0.152, 0.076, 0.072), (1.46, 0.100, 0.056, 0.056), (1.49, 0.060, 0.048, 0.050),
        ]
    return [r(0, 0.005, z, a + o, f + o, b + o) for z, a, f, b in table]


def vest_rings(o, female=False):
    table = [
        (0.96, 0.200, 0.135, 0.140), (1.04, 0.190, 0.128, 0.130), (1.15, 0.186, 0.128, 0.124),
        (1.25, 0.188, 0.132, 0.122), (1.33, 0.192, 0.132, 0.120), (1.40, 0.194, 0.112, 0.106),
        (1.44, 0.184, 0.088, 0.086), (1.475, 0.116, 0.066, 0.068), (1.50, 0.070, 0.054, 0.056),
    ]
    if female:
        table = [
            (0.96, 0.204, 0.132, 0.140), (1.04, 0.180, 0.118, 0.124), (1.15, 0.160, 0.122, 0.112),
            (1.25, 0.164, 0.140, 0.110), (1.33, 0.168, 0.140, 0.108), (1.40, 0.170, 0.108, 0.096),
            (1.44, 0.160, 0.082, 0.078), (1.475, 0.104, 0.062, 0.062), (1.50, 0.064, 0.052, 0.054),
        ]
    return [r(0, 0.005, z, a + o, f + o, b + o, 2.1) for z, a, f, b in table]


def arm_rings(sx, k, sh=0.0):
    return [
        r(sx * (x - sh), 0.0, 1.395, a * k, b * k)
        for x, a, b in [
            (0.10, 0.060, 0.062), (0.17, 0.066, 0.074), (0.24, 0.062, 0.066), (0.33, 0.054, 0.054),
            (0.46, 0.047, 0.046), (0.53, 0.048, 0.046), (0.62, 0.043, 0.040), (0.70, 0.037, 0.033),
        ]
    ]


def build_shirt(c):
    k, o = c["sleeve_k"], c["torso_o"]
    parts = [loft("torso", torso_rings(o, c.get("female", False)), segs=36)]
    for sx in (1, -1):
        parts.append(loft("arm", arm_rings(sx, k, c.get("sh", 0.0)), "X", segs=20))
    return blob(parts, "shirt", 0.007, 2600, wrinkle=0.013)


def leg_x(z):
    return 0.085 + (0.96 - z) * 0.052


def build_pants(c):
    k = c["pants_k"]
    hip_table = [
        (1.10, 0.152, 0.100, 0.096), (1.04, 0.158, 0.104, 0.100), (0.97, 0.176, 0.114, 0.122),
        (0.90, 0.180, 0.112, 0.126), (0.84, 0.172, 0.094, 0.112), (0.78, 0.140, 0.082, 0.088),
    ]
    if c.get("female"):
        hip_table = [
            (1.10, 0.134, 0.090, 0.090), (1.04, 0.156, 0.100, 0.104), (0.97, 0.184, 0.112, 0.130),
            (0.90, 0.192, 0.112, 0.136), (0.84, 0.180, 0.094, 0.118), (0.78, 0.142, 0.082, 0.090),
        ]
    hips = [r(0, 0.005, z, a + (k - 1) * 0.11, f + (k - 1) * 0.1, b + (k - 1) * 0.1) for z, a, f, b in hip_table]
    parts = [loft("hips", hips, segs=36)]
    table = [
        (0.96, 0.090, 0.100, 0.110), (0.80, 0.090, 0.094, 0.100), (0.66, 0.079, 0.082, 0.085),
        (0.54, 0.068, 0.070, 0.072), (0.48, 0.064, 0.068, 0.066), (0.40, 0.060, 0.063, 0.066),
        (0.28, 0.056, 0.060, 0.060), (0.19, 0.056, 0.060, 0.060), (0.135, 0.058, 0.064, 0.064),
    ]
    for sx in (1, -1):
        parts.append(loft("leg", [r(sx * leg_x(z), 0.003, z, a * k, f * k, b * k) for z, a, f, b in table], segs=20))
    return blob(parts, "pants", 0.007, 2400, wrinkle=0.014)


def pockets(c, add):
    k = c["pants_k"]
    for sx in (1, -1):
        x = sx * (leg_x(0.66) + 0.070 * k)
        rings = [r(x, 0.004, z, 0.012, h, h, 7) for z, h in [(0.585, 0.042), (0.60, 0.052), (0.70, 0.054), (0.715, 0.05)]]
        add(loft("pocket", rings, segs=16, sub=1), c["pants_trim"])
        rings = [r(x, 0.004, z, 0.015, h, h, 7) for z, h in [(0.695, 0.052), (0.70, 0.057), (0.73, 0.057), (0.735, 0.05)]]
        add(loft("flap", rings, segs=16, sub=1), c["pants_trim"])
        if c["knee"]:
            y = -0.067 * k + 0.002
            rings = [r(sx * (leg_x(0.49) - 0.002), y, z, w, 0.012, 0.012, 3.5) for z, w in [(0.425, 0.03), (0.44, 0.052), (0.54, 0.054), (0.555, 0.03)]]
            add(loft("knee", rings, segs=20, sub=1), c["pants_trim"])
        # măng sét
        xc = sx * (0.70 - c.get("sh", 0.0))
        k2 = c["sleeve_k"]
        add(loft("cuff", [r(xc - sx * 0.02, 0, 1.395, 0.041 * k2, 0.037 * k2), r(xc, 0, 1.395, 0.041 * k2, 0.037 * k2),
                          r(xc + sx * 0.004, 0, 1.395, 0.032, 0.028)], "X", segs=18, sub=1), c["shirt_trim"])


def build_hands(c, add):
    skin = c["skin"]
    sh = c.get("sh", 0.0)
    for sx in (1, -1):
        z = 1.395
        palm = [r(sx * (x - sh), 0, z, a, b, b * 1.1, 2.6) for x, a, b in [
            (0.685, 0.026, 0.022), (0.72, 0.031, 0.022), (0.76, 0.042, 0.018), (0.81, 0.044, 0.016), (0.835, 0.038, 0.011)]]
        add(decimate(loft("palm", palm, "X", segs=16), 180), skin)
        for y, length, rad in [(-0.032, 0.076, 0.0093), (-0.0108, 0.086, 0.0098), (0.0108, 0.08, 0.0094), (0.031, 0.062, 0.0082)]:
            x0 = 0.822 - sh
            rings = [r(sx * (x0 + length * t), y, z - 0.002 - 0.012 * t * t, rad * s, rad * s)
                     for t, s in [(0, 1.0), (0.33, 1.02), (0.5, 0.92), (0.72, 0.92), (0.92, 0.82), (1.0, 0.45)]]
            add(loft("finger", rings, "X", segs=8, sub=1), skin)
        thumb = [r(sx * (x - sh), y, zz, a, a) for x, y, zz, a in [
            (0.725, -0.018, z - 0.004, 0.017), (0.76, -0.046, z - 0.008, 0.0145), (0.79, -0.066, z - 0.012, 0.012),
            (0.815, -0.078, z - 0.015, 0.0105), (0.828, -0.082, z - 0.016, 0.006)]]
        add(loft("thumb", thumb, "X", segs=8, sub=2), skin)


def build_boots(c, add):
    for sx in (1, -1):
        x = sx * 0.13
        foot = [r(x, y, zc, a, b) for y, a, b, zc in [
            (0.095, 0.030, 0.034, 0.066), (0.07, 0.046, 0.056, 0.072), (0.0, 0.050, 0.066, 0.078),
            (-0.06, 0.051, 0.054, 0.066), (-0.12, 0.054, 0.042, 0.056), (-0.175, 0.050, 0.037, 0.052), (-0.205, 0.030, 0.023, 0.046)]]
        shaft = [r(x, 0.018, z, a, b) for z, a, b in [(0.05, 0.05, 0.066), (0.12, 0.048, 0.060), (0.19, 0.050, 0.062), (0.21, 0.050, 0.062)]]
        boot = blob([loft("foot", foot, "Y", segs=20), loft("shaft", shaft, segs=20)], "boot", 0.006, 620)
        add(boot, c["boot"])
        sole = [r(x, y, 0.017, a, 0.017, 0.017, 6) for y, a in [(0.105, 0.030), (0.09, 0.047), (0.02, 0.054), (-0.08, 0.057), (-0.16, 0.056), (-0.205, 0.04), (-0.218, 0.018)]]
        add(decimate(loft("sole", sole, "Y", segs=20), 220), "sole")


def gauss(x, z, x0, z0, sx, sz):
    return math.exp(-((x - x0) / sx) ** 2 - ((z - z0) / sz) ** 2)


def head_rings(o, female=False):
    # mặt nữ: cằm và quai hàm thon hơn
    return [
        r(0, y, z, a * ((0.86 + (z - 1.516) * 1.56) if female and z < 1.605 else 1.0) + o, f + o, b + o)
        for y, z, a, f, b in [
            (-0.045, 1.516, 0.018, 0.020, 0.020), (-0.040, 1.526, 0.040, 0.045, 0.040), (-0.030, 1.544, 0.058, 0.060, 0.060),
            (-0.018, 1.572, 0.069, 0.075, 0.075), (-0.010, 1.605, 0.076, 0.086, 0.085), (-0.010, 1.645, 0.080, 0.088, 0.090),
            (-0.010, 1.68, 0.081, 0.088, 0.095), (-0.010, 1.715, 0.072, 0.080, 0.085), (-0.010, 1.738, 0.048, 0.050, 0.055),
            (-0.010, 1.75, 0.010, 0.010, 0.012),
        ]
    ]


def face_shape(v, female=False):
    x, y, z = v
    if y > -0.03:
        return v
    nk = 0.68 if female else 1.0
    d = nk * 0.012 * gauss(x, z, 0, 1.628, 0.012, 0.024)
    d += nk * 0.017 * gauss(x, z, 0, 1.607, 0.017, 0.013)
    d += nk * 0.006 * (gauss(x, z, 0.018, 1.603, 0.009, 0.007) + gauss(x, z, -0.018, 1.603, 0.009, 0.007))
    for sx in (1, -1):
        d += 0.007 * gauss(x, z, sx * 0.036, 1.670, 0.033, 0.009)
        d -= 0.008 * gauss(x, z, sx * 0.036, 1.647, 0.021, 0.012)
        d += 0.006 * gauss(x, z, sx * 0.054, 1.607, 0.024, 0.018)
    d += 0.007 * gauss(x, z, 0, 1.575, 0.026, 0.011)
    d -= 0.004 * gauss(x, z, 0, 1.576, 0.03, 0.0028)
    d += 0.008 * gauss(x, z, 0, 1.538, 0.024, 0.012)
    return (x, y - d, z)


def build_head(c, add):
    fem = c.get("female", False)
    hair_key = c.get("hair", "hair")
    head = loft("head", head_rings(0, fem), segs=48, sub=5)
    for vert in head.data.vertices:
        vert.co = face_shape(vert.co, fem)
    tree = bvh(head)

    hair = loft("hair", head_rings(0.004, fem), segs=48, sub=5)
    bm = bmesh.new()
    bm.from_mesh(hair.data)

    def keep(f):
        p = f.calc_center_median()
        t = min(max((p.y + 0.105) / 0.20, 0), 1)
        return p.z > (1.70 - 0.13 * t ** 1.1 if fem else 1.715 - 0.125 * t ** 1.4)

    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f)], context="FACES")
    bm.to_mesh(hair.data)
    bm.free()
    add(decimate(hair, 450), hair_key)
    add(decimate(head, 2000), c["skin"])
    if fem:
        tail = [r(0, y, z, a, b) for z, y, a, b in [
            (1.675, 0.078, 0.018, 0.016), (1.64, 0.098, 0.026, 0.024), (1.58, 0.112, 0.032, 0.030),
            (1.50, 0.118, 0.030, 0.028), (1.42, 0.122, 0.020, 0.020), (1.37, 0.125, 0.004, 0.004)]]
        add(decimate(loft("ponytail", tail, segs=12, sub=3), 240), hair_key)

    add(decimate(loft("neck", [r(0, 0.008, z, a, a * 1.05) for z, a in [(1.42, 0.060), (1.47, 0.056), (1.52, 0.054), (1.56, 0.056)]], segs=20), 180), c["skin"])

    # chi tiết mặt bám theo bề mặt đầu
    y_lip = front_y(tree, 0, 1.575)
    lw, lt = (0.8, 1.22) if fem else (1.0, 1.0)
    add(loft("lip", [r(x * lw, y_lip + 0.0015 + 14 * x * x, 1.5755, a * lt, a * lt, a * lt * 0.85)
                     for x, a in [(-0.028, 0.0008), (-0.020, 0.0032), (-0.008, 0.0056), (0, 0.0052), (0.008, 0.0056), (0.020, 0.0032), (0.028, 0.0008)]], "X", segs=8, sub=1), c["lip"])
    ek = 1.14 if fem else 1.0
    for sx in (1, -1):
        x = sx * 0.036
        y = front_y(tree, x, 1.647)
        add(decimate(loft("eye", [r(x + d * 1.25 * ek, y + 0.0005 + 8 * (d * sx + 0.002) ** 2, 1.647, 0.0072 * s * ek, 0.0058 * s * ek, 0.0066 * s * ek) for d, s in [(-0.0125, 0.05), (-0.009, 0.72), (0, 1.0), (0.009, 0.72), (0.0125, 0.05)]], "X", segs=10, sub=2), 70), "eye")
        add(loft("iris", [r(x, y - 0.0058 + d, 1.6473, a * ek, a * ek) for d, a in [(0.0012, 0.0060), (0, 0.0064), (-0.0006, 0.0044), (-0.001, 0.0005)]], "Y", segs=12, sub=1), "iris")
        brow_y = front_y(tree, x, 1.670)
        bk = 0.68 if fem else 1.0
        bz = 0.002 if fem else 0.0
        add(loft("brow", [r(sx * d, brow_y - 0.0003 + 8 * (d - 0.036) ** 2, zz + bz, 0.0034 * s * bk, 0.0026 * s * bk)
                          for d, zz, s in [(0.016, 1.667, 0.35), (0.024, 1.671, 1.0), (0.038, 1.674, 1.0), (0.052, 1.670, 0.75), (0.060, 1.664, 0.2)]], "X", segs=8), hair_key)
        ear = [r(sx * (0.0795 + (z - 1.615) * 0.1), 0.012 + (z - 1.64) * 0.25, z, 0.0048, b, b * 1.25) for z, b in [(1.612, 0.003), (1.620, 0.0085), (1.642, 0.0135), (1.660, 0.0115), (1.670, 0.003)]]
        add(decimate(loft("ear", ear, segs=10, sub=2), 70), c["skin"])


def build_helmet(add):
    dome = loft("dome", [
        r(0, -0.010, z, a, f, b, 2.15)
        for z, a, f, b in [(1.692, 0.100, 0.124, 0.120), (1.72, 0.100, 0.124, 0.120), (1.76, 0.092, 0.114, 0.110),
                           (1.80, 0.070, 0.088, 0.083), (1.826, 0.036, 0.046, 0.042), (1.836, 0.004, 0.004, 0.004)]
    ], segs=40, sub=3)
    tree = bvh(dome)
    add(decimate(dome, 800), "helmet")
    brim = loft("brim", [
        r(0, -0.010, 1.706, 0.100, 0.122, 0.118, 2.15), r(0, -0.012, 1.694, 0.110, 0.160, 0.130, 2.25),
        r(0, -0.012, 1.688, 0.112, 0.166, 0.133, 2.25), r(0, -0.012, 1.682, 0.108, 0.160, 0.128, 2.25), r(0, -0.010, 1.680, 0.098, 0.120, 0.116, 2.15),
    ], segs=40, sub=1)
    add(decimate(brim, 420), "helmet")
    for x, h in ((0.0, 0.0072), (0.034, 0.0055), (-0.034, 0.0055)):
        rings = []
        for y, s in [(-0.100, 0.25), (-0.09, 0.85), (-0.07, 1.0), (-0.04, 1.0), (-0.01, 1.0), (0.03, 1.0), (0.06, 1.0), (0.08, 0.85), (0.09, 0.25)]:
            zt = top_z(tree, x, y)
            if zt is None:
                continue
            rings.append(r(x, y, zt - 0.001, 0.0095 * s, h * s + 0.002, h * s + 0.002, 2.6))
        add(loft("rib", rings, "Y", segs=6, sub=1), "helmet_rib")


def vest_shell(outer, inner, name, c):
    o = c["torso_o"]
    fem = c.get("female", False)
    cut_x = 0.300 - c.get("sh", 0.0) * 1.1
    shell = loft(name, vest_rings(outer + o, fem), segs=48, sub=2)
    cutters = [
        loft("inner", vest_rings(inner + o, fem), segs=48, sub=2),
        loft("neck", [r(0, 0.0, z, 0.088, 0.080, 0.078) for z in (1.38, 1.70)], segs=40, sub=1),
        prism_y("v", [(0, 1.255), (0.098, 1.43), (0.098, 1.70), (-0.098, 1.70), (-0.098, 1.43)], -0.4, 0.0),
        ellipse_y("armL", cut_x, 1.335, 0.125, 0.180, -0.4, 0.4),
        ellipse_y("armR", -cut_x, 1.335, 0.125, 0.180, -0.4, 0.4),
        prism_y("hem", [(-0.5, 0.5), (0.5, 0.5), (0.5, 0.995), (-0.5, 0.995)], -0.4, 0.4),
    ]
    for cut in cutters:
        boolean(shell, cut, "DIFFERENCE")
        remove(cut)
    return shell


def strip_inside(ob):
    """Bỏ mặt quay vào trong của dải phản quang để bớt tam giác không bao giờ nhìn thấy."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    axis = Vector((0, 0.005, 1.2))
    drop = [f for f in bm.faces if f.normal.dot((f.calc_center_median() - axis).normalized()) < -0.15]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


def build_vest(c, add):
    vest = vest_shell(0.0, -0.006, "vest", c)
    tree = bvh(vest)
    decimate(vest, 1300)
    add(vest, "vest")
    made = []
    for kind, pos, half in c["bands"]:
        centers = (pos, -pos) if kind == "v" else (pos,)
        for ctr in centers:
            band = vest_shell(0.0025, -0.003, "band", c)
            if kind == "v":
                cut = prism_y("c", [(ctr - half, 0.9), (ctr + half, 0.9), (ctr + half, 1.6), (ctr - half, 1.6)], -0.4, 0.4)
            else:
                cut = prism_y("c", [(-0.4, ctr - half), (0.4, ctr - half), (0.4, ctr + half), (-0.4, ctr + half)], -0.4, 0.4)
            boolean(band, cut, "INTERSECT")
            remove(cut)
            made.append(band)
    for b in made:
        strip_inside(b)
        add(decimate(b, 130), "reflect")
    # khóa kéo: dải mỏng bám mặt trước áo, từ gấu lên đỉnh cổ chữ V
    rows = 10
    verts, faces = [], []
    for i in range(rows + 1):
        z = 0.997 + (1.25 - 0.997) * i / rows
        y = front_y(tree, 0.012, z) - 0.0018
        verts += [(-0.0045, y, z), (0.0045, y, z)]
    for i in range(rows):
        a = i * 2
        faces.append((a, a + 1, a + 3, a + 2))
    add(mk("zip", verts, faces), "zip")


def build_collar(c, add):
    add(loft("collar", [r(0, 0.006, z, a, a * 1.02) for z, a in [(1.455, 0.082), (1.475, 0.078), (1.492, 0.066), (1.498, 0.058)]], segs=28, sub=1), c["shirt_trim"])


def build_character(name, c, mat, coll):
    parts = []

    def add(ob, swatch):
        parts.append((ob, swatch))

    add(build_shirt(c), c["shirt"])
    add(build_pants(c), c["pants"])
    pockets(c, add)
    build_hands(c, add)
    build_boots(c, add)
    build_head(c, add)
    build_helmet(add)
    build_vest(c, add)
    build_collar(c, add)

    for ob, swatch in parts:
        set_uv(ob, swatch)
    final = merge([p[0] for p in parts], name)
    me = final.data
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    me.set_sharp_from_angle(angle=math.radians(55))
    me.materials.append(mat)
    work_coll().objects.unlink(final)
    coll.objects.link(final)
    final.location.x = c["x"]
    return final


def main():
    for cname in (COLL, WORK):
        co = bpy.data.collections.get(cname)
        if co:
            for o in list(co.objects):
                remove(o)
            bpy.data.collections.remove(co)
    coll = bpy.data.collections.new(COLL)
    bpy.context.scene.collection.children.link(coll)
    work = bpy.data.collections.new(WORK)
    bpy.context.scene.collection.children.link(work)

    mat = make_material()
    for name, cfg in CHARACTERS.items():
        ob = build_character(name, cfg, mat, coll)
        print(name, "tris:", tris(ob), "cao:", round(ob.dimensions.z, 3), "sai canh:", round(ob.dimensions.x, 3))
    bpy.data.collections.remove(work)


main()
