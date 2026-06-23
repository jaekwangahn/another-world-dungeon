import { rarityOrder, roomFlavor } from "@/data/gameData";
import { seeded } from "@/lib/fate";
import type { BuildSynergy, Character, DungeonRoom, Equipment, EquipmentSlot, Monster, Rarity, Relic, StatKey, Stats } from "@/lib/types";

const slots: EquipmentSlot[] = ["무기", "투구", "갑옷", "장갑", "신발", "망토", "반지", "목걸이", "귀걸이"];
const weapons = ["장검", "도끼", "창", "단검", "활", "지팡이"];
const prefixes: Record<Rarity, string[]> = {
  일반: ["낡은", "견습용", "단단한"],
  고급: ["정교한", "푸른빛", "용병의"],
  희귀: ["균열의", "별가루", "속삭이는"],
  영웅: ["맹세의", "왕실", "심연추적자"],
  전설: ["전설의", "용혈", "태초의"],
  신화: ["세계선의", "신탁 받은", "시간을 베는"],
};

export function maxHp(stats: Stats, level: number) {
  return 70 + stats.VIT * 9 + level * 14;
}

export function maxMp(stats: Stats, level: number, mpRate = 0) {
  return Math.round((35 + stats.WIS * 7 + stats.INT * 4 + level * 8) * (1 + mpRate));
}

export function attackPower(character: Character) {
  const weapon = character.equipment["무기"];
  const weaponAttack = (weapon?.attack ?? 0) + (weapon?.masteryLevel ?? 1) * 2;
  const traitRate = character.traits.reduce((sum, trait) => sum + (trait.effects?.attackRate ?? 0), 0);
  const blessingRate = (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.attackRate ?? 0), 0);
  const synergyRate = calculateBuildSynergies(character).reduce((sum, synergy) => sum + (synergy.effects.attackRate ?? 0), 0);
  const relicRate = activeRelics(character).reduce((sum, relic) => sum + (relic.effects.attackRate ?? 0), 0);
  const runeRate = (character.runes ?? []).reduce((sum, rune) => sum + (rune.effects.attackRate ?? 0), 0);
  return Math.round((character.stats.STR * 2 + character.stats.DEX + weaponAttack + character.level * 3) * (1 + traitRate + blessingRate + synergyRate + relicRate + runeRate));
}

export function magicPower(character: Character) {
  const synergyRate = calculateBuildSynergies(character).reduce((sum, synergy) => sum + (synergy.effects.magicRate ?? 0), 0);
  const relicRate = activeRelics(character).reduce((sum, relic) => sum + (relic.effects.magicRate ?? 0), 0);
  const runeRate = (character.runes ?? []).reduce((sum, rune) => sum + (rune.effects.magicRate ?? 0), 0);
  return Math.round((character.stats.INT * 2.5 + character.stats.WIS + character.level * 3) * (1 + synergyRate + relicRate + runeRate));
}

export function defensePower(character: Character) {
  const gear = Object.values(character.equipment).reduce((sum, item) => sum + (item?.defense ?? 0) + (item?.masteryLevel ?? 1), 0);
  const traitRate = character.traits.reduce((sum, trait) => sum + (trait.effects?.defenseRate ?? 0), 0);
  const blessingRate = (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.defenseRate ?? 0), 0);
  const synergyRate = calculateBuildSynergies(character).reduce((sum, synergy) => sum + (synergy.effects.defenseRate ?? 0), 0);
  const relicRate = activeRelics(character).reduce((sum, relic) => sum + (relic.effects.defenseRate ?? 0), 0);
  const runeRate = (character.runes ?? []).reduce((sum, rune) => sum + (rune.effects.defenseRate ?? 0), 0);
  return Math.max(0, Math.round((character.stats.VIT * 1.6 + gear + character.level * 2) * (1 + traitRate + blessingRate + synergyRate + relicRate + runeRate)));
}

function activeRelics(character: Character) {
  return ((character as Character & { relics?: Relic[] }).relics ?? []);
}

export function expToNext(level: number) {
  return Math.floor(90 + level ** 1.72 * 38);
}

