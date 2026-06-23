import { jobs, traits } from "@/data/gameData";
import type { BirthProfile, FateAnalysis, Job, Rarity, StatKey, Stats, Trait } from "@/lib/types";

const elements = ["목(木)", "화(火)", "토(土)", "금(金)", "수(水)"] as const;
const temperaments = ["탐험가", "전략가", "수호자", "승부사", "현자", "개척자"];
const fortunes = [
  "오늘의 균열은 작지만 보상이 깊다.",
  "낯선 선택지가 운명을 살짝 비튼다.",
  "강한 적일수록 목걸이가 더 크게 반응한다.",
  "잃어버린 물건이 새 장비의 재료가 된다.",
  "휴식보다 한 걸음 더 나아갈 때 행운이 붙는다.",
];
const talents = ["행운", "마력 순환", "전투 감각", "위험 예지", "재료 감별", "보스 추적"];
const statKeys: StatKey[] = ["STR", "DEX", "INT", "VIT", "WIS", "LUK"];

export function hashProfile(profile: BirthProfile) {
  const source = `${profile.name}|${profile.gender}|${profile.birthDate}|${profile.birthTime}|${profile.height}|${profile.weight}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function seeded(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function analyzeFate(profile: BirthProfile): FateAnalysis {
  const seed = hashProfile(profile);
  const date = new Date(`${profile.birthDate}T${profile.birthTime || "12:00"}`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = Number((profile.birthTime || "12:00").split(":")[0]);
  const zodiac = getZodiac(month, day);
  const element = elements[(month + day + hour) % elements.length];
  const temperament = temperaments[(seed + month) % temperaments.length];
  const talent = talents[(seed + day) % talents.length];
  const luckyStat = statKeys[(seed + hour) % statKeys.length];

  return {
    zodiac,
    element,
    temperament,
    fortune: fortunes[(seed + profile.height + profile.weight) % fortunes.length],
    talent,
    talentBonus: `${talent} +${10 + (seed % 16)}%`,
    luckyStat,
    seed,
  };
}

function getZodiac(month: number, day: number) {
  const edge = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
  const signs = ["염소자리", "물병자리", "물고기자리", "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리"];
  return day < edge[month - 1] ? signs[month - 1] : signs[month % 12];
}

export function rollRarity(random: () => number, reincarnation = 0): Rarity {
  const mythicBoost = Math.min(reincarnation * 0.002, 0.03);
  const legendaryBoost = Math.min(reincarnation * 0.006, 0.08);
  const roll = random();
  if (roll < 0.004 + mythicBoost) return "신화";
  if (roll < 0.024 + legendaryBoost) return "전설";
  if (roll < 0.1) return "영웅";
  if (roll < 0.28) return "희귀";
  if (roll < 0.58) return "고급";
  return "일반";
}

export function rollJob(fate: FateAnalysis, reincarnation = 0): Job {
  const random = seeded(fate.seed + reincarnation * 9973);
  const rarity = rollRarity(random, reincarnation);
  const pool = jobs.filter((job) => job.rarity === rarity && (!job.hidden || random() < 0.35 + reincarnation * 0.03));
  const fallback = jobs.filter((job) => !job.hidden && job.rarity === "고급");
  return (pool.length ? pool : fallback)[Math.floor(random() * (pool.length || fallback.length))];
}

export function rollTrait(seed: number, level: number): Trait {
  const random = seeded(seed + level * 7919);
  const rarity = rollRarity(random);
  const pool = traits.filter((trait) => trait.rarity === rarity);
  return (pool.length ? pool : traits)[Math.floor(random() * (pool.length || traits.length))];
}

export function createStats(profile: BirthProfile, fate: FateAnalysis, job: Job, reincarnation = 0): Stats {
  const bmi = profile.weight / Math.pow(profile.height / 100, 2);
  const base: Stats = {
    STR: 8 + Math.round(Math.max(0, bmi - 18)),
    DEX: 8 + Math.round(Math.max(0, 24 - Math.abs(bmi - 21))),
    INT: 8 + (fate.seed % 5),
    VIT: 9 + Math.round(profile.height / 35),
    WIS: 8 + (new Date(profile.birthDate).getMonth() % 5),
    LUK: 8 + (fate.seed % 9),
  };

  base[fate.luckyStat] += 5;
  for (const key of Object.keys(job.statBias) as StatKey[]) {
    base[key] += job.statBias[key] ?? 0;
  }
  for (const key of Object.keys(base) as StatKey[]) {
    base[key] += reincarnation * 2;
  }
  return base;
}
