import {
  AnimalSpeciesId,
  Difficulty,
  EnemyType,
  Obstacle,
  StageId,
  StageMeta,
  WeaponId,
  WeaponSpec,
} from './types';

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  revolver: {
    id: 'revolver',
    nameAr: 'مسدس دوّار .45',
    subtitleAr: 'سحب سريع · 6 طلقات',
    damage: 34,
    fireInterval: 0.19,
    reloadDuration: 1.25,
    magSize: 6,
    projectileSpeed: 980,
    spreadRad: 0.032,
    penetration: 1,
    recoilShake: 5.5,
    hitstopSec: 0.025,
    knockback: 180,
  },
  winchester: {
    id: 'winchester',
    nameAr: 'بندقية وينشستر 1873',
    subtitleAr: 'دقة خارقة · 10 طلقات',
    damage: 78,
    fireInterval: 0.46,
    reloadDuration: 1.75,
    magSize: 10,
    projectileSpeed: 1520,
    spreadRad: 0.008,
    penetration: 2,
    recoilShake: 9.5,
    hitstopSec: 0.048,
    knockback: 340,
  },
  sniper: {
    id: 'sniper',
    nameAr: 'بندقية قناص شاربس 1874',
    subtitleAr: 'اختراق 3 أهداف · 5 طلقات',
    damage: 145,
    fireInterval: 0.92,
    reloadDuration: 2.05,
    magSize: 5,
    projectileSpeed: 2250,
    spreadRad: 0.001,
    penetration: 3,
    recoilShake: 13.5,
    hitstopSec: 0.068,
    knockback: 460,
  },
  maxim: {
    id: 'maxim',
    nameAr: 'ساقية مكسيم',
    subtitleAr: 'نيران سريعة متواصلة · 40 طلقة',
    damage: 25,
    fireInterval: 0.085,
    reloadDuration: 2.3,
    magSize: 40,
    projectileSpeed: 1220,
    spreadRad: 0.072,
    penetration: 1,
    recoilShake: 4.2,
    hitstopSec: 0.012,
    knockback: 130,
  },
  shotgun: {
    id: 'shotgun',
    nameAr: 'بندقية الخرطوش المزدوجة',
    subtitleAr: '7 شظايا مدمّرة · طلقان',
    damage: 24,
    fireInterval: 0.42,
    reloadDuration: 1.5,
    magSize: 2,
    projectileSpeed: 1080,
    spreadRad: 0.28,
    penetration: 1,
    recoilShake: 12.5,
    hitstopSec: 0.045,
    knockback: 380,
    pellets: 7,
  },
  dual_pistols: {
    id: 'dual_pistols',
    nameAr: 'مسدسا الكولت التوأم',
    subtitleAr: 'إطلاق متناوب سريع · 12 طلقة',
    damage: 29,
    fireInterval: 0.115,
    reloadDuration: 1.75,
    magSize: 12,
    projectileSpeed: 1040,
    spreadRad: 0.048,
    penetration: 1,
    recoilShake: 4.8,
    hitstopSec: 0.02,
    knockback: 160,
  },
  bow: {
    id: 'bow',
    nameAr: 'قوس الصياد الصامت',
    subtitleAr: 'سهام صامتة خارقة · 8 سهام',
    damage: 112,
    fireInterval: 0.48,
    reloadDuration: 1.15,
    magSize: 8,
    projectileSpeed: 1380,
    spreadRad: 0.005,
    penetration: 2,
    recoilShake: 2.5,
    hitstopSec: 0.036,
    knockback: 220,
  },
};

