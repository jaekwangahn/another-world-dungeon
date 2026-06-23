import type { Job, Quest, Rarity, Skill, Trait } from "@/lib/types";

export const rarityOrder: Rarity[] = ["일반", "고급", "희귀", "영웅", "전설", "신화"];

export const rarityColor: Record<Rarity, string> = {
  일반: "text-zinc-200 border-zinc-600",
  고급: "text-emerald-200 border-emerald-500/60",
  희귀: "text-sky-200 border-sky-500/60",
  영웅: "text-violet-200 border-violet-500/60",
  전설: "text-amber-200 border-amber-500/60",
  신화: "text-rose-200 border-rose-500/60",
};

const swordSkills: Skill[] = [
  { id: "slash", name: "베기", mpCost: 3, power: 1.25, text: "정면의 적을 빠르게 벤다.", unlockLevel: 1 },
  { id: "heavy-cut", name: "강타", mpCost: 6, power: 1.55, text: "방어를 흔드는 묵직한 일격.", unlockLevel: 4 },
  { id: "storm-cleave", name: "폭풍참", mpCost: 14, power: 2.2, text: "검압으로 방 전체를 가른다.", unlockLevel: 12 },
];

const magicSkills: Skill[] = [
  { id: "fireball", name: "파이어볼", mpCost: 5, power: 1.45, text: "응축한 화염구를 날린다.", unlockLevel: 1 },
  { id: "chain-lightning", name: "번개사슬", mpCost: 11, power: 1.9, text: "튀어 오르는 번개로 약점을 찌른다.", unlockLevel: 8 },
  { id: "meteor", name: "메테오", mpCost: 22, power: 3.1, text: "작은 운석을 소환한다.", unlockLevel: 24 },
];

const rogueSkills: Skill[] = [
  { id: "backstab", name: "기습", mpCost: 4, power: 1.35, text: "빈틈을 찔러 높은 치명 확률을 얻는다.", unlockLevel: 1 },
  { id: "smoke", name: "연막", mpCost: 7, power: 0.8, text: "회피 태세와 함께 반격한다.", unlockLevel: 6 },
  { id: "shadow-raid", name: "그림자 난무", mpCost: 16, power: 2.5, text: "연속 타격으로 전투를 끝낸다.", unlockLevel: 18 },
];

export const specialEncounterSkills: Skill[] = [
  { id: "fate-cut", name: "운명절단", mpCost: 18, power: 2.7, text: "목걸이에 맺힌 세계선을 베어낸다.", unlockLevel: 1, special: true },
  { id: "starfall-step", name: "성락보", mpCost: 12, power: 2.05, text: "별빛의 궤적으로 파고들어 급소를 찌른다.", unlockLevel: 1, special: true },
  { id: "void-flame", name: "공허염", mpCost: 20, power: 2.9, text: "검은 불꽃으로 방어를 녹인다.", unlockLevel: 1, special: true },
  { id: "dragon-pulse", name: "용맥공명", mpCost: 16, power: 2.35, text: "던전의 용맥을 끌어올려 충격파를 터뜨린다.", unlockLevel: 1, special: true },
  { id: "oracle-mark", name: "신탁의 낙인", mpCost: 14, power: 2.15, text: "적의 운명에 약점의 표식을 새긴다.", unlockLevel: 1, special: true },
];

export const encounterTexts = [
  "벽 안쪽에서 오래된 스승의 목소리가 들려왔다.",
  "목걸이가 현실의 기억 하나를 태워 이세계의 기술로 바꾸었다.",
  "무너진 석상 아래에서 이름 없는 영웅의 잔상이 검을 겨누었다.",
  "빛나는 균열 속에서 별자리의 문장이 손등에 새겨졌다.",
  "던전의 시간이 멈춘 순간, 몸이 스스로 낯선 동작을 익혔다.",
  "공중에 뒤집힌 계단이 나타나더니, 밟지 않은 발자국이 먼저 앞으로 걸어갔다.",
  "피 묻은 일기장이 스스로 페이지를 넘기며 잊힌 전투 자세를 보여주었다.",
  "심장 박동과 같은 간격으로 울리는 종소리가 몸속 마나의 흐름을 다시 짰다.",
  "천장에 떠오른 별무리가 현실의 생년월일과 겹치며 새로운 운명의 문장을 만들었다.",
  "검은 안개 속에서 미래의 자신이 한 수를 보여주고 흔적 없이 사라졌다.",
];