export function createMonster(level: number, kind: "normal" | "mini" | "boss", seed: number): Monster {
  const random = seeded(seed);
  const names = kind === "boss" ? ["고블린 킹", "균열의 문지기"] : kind === "mini" ? ["홉고블린 선봉장", "동굴 오우거"] : ["고블린", "동굴 박쥐", "슬라임", "해골병"];
  const scale = kind === "boss" ? 2.65 : kind === "mini" ? 1.75 : 1;
  const name = names[Math.floor(random() * names.length)];
  return {
    id: `${kind}-${seed}`,
    name,
    level,
    hp: Math.round((55 + level * 24) * scale),
    maxHp: Math.round((55 + level * 24) * scale),
    attack: Math.round((10 + level * 5) * scale),
    defense: Math.round((4 + level * 2) * scale),
    exp: Math.round((40 + level * 18) * scale),
    gold: Math.round((20 + level * 11) * scale),
    pattern: kind === "boss" ? { attack: 0.45, defend: 0.15, special: 0.4 } : { attack: 0.7, defend: 0.1, special: 0.2 },
    specialName: kind === "boss" ? "포효와 강타" : "난폭한 일격",
  };
}

function createMonsterGroup(level: number, kind: "normal" | "mini" | "boss", seed: number, random: () => number) {
  const count = kind === "boss" ? 1 : kind === "mini" ? 1 + Math.floor(random() * 2) : 1 + Math.floor(random() * 4);
  return Array.from({ length: count }, (_, index) => createMonster(level + Math.floor(index / 2), kind, seed + index * 997));
}

export function generateDungeon(character: Character): DungeonRoom[] {
  const random = seeded(character.fate.seed + character.level * 131 + Date.now());
  const middleKinds: DungeonRoom["kind"][] = ["일반방", "몬스터방", "함정방", "이벤트방", "보물방", "상점방", "휴식방", "몬스터방"];
  const length = 7 + Math.floor(random() * 4);
  const rooms: DungeonRoom[] = [];

  for (let index = 0; index < length; index += 1) {
    let kind: DungeonRoom["kind"];
    if (index === 0) kind = "일반방";
    else if (index === length - 2) kind = "미니보스방";
    else if (index === length - 1) kind = "보스방";
    else kind = middleKinds[Math.floor(random() * middleKinds.length)];
    const monsters = kind === "몬스터방" || kind === "미니보스방" || kind === "보스방"
      ? createMonsterGroup(character.level + Math.floor(index / 2), kind === "보스방" ? "boss" : kind === "미니보스방" ? "mini" : "normal", character.fate.seed + index * 37, random)
      : undefined;
    const flavor = roomFlavor[kind][Math.floor(random() * roomFlavor[kind].length)];
    rooms.push({
      id: `room-${index}-${character.fate.seed}`,
      kind,
      title: kind === "보스방" ? "초심자 던전 심장부" : `${index + 1}번 방: ${kind}`,
      description: flavor,
      choices: buildChoices(kind),
      monster: monsters?.[0],
      monsters,
    });
  }

  return rooms;
}

export function generateTowerDungeon(character: Character, floor: number): DungeonRoom[] {
  const random = seeded(character.fate.seed + floor * 10007 + Date.now());
  const middleKinds: DungeonRoom["kind"][] = ["몬스터방", "함정방", "이벤트방", "보물방", "몬스터방", "휴식방", "몬스터방"];
  const length = Math.min(12, 6 + Math.floor(floor / 35) + Math.floor(random() * 3));
  const rooms: DungeonRoom[] = [];
  const levelBonus = Math.floor(floor * 0.72) + Math.floor(floor / 25) * 3;

  for (let index = 0; index < length; index += 1) {
    let kind: DungeonRoom["kind"];
    if (index === 0) kind = "일반방";
    else if (index === length - 2) kind = floor % 10 === 0 ? "미니보스방" : middleKinds[Math.floor(random() * middleKinds.length)];
    else if (index === length - 1) kind = "보스방";
    else kind = middleKinds[Math.floor(random() * middleKinds.length)];
    const monsters = kind === "몬스터방" || kind === "미니보스방" || kind === "보스방"
      ? createMonsterGroup(character.level + levelBonus + Math.floor(index / 2), kind === "보스방" ? "boss" : kind === "미니보스방" ? "mini" : "normal", character.fate.seed + floor * 97 + index * 37, random)
      : undefined;
    const flavor = roomFlavor[kind][Math.floor(random() * roomFlavor[kind].length)];
    rooms.push({
      id: `tower-${floor}-room-${index}-${character.fate.seed}`,
      kind,
      title: kind === "보스방" ? `무한탑 ${floor}층 수호자` : `무한탑 ${floor}층 · ${index + 1}구역`,
      description: `${flavor} 탑의 압력이 ${floor}층의 무게로 어깨를 누른다.`,
      choices: buildChoices(kind),
      monster: monsters?.[0],
      monsters,
    });
  }

  return rooms;
}

