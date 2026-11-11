// ============================================================
//  CharacterAnimationController — tư thế thủ tục cho rig procedural (idle · walk · run · interact).
//  Theo delta-time (không phụ thuộc FPS). Chuyển trạng thái MƯỢT: mọi khớp tiến dần về tư thế đích
//  theo hệ số 1 - e^(-k·dt). Không đụng tới vật liệu / trang phục → đổi animation không mất cấu hình.
// ============================================================
const ease = (dt, k = 10) => 1 - Math.exp(-dt * k);

function approach(obj, axis, target, a) {
  if (obj) obj.rotation[axis] += (target - obj.rotation[axis]) * a;
}

/** rig: refs các khớp; mem: { phase, t } ; state: { anim, speed } */
export function updatePose(rig, mem, state, dt) {
  dt = Math.min(dt, 0.1);
  mem.t += dt;
  const anim = state.anim ?? 'idle';
  const moving = anim === 'walk' || anim === 'run';
  const spd = Math.max(1.4, state.speed || (anim === 'run' ? 5 : 2.2));
  mem.phase += moving ? dt * spd * (anim === 'run' ? 1.45 : 1.95) : dt * 1.2;
  const p = mem.phase;
  const t = mem.t;
  const a = ease(dt, moving ? 12 : 8);
  const amp = anim === 'run' ? 0.85 : anim === 'walk' ? 0.48 : 0;
  const jumping = anim === 'jump';
  // chân — nhảy: khuỵu gối, co chân lên (tư thế chung cho cả bật lên lẫn rơi xuống, không tách pha)
  approach(rig.hipL.current, 'x', jumping ? -0.55 : moving ? Math.sin(p) * amp : 0.02, a);
  approach(rig.hipR.current, 'x', jumping ? -0.55 : moving ? -Math.sin(p) * amp : -0.02, a);
  approach(rig.kneeL.current, 'x', jumping ? 1.1 : moving ? Math.max(0, Math.sin(p + 1.7)) * amp * 1.35 + 0.05 : 0.03, a);
  approach(rig.kneeR.current, 'x', jumping ? 1.1 : moving ? Math.max(0, Math.sin(p + 1.7 + Math.PI)) * amp * 1.35 + 0.05 : 0.03, a);
  approach(rig.ankleL.current, 'x', jumping ? 0.4 : moving ? -Math.max(0, Math.sin(p + 0.3)) * amp * 0.4 : 0, a);
  approach(rig.ankleR.current, 'x', jumping ? 0.4 : moving ? -Math.max(0, Math.sin(p + 0.3 + Math.PI)) * amp * 0.4 : 0, a);
  // tay
  if (jumping) {
    approach(rig.shL.current, 'x', -1.1, a);
    approach(rig.shR.current, 'x', -1.1, a);
    approach(rig.elL.current, 'x', -0.25, a);
    approach(rig.elR.current, 'x', -0.25, a);
  } else if (anim === 'interact') {
    approach(rig.shR.current, 'x', -1.25 + Math.sin(t * 5) * 0.22, a);
    approach(rig.elR.current, 'x', -0.85 - Math.max(0, Math.sin(t * 5)) * 0.3, a);
    approach(rig.shL.current, 'x', -0.55, a);
    approach(rig.elL.current, 'x', -1.05, a);
  } else {
    const sw = moving ? Math.sin(p) * amp * 0.85 : Math.sin(t * 1.1) * 0.02;
    approach(rig.shL.current, 'x', -sw, a);
    approach(rig.shR.current, 'x', sw, a);
    approach(rig.elL.current, 'x', moving ? -0.3 - (anim === 'run' ? 0.95 : 0) : -0.12, a);
    approach(rig.elR.current, 'x', moving ? -0.3 - (anim === 'run' ? 0.95 : 0) : -0.12, a);
  }
  approach(rig.shL.current, 'z', anim === 'idle' ? 0.08 : 0.05, a);
  approach(rig.shR.current, 'z', anim === 'idle' ? -0.08 : -0.05, a);
  // ngón tay: nắm nhẹ khi chạy / thao tác
  const curl = anim === 'run' ? 1.1 : anim === 'interact' ? 0.8 : 0.35;
  for (const f of rig.fingers.current ?? []) if (f) f.rotation.x += (curl - f.rotation.x) * a;
  // thân & đầu
  if (rig.spine.current) {
    approach(rig.spine.current, 'x', jumping ? 0.1 : anim === 'run' ? 0.16 : anim === 'walk' ? 0.04 : anim === 'interact' ? 0.06 : 0, a);
    approach(rig.spine.current, 'y', moving ? Math.sin(p) * 0.07 : 0, a);
    const breath = 1 + Math.sin(t * 1.6) * 0.008;
    rig.spine.current.scale.set(breath, 1, breath);
  }
  if (rig.pelvis.current) {
    approach(rig.pelvis.current, 'z', anim === 'idle' ? Math.sin(t * 0.55) * 0.025 : 0, a);
    rig.pelvis.current.position.y = moving ? Math.abs(Math.sin(p)) * (anim === 'run' ? 0.045 : 0.022) : 0;
  }
  if (rig.head.current) {
    approach(rig.head.current, 'y', anim === 'idle' ? Math.sin(t * 0.45) * 0.18 : 0, a);
    approach(rig.head.current, 'x', anim === 'interact' ? 0.22 : 0, a);
  }
}
