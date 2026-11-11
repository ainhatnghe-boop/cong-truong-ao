// ============================================================
//  CharacterAssetRegistry — danh mục bộ dựng nhân vật (procedural hoặc GLB/GLTF có rig).
//  Thêm model thật: khai báo trong data/characterAssets.json (url, license, animations, skinMaterials, attach,
//  capabilities). Không cần sửa AvatarCustomizationSystem hay UI: nhóm tuỳ chọn tự khoá theo capabilities.
// ============================================================
import { DATA } from './data.js';

export function listAssets({ dev = false } = {}) {
  return DATA.characterAssets.filter((a) => dev || !a.dev);
}

export function getAsset(id) {
  return DATA.characterAssetById[id] ?? DATA.characterAssetById[DATA.defaultCharacterAsset];
}

export const isSupported = (assetId, capability) => getAsset(assetId).capabilities.includes(capability);
export const fallbackAsset = () => getAsset(DATA.defaultCharacterAsset);