export const STAGES: StageMeta[] = [
  {
    id: 'training_camp',
    order: 1,
    titleAr: 'ميدان التدريب',
    locationAr: 'معسكر فورت ريد روك',
    descriptionAr:
      'ساحة رماية مفتوحة للتدرّب على المسدس، وينشستر، القناص، ساقية مكسيم، الديناميت وعين الصقر مع ذخيرة متجددة.',
    objectiveAr: 'حطّم الأهداف الخشبية واهزم موجات التدريب',
    accentColor: '#34D399',
  },
  {
    id: 'ghost_town',
    order: 2,
    titleAr: 'البلدة المهجورة',
    locationAr: 'ريد روك · شارع الصالون',
    descriptionAr:
      'تطهير بلدة ريد روك المهجورة من عصابة الأفاعي وبارونها كولين ذو اليد الحديدية.',
    objectiveAr: 'اقضِ على جميع قطاع الطرق والزعيم الفرعي',
    accentColor: '#D99B26',
  },
  {
    id: 'badlands',
    order: 3,
    titleAr: 'الوادي القاحل',
    locationAr: 'وادي العقارب الأحمر',
    descriptionAr:
      'كمين صحراوي وسط الصخور الحارقة والقناصة المتمركزين ورمـاة الديناميت.',
    objectiveAr: 'اخترق كمائن القناصة ودمّر تعزيزات العصابة',
    accentColor: '#C2592B',
  },
  {
    id: 'train_heist',
    order: 4,
    titleAr: 'سرقة القطار السريع',
    locationAr: 'قطار الذهب البخاري',
    descriptionAr:
      'تقدّم عبر عربات القطار المندفع، فجّر خزنة الذهب، وأوقف القاطرة البخارية.',
    objectiveAr: 'افتح خزنة الذهب وسيطر على القاطرة',
    accentColor: '#E0A43B',
  },
  {
    id: 'sniper_hunt',
    order: 5,
    titleAr: 'قنص العصابة الخفي',
    locationAr: 'أخاديد الصقر البعيدة',
    descriptionAr:
      'تسلّل بعيداً عن أعين الخارجين عن القانون وعصابتهم، افتح المنظار (Z / كليك يمين) وقرّب أو بعّد العدسة لاصطيادهم خفية.',
    objectiveAr: 'اقنص الخارجين عن القانون دون أن يكشفوك',
    accentColor: '#06B6D4',
  },
  {
    id: 'hunting_grounds',
    order: 6,
    titleAr: 'سهول الصيد البرية',
    locationAr: 'وادي الغزلان والغابة الحمراء',
    descriptionAr:
      'اصطد حيوانات البراري المتنوعة حسب صعوبتها (أرانب، ذئاب قيوط، أيائل، خنازير، كوجر، بيسون، ودببة) وبِع غنائمك في متجر الصيد.',
    objectiveAr: 'اصطد الطرائد والوحوش واجمع غنائم البيع',
    accentColor: '#10B981',
  },
  {
    id: 'boss_duel',
    order: 7,
    titleAr: 'نزال الغروب الفردي',
    locationAr: 'ساحة المارشال الأسود',
    descriptionAr:
      'مواجهة فردية حاسمة عند الغروب ضد الأسطورة «إل كويرفو» بنظام السحب السريع.',
    objectiveAr: 'اهزم «إل كويرفو» في نزال فردي',
    accentColor: '#DC2626',
  },
];

export interface WaveDef {
  bannerAr: string;
  enemies: Array<{ type: EnemyType; count: number; x?: number; y?: number }>;
  animals?: Array<{ species: AnimalSpeciesId; count: number; x?: number; y?: number }>;
}

export interface StageBlueprint {
  id: StageId;
  worldWidth: number;
  worldHeight: number;
  playerStart: { x: number; y: number };
  obstacles: Obstacle[];
  spawnPoints: Array<{ x: number; y: number }>;
  waves: WaveDef[];
  theme: {
    groundBase: string;
    groundAccent: string;
    dustColor: string;
    ambientTint: string;
  };
}

