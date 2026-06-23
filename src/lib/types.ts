export type Gender = "male" | "female" | "other";

export type Rarity = "일반" | "고급" | "희귀" | "영웅" | "전설" | "신화";

export type StatKey = "STR" | "DEX" | "INT" | "VIT" | "WIS" | "LUK";

export type Stats = Record<StatKey, number>;

export type BirthProfile = {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  height: number;
  weight: number;
};

export type FateAnalysis = {
  zodiac: string;
  element: "목(木)" | "화(火)" | "토(土)" | "금(金)" | "수(水)";
  temperament: string;
  fortune: string;
  talent: string;
  talentBonus: string;
  luckyStat: StatKey;
  seed: number;
};

export type Job = {
  name: string;
  rarity: Rarity;
  hidden?: boolean;
  archetype: "melee" | "ranged" | "magic" | "hybrid" | "support";
  statBias: Partial<Stats>;
  skills: Skill[];
};

export type Skill = {
  id: string;
  name: string;
  mpCost: number;
  power: number;
  text: string;
  unlockLevel: number;
  special?: boolean;
};

export type Trait = {
  id: string;
  name: string;
  rarity: Rarity;
  text: string;
  statBonus?: Partial<Stats>;
  effects?: Partial<{
    attackRate: number;
    defenseRate: number;
    dropRate: number;
    maxMpRate: number;
    critRate: number;
    escapeRate: number;
  }>;
};

export type Blessing = {
  id: string;
  name: string;
  text: string;
  runsLeft: number;
  effects: Partial<{
    attackRate: number;
    defenseRate: number;
    critRate: number;
    expRate: number;
    goldRate: number;
    dropRate: number;
    maxHpRate: number;
    maxMpRate: number;
  }>;
};

export type EquipmentSlot =
  | "무기"
  | "투구"
  | "갑옷"
  | "장갑"
  | "신발"
  | "망토"
  | "반지"
  | "목걸이"
  | "귀걸이";

export type Equipment = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  level: number;
  masteryLevel: number;
  masteryExp: number;
  masteryNext: number;
  enhance: number;
  stats: Partial<Stats>;
  attack?: number;
  defense?: number;
  options: string[];
  setName?: string;
  price: number;
};

export type InventoryItem =
  | { id: string; type: "consumable"; name: string; qty: number; heal: number; mp?: number }
  | { id: string; type: "material"; name: string; qty: number; rarity: Rarity }
  | { id: string; type: "equipment"; equipment: Equipment; qty: 1 };

export type Monster = {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  exp: number;
  gold: number;
  pattern: { attack: number; defend: number; special: number };
  specialName: string;
};

export type RoomKind =
  | "일반방"
  | "몬스터방"
  | "함정방"
  | "이벤트방"
  | "보물방"
  | "상점방"
  | "휴식방"
  | "미니보스방"
  | "보스방";

export type DungeonRoom = {
  id: string;
  kind: RoomKind;
  title: string;
  description: string;
  choices: string[];
  monster?: Monster;
  monsters?: Monster[];
  cleared?: boolean;
};

export type Quest = {
  id: string;
  type: "메인" | "서브" | "일일" | "업적";
  title: string;
  goal: string;
  progress: number;
  target: number;
  reward: string;
  completed: boolean;
};

export type Achievement = {
  id: string;
  title: string;
  text: string;
  reward: string;
  unlocked: boolean;
};

export type BuildSynergy = {
  id: string;
  name: string;
  text: string;
  tier: "I" | "II" | "III";
  effects: Partial<{
    attackRate: number;
    magicRate: number;
    defenseRate: number;
    critRate: number;
    dropRate: number;
    expRate: number;
    goldRate: number;
    mpCostRate: number;
  }>;
};

export type EncounterCodexEntry = {
  id: string;
  name: string;
  text: string;
  discovered: boolean;
};

export type DailyRiftState = {
  date: string;
  completed: boolean;
  tier: number;
  seed: number;
};

