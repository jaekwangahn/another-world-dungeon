"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { encounterTexts, specialEncounterSkills, starterQuests } from "@/data/gameData";
import { analyzeFate, createStats, rollJob, rollTrait, seeded } from "@/lib/fate";
import {
  addEquipmentMastery,
  applyLevelUps,
  attackPower,
  calculateBuildSynergies,
  currentTowerSeason,
  defensePower,
  equipmentScore,
  expToNext,
  generateDailyRiftDungeon,
  generateDungeon,
  generateTowerDungeon,
  magicPower,
  maxHp,
  maxMp,
  rollEquipment,
  skillMpCost,
} from "@/lib/gameEngine";
import type {
  BirthProfile,
  Blessing,
  Character,
  Companion,
  CombatState,
  DailyRiftState,
  DailyTask,
  DungeonRoom,
  DungeonRunInfo,
  EncounterCodexEntry,
  Equipment,
  EquipmentSlot,
  GamePhase,
  InventoryItem,
  Quest,
  IdleRewardState,
  AdaptiveState,
  AchievementDetail,
  ExpeditionState,
  LiveOpsConfig,
  NpcAffinity,
  NpcMemory,
  Rarity,
  Relic,
  RewardChoice,
  RewardChoiceState,
  Rune,
  SeasonAlbumState,
  SeasonPassState,
  Skill,
  TowerRanking,
  WeeklyBossState,
} from "@/lib/types";

type GameLog = { id: string; text: string; tone?: "normal" | "good" | "bad" | "rare" };
type PotionSize = "small" | "medium" | "large";

type GameState = {
  phase: GamePhase;
  character?: Character;
  dungeon: DungeonRoom[];
  currentRun?: DungeonRunInfo;
  roomIndex: number;
  combat?: CombatState;
  inventory: InventoryItem[];
  storage: InventoryItem[];
  storageCapacity: number;
  quests: Quest[];
  dailyRift?: DailyRiftState;
  encounterCodex: EncounterCodexEntry[];
  seasonPass: SeasonPassState;
  dailyTasks: DailyTask[];
  weeklyBoss: WeeklyBossState;
  idleReward: IdleRewardState;
  rewardChoice?: RewardChoiceState;
  towerRanking: TowerRanking;
  npcAffinity: NpcAffinity;
  beginnerClears: number;
  seasonAlbum: SeasonAlbumState;
  achievementDetails: AchievementDetail[];
  expedition: ExpeditionState;
  liveOps: LiveOpsConfig;
  npcMemory: NpcMemory;
  adaptive: AdaptiveState;
  logs: GameLog[];
  storyLoading: boolean;
  lastSavedAt?: string;
  createCharacter: (profile: BirthProfile) => void;
  enterDungeon: () => void;
  enterTower: () => void;
  enterDailyRift: () => void;
  enterWeeklyBoss: () => void;
  quickExploreBeginner: () => void;
  resolveRoom: (choice: string) => void;
  combatAction: (action: "attack" | "skill" | "defend" | "dodge" | "item" | "escape", skillId?: string) => void;
  equip: (equipment: Equipment) => void;
  buyPotion: (size: PotionSize) => void;
  receiveBlessing: () => void;
  stayAtInn: () => void;
  visitGuild: () => void;
  enhanceEquipment: (slot: EquipmentSlot) => void;
  enhanceWeapon: () => void;
  sellEquipment: (equipmentId: string) => void;
  storeItem: (item: InventoryItem) => void;
  retrieveItem: (item: InventoryItem) => void;
  buyStorageSlot: () => void;
  claimDailyTask: (taskId: string) => void;
  claimSeasonReward: (level: number) => void;
  claimIdleReward: () => void;
  claimRewardChoice: (choiceId: RewardChoice["id"]) => void;
  reforgeEquipment: (slot: EquipmentSlot) => void;
  claimSeasonAlbumReward: () => void;
  summonCompanion: () => void;
  equipRune: () => void;
  startExpedition: () => void;
  claimExpedition: () => void;
  syncCloudSave: () => Promise<void>;
  loadCloudSave: () => Promise<void>;
  reincarnate: () => void;
  manualSave: () => void;
  exportSave: () => string;
  importSave: (json: string) => boolean;
  generateAiStory: () => Promise<void>;
  reset: () => void;
};

const starterInventory: InventoryItem[] = [
  { id: "potion-small", type: "consumable", name: "소형 회복 물약", qty: 5, heal: 80 },
  { id: "mana-potion", type: "consumable", name: "하급 마나 물약", qty: 2, heal: 0, mp: 45 },
  { id: "ore", type: "material", name: "균열 철광석", qty: 4, rarity: "일반" },
];

type PotionId = "potion-small" | "potion-medium" | "potion-large";

const potionCatalog: Record<PotionSize, { id: PotionId; name: string; heal: number; price: number }> = {
  small: { id: "potion-small", name: "소형 회복 물약", heal: 80, price: 40 },
  medium: { id: "potion-medium", name: "중형 회복 물약", heal: 180, price: 95 },
  large: { id: "potion-large", name: "대형 회복 물약", heal: 420, price: 210 },
};

