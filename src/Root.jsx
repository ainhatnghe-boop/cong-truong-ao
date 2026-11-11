// Chọn ứng dụng (giữ nguyên cả 3, không xoá tính năng cũ):
//  - 'rpg'   : Công trường ảo · Nhập vai (v0.3, mặc định)
//  - 'studio': SITE 3D Studio — xây dựng tự do (v0.2)
//  - 'demo'  : Công trường mẫu (v0.1)
import { useState } from 'react';
import StudioApp from './studio/StudioApp.jsx';
import DemoApp from './App.jsx';
import RpgApp from './rpgui/RpgApp.jsx';
import { project } from './engine/ProjectManager.js';
import { editor } from './studio/editorStore.js';

const KEY = 'ctao.app';
const read = () => {
  try {
    const v = localStorage.getItem(KEY);
    return ['rpg', 'studio', 'demo'].includes(v) ? v : 'rpg';
  } catch {
    return 'rpg';
  }
};

export default function Root() {
  const [app, setApp] = useState(read);
  const go = (a) => {
    try {
      localStorage.setItem(KEY, a);
    } catch {
      /* bỏ qua */
    }
    setApp(a);
  };
  if (app === 'demo')
    return (
      <>
        <DemoApp />
        <div className="st-switch btn-row">
          <button className="btn" onClick={() => go('rpg')} title="Sang chế độ nhập vai">
            ⛑ Nhập vai
          </button>
          <button className="btn" onClick={() => go('studio')} title="Sang SITE 3D Studio">
            ⛫ Studio
          </button>
        </div>
      </>
    );
  if (app === 'studio') return <StudioApp onDemo={() => go('demo')} onRpg={() => go('rpg')} />;
  return (
    <RpgApp
      onStudio={() => go('studio')}
      onDemo={() => go('demo')}
      onOpenStudio={(doc, sim) => {
        // chế độ chỉnh sửa công trình (khi nghề có quyền): mở BẢN SAO thế giới trong Studio
        project.load({ ...doc, meta: { ...doc.meta, name: `${doc.meta.name} (bản chỉnh sửa)` } }, { ...sim, running: false });
        project.notify('Đang chỉnh sửa bản sao công trường trong Studio. Lưu để giữ lại; dự án đã lưu sẽ xuất hiện ở nhóm “Công trường do người chơi tạo”.', 'info');
        editor.set({ screen: 'editor', selection: [], tool: 'select', mode: 'edit' });
        go('studio');
      }}
    />
  );
}
