export type GameScreenState =
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'GAME_OVER'
  | 'VICTORY';

export type StageId =
  | 'training_camp'
  | 'ghost_town'
  | 'badlands'
  | 'train_heist'
  | 'sniper_hunt'
  | 'hunting_grounds'
  | 'boss_duel';

export type WeaponId =
  | 'revolver'
  | 'winchester'
  | 'sniper'
  | 'maxim'
  | 'shotgun'
  | 'dual_pistols'
  | 'bow';

export type Difficulty = 'normal' | 'hard' | 'legend';

export type AnimalSpeciesId =
  | 'rabbit'
  | 'coyote'
  | 'deer'
  | 'boar'
  | 'cougar'
  | 'bison'
  | 'grizzly';

export type AnimalTier = 'easy' | 'medium' | 'hard' | 'legendary';

export type HuntingBag = Record<AnimalSpeciesId, number>;

export type EnemyAlertState = 'UNAWARE' | 'SUSPICIOUS' | 'ALERTED';

export interface WeaponSpec {
  id: WeaponId;
  nameAr: string;
  subtitleAr: string;
  damage: number;
  fireInterval: number; // seconds between shots
  reloadDuration: number; // seconds
  magSize: number;
  projectileSpeed: number;
  spreadRad: number;
  penetration: number; // how many targets it can pierce
  recoilShake: number;
  hitstopSec: number;
  knockback: number;
  pellets?: number;
}

export type EnemyType =
  | 'bandit'
  | 'shotgunner'
  | 'sniper'
  | 'dynamiter'
  | 'train_guard'
  | 'outlaw_fugitive'
  | 'mini_boss'
  | 'boss_cuervo';

export interface Enemy {
  id: number;
  type: EnemyType;
  nameAr: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  angle: number;
  shootCooldown: number;
  windupTimer: number; // telegraph windup before shooting
  windupDuration: number;
  burstLeft: number;
  burstTimer: number;
  aimX: number;
  aimY: number;
  hitFlash: number;
  strafeDir: number;
  strafeTimer: number;
  dashCooldown: number;
  dashTimer: number;
  dashVx: number;
  dashVy: number;
  phase: number;
  bounty: number;
  hatColor: string;
  coatColor: string;
  isBoss: boolean;
  alertState: EnemyAlertState;
  alertTimer: number;
  investigateX: number;
  investigateY: number;
}

export type AllyRole = 'deputy' | 'rifleman' | 'brawler' | 'sharpshooter';

export interface AllyEntity {
  id: number;
  role: AllyRole;
  nameAr: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  angle: number;
  shootCooldown: number;
  hitFlash: number;
  walkCycle: number;
  coatColor: string;
  hatColor: string;
  speed: number;
  damage: number;
  range: number;
}

export interface AnimalEntity {
  id: number;
  species: AnimalSpeciesId;
  nameAr: string;
  lootNameAr: string;
  tier: AnimalTier;
  tierLabelAr: string;
  behavior: 'flee' | 'predator' | 'charger';
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  fleeSpeed: number;
  chargeDamage: number;
  angle: number;
  hitFlash: number;
  state: 'CALM' | 'STARTLED' | 'AGGRO';
  stateTimer: number;
  wanderTimer: number;
  attackCooldown: number;
  sellPrice: number;
}

export type ObstacleType =
  | 'saloon_wall'
  | 'crate'
  | 'barrel_tnt'
  | 'rock'
  | 'cactus'
  | 'wreck_coach'
  | 'train_wall'
  | 'safe_vault'
  | 'brake_lever'
  | 'target_dummy';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  w: number;
  h: number;
  destructible: boolean;
  hp: number;
  maxHp: number;
  hitFlash: number;
  blocksBullets: boolean;
  labelAr?: string;
  triggered?: boolean;
}

export interface Projectile {
  id: number;
  fromPlayer: boolean;
  weaponId: WeaponId | 'enemy_pistol' | 'enemy_shotgun' | 'enemy_rifle';
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  life: number;
  penetrationLeft: number;
  hitIds: Set<number>;
  knockback: number;
  color: string;
}

export interface DynamiteStick {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  flightProgress: number; // 0 -> 1
  fuseTimer: number;
  maxFuse: number;
  blastRadius: number;
  damage: number;
  fromPlayer?: boolean;
}

export type PickupType = 'health' | 'ammo' | 'deadeye' | 'gold';

export interface Pickup {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  radius: number;
  life: number;
  bobPhase: number;
  value: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  drag: number;
  kind: 'dust' | 'spark' | 'smoke' | 'blood' | 'casing' | 'wood' | 'ember';
  rotation: number;
  vRot: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface Tumbleweed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rot: number;
}

export type QuickDrawPhase = 'NONE' | 'WAIT' | 'DRAW_NOW' | 'RESOLVED';