function log(text: string, tone: GameLog["tone"] = "normal"): GameLog {
  return { id: `${Date.now()}-${Math.random()}`, text, tone };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      phase: "create",
      dungeon: [],
      currentRun: undefined,
      roomIndex: 0,
      inventory: starterInventory,
      storage: [],
      storageCapacity: 5,
      quests: starterQuests,
      dailyRift: createDailyRiftState(),
      encounterCodex: createEncounterCodex([]),
      seasonPass: createSeasonPass(),
      dailyTasks: createDailyTasks(),
      weeklyBoss: createWeeklyBossState(),
      idleReward: createIdleRewardState(),
      rewardChoice: undefined,
      towerRanking: createTowerRanking(),
      npcAffinity: createNpcAffinity(),
      beginnerClears: 0,
      seasonAlbum: createSeasonAlbum(),
      achievementDetails: createAchievementDetails(),
      expedition: createExpeditionState(),
      liveOps: createLiveOpsConfig(),
      npcMemory: createNpcMemory(),
      adaptive: createAdaptiveState(),
      logs: [log("현실의 낡은 골동품점에서 신비한 목걸이를 발견했다.")],
      storyLoading: false,
      lastSavedAt: undefined,

      createCharacter: (profile) => {
        const fate = analyzeFate(profile);
        const job = rollJob(fate);
        const stats = createStats(profile, fate, job);
        const trait = rollTrait(fate.seed, 1);
        for (const key of Object.keys(trait.statBonus ?? {}) as (keyof typeof stats)[]) {
          stats[key] += trait.statBonus?.[key] ?? 0;
        }
        const mpRate = trait.effects?.maxMpRate ?? 0;
        const character: Character = {
          id: `char-${fate.seed}`,
          profile,
          fate,
          job,
          level: 1,
          reincarnation: 0,
          towerFloor: 1,
          exp: 0,
          nextExp: expToNext(1),
          gold: 250,
          hp: maxHp(stats, 1),
          maxHp: maxHp(stats, 1),
          mp: maxMp(stats, 1, mpRate),
          maxMp: maxMp(stats, 1, mpRate),
          stats,
          traits: [trait],
          blessings: [],
          specialSkills: [],
          relics: [],
          titles: [],
          cosmetics: [],
          companions: [],
          runes: [],
          skillPoints: 0,
          equipment: {},
        };
        const weapon = rollEquipment(1, stats.LUK, fate.seed + 17, job.rarity === "일반" ? "고급" : job.rarity);
        character.equipment["무기"] = { ...weapon, slot: "무기" };
        set({
          phase: "town",
          character,
          inventory: starterInventory,
          storage: [],
          storageCapacity: 5,
          quests: starterQuests,
          dailyRift: createDailyRiftState(),
          encounterCodex: createEncounterCodex([]),
          seasonPass: createSeasonPass(),
          dailyTasks: createDailyTasks(character),
          weeklyBoss: createWeeklyBossState(),
          idleReward: createIdleRewardState(),
          rewardChoice: undefined,
          towerRanking: createTowerRanking(),
          npcAffinity: createNpcAffinity(),
          beginnerClears: 0,
          seasonAlbum: createSeasonAlbum(),
          achievementDetails: createAchievementDetails(),
          expedition: createExpeditionState(),
          liveOps: createLiveOpsConfig(),
          npcMemory: createNpcMemory(),
          adaptive: createAdaptiveState(),
          logs: [
            log(`${profile.name}의 현실 정보가 목걸이에 흡수되었다.`, "good"),
            log(`별자리 ${fate.zodiac}, 오행 ${fate.element}, 기질 ${fate.temperament}.`),
            log(`${job.rarity} 직업 '${job.name}'으로 각성했다. 특성 '${trait.name}' 획득.`, job.hidden ? "rare" : "good"),
          ],
        });
      },

      enterDungeon: () => {
        const character = get().character;
        if (!character) return;
        const dungeon = generateDungeon(character);
        set({
          phase: "dungeon",
          dungeon,
          currentRun: { type: "beginner", floor: 1, rewardMultiplier: 1 },
          roomIndex: 0,
          combat: undefined,
          logs: [
            log("목걸이가 손바닥만 한 푸른 문을 토해 내더니, 문은 순식간에 사람 하나가 지나갈 만큼 커졌다."),
            log("초심자 던전의 축축한 공기가 현실의 냄새를 밀어냈다.", "good"),
          ],
        });
      },

      enterTower: () => {
        const savedCharacter = get().character;
        if (!savedCharacter) return;
        const character = normalizeCharacter(savedCharacter);
        if (character.level < 10) return;
        const floor = Math.min(999, Math.max(1, character.towerFloor ?? 1));
        const dungeon = generateTowerDungeon(character, floor);
        const season = currentTowerSeason();
        const rewardMultiplier = 1.35 + floor * 0.08 + season.rewardBonus;
        set({
          phase: "dungeon",
          dungeon,
          currentRun: { type: "tower", floor, rewardMultiplier, seasonName: season.name, seasonMod: season.mod },
          roomIndex: 0,
          combat: undefined,
          logs: [
            log(`${season.name}: 하늘을 찌르는 무한탑의 ${floor}층 문이 열렸다.`, "rare"),
            log(`시즌 효과 · ${season.mod}`),
            log(`탑 보상 배율 x${rewardMultiplier.toFixed(2)} · 층이 오를수록 적도 보상도 거칠어진다.`),
          ],
        });
      },

      enterDailyRift: () => {
        const savedCharacter = get().character;
        if (!savedCharacter) return;
        const character = normalizeCharacter(savedCharacter);
        const rift = normalizeDailyRift(get().dailyRift, character);
        if (rift.completed) {
          set({ dailyRift: rift, logs: [...get().logs, log("오늘의 일일 균열은 이미 안정화했다. 내일 다시 열린다.", "bad")] });
          return;
        }
        const dungeon = generateDailyRiftDungeon(character, rift.tier, rift.seed);
        const rewardMultiplier = 1.65 + rift.tier * 0.28 + calculateBuildSynergies(character).length * 0.04;
        set({
          phase: "dungeon",
          dungeon,
          currentRun: { type: "rift", floor: rift.tier, rewardMultiplier, seasonName: "일일 균열", seasonMod: "하루 1회 고보상 균열" },
          roomIndex: 0,
          combat: undefined,
          dailyRift: rift,
          logs: [
            log(`일일 균열 T${rift.tier} 개방. 오늘 한 번만 클리어 보상을 받을 수 있다.`, "rare"),
            log(`균열 보상 배율 x${rewardMultiplier.toFixed(2)} · 활성 시너지 ${calculateBuildSynergies(character).length}개 반영.`),
          ],
        });
      },

      enterWeeklyBoss: () => {
        const savedCharacter = get().character;
        if (!savedCharacter) return;
        const character = normalizeCharacter(savedCharacter);
        const weeklyBoss = normalizeWeeklyBoss(get().weeklyBoss, character);
        if (weeklyBoss.completed) {
          set({ weeklyBoss, logs: [...get().logs, log("이번 주의 보스는 이미 토벌했다. 다음 주에 새 위협이 나타난다.", "bad")] });
          return;
        }
        const boss: DungeonRoom = {
          id: `weekly-boss-${weeklyBoss.weekKey}`,
          kind: "보스방",
          title: `주간 보스 · ${weeklyBoss.name}`,
          description: `마을 상공의 균열이 붉게 열리고, ${weeklyBoss.name}의 그림자가 성벽 전체를 덮었다.`,
          choices: ["결전 개시", "패턴 관찰", "목걸이 공명"],
          monsters: [createWeeklyBossMonster(character, weeklyBoss)],
        };
        set({
          phase: "dungeon",
          dungeon: [boss],
          currentRun: { type: "weekly", floor: weeklyBoss.tier, rewardMultiplier: 2.4 + weeklyBoss.tier * 0.2, seasonName: "주간 보스", seasonMod: "주 1회 고난도 토벌" },
          roomIndex: 0,
          combat: undefined,
          weeklyBoss,
          logs: [log(`주간 보스 '${weeklyBoss.name}' 출현. 이번 주 1회 보상을 받을 수 있다.`, "rare")],
        });
      },

      quickExploreBeginner: () => {
        const state = get();
        const character = state.character;
        if (!character || state.beginnerClears <= 0) {
          set({ logs: [...state.logs, log("초심자 던전을 1회 이상 클리어해야 빠른 탐험을 사용할 수 있다.", "bad")] });
          return;
        }
        const gainedExp = 80 + character.level * 25;
        const gainedGold = 120 + character.level * 18;
        const next = applyLevelUps(normalizeCharacter({ ...character, exp: character.exp + gainedExp, gold: character.gold + gainedGold }));
        set({
          character: next,
          inventory: addMaterial(state.inventory, "ore", "균열 철광석", 2),
          seasonPass: addSeasonXp(state.seasonPass, 20),
          logs: [...state.logs, log(`빠른 탐험 완료: EXP ${gainedExp}, ${gainedGold}G, 균열 철광석 2개 획득.`, "good")],
        });
      },

      resolveRoom: (choice) => {
        const state = get();
        const character = state.character;
        const room = state.dungeon[state.roomIndex];
        if (!character || !room) return;
        const random = seeded(character.fate.seed + state.roomIndex * 1009 + choice.length + Date.now());

        const roomMonsters = room.monsters ?? (room.monster ? [room.monster] : []);
        if (roomMonsters.length > 0 && !room.cleared) {
          const monsters = roomMonsters.map((monster) => ({ ...monster }));
          set({
            phase: "combat",
            combat: {
              monster: monsters[0],
              monsters,
              defending: false,
              log: [
                monsters.length > 1
                  ? `어둠이 갈라지며 ${monsters.length}마리의 적이 서로 다른 박자로 포위망을 좁힌다.`
                  : "방 안의 공기가 한순간 멎고, 단 하나의 살기가 정면에서 일어선다.",
                `${monsters[0].name}이(가) 먼저 발을 내딛는다.`,
              ],
            },
          });
          return;
        }

        let nextCharacter = normalizeCharacter(character);
        let inventory = [...state.inventory];
        let quests = [...state.quests];
        const logs = [`${choice}을(를) 선택했다.`];

        if (room.kind === "함정방") {
          const avoided = random() < (0.35 + character.stats.DEX * 0.015);
          if (avoided) logs.push("날카로운 발판을 간발의 차이로 피해냈다.");
          else {
            const damage = Math.max(8, 45 - Math.floor(character.stats.VIT * 1.4));
            nextCharacter.hp = Math.max(1, nextCharacter.hp - damage);
            logs.push(`함정이 발동했다. HP ${damage} 피해.`);
          }
        }

        if (room.kind === "보물방" || room.kind === "이벤트방") {
          const eq = rollEquipment(character.level, character.stats.LUK, character.fate.seed + Date.now());
          const auto = autoEquip(nextCharacter, inventory, eq);
          nextCharacter = auto.character;
          inventory = auto.inventory;
          logs.push(`${eq.rarity} 장비 '${eq.name}' 획득.`);
          if (auto.equipped) logs.push(`자동 장착: 기존 장비보다 강해 ${eq.name}을(를) 착용했다.`);
        }

        const encounter = rollSpecialEncounter(nextCharacter, room.kind, random);
        if (encounter.skill) {
          nextCharacter = { ...nextCharacter, specialSkills: [...nextCharacter.specialSkills, encounter.skill] };
          logs.push(`기연 발생: ${encounter.text}`);
          logs.push(`특수 스킬 '${encounter.skill.name}' 습득.`);
          set({
            encounterCodex: markEncounterCodexDiscovered(get().encounterCodex, encounter.skill.id),
            seasonAlbum: collectAlbumEntry(get().seasonAlbum, encounter.skill.name),
          });
        } else if (encounter.text) {
          nextCharacter = { ...nextCharacter, gold: nextCharacter.gold + 80 + nextCharacter.level * 10 };
          logs.push(`기연 발생: ${encounter.text}`);
          logs.push("이미 모든 기연 스킬을 익혀 대신 골드를 얻었다.");
        }

        if (room.kind === "상점방") {
          if (nextCharacter.gold >= 60) {
            nextCharacter.gold -= 60;
            inventory = addConsumable(inventory, "potion", 2);
            logs.push("떠돌이 상인에게서 회복 물약 2개를 샀다.");
          } else logs.push("상인은 웃으며 다음 균열에서 다시 보자고 했다.");
        }

        if (room.kind === "휴식방") {
          nextCharacter.hp = Math.min(nextCharacter.maxHp, nextCharacter.hp + Math.round(nextCharacter.maxHp * 0.45));
          nextCharacter.mp = Math.min(nextCharacter.maxMp, nextCharacter.mp + Math.round(nextCharacter.maxMp * 0.55));
          logs.push("샘물의 기운으로 HP와 MP를 회복했다.");
        }

        const randomEvent = resolveExplorationEvent(nextCharacter, inventory, room.kind, random);
        nextCharacter = randomEvent.character;
        inventory = randomEvent.inventory;
        logs.push(...randomEvent.logs);

        const questProgress = progressExplorationQuests(quests, room.kind);
        quests = questProgress.quests;
        logs.push(...questProgress.logs);
        const dailyProgress = progressDailyTasks(state.dailyTasks, "explore", 1);
        logs.push(...dailyProgress.logs);

        const nextIndex = state.roomIndex + 1;
        if (nextIndex >= state.dungeon.length) {
          set({
            phase: "reward",
            character: nextCharacter,
            inventory,
            quests,
            dailyTasks: dailyProgress.tasks,
            seasonPass: addSeasonXp(state.seasonPass, 8),
            logs: [...state.logs, ...logs.map((text) => log(text, text.includes("획득") || text.includes("완료") ? "good" : "normal")), log("던전의 균열이 안정되었다. 마을로 돌아갈 수 있다.", "good")],
          });
          return;
        }

        set({
          character: nextCharacter,
          inventory,
          quests,
          dailyTasks: dailyProgress.tasks,
          seasonPass: addSeasonXp(state.seasonPass, 8),
          roomIndex: nextIndex,
          logs: [...state.logs, ...logs.map((text) => log(text, text.includes("획득") || text.includes("완료") ? "good" : "normal"))],
        });
      },

      combatAction: (action, skillId) => {
        const state = get();
        const character = state.character;
        const combat = state.combat;
        if (!character || !combat) return;

        const nextCharacter = normalizeCharacter({ ...character, stats: { ...character.stats } });
        const monster = { ...combat.monster };
        const combatMonsters = combat.monsters?.length ? combat.monsters.map((item) => ({ ...item })) : [monster];
        const logs = [...combat.log];
        const inventory = [...state.inventory];
        const random = seeded(character.fate.seed + monster.hp * 13 + Date.now());
        let playerTurnSpent = true;

        if (action === "item") {
          const potion = findBestHealingPotion(inventory);
          if (potion?.type === "consumable") {
            potion.qty -= 1;
            nextCharacter.hp = Math.min(nextCharacter.maxHp, nextCharacter.hp + potion.heal);
            logs.push(`${potion.name}을 사용해 HP ${potion.heal} 회복.`);
          } else {
            logs.push("사용 가능한 회복 물약이 없다.");
            playerTurnSpent = false;
          }
        }

        if (action === "escape") {
          const escapeBonus = character.traits.reduce((sum, trait) => sum + (trait.effects?.escapeRate ?? 0), 0);
          if (random() < 0.38 + character.stats.DEX * 0.01 + escapeBonus) {
            logs.push("현실의 문을 떠올리며 전투에서 이탈했다.");
            set({ phase: "dungeon", combat: undefined, character: nextCharacter, inventory, logs: [...state.logs, log("전투에서 도주했다.", "bad")] });
            return;
          }
          logs.push("도주로가 무너졌다.");
        }

        if (action === "defend") {
          logs.push("방어 태세를 취했다. 다음 피해가 감소한다.");
        }

        if (action === "dodge") {
          const success = random() < 0.28 + character.stats.DEX * 0.012;
          logs.push(success ? "회피에 성공해 반격 각도를 잡았다." : "회피가 늦었다.");
          if (success) monster.hp -= Math.max(4, Math.round(attackPower(character) * 0.45 - monster.defense));
        }

        if (action === "attack") {
          const crit = rollCritical(character, random);
          const damage = Math.max(3, Math.round(attackPower(character) * (crit ? 1.85 : 1) - monster.defense * 0.7));
          monster.hp -= damage;
          logs.push(`${crit ? "무작위 크리티컬! " : ""}${monster.name}에게 ${damage} 피해.`);
        }

        if (action === "skill") {
          const usableSkills = getUsableSkills(character);
          const skill = usableSkills.find((item) => item.id === skillId) ?? usableSkills[0];
          const cost = skillMpCost(character, skill.mpCost);
          if (nextCharacter.mp >= cost) {
            nextCharacter.mp -= cost;
            const base = character.job.archetype === "magic" ? magicPower(character) : attackPower(character);
            const crit = rollCritical(character, random, 0.6);
            const damage = Math.max(5, Math.round(base * skill.power * (crit ? 1.7 : 1) - monster.defense * 0.55));
            monster.hp -= damage;
            logs.push(`${skill.name}(${cost}MP): ${crit ? "크리티컬로 " : ""}${skill.text} ${damage} 피해.`);
          } else {
            logs.push("MP가 부족하다.");
            playerTurnSpent = false;
          }
        }

        if (monster.hp <= 0) {
          const remainingMonsters = combatMonsters.slice(1);
          const finalMonsterInRoom = remainingMonsters.length === 0;
          const bossRoom = finalMonsterInRoom && state.roomIndex >= state.dungeon.length - 1;
          const defeatedBoss = monster.id.startsWith("boss") || monster.id.startsWith("mini") || monster.id.startsWith("weekly");
          const reward = finishCombat(nextCharacter, monster, inventory, state.quests, defeatedBoss, state.currentRun?.rewardMultiplier ?? 1);
          const combo = Math.min(30, (state.currentRun?.comboStreak ?? 0) + 1);
          const dailyKillProgress = progressDailyTasks(state.dailyTasks, "kill", 1);
          const seasonPass = addSeasonXp(state.seasonPass, reward.seasonXp + Math.floor(combo / 3));
          if (!finalMonsterInRoom) {
            const nextMonster = remainingMonsters[0];
            set({
              character: reward.character,
              inventory: reward.inventory,
              quests: reward.quests,
              dailyTasks: dailyKillProgress.tasks,
              seasonPass,
              currentRun: state.currentRun ? { ...state.currentRun, comboStreak: combo } : state.currentRun,
              combat: {
                monster: nextMonster,
                monsters: remainingMonsters,
                defending: false,
                log: [...logs, ...reward.logs.map((entry) => entry.text), ...dailyKillProgress.logs, `연속 처치 ${combo} · 시즌 XP +${reward.seasonXp + Math.floor(combo / 3)}`, `${nextMonster.name}이(가) 다음 상대로 뛰쳐나왔다.`].slice(-8),
              },
            });
            return;
          }
          const dungeon = [...state.dungeon];
          dungeon[state.roomIndex] = { ...dungeon[state.roomIndex], cleared: true };
          const nextIndex = state.roomIndex + 1;
          const towerRun = state.currentRun?.type === "tower" ? state.currentRun : undefined;
          const riftRun = state.currentRun?.type === "rift" ? state.currentRun : undefined;
          const weeklyRun = state.currentRun?.type === "weekly" ? state.currentRun : undefined;
          const clearedTower = bossRoom && !!towerRun;
          const clearedRift = bossRoom && !!riftRun;
          const clearedWeekly = bossRoom && !!weeklyRun;
          const rewardedCharacter = clearedTower
            ? { ...reward.character, towerFloor: Math.min(999, Math.max(reward.character.towerFloor ?? 1, towerRun.floor + 1)) }
            : reward.character;
          const milestone = clearedTower && towerRun.floor % 10 === 0 ? grantTowerMilestone(rewardedCharacter, towerRun.floor) : { character: rewardedCharacter, logs: [] as GameLog[] };
          const riftProgress = clearedRift ? progressDailyTasks(dailyKillProgress.tasks, "rift", 1) : dailyKillProgress;
          const relicReward = defeatedBoss ? rollRelicReward(milestone.character, state.currentRun?.type ?? "beginner") : undefined;
          const seasonAwards = clearedTower ? grantTowerSeasonAwards(milestone.character, towerRun.floor) : milestone.character;
          const companionResult = growCompanions(seasonAwards, monster.level * 8 + (defeatedBoss ? 40 : 0));
          const characterWithRelic = relicReward ? addRelic(companionResult.character, relicReward) : companionResult.character;
          const riftGrade = clearedRift ? calculateRiftGrade(characterWithRelic, riftRun.floor) : undefined;
          const turns = (state.currentRun?.turns ?? 0) + combo;
          const ranking = clearedTower ? updateTowerRanking(state.towerRanking, towerRun.floor, turns, (state.currentRun?.deaths ?? 0) === 0) : state.towerRanking;
          const albumWithBoss = defeatedBoss ? collectAlbumEntry(state.seasonAlbum, monster.name) : state.seasonAlbum;
          const albumWithRelic = relicReward ? collectAlbumEntry(albumWithBoss, relicReward.name) : albumWithBoss;
          set({
            phase: nextIndex >= dungeon.length ? "reward" : "dungeon",
            character: characterWithRelic,
            inventory: reward.inventory,
            quests: reward.quests,
            dailyTasks: riftProgress.tasks,
            seasonPass: addSeasonXp(seasonPass, clearedRift ? 55 : clearedTower ? 35 : 0),
            dailyRift: clearedRift ? { ...normalizeDailyRift(state.dailyRift, characterWithRelic), completed: true } : state.dailyRift,
            weeklyBoss: clearedWeekly ? { ...normalizeWeeklyBoss(state.weeklyBoss, characterWithRelic), completed: true } : state.weeklyBoss,
            rewardChoice: defeatedBoss ? createRewardChoice(state.currentRun?.type ?? "beginner") : state.rewardChoice,
            beginnerClears: state.currentRun?.type === "beginner" && bossRoom ? state.beginnerClears + 1 : state.beginnerClears,
            towerRanking: ranking,
            seasonAlbum: albumWithRelic,
            achievementDetails: updateAchievementDetails(state.achievementDetails, characterWithRelic, ranking),
            npcMemory: rememberNpc(state.npcMemory, "guild", `${monster.name} 토벌 기록을 접수했다.`),
            adaptive: updateAdaptiveOnWin(state.adaptive),
            dungeon,
            roomIndex: Math.min(nextIndex, dungeon.length - 1),
            combat: undefined,
            currentRun: state.currentRun ? { ...state.currentRun, comboStreak: 0 } : state.currentRun,
            logs: [
              ...state.logs,
              ...logs.map((text) => log(text)),
              ...reward.logs,
              ...dailyKillProgress.logs.map((text) => log(text, "rare")),
              ...riftProgress.logs.filter((text) => !dailyKillProgress.logs.includes(text)).map((text) => log(text, "rare")),
              log(`연속 처치 ${combo} · 시즌 XP +${reward.seasonXp + Math.floor(combo / 3)}`, "good"),
              ...(clearedTower ? [log(`무한탑 ${towerRun.floor}층 돌파. 다음 층이 열렸다.`, "rare")] : []),
              ...milestone.logs,
              ...(clearedRift ? [log(`일일 균열 T${riftRun.floor} 안정화 · 등급 ${riftGrade}. 내일 새로운 균열이 열린다.`, "rare")] : []),
              ...(clearedWeekly ? [log(`주간 보스 '${state.weeklyBoss.name}' 토벌. 선택형 보상이 열렸다.`, "rare")] : []),
              ...(relicReward ? [log(`유물 획득: ${relicReward.rarity} '${relicReward.name}'`, "rare")] : []),
              ...companionResult.logs,
              ...(clearedTower ? [log(`시즌 랭킹 갱신: 최고층 ${ranking.highestFloor}, 최단 턴 ${ranking.bestTurns || turns}, 노데스 ${ranking.noDeathFloor}층`, "rare")] : []),
            ],
          });
          return;
        }

        if (playerTurnSpent) {
          const monsterRoll = random();
          const defend = action === "defend";
          if (monsterRoll < monster.pattern.special) {
            const damage = Math.max(1, Math.round(monster.attack * 1.45 - defensePower(character) * (defend ? 0.75 : 0.35)));
            nextCharacter.hp -= damage;
            logs.push(`${monster.name}의 ${monster.specialName}. HP ${damage} 피해.`);
          } else if (monsterRoll < monster.pattern.special + monster.pattern.defend) {
            monster.defense += 3;
            logs.push(`${monster.name}이(가) 방어 자세를 취했다.`);
          } else {
            const damage = Math.max(1, Math.round(monster.attack - defensePower(character) * (defend ? 0.7 : 0.25)));
            nextCharacter.hp -= damage;
            logs.push(`${monster.name}의 공격. HP ${damage} 피해.`);
          }
        }

        if (nextCharacter.hp <= 0) {
          nextCharacter.hp = 1;
          nextCharacter.gold = Math.max(0, nextCharacter.gold - Math.round(nextCharacter.gold * 0.12));
          set({ phase: "defeat", character: nextCharacter, adaptive: updateAdaptiveOnLoss(state.adaptive), combat: undefined, currentRun: state.currentRun ? { ...state.currentRun, deaths: (state.currentRun.deaths ?? 0) + 1 } : state.currentRun, inventory, logs: [...state.logs, ...logs.map((text) => log(text)), log("목걸이가 강제로 현실 귀환을 발동했다. 골드 일부를 잃었다.", "bad")] });
          return;
        }

        set({ character: nextCharacter, currentRun: state.currentRun ? { ...state.currentRun, turns: (state.currentRun.turns ?? 0) + 1 } : state.currentRun, combat: { monster, monsters: [monster, ...combatMonsters.slice(1)], defending: action === "defend", log: logs.slice(-8) }, inventory });
      },

      equip: (equipment) => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const current = character.equipment[equipment.slot];
        const nextInventory = state.inventory.filter((item) => !(item.type === "equipment" && item.equipment.id === equipment.id));
        if (current) {
          nextInventory.unshift({ id: current.id, type: "equipment", equipment: current, qty: 1 });
        }
        const next = normalizeCharacter({ ...character, equipment: { ...character.equipment, [equipment.slot]: equipment } });
        set({
          character: next,
          inventory: nextInventory,
          logs: [...state.logs, log(current ? `${equipment.name} 장착. ${current.name}은(는) 인벤토리로 돌아갔다.` : `${equipment.name} 장착.`, "good")],
        });
      },

      buyPotion: (size) => {
        const character = get().character;
        const potion = potionCatalog[size];
        if (!character) return;
        if (character.gold < potion.price) {
          set({ logs: [...get().logs, log(`${potion.name} 구매 비용 ${potion.price}골드가 부족하다.`, "bad")] });
          return;
        }
        set({
          character: { ...character, gold: character.gold - potion.price },
          inventory: addConsumable(get().inventory, potion.id, 1),
          npcAffinity: addNpcAffinity(get().npcAffinity, "merchant", 1),
          logs: [...get().logs, log(`${potion.name} 구매. -${potion.price}골드`)],
        });
      },

      receiveBlessing: () => {
        const character = get().character;
        if (!character) return;
        const cost = 120;
        if (character.gold < cost) {
          set({ logs: [...get().logs, log("교회 헌금이 부족하다. 축복 비용은 120골드다.", "bad")] });
          return;
        }
        const blessing = rollBlessing(character);
        const blessings = [...(character.blessings ?? []).filter((item) => item.runsLeft > 0), blessing].slice(-3);
        set({
          character: { ...normalizeCharacter(character), gold: character.gold - cost, blessings },
          npcAffinity: addNpcAffinity(get().npcAffinity, "church", 2),
          logs: [...get().logs, log(`교회 축복: ${blessing.name}. ${blessing.text}`, "rare")],
        });
      },

      stayAtInn: () => {
        const character = get().character;
        if (!character) return;
        const cost = Math.max(35, 25 + character.level * 5);
        if (character.gold < cost) {
          set({ logs: [...get().logs, log(`여관 숙박비 ${cost}골드가 부족하다.`, "bad")] });
          return;
        }
        set({
          character: { ...normalizeCharacter(character), gold: character.gold - cost, hp: character.maxHp, mp: character.maxMp },
          npcAffinity: addNpcAffinity(get().npcAffinity, "inn", 2),
          logs: [...get().logs, log(`여관에서 숙박했다. HP와 MP가 완전히 회복되었다. -${cost}골드`, "good")],
        });
      },

      visitGuild: () => {
        const character = get().character;
        if (!character) return;
        const state = get();
        let nextCharacter = normalizeCharacter(character);
        let inventory = [...state.inventory];
        let quests = [...state.quests];
        const logs: GameLog[] = [];

        for (const quest of quests) {
          if (quest.completed) {
            const reward = claimQuestReward(nextCharacter, inventory, quest.id);
            nextCharacter = reward.character;
            inventory = reward.inventory;
            logs.push(log(`길드 보수 수령: ${quest.title} · ${quest.reward}`, "rare"));
          }
        }

        quests = quests.filter((quest) => !quest.completed);
        if (!quests.some((quest) => quest.id.startsWith("guild-"))) {
          const quest = createGuildQuest(nextCharacter);
          quests = [...quests, quest];
          logs.push(log(`길드 의뢰 수령: ${quest.title}`, "good"));
        }

        if (logs.length === 0) logs.push(log("길드 접수원이 진행 중인 의뢰를 확인해 주었다."));
        set({ character: nextCharacter, inventory, quests, npcAffinity: addNpcAffinity(state.npcAffinity, "guild", 2), logs: [...state.logs, ...logs] });
      },

      enhanceEquipment: (slot) => {
        const character = get().character;
        const equipment = character?.equipment[slot];
        if (!character || !equipment || equipment.enhance >= 20) return;
        const cost = 80 + equipment.enhance * 45;
        if (character.gold < cost) return;
        const random = seeded(character.fate.seed + equipment.enhance * 101 + slot.length * 17 + Date.now());
        const chance = equipment.enhance < 10 ? 1 : Math.max(0.28, 0.86 - (equipment.enhance - 9) * 0.07);
        const success = random() < chance;
        const nextEquipment = success ? improveEnhancedEquipment(equipment) : equipment;
        set({
          character: normalizeCharacter({ ...character, gold: character.gold - cost, equipment: { ...character.equipment, [slot]: nextEquipment } }),
          npcAffinity: addNpcAffinity(get().npcAffinity, "blacksmith", 2),
          logs: [...get().logs, log(success ? `강화 성공! ${nextEquipment.name} +${nextEquipment.enhance}` : "강화 실패. 장비는 파괴되지 않았다.", success ? "good" : "bad")],
        });
      },

      enhanceWeapon: () => {
        get().enhanceEquipment("무기");
      },

      sellEquipment: (equipmentId) => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const target = state.inventory.find((item) => item.type === "equipment" && item.equipment.id === equipmentId);
        if (!target || target.type !== "equipment") return;
        const sellPrice = equipmentSellPrice(target.equipment);
        set({
          character: { ...character, gold: character.gold + sellPrice },
          inventory: state.inventory.filter((item) => !(item.type === "equipment" && item.equipment.id === equipmentId)),
          logs: [...state.logs, log(`${target.equipment.name} 판매. ${sellPrice}골드를 받았다.`, "good")],
        });
      },

      storeItem: (item) => {
        const state = get();
        const capacity = state.storageCapacity ?? 5;
        const storage = state.storage ?? [];
        if (storage.length >= capacity) {
          set({ logs: [...state.logs, log(`창고가 가득 찼다. ${storage.length}/${capacity}`, "bad")] });
          return;
        }
        const moved = cloneInventoryItem(item);
        set({
          inventory: removeInventoryItem(state.inventory, item),
          storage: [moved, ...storage],
          logs: [...state.logs, log(`${getItemName(item)} 창고 보관. ${storage.length + 1}/${capacity}`)],
        });
      },

      retrieveItem: (item) => {
        const state = get();
        const storage = state.storage ?? [];
        set({
          inventory: mergeInventoryItem(state.inventory, item),
          storage: removeInventoryItem(storage, item),
          logs: [...state.logs, log(`${getItemName(item)} 창고에서 회수.`)],
        });
      },

      buyStorageSlot: () => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const capacity = state.storageCapacity ?? 5;
        const cost = storageSlotCost(capacity);
        if (character.gold < cost) {
          set({ logs: [...state.logs, log(`창고 확장 비용 ${cost}골드가 부족하다.`, "bad")] });
          return;
        }
        set({
          character: { ...character, gold: character.gold - cost },
          storageCapacity: capacity + 1,
          logs: [...state.logs, log(`창고 슬롯 확장. ${capacity}칸 → ${capacity + 1}칸. -${cost}골드`, "rare")],
        });
      },

      claimDailyTask: (taskId) => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const tasks = normalizeDailyTasks(state.dailyTasks, character);
        const task = tasks.find((item) => item.id === taskId);
        if (!task || !task.completed || task.claimed) return;
        set({
          character: { ...character, gold: character.gold + task.rewardGold },
          seasonPass: addSeasonXp(state.seasonPass, task.rewardSeasonXp),
          dailyTasks: tasks.map((item) => item.id === taskId ? { ...item, claimed: true } : item),
          logs: [...state.logs, log(`일일 임무 보상 수령: ${task.title} · ${task.rewardGold}G · 시즌 XP +${task.rewardSeasonXp}`, "rare")],
        });
      },

      claimSeasonReward: (level) => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const pass = normalizeSeasonPass(state.seasonPass);
        if (level > seasonPassLevel(pass) || pass.claimedLevels.includes(level)) return;
        const gold = 120 + level * 35;
        set({
          character: { ...character, gold: character.gold + gold },
          seasonPass: { ...pass, claimedLevels: [...pass.claimedLevels, level] },
          logs: [...state.logs, log(`시즌 패스 Lv.${level} 보상 수령: ${gold}G`, "rare")],
        });
      },

      claimIdleReward: () => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const idle = calculateIdleReward(state.idleReward, character);
        if (idle.pendingGold <= 0 && idle.pendingMaterials <= 0 && idle.pendingTowerKeys <= 0) {
          set({ idleReward: { ...idle, lastSeenAt: new Date().toISOString() }, logs: [...state.logs, log("목걸이가 아직 충분한 마력을 모으지 못했다.")] });
          return;
        }
        set({
          character: { ...character, gold: character.gold + idle.pendingGold },
          inventory: addMaterial(state.inventory, "ore", "균열 철광석", idle.pendingMaterials),
          idleReward: createIdleRewardState(),
          logs: [...state.logs, log(`방치 보상 수령: ${idle.cappedHours.toFixed(1)}시간 · ${idle.pendingGold}G · 철광석 ${idle.pendingMaterials}개 · 탑 열쇠 ${idle.pendingTowerKeys}개`, "rare")],
        });
      },

      claimRewardChoice: (choiceId) => {
        const state = get();
        const character = state.character;
        if (!character || !state.rewardChoice) return;
        let nextCharacter = normalizeCharacter(character);
        let inventory = [...state.inventory];
        const logs: GameLog[] = [];
        if (choiceId === "equipment-box") {
          const equipment = rollEquipment(character.level + 2, character.stats.LUK, character.fate.seed + Date.now(), "희귀");
          const auto = autoEquip(nextCharacter, inventory, equipment);
          nextCharacter = auto.character;
          inventory = auto.inventory;
          logs.push(log(`선택 보상: 희귀 장비 상자에서 '${equipment.name}' 획득.`, "rare"));
        } else if (choiceId === "skill-fragment") {
          nextCharacter = { ...nextCharacter, skillPoints: nextCharacter.skillPoints + 2 };
          logs.push(log("선택 보상: 스킬 조각 2개 획득.", "rare"));
        } else {
          inventory = addMaterial(inventory, "reforge-stone", "재련석", 3, "고급");
          logs.push(log("선택 보상: 재련석 3개 획득.", "rare"));
        }
        set({ character: nextCharacter, inventory, rewardChoice: undefined, logs: [...state.logs, ...logs] });
      },

      reforgeEquipment: (slot) => {
        const state = get();
        const character = state.character;
        const equipment = character?.equipment[slot];
        if (!character || !equipment) return;
        const stone = state.inventory.find((item) => item.type === "material" && item.id === "reforge-stone");
        if (!stone || stone.type !== "material" || stone.qty < 1) {
          set({ logs: [...state.logs, log("재련석이 부족하다. 보스 선택 보상이나 주간 보스에서 획득할 수 있다.", "bad")] });
          return;
        }
        const nextEquipment = reforgeOptions(equipment, character);
        set({
          character: normalizeCharacter({ ...character, equipment: { ...character.equipment, [slot]: nextEquipment } }),
          inventory: consumeMaterial(state.inventory, "reforge-stone", 1),
          npcAffinity: addNpcAffinity(state.npcAffinity, "blacksmith", 3),
          logs: [...state.logs, log(`옵션 재련 완료: ${nextEquipment.name} · ${nextEquipment.options.join(" / ")}`, "rare")],
        });
      },

      claimSeasonAlbumReward: () => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const album = normalizeSeasonAlbum(state.seasonAlbum);
        if (album.claimed || !album.entries.every((entry) => entry.collected)) {
          set({ logs: [...state.logs, log("시즌 앨범을 모두 채워야 완성 보상을 받을 수 있다.", "bad")] });
          return;
        }
        const gold = state.liveOps.albumBonusGold;
        const title = `${album.seasonKey} 앨범 완성자`;
        set({
          character: { ...character, gold: character.gold + gold, titles: [...new Set([...(character.titles ?? []), title])] },
          seasonAlbum: { ...album, claimed: true },
          logs: [...state.logs, log(`시즌 앨범 완성 보상: ${gold}G, 칭호 '${title}' 획득.`, "rare")],
        });
      },

      summonCompanion: () => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const cost = 350 + (character.companions?.length ?? 0) * 250;
        if (character.gold < cost) {
          set({ logs: [...state.logs, log(`동료 소환에는 ${cost}G가 필요하다.`, "bad")] });
          return;
        }
        const companion = rollCompanion(character);
        set({
          character: { ...character, gold: character.gold - cost, companions: [companion, ...(character.companions ?? [])].slice(0, 5) },
          logs: [...state.logs, log(`목걸이 기억 소환: ${companion.kind} '${companion.name}' 합류.`, "rare")],
        });
      },

      equipRune: () => {
        const state = get();
        const character = state.character;
        if (!character) return;
        const cost = 2;
        const ore = state.inventory.find((item) => item.type === "material" && item.id === "ore");
        if (!ore || ore.type !== "material" || ore.qty < cost) {
          set({ logs: [...state.logs, log("룬 각인에는 균열 철광석 2개가 필요하다.", "bad")] });
          return;
        }
        const rune = rollRune(character);
        set({
          character: { ...character, runes: [rune, ...(character.runes ?? [])].slice(0, 5) },
          inventory: consumeMaterial(state.inventory, "ore", cost),
          logs: [...state.logs, log(`문장 각인: '${rune.name}' 장착. ${rune.text}`, "rare")],
        });
      },

      startExpedition: () => {
        const state = get();
        const item = state.inventory.find((entry) => entry.type === "equipment") ?? state.inventory.find((entry) => entry.type === "material");
        if (!item || state.expedition.startedAt) {
          set({ logs: [...state.logs, log(item ? "이미 원정대가 파견 중이다." : "원정에 맡길 장비나 재료가 없다.", "bad")] });
          return;
        }
        const now = new Date();
        const endsAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        set({
          inventory: removeInventoryItem(state.inventory, item),
          expedition: { startedAt: now.toISOString(), endsAt: endsAt.toISOString(), assignedItemName: getItemName(item), claimed: false },
          logs: [...state.logs, log(`${getItemName(item)}을(를) 원정대에 맡겼다. 2시간 후 보상을 받을 수 있다.`, "good")],
        });
      },

      claimExpedition: () => {
        const state = get();
        const character = state.character;
        if (!character || !state.expedition.startedAt || !state.expedition.endsAt) return;
        if (Date.now() < new Date(state.expedition.endsAt).getTime()) {
          set({ logs: [...state.logs, log("원정대가 아직 돌아오지 않았다.", "bad")] });
          return;
        }
        const gold = 220 + character.level * 12;
        set({
          character: { ...character, gold: character.gold + gold },
          inventory: addMaterial(state.inventory, "reforge-stone", "재련석", 2, "고급"),
          expedition: createExpeditionState(),
          logs: [...state.logs, log(`원정 완료: ${gold}G, 재련석 2개 획득.`, "rare")],
        });
      },

      syncCloudSave: async () => {
        const state = get();
        const savedAt = new Date().toISOString();
        const response = await fetch("/api/game/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: portableSaveState(normalizeGameState({ ...state, lastSavedAt: savedAt })) }),
        });
        const result = await response.json().catch(() => ({}));
        set({ lastSavedAt: savedAt, logs: [...state.logs, log(response.ok ? `클라우드 저장 완료. ${result.mode === "database" ? "DB" : "데모"} 모드.` : "클라우드 저장 실패.", response.ok ? "good" : "bad")] });
      },

      loadCloudSave: async () => {
        const state = get();
        const response = await fetch("/api/game/save");
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.payload) {
          set({ logs: [...state.logs, log("불러올 클라우드 저장이 없다.", "bad")] });
          return;
        }
        get().importSave(JSON.stringify({ state: result.payload }));
      },

      reincarnate: () => {
        const character = get().character;
        if (!character || character.level < 100) return;
        const job = rollJob(character.fate, character.reincarnation + 1);
        const stats = createStats(character.profile, character.fate, job, character.reincarnation + 1);
        const trait = rollTrait(character.fate.seed, character.reincarnation + 101);
        const next: Character = {
          ...character,
          job,
          level: 1,
          reincarnation: character.reincarnation + 1,
          towerFloor: character.towerFloor ?? 1,
          exp: 0,
          nextExp: expToNext(1),
          stats,
          traits: [...character.traits, trait],
          blessings: [],
          relics: character.relics ?? [],
          hp: maxHp(stats, 1),
          maxHp: maxHp(stats, 1),
          mp: maxMp(stats, 1),
          maxMp: maxMp(stats, 1),
        };
        set({ phase: "town", character: next, dailyRift: normalizeDailyRift(get().dailyRift, next), logs: [...get().logs, log(`환생 완료. 새로운 직업 '${job.name}'과 특성 '${trait.name}'이 운명에 새겨졌다.`, "rare")] });
      },

      generateAiStory: async () => {
        const state = get();
        const character = state.character;
        const room = state.dungeon[state.roomIndex];
        if (!character || !room) return;
        set({ storyLoading: true });
        try {
          const response = await fetch("/api/game/story", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: { name: character.profile.name, job: character.job.name, level: character.level, fate: character.fate }, room }),
          });
          const data = (await response.json()) as { story?: string };
          set({ logs: [...get().logs, log(data.story ?? "목걸이가 조용히 빛났다.")], storyLoading: false });
        } catch {
          set({ logs: [...get().logs, log("AI 균열 연결이 불안정해 기본 서사가 출력되었다.")], storyLoading: false });
        }
      },

      manualSave: () => {
        const savedAt = new Date().toISOString();
        set({
          lastSavedAt: savedAt,
          logs: [...get().logs, log(`저장 완료. ${formatSaveTime(savedAt)}`, "good")],
        });
      },

      exportSave: () => {
        const savedAt = new Date().toISOString();
        const state = normalizeGameState({ ...get(), lastSavedAt: savedAt });
        set({ lastSavedAt: savedAt, logs: [...get().logs, log(`JSON 세이브 파일 생성. ${formatSaveTime(savedAt)}`, "good")] });
        return JSON.stringify({
          game: "Another World Dungeon Explorer",
          version: 1,
          exportedAt: savedAt,
          state: portableSaveState(state),
        }, null, 2);
      },

      importSave: (json) => {
        try {
          const parsed = JSON.parse(json) as unknown;
          const importedState = (isPortableSaveEnvelope(parsed) ? parsed.state : parsed) as Partial<GameState>;
          const next = normalizeGameState({
            ...get(),
            ...importedState,
            storyLoading: false,
            combat: undefined,
            logs: [
              ...((importedState.logs as GameLog[] | undefined) ?? []),
              log("JSON 세이브 파일을 불러왔다.", "rare"),
            ],
            lastSavedAt: new Date().toISOString(),
          });
          set(next);
          return true;
        } catch {
          set({ logs: [...get().logs, log("JSON 세이브 파일을 읽지 못했다.", "bad")] });
          return false;
        }
      },

      reset: () => {
        set({ phase: "create", character: undefined, dungeon: [], currentRun: undefined, roomIndex: 0, combat: undefined, inventory: starterInventory, storage: [], storageCapacity: 5, quests: starterQuests, dailyRift: createDailyRiftState(), encounterCodex: createEncounterCodex([]), seasonPass: createSeasonPass(), dailyTasks: createDailyTasks(), weeklyBoss: createWeeklyBossState(), idleReward: createIdleRewardState(), rewardChoice: undefined, towerRanking: createTowerRanking(), npcAffinity: createNpcAffinity(), beginnerClears: 0, seasonAlbum: createSeasonAlbum(), achievementDetails: createAchievementDetails(), expedition: createExpeditionState(), liveOps: createLiveOpsConfig(), npcMemory: createNpcMemory(), adaptive: createAdaptiveState(), logs: [log("새로운 목걸이가 주인을 기다린다.")], lastSavedAt: undefined });
      },
    }),
    {
      name: "another-world-dungeon-save",
      partialize: (state) => ({ ...state, storyLoading: false, combat: undefined }),
      merge: (persisted, current) => normalizeGameState({ ...current, ...(persisted as Partial<GameState>) }),
    },
  ),
);