let nextObsId = 1;
function obs(
  type: Obstacle['type'],
  x: number,
  y: number,
  w: number,
  h: number,
  options: Partial<Obstacle> = {}
): Obstacle {
  const defaults: Record<
    Obstacle['type'],
    { destructible: boolean; hp: number; blocksBullets: boolean }
  > = {
    saloon_wall: { destructible: false, hp: 9999, blocksBullets: true },
    crate: { destructible: true, hp: 85, blocksBullets: true },
    barrel_tnt: { destructible: true, hp: 35, blocksBullets: true },
    rock: { destructible: false, hp: 9999, blocksBullets: true },
    cactus: { destructible: true, hp: 45, blocksBullets: false },
    wreck_coach: { destructible: false, hp: 9999, blocksBullets: true },
    train_wall: { destructible: false, hp: 9999, blocksBullets: true },
    safe_vault: { destructible: true, hp: 220, blocksBullets: true },
    brake_lever: { destructible: true, hp: 90, blocksBullets: true },
    target_dummy: { destructible: true, hp: 55, blocksBullets: true },
  };
  const d = defaults[type];
  return {
    id: nextObsId++,
    type,
    x,
    y,
    w,
    h,
    destructible: options.destructible ?? d.destructible,
    hp: options.hp ?? d.hp,
    maxHp: options.hp ?? d.hp,
    hitFlash: 0,
    blocksBullets: options.blocksBullets ?? d.blocksBullets,
    labelAr: options.labelAr,
    triggered: false,
  };
}

export function getDifficultyMultipliers(diff: Difficulty) {
  if (diff === 'hard') {
    return { enemyHp: 1.25, enemyDmg: 1.25, enemyFireRate: 1.15, bounty: 1.25 };
  }
  if (diff === 'legend') {
    return { enemyHp: 1.5, enemyDmg: 1.55, enemyFireRate: 1.35, bounty: 1.6 };
  }
  return { enemyHp: 1, enemyDmg: 1, enemyFireRate: 1, bounty: 1 };
}

