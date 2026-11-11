// Màn hình "BẠN MUỐN LÀM CÔNG VIỆC GÌ?" — danh sách nghề lấy từ dữ liệu (roles.json)
import { useState } from 'react';
import { rolesByGroup, competency, levelOf } from '../rpg/RoleManagementSystem.js';
import { ppeLabel, DATA } from '../rpg/data.js';
import { session } from './session.js';

export function RoleDetail({ role }) {
  const comp = competency(session.profile, role.id);
  const xp = session.profile.career.roleXp[role.id] ?? 0;
  return (
    <div className="rp-role-detail">
      <h2>{role.title}</h2>
      <p className="muted">
        {DATA.roleGroups.find((g) => g.id === role.group)?.label} · {role.department} · Mức kinh nghiệm: {role.level}
      </p>
      <p>{role.description}</p>
      <dl className="kv">
        <div>
          <dt>Kỹ năng</dt>
          <dd>{role.skills.join(' · ')}</dd>
        </div>
        <div>
          <dt>Nhiệm vụ đặc trưng</dt>
          <dd>{role.tasks.join(' · ')}</dd>
        </div>
        <div>
          <dt>Trang bị yêu cầu thêm</dt>
          <dd>{role.ppe.length ? role.ppe.map(ppeLabel).join(', ') : 'PPE cơ bản của công trường'}</dd>
        </div>
        <div>
          <dt>Quyền truy cập (gameplay)</dt>
          <dd>
            {role.access.zones.includes('*') ? 'Mọi loại khu vực' : role.access.zones.map((z) => DATA.safety.kinds[z]).join(', ')} · mức tối đa: {role.access.levels.map((l) => DATA.levelById[l].label).join(', ')}
            {role.access.edit ? ' · được mở chế độ chỉnh sửa công trình' : ''}
            {role.access.approve.length ? ` · tự xác nhận PTW mô phỏng: ${role.access.approve.map((p) => DATA.permitById[p].label).join(', ')}` : ''}
          </dd>
        </div>
        <div>
          <dt>Điểm kinh nghiệm nghề</dt>
          <dd>
            {xp} XP · yêu cầu cấp {role.minLevel} (bạn đang cấp {levelOf(session.profile.career.xp)})
          </dd>
        </div>
      </dl>
      {!comp.ok && <p className="small warn-text">⚠ {comp.reason}</p>}
    </div>
  );
}

export default function RoleSelect({ onChoose, onBack, title = 'BẠN MUỐN LÀM CÔNG VIỆC GÌ?', step = 'Bước 2/4' }) {
  const current = session.profile.career.roleId;
  const [sel, setSel] = useState(current ?? 'field-engineer');
  const groups = rolesByGroup();
  const role = DATA.roleById[sel];
  return (
    <div className="rp-screen">
      <header className="rp-screen__head">
        <h1>{title}</h1>
        <p className="muted">
          {step} · Đổi nghề sau này không mất nhân vật và XP. {current && `Nghề hiện tại: ${DATA.roleById[current].title}.`}
        </p>
      </header>
      <div className="rp-two">
        <div className="rp-list panel">
          {groups.map((g) => (
            <section key={g.id}>
              <h4>
                {g.id}. {g.label.toUpperCase()}
              </h4>
              <div className="rp-chips">
                {g.roles.map((r) => (
                  <button key={r.id} className={`rp-chip${sel === r.id ? ' is-active' : ''}${!competency(session.profile, r.id).ok ? ' is-locked' : ''}`} onClick={() => setSel(r.id)}>
                    {r.title}
                    {r.id === current && ' ✓'}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="panel rp-pad">
          <RoleDetail role={role} />
          <div className="btn-row">
            {onBack && (
              <button className="btn" onClick={onBack}>
                ← Quay lại
              </button>
            )}
            <span className="spacer" />
            <button className="btn btn--primary" onClick={() => onChoose(sel)}>
              Chọn {role.title} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