function formatSaveTime(savedAt: string) {
  return new Date(savedAt).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDailyRiftState(character?: Character): DailyRiftState {
  const date = todayKey();
  const seedBase = date.replace(/-/g, "");
  const tier = character ? Math.max(1, Math.min(12, Math.floor(character.level / 10) + 1 + character.reincarnation)) : 1;
  return {
    date,
    completed: false,
    tier,
    seed: Number(seedBase) + (character?.fate.seed ?? 0),
  };
}

function normalizeDailyRift(rift: DailyRiftState | undefined, character: Character) {
  if (!rift || rift.date !== todayKey()) return createDailyRiftState(character);
  return {
    ...rift,
    tier: Math.max(rift.tier, Math.max(1, Math.min(12, Math.floor(character.level / 10) + 1 + character.reincarnation))),
  };
}

function createEncounterCodex(discoveredIds: string[]): EncounterCodexEntry[] {
  const discovered = new Set(discoveredIds);
  return specialEncounterSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    text: skill.text,
    discovered: discovered.has(skill.id),
  }));
}

function normalizeEncounterCodex(codex: EncounterCodexEntry[] | undefined) {
  const discoveredIds = (codex ?? []).filter((entry) => entry.discovered).map((entry) => entry.id);
  return createEncounterCodex(discoveredIds);
}