export type Relic = {
  id: string;
  name: string;
  rarity: Rarity;
  text: string;
  effects: Partial<{
    attackRate: number;
    magicRate: number;
    defenseRate: number;
    critRate: number;
    dropRate: number;
    expRate: number;
    goldRate: number;
  }>;
};

export type SeasonPassState = {
  seasonKey: string;
  name: string;
  startsAt: string;
  endsAt: string;
  xp: number;
  claimedLevels: number[];
};

export type TowerRanking = {
  highestFloor: number;
  bestTurns: number;
  noDeathFloor: number;
};

export type WeeklyBossState = {
  weekKey: string;
  completed: boolean;
  name: string;
  tier: number;
};

export type IdleRewardState = {
  lastSeenAt: string;
  pendingGold: number;
  pendingMaterials: number;
  pendingTowerKeys: number;
  cappedHours: number;
};

export type RewardChoice = {
  id: "equipment-box" | "skill-fragment" | "enhance-stone";
  title: string;
  text: string;
};

export type RewardChoiceState = {
  source: string;
  choices: RewardChoice[];
};

export type NpcAffinity = Record<"church" | "inn" | "guild" | "blacksmith" | "merchant", number>;

export type SeasonAlbumEntry = {
  id: string;
  category: "기연" | "보스" | "장비" | "유물";
  name: string;
  hint: string;
  collected: boolean;
};

export type SeasonAlbumState = {
  seasonKey: string;
  entries: SeasonAlbumEntry[];
  claimed: boolean;
};

export type AchievementDetail = {
  id: string;
  title: string;
  condition: string;
  hint: string;
  effect: string;
  unlocked: boolean;
};

export type Companion = {
  id: string;
  name: string;
  kind: "동료" | "정령" | "펫";
  level: number;
  exp: number;
  text: string;
  effects: Partial<{
    assistDamageRate: number;
    dropRate: number;
    encounterRate: number;
    goldRate: number;
  }>;
};

export type Rune = {
  id: string;
  name: string;
  element: FateAnalysis["element"];
  text: string;
  effects: Partial<{
    attackRate: number;
    magicRate: number;
    defenseRate: number;
    critRate: number;
    mpCostRate: number;
  }>;
};

export type ExpeditionState = {
  startedAt?: string;
  endsAt?: string;
  assignedItemName?: string;
  claimed: boolean;
};

export type LiveOpsConfig = {
  eventName: string;
  rewardMultiplier: number;
  albumBonusGold: number;
  updatedAt: string;
};

export type NpcMemory = Record<keyof NpcAffinity, string[]>;

export type AdaptiveState = {
  winStreak: number;
  lossStreak: number;
  bonusObjective?: string;
};

export type DailyTask = {
  id: string;
  date: string;
  title: string;
  goal: string;
  progress: number;
  target: number;
  rewardGold: number;
  rewardSeasonXp: number;
  completed: boolean;
  claimed: boolean;
};

export type Character = {
  id: string;
  profile: BirthProfile;
  fate: FateAnalysis;
  job: Job;
  level: number;
  reincarnation: number;
  towerFloor: number;
  exp: number;
  nextExp: number;
  gold: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: Stats;
  traits: Trait[];
  blessings: Blessing[];
  specialSkills: Skill[];
  relics: Relic[];
  titles: string[];
  cosmetics: string[];
  activeTitle?: string;
  activeCosmetic?: string;
  companions: Companion[];
  runes: Rune[];
  skillPoints: number;
  equipment: Partial<Record<EquipmentSlot, Equipment>>;
};

export type DungeonRunInfo = {
  type: "beginner" | "tower" | "rift" | "weekly";
  floor: number;
  rewardMultiplier: number;
  seasonName?: string;
  seasonMod?: string;
  comboStreak?: number;
  turns?: number;
  deaths?: number;
};

export type CombatState = {
  monster: Monster;
  monsters: Monster[];
  defending: boolean;
  log: string[];
};

export type GamePhase = "create" | "town" | "dungeon" | "combat" | "reward" | "defeat";
