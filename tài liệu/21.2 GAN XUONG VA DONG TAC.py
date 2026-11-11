# Gắn xương (tên kiểu Mixamo) và tạo các động tác đứng, chạy, nhảy dùng chung cho mọi nhân vật.
# Chạy trong Blender sau khi có script 21.1.
import math
import os

import bpy
from mathutils import Quaternion, Vector

DIR = r"D:\CHẤN HƯNG OFFLINE\01_CÔNG CỤ VÀ ỨNG DỤNG\21. Blender_MCP"
P = "mixamorig:"
FINGERS = [("Index", -0.032, 0.076), ("Middle", -0.0108, 0.086), ("Ring", 0.0108, 0.08), ("Pinky", 0.031, 0.062)]
HEAD_SWATCH = {"helmet", "helmet_rib", "hair", "hair_c", "eye", "iris", "lip_a", "lip_b", "lip_c"}
TORSO_SWATCH = {"vest", "reflect", "zip"}
FOOT_SWATCH = {"boot_black", "boot_brown", "sole"}
SKIN_SWATCH = {"skin_a", "skin_b", "skin_c"}


def sstep(a, b, t):
    t = min(max((t - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def leg_x(z):
    return 0.085 + (0.96 - z) * 0.052


# ---------- xương ----------
def bone_table(sh):
    t = [
        ("Hips", None, (0, 0.005, 0.95), (0, 0.005, 1.04)),
        ("Spine", "Hips", (0, 0.005, 1.04), (0, 0.005, 1.16)),
        ("Spine1", "Spine", (0, 0.005, 1.16), (0, 0.005, 1.28)),
        ("Spine2", "Spine1", (0, 0.005, 1.28), (0, 0.005, 1.44)),
        ("Neck", "Spine2", (0, 0.005, 1.46), (0, 0.003, 1.53)),
        ("Head", "Neck", (0, 0.003, 1.53), (0, 0.003, 1.75)),
    ]
    for side, s in (("Left", 1), ("Right", -1)):
        z = 1.395
        def X(x):
            return s * (x - sh)
        t += [
            (side + "Shoulder", "Spine2", (s * 0.05, 0, 1.40), (X(0.18), 0, z)),
            (side + "Arm", side + "Shoulder", (X(0.18), 0, z), (X(0.46), 0, z)),
            (side + "ForeArm", side + "Arm", (X(0.46), 0, z), (X(0.70), 0, z)),
            (side + "Hand", side + "ForeArm", (X(0.70), 0, z), (X(0.822), 0, z)),
            (side + "HandThumb1", side + "Hand", (X(0.725), -0.030, z - 0.005), (X(0.79), -0.066, z - 0.012)),
            (side + "HandThumb2", side + "HandThumb1", (X(0.79), -0.066, z - 0.012), (X(0.828), -0.082, z - 0.016)),
        ]
        for name, y, ln in FINGERS:
            x0, x1, x2 = 0.822, 0.822 + ln * 0.5, 0.822 + ln
            t += [
                (side + "Hand" + name + "1", side + "Hand", (X(x0), y, z - 0.002), (X(x1), y, z - 0.005)),
                (side + "Hand" + name + "2", side + "Hand" + name + "1", (X(x1), y, z - 0.005), (X(x2), y, z - 0.014)),
            ]
        ankle = (s * 0.13, 0.018, 0.095)
        ball = (s * 0.13, -0.10, 0.03)
        t += [
            (side + "UpLeg", "Hips", (s * 0.085, 0.003, 0.93), (s * leg_x(0.48), 0.003, 0.48)),
            (side + "Leg", side + "UpLeg", (s * leg_x(0.48), 0.003, 0.48), ankle),
            (side + "Foot", side + "Leg", ankle, ball),
            (side + "ToeBase", side + "Foot", ball, (s * 0.13, -0.205, 0.03)),
        ]
    return t


def make_armature(name, sh, coll):
    arm = bpy.data.armatures.new(name + "_RIG")
    ob = bpy.data.objects.new(name + "_RIG", arm)
    coll.objects.link(ob)
    vl = bpy.context.view_layer
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    vl.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.edit_bones
    for n, parent, a, b in bone_table(sh):
        bone = eb.new(P + n)
        bone.head, bone.tail = Vector(a), Vector(b)
        if parent:
            bone.parent = eb[P + parent]
            bone.use_connect = (bone.parent.tail - bone.head).length < 1e-6
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in ob.pose.bones:
        pb.rotation_mode = "QUATERNION"
    return ob


# ---------- trọng số theo vùng cơ thể ----------
def spine_w(z):
    w = {}
    chain = [("Hips", None), ("Spine", 1.04), ("Spine1", 1.16), ("Spine2", 1.28), ("Neck", 1.46), ("Head", 1.505)]
    widths = {1.04: 0.05, 1.16: 0.05, 1.28: 0.05, 1.46: 0.02, 1.505: 0.008}
    t_prev = 1.0
    for i in range(len(chain) - 1):
        joint = chain[i + 1][1]
        h = widths[joint]
        t = sstep(joint - h, joint + h, z)
        v = t_prev - t if False else None
        w[chain[i][0]] = 1.0 - t if i == 0 else t_prev * (1.0 - t)
        t_prev = t_prev * t if i == 0 else t_prev * t
    w[chain[-1][0]] = t_prev
    return w


def mix(*pairs):
    out = {}
    for k, w in pairs:
        for b, v in w.items():
            if v * k > 1e-4:
                out[b] = out.get(b, 0.0) + v * k
    return out


def arm_w(side, xa, swatch, y):
    if swatch in SKIN_SWATCH and xa > 0.655:
        thumb = sstep(0.038, 0.052, -y) * sstep(0.72, 0.74, xa)
        finger = sstep(0.826, 0.842, xa)
        hand = {side + "Hand": 1.0}
        if thumb > 0 and finger < 1:
            hand = mix((1 - thumb, hand), (thumb, {side + "HandThumb1": 1 - sstep(0.78, 0.80, xa), side + "HandThumb2": sstep(0.78, 0.80, xa)}))
        if finger > 0:
            name, _, ln = min(FINGERS, key=lambda f: abs(f[1] - y))
            joint = 0.822 + ln * 0.5
            t = sstep(joint - 0.008, joint + 0.008, xa)
            hand = mix((1 - finger, hand), (finger, {side + "Hand" + name + "1": 1 - t, side + "Hand" + name + "2": t}))
        return hand
    a = sstep(0.165, 0.215, xa)
    e = sstep(0.42, 0.50, xa)
    return {side + "Shoulder": 1 - a, side + "Arm": a * (1 - e), side + "ForeArm": a * e}


def leg_w(side, z, y, swatch):
    if swatch in FOOT_SWATCH:
        up = sstep(0.085, 0.125, z)
        toe = sstep(0.08, 0.13, -y)
        return {side + "Leg": up, side + "Foot": (1 - up) * (1 - toe), side + "ToeBase": (1 - up) * toe}
    k = sstep(0.42, 0.54, z)
    return {side + "Leg": 1 - k, side + "UpLeg": k}


def vertex_weights(co, swatch, sh):
    x, y, z = co
    if swatch in HEAD_SWATCH:
        return {"Head": 1.0}
    if swatch in TORSO_SWATCH:
        return spine_w(z)
    xa = abs(x) + sh
    side = "Left" if x > 0 else "Right"
    if swatch in FOOT_SWATCH:
        return leg_w(side, z, y, swatch)
    armness = sstep(0.13, 0.215, xa) * sstep(1.28, 1.335, z)
    if swatch in SKIN_SWATCH and z > 1.40 and abs(x) < 0.12:
        return spine_w(z)
    if armness > 0:
        return mix((1 - armness, spine_w(z)), (armness, arm_w(side, xa, swatch, y)))
    if z < 1.0:
        leg = 1 - sstep(0.86, 1.0, z)
        s_left = sstep(-0.03, 0.03, x)
        lw = mix((s_left, leg_w("Left", z, y, swatch)), (1 - s_left, leg_w("Right", z, y, swatch)))
        return mix((1 - leg, {"Hips": 1.0}), (leg, lw))
    return spine_w(z)


def skin(mesh_ob, rig_ob, sh, swatch_names, cells):
    me = mesh_ob.data
    uv = me.uv_layers[0].uv
    vs = [None] * len(me.vertices)
    for loop in me.loops:
        if vs[loop.vertex_index] is None:
            u = uv[loop.index].vector
            cx, cy = int(u.x * cells), int(u.y * cells)
            vs[loop.vertex_index] = swatch_names[cy * cells + cx]
    mesh_ob.vertex_groups.clear()
    groups = {b.name[len(P):]: mesh_ob.vertex_groups.new(name=b.name) for b in rig_ob.data.bones}
    for v in me.vertices:
        w = vertex_weights(v.co, vs[v.index], sh)
        total = sum(w.values())
        for b, val in w.items():
            if val / total > 1e-3:
                groups[b].add([v.index], val / total, "REPLACE")
    mod = mesh_ob.modifiers.new("Armature", "ARMATURE")
    mod.object = rig_ob
    mesh_ob.parent = rig_ob


# ---------- động tác ----------
def rq(a, b, c):
    r = math.radians
    return Quaternion((1, 0, 0), r(a)) @ Quaternion((0, 1, 0), r(b)) @ Quaternion((0, 0, 1), r(c))


def bone_name(key):
    if key.startswith("L_"):
        return P + "Left" + key[2:]
    if key.startswith("R_"):
        return P + "Right" + key[2:]
    return P + key


def apply_pose(rig, pose, hips_loc):
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
    for key, (a, b, c) in pose.items():
        if key.startswith("R_"):
            b, c = -b, -c
        pb = rig.pose.bones[bone_name(key)]
        B = pb.bone.matrix_local.to_quaternion()
        pb.rotation_quaternion = B.inverted() @ rq(a, b, c) @ B
    hips = rig.pose.bones[P + "Hips"]
    hips.location = hips.bone.matrix_local.to_3x3().inverted() @ Vector(hips_loc)


def lowest_point(rig):
    bpy.context.view_layer.update()
    low = 10.0
    for side, sx in (("Left", 1), ("Right", -1)):
        foot = rig.pose.bones[P + side + "Foot"]
        toe = rig.pose.bones[P + side + "ToeBase"]
        for pb, pts in ((foot, [(0.095, 0.0), (-0.10, 0.0)]), (toe, [(-0.218, 0.0)])):
            inv = pb.bone.matrix_local.inverted()
            for y, z in pts:
                low = min(low, (pb.matrix @ (inv @ Vector((sx * 0.13, y, z)))).z)
    return low


def set_key(rig, frame, pose, lift=0.0, fit=True, x=0.0, y=0.0):
    apply_pose(rig, pose, (x, y, 0.0))
    dz = 0.0
    if fit:
        dz = -lowest_point(rig)
    apply_pose(rig, pose, (x, y, dz + lift))
    for pb in rig.pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=frame, group=pb.name)
    hips = rig.pose.bones[P + "Hips"]
    hips.keyframe_insert("location", frame=frame, group=hips.name)


def hands(curl=25, curl2=30, thumb=8):
    d = {}
    for side in ("L_", "R_"):
        for n, _, _ in FINGERS:
            d[side + "Hand" + n + "1"] = (0, curl, 0)
            d[side + "Hand" + n + "2"] = (0, curl2, 0)
        d[side + "HandThumb1"] = (0, thumb, -thumb)
    return d


def merged(*ds):
    out = {}
    for d in ds:
        out.update(d)
    return out


def new_clip(rig, name, start, end, loop):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    act.use_frame_range = True
    act.frame_start, act.frame_end = start, end
    act.use_cyclic = loop
    rig.animation_data_create()
    rig.animation_data.action = act
    return act


def stand_arms(down=72, bend=14, swing=4):
    return {"L_Arm": (swing, down, 0), "R_Arm": (swing, down, 0), "L_ForeArm": (0, 0, -bend), "R_ForeArm": (0, 0, -bend)}


def clip_idle(rig):
    new_clip(rig, "DUNG_NGHI", 0, 60, True)
    for f, s, a in [(0, 0.0, 0.0), (30, 1.8, 1.5), (60, 0.0, 0.0)]:
        arms = stand_arms(72 - a * 0.5, 14 + a)
        set_key(rig, f, merged(arms, hands(), {"Spine1": (-s * 0.5, 0, 0), "Spine2": (-s, 0, 0), "Head": (s * 0.6, 0, 0)}))


def clip_hands_on_hips(rig):
    new_clip(rig, "DUNG_CHONG_HONG", 0, 80, True)
    legs = {"Hips": (0, -3, 0), "L_UpLeg": (0, 0, 0), "R_UpLeg": (0, 4, 0), "Spine1": (-2, 2, 0), "Spine2": (-3, 2, 0)}
    for f, n in [(0, 0.0), (40, 3.0), (80, 0.0)]:
        arms = {"L_Arm": (12, 48, 0), "R_Arm": (12, 48, 0), "L_ForeArm": (0, 84, -3), "R_ForeArm": (0, 84, -3),
                "L_Hand": (0, 8, 12), "R_Hand": (0, 8, 12), "Head": (0, 0, n)}
        set_key(rig, f, merged(legs, arms, hands(45, 50, 15)))


def clip_wave(rig):
    new_clip(rig, "DUNG_VAY_TAY", 0, 48, True)
    base = merged(hands(10, 12, 5), {"L_Arm": (4, 72, 0), "L_ForeArm": (0, 0, -14), "L_Hand": (0, 0, 0),
                                     "L_HandIndex1": (0, 25, 0), "L_HandMiddle1": (0, 25, 0), "L_HandRing1": (0, 25, 0), "L_HandPinky1": (0, 25, 0),
                                     "Spine2": (0, 3, 0), "Head": (-3, 0, 4)})
    for f, w in [(0, 24), (12, -24), (24, 24), (36, -24), (48, 24)]:
        pose = merged(base, {"R_Arm": (-8, -35, 0), "R_ForeArm": (0, -48 + w, 0)})
        set_key(rig, f, pose)


LEG_TABLE = [  # pha, đùi, gối, bàn chân
    (0.000, -35, 15, -10), (0.125, -20, 38, 4), (0.25, 2, 26, 12), (0.375, 26, 12, 26),
    (0.500, 42, 32, 32), (0.625, 22, 88, 22), (0.75, -25, 104, 6), (0.875, -52, 58, -6),
]


def leg_at(p):
    p = p % 1.0
    for row in LEG_TABLE:
        if abs(row[0] - p) < 1e-6:
            return row[1:]
    raise ValueError(p)


def clip_run(rig, name, length, k, lean, elbow, lift_h):
    new_clip(rig, name, 0, length, True)
    for i in range(9):
        p = i / 8
        tL, kL, fL = leg_at(p)
        tR, kR, fR = leg_at(p + 0.5)
        tw = -7 * k * math.cos(2 * math.pi * p)
        lift = {0: 0.0, 1: 0.0, 2: 0.0, 3: lift_h}[i % 4]
        pose = merged(hands(70, 80, 15), {
            "Hips": (lean * 0.4, 0, tw), "Spine": (lean * 0.3, 0, -tw * 0.5), "Spine1": (lean * 0.2, 0, -tw * 0.5), "Spine2": (lean * 0.1, 0, -tw * 0.4),
            "Neck": (-lean * 0.3, 0, 0), "Head": (-lean * 0.5, 0, tw * 0.3),
            "L_UpLeg": (tL * k, 0, 0), "L_Leg": (kL * k, 0, 0), "L_Foot": (fL, 0, 0),
            "R_UpLeg": (tR * k, 0, 0), "R_Leg": (kR * k, 0, 0), "R_Foot": (fR, 0, 0),
            "L_Arm": (tR * k * 0.9, 74, 0), "R_Arm": (tL * k * 0.9, 74, 0),
            "L_ForeArm": (0, 0, -elbow), "R_ForeArm": (0, 0, -elbow),
        })
        set_key(rig, round(i * length / 8), pose, lift=lift)


def both_legs(t, kn, fo=None):
    fo = -(t + kn) if fo is None else fo
    return {"L_UpLeg": (t, 0, 0), "L_Leg": (kn, 0, 0), "L_Foot": (fo, 0, 0),
            "R_UpLeg": (t, 0, 0), "R_Leg": (kn, 0, 0), "R_Foot": (fo, 0, 0)}


def arms_sym(swing, down, elbow):
    return {"L_Arm": (swing, down, 0), "R_Arm": (swing, down, 0), "L_ForeArm": (0, 0, -elbow), "R_ForeArm": (0, 0, -elbow)}


def clip_jump(rig):
    new_clip(rig, "NHAY_TAI_CHO", 0, 40, False)
    k = [
        (0, both_legs(0, 0), arms_sym(4, 72, 14), {}, 0.0, True),
        (8, both_legs(-58, 108), arms_sym(50, 72, 20), {"Hips": (22, 0, 0), "Spine1": (8, 0, 0), "Head": (-20, 0, 0)}, 0.0, True),
        (13, both_legs(4, 4, 38), arms_sym(-125, 72, 18), {"Spine1": (-4, 0, 0), "Head": (-4, 0, 0)}, 0.0, True),
        (20, both_legs(-28, 50, 25), arms_sym(-155, 68, 22), {"Hips": (-3, 0, 0)}, 0.40, False),
        (27, both_legs(-14, 22, 18), arms_sym(-90, 72, 22), {}, 0.20, False),
        (32, both_legs(-55, 102), arms_sym(25, 62, 25), {"Hips": (20, 0, 0), "Spine1": (8, 0, 0), "Head": (-18, 0, 0)}, 0.0, True),
        (40, both_legs(0, 0), arms_sym(4, 72, 14), {}, 0.0, True),
    ]
    for f, legs, arms, extra, lift, fit in k:
        set_key(rig, f, merged(hands(14, 16, 8), legs, arms, extra), lift=lift, fit=fit)


def clip_leap(rig):
    new_clip(rig, "NHAY_XA", 0, 36, False)
    crouch = merged(both_legs(-52, 98), arms_sym(55, 72, 25), {"Hips": (24, 0, 0), "Spine1": (10, 0, 0), "Head": (-22, 0, 0)})
    takeoff = {"L_UpLeg": (-62, 0, 0), "L_Leg": (75, 0, 0), "L_Foot": (5, 0, 0), "R_UpLeg": (22, 0, 0), "R_Leg": (10, 0, 0), "R_Foot": (40, 0, 0),
               "L_Arm": (40, 72, 0), "R_Arm": (-75, 72, 0), "L_ForeArm": (0, 0, -55), "R_ForeArm": (0, 0, -70), "Hips": (14, 0, -8), "Spine1": (6, 0, 4)}
    apex = {"L_UpLeg": (-78, 0, 0), "L_Leg": (42, 0, 0), "L_Foot": (-8, 0, 0), "R_UpLeg": (38, 0, 0), "R_Leg": (68, 0, 0), "R_Foot": (28, 0, 0),
            "L_Arm": (48, 70, 0), "R_Arm": (-90, 66, 0), "L_ForeArm": (0, 0, -40), "R_ForeArm": (0, 0, -55), "Hips": (16, 0, -8), "Spine1": (6, 0, 4), "Head": (-14, 0, 0)}
    reach = {"L_UpLeg": (-70, 0, 0), "L_Leg": (18, 0, 0), "L_Foot": (-14, 0, 0), "R_UpLeg": (-22, 0, 0), "R_Leg": (70, 0, 0), "R_Foot": (10, 0, 0),
             "L_Arm": (-20, 70, 0), "R_Arm": (-45, 70, 0), "L_ForeArm": (0, 0, -35), "R_ForeArm": (0, 0, -35), "Hips": (8, 0, 0), "Head": (-6, 0, 0)}
    land = merged(both_legs(-60, 112), arms_sym(-12, 62, 30), {"Hips": (26, 0, 0), "Spine1": (10, 0, 0), "Head": (-24, 0, 0)})
    for f, pose, lift, fit in [(0, merged(both_legs(0, 0), arms_sym(4, 72, 14)), 0, True), (7, crouch, 0, True), (12, takeoff, 0.04, True),
                               (19, apex, 0.42, False), (25, reach, 0.22, False), (29, land, 0, True), (36, merged(both_legs(0, 0), arms_sym(4, 72, 14)), 0, True)]:
        set_key(rig, f, merged(hands(30, 35, 10), pose), lift=lift, fit=fit)


CLIPS = ["DUNG_NGHI", "DUNG_CHONG_HONG", "DUNG_VAY_TAY", "CHAY_CHAM", "CHAY_NHANH", "NHAY_TAI_CHO", "NHAY_XA"]


def main():
    for o in list(bpy.data.objects):
        if o.type == "ARMATURE":
            bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)

    g = {"__name__": "__main__"}
    p = os.path.join(DIR, "21.1 DUNG NHAN VAT CONG NHAN.py")
    exec(compile(open(p, encoding="utf-8").read(), "build", "exec"), g)
    chars, swatch, cells = g["CHARACTERS"], g["SWATCH"], g["CELLS"]
    coll = bpy.data.collections[g["COLL"]]

    rigs = {}
    for name, c in chars.items():
        me = bpy.data.objects[name]
        x = me.location.x
        me.location.x = 0
        rig = make_armature(name, c.get("sh", 0.0), coll)
        skin(me, rig, c.get("sh", 0.0), swatch, cells)
        rig.location.x = x
        s = c.get("scale", 1.0)
        rig.scale = (s, s, s)
        rigs[name] = rig

    bpy.context.scene.render.fps = 30
    first = rigs["CONG_NHAN_A"]
    # dựng động tác tại gốc toạ độ để tính chân chạm đất
    x0 = first.location.x
    first.location.x = 0
    clip_idle(first)
    clip_hands_on_hips(first)
    clip_wave(first)
    clip_run(first, "CHAY_CHAM", 24, 0.82, 10, 85, 0.015)
    clip_run(first, "CHAY_NHANH", 16, 1.18, 22, 100, 0.03)
    clip_jump(first)
    clip_leap(first)
    first.location.x = x0

    for name in CLIPS:
        act = bpy.data.actions[name]
        print(name, "khung", act.frame_range[:], "slot", [s.identifier for s in act.slots])
    idle = bpy.data.actions["DUNG_NGHI"]
    slot = idle.slots[0]
    for rig in rigs.values():
        rig.animation_data_create()
        rig.animation_data.action = idle
        rig.animation_data.action_slot = slot
        print(rig.name, "xuong", len(rig.data.bones))


main()