function markEncounterCodexDiscovered(codex: EncounterCodexEntry[] | undefined, skillId: string) {
  return normalizeEncounterCodex(codex).map((entry) => entry.id === skillId ? { ...entry, discovered: true } : entry);
}

function seasonKey() {
  return currentTowerSeason().key;
}

function createSeasonPass(): SeasonPassState {
  const season = currentTowerSeason();
  return {
    seasonKey: season.key,
    name: season.name,
    startsAt: season.startsAt,
    endsAt: season.endsAt,
    xp: 0,
    claimedLevels: [],
  };
}

function normalizeSeasonPass(pass: SeasonPassState | undefined) {
  if (!pass || pass.seasonKey !== seasonKey()) return createSeasonPass();
  const season = currentTowerSeason();
  return { ...pass, name: season.name, startsAt: pass.startsAt ?? season.startsAt, endsAt: pass.endsAt ?? season.endsAt, claimedLevels: pass.claimedLevels ?? [] };
}

function seasonPassLevel(pass: SeasonPassState) {
  return Math.max(1, Math.min(50, Math.floor(pass.xp / 100) + 1));
}

function addSeasonXp(pass: SeasonPassState | undefined, xp: number) {
  const normalized = normalizeSeasonPass(pass);
  return { ...normalized, xp: normalized.xp + Math.max(0, xp) };
}

