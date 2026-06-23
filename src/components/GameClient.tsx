"use client";

import { motion } from "framer-motion";
import {
  Backpack,
  Bed,
  Castle,
  Dices,
  Save,
  HandHeart,
  Heart,
  Landmark,
  Package,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { rarityColor, roomVisuals } from "@/data/gameData";
import { attackPower, defensePower, equipmentScore, magicPower } from "@/lib/gameEngine";
import type { BirthProfile, Equipment, EquipmentSlot, Gender, InventoryItem, Skill } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";

export function GameClient() {
  const store = useGameStore();
  const character = store.character;
  const currentRoom = store.dungeon[store.roomIndex];
  const unlockedSkills = character
    ? [...character.job.skills.filter((skill) => skill.unlockLevel <= character.level), ...(character.specialSkills ?? [])]
    : [];

  return (
    <main className="min-h-screen bg-[#08090d] text-zinc-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(64,89,120,0.28),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(111,68,48,0.22),transparent_30%),linear-gradient(180deg,#08090d,#11100f_55%,#070707)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-3 px-3 py-3 sm:px-5">
        <TopBar />
        {store.phase === "create" || !character ? (
          <CharacterCreator />
        ) : (
          <>
            <div className="grid flex-1 grid-cols-1 gap-3 xl:grid-cols-[224px_minmax(0,1fr)_238px]">
              <LeftPanel />
              <section className="min-h-[560px] border border-zinc-800/90 bg-zinc-950/72 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                    <div>
                      <p className="text-xs text-zinc-500">Another World Dungeon Explorer</p>
                      <h1 className="text-xl font-semibold text-zinc-50">
                        {store.phase === "town"
                          ? "균열 마을: 네크리스 게이트"
                          : store.currentRun?.type === "tower"
                            ? `무한탑 ${store.currentRun.floor}층`
                            : currentRoom?.title ?? "초심자 던전"}
                      </h1>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Castle size={16} />
                      <span>최대 레벨 999</span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="p-4">
                      {store.phase === "town" && <TownView />}
                      {store.phase === "dungeon" && currentRoom && <DungeonView roomTitle={currentRoom.title} />}
                      {store.phase === "combat" && store.combat && <CombatView />}
                      {store.phase === "reward" && <RewardView />}
                      {store.phase === "defeat" && <DefeatView />}
                    </div>

                    <ChoiceBar skills={unlockedSkills} />
                  </div>
                </div>
              </section>
              <RightPanel />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function TopBar() {
  const character = useGameStore((state) => state.character);
  const reset = useGameStore((state) => state.reset);
  const manualSave = useGameStore((state) => state.manualSave);
  const lastSavedAt = useGameStore((state) => state.lastSavedAt);
  if (!character) {
    return (
      <header className="flex items-center justify-between border border-zinc-800 bg-zinc-950/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center border border-amber-600/40 bg-amber-950/20">
            <Sparkles className="text-amber-200" size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500">프로젝트명</p>
            <h1 className="text-lg font-semibold">이세계 던전 탐험</h1>
          </div>
        </div>
        <p className="hidden text-sm text-zinc-400 sm:block">현실 정보 기반 아바타 생성</p>
      </header>
    );
  }

  return (
    <header className="grid grid-cols-2 gap-2 border border-zinc-800 bg-zinc-950/78 px-4 py-3 backdrop-blur lg:grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_1fr_auto_auto]">
      <div>
        <p className="text-xs text-zinc-500">프로필</p>
        <h1 className="truncate text-lg font-semibold">{character.profile.name} · {character.job.name}</h1>
      </div>
      <Meter label={`Lv.${character.level} / 환생 ${character.reincarnation}`} value={character.exp} max={character.nextExp} tone="amber" />
      <Meter label="HP" value={character.hp} max={character.maxHp} tone="rose" />
      <Meter label="MP" value={character.mp} max={character.maxMp} tone="sky" />
      <div className="border border-amber-700/40 bg-amber-950/20 px-3 py-2">
        <p className="text-xs text-amber-200/70">골드</p>
        <p className="truncate text-lg font-semibold text-amber-200">{character.gold.toLocaleString()}G</p>
      </div>
      <div className="border border-zinc-800 bg-zinc-900/55 px-3 py-2">
        <p className="text-xs text-zinc-500">마지막 저장</p>
        <p className="truncate text-sm font-medium text-zinc-200">{lastSavedAt ? formatSavedAt(lastSavedAt) : "자동 저장 중"}</p>
      </div>
      <button
        className="flex h-10 items-center justify-center gap-2 border border-emerald-700/70 px-3 text-sm text-emerald-100 hover:border-emerald-400 hover:bg-emerald-950/40"
        onClick={manualSave}
        title="저장"
      >
        <Save size={16} />
        저장
      </button>
      <button
        className="flex h-10 items-center justify-center gap-2 border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
        onClick={reset}
        title="새 게임"
      >
        <Dices size={16} />
        새 운명
      </button>
    </header>
  );
}

function formatSavedAt(savedAt: string) {
  return new Date(savedAt).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CharacterCreator() {
  const createCharacter = useGameStore((state) => state.createCharacter);
  const [profile, setProfile] = useState<BirthProfile>({
    name: "윤서",
    gender: "other",
    birthDate: "1992-03-15",
    birthTime: "23:40",
    height: 174,
    weight: 68,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createCharacter(profile);
  };

  return (
    <section className="grid flex-1 place-items-center py-8">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="grid w-full max-w-5xl gap-5 border border-zinc-800 bg-zinc-950/76 p-5 shadow-2xl shadow-black/40 md:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="min-h-[500px] bg-[linear-gradient(rgba(8,9,13,0.22),rgba(8,9,13,0.86)),url('https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center p-6">
          <div className="flex h-full flex-col justify-end">
            <p className="text-sm text-amber-200">신비한 목걸이의 주인 인증</p>
            <h2 className="max-w-xl text-4xl font-bold leading-tight text-white">현실의 정보가 이세계의 능력치가 된다</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-300">
              입력값은 별자리, 오행, 기질, 재능, 직업 희귀도, 초기 스탯의 시드로 변환된다.
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          <Field label="이름">
            <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="input" required />
          </Field>
          <Field label="성별">
            <select value={profile.gender} onChange={(event) => setProfile({ ...profile, gender: event.target.value as Gender })} className="input">
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타/비공개</option>
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="생년월일">
              <input type="date" value={profile.birthDate} onChange={(event) => setProfile({ ...profile, birthDate: event.target.value })} className="input" required />
            </Field>
            <Field label="태어난 시간">
              <input type="time" value={profile.birthTime} onChange={(event) => setProfile({ ...profile, birthTime: event.target.value })} className="input" required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="키(cm)">
              <input type="number" value={profile.height} onChange={(event) => setProfile({ ...profile, height: Number(event.target.value) })} className="input" min={80} max={240} required />
            </Field>
            <Field label="몸무게(kg)">
              <input type="number" value={profile.weight} onChange={(event) => setProfile({ ...profile, weight: Number(event.target.value) })} className="input" min={20} max={250} required />
            </Field>
          </div>
          <button className="mt-2 flex h-12 items-center justify-center gap-2 bg-amber-500 px-5 font-semibold text-zinc-950 hover:bg-amber-300">
            <WandSparkles size={18} />
            목걸이 착용
          </button>
        </div>
      </motion.form>
    </section>
  );
}

function LeftPanel() {
  const character = useGameStore((state) => state.character);
  if (!character) return null;
  const stats = Object.entries(character.stats);
  return (
    <aside className="grid content-start gap-3">
      <Panel title="캐릭터" icon={<Swords size={17} />}>
        <div className={`mb-3 border px-3 py-2 ${rarityColor[character.job.rarity]}`}>
          <p className="text-xs text-zinc-400">직업 희귀도</p>
          <p className="font-semibold">{character.job.rarity} · {character.job.hidden ? "숨겨진 직업 " : ""}{character.job.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stats.map(([key, value]) => (
            <div key={key} className="border border-zinc-800 bg-zinc-900/60 p-2">
              <p className="text-xs text-zinc-500">{key}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Power label="ATK" value={attackPower(character)} />
          <Power label="DEF" value={defensePower(character)} />
          <Power label="MAG" value={magicPower(character)} />
        </div>
      </Panel>
      <Panel title="운명 분석" icon={<Sparkles size={17} />}>
        <Info label="별자리" value={character.fate.zodiac} />
        <Info label="오행" value={character.fate.element} />
        <Info label="기질" value={character.fate.temperament} />
        <Info label="숨겨진 재능" value={character.fate.talentBonus} />
        <p className="mt-2 text-sm leading-6 text-zinc-300">{character.fate.fortune}</p>
      </Panel>
      <Panel title="스킬" icon={<WandSparkles size={17} />}>
        <div className="grid gap-2">
          {character.job.skills.map((skill) => (
            <div key={skill.id} className={`border p-2 ${skill.unlockLevel <= character.level ? "border-zinc-700 bg-zinc-900/70" : "border-zinc-900 bg-zinc-950/60 text-zinc-600"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{skill.name}</p>
                <p className="text-xs">Lv.{skill.unlockLevel}</p>
              </div>
              <p className="mt-1 text-xs leading-5">{skill.text}</p>
            </div>
          ))}
          {(character.specialSkills ?? []).map((skill) => (
            <div key={skill.id} className="border border-amber-500/60 bg-amber-950/20 p-2 text-amber-100">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{skill.name}</p>
                <p className="text-xs">기연</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-amber-100/80">{skill.text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}

function TownView() {
  const { enterDungeon, enterTower, reincarnate, receiveBlessing, stayAtInn, visitGuild, buyStorageSlot, storageCapacity, character } = useGameStore();
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [potionShopOpen, setPotionShopOpen] = useState(false);
  return (
    <div className="grid h-full content-between gap-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[420px] bg-[linear-gradient(rgba(8,9,13,0.18),rgba(8,9,13,0.88)),url('https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center p-5">
        <div className="max-w-2xl">
          <p className="text-sm text-amber-200">현실과 이세계를 잇는 중립 거점</p>
          <h2 className="mt-2 text-3xl font-bold">균열 마을</h2>
          <p className="mt-3 leading-7 text-zinc-300">
            상인, 대장장이, 교회 사제, 여관 주인, 길드 접수원이 목걸이의 빛을 알아보고 길을 비킨다. 던전에서 얻은 장비는 더 강하면 자동 장착되고, 사용할수록 숙련 레벨이 오른다.
          </p>
          {character && character.level >= 10 && (
            <div className="mt-5 max-w-xl border border-sky-600/50 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">
              무한탑 개방 · 현재 도전 가능 층 {character.towerFloor ?? 1}/999
            </div>
          )}
          {character && (character.blessings ?? []).length > 0 && (
            <div className="mt-5 grid max-w-2xl gap-2">
              {(character.blessings ?? []).map((blessing) => (
                <div key={`${blessing.id}-${blessing.runsLeft}`} className="border border-amber-600/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                  {blessing.name} · 남은 던전 {blessing.runsLeft}회
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-9">
        <Action onClick={enterDungeon} icon={<Castle size={18} />} label="던전 입장" />
        <Action onClick={enterTower} icon={<Landmark size={18} />} label={character && character.level >= 10 ? `무한탑 ${character.towerFloor ?? 1}층` : "무한탑 잠김"} disabled={!character || character.level < 10} />
        <Action onClick={() => setPotionShopOpen(true)} icon={<Heart size={18} />} label="물약 구매" />
        <Action onClick={buyStorageSlot} icon={<Package size={18} />} label={`창고 확장 ${storageCapacity ?? 5}칸`} />
        <Action onClick={() => setEnhanceOpen(true)} icon={<Shield size={18} />} label="장비 강화" />
        <Action onClick={receiveBlessing} icon={<Landmark size={18} />} label="교회 축복" />
        <Action onClick={stayAtInn} icon={<Bed size={18} />} label="여관 숙박" />
        <Action onClick={visitGuild} icon={<ScrollText size={18} />} label="길드협회" />
        <Action onClick={reincarnate} icon={<Sparkles size={18} />} label={character && character.level >= 100 ? "환생" : "환생 잠김"} disabled={!character || character.level < 100} />
      </div>
      {potionShopOpen && <PotionShopModal onClose={() => setPotionShopOpen(false)} />}
      {enhanceOpen && <EnhanceModal onClose={() => setEnhanceOpen(false)} />}
    </div>
  );
}

function DungeonView({ roomTitle }: { roomTitle: string }) {
  const store = useGameStore();
  const room = store.dungeon[store.roomIndex];
  if (!room) return null;
  const image = roomVisuals[room.kind];
  const monsterCount = room.monsters?.length ?? (room.monster ? 1 : 0);
  const runLabel = store.currentRun?.type === "tower"
    ? `무한탑 ${store.currentRun.floor}층 · 보상 x${store.currentRun.rewardMultiplier.toFixed(2)}`
    : "초심자 던전";
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/55 px-4 py-3">
        <div>
          <p className="text-xs text-zinc-500">{runLabel} · {store.roomIndex + 1}/{store.dungeon.length}</p>
          <h2 className="text-2xl font-semibold">{roomTitle}</h2>
        </div>
        <span className="border border-amber-700/50 px-3 py-1 text-sm text-amber-200">{room.kind}</span>
      </div>
      <div
        className="min-h-[320px] border border-zinc-800 bg-cover bg-center p-5"
        style={{ backgroundImage: `linear-gradient(rgba(8,9,13,0.12),rgba(8,9,13,0.9)),url('${image}')` }}
      >
        <p className="max-w-2xl text-lg leading-8 text-zinc-100">{room.description}</p>
        {room.monster && (
          <div className="mt-6 max-w-md border border-rose-800/60 bg-rose-950/30 p-4">
            <p className="text-sm text-rose-200">적 감지 · {monsterCount}마리</p>
            <h3 className="text-xl font-semibold">{room.monster.name}</h3>
            <p className="mt-1 text-sm text-zinc-300">Lv.{room.monster.level} · HP {room.monster.maxHp} · 특수기 {room.monster.specialName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CombatView() {
  const combat = useGameStore((state) => state.combat);
  const character = useGameStore((state) => state.character);
  if (!combat || !character) return null;
  const bossFight = combat.monster.id.startsWith("boss");
  const miniBossFight = combat.monster.id.startsWith("mini");
  const remainingCount = combat.monsters?.length ?? 1;
  return (
    <div className={`grid gap-4 ${bossFight ? "boss-shake" : ""}`}>
      <div className="grid gap-3 md:grid-cols-2">
        <Combatant name={character.profile.name} hp={character.hp} maxHp={character.maxHp} sub={`${character.job.name} · Lv.${character.level}`} />
        <Combatant name={combat.monster.name} hp={combat.monster.hp} maxHp={combat.monster.maxHp} sub={`Lv.${combat.monster.level} · ${combat.monster.specialName} · 남은 적 ${remainingCount}마리`} enemy />
      </div>
      <div className={`relative min-h-[300px] overflow-hidden border p-4 ${bossFight ? "border-rose-700/70 bg-rose-950/25 boss-aura" : miniBossFight ? "border-amber-700/60 bg-amber-950/20" : "border-zinc-800 bg-zinc-950/70"}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">전투 로그</h2>
          {bossFight && <span className="critical-flash border border-rose-500/70 px-2 py-1 text-xs text-rose-100">보스 이벤트</span>}
        </div>
        <div className="grid gap-2">
          {combat.log.slice(-8).map((entry, index) => (
            <p
              key={`${entry}-${index}`}
              className={`border-l px-3 py-2 text-sm ${entry.includes("크리티컬") ? "critical-hit border-amber-300 bg-amber-500/15 text-amber-100" : "border-zinc-700 bg-zinc-900/50 text-zinc-300"}`}
            >
              {entry}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function RewardView() {
  const enterDungeon = useGameStore((state) => state.enterDungeon);
  const phaseTown = () => useGameStore.setState({ phase: "town" });
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="max-w-xl">
        <Sparkles className="mx-auto text-amber-200" size={42} />
        <h2 className="mt-4 text-3xl font-bold">던전 클리어</h2>
        <p className="mt-3 leading-7 text-zinc-300">목걸이가 던전의 핵을 흡수했다. 더 깊은 던전과 높은 희귀도 보상이 열릴 준비를 한다.</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Action onClick={enterDungeon} icon={<Castle size={18} />} label="다시 입장" />
          <Action onClick={phaseTown} icon={<Package size={18} />} label="마을로" />
        </div>
      </div>
    </div>
  );
}

function DefeatView() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="max-w-xl">
        <Heart className="mx-auto text-rose-300" size={42} />
        <h2 className="mt-4 text-3xl font-bold">현실 강제 귀환</h2>
        <p className="mt-3 leading-7 text-zinc-300">사망 직전 목걸이가 작동했다. HP 1로 살아남았지만 골드 일부를 잃었다.</p>
        <button className="mt-6 h-11 border border-zinc-700 px-5 hover:bg-zinc-900" onClick={() => useGameStore.setState({ phase: "town" })}>마을에서 회복</button>
      </div>
    </div>
  );
}

function ChoiceBar({ skills }: { skills: Skill[] }) {
  const store = useGameStore();
  const room = store.dungeon[store.roomIndex];
  if (store.phase === "combat") {
    return (
      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 bg-zinc-950/80 p-3 md:grid-cols-4 xl:grid-cols-8">
        <Action onClick={() => store.combatAction("attack")} icon={<Swords size={18} />} label="공격" />
        {skills.map((skill) => (
          <Action key={skill.id} onClick={() => store.combatAction("skill", skill.id)} icon={<WandSparkles size={18} />} label={`${skill.name}(${skill.mpCost})`} />
        ))}
        <Action onClick={() => store.combatAction("defend")} icon={<Shield size={18} />} label="방어" />
        <Action onClick={() => store.combatAction("dodge")} icon={<Dices size={18} />} label="회피" />
        <Action onClick={() => store.combatAction("item")} icon={<Heart size={18} />} label="아이템" />
        <Action onClick={() => store.combatAction("escape")} icon={<Castle size={18} />} label="도주" />
      </div>
    );
  }
  if (store.phase !== "dungeon" || !room) return <div className="border-t border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-500">마을 기능을 선택하세요.</div>;
  return (
    <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 bg-zinc-950/80 p-3 md:grid-cols-5">
      {room.choices.map((choice) => (
        <Action key={choice} onClick={() => store.resolveRoom(choice)} icon={<Dices size={18} />} label={choice} />
      ))}
      <Action onClick={store.generateAiStory} icon={<Sparkles size={18} />} label={store.storyLoading ? "생성 중" : "AI 서사"} disabled={store.storyLoading} />
    </div>
  );
}

function RightPanel() {
  const { inventory, storage, storageCapacity, quests, logs, equip, sellEquipment, storeItem, retrieveItem, character, visitGuild } = useGameStore();
  const [pendingEquipment, setPendingEquipment] = useState<Equipment | undefined>();
  const [pendingItem, setPendingItem] = useState<InventoryItem | undefined>();
  const equipmentItems = inventory.filter((item) => item.type === "equipment");
  const consumables = inventory.filter((item) => item.type !== "equipment");
  const currentEquipment = pendingEquipment ? character?.equipment[pendingEquipment.slot] : undefined;
  const storageItems = storage ?? [];
  const capacity = storageCapacity ?? 5;
  return (
    <aside className="grid content-start gap-3">
      <Panel title="퀘스트" icon={<Package size={17} />}>
        <div className="grid gap-2">
          {quests.map((quest) => (
            <div key={quest.id} className="border border-zinc-800 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{quest.title}</p>
                <span className="text-xs text-amber-200">{quest.type}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">{quest.goal}</p>
              <div className="mt-2 h-1.5 bg-zinc-800">
                <div className="h-full bg-amber-400" style={{ width: `${(quest.progress / quest.target) * 100}%` }} />
              </div>
              {quest.completed && <p className="mt-2 text-xs text-amber-200">완료됨 · 길드협회에서 보수 수령</p>}
            </div>
          ))}
          <button onClick={visitGuild} className="flex h-9 items-center justify-center gap-2 border border-zinc-700 bg-zinc-900/70 text-sm hover:border-amber-500/70">
            <HandHeart size={15} />
            완료 보수 수령
          </button>
        </div>
      </Panel>
      <Panel title="인벤토리" icon={<Backpack size={17} />}>
        <div className="grid max-h-[320px] gap-2 overflow-auto pr-1">
          {equipmentItems.map((item) => item.type === "equipment" && (
            <button key={item.equipment.id} onClick={() => setPendingEquipment(item.equipment)} className={`border p-2 text-left hover:bg-zinc-900 ${rarityColor[item.equipment.rarity]}`}>
              <p className="font-medium">{item.equipment.name}</p>
              <p className="text-xs text-zinc-400">{item.equipment.slot} · 장비 Lv.{item.equipment.level} · 숙련 Lv.{item.equipment.masteryLevel ?? 1}</p>
            </button>
          ))}
          {consumables.map((item) => (
            <button key={item.id} onClick={() => setPendingItem(item)} className="border border-zinc-800 bg-zinc-900/55 p-2 text-left hover:border-amber-500/70">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-zinc-400">보유 {item.qty}</p>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={`창고 ${storageItems.length}/${capacity}`} icon={<Package size={17} />}>
        <div className="grid max-h-[220px] gap-2 overflow-auto pr-1">
          {storageItems.length === 0 && <p className="text-sm text-zinc-500">보관 중인 물품 없음</p>}
          {storageItems.map((item, index) => (
            <button key={`${item.type === "equipment" ? item.equipment.id : item.id}-${index}`} onClick={() => retrieveItem(item)} className="border border-zinc-800 bg-zinc-900/55 p-2 text-left hover:border-emerald-500/70">
              <p className="font-medium">{item.type === "equipment" ? item.equipment.name : item.name}</p>
              <p className="text-xs text-zinc-400">{item.type === "equipment" ? `${item.equipment.slot} · ${item.equipment.rarity}` : `수량 ${item.qty}`}</p>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="장비" icon={<Shield size={17} />}>
        <div className="grid gap-2">
          {character && Object.entries(character.equipment).map(([slot, equipment]) => (
            <EquipmentLine key={slot} equipment={equipment} />
          ))}
        </div>
      </Panel>
      <Panel title="로그" icon={<Sparkles size={17} />}>
        <div className="grid max-h-[260px] gap-2 overflow-auto pr-1">
          {logs.slice(-10).reverse().map((entry) => (
            <p key={entry.id} className={`border-l px-3 py-2 text-sm leading-6 ${entry.tone === "good" ? "border-emerald-500 bg-emerald-950/20 text-emerald-100" : entry.tone === "bad" ? "border-rose-500 bg-rose-950/20 text-rose-100" : entry.tone === "rare" ? "border-amber-400 bg-amber-950/20 text-amber-100" : "border-zinc-700 bg-zinc-900/45 text-zinc-300"}`}>{entry.text}</p>
          ))}
        </div>
      </Panel>
      {pendingEquipment && (
        <EquipmentConfirm
          candidate={pendingEquipment}
          current={currentEquipment}
          onCancel={() => setPendingEquipment(undefined)}
          onConfirm={() => {
            equip(pendingEquipment);
            setPendingEquipment(undefined);
          }}
          onSell={() => {
            sellEquipment(pendingEquipment.id);
            setPendingEquipment(undefined);
          }}
          onStore={() => {
            storeItem({ id: pendingEquipment.id, type: "equipment", equipment: pendingEquipment, qty: 1 });
            setPendingEquipment(undefined);
          }}
        />
      )}
      {pendingItem && (
        <ItemStorageConfirm
          item={pendingItem}
          onCancel={() => setPendingItem(undefined)}
          onStore={() => {
            storeItem(pendingItem);
            setPendingItem(undefined);
          }}
        />
      )}
    </aside>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-zinc-800 bg-zinc-950/72 p-3 backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-zinc-200">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: "amber" | "rose" | "sky" }) {
  const color = tone === "amber" ? "bg-amber-400" : tone === "rose" ? "bg-rose-400" : "bg-sky-400";
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="mt-1 h-2 bg-zinc-800">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}

function Power({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/60 p-2">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function Action({ onClick, icon, label, disabled }: { onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex h-11 min-w-0 items-center justify-center gap-2 border border-zinc-700 bg-zinc-900/70 px-3 text-sm font-medium text-zinc-100 hover:border-amber-500/70 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function Combatant({ name, sub, hp, maxHp, enemy }: { name: string; sub: string; hp: number; maxHp: number; enemy?: boolean }) {
  return (
    <div className={`border p-4 ${enemy ? "border-rose-800/60 bg-rose-950/20" : "border-emerald-800/60 bg-emerald-950/20"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{name}</h2>
          <p className="text-sm text-zinc-400">{sub}</p>
        </div>
        {enemy ? <Swords className="text-rose-200" /> : <Shield className="text-emerald-200" />}
      </div>
      <Meter label="HP" value={Math.max(0, hp)} max={maxHp} tone={enemy ? "rose" : "amber"} />
    </div>
  );
}

function EquipmentLine({ equipment }: { equipment?: Equipment }) {
  if (!equipment) return null;
  return (
    <div className={`border p-2 ${rarityColor[equipment.rarity]}`}>
      <p className="font-medium">{equipment.slot} · {equipment.name} +{equipment.enhance}</p>
      <p className="text-xs text-zinc-400">숙련 Lv.{equipment.masteryLevel ?? 1} · {equipment.masteryExp ?? 0}/{equipment.masteryNext ?? 100}</p>
      <p className="text-xs text-zinc-400">{equipment.options.join(" / ")}</p>
    </div>
  );
}

function EquipmentConfirm({
  candidate,
  current,
  onCancel,
  onConfirm,
  onSell,
  onStore,
}: {
  candidate: Equipment;
  current?: Equipment;
  onCancel: () => void;
  onConfirm: () => void;
  onSell: () => void;
  onStore: () => void;
}) {
  const currentScore = current ? Math.round(equipmentScore(current)) : 0;
  const candidateScore = Math.round(equipmentScore(candidate));
  const scoreDiff = candidateScore - currentScore;
  const sellPrice = Math.max(20, Math.round(candidate.price * 0.55 + candidate.enhance * 35 + (candidate.masteryLevel ?? 1) * 8));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/68 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl shadow-black">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <p className="text-xs text-zinc-500">인벤토리 장비 선택</p>
            <h2 className="text-xl font-semibold">{candidate.name}</h2>
          </div>
          <span className={scoreDiff >= 0 ? "text-emerald-300" : "text-rose-300"}>
            전투력 {scoreDiff >= 0 ? "+" : ""}{scoreDiff}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <CompareCard title="현재 장비" equipment={current} emptyText="비어 있음" />
          <CompareCard title="후보 장비" equipment={candidate} />
        </div>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          교체하면 현재 장비는 사라지지 않고 인벤토리로 돌아갑니다. 판매하면 {sellPrice}골드를 받습니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <button onClick={onCancel} className="h-11 border border-zinc-700 bg-zinc-900 text-sm hover:bg-zinc-800">취소</button>
          <button onClick={onStore} className="h-11 border border-sky-700/70 bg-sky-950/40 text-sm text-sky-100 hover:bg-sky-900/50">창고 보관</button>
          <button onClick={onSell} className="h-11 border border-rose-700/70 bg-rose-950/40 text-sm text-rose-100 hover:bg-rose-900/50">판매</button>
          <button onClick={onConfirm} className="h-11 bg-amber-500 text-sm font-semibold text-zinc-950 hover:bg-amber-300">교체 장착</button>
        </div>
      </div>
    </div>
  );
}

function ItemStorageConfirm({
  item,
  onCancel,
  onStore,
}: {
  item: InventoryItem;
  onCancel: () => void;
  onStore: () => void;
}) {
  const name = item.type === "equipment" ? item.equipment.name : item.name;
  const detail = item.type === "equipment" ? `${item.equipment.slot} · ${item.equipment.rarity}` : `수량 ${item.qty}`;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/68 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-zinc-700 bg-zinc-950 p-4 shadow-2xl shadow-black">
        <div className="mb-4 border-b border-zinc-800 pb-3">
          <p className="text-xs text-zinc-500">인벤토리 물품 선택</p>
          <h2 className="text-xl font-semibold">{name}</h2>
          <p className="mt-1 text-sm text-zinc-400">{detail}</p>
        </div>
        <p className="text-sm leading-6 text-zinc-400">이 물품을 창고에 보관할까요? 창고 슬롯을 1칸 사용합니다.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="h-11 border border-zinc-700 bg-zinc-900 text-sm hover:bg-zinc-800">취소</button>
          <button onClick={onStore} className="h-11 bg-sky-500 text-sm font-semibold text-zinc-950 hover:bg-sky-300">창고 보관</button>
        </div>
      </div>
    </div>
  );
}

function EnhanceModal({ onClose }: { onClose: () => void }) {
  const character = useGameStore((state) => state.character);
  const enhanceEquipment = useGameStore((state) => state.enhanceEquipment);
  const slots: EquipmentSlot[] = ["무기", "갑옷", "신발", "장갑", "귀걸이", "반지", "망토", "투구"];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/68 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl shadow-black">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <p className="text-xs text-zinc-500">강화소</p>
            <h2 className="text-xl font-semibold">강화할 장비 선택</h2>
          </div>
          <button onClick={onClose} className="h-9 border border-zinc-700 px-3 text-sm hover:bg-zinc-900">닫기</button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {slots.map((slot) => {
            const equipment = character?.equipment[slot];
            const cost = equipment ? 80 + equipment.enhance * 45 : 0;
            const chance = equipment ? (equipment.enhance < 10 ? 100 : Math.max(28, Math.round((0.86 - (equipment.enhance - 9) * 0.07) * 100))) : 0;
            const disabled = !equipment || equipment.enhance >= 20 || !character || character.gold < cost;
            return (
              <button
                key={slot}
                disabled={disabled}
                onClick={() => enhanceEquipment(slot)}
                className="min-h-24 border border-zinc-800 bg-zinc-900/55 p-3 text-left hover:border-amber-500/70 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{slot}</p>
                  {equipment && <span className="text-xs text-amber-200">+{equipment.enhance}</span>}
                </div>
                {equipment ? (
                  <>
                    <p className={`mt-1 text-sm ${rarityColor[equipment.rarity]}`}>{equipment.name}</p>
                    <p className="mt-2 text-xs text-zinc-400">비용 {cost}G · 성공률 {chance}% · 최대 +20</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">장착된 장비 없음</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PotionShopModal({ onClose }: { onClose: () => void }) {
  const buyPotion = useGameStore((state) => state.buyPotion);
  const potions = [
    { size: "small" as const, name: "소형 회복 물약", heal: 80, price: 40 },
    { size: "medium" as const, name: "중형 회복 물약", heal: 180, price: 95 },
    { size: "large" as const, name: "대형 회복 물약", heal: 420, price: 210 },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/68 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl shadow-black">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <p className="text-xs text-zinc-500">잡화점</p>
            <h2 className="text-xl font-semibold">회복 물약 구매</h2>
          </div>
          <button onClick={onClose} className="h-9 border border-zinc-700 px-3 text-sm hover:bg-zinc-900">닫기</button>
        </div>
        <div className="grid gap-2">
          {potions.map((potion) => (
            <button
              key={potion.size}
              onClick={() => buyPotion(potion.size)}
              className="border border-zinc-800 bg-zinc-900/55 p-3 text-left hover:border-rose-400/70"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-rose-100">{potion.name}</p>
                <span className="text-sm text-amber-200">{potion.price}G</span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">HP {potion.heal} 회복</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareCard({ title, equipment, emptyText }: { title: string; equipment?: Equipment; emptyText?: string }) {
  if (!equipment) {
    return (
      <div className="min-h-40 border border-zinc-800 bg-zinc-900/45 p-3">
        <p className="text-xs text-zinc-500">{title}</p>
        <p className="mt-3 text-zinc-400">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-40 border p-3 ${rarityColor[equipment.rarity]}`}>
      <p className="text-xs text-zinc-500">{title}</p>
      <h3 className="mt-1 font-semibold">{equipment.name} +{equipment.enhance}</h3>
      <p className="mt-1 text-xs text-zinc-400">
        {equipment.rarity} · 장비 Lv.{equipment.level} · 숙련 Lv.{equipment.masteryLevel ?? 1} · 점수 {Math.round(equipmentScore(equipment))}
      </p>
      <div className="mt-3 grid gap-1 text-xs text-zinc-300">
        {equipment.attack ? <p>공격력 +{equipment.attack}</p> : null}
        {equipment.defense ? <p>방어력 +{equipment.defense}</p> : null}
        <p>{equipment.options.join(" / ")}</p>
      </div>
    </div>
  );
}