export const jobs: Job[] = [
  { name: "검사", rarity: "일반", archetype: "melee", statBias: { STR: 4, VIT: 2 }, skills: swordSkills },
  { name: "기사", rarity: "고급", archetype: "melee", statBias: { STR: 3, VIT: 5, WIS: 1 }, skills: swordSkills },
  { name: "궁수", rarity: "고급", archetype: "ranged", statBias: { DEX: 5, LUK: 2 }, skills: rogueSkills },
  { name: "도적", rarity: "희귀", archetype: "ranged", statBias: { DEX: 4, LUK: 4 }, skills: rogueSkills },
  { name: "성기사", rarity: "영웅", archetype: "support", statBias: { STR: 3, VIT: 4, WIS: 4 }, skills: swordSkills },
  { name: "흑마법사", rarity: "영웅", archetype: "magic", statBias: { INT: 6, WIS: 2, LUK: 1 }, skills: magicSkills },
  { name: "원소술사", rarity: "희귀", archetype: "magic", statBias: { INT: 5, WIS: 3 }, skills: magicSkills },
  { name: "사냥꾼", rarity: "고급", archetype: "ranged", statBias: { DEX: 4, WIS: 2, LUK: 2 }, skills: rogueSkills },
  { name: "수도사", rarity: "희귀", archetype: "hybrid", statBias: { STR: 2, DEX: 2, WIS: 4 }, skills: swordSkills },
  { name: "연금술사", rarity: "희귀", archetype: "support", statBias: { INT: 3, WIS: 4, LUK: 2 }, skills: magicSkills },
  { name: "용기사", rarity: "전설", hidden: true, archetype: "hybrid", statBias: { STR: 7, VIT: 5, LUK: 2 }, skills: swordSkills },
  { name: "차원술사", rarity: "전설", hidden: true, archetype: "magic", statBias: { INT: 7, WIS: 5, DEX: 2 }, skills: magicSkills },
  { name: "시간지배자", rarity: "신화", hidden: true, archetype: "magic", statBias: { INT: 9, WIS: 7, LUK: 5 }, skills: magicSkills },
  { name: "신탁자", rarity: "신화", hidden: true, archetype: "support", statBias: { WIS: 9, LUK: 7, INT: 4 }, skills: magicSkills },
  { name: "세계수의 수호자", rarity: "신화", hidden: true, archetype: "hybrid", statBias: { VIT: 8, WIS: 6, STR: 4 }, skills: swordSkills },
];

export const traits: Trait[] = [
  { id: "berserker", name: "광전사", rarity: "희귀", text: "공격력 +20%, 방어 안정성 감소", statBonus: { STR: 5 }, effects: { attackRate: 0.2, defenseRate: -0.1 } },
  { id: "lucky", name: "행운아", rarity: "영웅", text: "아이템 드랍 +30%, 치명 확률 +5%", statBonus: { LUK: 6 }, effects: { dropRate: 0.3, critRate: 0.05 } },
  { id: "mana", name: "마나체질", rarity: "고급", text: "최대 MP +50%", statBonus: { WIS: 3 }, effects: { maxMpRate: 0.5 } },
  { id: "iron", name: "철벽", rarity: "고급", text: "VIT +5, 방어 효율 +15%", statBonus: { VIT: 5 }, effects: { defenseRate: 0.15 } },
  { id: "pathfinder", name: "길잡이", rarity: "희귀", text: "함정 피해 감소, 도주 확률 +15%", statBonus: { DEX: 4, WIS: 2 }, effects: { escapeRate: 0.15 } },
  { id: "worldline", name: "세계선 감응", rarity: "신화", text: "숨겨진 보상 확률 증가", statBonus: { INT: 4, WIS: 4, LUK: 8 }, effects: { dropRate: 0.45, critRate: 0.08 } },
];