function createDailyTasks(character?: Character): DailyTask[] {
  const date = todayKey();
  const level = character?.level ?? 1;
  return [
    { id: `daily-kill-${date}`, date, title: "오늘의 토벌", goal: "몬스터 5마리 처치", progress: 0, target: 5, rewardGold: 160 + level * 12, rewardSeasonXp: 40, completed: false, claimed: false },
    { id: `daily-explore-${date}`, date, title: "균열 탐색", goal: "방 7개 탐험", progress: 0, target: 7, rewardGold: 120 + level * 10, rewardSeasonXp: 35, completed: false, claimed: false },
    { id: `daily-rift-${date}`, date, title: "하루 한 번 균열", goal: "일일 균열 1회 안정화", progress: 0, target: 1, rewardGold: 300 + level * 18, rewardSeasonXp: 75, completed: false, claimed: false },
  ];
}

function normalizeDailyTasks(tasks: DailyTask[] | undefined, character?: Character) {
  if (!tasks?.length || tasks[0]?.date !== todayKey()) return createDailyTasks(character);
  return tasks;
}

function progressDailyTasks(tasks: DailyTask[] | undefined, type: "kill" | "explore" | "rift", amount: number) {
  const logs: string[] = [];
  const marker = type === "kill" ? "daily-kill" : type === "explore" ? "daily-explore" : "daily-rift";
  const next = normalizeDailyTasks(tasks).map((task) => {
    if (!task.id.startsWith(marker) || task.claimed || task.completed) return task;
    const progress = Math.min(task.target, task.progress + amount);
    const completed = progress >= task.target;
    if (completed) logs.push(`일일 임무 완료: ${task.title}`);
    return { ...task, progress, completed };
  });
  return { tasks: next, logs };
}

function rollRelicReward(character: Character, runType: DungeonRunInfo["type"]): Relic | undefined {
  const random = seeded(character.fate.seed + character.level * 761 + Date.now());
  const chance = runType === "rift" ? 0.72 : runType === "tower" ? 0.38 : 0.18;
  if (random() > chance) return undefined;
  const table: Relic[] = [
    { id: "relic-star-core", name: "별핵 파편", rarity: "희귀", text: "기연과 공명하는 작은 별의 핵.", effects: { critRate: 0.03, expRate: 0.05 } },
    { id: "relic-dragon-scale", name: "용혈 비늘", rarity: "영웅", text: "무한탑 깊은 곳에서 떨어진 뜨거운 비늘.", effects: { attackRate: 0.07, defenseRate: 0.05 } },
    { id: "relic-moon-ledger", name: "달빛 장부", rarity: "영웅", text: "보상을 놓치지 않는 상인의 유물.", effects: { goldRate: 0.12, dropRate: 0.07 } },
    { id: "relic-time-splinter", name: "시간의 가시", rarity: "전설", text: "한 턴 앞선 감각을 남기는 시간 파편.", effects: { critRate: 0.07, magicRate: 0.08 } },
    { id: "relic-worldseed", name: "세계수 씨앗", rarity: "신화", text: "환생 후에도 빛을 잃지 않는 세계수의 씨앗.", effects: { expRate: 0.12, defenseRate: 0.1, dropRate: 0.08 } },
  ];
  return table[Math.floor(random() * table.length)];
}

function addRelic(character: Character, relic: Relic) {
  const relics = character.relics ?? [];
  if (relics.some((item) => item.id === relic.id)) {
    return { ...character, gold: character.gold + 250 + character.level * 12 };
  }
  return { ...character, relics: [relic, ...relics].slice(0, 12) };
}

function grantTowerMilestone(character: Character, floor: number) {
  const gold = 500 + floor * 45;
  return {
    character: { ...character, gold: character.gold + gold },
    logs: [log(`무한탑 ${floor}층 이정표 보상: ${gold}G`, "rare")],
  };
}

function calculateRiftGrade(character: Character, tier: number) {
  const hpRate = character.hp / Math.max(1, character.maxHp);
  if (hpRate > 0.75 && tier >= 5) return "SS";
  if (hpRate > 0.55) return "S";
  if (hpRate > 0.28) return "A";
  return "B";
}

function addConsumable(items: InventoryItem[], id: "potion" | PotionId | "mana-potion", qty: number) {
  const next = items.map((item) => ({ ...item })) as InventoryItem[];
  const found = next.find((item) => item.type === "consumable" && item.id === id);
  if (found?.type === "consumable") found.qty += qty;
  else if (id === "mana-potion") next.push({ id, type: "consumable", name: "하급 마나 물약", qty, heal: 0, mp: 45 });
  else {
    const potion = Object.values(potionCatalog).find((item) => item.id === id) ?? potionCatalog.small;
    next.push({ id, type: "consumable", name: potion.name, qty, heal: potion.heal });
  }
  return next;
}

function findBestHealingPotion(items: InventoryItem[]) {
  return items
    .filter((item) => item.type === "consumable" && item.heal > 0 && item.qty > 0)
    .sort((a, b) => {
      if (a.type !== "consumable" || b.type !== "consumable") return 0;
      return a.heal - b.heal;
    })[0];
}

function cloneInventoryItem(item: InventoryItem): InventoryItem {
  if (item.type === "equipment") return { ...item, equipment: { ...item.equipment, stats: { ...item.equipment.stats }, options: [...item.equipment.options] } };
  return { ...item };
}

function getItemName(item: InventoryItem) {
  return item.type === "equipment" ? item.equipment.name : item.name;
}

function getItemKey(item: InventoryItem) {
  return item.type === "equipment" ? `equipment:${item.equipment.id}` : `${item.type}:${item.id}`;
}

function removeInventoryItem(items: InventoryItem[], target: InventoryItem) {
  const key = getItemKey(target);
  return items.filter((item) => getItemKey(item) !== key);
}

function mergeInventoryItem(items: InventoryItem[], item: InventoryItem) {
  if (item.type === "equipment") return [cloneInventoryItem(item), ...items];
  const next = items.map((entry) => ({ ...entry })) as InventoryItem[];
  const found = next.find((entry) => entry.type === item.type && entry.id === item.id);
  if (found && found.type !== "equipment") {
    found.qty += item.qty;
  } else {
    next.unshift(cloneInventoryItem(item));
  }
  return next;
}

function storageSlotCost(currentCapacity: number) {
  return 750 + Math.max(0, currentCapacity - 5) * 450 + Math.max(0, currentCapacity - 10) * 250;
}

function addMaterial(items: InventoryItem[], id: string, name: string, qty: number, rarity: Rarity = "일반") {
  const next = items.map((item) => ({ ...item })) as InventoryItem[];
  const found = next.find((item) => item.type === "material" && item.id === id);
  if (found?.type === "material") found.qty += qty;
  else next.push({ id, type: "material", name, qty, rarity });
  return next;
}

function consumeMaterial(items: InventoryItem[], id: string, qty: number) {
  return items
    .map((item) => item.type === "material" && item.id === id ? { ...item, qty: item.qty - qty } : item)
    .filter((item) => item.type !== "material" || item.qty > 0);
}

function createTowerRanking(): TowerRanking {
  return { highestFloor: 0, bestTurns: 0, noDeathFloor: 0 };
}

function updateTowerRanking(ranking: TowerRanking | undefined, floor: number, turns: number, noDeath: boolean) {
  const current = ranking ?? createTowerRanking();
  return {
    highestFloor: Math.max(current.highestFloor, floor),
    bestTurns: current.bestTurns === 0 ? turns : Math.min(current.bestTurns, turns),
    noDeathFloor: noDeath ? Math.max(current.noDeathFloor, floor) : current.noDeathFloor,
  };
}

function createNpcAffinity(): NpcAffinity {
  return { church: 0, inn: 0, guild: 0, blacksmith: 0, merchant: 0 };
}

function addNpcAffinity(affinity: NpcAffinity | undefined, npc: keyof NpcAffinity, amount: number) {
  const current = { ...createNpcAffinity(), ...(affinity ?? {}) };
  return { ...current, [npc]: Math.min(100, current[npc] + amount) };
}

function weekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 86_400_000)) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function createWeeklyBossState(character?: Character): WeeklyBossState {
  const bosses = ["균열 대공", "검은 성녀의 환영", "탑 아래 잠든 거인", "시간을 먹는 사제"];
  const key = weekKey();
  const seed = (character?.fate.seed ?? 0) + Number(key.replace(/\D/g, ""));
  return {
    weekKey: key,
    completed: false,
    name: bosses[seed % bosses.length],
    tier: Math.max(1, Math.min(12, Math.floor((character?.level ?? 1) / 12) + 1)),
  };
}

function normalizeWeeklyBoss(weeklyBoss: WeeklyBossState | undefined, character: Character) {
  if (!weeklyBoss || weeklyBoss.weekKey !== weekKey()) return createWeeklyBossState(character);
  return weeklyBoss;
}

function createWeeklyBossMonster(character: Character, weeklyBoss: WeeklyBossState) {
  const level = character.level + weeklyBoss.tier * 5;
  return {
    id: `weekly-${weeklyBoss.weekKey}`,
    name: weeklyBoss.name,
    level,
    hp: 420 + level * 42,
    maxHp: 420 + level * 42,
    attack: 36 + level * 7,
    defense: 18 + level * 3,
    exp: 260 + level * 34,
    gold: 420 + level * 42,
    pattern: { attack: 0.42, defend: 0.16, special: 0.42 },
    specialName: "균열 왕권",
  };
}

function createIdleRewardState(): IdleRewardState {
  return { lastSeenAt: new Date().toISOString(), pendingGold: 0, pendingMaterials: 0, pendingTowerKeys: 0, cappedHours: 0 };
}

function calculateIdleReward(idle: IdleRewardState | undefined, character: Character) {
  const lastSeenAt = idle?.lastSeenAt ?? new Date().toISOString();
  const elapsedHours = Math.max(0, (Date.now() - new Date(lastSeenAt).getTime()) / 3_600_000);
  const cappedHours = Math.min(8, elapsedHours);
  return {
    lastSeenAt,
    pendingGold: Math.floor(cappedHours * (35 + character.level * 4)),
    pendingMaterials: Math.floor(cappedHours / 1.5),
    pendingTowerKeys: character.level >= 10 ? Math.floor(cappedHours / 4) : 0,
    cappedHours,
  };
}

function createRewardChoice(source: DungeonRunInfo["type"]): RewardChoiceState {
  return {
    source: source === "weekly" ? "주간 보스" : source === "rift" ? "일일 균열" : source === "tower" ? "무한탑 보스" : "던전 보스",
    choices: [
      { id: "equipment-box", title: "장비 상자", text: "현재 레벨 기준 희귀 이상 장비 1개" },
      { id: "skill-fragment", title: "스킬 조각", text: "스킬 포인트 +2" },
      { id: "enhance-stone", title: "재련석", text: "장비 옵션 재련 재료 3개" },
    ],
  };
}

function createSeasonAlbum(): SeasonAlbumState {
  const season = currentTowerSeason();
  return {
    seasonKey: season.key,
    claimed: false,
    entries: [
      { id: "album-encounter-1", category: "기연", name: "운명절단", hint: "이벤트방 기연에서 발견", collected: false },
      { id: "album-encounter-2", category: "기연", name: "성락보", hint: "일일 균열에서 발견 확률 상승", collected: false },
      { id: "album-boss-1", category: "보스", name: "고블린 킹", hint: "초심자 던전 보스 처치", collected: false },
      { id: "album-boss-2", category: "보스", name: "균열의 문지기", hint: "탑 또는 균열 보스 처치", collected: false },
      { id: "album-equipment-1", category: "장비", name: "전설 장비", hint: "전설 이상 장비 획득", collected: false },
      { id: "album-relic-1", category: "유물", name: "별핵 파편", hint: "보스 또는 일일 균열에서 유물 획득", collected: false },
    ],
  };
}

function normalizeSeasonAlbum(album: SeasonAlbumState | undefined) {
  if (!album || album.seasonKey !== currentTowerSeason().key) return createSeasonAlbum();
  const template = createSeasonAlbum();
  const collected = new Set(album.entries.filter((entry) => entry.collected).map((entry) => entry.id));
  return { ...album, entries: template.entries.map((entry) => ({ ...entry, collected: collected.has(entry.id) || album.entries.some((item) => item.name === entry.name && item.collected) })) };
}

function collectAlbumEntry(album: SeasonAlbumState | undefined, name: string) {
  const normalized = normalizeSeasonAlbum(album);
  return {
    ...normalized,
    entries: normalized.entries.map((entry) => {
      const collected = entry.collected
        || name.includes(entry.name)
        || (entry.name === "전설 장비" && (name.includes("전설") || name.includes("신화")))
        || (entry.category === "유물" && name.length > 0 && ["별핵", "용혈", "달빛", "시간", "세계수"].some((key) => name.includes(key)));
      return { ...entry, collected };
    }),
  };
}

function createAchievementDetails(): AchievementDetail[] {
  return [
    { id: "ach-title-first", title: "탑의 첫 등반자", condition: "무한탑 10층 클리어", hint: "10층 단위 보스를 노려라", effect: "칭호 수집률 증가", unlocked: false },
    { id: "ach-no-death", title: "흔들리지 않는 목걸이", condition: "무한탑 노데스 클리어 기록", hint: "여관과 축복을 활용하라", effect: "노데스 랭킹 기록", unlocked: false },
    { id: "ach-collector", title: "기연 수집가", condition: "기연 3개 발견", hint: "이벤트방과 일일 균열을 반복 탐험", effect: "앨범 완성에 유리", unlocked: false },
    { id: "ach-relic", title: "유물 감정사", condition: "유물 1개 획득", hint: "보스와 주간 보스를 처치", effect: "장기 성장 축 개방", unlocked: false },
  ];
}

function updateAchievementDetails(achievements: AchievementDetail[] | undefined, character: Character, ranking: TowerRanking) {
  const current = achievements?.length ? achievements : createAchievementDetails();
  return current.map((achievement) => {
    const unlocked =
      achievement.unlocked
      || (achievement.id === "ach-title-first" && (character.titles ?? []).length > 0)
      || (achievement.id === "ach-no-death" && ranking.noDeathFloor > 0)
      || (achievement.id === "ach-collector" && (character.specialSkills ?? []).length >= 3)
      || (achievement.id === "ach-relic" && (character.relics ?? []).length > 0);
    return { ...achievement, unlocked };
  });
}

function rollCompanion(character: Character): Companion {
  const random = seeded(character.fate.seed + Date.now() + (character.companions?.length ?? 0) * 37);
  const table: Companion[] = [
    { id: "comp-memory-knight", name: "현실 기억의 기사", kind: "동료", level: 1, exp: 0, text: "전투 시작마다 잊힌 용기를 불러낸다.", effects: { assistDamageRate: 0.08 } },
    { id: "comp-star-sprite", name: "별가루 정령", kind: "정령", level: 1, exp: 0, text: "기연의 냄새를 먼저 맡는다.", effects: { encounterRate: 0.05, dropRate: 0.04 } },
    { id: "comp-moon-cat", name: "청월 고양이", kind: "펫", level: 1, exp: 0, text: "보물방에서 꼬리를 세운다.", effects: { goldRate: 0.08, dropRate: 0.03 } },
  ];
  return { ...table[Math.floor(random() * table.length)], id: `${table[Math.floor(random() * table.length)].id}-${Date.now()}` };
}

function growCompanions(character: Character, exp: number) {
  const logs: GameLog[] = [];
  const companions = (character.companions ?? []).map((companion) => {
    const nextExp = companion.exp + exp;
    if (nextExp >= companion.level * 100) {
      logs.push(log(`동료 성장: ${companion.name} Lv.${companion.level + 1}`, "good"));
      return { ...companion, level: companion.level + 1, exp: nextExp - companion.level * 100 };
    }
    return { ...companion, exp: nextExp };
  });
  return { character: { ...character, companions }, logs };
}

function rollRune(character: Character): Rune {
  const random = seeded(character.fate.seed + Date.now() + (character.runes?.length ?? 0) * 101);
  const element = character.fate.element;
  const table: Rune[] = [
    { id: "rune-blade", name: `${element} 검문장`, element, text: "공격형 운명 회로를 연다.", effects: { attackRate: 0.05 } },
    { id: "rune-orbit", name: `${element} 궤도문장`, element, text: "마법과 기연의 방향을 맞춘다.", effects: { magicRate: 0.05, mpCostRate: -0.04 } },
    { id: "rune-guard", name: `${element} 수호문장`, element, text: "방어 태세가 안정된다.", effects: { defenseRate: 0.06 } },
    { id: "rune-fate", name: `${element} 운명문장`, element, text: "치명적인 순간을 앞당긴다.", effects: { critRate: 0.035 } },
  ];
  const rune = table[Math.floor(random() * table.length)];
  return { ...rune, id: `${rune.id}-${Date.now()}` };
}

function createExpeditionState(): ExpeditionState {
  return { claimed: true };
}

function createLiveOpsConfig(): LiveOpsConfig {
  return { eventName: currentTowerSeason().name, rewardMultiplier: 1, albumBonusGold: 1200, updatedAt: new Date().toISOString() };
}

function createNpcMemory(): NpcMemory {
  return { church: [], inn: [], guild: [], blacksmith: [], merchant: [] };
}

function rememberNpc(memory: NpcMemory | undefined, npc: keyof NpcMemory, text: string) {
  const current = { ...createNpcMemory(), ...(memory ?? {}) };
  return { ...current, [npc]: [text, ...current[npc]].slice(0, 4) };
}

function createAdaptiveState(): AdaptiveState {
  return { winStreak: 0, lossStreak: 0 };
}

function updateAdaptiveOnWin(adaptive: AdaptiveState | undefined) {
  const current = adaptive ?? createAdaptiveState();
  const winStreak = current.winStreak + 1;
  return {
    winStreak,
    lossStreak: 0,
    bonusObjective: winStreak >= 3 ? "다음 보스전에서 아이템 없이 승리하면 시즌 XP 보너스" : undefined,
  };
}

function updateAdaptiveOnLoss(adaptive: AdaptiveState | undefined) {
  const current = adaptive ?? createAdaptiveState();
  const lossStreak = current.lossStreak + 1;
  return {
    winStreak: 0,
    lossStreak,
    bonusObjective: lossStreak >= 2 ? "교회 축복 또는 여관 회복 권장: 다음 던전 보급 확률 증가" : current.bonusObjective,
  };
}

function reforgeOptions(equipment: Equipment, character: Character): Equipment {
  const random = seeded(character.fate.seed + equipment.enhance * 811 + Date.now());
  const statKeys = ["STR", "DEX", "INT", "VIT", "WIS", "LUK"] as const;
  const statKey = statKeys[Math.floor(random() * statKeys.length)];
  const grade = Math.max(1, equipment.enhance + equipment.masteryLevel);
  const option = random() > 0.5 ? `치명타 +${4 + Math.floor(grade / 4)}%` : `드랍률 +${6 + Math.floor(grade / 3)}%`;
  return {
    ...equipment,
    options: [`${statKey} +${3 + Math.floor(grade / 5)}`, option],
  };
}

function grantTowerSeasonAwards(character: Character, floor: number) {
  const titles = new Set(character.titles ?? []);
  const cosmetics = new Set(character.cosmetics ?? []);
  if (floor >= 10) titles.add("탑의 첫 등반자");
  if (floor >= 50) titles.add("균열을 걷는 자");
  if (floor >= 100) cosmetics.add("청월의 망토");
  if (floor >= 250) cosmetics.add("시간 균열 오라");
  return {
    ...character,
    titles: [...titles],
    cosmetics: [...cosmetics],
    activeTitle: character.activeTitle ?? [...titles][0],
    activeCosmetic: character.activeCosmetic ?? [...cosmetics][0],
  };
}