export function buildStageBlueprint(stageId: StageId): StageBlueprint {
  nextObsId = 1;

  if (stageId === 'training_camp') {
    return {
      id: 'training_camp',
      worldWidth: 1520,
      worldHeight: 920,
      playerStart: { x: 220, y: 460 },
      theme: {
        groundBase: '#B48453',
        groundAccent: '#9B6C3E',
        dustColor: 'rgba(245, 208, 152, 0.28)',
        ambientTint: 'rgba(251, 191, 36, 0.04)',
      },
      obstacles: [
        // Range wooden barriers & cover crates
        obs('saloon_wall', 110, 100, 300, 72, { labelAr: 'منصة الأسلحة' }),
        obs('crate', 390, 340, 56, 56),
        obs('crate', 390, 520, 56, 56),
        obs('crate', 640, 250, 56, 56),
        obs('crate', 640, 620, 56, 56),
        // Practice TNT barrels
        obs('barrel_tnt', 790, 440, 42, 42, { labelAr: 'TNT' }),
        obs('barrel_tnt', 1080, 290, 42, 42, { labelAr: 'TNT' }),
        obs('barrel_tnt', 1080, 590, 42, 42, { labelAr: 'TNT' }),
        // Bullseye shooting targets downrange
        obs('target_dummy', 860, 220, 46, 46, { labelAr: 'هدف 1' }),
        obs('target_dummy', 960, 440, 46, 46, { labelAr: 'هدف 2' }),
        obs('target_dummy', 860, 680, 46, 46, { labelAr: 'هدف 3' }),
        obs('target_dummy', 1240, 330, 46, 46, { labelAr: 'هدف بعيد' }),
        obs('target_dummy', 1240, 560, 46, 46, { labelAr: 'هدف بعيد' }),
        obs('rock', 1320, 170, 82, 76),
        obs('rock', 1320, 690, 82, 76),
      ],
      spawnPoints: [
        { x: 1180, y: 220 },
        { x: 1340, y: 460 },
        { x: 1180, y: 710 },
        { x: 960, y: 170 },
        { x: 960, y: 750 },
      ],
      waves: [
        {
          bannerAr: 'التدريب 1 · جرّب المسدس (1) ووينشستر (2) على الكشافة',
          enemies: [{ type: 'bandit', count: 3 }],
        },
        {
          bannerAr: 'التدريب 2 · اختبر القناص (3) وساقية مكسيم (4) والديناميت (G)',
          enemies: [
            { type: 'bandit', count: 3 },
            { type: 'shotgunner', count: 1 },
          ],
        },
        {
          bannerAr: 'التدريب النهائي · تصفية ميدان الرماية بالكامل!',
          enemies: [
            { type: 'bandit', count: 3 },
            { type: 'outlaw_fugitive', count: 2 },
          ],
        },
      ],
    };
  }

  if (stageId === 'ghost_town') {
    return {
      id: 'ghost_town',
      worldWidth: 1640,
      worldHeight: 1080,
      playerStart: { x: 240, y: 540 },
      theme: {
        groundBase: '#9E7348',
        groundAccent: '#865E38',
        dustColor: 'rgba(235, 195, 138, 0.28)',
        ambientTint: 'rgba(255, 178, 84, 0.06)',
      },
      obstacles: [
        // Top saloon building wall
        obs('saloon_wall', 260, 110, 380, 110, { labelAr: 'الصالون المهجور' }),
        obs('saloon_wall', 920, 110, 360, 110, { labelAr: 'مكتب الشريف' }),
        // Bottom weathered facades
        obs('saloon_wall', 340, 860, 340, 110, { labelAr: 'الإسطبل' }),
        obs('saloon_wall', 980, 860, 340, 110, { labelAr: 'متجر السلاح' }),
        // Street crates & TNT barrels
        obs('crate', 480, 390, 56, 56),
        obs('crate', 540, 390, 56, 56),
        obs('barrel_tnt', 610, 415, 42, 42, { labelAr: 'TNT' }),
        obs('crate', 470, 650, 56, 56),
        obs('barrel_tnt', 780, 300, 42, 42, { labelAr: 'TNT' }),
        obs('crate', 790, 510, 64, 64),
        obs('crate', 860, 510, 64, 64),
        obs('barrel_tnt', 830, 720, 42, 42, { labelAr: 'TNT' }),
        obs('crate', 1120, 400, 58, 58),
        obs('crate', 1120, 640, 58, 58),
        obs('barrel_tnt', 1240, 520, 42, 42, { labelAr: 'TNT' }),
        // Town well / stone fountain center-left
        obs('rock', 360, 515, 58, 58),
      ],
      spawnPoints: [
        { x: 1460, y: 260 },
        { x: 1480, y: 540 },
        { x: 1460, y: 810 },
        { x: 780, y: 160 },
        { x: 820, y: 920 },
        { x: 1180, y: 270 },
      ],
      waves: [
        {
          bannerAr: 'الموجة 1 · قطاع طرق شارع الصالون',
          enemies: [
            { type: 'bandit', count: 4 },
            { type: 'shotgunner', count: 1 },
          ],
        },
        {
          bannerAr: 'الموجة 2 · كمين من الأسطح والأزقة',
          enemies: [
            { type: 'bandit', count: 4 },
            { type: 'shotgunner', count: 2 },
            { type: 'dynamiter', count: 1 },
          ],
        },
        {
          bannerAr: 'الموجة النهائية · كولين ذو اليد الحديدية!',
          enemies: [
            { type: 'mini_boss', count: 1 },
            { type: 'bandit', count: 3 },
            { type: 'shotgunner', count: 2 },
          ],
        },
      ],
    };
  }

  if (stageId === 'badlands') {
    return {
      id: 'badlands',
      worldWidth: 1800,
      worldHeight: 1160,
      playerStart: { x: 220, y: 580 },
      theme: {
        groundBase: '#B5633B',
        groundAccent: '#9A4D2A',
        dustColor: 'rgba(240, 170, 110, 0.35)',
        ambientTint: 'rgba(220, 95, 35, 0.08)',
      },
      obstacles: [
        // Canyon mesas & boulders
        obs('rock', 420, 210, 120, 95),
        obs('rock', 440, 820, 130, 100),
        obs('wreck_coach', 680, 520, 130, 74, { labelAr: 'عربة محطمة' }),
        obs('barrel_tnt', 640, 440, 42, 42, { labelAr: 'TNT' }),
        obs('rock', 920, 260, 110, 90),
        obs('rock', 960, 790, 120, 90),
        obs('crate', 1050, 540, 58, 58),
        obs('barrel_tnt', 1120, 545, 42, 42, { labelAr: 'TNT' }),
        obs('rock', 1320, 350, 115, 95),
        obs('rock', 1340, 740, 115, 95),
        obs('barrel_tnt', 1420, 550, 42, 42, { labelAr: 'TNT' }),
        // Saguaro cacti
        obs('cactus', 330, 410, 36, 36),
        obs('cactus', 570, 710, 36, 36),
        obs('cactus', 820, 180, 36, 36),
        obs('cactus', 1190, 290, 36, 36),
        obs('cactus', 1210, 890, 36, 36),
        obs('cactus', 1560, 470, 36, 36),
      ],
      spawnPoints: [
        { x: 1620, y: 240 },
        { x: 1650, y: 580 },
        { x: 1620, y: 920 },
        { x: 1240, y: 150 },
        { x: 1240, y: 1010 },
        { x: 900, y: 140 },
      ],
      waves: [
        {
          bannerAr: 'الموجة 1 · قناصة وادي العقارب',
          enemies: [
            { type: 'bandit', count: 3 },
            { type: 'sniper', count: 2 },
          ],
        },
        {
          bannerAr: 'الموجة 2 · رماة الديناميت والمقتحمون',
          enemies: [
            { type: 'shotgunner', count: 2 },
            { type: 'dynamiter', count: 2 },
            { type: 'sniper', count: 2 },
          ],
        },
        {
          bannerAr: 'الموجة 3 · الطوق الصحراوي الكامل',
          enemies: [
            { type: 'bandit', count: 3 },
            { type: 'shotgunner', count: 2 },
            { type: 'sniper', count: 3 },
            { type: 'dynamiter', count: 2 },
          ],
        },
      ],
    };
  }

  if (stageId === 'train_heist') {
    // 4 connected train cars horizontally from x=120 to x=2280, y=260..540
    // Car 1: 120..580 | Coupling: 580..640
    // Car 2: 640..1120 | Coupling: 1120..1180
    // Car 3 (Vault Car): 1180..1700 | Coupling: 1700..1760
    // Car 4 (Locomotive): 1760..2320
    const topWallY = 248;
    const botWallY = 532;
    const wallH = 22;

    const obstacles: Obstacle[] = [];

    // Helper for car side walls with doorway gaps at couplings
    const addCarWalls = (x1: number, x2: number, hasEndLeft: boolean, hasEndRight: boolean) => {
      obstacles.push(obs('train_wall', x1, topWallY, x2 - x1, wallH));
      obstacles.push(obs('train_wall', x1, botWallY, x2 - x1, wallH));
      if (hasEndLeft) {
        obstacles.push(obs('train_wall', x1, topWallY, 20, 96));
        obstacles.push(obs('train_wall', x1, 456, 20, 98));
      }
      if (hasEndRight) {
        obstacles.push(obs('train_wall', x2 - 20, topWallY, 20, 96));
        obstacles.push(obs('train_wall', x2 - 20, 456, 20, 98));
      }
    };

    // Car 1: Flatbed / Caboose
    addCarWalls(110, 580, true, true);
    obstacles.push(obs('crate', 310, 310, 48, 48));
    obstacles.push(obs('crate', 310, 440, 48, 48));
    obstacles.push(obs('barrel_tnt', 450, 378, 38, 38, { labelAr: 'TNT' }));

    // Car 2: Passenger / Supply Car
    addCarWalls(640, 1120, true, true);
    obstacles.push(obs('crate', 760, 295, 52, 52));
    obstacles.push(obs('crate', 760, 455, 52, 52));
    obstacles.push(obs('crate', 940, 374, 52, 52));
    obstacles.push(obs('barrel_tnt', 1025, 305, 38, 38, { labelAr: 'TNT' }));

    // Car 3: Armored Gold Vault Car
    addCarWalls(1180, 1700, true, true);
    obstacles.push(obs('crate', 1290, 300, 52, 52));
    obstacles.push(obs('crate', 1290, 450, 52, 52));
    obstacles.push(
      obs('safe_vault', 1435, 355, 76, 90, {
        labelAr: 'خزنة الذهب',
        hp: 240,
      })
    );
    obstacles.push(obs('barrel_tnt', 1565, 305, 38, 38, { labelAr: 'TNT' }));

    // Car 4: Locomotive Engine
    addCarWalls(1760, 2300, true, true);
    obstacles.push(obs('crate', 1880, 310, 50, 50));
    obstacles.push(obs('crate', 1880, 445, 50, 50));
    obstacles.push(
      obs('brake_lever', 2170, 365, 64, 70, {
        labelAr: 'كابح القاطرة',
        hp: 120,
      })
    );

    return {
      id: 'train_heist',
      worldWidth: 2460,
      worldHeight: 800,
      playerStart: { x: 205, y: 400 },
      theme: {
        groundBase: '#A67346',
        groundAccent: '#8C5B32',
        dustColor: 'rgba(255, 224, 170, 0.35)',
        ambientTint: 'rgba(255, 195, 110, 0.05)',
      },
      obstacles,
      spawnPoints: [
        { x: 480, y: 340 },
        { x: 860, y: 400 },
        { x: 1020, y: 460 },
        { x: 1370, y: 340 },
        { x: 1580, y: 460 },
        { x: 1980, y: 400 },
        { x: 2100, y: 340 },
      ],
      waves: [
        // Train spawns enemies by car progression dynamically in engine,
        // plus wave summary metadata for HUD
        {
          bannerAr: 'العربة 1 و 2 · حرس القطار',
          enemies: [
            { type: 'train_guard', count: 4 },
            { type: 'shotgunner', count: 1 },
          ],
        },
        {
          bannerAr: 'العربة 3 · حطّم خزنة الذهب!',
          enemies: [
            { type: 'train_guard', count: 3 },
            { type: 'dynamiter', count: 1 },
          ],
        },
        {
          bannerAr: 'القاطرة البخارية · حارس القاطرة والكابح!',
          enemies: [
            { type: 'mini_boss', count: 1 },
            { type: 'train_guard', count: 2 },
          ],
        },
      ],
    };
  }

  if (stageId === 'sniper_hunt') {
    return {
      id: 'sniper_hunt',
      worldWidth: 2600,
      worldHeight: 1360,
      playerStart: { x: 160, y: 680 },
      theme: {
        groundBase: '#B87442',
        groundAccent: '#9A5A2F',
        dustColor: 'rgba(240, 175, 120, 0.34)',
        ambientTint: 'rgba(14, 116, 144, 0.04)',
      },
      obstacles: [
        // Player sniper ridge cover on the western ridge
        obs('rock', 260, 560, 74, 68),
        obs('crate', 270, 720, 54, 54),
        obs('cactus', 410, 420, 36, 36),
        obs('cactus', 430, 920, 36, 36),

        // Camp 1 (North-Center Watchtower Outpost)
        obs('saloon_wall', 920, 160, 250, 96, { labelAr: 'برج المراقبة' }),
        obs('crate', 1020, 330, 56, 56),
        obs('barrel_tnt', 1105, 315, 42, 42, { labelAr: 'TNT' }),
        obs('rock', 800, 380, 96, 80),

        // Camp 2 (Center Canyon Crossroad)
        obs('rock', 1240, 620, 115, 92),
        obs('crate', 1400, 600, 56, 56),
        obs('barrel_tnt', 1480, 635, 42, 42, { labelAr: 'TNT' }),
        obs('cactus', 1120, 790, 36, 36),

        // Camp 3 (South Smuggler Camp)
        obs('saloon_wall', 1020, 1080, 260, 96, { labelAr: 'مخبأ المهربين' }),
        obs('crate', 1180, 950, 56, 56),
        obs('barrel_tnt', 1270, 975, 42, 42, { labelAr: 'TNT' }),
        obs('rock', 1520, 1020, 110, 88),

        // Camp 4 (East Gang Fortress & Leader Overlook)
        obs('wreck_coach', 1880, 520, 130, 74, { labelAr: 'عربة الغنائم' }),
        obs('saloon_wall', 2060, 210, 280, 96, { labelAr: 'معسكر العصابة' }),
        obs('rock', 1820, 280, 105, 86),
        obs('rock', 1850, 880, 120, 95),
        obs('crate', 2050, 660, 58, 58),
        obs('barrel_tnt', 2130, 645, 42, 42, { labelAr: 'TNT' }),
        obs('barrel_tnt', 2160, 410, 42, 42, { labelAr: 'TNT' }),
        obs('cactus', 2380, 460, 36, 36),
        obs('cactus', 2360, 920, 36, 36),
      ],
      spawnPoints: [
        { x: 1050, y: 390 },
        { x: 1460, y: 710 },
        { x: 1220, y: 980 },
        { x: 2150, y: 690 },
      ],
      // Single seamless canyon sniping operation (NO wave pop-ins; entire gang is unaware across camps)
      waves: [
        {
          bannerAr: 'أفراد العصابة غافلون · افتح المنظار (Z / كليك يمين) واقنصهم خفية',
          enemies: [
            // North Lookout Cluster
            { type: 'sniper', count: 1, x: 980, y: 310 },
            { type: 'outlaw_fugitive', count: 1, x: 1120, y: 370 },
            { type: 'bandit', count: 1, x: 1180, y: 295 },
            // Center Crossroad Cluster
            { type: 'outlaw_fugitive', count: 1, x: 1420, y: 685 },
            { type: 'bandit', count: 1, x: 1520, y: 580 },
            { type: 'sniper', count: 1, x: 1575, y: 740 },
            // South Smuggler Camp Cluster
            { type: 'outlaw_fugitive', count: 1, x: 1130, y: 990 },
            { type: 'dynamiter', count: 1, x: 1320, y: 1020 },
            { type: 'bandit', count: 1, x: 1420, y: 940 },
            // East Gang Fortress & Leader
            { type: 'outlaw_fugitive', count: 1, x: 1990, y: 420 },
            { type: 'sniper', count: 1, x: 2210, y: 365 },
            { type: 'dynamiter', count: 1, x: 2040, y: 760 },
            { type: 'bandit', count: 1, x: 2230, y: 760 },
            { type: 'mini_boss', count: 1, x: 2330, y: 630 },
          ],
        },
      ],
    };
  }

  if (stageId === 'hunting_grounds') {
    return {
      id: 'hunting_grounds',
      worldWidth: 2320,
      worldHeight: 1320,
      playerStart: { x: 210, y: 660 },
      theme: {
        groundBase: '#9D7B48',
        groundAccent: '#7C6234',
        dustColor: 'rgba(218, 195, 145, 0.25)',
        ambientTint: 'rgba(16, 185, 129, 0.05)',
      },
      obstacles: [
        obs('saloon_wall', 140, 140, 240, 88, { labelAr: 'كوخ الصيادين' }),
        obs('crate', 340, 560, 52, 52),
        obs('crate', 340, 730, 52, 52),
        obs('rock', 640, 260, 110, 88),
        obs('rock', 680, 920, 115, 92),
        obs('cactus', 520, 440, 36, 36),
        obs('cactus', 540, 790, 36, 36),
        obs('rock', 1120, 560, 120, 96),
        obs('barrel_tnt', 1020, 430, 42, 42, { labelAr: 'TNT' }),
        obs('cactus', 940, 230, 36, 36),
        obs('cactus', 980, 1040, 36, 36),
        obs('rock', 1520, 290, 125, 95),
        obs('rock', 1540, 940, 125, 95),
        obs('cactus', 1760, 520, 36, 36),
        obs('cactus', 1780, 770, 36, 36),
        obs('rock', 1960, 610, 110, 95),
      ],
      spawnPoints: [
        { x: 900, y: 310 },
        { x: 1180, y: 890 },
        { x: 1580, y: 540 },
        { x: 1960, y: 320 },
        { x: 1980, y: 980 },
      ],
      waves: [
        {
          bannerAr: 'السهل الغربي (صعوبة: سهل - متوسط) · أرانب وقيوط وأيائل برية',
          enemies: [],
          animals: [
            { species: 'rabbit', count: 3, x: 780, y: 420 },
            { species: 'coyote', count: 3, x: 1140, y: 340 },
            { species: 'deer', count: 3, x: 1460, y: 740 },
          ],
        },
        {
          bannerAr: 'الأحراش الوعرة (صعوبة: متوسط - صعب) · خنازير برية وكوجر مفترس',
          enemies: [],
          animals: [
            { species: 'deer', count: 2, x: 1180, y: 360 },
            { species: 'boar', count: 3, x: 1420, y: 660 },
            { species: 'cougar', count: 2, x: 1840, y: 460 },
            { species: 'rabbit', count: 2, x: 960, y: 960 },
          ],
        },
        {
          bannerAr: 'وادي الوحوش الأسطورية (صعوبة: أسطوري) · ثيران البيسون والدب الرمادي!',
          enemies: [],
          animals: [
            { species: 'bison', count: 2, x: 1720, y: 580 },
            { species: 'grizzly', count: 1, x: 2040, y: 760 },
            { species: 'cougar', count: 2, x: 1560, y: 340 },
            { species: 'boar', count: 2, x: 1380, y: 960 },
          ],
        },
      ],
    };
  }

  // Stage 7: boss_duel (High Noon / Sunset 1v1 Boss Showdown)
  return {
    id: 'boss_duel',
    worldWidth: 1380,
    worldHeight: 880,
    playerStart: { x: 260, y: 440 },
    theme: {
      groundBase: '#A66A38',
      groundAccent: '#8C5429',
      dustColor: 'rgba(255, 160, 110, 0.32)',
      ambientTint: 'rgba(185, 28, 28, 0.07)',
    },
    obstacles: [
      obs('saloon_wall', 470, 90, 440, 86, { labelAr: 'ساحة النزال' }),
      obs('crate', 450, 260, 56, 56),
      obs('crate', 450, 564, 56, 56),
      obs('rock', 670, 210, 74, 74),
      obs('rock', 670, 596, 74, 74),
      obs('barrel_tnt', 690, 420, 42, 42, { labelAr: 'TNT' }),
      obs('crate', 890, 270, 56, 56),
      obs('crate', 890, 554, 56, 56),
    ],
    spawnPoints: [
      { x: 1080, y: 440 },
      { x: 1180, y: 200 },
      { x: 1180, y: 680 },
    ],
    waves: [
      {
        bannerAr: 'النزال الفردي · إل كويرفو — المارشال الأسود',
        enemies: [{ type: 'boss_cuervo', count: 1 }],
      },
    ],
  };
}
