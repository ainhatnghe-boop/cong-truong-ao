// ============================================================
//  AvatarRenderer — điểm thay thế model: chọn bộ dựng theo CharacterAssetRegistry.
//  GLB/GLTF lỗi hoặc đang tải → hiển thị ProceduralAvatar (fallback, không chặn game) và báo trạng thái.
//  Props giống nhau cho mọi bộ dựng: { character, equipped, stateRef, anim, speed, rendererId, onStatus }
// ============================================================
import { Component, Suspense, useMemo } from 'react';
import ProceduralAvatar from './ProceduralAvatar.jsx';
import GltfAvatar from './GltfAvatar.jsx';
import { getAsset } from '../../rpg/CharacterAssetRegistry.js';
import { renderSpec } from '../../rpg/AvatarCustomizationSystem.js';

class AssetBoundary extends Component {
  constructor(p) {
    super(p);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    this.props.onStatus?.({ state: 'error', message: `Không tải được mô hình “${this.props.label}”: ${error?.message ?? error}. Đang dùng nhân vật dựng thủ tục.` });
  }
  componentDidUpdate(prev) {
    if (prev.assetId !== this.props.assetId && this.state.error) this.setState({ error: null });
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

export default function AvatarRenderer({ character, equipped = [], stateRef, anim, speed, rendererId, onStatus, shadow = true }) {
  const spec = useMemo(() => renderSpec(character, equipped), [character, equipped]);
  const asset = getAsset(rendererId);
  const fallback = <ProceduralAvatar spec={spec} stateRef={stateRef} anim={anim} speed={speed} shadow={shadow} />;
  if (asset.kind !== 'gltf') return fallback;
  return (
    <AssetBoundary key={asset.id} assetId={asset.id} label={asset.label} fallback={fallback} onStatus={onStatus}>
      <Suspense fallback={fallback}>
        <GltfAvatar asset={asset} spec={spec} stateRef={stateRef} anim={anim} onStatus={onStatus} />
      </Suspense>
    </AssetBoundary>
  );
}