function finishCombat(character: Character, monster: NonNullable<CombatState["monster"]>, inventory: InventoryItem[], quests: Quest[], boss: boolean, rewardMultiplier = 1) {
  const synergies = calculateBuildSynergies(character);
  const relics = character.relics ?? [];
  const companionGoldRate = (character.companions ?? []).reduce((sum, companion) => sum + (companion.effects.goldRate ?? 0), 0);
  const companionDropRate = (character.companions ?? []).reduce((sum, companion) => sum + (companion.effects.dropRate ?? 0), 0);
  const expRate = 1 + (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.expRate ?? 0), 0) + synergies.reduce((sum, synergy) => sum + (synergy.effects.expRate ?? 0), 0) + relics.reduce((sum, relic) => sum + (relic.effects.expRate ?? 0), 0);
  const goldRate = 1 + companionGoldRate + (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.goldRate ?? 0), 0) + synergies.reduce((sum, synergy) => sum + (synergy.effects.goldRate ?? 0), 0) + relics.reduce((sum, relic) => sum + (relic.effects.goldRate ?? 0), 0);
  const gainedExp = Math.round(monster.exp * expRate * rewardMultiplier);
  const gainedGold = Math.round(monster.gold * goldRate * rewardMultiplier);
  let nextCharacter = normalizeCharacter({ ...character, exp: character.exp + gainedExp, gold: character.gold + gainedGold });
  let nextInventory = [...inventory];
  const logs = [log(`${monster.name} 처치. EXP ${gainedExp}, 골드 ${gainedGold} 획득.`, "good")];
  const mastered = growEquippedGear(nextCharacter, 22 + monster.level * 6 + (boss ? 45 : 0));
  nextCharacter = mastered.character;
  logs.push(...mastered.logs);
  const dropChance = 0.32
    + character.stats.LUK * 0.006
    + character.traits.reduce((sum, trait) => sum + (trait.effects?.dropRate ?? 0), 0)
    + (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.dropRate ?? 0), 0)
    + synergies.reduce((sum, synergy) => sum + (synergy.effects.dropRate ?? 0), 0)
    + relics.reduce((sum, relic) => sum + (relic.effects.dropRate ?? 0), 0)
    + companionDropRate;
  if (Math.random() < dropChance || boss) {
    const equipment = rollEquipment(Math.max(character.level, monster.level), character.stats.LUK, character.fate.seed + monster.exp + Date.now(), boss && rewardMultiplier > 1 ? "희귀" : boss ? "희귀" : undefined);
    const auto = autoEquip(nextCharacter, nextInventory, equipment);
    nextCharacter = auto.character;
    nextInventory = auto.inventory;
    logs.push(log(`${equipment.rarity} 장비 '${equipment.name}' 드랍.`, equipment.rarity === "전설" || equipment.rarity === "신화" ? "rare" : "good"));
    if (auto.equipped) logs.push(log(`자동 장착: ${equipment.slot} 슬롯에 ${equipment.name}을(를) 착용했다.`, "good"));
  }

  const combatProgress = progressCombatQuests(quests, boss);
  const nextQuests = combatProgress.quests.map((quest) => {
    if (quest.completed) return quest;
    if (quest.id === "daily-hunt" || quest.id === "ach-first" || (boss && quest.id === "main-necklace")) {
      const progress = Math.min(quest.target, quest.progress + 1);
      const completed = progress >= quest.target;
      if (completed) logs.push(log(`퀘스트 완료: ${quest.title}. 길드에서 보수를 수령할 수 있다.`, "rare"));
      return { ...quest, progress, completed };
    }
    return quest;
  });
  logs.push(...combatProgress.logs.map((text) => log(text, "rare")));

  nextCharacter.blessings = nextCharacter.blessings
    .map((blessing) => ({ ...blessing, runsLeft: blessing.runsLeft - (boss ? 1 : 0) }))
    .filter((blessing) => blessing.runsLeft > 0);
  nextCharacter = applyLevelUps(nextCharacter);
  return { character: nextCharacter, inventory: nextInventory, quests: nextQuests, logs, seasonXp: 12 + Math.floor(monster.level / 2) + (boss ? 25 : 0) };
}

function normalizeCharacter(character: Character): Character {
  return {
    ...character,
    towerFloor: character.towerFloor ?? 1,
    blessings: character.blessings ?? [],
    specialSkills: character.specialSkills ?? [],
    relics: character.relics ?? [],
    titles: character.titles ?? [],
    cosmetics: character.cosmetics ?? [],
    companions: character.companions ?? [],
    runes: character.runes ?? [],
    equipment: Object.fromEntries(
      Object.entries(character.equipment).map(([slot, equipment]) => [
        slot,
        equipment
          ? {
              ...equipment,
              masteryLevel: equipment.masteryLevel ?? 1,
              masteryExp: equipment.masteryExp ?? 0,
              masteryNext: equipment.masteryNext ?? 100,
            }
          : equipment,
      ]),
    ),
  };
}

function normalizeGameState(state: GameState): GameState {
  const character = state.character ? normalizeCharacter(state.character) : undefined;
  return {
    ...state,
    character,
    storage: state.storage ?? [],
    storageCapacity: state.storageCapacity ?? 5,
    dailyRift: character ? normalizeDailyRift(state.dailyRift, character) : (state.dailyRift ?? createDailyRiftState()),
    encounterCodex: normalizeEncounterCodex(state.encounterCodex),
    seasonPass: normalizeSeasonPass(state.seasonPass),
    dailyTasks: normalizeDailyTasks(state.dailyTasks, character),
    weeklyBoss: character ? normalizeWeeklyBoss(state.weeklyBoss, character) : (state.weeklyBoss ?? createWeeklyBossState()),
    idleReward: character ? calculateIdleReward(state.idleReward, character) : (state.idleReward ?? createIdleRewardState()),
    towerRanking: state.towerRanking ?? createTowerRanking(),
    npcAffinity: { ...createNpcAffinity(), ...(state.npcAffinity ?? {}) },
    beginnerClears: state.beginnerClears ?? 0,
    seasonAlbum: normalizeSeasonAlbum(state.seasonAlbum),
    achievementDetails: character ? updateAchievementDetails(state.achievementDetails, character, state.towerRanking ?? createTowerRanking()) : (state.achievementDetails ?? createAchievementDetails()),
    expedition: state.expedition ?? createExpeditionState(),
    liveOps: state.liveOps ?? createLiveOpsConfig(),
    npcMemory: { ...createNpcMemory(), ...(state.npcMemory ?? {}) },
    adaptive: state.adaptive ?? createAdaptiveState(),
  };
}

function portableSaveState(state: GameState) {
  return {
    phase: state.phase,
    character: state.character,
    dungeon: state.dungeon,
    currentRun: state.currentRun,
    roomIndex: state.roomIndex,
    inventory: state.inventory,
    storage: state.storage,
    storageCapacity: state.storageCapacity,
    quests: state.quests,
    dailyRift: state.dailyRift,
    encounterCodex: state.encounterCodex,
    seasonPass: state.seasonPass,
    dailyTasks: state.dailyTasks,
    weeklyBoss: state.weeklyBoss,
    idleReward: state.idleReward,
    rewardChoice: state.rewardChoice,
    towerRanking: state.towerRanking,
    npcAffinity: state.npcAffinity,
    beginnerClears: state.beginnerClears,
    seasonAlbum: state.seasonAlbum,
    achievementDetails: state.achievementDetails,
    expedition: state.expedition,
    liveOps: state.liveOps,
    npcMemory: state.npcMemory,
    adaptive: state.adaptive,
    logs: state.logs.slice(-80),
    lastSavedAt: state.lastSavedAt,
  };
}

function isPortableSaveEnvelope(value: unknown): value is { state: Partial<GameState> } {
  return typeof value === "object" && value !== null && "state" in value && typeof (value as { state?: unknown }).state === "object";
}

function getUsableSkills(character: Character): Skill[] {
  const normalized = normalizeCharacter(character);
  return [
    ...normalized.job.skills.filter((skill) => skill.unlockLevel <= normalized.level),
    ...normalized.specialSkills,
  ];
}

function rollSpecialEncounter(character: Character, roomKind: DungeonRoom["kind"], random: () => number) {
  const baseChance = roomKind === "이벤트방" ? 0.28 : roomKind === "일반방" ? 0.12 : roomKind === "보물방" ? 0.09 : 0.035;
  const chance = baseChance + Math.min(character.stats.LUK * 0.002, 0.08);
  if (random() > chance) return { text: "", skill: undefined as Skill | undefined };

  const known = new Set((character.specialSkills ?? []).map((skill) => skill.id));
  const candidates = specialEncounterSkills.filter((skill) => !known.has(skill.id));
  const text = encounterTexts[Math.floor(random() * encounterTexts.length)];
  if (candidates.length === 0) return { text, skill: undefined as Skill | undefined };
  return { text, skill: candidates[Math.floor(random() * candidates.length)] };
}

function resolveExplorationEvent(character: Character, inventory: InventoryItem[], roomKind: DungeonRoom["kind"], random: () => number) {
  const logs: string[] = [];
  let nextCharacter = normalizeCharacter(character);
  let nextInventory = [...inventory];
  const chance = roomKind === "이벤트방" ? 0.75 : roomKind === "일반방" ? 0.38 : roomKind === "보물방" ? 0.3 : roomKind === "함정방" ? 0.22 : 0.14;
  if (random() > chance) return { character: nextCharacter, inventory: nextInventory, logs };

  const events = [
    "wandering-priest",
    "lost-cache",
    "ancient-rune",
    "merchant-remnant",
    "mana-fountain",
    "cursed-idol",
    "hidden-map",
  ];
  const event = events[Math.floor(random() * events.length)];

  if (event === "wandering-priest") {
    nextCharacter.hp = Math.min(nextCharacter.maxHp, nextCharacter.hp + Math.round(nextCharacter.maxHp * 0.25));
    nextCharacter.mp = Math.min(nextCharacter.maxMp, nextCharacter.mp + Math.round(nextCharacter.maxMp * 0.2));
    logs.push(pickEventLine("wandering-priest", random));
  }

  if (event === "lost-cache") {
    const gold = 35 + nextCharacter.level * 8;
    nextCharacter.gold += gold;
    nextInventory = addConsumable(nextInventory, random() > 0.5 ? "potion" : "mana-potion", 1);
    logs.push(`${pickEventLine("lost-cache", random)} ${gold}골드와 물약을 챙겼다.`);
  }

  if (event === "ancient-rune") {
    const exp = 25 + nextCharacter.level * 12;
    nextCharacter.exp += exp;
    logs.push(`${pickEventLine("ancient-rune", random)} 경험치 ${exp} 획득.`);
  }

  if (event === "merchant-remnant") {
    const equipment = rollEquipment(nextCharacter.level, nextCharacter.stats.LUK, nextCharacter.fate.seed + Date.now());
    const auto = autoEquip(nextCharacter, nextInventory, equipment);
    nextCharacter = auto.character;
    nextInventory = auto.inventory;
    logs.push(`${pickEventLine("merchant-remnant", random)} '${equipment.name}' 획득.`);
    if (auto.equipped) logs.push("장비가 손에 닿자 목걸이가 자동으로 착용 경로를 열었다.");
  }

  if (event === "mana-fountain") {
    nextCharacter.mp = nextCharacter.maxMp;
    logs.push(pickEventLine("mana-fountain", random));
  }

  if (event === "cursed-idol") {
    const damage = Math.max(1, Math.round(nextCharacter.maxHp * 0.12));
    nextCharacter.hp = Math.max(1, nextCharacter.hp - damage);
    nextCharacter.gold += 90 + nextCharacter.level * 12;
    logs.push(`${pickEventLine("cursed-idol", random)} HP ${damage}을 잃고 금화를 얻었다.`);
  }

  if (event === "hidden-map") {
    nextCharacter.gold += 45 + nextCharacter.stats.LUK * 2;
    nextInventory = addMaterial(nextInventory, "ore", "균열 철광석", 1);
    logs.push(pickEventLine("hidden-map", random));
  }

  nextCharacter = applyLevelUps(nextCharacter);
  return { character: nextCharacter, inventory: nextInventory, logs };
}

