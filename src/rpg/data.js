// Nạp & đánh chỉ mục dữ liệu cấu hình nhập vai (src/rpg/data/*.json). Không có logic game ở đây.
import appearance from './data/appearance.json' with { type: 'json' };
import outfits from './data/outfits.json' with { type: 'json' };
import accessories from './data/accessories.json' with { type: 'json' };
import characterAssets from './data/characterAssets.json' with { type: 'json' };
import characterPresets from './data/characterPresets.json' with { type: 'json' };
import ppe from './data/ppe.json' with { type: 'json' };
import roles from './data/roles.json' with { type: 'json' };
import safety from './data/safety.json' with { type: 'json' };
import permits from './data/permits.json' with { type: 'json' };
import trainings from './data/trainings.json' with { type: 'json' };
import workflows from './data/workflows.json' with { type: 'json' };
import missions from './data/missions.json' with { type: 'json' };
import dialogues from './data/dialogues.json' with { type: 'json' };
import sites from './data/sites.json' with { type: 'json' };

const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

export const DATA = {
  appearance,
  outfits: outfits.outfits,
  outfitById: byId(outfits.outfits),
  defaultOutfit: outfits.default,
  accessories: accessories.items,
  accessoryById: byId(accessories.items),
  characterAssets: characterAssets.assets,
  characterAssetById: byId(characterAssets.assets),
  defaultCharacterAsset: characterAssets.default,
  characterPresets: characterPresets.presets,
  npcPresets: characterPresets.npc,
  ppe: ppe.items,
  ppeById: byId(ppe.items),
  ppeCategories: ppe.categories,
  ppeStyles: ppe.styles,
  roles: roles.roles,
  roleById: byId(roles.roles),
  roleGroups: roles.groups,
  safety,
  levelById: byId(safety.levels),
  permitTypes: permits.types,
  permitById: byId(permits.types),
  trainings: trainings.trainings,
  trainingById: byId(trainings.trainings),
  workflows,
  missions,
  dialogues,
  siteCategories: sites.categories,
  sites: sites.sites,
  siteById: byId(sites.sites),
};

export const ppeLabel = (id) => DATA.ppeById[id]?.label ?? id;
export const roleTitle = (id) => DATA.roleById[id]?.title ?? id;
