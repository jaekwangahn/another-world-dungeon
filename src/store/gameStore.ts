"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { encounterTexts, specialEncounterSkills, starterQuests } from "@/data/gameData";
import { analyzeFate, createStats, rollJob, rollTrait, seeded } from "@/lib/fate";
import {
  addEquipmentMastery,
  applyLevelUps,
  attackPower,
  defensePower,
  equipmentScore,
  expToNext,
  generateDungeon,
  generateTowerDungeon,
  magicPower,
  maxHp,
  maxMp,
  rollEquipment,
} from "@/lib/gameEngine";
import type {
  BirthProfile,
  Blessing,
  Character,
  CombatState,
  DungeonRoom,
  DungeonRunInfo,
  Equipment,
  EquipmentSlot,
  GamePhase,
  InventoryItem,
  Quest,
  Skill,
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
  logs: GameLog[];
  storyLoading: boolean;
  lastSavedAt?: string;
  createCharacter: (profile: BirthProfile) => void;
  enterDungeon: () => void;
  enterTower: () => void;
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
  reincarnate: () => void;
  manualSave: () => void;
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
        const rewardMultiplier = 1.35 + floor * 0.08;
        set({
          phase: "dungeon",
          dungeon,
          currentRun: { type: "tower", floor, rewardMultiplier },
          roomIndex: 0,
          combat: undefined,
          logs: [
            log(`하늘을 찌르는 무한탑의 ${floor}층 문이 열렸다. 계단 아래로는 이미 지나온 세계들이 안개처럼 흔들린다.`, "rare"),
            log(`탑 보상 배율 x${rewardMultiplier.toFixed(2)} · 층이 오를수록 적도 보상도 거칠어진다.`),
          ],
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

        const nextIndex = state.roomIndex + 1;
        if (nextIndex >= state.dungeon.length) {
          set({
            phase: "reward",
            character: nextCharacter,
            inventory,
            quests,
            logs: [...state.logs, ...logs.map((text) => log(text, text.includes("획득") || text.includes("완료") ? "good" : "normal")), log("던전의 균열이 안정되었다. 마을로 돌아갈 수 있다.", "good")],
          });
          return;
        }

        set({
          character: nextCharacter,
          inventory,
          quests,
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
          if (nextCharacter.mp >= skill.mpCost) {
            nextCharacter.mp -= skill.mpCost;
            const base = character.job.archetype === "magic" ? magicPower(character) : attackPower(character);
            const crit = rollCritical(character, random, 0.6);
            const damage = Math.max(5, Math.round(base * skill.power * (crit ? 1.7 : 1) - monster.defense * 0.55));
            monster.hp -= damage;
            logs.push(`${skill.name}: ${crit ? "크리티컬로 " : ""}${skill.text} ${damage} 피해.`);
          } else {
            logs.push("MP가 부족하다.");
            playerTurnSpent = false;
          }
        }

        if (monster.hp <= 0) {
          const remainingMonsters = combatMonsters.slice(1);
          const finalMonsterInRoom = remainingMonsters.length === 0;
          const bossRoom = finalMonsterInRoom && state.roomIndex >= state.dungeon.length - 1;
          const defeatedBoss = monster.id.startsWith("boss") || monster.id.startsWith("mini");
          const reward = finishCombat(nextCharacter, monster, inventory, state.quests, defeatedBoss, state.currentRun?.rewardMultiplier ?? 1);
          if (!finalMonsterInRoom) {
            const nextMonster = remainingMonsters[0];
            set({
              character: reward.character,
              inventory: reward.inventory,
              quests: reward.quests,
              combat: {
                monster: nextMonster,
                monsters: remainingMonsters,
                defending: false,
                log: [...logs, ...reward.logs.map((entry) => entry.text), `${nextMonster.name}이(가) 다음 상대로 뛰쳐나왔다.`].slice(-8),
              },
            });
            return;
          }
          const dungeon = [...state.dungeon];
          dungeon[state.roomIndex] = { ...dungeon[state.roomIndex], cleared: true };
          const nextIndex = state.roomIndex + 1;
          const towerRun = state.currentRun?.type === "tower" ? state.currentRun : undefined;
          const clearedTower = bossRoom && !!towerRun;
          const rewardedCharacter = clearedTower
            ? { ...reward.character, towerFloor: Math.min(999, Math.max(reward.character.towerFloor ?? 1, towerRun.floor + 1)) }
            : reward.character;
          set({
            phase: nextIndex >= dungeon.length ? "reward" : "dungeon",
            character: rewardedCharacter,
            inventory: reward.inventory,
            quests: reward.quests,
            dungeon,
            roomIndex: Math.min(nextIndex, dungeon.length - 1),
            combat: undefined,
            logs: [
              ...state.logs,
              ...logs.map((text) => log(text)),
              ...reward.logs,
              ...(clearedTower ? [log(`무한탑 ${towerRun.floor}층 돌파. 다음 층이 열렸다.`, "rare")] : []),
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
          set({ phase: "defeat", character: nextCharacter, combat: undefined, inventory, logs: [...state.logs, ...logs.map((text) => log(text)), log("목걸이가 강제로 현실 귀환을 발동했다. 골드 일부를 잃었다.", "bad")] });
          return;
        }

        set({ character: nextCharacter, combat: { monster, monsters: [monster, ...combatMonsters.slice(1)], defending: action === "defend", log: logs.slice(-8) }, inventory });
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
        set({ character: nextCharacter, inventory, quests, logs: [...state.logs, ...logs] });
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
          hp: maxHp(stats, 1),
          maxHp: maxHp(stats, 1),
          mp: maxMp(stats, 1),
          maxMp: maxMp(stats, 1),
        };
        set({ phase: "town", character: next, logs: [...get().logs, log(`환생 완료. 새로운 직업 '${job.name}'과 특성 '${trait.name}'이 운명에 새겨졌다.`, "rare")] });
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

      reset: () => {
        set({ phase: "create", character: undefined, dungeon: [], currentRun: undefined, roomIndex: 0, combat: undefined, inventory: starterInventory, storage: [], storageCapacity: 5, quests: starterQuests, logs: [log("새로운 목걸이가 주인을 기다린다.")], lastSavedAt: undefined });
      },
    }),
    { name: "another-world-dungeon-save", partialize: (state) => ({ ...state, storyLoading: false, combat: undefined }) },
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

function addMaterial(items: InventoryItem[], id: string, name: string, qty: number) {
  const next = items.map((item) => ({ ...item })) as InventoryItem[];
  const found = next.find((item) => item.type === "material" && item.id === id);
  if (found?.type === "material") found.qty += qty;
  else next.push({ id, type: "material", name, qty, rarity: "일반" });
  return next;
}

function finishCombat(character: Character, monster: NonNullable<CombatState["monster"]>, inventory: InventoryItem[], quests: Quest[], boss: boolean, rewardMultiplier = 1) {
  const expRate = 1 + (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.expRate ?? 0), 0);
  const goldRate = 1 + (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.goldRate ?? 0), 0);
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
    + (character.blessings ?? []).reduce((sum, blessing) => sum + (blessing.effects.dropRate ?? 0), 0);
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
  return { character: nextCharacter, inventory: nextInventory, quests: nextQuests, logs };
}

function normalizeCharacter(character: Character): Character {
  return {
    ...character,
    towerFloor: character.towerFloor ?? 1,
    blessings: character.blessings ?? [],
    specialSkills: character.specialSkills ?? [],
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
  const gearRate = Object.values(character.equipment).reduce((sum, item) => {
    const option = item?.options.find((text) => text.startsWith("치명타 +"));
    const value = option ? Number(option.replace(/[^0-9]/g, "")) / 100 : 0;
    return sum + value;
  }, 0);
  return random() < (0.08 + character.stats.LUK * 0.006 + traitRate + blessingRate + gearRate) * skillMultiplier;
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