const explorationEventLines = {
  "wandering-priest": [
    "낡은 순례복의 사제가 벽에서 걸어 나와 말없이 이마에 빛을 찍었다. 상처와 마나가 동시에 잦아든다.",
    "기도문처럼 들리는 바람이 방을 한 바퀴 돌더니, 목걸이의 열을 식히고 숨을 편하게 만든다.",
    "얼굴 없는 사제가 부서진 성표를 내밀었다. 성표가 먼지가 되는 순간 몸 안쪽부터 따뜻해졌다.",
  ],
  "lost-cache": [
    "무너진 벽 틈에서 길드 표식이 찍힌 보급 상자가 굴러나왔다.",
    "바닥의 빈 타일을 들어 올리자 누군가 급히 숨겨 둔 주머니가 모습을 드러냈다.",
    "낡은 배낭 하나가 천장 거미줄에 걸려 있었다. 끌어내리자 금속성 울림이 났다.",
  ],
  "ancient-rune": [
    "발밑의 룬이 별자리처럼 이어지며 머릿속에 낯선 전투 기억을 밀어 넣었다.",
    "벽면의 고대 문자가 눈동자를 따라 움직이다가, 한순간 전부 빛으로 터졌다.",
    "목걸이가 룬의 문장을 삼켰고, 그 반동으로 몸이 조금 더 이세계에 익숙해졌다.",
  ],
  "merchant-remnant": [
    "반투명한 상인이 모자를 벗어 인사하더니, 마지막 거래라며 장비 하나를 남겼다.",
    "먼지 위에 찍힌 가격표가 스스로 찢어지고, 그 아래 감춰진 장비가 모습을 드러냈다.",
    "닫혀 있던 진열장이 딸깍 열렸다. 안쪽에는 누군가 당신을 위해 남겨 둔 듯한 장비가 있었다.",
  ],
  "mana-fountain": [
    "푸른 샘이 한 번 크게 솟구치더니, 흩어진 물방울이 전부 마나로 변해 몸속에 스며들었다.",
    "손을 담그자 물이 아니라 별빛이 손가락 사이로 흘렀다. 비어 있던 마나가 가득 찬다.",
    "샘 바닥의 눈동자 같은 보석이 깜빡였다. 위험하다고 느끼기도 전에 마나가 회복되었다.",
  ],
  "cursed-idol": [
    "검은 우상이 웃는 순간 손목에 차가운 통증이 번졌다. 대신 우상의 입에서 금화가 쏟아졌다.",
    "저주받은 석상이 피 한 방울을 요구했고, 대가로 금빛 균열을 열어 보였다.",
    "우상의 그림자가 발목을 붙잡았다. 떼어 내고 나니 주머니가 묵직해져 있었다.",
  ],
  "hidden-map": [
    "찢긴 지도 조각들이 공중에서 맞물리며 숨겨진 보급 경로를 보여주었다. 골드와 재료를 얻었다.",
    "벽의 얼룩이 지도가 되어 움직였다. 표시된 장소를 파내자 균열 철광석이 나왔다.",
    "목걸이가 바닥의 흠집을 지도처럼 읽어 냈다. 놓쳤을 보상을 회수했다.",
  ],
} as const;

function pickEventLine(type: keyof typeof explorationEventLines, random: () => number) {
  const lines = explorationEventLines[type];
  return lines[Math.floor(random() * lines.length)];
}

function autoEquip(character: Character, inventory: InventoryItem[], equipment: Equipment) {
  const current = character.equipment[equipment.slot];
  const shouldEquip = !current || equipmentScore(equipment) > equipmentScore(current) * 1.04;
  if (!shouldEquip) {
    return {
      character,
      inventory: [{ id: equipment.id, type: "equipment" as const, equipment, qty: 1 as const }, ...inventory],
      equipped: false,
    };
  }

  const nextInventory = current
    ? [{ id: current.id, type: "equipment" as const, equipment: current, qty: 1 as const }, ...inventory]
    : inventory;
  return {
    character: { ...character, equipment: { ...character.equipment, [equipment.slot]: equipment } },
    inventory: nextInventory,
    equipped: true,
  };
}

function growEquippedGear(character: Character, exp: number) {
  let next = normalizeCharacter(character);
  const logs: GameLog[] = [];
  for (const [slot, equipment] of Object.entries(next.equipment)) {
    if (!equipment) continue;
    const result = addEquipmentMastery(equipment, exp);
    next = { ...next, equipment: { ...next.equipment, [slot]: result.equipment } };
    if (result.leveled) {
      logs.push(log(`장비 숙련 상승: ${result.equipment.name} Lv.${result.equipment.masteryLevel}`, "good"));
    }
  }
  return { character: next, logs };
}

function rollCritical(character: Character, random: () => number, skillMultiplier = 1) {
  const traitRate = character.traits.reduce((sum, trait) => sum + (trait.effects?.critRate ?? 0), 0);
  const blessingRate = (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.critRate ?? 0), 0);
  const synergyRate = calculateBuildSynergies(character).reduce((sum, synergy) => sum + (synergy.effects.critRate ?? 0), 0);
  const relicRate = (character.relics ?? []).reduce((sum, relic) => sum + (relic.effects.critRate ?? 0), 0);
  const runeRate = (character.runes ?? []).reduce((sum, rune) => sum + (rune.effects.critRate ?? 0), 0);
  const gearRate = Object.values(character.equipment).reduce((sum, item) => {
    const option = item?.options.find((text) => text.startsWith("치명타 +"));
    const value = option ? Number(option.replace(/[^0-9]/g, "")) / 100 : 0;
    return sum + value;
  }, 0);
  return random() < (0.08 + character.stats.LUK * 0.006 + traitRate + blessingRate + synergyRate + relicRate + runeRate + gearRate) * skillMultiplier;
}

function rollBlessing(character: Character): Blessing {
  const random = seeded(character.fate.seed + Date.now() + character.gold);
  const table: Blessing[] = [
    { id: "blade", name: "전투의 축복", text: "다음 던전 2회 동안 공격력 +15%, 크리티컬 +5%", runsLeft: 2, effects: { attackRate: 0.15, critRate: 0.05 } },
    { id: "guard", name: "수호의 축복", text: "다음 던전 2회 동안 방어력 +20%", runsLeft: 2, effects: { defenseRate: 0.2 } },
    { id: "fortune", name: "황금 성흔", text: "다음 던전 2회 동안 골드 +25%, 드랍 +15%", runsLeft: 2, effects: { goldRate: 0.25, dropRate: 0.15 } },
    { id: "growth", name: "성장의 찬가", text: "다음 던전 2회 동안 경험치 +25%", runsLeft: 2, effects: { expRate: 0.25 } },
    { id: "miracle", name: "작은 기적", text: "다음 던전 3회 동안 크리티컬 +12%, 드랍 +10%", runsLeft: 3, effects: { critRate: 0.12, dropRate: 0.1 } },
  ];
  return table[Math.floor(random() * table.length)];
}

function createGuildQuest(character: Character): Quest {
  const random = seeded(character.fate.seed + Date.now() + character.level);
  const templates = [
    {
      key: "guild-hunt",
      title: "길드협회 토벌 의뢰",
      goal: `몬스터 ${2 + Math.floor(character.level / 6)}마리 처치`,
      target: 2 + Math.floor(character.level / 6),
      reward: `골드 ${120 + character.level * 25}, 회복 물약 1개`,
    },
    {
      key: "guild-treasure",
      title: "분실 보급품 회수",
      goal: "보물방 또는 이벤트방 2회 조사",
      target: 2,
      reward: `골드 ${180 + character.level * 18}, 균열 철광석 2개`,
    },
    {
      key: "guild-scout",
      title: "던전 지형 정찰",
      goal: "방 5개 탐험",
      target: 5,
      reward: `골드 ${140 + character.level * 20}, 마나 물약 1개`,
    },
    {
      key: "guild-trap",
      title: "함정 구조 조사",
      goal: "함정방 1회 통과",
      target: 1,
      reward: `골드 ${220 + character.level * 22}, 회복 물약 2개`,
    },
    {
      key: "guild-boss",
      title: "위협 개체 토벌",
      goal: "미니보스 또는 보스 1마리 처치",
      target: 1,
      reward: `골드 ${320 + character.level * 35}, 희귀 장비 감정권`,
    },
  ];
  const selected = templates[Math.floor(random() * templates.length)];
  return {
    id: `${selected.key}-${Date.now()}`,
    type: "서브",
    title: selected.title,
    goal: selected.goal,
    progress: 0,
    target: selected.target,
    reward: selected.reward,
    completed: false,
  };
}

function progressExplorationQuests(quests: Quest[], roomKind: DungeonRoom["kind"]) {
  const logs: string[] = [];
  const next = quests.map((quest) => {
    if (quest.completed) return quest;
    const shouldProgress =
      quest.id.startsWith("guild-scout")
      || (quest.id.startsWith("guild-treasure") && (roomKind === "보물방" || roomKind === "이벤트방"))
      || (quest.id.startsWith("guild-trap") && roomKind === "함정방");
    if (!shouldProgress) return quest;
    const progress = Math.min(quest.target, quest.progress + 1);
    const completed = progress >= quest.target;
    if (completed) logs.push(`길드 의뢰 완료: ${quest.title}`);
    return { ...quest, progress, completed };
  });
  return { quests: next, logs };
}

function progressCombatQuests(quests: Quest[], boss: boolean) {
  const logs: string[] = [];
  const next = quests.map((quest) => {
    if (quest.completed) return quest;
    const shouldProgress = quest.id.startsWith("guild-hunt") || (quest.id.startsWith("guild-boss") && boss);
    if (!shouldProgress) return quest;
    const progress = Math.min(quest.target, quest.progress + 1);
    const completed = progress >= quest.target;
    if (completed) logs.push(`길드 의뢰 완료: ${quest.title}`);
    return { ...quest, progress, completed };
  });
  return { quests: next, logs };
}

function claimQuestReward(character: Character, inventory: InventoryItem[], questId: string) {
  let nextCharacter = normalizeCharacter(character);
  let nextInventory = [...inventory];

  if (questId === "main-necklace") {
    const equipment = rollEquipment(character.level + 2, character.stats.LUK, character.fate.seed + Date.now(), "희귀");
    const auto = autoEquip(nextCharacter, nextInventory, equipment);
    nextCharacter = { ...auto.character, gold: auto.character.gold + 500 };
    nextInventory = auto.inventory;
  } else if (questId === "daily-hunt") {
    nextCharacter = { ...nextCharacter, gold: nextCharacter.gold + 100 };
    nextInventory = addConsumable(nextInventory, "potion", 2);
  } else if (questId === "ach-first") {
    nextCharacter = { ...nextCharacter, gold: nextCharacter.gold + 100 };
  } else if (questId.startsWith("guild-hunt")) {
    nextCharacter = { ...nextCharacter, gold: nextCharacter.gold + 120 + nextCharacter.level * 25 };
    nextInventory = addConsumable(nextInventory, "potion", 1);
  } else if (questId.startsWith("guild-treasure")) {
    nextCharacter = { ...nextCharacter, gold: nextCharacter.gold + 180 + nextCharacter.level * 18 };
    nextInventory = addMaterial(nextInventory, "ore", "균열 철광석", 2);
  } else if (questId.startsWith("guild-scout")) {
    nextCharacter = { ...nextCharacter, gold: nextCharacter.gold + 140 + nextCharacter.level * 20 };
    nextInventory = addConsumable(nextInventory, "mana-potion", 1);
  } else if (questId.startsWith("guild-trap")) {
    nextCharacter = { ...nextCharacter, gold: nextCharacter.gold + 220 + nextCharacter.level * 22 };
    nextInventory = addConsumable(nextInventory, "potion", 2);
  } else if (questId.startsWith("guild-boss")) {
    const equipment = rollEquipment(character.level + 1, character.stats.LUK, character.fate.seed + Date.now(), "희귀");
    const auto = autoEquip(nextCharacter, nextInventory, equipment);
    nextCharacter = { ...auto.character, gold: auto.character.gold + 320 + nextCharacter.level * 35 };
    nextInventory = auto.inventory;
  }

  return { character: nextCharacter, inventory: nextInventory };
}

function improveEnhancedEquipment(equipment: Equipment): Equipment {
  const nextEnhance = equipment.enhance + 1;
  const statEntries = Object.entries(equipment.stats);
  const nextStats = { ...equipment.stats };
  if (statEntries[0]) {
    const [key, value] = statEntries[0] as [keyof typeof nextStats, number | undefined];
    nextStats[key] = (value ?? 0) + 1 + Math.floor(nextEnhance / 5);
  }

  return {
    ...equipment,
    enhance: nextEnhance,
    stats: nextStats,
    attack: equipment.attack ? equipment.attack + 4 + Math.floor(nextEnhance / 2) : equipment.attack,
    defense: equipment.defense ? equipment.defense + 3 + Math.floor(nextEnhance / 3) : equipment.defense,
  };
}

function equipmentSellPrice(equipment: Equipment) {
  return Math.max(20, Math.round(equipment.price * 0.55 + equipment.enhance * 35 + (equipment.masteryLevel ?? 1) * 8));
}