export function generateDailyRiftDungeon(character: Character, tier: number, seed: number): DungeonRoom[] {
  const random = seeded(character.fate.seed + seed + tier * 4099);
  const kinds: DungeonRoom["kind"][] = ["이벤트방", "몬스터방", "함정방", "보물방", "몬스터방", "휴식방"];
  const length = 7 + Math.min(4, tier);
  const rooms: DungeonRoom[] = [];
  const levelBonus = tier * 4 + Math.floor(character.level * 0.18);

  for (let index = 0; index < length; index += 1) {
    let kind: DungeonRoom["kind"];
    if (index === 0) kind = "이벤트방";
    else if (index === length - 1) kind = "보스방";
    else kind = kinds[Math.floor(random() * kinds.length)];
    const monsters = kind === "몬스터방" || kind === "보스방"
      ? createMonsterGroup(character.level + levelBonus + Math.floor(index / 2), kind === "보스방" ? "boss" : "normal", seed + index * 503, random)
      : undefined;
    const flavor = roomFlavor[kind][Math.floor(random() * roomFlavor[kind].length)];
    rooms.push({
      id: `daily-rift-${seed}-${index}`,
      kind,
      title: kind === "보스방" ? `일일 균열 심장부 T${tier}` : `일일 균열 T${tier} · ${index + 1}파동`,
      description: `${flavor} 균열의 가장자리가 오늘의 날짜처럼 한 번만 열렸다 닫힐 준비를 한다.`,
      choices: buildChoices(kind),
      monster: monsters?.[0],
      monsters,
    });
  }

  return rooms;
}