export const starterQuests: Quest[] = [
  {
    id: "main-necklace",
    type: "메인",
    title: "목걸이의 첫 공명",
    goal: "초심자 던전 보스 처치",
    progress: 0,
    target: 1,
    reward: "골드 500, 희귀 장비 상자",
    completed: false,
  },
  {
    id: "daily-hunt",
    type: "일일",
    title: "초심자의 사냥",
    goal: "몬스터 3마리 처치",
    progress: 0,
    target: 3,
    reward: "골드 100, 회복 물약 2개",
    completed: false,
  },
  {
    id: "ach-first",
    type: "업적",
    title: "첫 사냥",
    goal: "첫 몬스터 처치",
    progress: 0,
    target: 1,
    reward: "골드 100",
    completed: false,
  },
];

export const roomFlavor = {
  일반방: [
    "벽돌 사이로 새어 나온 푸른 빛이 바닥 위에 낯선 별자리를 그린다.",
    "낡은 횃불은 꺼져 있는데, 불꽃의 그림자만 벽을 기어 다닌다.",
    "누군가 방금 지나간 듯 먼지가 한 줄로 갈라져 있고, 목걸이가 그 흔적을 따라 떨린다.",
    "공기는 조용하지만 발밑의 돌은 아주 낮은 목소리로 이름을 부른다.",
    "천장에 매달린 뿌리들이 심장처럼 수축하며 길의 방향을 가리킨다.",
  ],
  몬스터방: [
    "어둠 속에서 여러 개의 발톱이 돌바닥을 긁고, 그 소리가 점점 박자를 맞춘다.",
    "부서진 방패 뒤로 적의 숨결이 하얗게 피어오른다.",
    "낡은 갑옷 더미가 흔들리더니, 그 안에서 굶주린 눈동자들이 하나씩 켜진다.",
    "비린 냄새와 젖은 흙냄새가 섞이며, 통로 끝에서 낮은 으르렁거림이 번진다.",
    "몬스터들이 당신의 목걸이를 알아본 듯 동시에 고개를 돌린다.",
  ],
  함정방: [
    "바닥의 먼지가 너무 고르게 쌓여 있다. 오히려 그 완벽함이 수상하다.",
    "천장 틈마다 검은 쇳가루가 붙어 있고, 숨을 들이쉴 때마다 금속 맛이 난다.",
    "벽의 조각상들이 모두 눈을 감고 있다. 단 하나, 출구 옆 조각상만 눈을 뜬 채 웃는다.",
    "돌판 아래에서 태엽이 감기는 소리가 희미하게 들린다.",
    "붉은 실처럼 얇은 마력이 통로를 가로지르며 숨 쉬듯 팽팽해진다.",
  ],
  이벤트방: [
    "공중에 찢긴 기억 조각들이 떠 있고, 그 속에는 아직 일어나지 않은 장면도 섞여 있다.",
    "방 중앙의 거울은 당신이 아닌, 이세계에서 오래 살아남은 누군가를 비춘다.",
    "이름 없는 제단 위에서 현실의 물건 하나가 잠깐 나타났다가 빛으로 흩어진다.",
    "검은 새의 깃털이 눈처럼 떨어지고, 바닥에 닿기 전마다 작은 환상이 피어난다.",
    "어디선가 열린 문소리가 들리지만, 이 방에는 문이 하나뿐이다.",
  ],
  보물방: [
    "먼지 쌓인 궤짝이 숨을 쉬듯 부풀었다 가라앉고, 금속 장식이 눈꺼풀처럼 떨린다.",
    "금빛 균열 너머로 장비의 실루엣이 보이고, 손을 뻗을수록 더 멀어진다.",
    "바닥에 흩어진 동전들이 당신의 발걸음에 맞춰 조용히 굴러 길을 만든다.",
    "낡은 보관함 위에는 오래전 누군가 남긴 경고문이 칼자국처럼 새겨져 있다.",
    "방 한가운데 작은 왕관이 놓여 있다. 보물인지 미끼인지는 아직 알 수 없다.",
  ],
  상점방: [
    "떠돌이 상인이 현실의 동전과 이세계 금화를 함께 세며 당신을 기다리고 있다.",
    "작은 천막 안에 이상할 만큼 현대적인 계산기가 놓여 있고, 화면에는 당신의 이름이 떠 있다.",
    "상인의 등 뒤 선반에는 가격표 대신 짧은 예언들이 매달려 있다.",
    "주인 없는 가판대가 스스로 삐걱거리며 펼쳐지고, 물건들이 하나씩 앞줄로 나온다.",
    "상인은 웃고 있지만 그림자는 웃지 않는다. 그래도 물건은 진짜처럼 보인다.",
  ],
  휴식방: [
    "맑은 샘이 조용히 흐르고, 수면에는 현실 방의 천장이 비친다.",
    "벽난로도 없는데 따뜻한 공기가 방을 채우고, 낡은 담요가 의자 위에 접혀 있다.",
    "작은 나무 한 그루가 돌바닥을 뚫고 자라나 있으며, 잎마다 미세한 별빛이 맺혀 있다.",
    "방 안에서는 시간이 느리게 흐른다. 숨을 한 번 고르는 사이 상처가 조금씩 닫힌다.",
    "누군가 두고 간 차가 아직 따뜻하다. 향은 낯설지만 위험하지는 않다.",
  ],
  미니보스방: [
    "문장 달린 철문이 천천히 열리고, 안쪽에서 무거운 무기가 바닥을 끄는 소리가 들린다.",
    "짧은 왕관을 쓴 괴물이 통로를 막고, 뒤편의 부하들이 이를 드러낸다.",
    "방 중앙의 횃불들이 하나씩 꺼지며, 마지막 불꽃 아래에 거대한 그림자가 선다.",
    "목걸이가 목을 조이듯 차가워진다. 이 앞의 적은 우연히 마주친 사냥감이 아니다.",
    "벽에 걸린 사냥 전리품들이 흔들리고, 그중 하나가 아직 살아 있는 듯 눈을 깜빡인다.",
  ],
  보스방: [
    "거대한 문 뒤에서 던전의 주인이 숨을 쉬고, 그 숨결만으로 바닥의 먼지가 밀려난다.",
    "목걸이가 위험을 경고하듯 차갑게 식고, 심장 박동이 방 전체에 울린다.",
    "왕좌처럼 솟은 바위 위에 보스의 그림자가 앉아 있다. 아직 움직이지 않았는데도 압도적이다.",
    "공간이 한 번 접혔다 펴지며 출구가 사라진다. 이제 이 방은 승자만 내보낸다.",
    "천장의 균열에서 붉은 빛이 떨어지고, 보스의 이름이 모르는 언어로 새겨진다.",
  ],
} as const;

export const roomVisuals: Record<keyof typeof roomFlavor, string> = {
  일반방: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
  몬스터방: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1400&q=80",
  함정방: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80",
  이벤트방: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80",
  보물방: "https://images.unsplash.com/photo-1601924638867-3ec4c70b7a8f?auto=format&fit=crop&w=1400&q=80",
  상점방: "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=1400&q=80",
  휴식방: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80",
  미니보스방: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1400&q=80",
  보스방: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=80",
};