export interface StageMeta {
  id: StageId;
  order: number;
  titleAr: string;
  locationAr: string;
  descriptionAr: string;
  objectiveAr: string;
  accentColor: string;
}

export interface StageStats {
  bountyEarned: number;
  kills: number;
  stealthKills: number;
  shotsFired: number;
  shotsHit: number;
  maxCombo: number;
  timeSeconds: number;
  goldLooted: number;
}

export interface LegendsRecord {
  totalOutlawsDefeated: number;
  totalStealthSniperKills: number;
  totalAnimalsHunted: number;
  rareAnimalsHunted: number;
  legendaryAnimalsHunted: number;
  fastestBossDuelSeconds: number | null;
  fastestSniperHuntSeconds: number | null;
  bestCombo: number;
  highestSingleStageBounty: number;
  totalBountyEarnedLifetime: number;
  stagesCompleted: StageId[];
  bossDefeatedCount: number;
}

export interface PlayerLoadout {
  revolverDamageLevel: number; // 0..3
  revolverReloadLevel: number; // 0..3
  revolverAccuracyLevel: number; // 0..3
  winchesterDamageLevel: number; // 0..3
  winchesterReloadLevel: number; // 0..3
  winchesterAccuracyLevel: number; // 0..3
  sniperDamageLevel: number; // 0..3
  sniperReloadLevel: number; // 0..3
  sniperScopeLevel: number; // 0..3 (penetration & bullet speed & sight range)
  maximDamageLevel: number; // 0..3
  maximFireRateLevel: number; // 0..3
  maximReloadLevel: number; // 0..3
  shotgunDamageLevel: number; // 0..3
  shotgunReloadLevel: number; // 0..3
  shotgunChokeLevel: number; // 0..3
  dualDamageLevel: number; // 0..3
  dualFireRateLevel: number; // 0..3
  dualReloadLevel: number; // 0..3
  bowDamageLevel: number; // 0..3
  bowDrawLevel: number; // 0..3
  bowVelocityLevel: number; // 0..3
  posseCountLevel: number; // 0..3 (1 -> 2 -> 3 -> 4 allied riders)
  posseGearLevel: number; // 0..3 (allies max HP & movement speed)
  posseWeaponLevel: number; // 0..3 (allies damage & fire cadence)
  dynamiteDamageLevel: number; // 0..3
  healthLevel: number; // 0..3 (maxHp: 100, 135, 170, 205)
  vitalityRegenLevel: number; // 0..3 (tonic potency, wave heal, combat regen)
  vestLevel: number; // 0..3 (armor: 0, 45, 90, 135)
  bootsLevel: number; // 0..3 (speed & dodge cooldown)
  watchLevel: number; // 0..3 (deadeye efficiency & regen)
  bandolierLevel: number; // 0..3 (reserve ammo capacity)
  tonicsCount: number; // 0..3 field healing tonics usable with E
  dynamiteCount: number; // 0..6 throwable dynamite sticks usable with G
}

export interface HudSnapshot {
  stageId: StageId;
  stageTitleAr: string;
  objectiveAr: string;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  tonicsCount: number;
  dynamiteCount: number;
  maxDynamite: number;
  walkMode: boolean;
  deadeye: number; // 0..100
  deadeyeActive: boolean;
  dodgeCooldownPct: number; // 0..1 (1 = ready)
  activeWeapon: WeaponId;
  scopeOpen: boolean;
  scopeZoom: number;
  revolverAmmo: number;
  revolverMag: number;
  revolverReserve: number;
  revolverCylinderAngle: number;
  winchesterAmmo: number;
  winchesterMag: number;
  winchesterReserve: number;
  sniperAmmo: number;
  sniperMag: number;
  sniperReserve: number;
  maximAmmo: number;
  maximMag: number;
  maximReserve: number;
  shotgunAmmo: number;
  shotgunMag: number;
  shotgunReserve: number;
  dualAmmo: number;
  dualMag: number;
  dualReserve: number;
  bowAmmo: number;
  bowMag: number;
  bowReserve: number;
  isReloading: boolean;
  reloadProgress: number; // 0..1
  activeReloadAvailable: boolean;
  activeReloadBuffTimer: number;
  bounty: number;
  combo: number;
  comboTimerPct: number;
  waveIndex: number;
  totalWaves: number;
  enemiesAlive: number;
  animalsAlive: number;
  stealthAlertCount: number;
  alliesAlive: number;
  alliesTotal: number;
  posseHold: boolean;
  bossNameAr: string | null;
  bossHp: number;
  bossMaxHp: number;
  quickDrawPhase: QuickDrawPhase;
  quickDrawBannerAr: string | null;
  trainProgressPct: number | null;
  bannerMessageAr: string | null;
}