export function currentTowerSeason(date = new Date()) {
  const seasons = [
    { name: "화염 왕관 시즌", mod: "공격형 빌드 보상 증가", rewardBonus: 0.18 },
    { name: "별무리 순례 시즌", mod: "기연과 특수 스킬 발견률 증가", rewardBonus: 0.12 },
    { name: "심연 채굴 시즌", mod: "골드와 장비 드랍 증가", rewardBonus: 0.22 },
    { name: "청월 마나 시즌", mod: "마나/기연 빌드 효율 증가", rewardBonus: 0.16 },
  ];
  const seasonLengthDays = 28;
  const epoch = new Date(date.getFullYear(), 0, 1).getTime();
  const day = Math.floor((date.getTime() - epoch) / 86_400_000);
  const seasonIndex = Math.floor(day / seasonLengthDays);
  const startsAt = new Date(epoch + seasonIndex * seasonLengthDays * 86_400_000);
  const endsAt = new Date(epoch + (seasonIndex + 1) * seasonLengthDays * 86_400_000 - 1);
  return {
    ...seasons[seasonIndex % seasons.length],
    key: `${date.getFullYear()}-S${seasonIndex + 1}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function calculateBuildSynergies(character: Character): BuildSynergy[] {
  const equipment = Object.values(character.equipment).filter(Boolean) as Equipment[];
  const synergies: BuildSynergy[] = [];
  const hasCritGear = equipment.filter((item) => item.options.some((option) => option.startsWith("치명타 +"))).length;
  const setCount = equipment.filter((item) => item.setName === "용기사 세트").length;
  const highMastery = equipment.filter((item) => (item.masteryLevel ?? 1) >= 5).length;
  const hiddenJob = !!character.job.hidden;
  const specialCount = character.specialSkills?.length ?? 0;
  const lucky = character.traits.some((trait) => trait.id === "lucky" || trait.id === "worldline");
  const armored = ["투구", "갑옷", "장갑", "신발", "망토"].filter((slot) => character.equipment[slot as EquipmentSlot]).length;

  if (hiddenJob && specialCount >= 1) {
    synergies.push({ id: "worldline-awakened", name: "세계선 각성", tier: specialCount >= 3 ? "III" : "II", text: "숨겨진 직업과 기연 스킬이 공명해 공격/마법/드랍이 상승", effects: { attackRate: 0.12, magicRate: 0.12, dropRate: 0.12 } });
  }
  if (hasCritGear >= 2 || lucky) {
    synergies.push({ id: "fatal-luck", name: "치명적 행운", tier: hasCritGear >= 3 ? "III" : "I", text: "행운 특성 또는 치명 장비가 크리티컬 확률을 밀어 올림", effects: { critRate: hasCritGear >= 3 ? 0.1 : 0.06, goldRate: 0.06 } });
  }
  if (setCount >= 2) {
    synergies.push({ id: "dragon-oath", name: "용기사 세트 공명", tier: setCount >= 6 ? "III" : setCount >= 4 ? "II" : "I", text: "용기사 세트 착용 수에 따라 공격과 방어가 함께 상승", effects: { attackRate: 0.06 + setCount * 0.02, defenseRate: 0.05 + setCount * 0.015 } });
  }
  if (highMastery >= 3) {
    synergies.push({ id: "tempered-kit", name: "숙련 장비술", tier: highMastery >= 6 ? "III" : "II", text: "자주 사용한 장비들이 손에 붙어 전체 전투 효율 상승", effects: { attackRate: 0.07, defenseRate: 0.07, expRate: 0.05 } });
  }
  if (armored >= 5) {
    synergies.push({ id: "full-guard", name: "전신 방호", tier: "I", text: "방어구 슬롯을 갖춰 탑 장기전에 강해짐", effects: { defenseRate: 0.12 } });
  }
  if (character.job.archetype === "magic" && character.maxMp >= 180) {
    synergies.push({ id: "mana-overflow", name: "마나 과충전", tier: "II", text: "마법 직업과 높은 MP가 맞물려 마법 피해 증가", effects: { magicRate: 0.14, critRate: 0.03 } });
  }
  if (character.fate.element === "수(水)" && character.job.name === "차원술사" && character.traits.some((trait) => trait.id === "mana")) {
    synergies.push({ id: "water-dimensional-mana", name: "수월 차원회로", tier: "III", text: "수(水), 차원술사, 마나체질이 연결되어 스킬 MP 소모 감소", effects: { magicRate: 0.1, mpCostRate: -0.18 } });
  }
  if (character.fate.element === "화(火)" && character.job.name.includes("용") && specialCount >= 1) {
    synergies.push({ id: "flame-dragon-fate", name: "화룡 운명식", tier: "III", text: "화(火) 기운과 용 계열 운명이 폭발적인 크리티컬을 만든다", effects: { attackRate: 0.12, critRate: 0.08 } });
  }

  return synergies.slice(0, 5);
}

export function skillMpCost(character: Character, baseCost: number) {
  const rate = calculateBuildSynergies(character).reduce((sum, synergy) => sum + (synergy.effects.mpCostRate ?? 0), 0)
    + (character.runes ?? []).reduce((sum, rune) => sum + (rune.effects.mpCostRate ?? 0), 0);
  return Math.max(0, Math.ceil(baseCost * (1 + rate)));
}

function buildChoices(kind: DungeonRoom["kind"]) {
  if (kind === "보스방" || kind === "미니보스방" || kind === "몬스터방") return ["전투 개시", "방어 태세로 관찰", "도주로 확인"];
  if (kind === "보물방") return ["상자 열기", "함정 확인", "목걸이로 감정"];
  if (kind === "함정방") return ["조심히 통과", "민첩하게 돌파", "해체 시도"];
  if (kind === "상점방") return ["물약 구매", "장비 감정", "대화"];
  if (kind === "휴식방") return ["휴식", "명상", "장비 정비"];
  return ["왼쪽 길", "오른쪽 길", "수상한 문 조사", "지도 사용"];
}

export function rollEquipment(level: number, luck: number, seed: number, forceRarity?: Rarity): Equipment {
  const random = seeded(seed);
  const rarity = forceRarity ?? rollLootRarity(random, luck);
  const slot = random() < 0.36 ? "무기" : slots[1 + Math.floor(random() * (slots.length - 1))];
  const grade = rarityOrder.indexOf(rarity) + 1;
  const statKey: StatKey = ["STR", "DEX", "INT", "VIT", "WIS", "LUK"][Math.floor(random() * 6)] as StatKey;
  const nameCore = slot === "무기" ? weapons[Math.floor(random() * weapons.length)] : slot;
  const stats: Partial<Stats> = { [statKey]: grade * 2 + Math.floor(level / 4) };
  const equipment: Equipment = {
    id: `eq-${seed}-${Date.now()}`,
    name: `${prefixes[rarity][Math.floor(random() * prefixes[rarity].length)]} ${nameCore}`,
    slot,
    rarity,
    level,
    masteryLevel: 1,
    masteryExp: 0,
    masteryNext: 100,
    enhance: 0,
    stats,
    attack: slot === "무기" ? 8 + level * 3 + grade * 8 : undefined,
    defense: slot !== "무기" ? 4 + level * 2 + grade * 5 : undefined,
    options: [
      `${statKey} +${stats[statKey]}`,
      random() > 0.55 ? `치명타 +${3 + grade * 2}%` : `드랍률 +${grade * 4}%`,
    ],
    setName: rarity === "전설" || rarity === "신화" ? "용기사 세트" : undefined,
    price: 60 + level * 20 + grade * 140,
  };
  return equipment;
}

export function equipmentScore(equipment: Equipment) {
  const rarityScore = (rarityOrder.indexOf(equipment.rarity) + 1) * 120;
  const statScore = Object.values(equipment.stats).reduce((sum, value) => sum + (value ?? 0) * 8, 0);
  const combatScore = (equipment.attack ?? 0) * 2 + (equipment.defense ?? 0) * 1.6;
  return rarityScore + statScore + combatScore + equipment.enhance * 20 + (equipment.masteryLevel ?? 1) * 10;
}

export function addEquipmentMastery(equipment: Equipment, exp: number): { equipment: Equipment; leveled: boolean } {
  const next = {
    ...equipment,
    masteryLevel: equipment.masteryLevel ?? 1,
    masteryExp: equipment.masteryExp ?? 0,
    masteryNext: equipment.masteryNext ?? 100,
  };
  let leveled = false;
  next.masteryExp += exp;
  while (next.masteryExp >= next.masteryNext && next.masteryLevel < 50) {
    next.masteryExp -= next.masteryNext;
    next.masteryLevel += 1;
    next.masteryNext = Math.round(next.masteryNext * 1.22 + 35);
    if (next.attack) next.attack += 2 + Math.floor(next.masteryLevel / 5);
    if (next.defense) next.defense += 1 + Math.floor(next.masteryLevel / 6);
    leveled = true;
  }
  return { equipment: next, leveled };
}

function rollLootRarity(random: () => number, luck: number): Rarity {
  const roll = random() - Math.min(luck * 0.002, 0.12);
  if (roll < 0.01) return "신화";
  if (roll < 0.045) return "전설";
  if (roll < 0.13) return "영웅";
  if (roll < 0.31) return "희귀";
  if (roll < 0.62) return "고급";
  return "일반";
}

export function applyLevelUps(character: Character): Character {
  const next = { ...character, stats: { ...character.stats }, blessings: character.blessings ?? [] };
  while (next.exp >= next.nextExp && next.level < 999) {
    next.exp -= next.nextExp;
    next.level += 1;
    next.skillPoints += 1;
    next.nextExp = expToNext(next.level);
    next.stats.STR += 1 + (next.job.statBias.STR ? 1 : 0);
    next.stats.DEX += 1 + (next.job.statBias.DEX ? 1 : 0);
    next.stats.INT += 1 + (next.job.statBias.INT ? 1 : 0);
    next.stats.VIT += 1 + (next.job.statBias.VIT ? 1 : 0);
    next.stats.WIS += 1 + (next.job.statBias.WIS ? 1 : 0);
    next.stats.LUK += 1 + (next.job.statBias.LUK ? 1 : 0);
    next.maxHp = maxHp(next.stats, next.level);
    next.maxMp = maxMp(next.stats, next.level, next.traits.reduce((sum, trait) => sum + (trait.effects?.maxMpRate ?? 0), 0));
    next.hp = next.maxHp;
    next.mp = next.maxMp;
  }
  return next;
}
