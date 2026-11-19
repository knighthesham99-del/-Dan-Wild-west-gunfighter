import { ANIMAL_SPECIES } from './animals';
import { WesternAudioEngine } from './audio';
import {
  buildStageBlueprint,
  getDifficultyMultipliers,
  STAGES,
  StageBlueprint,
  WEAPONS,
} from './stages';
import {
  AllyEntity,
  AllyRole,
  AnimalEntity,
  AnimalSpeciesId,
  Difficulty,
  DynamiteStick,
  Enemy,
  EnemyAlertState,
  EnemyType,
  FloatingText,
  HudSnapshot,
  Obstacle,
  Particle,
  Pickup,
  PlayerLoadout,
  Projectile,
  QuickDrawPhase,
  StageId,
  StageStats,
  Tumbleweed,
  WeaponId,
} from './types';
import {
  computeEffectiveStats,
  DEFAULT_LOADOUT,
  MAX_DYNAMITE,
} from './upgrades';

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onStageClear: (stageId: StageId, stats: StageStats) => void;
  onGameOver: (stageId: StageId, stats: StageStats) => void;
  onPauseRequested: () => void;
  onTonicUsed?: (remaining: number) => void;
  onDynamiteUsed?: (remaining: number) => void;
  onAnimalHunted?: (species: AnimalSpeciesId, cleanKill: boolean) => void;
}

export class WestGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: WesternAudioEngine;
  private callbacks: EngineCallbacks;

  private rafId = 0;
  private lastTimestamp = 0;
  private running = false;
  private paused = false;

  // Viewport & camera
  private viewW = 1280;
  private viewH = 720;
  private camX = 0;
  private camY = 0;
  private shakeMag = 0;
  private hitstopTimer = 0;

  // Telescopic Sniper Scope state
  private scopeOpen = false;
  private scopeZoom = 1.85;
  private currentZoom = 1.0;

  // Stage state
  private stageId: StageId = 'ghost_town';
  private difficulty: Difficulty = 'normal';
  private blueprint!: StageBlueprint;
  private obstacles: Obstacle[] = [];
  private enemies: Enemy[] = [];
  private allies: AllyEntity[] = [];
  private animals: AnimalEntity[] = [];
  private posseEnabled = true;
  private posseHold = false;
  private projectiles: Projectile[] = [];
  private dynamites: DynamiteStick[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private tumbleweeds: Tumbleweed[] = [];

  private nextEntityId = 1;
  private waveIndex = 0;
  private waveClearDelay = 0;
  private stageElapsed = 0;
  private trainScroll = 0;
  private trainCarStage = 0; // 0: cars 1-2, 1: vault car, 2: locomotive
  private trainStopped = false;
  private safeCracked = false;
  private brakePulled = false;

  // Quick-Draw Boss Duel
  private quickDrawPhase: QuickDrawPhase = 'NONE';
  private quickDrawTimer = 0;
  private quickDrawBanner: string | null = null;
  private bossReinforced = false;

  // Banner
  private bannerMsg: string | null = null;
  private bannerTimer = 0;

  // Loadout & effective upgrade stats
  private loadout: PlayerLoadout = { ...DEFAULT_LOADOUT };
  private effectiveStats = computeEffectiveStats(DEFAULT_LOADOUT);

  // Player state
  private player = {
    x: 240,
    y: 540,
    vx: 0,
    vy: 0,
    radius: 17,
    angle: 0,
    hp: 100,
    maxHp: 100,
    armor: 0,
    maxArmor: 0,
    tonicsCount: 1,
    dynamiteCount: 3,
    walkMode: false,
    invulnTimer: 0,
    regenDelayTimer: 0,
    hitFlash: 0,
    dodgeTimer: 0,
    dodgeCooldown: 0,
    dodgeVx: 0,
    dodgeVy: 0,
    deadeye: 100,
    deadeyeActive: false,
    activeWeapon: 'revolver' as WeaponId,
    fireCooldown: 0,
    revolverAmmo: 6,
    revolverReserve: 54,
    revolverCylinderAngle: 0,
    winchesterAmmo: 10,
    winchesterReserve: 40,
    sniperAmmo: 5,
    sniperReserve: 20,
    maximAmmo: 40,
    maximReserve: 160,
    shotgunAmmo: 2,
    shotgunReserve: 20,
    dualAmmo: 12,
    dualReserve: 72,
    bowAmmo: 8,
    bowReserve: 32,
    dualHandToggle: 1 as 1 | -1,
    isReloading: false,
    reloadTimer: 0,
    reloadDuration: 1.25,
    activeReloadTried: false,
    activeReloadBuffTimer: 0,
    muzzleFlashTimer: 0,
    walkCycle: 0,
  };

  // Stats
  private bounty = 0;
  private kills = 0;
  private stealthKills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboTimer = 0;
  private goldLooted = 0;

  // Input state
  private heldKeys = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualFiring = false;
  private mouseScreenX = 640;
  private mouseScreenY = 360;
  private mouseDown = false;
  private hudSyncAccum = 0;
  private stageEnded = false;

  constructor(
    canvas: HTMLCanvasElement,
    audio: WesternAudioEngine,
    callbacks: EngineCallbacks
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D rendering context');
    }
    this.ctx = context;
    this.audio = audio;
    this.callbacks = callbacks;

    this.bindEvents();
    this.handleResize();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.running) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      this.callbacks.onPauseRequested();
      return;
    }
    if (this.paused) return;

    this.audio.unlock();

    if (!this.heldKeys.has(e.code)) {
      if (e.code === 'Space') {
        e.preventDefault();
        this.tryDodgeRoll();
      } else if (e.code === 'KeyR') {
        this.handleReloadInput();
      } else if (e.code === 'Digit1') {
        this.switchWeapon('revolver');
      } else if (e.code === 'Digit2') {
        this.switchWeapon('winchester');
      } else if (e.code === 'Digit3') {
        this.switchWeapon('sniper');
      } else if (e.code === 'Digit4') {
        this.switchWeapon('maxim');
      } else if (e.code === 'Digit5') {
        this.switchWeapon('shotgun');
      } else if (e.code === 'Digit6') {
        this.switchWeapon('dual_pistols');
      } else if (e.code === 'Digit7') {
        this.switchWeapon('bow');
      } else if (e.code === 'KeyQ') {
        this.cycleWeapon(1);
      } else if (e.code === 'KeyH') {
        this.togglePosseHold();
      } else if (e.code === 'KeyG') {
        this.tryThrowDynamite();
      } else if (e.code === 'KeyC') {
        this.toggleWalkMode();
      } else if (e.code === 'KeyE') {
        this.tryUseTonic();
      } else if (e.code === 'KeyZ') {
        this.toggleScope();
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        if (this.scopeOpen) this.zoomScope(0.35);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        if (this.scopeOpen) this.zoomScope(-0.35);
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyF'
      ) {
        this.toggleDeadeye();
      }
    }
    this.heldKeys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreenX = e.clientX - rect.left;
    this.mouseScreenY = e.clientY - rect.top;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.running || this.paused) return;
    this.audio.unlock();
    if (e.button === 0) {
      this.mouseDown = true;
      this.tryFire();
    } else if (e.button === 2) {
      e.preventDefault();
      if (this.player.activeWeapon === 'sniper') {
        this.toggleScope();
      } else {
        this.toggleDeadeye();
      }
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.running || this.paused) return;
    if (Math.abs(e.deltaY) > 4) {
      if (this.scopeOpen && this.player.activeWeapon === 'sniper') {
        this.zoomScope(e.deltaY < 0 ? 0.25 : -0.25);
        return;
      }
      const order: WeaponId[] = [
        'revolver',
        'winchester',
        'sniper',
        'maxim',
        'shotgun',
        'dual_pistols',
        'bow',
      ];
      const dir = e.deltaY > 0 ? 1 : -1;
      const idx = order.indexOf(this.player.activeWeapon);
      const next = order[(idx + dir + order.length) % order.length];
      this.switchWeapon(next);
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onBlur = () => {
    this.heldKeys.clear();
    this.mouseDown = false;
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualFiring = false;
  };

  private handleResize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.viewW = w;
    this.viewH = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: true });
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  public startStage(
    stageId: StageId,
    difficulty: Difficulty,
    carryBounty = 0,
    loadout: PlayerLoadout = DEFAULT_LOADOUT,
    posseEnabled = true
  ): void {
    this.stageId = stageId;
    this.difficulty = difficulty;
    this.loadout = { ...loadout };
    this.effectiveStats = computeEffectiveStats(this.loadout);
    this.posseEnabled = posseEnabled;
    this.posseHold = stageId === 'sniper_hunt';
    this.blueprint = buildStageBlueprint(stageId);
    this.obstacles = this.blueprint.obstacles.map((o) => ({ ...o }));
    this.enemies = [];
    this.allies = [];
    this.animals = [];
    this.projectiles = [];
    this.dynamites = [];
    this.pickups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.tumbleweeds = [];
    this.nextEntityId = 1;
    this.scopeOpen = false;
    this.scopeZoom = 1.85;
    this.currentZoom = 1.0;

    this.waveIndex = 0;
    this.waveClearDelay = 0;
    this.stageElapsed = 0;
    this.stageEnded = false;
    this.trainScroll = 0;
    this.trainCarStage = 0;
    this.trainStopped = false;
    this.safeCracked = false;
    this.brakePulled = false;
    this.bossReinforced = false;
    this.shakeMag = 0;
    this.hitstopTimer = 0;

    this.player.x = this.blueprint.playerStart.x;
    this.player.y = this.blueprint.playerStart.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.maxHp = this.effectiveStats.maxHp;
    this.player.hp = this.effectiveStats.maxHp;
    this.player.armor = this.effectiveStats.maxArmor;
    this.player.maxArmor = this.effectiveStats.maxArmor;
    this.player.tonicsCount = this.loadout.tonicsCount;
    this.player.dynamiteCount = this.loadout.dynamiteCount;
    this.player.walkMode = false;
    this.player.invulnTimer = 0.6;
    this.player.regenDelayTimer = 0;
    this.player.hitFlash = 0;
    this.player.dodgeTimer = 0;
    this.player.dodgeCooldown = 0;
    this.player.deadeye = 100;
    this.player.deadeyeActive = false;
    this.player.activeWeapon = 'revolver';
    this.player.fireCooldown = 0;
    this.player.revolverAmmo = 6;
    this.player.revolverReserve = 60 + this.effectiveStats.extraRevolverReserve;
    this.player.winchesterAmmo = 10;
    this.player.winchesterReserve = 40 + this.effectiveStats.extraWinchesterReserve;
    this.player.sniperAmmo = 5;
    this.player.sniperReserve = 20 + this.effectiveStats.extraSniperReserve;
    this.player.maximAmmo = 40;
    this.player.maximReserve = 160 + this.effectiveStats.extraMaximReserve;
    this.player.shotgunAmmo = 2;
    this.player.shotgunReserve = 20 + this.effectiveStats.extraShotgunReserve;
    this.player.dualAmmo = 12;
    this.player.dualReserve = 72 + this.effectiveStats.extraDualReserve;
    this.player.bowAmmo = 8;
    this.player.bowReserve = 32 + this.effectiveStats.extraBowReserve;
    this.player.dualHandToggle = 1;
    this.player.isReloading = false;
    this.player.reloadTimer = 0;
    this.player.activeReloadBuffTimer = 0;
    this.player.muzzleFlashTimer = 0;

    this.bounty = carryBounty;
    this.kills = 0;
    this.stealthKills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.goldLooted = 0;

    if (this.posseEnabled) {
      this.spawnPosse();
    }

    this.heldKeys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualFiring = false;
    this.mouseDown = false;
    this.paused = false;

    // Snap camera
    this.camX = this.player.x - this.viewW / 2;
    this.camY = this.player.y - this.viewH / 2;
    this.clampCamera();

    // Populate ambient tumbleweeds on ghost_town & badlands & boss_duel
    if (stageId !== 'train_heist') {
      for (let i = 0; i < 4; i++) {
        this.tumbleweeds.push({
          x: Math.random() * this.blueprint.worldWidth,
          y: 120 + Math.random() * (this.blueprint.worldHeight - 240),
          vx: 55 + Math.random() * 45,
          vy: (Math.random() - 0.5) * 18,
          radius: 14 + Math.random() * 8,
          rot: Math.random() * Math.PI * 2,
        });
      }
    }

    // Stage-specific startup
    if (stageId === 'train_heist') {
      this.audio.playTrainWhistle();
      this.spawnTrainWave(0);
      this.showBanner('سرقة قطار الذهب · تقدم نحو القاطرة!', 3.0);
    } else if (stageId === 'boss_duel') {
      this.spawnWave(0);
      this.quickDrawPhase = 'WAIT';
      this.quickDrawTimer = 2.0 + Math.random() * 1.4;
      this.quickDrawBanner = 'ضع يدك قرب المسدس... انتظر الجرس!';
      this.showBanner('نزال السحب السريع عند الغروب', 2.4);
    } else if (stageId === 'training_camp') {
      this.quickDrawPhase = 'NONE';
      this.quickDrawBanner = null;
      this.player.revolverReserve += 60;
      this.player.winchesterReserve += 50;
      this.player.sniperReserve += 35;
      this.player.maximReserve += 160;
      this.spawnWave(0);
      this.showBanner(
        'ميدان التدريب · جرّب الأسلحة (1-4) والديناميت (G) وعين الصقر (Shift)',
        3.4
      );
    } else if (stageId === 'sniper_hunt') {
      this.quickDrawPhase = 'NONE';
      this.quickDrawBanner = null;
      this.player.activeWeapon = 'sniper';
      this.player.sniperReserve += 30;
      this.spawnWave(0);
      this.showBanner(
        'مهمة القناص الخفية · افتح المنظار (Z / كليك يمين) وقرّب بالعجلة لقنص العصابة دون كشفك',
        3.8
      );
    } else if (stageId === 'hunting_grounds') {
      this.quickDrawPhase = 'NONE';
      this.quickDrawBanner = null;
      this.player.activeWeapon = 'winchester';
      this.player.sniperReserve += 15;
      this.spawnWave(0);
      this.showBanner(
        'سهول الصيد البرية · اصطد الحيوانات بمستويات صعوبتها وبِع غنائمك في المتجر',
        3.6
      );
    } else {
      this.quickDrawPhase = 'NONE';
      this.quickDrawBanner = null;
      this.spawnWave(0);
    }

    this.running = true;
    this.lastTimestamp = performance.now();
    this.emitHud();
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.loop);
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (p) {
      this.heldKeys.clear();
      this.mouseDown = false;
    } else {
      this.lastTimestamp = performance.now();
    }
  }

  public stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0), 0.05);

    if (!this.paused) {
      this.update(dt);
    }
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private showBanner(text: string, duration = 2.6): void {
    this.bannerMsg = text;
    this.bannerTimer = duration;
  }

  public setVirtualMove(dx: number, dy: number): void {
    this.virtualMoveX = Math.max(-1, Math.min(1, dx));
    this.virtualMoveY = Math.max(-1, Math.min(1, dy));
  }

  public setVirtualFire(firing: boolean): void {
    this.virtualFiring = firing;
    if (firing && this.running && !this.paused) {
      this.audio.unlock();
      this.tryFire();
    }
  }

  public selectWeapon(weapon: WeaponId): void {
    if (!this.running || this.paused) return;
    this.switchWeapon(weapon);
  }

  public cycleWeapon(dir: 1 | -1 = 1): void {
    if (!this.running || this.paused) return;
    const order: WeaponId[] = [
      'revolver',
      'winchester',
      'sniper',
      'maxim',
      'shotgun',
      'dual_pistols',
      'bow',
    ];
    const idx = order.indexOf(this.player.activeWeapon);
    const next = order[(idx + dir + order.length) % order.length];
    this.switchWeapon(next);
  }

  public togglePosseHold(): void {
    if (!this.running || this.paused || !this.posseEnabled) return;
    this.posseHold = !this.posseHold;
    this.audio.playReloadClick();
    this.addFloatingText(
      this.player.x,
      this.player.y - 30,
      this.posseHold ? 'الفريق: تمركز وتغطية صامتة' : 'الفريق: هجوم وإسناد حر!',
      '#60A5FA',
      1.05
    );
    this.emitHud();
  }

  public toggleWalkMode(): void {
    if (!this.running || this.paused) return;
    this.player.walkMode = !this.player.walkMode;
    this.addFloatingText(
      this.player.x,
      this.player.y - 26,
      this.player.walkMode ? 'وضع المشي الدقيق' : 'وضع الركض',
      '#F3E5CE',
      0.9
    );
    this.emitHud();
  }

  public triggerReload(): void {
    if (!this.running || this.paused) return;
    this.handleReloadInput();
  }

  public triggerDodge(): void {
    if (!this.running || this.paused) return;
    this.tryDodgeRoll();
  }

  public triggerDeadeye(): void {
    if (!this.running || this.paused) return;
    this.toggleDeadeye();
  }

  public toggleScope(): void {
    if (!this.running || this.paused) return;
    if (this.player.activeWeapon !== 'sniper') {
      this.switchWeapon('sniper');
      this.scopeOpen = true;
    } else {
      this.scopeOpen = !this.scopeOpen;
    }
    this.audio.playReloadClick();
    this.addFloatingText(
      this.player.x,
      this.player.y - 28,
      this.scopeOpen ? `فتح المنظار ×${this.scopeZoom.toFixed(1)}` : 'إغلاق المنظار',
      '#67E8F9',
      0.95
    );
    this.emitHud();
  }

  public zoomScope(delta: number): void {
    if (!this.running || this.paused) return;
    if (this.player.activeWeapon !== 'sniper') return;
    if (!this.scopeOpen) this.scopeOpen = true;
    this.scopeZoom = Math.max(1.35, Math.min(3.0, +(this.scopeZoom + delta).toFixed(2)));
    this.emitHud();
  }

  private getWorldMouse(): { x: number; y: number } {
    const centerX = this.camX + this.viewW / 2;
    const centerY = this.camY + this.viewH / 2;
    const z = this.currentZoom || 1;
    return {
      x: centerX + (this.mouseScreenX - this.viewW / 2) / z,
      y: centerY + (this.mouseScreenY - this.viewH / 2) / z,
    };
  }

  private switchWeapon(weapon: WeaponId): void {
    if (this.player.activeWeapon === weapon) return;
    this.player.activeWeapon = weapon;
    if (weapon !== 'sniper') {
      this.scopeOpen = false;
    }
    this.player.isReloading = false;
    this.player.reloadTimer = 0;
    this.player.fireCooldown = 0.14;
    this.audio.playReloadClick();
    this.emitHud();
  }

  private toggleDeadeye(): void {
    if (this.quickDrawPhase === 'WAIT' || this.quickDrawPhase === 'DRAW_NOW') {
      return;
    }
    if (this.player.deadeyeActive) {
      this.player.deadeyeActive = false;
      this.audio.playDeadeye(false);
    } else if (this.player.deadeye >= 20) {
      this.player.deadeyeActive = true;
      this.audio.playDeadeye(true);
      this.showBanner('عين الصقر مفعّلة!', 1.1);
    }
  }

  private tryDodgeRoll(): void {
    if (this.quickDrawPhase === 'WAIT') return;
    if (this.player.dodgeTimer > 0 || this.player.dodgeCooldown > 0) return;

    let dx = this.virtualMoveX;
    let dy = this.virtualMoveY;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) dy -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) dy += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) dx -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) dx += 1;

    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.player.angle);
      dy = Math.sin(this.player.angle);
    } else {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    this.player.dodgeTimer = 0.24;
    this.player.dodgeCooldown = this.effectiveStats.dodgeCooldownBase;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.28);
    this.player.dodgeVx = dx * 610;
    this.player.dodgeVy = dy * 610;

    for (let i = 0; i < 8; i++) {
      this.spawnParticle({
        x: this.player.x,
        y: this.player.y + 8,
        vx: -dx * (40 + Math.random() * 80) + (Math.random() - 0.5) * 60,
        vy: -dy * (40 + Math.random() * 80) + (Math.random() - 0.5) * 60,
        size: 6 + Math.random() * 6,
        life: 0.35,
        color: '#D6B180',
        drag: 0.92,
        kind: 'dust',
      });
    }
  }

  public tryUseTonic(): void {
    const p = this.player;
    if (this.stageEnded || this.paused) return;
    if (p.tonicsCount <= 0 || p.hp >= p.maxHp) return;
    p.tonicsCount -= 1;
    const heal = this.effectiveStats.tonicHeal;
    p.hp = Math.min(p.maxHp, p.hp + heal);
    this.audio.playPickup();
    this.addFloatingText(p.x, p.y - 30, `+${heal} ترياق علاجي!`, '#34D399', 1.15);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawnParticle({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * 65,
        vy: Math.sin(a) * 65,
        size: 4,
        life: 0.45,
        color: '#34D399',
        drag: 0.92,
        kind: 'spark',
      });
    }
    this.callbacks.onTonicUsed?.(p.tonicsCount);
    this.emitHud();
  }

  public tryThrowDynamite(): void {
    const p = this.player;
    if (this.stageEnded || this.paused) return;
    if (this.quickDrawPhase === 'WAIT') return;
    if (p.dynamiteCount <= 0) {
      this.audio.playEmptyClick();
      this.addFloatingText(p.x, p.y - 28, 'نفد الديناميت!', '#FCA5A5', 1.0);
      return;
    }

    p.dynamiteCount -= 1;
    this.audio.playDynamiteThrow();

    const wm = this.getWorldMouse();
    const worldMouseX = wm.x;
    const worldMouseY = wm.y;
    const dx = worldMouseX - p.x;
    const dy = worldMouseY - p.y;
    const dist = Math.hypot(dx, dy);
    const maxRange = 450;
    let tx = worldMouseX;
    let ty = worldMouseY;
    if (dist > maxRange) {
      tx = p.x + (dx / dist) * maxRange;
      ty = p.y + (dy / dist) * maxRange;
    } else if (dist < 40) {
      tx = p.x + Math.cos(p.angle) * 200;
      ty = p.y + Math.sin(p.angle) * 200;
    }

    this.dynamites.push({
      id: this.nextEntityId++,
      x: p.x,
      y: p.y,
      startX: p.x,
      startY: p.y,
      targetX: tx,
      targetY: ty,
      flightProgress: 0,
      fuseTimer: 1.0,
      maxFuse: 1.0,
      blastRadius: this.effectiveStats.dynamiteRadius,
      damage: this.effectiveStats.dynamiteDamage,
      fromPlayer: true,
    });

    this.callbacks.onDynamiteUsed?.(p.dynamiteCount);
    this.emitHud();
  }

  private handleReloadInput(): void {
    const p = this.player;
    const spec = WEAPONS[p.activeWeapon];
    const currentAmmo =
      p.activeWeapon === 'revolver'
        ? p.revolverAmmo
        : p.activeWeapon === 'winchester'
          ? p.winchesterAmmo
          : p.activeWeapon === 'sniper'
            ? p.sniperAmmo
            : p.activeWeapon === 'maxim'
              ? p.maximAmmo
              : p.activeWeapon === 'shotgun'
                ? p.shotgunAmmo
                : p.activeWeapon === 'dual_pistols'
                  ? p.dualAmmo
                  : p.bowAmmo;
    const reserve =
      p.activeWeapon === 'revolver'
        ? p.revolverReserve
        : p.activeWeapon === 'winchester'
          ? p.winchesterReserve
          : p.activeWeapon === 'sniper'
            ? p.sniperReserve
            : p.activeWeapon === 'maxim'
              ? p.maximReserve
              : p.activeWeapon === 'shotgun'
                ? p.shotgunReserve
                : p.activeWeapon === 'dual_pistols'
                  ? p.dualReserve
                  : p.bowReserve;

    if (p.isReloading) {
      // Active reload check!
      const prog = p.reloadTimer / p.reloadDuration;
      if (!p.activeReloadTried && prog >= 0.42 && prog <= 0.72) {
        this.finishReload(true);
      } else {
        p.activeReloadTried = true;
      }
      return;
    }

    if (currentAmmo < spec.magSize && reserve > 0) {
      p.isReloading = true;
      p.reloadTimer = 0;
      p.reloadDuration =
        p.activeWeapon === 'revolver'
          ? this.effectiveStats.revolverReload
          : p.activeWeapon === 'winchester'
            ? this.effectiveStats.winchesterReload
            : p.activeWeapon === 'sniper'
              ? this.effectiveStats.sniperReload
              : p.activeWeapon === 'maxim'
                ? this.effectiveStats.maximReload
                : p.activeWeapon === 'shotgun'
                  ? this.effectiveStats.shotgunReload
                  : p.activeWeapon === 'dual_pistols'
                    ? this.effectiveStats.dualReload
                    : this.effectiveStats.bowReload;
      p.activeReloadTried = false;
      this.audio.playReloadClick();
    }
  }

  private finishReload(perfect: boolean): void {
    const p = this.player;
    const spec = WEAPONS[p.activeWeapon];
    if (p.activeWeapon === 'revolver') {
      const needed = spec.magSize - p.revolverAmmo;
      const take = Math.min(needed, p.revolverReserve);
      p.revolverAmmo += take;
      p.revolverReserve -= take;
    } else if (p.activeWeapon === 'winchester') {
      const needed = spec.magSize - p.winchesterAmmo;
      const take = Math.min(needed, p.winchesterReserve);
      p.winchesterAmmo += take;
      p.winchesterReserve -= take;
    } else if (p.activeWeapon === 'sniper') {
      const needed = spec.magSize - p.sniperAmmo;
      const take = Math.min(needed, p.sniperReserve);
      p.sniperAmmo += take;
      p.sniperReserve -= take;
    } else if (p.activeWeapon === 'maxim') {
      const needed = spec.magSize - p.maximAmmo;
      const take = Math.min(needed, p.maximReserve);
      p.maximAmmo += take;
      p.maximReserve -= take;
    } else if (p.activeWeapon === 'shotgun') {
      const needed = spec.magSize - p.shotgunAmmo;
      const take = Math.min(needed, p.shotgunReserve);
      p.shotgunAmmo += take;
      p.shotgunReserve -= take;
    } else if (p.activeWeapon === 'dual_pistols') {
      const needed = spec.magSize - p.dualAmmo;
      const take = Math.min(needed, p.dualReserve);
      p.dualAmmo += take;
      p.dualReserve -= take;
    } else {
      const needed = spec.magSize - p.bowAmmo;
      const take = Math.min(needed, p.bowReserve);
      p.bowAmmo += take;
      p.bowReserve -= take;
    }
    p.isReloading = false;
    p.reloadTimer = 0;
    this.audio.playReloadComplete(perfect);
    if (perfect) {
      p.activeReloadBuffTimer = 4.2;
      this.addFloatingText(
        p.x,
        p.y - 28,
        'تلقيم مثالي! ضرر +35%',
        '#FBBF24',
        1.15
      );
    }
  }

  private tryFire(): void {
    const p = this.player;
    if (this.stageEnded) return;

    // Quick-draw standoff interception!
    if (this.quickDrawPhase === 'WAIT') {
      // Early foul!
      this.quickDrawPhase = 'RESOLVED';
      this.quickDrawBanner = 'سحب مبكر! انتبه لردة فعل المارشال!';
      this.audio.playEmptyClick();
      this.showBanner('سحب مبكر! بدأ النزال!', 2.0);
      const boss = this.enemies.find((e) => e.isBoss);
      if (boss) {
        boss.shootCooldown = 0.25;
      }
      setTimeout(() => {
        this.quickDrawBanner = null;
      }, 1500);
      return;
    }

    if (this.quickDrawPhase === 'DRAW_NOW') {
      this.quickDrawPhase = 'RESOLVED';
      this.quickDrawBanner = 'سحب أسطوري خاطف!';
      const boss = this.enemies.find((e) => e.isBoss);
      if (boss) {
        const dmg = 165;
        boss.hp = Math.max(1, boss.hp - dmg);
        boss.hitFlash = 0.25;
        boss.shootCooldown = 1.1;
        this.hitstopTimer = 0.08;
        this.shakeMag = 14;
        this.addFloatingText(boss.x, boss.y - 34, `-${dmg} سحب خاطف!`, '#FBBF24', 1.35);
      }
      this.showBanner('إصابة سحب سريع حاسمة!', 2.0);
      setTimeout(() => {
        this.quickDrawBanner = null;
      }, 1600);
    }

    if (p.fireCooldown > 0 || p.isReloading) return;

    const spec = WEAPONS[p.activeWeapon];
    const currentAmmo =
      p.activeWeapon === 'revolver'
        ? p.revolverAmmo
        : p.activeWeapon === 'winchester'
          ? p.winchesterAmmo
          : p.activeWeapon === 'sniper'
            ? p.sniperAmmo
            : p.activeWeapon === 'maxim'
              ? p.maximAmmo
              : p.activeWeapon === 'shotgun'
                ? p.shotgunAmmo
                : p.activeWeapon === 'dual_pistols'
                  ? p.dualAmmo
                  : p.bowAmmo;

    if (currentAmmo <= 0) {
      this.audio.playEmptyClick();
      p.fireCooldown = 0.22;
      this.handleReloadInput();
      return;
    }

    // Consume bullet
    if (p.activeWeapon === 'revolver') {
      p.revolverAmmo -= 1;
      p.revolverCylinderAngle += Math.PI / 3;
      this.audio.playRevolverShot();
    } else if (p.activeWeapon === 'winchester') {
      p.winchesterAmmo -= 1;
      this.audio.playWinchesterShot();
    } else if (p.activeWeapon === 'sniper') {
      p.sniperAmmo -= 1;
      this.audio.playSniperShot();
    } else if (p.activeWeapon === 'maxim') {
      p.maximAmmo -= 1;
      this.audio.playMaximShot();
    } else if (p.activeWeapon === 'shotgun') {
      p.shotgunAmmo -= 1;
      this.audio.playShotgunShot();
    } else if (p.activeWeapon === 'dual_pistols') {
      p.dualAmmo -= 1;
      p.dualHandToggle = p.dualHandToggle === 1 ? -1 : 1;
      this.audio.playDualPistolShot();
    } else {
      p.bowAmmo -= 1;
      this.audio.playBowShot();
    }

    p.fireCooldown =
      p.activeWeapon === 'winchester'
        ? this.effectiveStats.winchesterFireInterval
        : p.activeWeapon === 'sniper'
          ? this.effectiveStats.sniperFireInterval
          : p.activeWeapon === 'maxim'
            ? this.effectiveStats.maximFireInterval
            : p.activeWeapon === 'dual_pistols'
              ? this.effectiveStats.dualFireInterval
              : p.activeWeapon === 'bow'
                ? this.effectiveStats.bowFireInterval
                : spec.fireInterval;
    p.muzzleFlashTimer = p.activeWeapon === 'bow' ? 0.04 : 0.08;
    this.shotsFired += 1;

    const wm = this.getWorldMouse();
    const worldMouseX = wm.x;
    const worldMouseY = wm.y;
    const baseAngle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
    p.angle = baseAngle;

    const baseSpread =
      p.activeWeapon === 'revolver'
        ? this.effectiveStats.revolverSpread
        : p.activeWeapon === 'winchester'
          ? this.effectiveStats.winchesterSpread
          : p.activeWeapon === 'maxim'
            ? this.effectiveStats.maximSpread
            : p.activeWeapon === 'shotgun'
              ? this.effectiveStats.shotgunSpread
              : p.activeWeapon === 'dual_pistols'
                ? this.effectiveStats.dualSpread
                : spec.spreadRad;
    const walkAccuracyMult = p.walkMode || this.scopeOpen ? 0.35 : 1;

    // Alert nearby enemies/animals to gunfire sound (bow is near-silent!)
    const noiseRadius =
      p.activeWeapon === 'bow'
        ? 45
        : p.activeWeapon === 'sniper'
          ? 185
          : p.activeWeapon === 'maxim'
            ? 650
            : p.activeWeapon === 'shotgun'
              ? 600
              : 460;
    this.emitGunshotNoise(p.x, p.y, noiseRadius);

    const barrelLen =
      p.activeWeapon === 'sniper'
        ? 38
        : p.activeWeapon === 'maxim'
          ? 34
          : p.activeWeapon === 'winchester' || p.activeWeapon === 'shotgun'
            ? 30
            : 22;
    const sideOffset =
      p.activeWeapon === 'dual_pistols' ? p.dualHandToggle * 7 : 0;
    const muzzleX =
      p.x +
      Math.cos(baseAngle) * barrelLen -
      Math.sin(baseAngle) * sideOffset;
    const muzzleY =
      p.y +
      Math.sin(baseAngle) * barrelLen +
      Math.cos(baseAngle) * sideOffset;

    let dmg =
      p.activeWeapon === 'revolver'
        ? this.effectiveStats.revolverDamage
        : p.activeWeapon === 'winchester'
          ? this.effectiveStats.winchesterDamage
          : p.activeWeapon === 'sniper'
            ? this.effectiveStats.sniperDamage
            : p.activeWeapon === 'maxim'
              ? this.effectiveStats.maximDamage
              : p.activeWeapon === 'shotgun'
                ? this.effectiveStats.shotgunDamage
                : p.activeWeapon === 'dual_pistols'
                  ? this.effectiveStats.dualDamage
                  : this.effectiveStats.bowDamage;
    if (p.deadeyeActive) dmg *= 1.25;
    if (p.activeReloadBuffTimer > 0) dmg *= 1.35;

    const projSpeed =
      p.activeWeapon === 'winchester'
        ? this.effectiveStats.winchesterSpeed
        : p.activeWeapon === 'sniper'
          ? this.effectiveStats.sniperSpeed
          : p.activeWeapon === 'bow'
            ? this.effectiveStats.bowSpeed
            : spec.projectileSpeed;

    const penetration =
      p.activeWeapon === 'sniper'
        ? this.effectiveStats.sniperPenetration
        : p.activeWeapon === 'bow'
          ? this.effectiveStats.bowPenetration
          : spec.penetration;

    const pelletCount =
      p.activeWeapon === 'shotgun' ? this.effectiveStats.shotgunPellets : 1;

    for (let k = 0; k < pelletCount; k++) {
      const pelletBias =
        pelletCount > 1
          ? ((k - (pelletCount - 1) / 2) / Math.max(1, pelletCount - 1)) *
              baseSpread *
              0.75 +
            (Math.random() - 0.5) * baseSpread * 0.45
          : (Math.random() - 0.5) * baseSpread;
      const spread =
        pelletBias * walkAccuracyMult * (p.deadeyeActive ? 0.25 : 1);
      const shotAngle = baseAngle + spread;
      const pSpd =
        pelletCount > 1 ? projSpeed * (0.9 + Math.random() * 0.2) : projSpeed;

      this.projectiles.push({
        id: this.nextEntityId++,
        fromPlayer: true,
        weaponId: p.activeWeapon,
        x: muzzleX,
        y: muzzleY,
        prevX: p.x,
        prevY: p.y,
        vx: Math.cos(shotAngle) * pSpd,
        vy: Math.sin(shotAngle) * pSpd,
        damage: Math.round(dmg),
        radius:
          p.activeWeapon === 'sniper'
            ? 4.8
            : p.activeWeapon === 'winchester' || p.activeWeapon === 'bow'
              ? 4.2
              : p.activeWeapon === 'maxim'
                ? 3.8
                : p.activeWeapon === 'shotgun'
                  ? 3.2
                  : 3.4,
        life: p.activeWeapon === 'shotgun' ? 0.52 : 1.6,
        penetrationLeft: penetration,
        hitIds: new Set<number>(),
        knockback: spec.knockback,
        color:
          p.activeWeapon === 'sniper'
            ? '#67E8F9'
            : p.activeWeapon === 'bow'
              ? '#34D399'
              : p.activeWeapon === 'shotgun'
                ? '#FB923C'
                : p.activeWeapon === 'maxim'
                  ? '#FBBF24'
                  : p.activeWeapon === 'winchester'
                    ? '#FEF08A'
                    : p.activeWeapon === 'dual_pistols'
                      ? '#E2E8F0'
                      : p.deadeyeActive
                        ? '#FBBF24'
                        : '#FDE047',
      });
    }

    this.shakeMag = Math.max(this.shakeMag, spec.recoilShake);

    if (p.activeWeapon !== 'bow') {
      // Muzzle smoke + spinning brass casing
      for (let i = 0; i < (p.activeWeapon === 'shotgun' ? 8 : 5); i++) {
        const a = baseAngle + (Math.random() - 0.5) * 0.55;
        const spd = 70 + Math.random() * 110;
        this.spawnParticle({
          x: muzzleX,
          y: muzzleY,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 4 + Math.random() * 4,
          life: 0.28,
          color: '#E5DDD0',
          drag: 0.9,
          kind: 'smoke',
        });
      }

      const ejectAngle =
        baseAngle +
        (Math.PI / 2) * (p.activeWeapon === 'dual_pistols' ? p.dualHandToggle : 1) +
        (Math.random() - 0.5) * 0.4;
      this.spawnParticle({
        x: p.x + Math.cos(baseAngle) * 10,
        y: p.y + Math.sin(baseAngle) * 10,
        vx: Math.cos(ejectAngle) * (80 + Math.random() * 50),
        vy: Math.sin(ejectAngle) * (80 + Math.random() * 50),
        size: 3.5,
        life: 0.55,
        color: p.activeWeapon === 'shotgun' ? '#DC2626' : '#D99B26',
        drag: 0.92,
        kind: 'casing',
        vRot: 18,
      });
    }
  }

  private spawnWave(index: number): void {
    const wave = this.blueprint.waves[index];
    if (!wave) return;

    this.waveIndex = index;
    this.showBanner(wave.bannerAr, 3.0);

    const spawns = this.blueprint.spawnPoints;
    let spIdx = 0;

    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        const sp =
          group.x !== undefined && group.y !== undefined
            ? { x: group.x, y: group.y }
            : spawns[spIdx % spawns.length];
        spIdx++;
        const jitterX = group.x !== undefined ? 0 : (Math.random() - 0.5) * 60;
        const jitterY = group.y !== undefined ? 0 : (Math.random() - 0.5) * 60;
        this.spawnEnemy(
          group.type,
          Math.max(70, Math.min(this.blueprint.worldWidth - 70, sp.x + jitterX)),
          Math.max(70, Math.min(this.blueprint.worldHeight - 70, sp.y + jitterY))
        );
      }
    }

    if (wave.animals) {
      for (const aGroup of wave.animals) {
        for (let i = 0; i < aGroup.count; i++) {
          const sp =
            aGroup.x !== undefined && aGroup.y !== undefined
              ? { x: aGroup.x, y: aGroup.y }
              : spawns[spIdx % spawns.length];
          spIdx++;
          const jitterX = (Math.random() - 0.5) * 140;
          const jitterY = (Math.random() - 0.5) * 140;
          this.spawnAnimal(
            aGroup.species,
            Math.max(85, Math.min(this.blueprint.worldWidth - 85, sp.x + jitterX)),
            Math.max(85, Math.min(this.blueprint.worldHeight - 85, sp.y + jitterY))
          );
        }
      }
    }
  }

  private spawnAnimal(species: AnimalSpeciesId, x: number, y: number): void {
    const spec = ANIMAL_SPECIES[species];
    const mult = getDifficultyMultipliers(this.difficulty);
    const scaledHp = Math.round(spec.hp * mult.enemyHp);
    this.animals.push({
      id: this.nextEntityId++,
      species,
      nameAr: spec.nameAr,
      lootNameAr: spec.lootNameAr,
      tier: spec.tier,
      tierLabelAr: spec.tierLabelAr,
      behavior: spec.behavior,
      x,
      y,
      vx: 0,
      vy: 0,
      homeX: x,
      homeY: y,
      radius: spec.radius,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: spec.speed,
      fleeSpeed: spec.fleeSpeed,
      chargeDamage: Math.round(spec.chargeDamage * mult.enemyDmg),
      angle: Math.random() * Math.PI * 2,
      hitFlash: 0,
      state: 'CALM',
      stateTimer: 0,
      wanderTimer: 0.6 + Math.random() * 1.6,
      attackCooldown: 0,
      sellPrice: spec.sellPrice,
    });
  }

  private spawnTrainWave(carStage: number): void {
    this.trainCarStage = carStage;
    this.waveIndex = carStage;
    if (carStage === 0) {
      this.showBanner('العربة 1 و 2 · اقتحم حرس القطار!', 2.6);
      this.spawnEnemy('train_guard', 490, 350);
      this.spawnEnemy('train_guard', 730, 390);
      this.spawnEnemy('shotgunner', 900, 340);
      this.spawnEnemy('train_guard', 1020, 445);
    } else if (carStage === 1) {
      this.showBanner('العربة 3 · حطّم خزنة الذهب واسرق الغنيمة!', 2.8);
      this.spawnEnemy('train_guard', 1320, 345);
      this.spawnEnemy('train_guard', 1390, 455);
      this.spawnEnemy('dynamiter', 1580, 395);
    } else if (carStage === 2) {
      this.audio.playTrainWhistle();
      this.showBanner('القاطرة البخارية · اهزم حارس القاطرة ودمّر الكابح!', 3.0);
      this.spawnEnemy('mini_boss', 2020, 400, 'حارس القاطرة الحديدي');
      this.spawnEnemy('train_guard', 1940, 325);
      this.spawnEnemy('train_guard', 2090, 470);
    }
  }

  private spawnEnemy(
    type: EnemyType,
    x: number,
    y: number,
    customNameAr?: string
  ): void {
    const mult = getDifficultyMultipliers(this.difficulty);
    const configs: Record<
      EnemyType,
      {
        nameAr: string;
        hp: number;
        speed: number;
        radius: number;
        bounty: number;
        hat: string;
        coat: string;
        isBoss: boolean;
      }
    > = {
      bandit: {
        nameAr: 'قاطع طريق',
        hp: 70,
        speed: 135,
        radius: 16,
        bounty: 100,
        hat: '#2F221A',
        coat: '#5C3A28',
        isBoss: false,
      },
      shotgunner: {
        nameAr: 'مقتحم ببندقية',
        hp: 115,
        speed: 148,
        radius: 18,
        bounty: 150,
        hat: '#1E1A17',
        coat: '#7C2D12',
        isBoss: false,
      },
      sniper: {
        nameAr: 'قناص الوادي',
        hp: 65,
        speed: 105,
        radius: 15,
        bounty: 160,
        hat: '#42362B',
        coat: '#3B4232',
        isBoss: false,
      },
      dynamiter: {
        nameAr: 'رامي الديناميت',
        hp: 85,
        speed: 120,
        radius: 16,
        bounty: 175,
        hat: '#4A2018',
        coat: '#854D0E',
        isBoss: false,
      },
      train_guard: {
        nameAr: 'حارس القطار',
        hp: 90,
        speed: 125,
        radius: 16,
        bounty: 140,
        hat: '#1E293B',
        coat: '#334155',
        isBoss: false,
      },
      outlaw_fugitive: {
        nameAr: 'خارج عن القانون',
        hp: 78,
        speed: 158,
        radius: 16,
        bounty: 140,
        hat: '#3F271E',
        coat: '#7F1D1D',
        isBoss: false,
      },
      mini_boss: {
        nameAr: 'كولين ذو اليد الحديدية',
        hp: 440,
        speed: 145,
        radius: 22,
        bounty: 500,
        hat: '#14110F',
        coat: '#581C1C',
        isBoss: true,
      },
      boss_cuervo: {
        nameAr: 'إل كويرفو — المارشال الأسود',
        hp: 960,
        speed: 175,
        radius: 23,
        bounty: 1500,
        hat: '#09090B',
        coat: '#271212',
        isBoss: true,
      },
    };

    const cfg = configs[type];
    const scaledHp = Math.round(cfg.hp * mult.enemyHp);
    const resolvedName =
      customNameAr ??
      (this.stageId === 'sniper_hunt' && type === 'mini_boss'
        ? 'جيدو — زعيم الخارجين عن القانون'
        : cfg.nameAr);

    const startAlert: EnemyAlertState =
      this.stageId === 'sniper_hunt' ? 'UNAWARE' : 'ALERTED';

    this.enemies.push({
      id: this.nextEntityId++,
      type,
      nameAr: resolvedName,
      x,
      y,
      vx: 0,
      vy: 0,
      homeX: x,
      homeY: y,
      radius: cfg.radius,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: cfg.speed,
      angle: Math.PI,
      shootCooldown: 0.7 + Math.random() * 0.8,
      windupTimer: 0,
      windupDuration: type === 'sniper' ? 0.95 : 0.45,
      burstLeft: 0,
      burstTimer: 0,
      aimX: this.player.x,
      aimY: this.player.y,
      hitFlash: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      strafeTimer: 1.2 + Math.random(),
      dashCooldown: 3.0,
      dashTimer: 0,
      dashVx: 0,
      dashVy: 0,
      phase: 1,
      bounty: Math.round(cfg.bounty * mult.bounty),
      hatColor: cfg.hat,
      coatColor: cfg.coat,
      isBoss: cfg.isBoss,
      alertState: startAlert,
      alertTimer: 0,
      investigateX: x,
      investigateY: y,
    });
  }

  private emitGunshotNoise(gx: number, gy: number, noiseRadius: number): void {
    if (this.stageId === 'sniper_hunt') {
      for (const e of this.enemies) {
        if (e.alertState === 'ALERTED') continue;
        const d = Math.hypot(e.x - gx, e.y - gy);
        if (d <= noiseRadius) {
          e.alertState = 'SUSPICIOUS';
          e.alertTimer = 4.5;
          e.investigateX = gx;
          e.investigateY = gy;
        }
      }
    }
    if (this.stageId === 'hunting_grounds') {
      for (const a of this.animals) {
        if (a.state !== 'CALM') continue;
        const d = Math.hypot(a.x - gx, a.y - gy);
        if (d <= noiseRadius * 0.85) {
          a.state = a.behavior === 'flee' ? 'STARTLED' : 'AGGRO';
          a.stateTimer = 4.2;
        }
      }
    }
  }

  private alertNearbyEnemies(
    ox: number,
    oy: number,
    radius: number,
    targetX: number,
    targetY: number,
    state: EnemyAlertState = 'ALERTED'
  ): void {
    for (const buddy of this.enemies) {
      if (buddy.alertState === 'ALERTED') continue;
      const d = Math.hypot(buddy.x - ox, buddy.y - oy);
      if (d <= radius) {
        buddy.alertState = state;
        buddy.alertTimer = 4.2;
        buddy.investigateX = targetX;
        buddy.investigateY = targetY;
      }
    }
  }

  private update(dt: number): void {
    this.stageElapsed += dt;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeMag *= Math.pow(0.05, dt);
      return;
    }

    const p = this.player;

    // Deadeye fuel & time scale
    if (p.deadeyeActive) {
      p.deadeye -= this.effectiveStats.deadeyeDrainRate * dt;
      if (p.deadeye <= 0) {
        p.deadeye = 0;
        p.deadeyeActive = false;
        this.audio.playDeadeye(false);
      }
    } else {
      p.deadeye = Math.min(100, p.deadeye + this.effectiveStats.deadeyeRegenRate * dt);
    }

    const worldScale = p.deadeyeActive ? 0.3 : 1;
    const worldDt = dt * worldScale;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerMsg = null;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Quick-draw standoff timer (Stage 4)
    if (this.quickDrawPhase === 'WAIT') {
      this.quickDrawTimer -= dt;
      if (this.quickDrawTimer <= 0) {
        this.quickDrawPhase = 'DRAW_NOW';
        this.quickDrawTimer = 1.25;
        this.quickDrawBanner = 'أطلق النار الآن!';
        this.audio.playDuelBell();
        this.shakeMag = 4;
      }
    } else if (this.quickDrawPhase === 'DRAW_NOW') {
      this.quickDrawTimer -= dt;
      if (this.quickDrawTimer <= 0) {
        this.quickDrawPhase = 'RESOLVED';
        this.quickDrawBanner = 'تأخرت! المارشال بدأ الهجوم!';
        setTimeout(() => {
          this.quickDrawBanner = null;
        }, 1400);
      }
    }

    // Train scrolling & progression
    if (this.stageId === 'train_heist' && !this.trainStopped) {
      this.trainScroll += 780 * worldDt;
      // Locomotive steam smoke
      if (Math.random() < 0.45) {
        this.spawnParticle({
          x: 2220,
          y: 295,
          vx: -260 - Math.random() * 140,
          vy: -45 + (Math.random() - 0.5) * 40,
          size: 14 + Math.random() * 12,
          life: 0.9,
          color: 'rgba(235, 228, 218, 0.75)',
          drag: 0.97,
          kind: 'smoke',
        });
      }
    }

    this.updatePlayer(dt);
    this.updateAllies(worldDt);
    this.updateEnemies(worldDt);
    this.updateAnimals(worldDt);
    this.updateProjectiles(worldDt);
    this.updateDynamites(worldDt);
    this.updatePickups(dt);
    this.updateParticles(worldDt);
    this.updateTumbleweeds(worldDt);
    this.updateFloatingTexts(dt);
    this.checkStageProgression(dt);

    // Smooth telescopic zoom & camera follow
    const scopedActive = this.scopeOpen && p.activeWeapon === 'sniper';
    const targetZoom = scopedActive ? this.scopeZoom : 1.0;
    const zoomLerp = 1 - Math.pow(0.0004, dt);
    this.currentZoom += (targetZoom - this.currentZoom) * zoomLerp;

    const lookahead = scopedActive
      ? 1.08
      : p.activeWeapon === 'sniper'
        ? this.effectiveStats.sniperCameraLookahead
        : 0.14;
    const targetCamX =
      p.x - this.viewW / 2 + (this.mouseScreenX - this.viewW / 2) * lookahead;
    const targetCamY =
      p.y - this.viewH / 2 + (this.mouseScreenY - this.viewH / 2) * lookahead;
    const lerp = 1 - Math.pow(0.001, dt);
    this.camX += (targetCamX - this.camX) * lerp;
    this.camY += (targetCamY - this.camY) * lerp;
    this.clampCamera();

    this.shakeMag *= Math.pow(0.002, dt);
    if (this.shakeMag < 0.2) this.shakeMag = 0;

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.05) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private clampCamera(): void {
    if (this.scopeOpen && this.player.activeWeapon === 'sniper') {
      const minX = -this.viewW / 2 + 60;
      const maxX = this.blueprint.worldWidth - this.viewW / 2 - 60;
      const minY = -this.viewH / 2 + 60;
      const maxY = this.blueprint.worldHeight - this.viewH / 2 - 60;
      this.camX = Math.max(minX, Math.min(maxX, this.camX));
      this.camY = Math.max(minY, Math.min(maxY, this.camY));
      return;
    }
    const maxCamX = Math.max(0, this.blueprint.worldWidth - this.viewW);
    const maxCamY = Math.max(0, this.blueprint.worldHeight - this.viewH);
    if (this.blueprint.worldWidth < this.viewW) {
      this.camX = -(this.viewW - this.blueprint.worldWidth) / 2;
    } else {
      this.camX = Math.max(0, Math.min(maxCamX, this.camX));
    }
    if (this.blueprint.worldHeight < this.viewH) {
      this.camY = -(this.viewH - this.blueprint.worldHeight) / 2;
    } else {
      this.camY = Math.max(0, Math.min(maxCamY, this.camY));
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.regenDelayTimer > 0) {
      p.regenDelayTimer -= dt;
    } else if (this.effectiveStats.hpRegenRate > 0 && p.hp < p.maxHp && p.hp > 0) {
      p.hp = Math.min(p.maxHp, p.hp + this.effectiveStats.hpRegenRate * dt);
      if (Math.random() < 0.08) {
        this.spawnParticle({
          x: p.x + (Math.random() - 0.5) * 18,
          y: p.y + (Math.random() - 0.5) * 16,
          vx: 0,
          vy: -35,
          size: 3,
          life: 0.45,
          color: '#34D399',
          drag: 0.96,
          kind: 'spark',
        });
      }
    }
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.dodgeCooldown > 0) p.dodgeCooldown -= dt;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (p.muzzleFlashTimer > 0) p.muzzleFlashTimer -= dt;
    if (p.activeReloadBuffTimer > 0) p.activeReloadBuffTimer -= dt;

    if (p.isReloading) {
      p.reloadTimer += dt;
      if (p.reloadTimer >= p.reloadDuration) {
        this.finishReload(false);
      }
    }

    // Auto-replenish practice ammo & dynamite in Training Camp
    if (this.stageId === 'training_camp') {
      if (p.revolverReserve < 18) p.revolverReserve = 60;
      if (p.winchesterReserve < 12) p.winchesterReserve = 40;
      if (p.sniperReserve < 8) p.sniperReserve = 25;
      if (p.maximReserve < 40) p.maximReserve = 160;
      if (p.shotgunReserve < 8) p.shotgunReserve = 24;
      if (p.dualReserve < 24) p.dualReserve = 72;
      if (p.bowReserve < 10) p.bowReserve = 32;
      if (p.dynamiteCount === 0 && this.dynamites.length === 0) {
        p.dynamiteCount = 2;
        this.addFloatingText(p.x, p.y - 26, '+ديناميت تدريب', '#FBBF24', 0.95);
      }
    }

    // Mouse aiming using current zoom coordinate inverse
    const wm = this.getWorldMouse();
    p.angle = Math.atan2(wm.y - p.y, wm.x - p.x);

    // Continuous fire while held
    if ((this.mouseDown || this.virtualFiring) && this.quickDrawPhase !== 'WAIT') {
      this.tryFire();
    }

    // Movement locked during Quick-Draw WAIT
    if (this.quickDrawPhase === 'WAIT') {
      p.vx = 0;
      p.vy = 0;
      return;
    }

    if (p.dodgeTimer > 0) {
      p.dodgeTimer -= dt;
      p.vx = p.dodgeVx;
      p.vy = p.dodgeVy;
    } else {
      let mx = this.virtualMoveX;
      let my = this.virtualMoveY;
      if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) my -= 1;
      if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) my += 1;
      if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) mx -= 1;
      if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) mx += 1;

      const mag = Math.hypot(mx, my);
      if (mag > 0.05) {
        if (mag > 1) {
          mx /= mag;
          my /= mag;
        }
        const weaponSpeed =
          p.activeWeapon === 'dual_pistols'
            ? 288
            : p.activeWeapon === 'revolver'
              ? 275
              : p.activeWeapon === 'bow'
                ? 265
                : p.activeWeapon === 'winchester'
                  ? 245
                  : p.activeWeapon === 'shotgun'
                    ? 240
                    : p.activeWeapon === 'sniper'
                      ? 220
                      : 205;
        const walkFactor = p.walkMode ? 0.56 : 1;
        const baseSpeed =
          weaponSpeed * this.effectiveStats.speedMultiplier * walkFactor;
        p.vx = mx * baseSpeed;
        p.vy = my * baseSpeed;
        p.walkCycle += dt * (p.walkMode ? 6.5 : 11);
        if (Math.random() < (p.walkMode ? 0.06 : 0.18)) {
          this.spawnParticle({
            x: p.x,
            y: p.y + 12,
            vx: -mx * 25 + (Math.random() - 0.5) * 20,
            vy: -my * 25 + (Math.random() - 0.5) * 20,
            size: 4 + Math.random() * 3,
            life: 0.3,
            color: 'rgba(210, 175, 130, 0.55)',
            drag: 0.9,
            kind: 'dust',
          });
        }
      } else {
        p.vx = 0;
        p.vy = 0;
      }
    }

    this.moveCircleWithObstacles(p, p.vx * dt, p.vy * dt);

    // Keep player inside train bounds if train_heist
    if (this.stageId === 'train_heist') {
      p.x = Math.max(145, Math.min(2265, p.x));
      p.y = Math.max(276, Math.min(522, p.y));
    } else {
      p.x = Math.max(40, Math.min(this.blueprint.worldWidth - 40, p.x));
      p.y = Math.max(40, Math.min(this.blueprint.worldHeight - 40, p.y));
    }
  }

  private moveCircleWithObstacles(
    ent: { x: number; y: number; radius: number },
    dx: number,
    dy: number
  ): void {
    ent.x += dx;
    for (const o of this.obstacles) {
      if (o.hp <= 0 && o.destructible) continue;
      this.resolveCircleRect(ent, o);
    }
    ent.y += dy;
    for (const o of this.obstacles) {
      if (o.hp <= 0 && o.destructible) continue;
      this.resolveCircleRect(ent, o);
    }
  }

  private resolveCircleRect(
    c: { x: number; y: number; radius: number },
    r: { x: number; y: number; w: number; h: number }
  ): void {
    const closestX = Math.max(r.x, Math.min(c.x, r.x + r.w));
    const closestY = Math.max(r.y, Math.min(c.y, r.y + r.h));
    const distX = c.x - closestX;
    const distY = c.y - closestY;
    const distSq = distX * distX + distY * distY;
    if (distSq < c.radius * c.radius) {
      const dist = Math.sqrt(distSq) || 0.001;
      const overlap = c.radius - dist;
      c.x += (distX / dist) * overlap;
      c.y += (distY / dist) * overlap;
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    const mult = getDifficultyMultipliers(this.difficulty);

    for (const e of this.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt;

      // Wait during Quick-Draw WAIT/DRAW_NOW
      if (this.quickDrawPhase === 'WAIT' || this.quickDrawPhase === 'DRAW_NOW') {
        e.angle = Math.atan2(p.y - e.y, p.x - e.x);
        continue;
      }

      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetAngle = Math.atan2(dy, dx);

      // Stealth AI for Sniper Hunt (outlaws patrol unaware unless they spot/hear player)
      if (e.alertState !== 'ALERTED') {
        const sightRange = p.walkMode ? 245 : 410;
        const canSee =
          dist <= sightRange && this.hasLineOfSight(e.x, e.y, p.x, p.y);
        let angleDiff = Math.abs(targetAngle - e.angle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (canSee && (angleDiff < 1.25 || dist < 140)) {
          e.alertState = 'ALERTED';
          e.windupTimer = 0;
          this.addFloatingText(e.x, e.y - 42, 'كشفك!', '#EF4444', 1.15);
          this.alertNearbyEnemies(e.x, e.y, 290, p.x, p.y, 'ALERTED');
        } else if (e.alertState === 'SUSPICIOUS') {
          e.alertTimer -= dt;
          const idx = e.investigateX - e.x;
          const idy = e.investigateY - e.y;
          const idist = Math.hypot(idx, idy);
          if (idist > 36) {
            e.angle = Math.atan2(idy, idx);
            e.vx = (idx / idist) * e.speed * 0.55;
            e.vy = (idy / idist) * e.speed * 0.55;
          } else {
            e.vx = 0;
            e.vy = 0;
            e.angle += dt * 1.4 * e.strafeDir;
          }
          if (e.alertTimer <= 0) {
            e.alertState = 'UNAWARE';
          }
        } else {
          // Calm gang camp patrol around home position
          e.strafeTimer -= dt;
          if (e.strafeTimer <= 0) {
            e.strafeDir *= -1;
            e.strafeTimer = 2.0 + Math.random() * 2.2;
          }
          const patrolOffset = Math.sin(this.stageElapsed * 0.9 + e.id) * 42;
          const pxTarget = e.homeX + patrolOffset * e.strafeDir;
          const pyTarget = e.homeY + Math.cos(this.stageElapsed * 0.7 + e.id) * 28;
          const pdx = pxTarget - e.x;
          const pdy = pyTarget - e.y;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist > 8) {
            e.vx = (pdx / pdist) * e.speed * 0.32;
            e.vy = (pdy / pdist) * e.speed * 0.32;
            e.angle = Math.atan2(pdy, pdx);
          } else {
            e.vx = 0;
            e.vy = 0;
          }
        }

        if (e.alertState !== 'ALERTED') {
          this.moveCircleWithObstacles(e, e.vx * dt, e.vy * dt);
          e.x = Math.max(40, Math.min(this.blueprint.worldWidth - 40, e.x));
          e.y = Math.max(40, Math.min(this.blueprint.worldHeight - 40, e.y));
          continue;
        }
      }

      e.angle = targetAngle;

      // Boss phase transitions
      if (e.type === 'boss_cuervo') {
        const hpRatio = e.hp / e.maxHp;
        if (hpRatio < 0.65 && e.phase === 1) {
          e.phase = 2;
          this.showBanner('إل كويرفو يستل بندقية وينشستر والديناميت!', 2.5);
          this.shakeMag = 8;
        } else if (hpRatio < 0.35 && e.phase === 2) {
          e.phase = 3;
          this.showBanner('المارشال الأسود في أوج غضبه!', 2.5);
          this.shakeMag = 10;
          if (!this.bossReinforced) {
            this.bossReinforced = true;
            this.spawnEnemy('bandit', 1180, 190);
            this.spawnEnemy('bandit', 1180, 690);
          }
        }
      }

      // Movement & Strafing
      if (e.dashTimer > 0) {
        e.dashTimer -= dt;
        e.vx = e.dashVx;
        e.vy = e.dashVy;
      } else {
        e.strafeTimer -= dt;
        if (e.strafeTimer <= 0) {
          e.strafeDir *= -1;
          e.strafeTimer = 1.0 + Math.random() * 1.4;
        }

        const preferredDist =
          e.type === 'sniper'
            ? 520
            : e.type === 'outlaw_fugitive'
              ? 375
              : e.type === 'shotgunner'
                ? 185
                : e.type === 'dynamiter'
                  ? 390
                  : 300;

        let moveForward = 0;
        if (dist > preferredDist + 45) moveForward = 1;
        else if (dist < preferredDist - 45) moveForward = -0.65;

        // If sniper is winding up, stand still to telegraph clearly
        const spdFactor = e.windupTimer > 0 && e.type === 'sniper' ? 0.1 : 1;
        const dirX = dx / dist;
        const dirY = dy / dist;
        const perpX = -dirY * e.strafeDir;
        const perpY = dirX * e.strafeDir;

        e.vx = (dirX * moveForward + perpX * 0.55) * e.speed * spdFactor;
        e.vy = (dirY * moveForward + perpY * 0.55) * e.speed * spdFactor;

        if (e.isBoss) {
          e.dashCooldown -= dt;
          if (e.dashCooldown <= 0 && dist < 550) {
            e.dashCooldown = e.phase === 3 ? 2.1 : 3.2;
            e.dashTimer = 0.24;
            const dashAng = targetAngle + e.strafeDir * 1.1;
            e.dashVx = Math.cos(dashAng) * 520;
            e.dashVy = Math.sin(dashAng) * 520;
          }
        }
      }

      this.moveCircleWithObstacles(e, e.vx * dt, e.vy * dt);

      if (this.stageId === 'train_heist') {
        e.x = Math.max(145, Math.min(2265, e.x));
        e.y = Math.max(276, Math.min(522, e.y));
      } else {
        e.x = Math.max(40, Math.min(this.blueprint.worldWidth - 40, e.x));
        e.y = Math.max(40, Math.min(this.blueprint.worldHeight - 40, e.y));
      }

      // Shooting & Telegraph Windups
      if (e.burstLeft > 0) {
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          this.fireEnemyAttack(e, mult.enemyDmg);
          e.burstLeft -= 1;
          e.burstTimer = e.type === 'boss_cuervo' ? 0.11 : 0.16;
        }
        continue;
      }

      if (e.windupTimer > 0) {
        e.windupTimer -= dt;
        if (e.type !== 'sniper' || e.windupTimer > 0.28) {
          // Track player until final 0.28s lock-on for snipers so player can dodge!
          e.aimX = p.x;
          e.aimY = p.y;
        }
        if (e.windupTimer <= 0) {
          this.executeEnemyWindupAttack(e, mult.enemyDmg);
        }
      } else {
        e.shootCooldown -= dt * mult.enemyFireRate;
        if (e.shootCooldown <= 0 && dist < 820) {
          // Check line of sight except for dynamiters who lob over crates
          const hasLoS =
            e.type === 'dynamiter' ||
            this.hasLineOfSight(e.x, e.y, p.x, p.y);
          if (hasLoS) {
            e.aimX = p.x;
            e.aimY = p.y;
            e.windupDuration =
              e.type === 'sniper'
                ? 0.95
                : e.type === 'boss_cuervo'
                  ? 0.42
                  : 0.35;
            e.windupTimer = e.windupDuration;
        } else {
          e.shootCooldown = 0.35;
        }
      }
    }
  }
}

  private updateAnimals(dt: number): void {
    const p = this.player;
    for (let ai = this.animals.length - 1; ai >= 0; ai--) {
      const a = this.animals[ai];
      if (a.hitFlash > 0) a.hitFlash -= dt;
      if (a.attackCooldown > 0) a.attackCooldown -= dt;

      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const senseDist = p.walkMode ? 170 : 295;

      if (a.state === 'CALM') {
        if (dist <= senseDist && this.hasLineOfSight(a.x, a.y, p.x, p.y)) {
          if (a.behavior === 'flee') {
            a.state = 'STARTLED';
            a.stateTimer = 4.0;
          } else if (dist <= senseDist * 0.85) {
            a.state = 'AGGRO';
            a.stateTimer = 7.0;
          }
        }
      }

      if (a.state === 'CALM') {
        a.wanderTimer -= dt;
        if (a.wanderTimer <= 0) {
          a.wanderTimer = 1.4 + Math.random() * 2.0;
          const backAng = Math.atan2(a.homeY - a.y, a.homeX - a.x);
          a.angle =
            Math.hypot(a.homeX - a.x, a.homeY - a.y) > 140
              ? backAng
              : a.angle + (Math.random() - 0.5) * 2.2;
        }
        a.vx = Math.cos(a.angle) * a.speed * 0.45;
        a.vy = Math.sin(a.angle) * a.speed * 0.45;
      } else if (a.state === 'STARTLED') {
        a.stateTimer -= dt;
        const fleeAng = Math.atan2(a.y - p.y, a.x - p.x);
        a.angle = fleeAng;
        a.vx = Math.cos(fleeAng) * a.fleeSpeed;
        a.vy = Math.sin(fleeAng) * a.fleeSpeed;
        if (a.stateTimer <= 0 && dist > 480) {
          a.state = 'CALM';
        }
      } else {
        // AGGRO predator or charger chasing player
        a.stateTimer -= dt;
        const chaseAng = Math.atan2(dy, dx);
        a.angle = chaseAng;
        a.vx = Math.cos(chaseAng) * a.fleeSpeed;
        a.vy = Math.sin(chaseAng) * a.fleeSpeed;
        if (dist <= a.radius + p.radius + 6 && a.attackCooldown <= 0 && p.invulnTimer <= 0) {
          this.damagePlayer(a.chargeDamage);
          a.attackCooldown = 1.1;
        }
        if (a.stateTimer <= 0 && dist > 620) {
          a.state = 'CALM';
        }
      }

      this.moveCircleWithObstacles(a, a.vx * dt, a.vy * dt);
      // Bounce softly off world boundaries so fleeing prey stays in the valley
      if (a.x < 75 || a.x > this.blueprint.worldWidth - 75) {
        a.angle = Math.PI - a.angle;
        a.x = Math.max(75, Math.min(this.blueprint.worldWidth - 75, a.x));
      }
      if (a.y < 75 || a.y > this.blueprint.worldHeight - 75) {
        a.angle = -a.angle;
        a.y = Math.max(75, Math.min(this.blueprint.worldHeight - 75, a.y));
      }
    }
  }

  private executeEnemyWindupAttack(e: Enemy, dmgMult: number): void {
    if (e.type === 'dynamiter') {
      this.throwDynamite(e.x, e.y, e.aimX, e.aimY, Math.round(34 * dmgMult));
      e.shootCooldown = 2.9;
      return;
    }

    if (e.type === 'mini_boss') {
      if (Math.random() < 0.35) {
        this.throwDynamite(e.x, e.y, e.aimX, e.aimY, Math.round(34 * dmgMult));
        e.shootCooldown = 1.6;
      } else {
        e.burstLeft = 3;
        e.burstTimer = 0;
        e.shootCooldown = 1.5;
      }
      return;
    }

    if (e.type === 'boss_cuervo') {
      const roll = Math.random();
      if (e.phase >= 2 && roll < 0.28) {
        // Throw two dynamite sticks
        this.throwDynamite(e.x, e.y, e.aimX - 45, e.aimY - 30, Math.round(35 * dmgMult));
        this.throwDynamite(e.x, e.y, e.aimX + 45, e.aimY + 30, Math.round(35 * dmgMult));
        e.shootCooldown = 1.6;
      } else if (e.phase >= 2 && roll < 0.56) {
        // High-speed Winchester piercing shot
        const ang = Math.atan2(e.aimY - e.y, e.aimX - e.x);
        this.spawnEnemyBullet(e, ang, 820, Math.round(24 * dmgMult), 'enemy_rifle');
        this.audio.playWinchesterShot();
        e.shootCooldown = 1.35;
      } else {
        // Fan-the-hammer 5-shot arc
        const baseAng = Math.atan2(e.aimY - e.y, e.aimX - e.x);
        const count = e.phase === 3 ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const offset = ((i - (count - 1) / 2) * 0.14);
          this.spawnEnemyBullet(
            e,
            baseAng + offset,
            490,
            Math.round(14 * dmgMult),
            'enemy_pistol'
          );
        }
        this.audio.playRevolverShot();
        e.shootCooldown = e.phase === 3 ? 1.15 : 1.45;
      }
      return;
    }

    // Standard enemies
    this.fireEnemyAttack(e, dmgMult);
    e.shootCooldown =
      e.type === 'sniper'
        ? 2.2
        : e.type === 'shotgunner'
          ? 1.85
          : 1.4 + Math.random() * 0.5;
  }

  private fireEnemyAttack(e: Enemy, dmgMult: number): void {
    const ang = Math.atan2(e.aimY - e.y, e.aimX - e.x);
    if (e.type === 'shotgunner') {
      this.audio.playRevolverShot();
      for (let i = -1; i <= 1; i++) {
        this.spawnEnemyBullet(
          e,
          ang + i * 0.16,
          440,
          Math.round(11 * dmgMult),
          'enemy_shotgun'
        );
      }
    } else if (e.type === 'sniper') {
      this.audio.playWinchesterShot();
      this.spawnEnemyBullet(e, ang, 860, Math.round(24 * dmgMult), 'enemy_rifle');
    } else {
      this.audio.playRevolverShot();
      this.spawnEnemyBullet(
        e,
        ang + (Math.random() - 0.5) * 0.08,
        460,
        Math.round(12 * dmgMult),
        'enemy_pistol'
      );
    }
  }

  private spawnEnemyBullet(
    e: Enemy,
    angle: number,
    speed: number,
    damage: number,
    weaponId: 'enemy_pistol' | 'enemy_shotgun' | 'enemy_rifle'
  ): void {
    const mx = e.x + Math.cos(angle) * (e.radius + 8);
    const my = e.y + Math.sin(angle) * (e.radius + 8);
    this.projectiles.push({
      id: this.nextEntityId++,
      fromPlayer: false,
      weaponId,
      x: mx,
      y: my,
      prevX: e.x,
      prevY: e.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      radius: weaponId === 'enemy_rifle' ? 4.4 : 3.8,
      life: 2.2,
      penetrationLeft: 1,
      hitIds: new Set<number>(),
      knockback: 110,
      color: weaponId === 'enemy_rifle' ? '#FCA5A5' : '#FB923C',
    });
  }

  private throwDynamite(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    damage: number
  ): void {
    this.dynamites.push({
      id: this.nextEntityId++,
      x: sx,
      y: sy,
      startX: sx,
      startY: sy,
      targetX: tx,
      targetY: ty,
      flightProgress: 0,
      fuseTimer: 1.45,
      maxFuse: 1.45,
      blastRadius: 96,
      damage,
    });
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const steps = 10;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      for (const o of this.obstacles) {
        if (!o.blocksBullets || (o.destructible && o.hp <= 0)) continue;
        if (px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h) {
          return false;
        }
      }
    }
    return true;
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.prevX = pr.x;
      pr.prevY = pr.y;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      if (
        pr.life <= 0 ||
        pr.x < -50 ||
        pr.y < -50 ||
        pr.x > this.blueprint.worldWidth + 50 ||
        pr.y > this.blueprint.worldHeight + 50
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      let removed = false;

      // Check obstacle collisions
      for (const o of this.obstacles) {
        if (!o.blocksBullets || (o.destructible && o.hp <= 0)) continue;
        if (
          pr.x + pr.radius >= o.x &&
          pr.x - pr.radius <= o.x + o.w &&
          pr.y + pr.radius >= o.y &&
          pr.y - pr.radius <= o.y + o.h
        ) {
          if (o.destructible) {
            o.hp -= pr.damage;
            o.hitFlash = 0.12;
            if (o.type === 'safe_vault' || o.type === 'brake_lever') {
              this.audio.playHit('metal');
              this.spawnSparks(pr.x, pr.y, '#FDE047', 6);
            } else {
              this.audio.playHit('wood');
              this.spawnSparks(pr.x, pr.y, '#B47B48', 5);
            }
            if (o.hp <= 0) {
              this.handleObstacleDestroyed(o);
            }
          } else {
            this.audio.playHit(o.type === 'train_wall' ? 'metal' : 'wood');
            this.spawnSparks(pr.x, pr.y, '#E5C69B', 5);
          }
          this.projectiles.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (removed) continue;

      if (pr.fromPlayer) {
        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
          const e = this.enemies[ei];
          if (pr.hitIds.has(e.id)) continue;
          const dist = Math.hypot(pr.x - e.x, pr.y - e.y);
          if (dist <= pr.radius + e.radius) {
            pr.hitIds.add(e.id);
            this.shotsHit += 1;
            e.hp -= pr.damage;
            e.hitFlash = 0.12;
            // Knockback
            const spd = Math.hypot(pr.vx, pr.vy) || 1;
            e.x += (pr.vx / spd) * (pr.knockback * 0.04);
            e.y += (pr.vy / spd) * (pr.knockback * 0.04);

            this.audio.playHit('flesh');
            this.spawnSparks(pr.x, pr.y, '#DC2626', 7);
            this.addFloatingText(
              e.x,
              e.y - e.radius - 10,
              `-${pr.damage}`,
              pr.weaponId === 'sniper'
                ? '#67E8F9'
                : pr.weaponId === 'winchester' || pr.weaponId === 'maxim'
                  ? '#FEF08A'
                  : '#F8FAFC',
              pr.weaponId === 'winchester' || pr.weaponId === 'sniper' ? 1.05 : 0.9
            );

            p.deadeye = Math.min(100, p.deadeye + 6);

            if (e.hp <= 0) {
              this.handleEnemyKilled(ei);
            } else {
              e.alertState = 'ALERTED';
              this.alertNearbyEnemies(e.x, e.y, 260, p.x, p.y, 'ALERTED');
            }

            pr.penetrationLeft -= 1;
            if (pr.penetrationLeft <= 0) {
              this.projectiles.splice(i, 1);
              removed = true;
              break;
            }
          }
        }

        // Check player projectile hitting wild animals
        if (!removed && this.animals.length > 0) {
          for (let ai = this.animals.length - 1; ai >= 0; ai--) {
            const a = this.animals[ai];
            if (pr.hitIds.has(a.id)) continue;
            const dist = Math.hypot(pr.x - a.x, pr.y - a.y);
            if (dist <= pr.radius + a.radius) {
              pr.hitIds.add(a.id);
              this.shotsHit += 1;
              a.hp -= pr.damage;
              a.hitFlash = 0.14;
              a.state = a.behavior === 'flee' ? 'STARTLED' : 'AGGRO';
              a.stateTimer = 5.5;
              const spd = Math.hypot(pr.vx, pr.vy) || 1;
              a.x += (pr.vx / spd) * (pr.knockback * 0.035);
              a.y += (pr.vy / spd) * (pr.knockback * 0.035);

              this.audio.playHit('flesh');
              this.spawnSparks(pr.x, pr.y, '#DC2626', 6);
              this.addFloatingText(
                a.x,
                a.y - a.radius - 10,
                `-${pr.damage}`,
                pr.weaponId === 'sniper' ? '#67E8F9' : '#FEF08A',
                1.0
              );

              if (a.hp <= 0) {
                this.handleAnimalKilled(ai);
              }

              pr.penetrationLeft -= 1;
              if (pr.penetrationLeft <= 0) {
                this.projectiles.splice(i, 1);
                removed = true;
                break;
              }
            }
          }
        }
      } else {
        // Enemy bullet hitting player or allied Posse riders
        let hitTarget = false;
        for (let ai = this.allies.length - 1; ai >= 0; ai--) {
          const al = this.allies[ai];
          const dAlly = Math.hypot(pr.x - al.x, pr.y - al.y);
          if (dAlly <= pr.radius + al.radius) {
            al.hp -= pr.damage;
            al.hitFlash = 0.14;
            this.audio.playHit('flesh');
            this.spawnSparks(pr.x, pr.y, '#60A5FA', 5);
            if (al.hp <= 0) {
              this.addFloatingText(al.x, al.y - 24, `سقط ${al.nameAr}!`, '#FCA5A5', 1.05);
              this.allies.splice(ai, 1);
            }
            this.projectiles.splice(i, 1);
            hitTarget = true;
            break;
          }
        }
        if (hitTarget) continue;

        if (p.invulnTimer <= 0) {
          const dist = Math.hypot(pr.x - p.x, pr.y - p.y);
          if (dist <= pr.radius + p.radius) {
            this.damagePlayer(pr.damage);
            this.projectiles.splice(i, 1);
          }
        }
      }
    }
  }

  private spawnPosse(): void {
    const roster: Array<{
      role: AllyRole;
      nameAr: string;
      coat: string;
      hat: string;
      dmg: number;
      range: number;
    }> = [
      {
        role: 'deputy',
        nameAr: 'النائب سام',
        coat: '#1D4ED8',
        hat: '#92400E',
        dmg: 22,
        range: 460,
      },
      {
        role: 'rifleman',
        nameAr: 'الرامية روز',
        coat: '#0F766E',
        hat: '#451A03',
        dmg: 28,
        range: 560,
      },
      {
        role: 'brawler',
        nameAr: 'المشاكس جاك',
        coat: '#B45309',
        hat: '#292524',
        dmg: 32,
        range: 340,
      },
      {
        role: 'sharpshooter',
        nameAr: 'القناص وايت',
        coat: '#4338CA',
        hat: '#1E293B',
        dmg: 42,
        range: 680,
      },
    ];

    const count = Math.min(roster.length, this.effectiveStats.posseCount);
    const maxHp = this.effectiveStats.posseHp;
    const dmgMult = this.effectiveStats.posseDamageMult;

    for (let i = 0; i < count; i++) {
      const cfg = roster[i];
      const ang = (i - (count - 1) / 2) * 0.9 + Math.PI;
      const sx = Math.max(
        60,
        Math.min(this.blueprint.worldWidth - 60, this.player.x + Math.cos(ang) * 58)
      );
      const sy = Math.max(
        60,
        Math.min(this.blueprint.worldHeight - 60, this.player.y + Math.sin(ang) * 58)
      );
      this.allies.push({
        id: this.nextEntityId++,
        role: cfg.role,
        nameAr: cfg.nameAr,
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        radius: 15,
        hp: maxHp,
        maxHp,
        angle: 0,
        shootCooldown: 0.4 + i * 0.25,
        hitFlash: 0,
        walkCycle: i * 1.4,
        coatColor: cfg.coat,
        hatColor: cfg.hat,
        speed: 225 * this.effectiveStats.posseSpeedMult,
        damage: Math.round(cfg.dmg * dmgMult),
        range: cfg.range,
      });
    }
  }

  private updateAllies(dt: number): void {
    const p = this.player;
    if (this.allies.length === 0) return;
    if (this.quickDrawPhase === 'WAIT') return;

    const fireRateMult = this.effectiveStats.posseFireRateMult;

    for (let idx = 0; idx < this.allies.length; idx++) {
      const al = this.allies[idx];
      if (al.hitFlash > 0) al.hitFlash -= dt;
      if (al.shootCooldown > 0) al.shootCooldown -= dt;

      // Follow formation position around player
      const formAng = ((idx + 1) / (this.allies.length + 1)) * Math.PI * 1.2 + Math.PI * 0.4;
      const slotX = p.x + Math.cos(formAng) * 72;
      const slotY = p.y + Math.sin(formAng) * 72;

      // Pick nearest valid enemy target
      let target: Enemy | null = null;
      let bestDist = al.range;
      for (const e of this.enemies) {
        if (this.posseHold && e.alertState !== 'ALERTED') continue;
        const d = Math.hypot(e.x - al.x, e.y - al.y);
        if (d < bestDist && this.hasLineOfSight(al.x, al.y, e.x, e.y)) {
          bestDist = d;
          target = e;
        }
      }

      const toSlotX = slotX - al.x;
      const toSlotY = slotY - al.y;
      const distToSlot = Math.hypot(toSlotX, toSlotY);

      if (distToSlot > 26) {
        const stepSpeed =
          distToSlot > 210 ? al.speed * 1.32 : al.speed;
        al.vx = (toSlotX / distToSlot) * stepSpeed;
        al.vy = (toSlotY / distToSlot) * stepSpeed;
        al.walkCycle += dt * 10;
      } else {
        al.vx = 0;
        al.vy = 0;
      }

      // Mild separation between allies
      for (let j = 0; j < this.allies.length; j++) {
        if (j === idx) continue;
        const other = this.allies[j];
        const sdx = al.x - other.x;
        const sdy = al.y - other.y;
        const sd = Math.hypot(sdx, sdy);
        if (sd > 0 && sd < 34) {
          al.vx += (sdx / sd) * 90;
          al.vy += (sdy / sd) * 90;
        }
      }

      this.moveCircleWithObstacles(al, al.vx * dt, al.vy * dt);

      if (this.stageId === 'train_heist') {
        al.x = Math.max(145, Math.min(2265, al.x));
        al.y = Math.max(276, Math.min(522, al.y));
      } else {
        al.x = Math.max(40, Math.min(this.blueprint.worldWidth - 40, al.x));
        al.y = Math.max(40, Math.min(this.blueprint.worldHeight - 40, al.y));
      }

      if (target) {
        al.angle = Math.atan2(target.y - al.y, target.x - al.x);
        if (al.shootCooldown <= 0) {
          const ang = al.angle + (Math.random() - 0.5) * 0.06;
          const mx = al.x + Math.cos(ang) * 20;
          const my = al.y + Math.sin(ang) * 20;
          const spd = al.role === 'sharpshooter' ? 1280 : 960;
          this.projectiles.push({
            id: this.nextEntityId++,
            fromPlayer: true,
            weaponId: al.role === 'rifleman' || al.role === 'sharpshooter' ? 'winchester' : 'revolver',
            x: mx,
            y: my,
            prevX: al.x,
            prevY: al.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            damage: al.damage,
            radius: 3.4,
            life: 1.25,
            penetrationLeft: 1,
            hitIds: new Set<number>(),
            knockback: 140,
            color: '#60A5FA',
          });
          this.audio.playRevolverShot();
          al.shootCooldown =
            (al.role === 'sharpshooter' ? 1.15 : al.role === 'brawler' ? 0.62 : 0.85) *
            Math.max(0.55, fireRateMult);
        }
      } else if (Math.hypot(al.vx, al.vy) > 10) {
        al.angle = Math.atan2(al.vy, al.vx);
      } else {
        al.angle = p.angle;
      }
    }
  }

  private handleObstacleDestroyed(o: Obstacle): void {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;

    if (o.type === 'barrel_tnt') {
      this.triggerExplosion(cx, cy, 138, 135);
      return;
    }

    if (o.type === 'safe_vault') {
      this.safeCracked = true;
      this.triggerExplosion(cx, cy, 85, 60);
      this.bounty += 650;
      this.goldLooted += 650;
      this.addFloatingText(cx, cy - 20, '+$650 ذهب الخزنة!', '#FBBF24', 1.35);
      this.showBanner('فُتحت خزنة الذهب! +$650 — تقدم نحو القاطرة!', 2.6);
      for (let g = 0; g < 5; g++) {
        this.pickups.push({
          id: this.nextEntityId++,
          type: g === 0 ? 'health' : g === 1 ? 'ammo' : 'gold',
          x: cx + (Math.random() - 0.5) * 70,
          y: cy + (Math.random() - 0.5) * 60,
          radius: 12,
          life: 25,
          bobPhase: Math.random() * 6,
          value: 100,
        });
      }
      return;
    }

    if (o.type === 'brake_lever') {
      this.brakePulled = true;
      this.audio.playTrainWhistle();
      this.spawnSparks(cx, cy, '#FBBF24', 16);
      this.addFloatingText(cx, cy - 20, 'تم تعطيل كابح القاطرة!', '#34D399', 1.25);
      return;
    }

    if (o.type === 'target_dummy') {
      this.bounty += 45;
      this.audio.playHit('wood');
      this.spawnSparks(cx, cy, '#EF4444', 12);
      this.addFloatingText(cx, cy - 18, 'هدف محطّم! +$45', '#34D399', 1.05);
      return;
    }

    // Standard crate
    this.spawnSparks(cx, cy, '#A87447', 12);
    if (Math.random() < 0.45) {
      this.pickups.push({
        id: this.nextEntityId++,
        type: Math.random() < 0.5 ? 'health' : 'ammo',
        x: cx,
        y: cy,
        radius: 12,
        life: 20,
        bobPhase: 0,
        value: 25,
      });
    }
  }

  private triggerExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    skipPlayerDamage = false
  ): void {
    this.audio.playExplosion();
    this.shakeMag = Math.max(this.shakeMag, 16);
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);

    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 260;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 8 + Math.random() * 14,
        life: 0.45 + Math.random() * 0.25,
        color: i % 3 === 0 ? '#FEF08A' : i % 3 === 1 ? '#F97316' : '#4B5563',
        drag: 0.91,
        kind: i % 3 === 2 ? 'smoke' : 'ember',
      });
    }

    // Damage animals in blast radius
    for (let ai = this.animals.length - 1; ai >= 0; ai--) {
      const a = this.animals[ai];
      const dist = Math.hypot(a.x - x, a.y - y);
      if (dist <= radius + a.radius) {
        const falloff = 1 - (dist / (radius + a.radius)) * 0.45;
        const dmg = Math.round(damage * falloff);
        a.hp -= dmg;
        a.hitFlash = 0.16;
        a.state = a.behavior === 'flee' ? 'STARTLED' : 'AGGRO';
        a.stateTimer = 5.0;
        if (a.hp <= 0) {
          this.handleAnimalKilled(ai);
        }
      }
    }

    // Damage enemies in blast radius
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei];
      const dist = Math.hypot(e.x - x, e.y - y);
      if (dist <= radius + e.radius) {
        const falloff = 1 - (dist / (radius + e.radius)) * 0.45;
        const dmg = Math.round(damage * falloff);
        e.hp -= dmg;
        e.hitFlash = 0.16;
        e.alertState = 'ALERTED';
        this.addFloatingText(e.x, e.y - 24, `-${dmg} انفجار!`, '#FB923C', 1.15);
        if (e.hp <= 0) {
          this.handleEnemyKilled(ei);
        }
      }
    }

    // Damage destructible obstacles (crates, Train Safe, Brake Lever) in blast radius
    for (const o of this.obstacles) {
      if (!o.destructible || o.hp <= 0) continue;
      const ox = o.x + o.w / 2;
      const oy = o.y + o.h / 2;
      const dist = Math.hypot(ox - x, oy - y);
      if (dist <= radius + Math.max(o.w, o.h) * 0.4) {
        if (o.type === 'barrel_tnt') {
          o.hp = 0;
          this.triggerExplosion(ox, oy, 130, 125, false);
        } else {
          o.hp -= damage;
          o.hitFlash = 0.15;
          if (o.hp <= 0) {
            this.handleObstacleDestroyed(o);
          }
        }
      }
    }

    // Damage player if inside blast & not invulnerable
    if (!skipPlayerDamage) {
      const pDist = Math.hypot(this.player.x - x, this.player.y - y);
      if (pDist <= radius && this.player.invulnTimer <= 0) {
        this.damagePlayer(Math.round(damage * 0.35));
      }
    }
  }

  private handleAnimalKilled(index: number): void {
    const a = this.animals[index];
    this.animals.splice(index, 1);

    this.kills += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 3.5;

    const cleanKill =
      this.player.activeWeapon === 'sniper' ||
      this.player.activeWeapon === 'winchester' ||
      this.player.activeWeapon === 'bow';
    const bowCleanBonus = this.player.activeWeapon === 'bow' ? 25 : 0;
    this.bounty += 25 + bowCleanBonus;

    this.hitstopTimer = Math.max(
      this.hitstopTimer,
      WEAPONS[this.player.activeWeapon].hitstopSec
    );
    this.shakeMag = Math.max(this.shakeMag, 5);

    this.callbacks.onAnimalHunted?.(a.species, cleanKill);
    this.addFloatingText(
      a.x,
      a.y - 26,
      `+1 ${a.lootNameAr} ($${a.sellPrice})`,
      '#34D399',
      1.15
    );

    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 45 + Math.random() * 120;
      this.spawnParticle({
        x: a.x,
        y: a.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 4 + Math.random() * 4,
        life: 0.38,
        color: i % 2 === 0 ? '#991B1B' : '#B47B48',
        drag: 0.9,
        kind: 'blood',
      });
    }

    if (Math.random() < 0.4) {
      this.pickups.push({
        id: this.nextEntityId++,
        type: Math.random() < 0.55 ? 'health' : 'ammo',
        x: a.x,
        y: a.y,
        radius: 12,
        life: 18,
        bobPhase: Math.random() * 6,
        value: 25,
      });
    }
  }

  private handleEnemyKilled(index: number): void {
    const e = this.enemies[index];
    const wasUnseen = e.alertState !== 'ALERTED';
    this.enemies.splice(index, 1);

    this.kills += 1;
    if (wasUnseen && this.stageId === 'sniper_hunt') {
      this.stealthKills += 1;
    }
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 3.5;

    // Only nearby gang buddies notice the body falling, not the whole map!
    if (this.stageId === 'sniper_hunt') {
      this.alertNearbyEnemies(e.x, e.y, 210, e.x, e.y, 'SUSPICIOUS');
    }

    const sniperHuntBonus =
      this.stageId === 'sniper_hunt' &&
      (this.player.activeWeapon === 'sniper' || this.player.activeWeapon === 'bow')
        ? wasUnseen
          ? 125
          : 75
        : 0;
    const bonus =
      e.bounty + (this.combo > 1 ? (this.combo - 1) * 25 : 0) + sniperHuntBonus;
    this.bounty += bonus;

    this.hitstopTimer = Math.max(
      this.hitstopTimer,
      e.isBoss ? 0.08 : WEAPONS[this.player.activeWeapon].hitstopSec
    );
    this.shakeMag = Math.max(this.shakeMag, e.isBoss ? 14 : 6);

    this.addFloatingText(e.x, e.y - 26, `+$${bonus}`, '#FBBF24', 1.1);
    if (sniperHuntBonus > 0) {
      this.addFloatingText(
        e.x,
        e.y - 44,
        wasUnseen
          ? `قنص خفي متقن! +$${sniperHuntBonus}`
          : `صيد قناص! +$${sniperHuntBonus}`,
        '#67E8F9',
        1.08
      );
    }

    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 140;
      this.spawnParticle({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 4 + Math.random() * 5,
        life: 0.4 + Math.random() * 0.2,
        color: i % 2 === 0 ? '#991B1B' : '#D6B180',
        drag: 0.9,
        kind: 'blood',
      });
    }

    // Drop pickup
    const roll = Math.random();
    if (roll < 0.48) {
      const pType =
        this.player.hp < 55 && Math.random() < 0.55
          ? 'health'
          : Math.random() < 0.55
            ? 'ammo'
            : Math.random() < 0.65
              ? 'gold'
              : 'deadeye';
      this.pickups.push({
        id: this.nextEntityId++,
        type: pType,
        x: e.x,
        y: e.y,
        radius: 12,
        life: 18,
        bobPhase: Math.random() * 6,
        value: pType === 'gold' ? 120 : 25,
      });
    }
  }

  private damagePlayer(amount: number): void {
    const p = this.player;
    let remainingDmg = amount;

    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, Math.ceil(amount * 0.75));
      p.armor = Math.max(0, p.armor - absorbed);
      remainingDmg = Math.max(1, amount - absorbed);
      this.spawnSparks(p.x, p.y, '#60A5FA', 6);
      this.audio.playHit('metal');
    } else {
      this.audio.playHit('flesh');
    }

    p.hp = Math.max(0, p.hp - remainingDmg);
    p.hitFlash = 0.22;
    p.invulnTimer = 0.45;
    p.regenDelayTimer = 3.2;
    this.shakeMag = Math.max(this.shakeMag, 10);
    this.combo = 0;
    this.addFloatingText(p.x, p.y - 28, `-${remainingDmg}`, '#EF4444', 1.15);

    if (p.hp <= 0 && !this.stageEnded) {
      this.stageEnded = true;
      this.running = false;
      this.emitHud();
      this.callbacks.onGameOver(this.stageId, this.collectStats());
    }
  }

  private updateDynamites(dt: number): void {
    for (let i = this.dynamites.length - 1; i >= 0; i--) {
      const d = this.dynamites[i];
      if (d.flightProgress < 1) {
        d.flightProgress = Math.min(1, d.flightProgress + dt * 1.9);
        d.x = d.startX + (d.targetX - d.startX) * d.flightProgress;
        d.y = d.startY + (d.targetY - d.startY) * d.flightProgress;
      } else {
        d.fuseTimer -= dt;
        if (Math.random() < 0.5) {
          this.spawnParticle({
            x: d.x + 5,
            y: d.y - 5,
            vx: (Math.random() - 0.5) * 50,
            vy: -40 - Math.random() * 40,
            size: 3,
            life: 0.22,
            color: '#FDE047',
            drag: 0.92,
            kind: 'spark',
          });
        }
        if (d.fuseTimer <= 0) {
          this.dynamites.splice(i, 1);
          this.triggerExplosion(
            d.x,
            d.y,
            d.blastRadius,
            d.damage,
            Boolean(d.fromPlayer)
          );
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.bobPhase += dt * 4;
      pk.life -= dt;
      if (pk.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }

      const dist = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (dist <= pk.radius + p.radius + 8) {
        this.audio.playPickup();
        if (pk.type === 'health') {
          const healAmt = Math.max(28, Math.round(p.maxHp * 0.28));
          p.hp = Math.min(p.maxHp, p.hp + healAmt);
          this.addFloatingText(p.x, p.y - 24, `+${healAmt} صحة`, '#34D399', 1.05);
        } else if (pk.type === 'ammo') {
          p.revolverReserve += 18;
          p.winchesterReserve += 10;
          p.sniperReserve += 5;
          p.maximReserve += 40;
          p.shotgunReserve += 6;
          p.dualReserve += 24;
          p.bowReserve += 8;
          if (p.dynamiteCount < MAX_DYNAMITE && Math.random() < 0.45) {
            p.dynamiteCount += 1;
            this.callbacks.onDynamiteUsed?.(p.dynamiteCount);
            this.addFloatingText(p.x, p.y - 24, '+ذخيرة وديناميت!', '#FDE047', 1.05);
          } else {
            this.addFloatingText(p.x, p.y - 24, '+ذخيرة', '#FDE047', 1.0);
          }
        } else if (pk.type === 'deadeye') {
          p.deadeye = Math.min(100, p.deadeye + 35);
          this.addFloatingText(p.x, p.y - 24, '+عين الصقر', '#38BDF8', 1.0);
        } else {
          this.bounty += pk.value;
          this.goldLooted += pk.value;
          this.addFloatingText(p.x, p.y - 24, `+$${pk.value} ذهب`, '#FBBF24', 1.1);
        }
        this.pickups.splice(i, 1);
      }
    }
  }

  private checkStageProgression(dt: number): void {
    if (this.stageEnded) return;

    if (this.stageId === 'train_heist') {
      // Advance train car waves as player moves rightward or clears guards
      if (
        this.trainCarStage === 0 &&
        (this.player.x > 1100 || this.enemies.length === 0)
      ) {
        this.spawnTrainWave(1);
      } else if (
        this.trainCarStage === 1 &&
        this.safeCracked &&
        (this.player.x > 1680 || this.enemies.length === 0)
      ) {
        this.spawnTrainWave(2);
      } else if (
        this.trainCarStage === 2 &&
        this.brakePulled &&
        this.enemies.length === 0
      ) {
        this.trainStopped = true;
        this.completeStage();
      }
      return;
    }

    if (this.enemies.length === 0 && this.animals.length === 0) {
      this.waveClearDelay += dt;
      if (this.waveClearDelay >= 1.1) {
        this.waveClearDelay = 0;
        if (this.waveIndex + 1 < this.blueprint.waves.length) {
          // Small wave heal & ammo refill
          this.player.hp = Math.min(
            this.player.maxHp,
            this.player.hp + this.effectiveStats.waveHeal
          );
          this.player.revolverReserve += 12;
          this.player.winchesterReserve += 8;
          this.player.sniperReserve += 5;
          this.player.maximReserve += 30;
          this.player.shotgunReserve += 4;
          this.player.dualReserve += 18;
          this.player.bowReserve += 6;
          for (const al of this.allies) {
            al.hp = Math.min(al.maxHp, al.hp + Math.round(al.maxHp * 0.35));
          }
          if (this.posseEnabled && this.allies.length === 0) {
            this.spawnPosse();
          }
          this.spawnWave(this.waveIndex + 1);
        } else {
          this.completeStage();
        }
      }
    }
  }

  private completeStage(): void {
    if (this.stageEnded) return;
    this.stageEnded = true;
    this.running = false;
    this.audio.playStageClear();
    this.emitHud();
    this.callbacks.onStageClear(this.stageId, this.collectStats());
  }

  private collectStats(): StageStats {
    return {
      bountyEarned: this.bounty,
      kills: this.kills,
      stealthKills: this.stealthKills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      maxCombo: this.maxCombo,
      timeSeconds: Math.round(this.stageElapsed),
      goldLooted: this.goldLooted,
    };
  }

  private spawnParticle(cfg: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    color: string;
    drag: number;
    kind: Particle['kind'];
    vRot?: number;
  }): void {
    if (this.particles.length > 260) {
      this.particles.shift();
    }
    this.particles.push({
      x: cfg.x,
      y: cfg.y,
      vx: cfg.vx,
      vy: cfg.vy,
      size: cfg.size,
      alpha: 1,
      life: cfg.life,
      maxLife: cfg.life,
      color: cfg.color,
      drag: cfg.drag,
      kind: cfg.kind,
      rotation: Math.random() * Math.PI * 2,
      vRot: cfg.vRot ?? 0,
    });
  }

  private spawnSparks(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 140;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2.5 + Math.random() * 3,
        life: 0.25 + Math.random() * 0.15,
        color,
        drag: 0.9,
        kind: 'spark',
      });
    }
  }

  private addFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1
  ): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -38,
      text,
      color,
      life: 0.85,
      maxLife: 0.85,
      scale,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      const dragFactor = Math.pow(pt.drag, dt * 60);
      pt.vx *= dragFactor;
      pt.vy *= dragFactor;
      pt.rotation += pt.vRot * dt;
      pt.life -= dt;
      pt.alpha = Math.max(0, pt.life / pt.maxLife);
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateTumbleweeds(dt: number): void {
    for (const tw of this.tumbleweeds) {
      tw.x += tw.vx * dt;
      tw.y += tw.vy * dt + Math.sin(this.stageElapsed * 2 + tw.x * 0.01) * 14 * dt;
      tw.rot += dt * 3.2;
      if (tw.x > this.blueprint.worldWidth + 60) {
        tw.x = -50;
        tw.y = 120 + Math.random() * (this.blueprint.worldHeight - 240);
      }
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private emitHud(): void {
    const meta = STAGES.find((s) => s.id === this.stageId) ?? STAGES[0];
    const boss = this.enemies.find((e) => e.isBoss);
    const p = this.player;
    const reloadProg = p.isReloading
      ? Math.min(1, p.reloadTimer / p.reloadDuration)
      : 0;

    const stealthAlertCount = this.enemies.filter(
      (e) => e.alertState === 'ALERTED'
    ).length;

    let dynamicObj = meta.objectiveAr;
    if (this.stageId === 'train_heist') {
      if (!this.safeCracked) {
        dynamicObj = 'تقدم إلى العربة 3 وفجّر خزنة الذهب';
      } else if (!this.brakePulled) {
        dynamicObj = 'تقدم إلى القاطرة ودمّر كابح القطار';
      } else {
        dynamicObj = 'اقضِ على بقية الحرس لإيقاف القطار';
      }
    } else if (this.stageId === 'training_camp') {
      const targetsLeft = this.obstacles.filter(
        (o) => o.type === 'target_dummy' && o.hp > 0
      ).length;
      dynamicObj = `ميدان التدريب · أهداف: ${targetsLeft} · خصوم: ${this.enemies.length}`;
    } else if (this.stageId === 'sniper_hunt') {
      dynamicObj =
        stealthAlertCount === 0
          ? `متخفٍ تماماً · العصابة غافلة (${this.enemies.length} متبقي)`
          : `انتبه! ${stealthAlertCount} كشفوك · باقٍ ${this.enemies.length}`;
    } else if (this.stageId === 'hunting_grounds') {
      dynamicObj = `سهول الصيد · طرائد باقية في المنطقة: ${this.animals.length}`;
    }

    this.callbacks.onHudUpdate({
      stageId: this.stageId,
      stageTitleAr: meta.titleAr,
      objectiveAr: dynamicObj,
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      armor: Math.ceil(p.armor),
      maxArmor: p.maxArmor,
      tonicsCount: p.tonicsCount,
      dynamiteCount: p.dynamiteCount,
      maxDynamite: MAX_DYNAMITE,
      walkMode: p.walkMode,
      deadeye: Math.round(p.deadeye),
      deadeyeActive: p.deadeyeActive,
      dodgeCooldownPct:
        p.dodgeCooldown <= 0
          ? 1
          : Math.max(
              0,
              1 - p.dodgeCooldown / this.effectiveStats.dodgeCooldownBase
            ),
      activeWeapon: p.activeWeapon,
      scopeOpen: this.scopeOpen && p.activeWeapon === 'sniper',
      scopeZoom: this.scopeZoom,
      revolverAmmo: p.revolverAmmo,
      revolverMag: WEAPONS.revolver.magSize,
      revolverReserve: p.revolverReserve,
      revolverCylinderAngle: p.revolverCylinderAngle,
      winchesterAmmo: p.winchesterAmmo,
      winchesterMag: WEAPONS.winchester.magSize,
      winchesterReserve: p.winchesterReserve,
      sniperAmmo: p.sniperAmmo,
      sniperMag: WEAPONS.sniper.magSize,
      sniperReserve: p.sniperReserve,
      maximAmmo: p.maximAmmo,
      maximMag: WEAPONS.maxim.magSize,
      maximReserve: p.maximReserve,
      shotgunAmmo: p.shotgunAmmo,
      shotgunMag: WEAPONS.shotgun.magSize,
      shotgunReserve: p.shotgunReserve,
      dualAmmo: p.dualAmmo,
      dualMag: WEAPONS.dual_pistols.magSize,
      dualReserve: p.dualReserve,
      bowAmmo: p.bowAmmo,
      bowMag: WEAPONS.bow.magSize,
      bowReserve: p.bowReserve,
      isReloading: p.isReloading,
      reloadProgress: reloadProg,
      activeReloadAvailable:
        p.isReloading && !p.activeReloadTried && reloadProg >= 0.42 && reloadProg <= 0.72,
      activeReloadBuffTimer: p.activeReloadBuffTimer,
      bounty: this.bounty,
      combo: this.combo,
      comboTimerPct: this.combo > 0 ? Math.max(0, this.comboTimer / 3.5) : 0,
      waveIndex: this.waveIndex + 1,
      totalWaves: this.blueprint.waves.length,
      enemiesAlive: this.enemies.length,
      animalsAlive: this.animals.length,
      stealthAlertCount,
      alliesAlive: this.allies.length,
      alliesTotal: this.posseEnabled ? this.effectiveStats.posseCount : 0,
      posseHold: this.posseHold,
      bossNameAr: boss ? boss.nameAr : null,
      bossHp: boss ? Math.max(0, Math.ceil(boss.hp)) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      quickDrawPhase: this.quickDrawPhase,
      quickDrawBannerAr: this.quickDrawBanner,
      trainProgressPct:
        this.stageId === 'train_heist'
          ? Math.min(100, Math.max(0, Math.round(((p.x - 160) / 2050) * 100)))
          : null,
      bannerMessageAr: this.bannerMsg,
    });
  }

  // =========================================================================
  // RENDERING
  // =========================================================================

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Base backdrop fill outside world
    ctx.fillStyle = '#120A06';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    // Camera shake offset & telescopic sniper zoom transform
    const sx = (Math.random() - 0.5) * this.shakeMag * 2;
    const sy = (Math.random() - 0.5) * this.shakeMag * 2;
    const z = this.currentZoom || 1;
    const centerX = Math.round(this.camX + this.viewW / 2);
    const centerY = Math.round(this.camY + this.viewH / 2);

    ctx.translate(this.viewW / 2 + sx, this.viewH / 2 + sy);
    ctx.scale(z, z);
    ctx.translate(-centerX, -centerY);

    if (this.stageId === 'train_heist') {
      this.renderTrainWorld(ctx);
    } else {
      this.renderDesertOrTownWorld(ctx);
    }

    this.renderObstacles(ctx);
    this.renderPickups(ctx);
    this.renderDynamites(ctx);
    this.renderTumbleweeds(ctx);
    this.renderAnimals(ctx);
    this.renderAllies(ctx);
    this.renderEnemies(ctx);
    this.renderPlayer(ctx);
    this.renderProjectiles(ctx);
    this.renderParticles(ctx);
    this.renderFloatingTexts(ctx);

    // Train objective arrow guide
    if (this.stageId === 'train_heist') {
      this.renderTrainObjectivePointer(ctx);
    }

    ctx.restore();

    // Deadeye screen vignette & warm sepia overlay
    if (this.player.deadeyeActive) {
      const grad = ctx.createRadialGradient(
        this.viewW / 2,
        this.viewH / 2,
        this.viewH * 0.28,
        this.viewW / 2,
        this.viewH / 2,
        this.viewW * 0.72
      );
      grad.addColorStop(0, 'rgba(217, 155, 38, 0.08)');
      grad.addColorStop(1, 'rgba(120, 40, 8, 0.48)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }

    // Player hit flash vignette
    if (this.player.hitFlash > 0) {
      ctx.fillStyle = `rgba(185, 28, 28, ${this.player.hitFlash * 1.4})`;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }

    // Telescopic Brass Sniper Scope Overlay vs Standard Crosshair
    if (this.scopeOpen && this.player.activeWeapon === 'sniper') {
      this.renderSniperScopeOverlay(ctx);
    } else {
      this.renderCrosshair(ctx);
    }
  }

  private renderDesertOrTownWorld(ctx: CanvasRenderingContext2D): void {
    const w = this.blueprint.worldWidth;
    const h = this.blueprint.worldHeight;

    ctx.fillStyle = this.blueprint.theme.groundBase;
    ctx.fillRect(0, 0, w, h);

    // Golden-hour sunset sky strip & mesas along northern horizon (cover-art palette)
    const horizonH = 82;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonH);
    skyGrad.addColorStop(0, '#5B1F3A');
    skyGrad.addColorStop(0.45, '#B84A2C');
    skyGrad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonH);

    // Glowing cream pixel sun on horizon
    const sunX = Math.round(w * 0.62);
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(sunX, horizonH - 4, 34, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.arc(sunX, horizonH - 4, 22, Math.PI, Math.PI * 2);
    ctx.fill();

    // Distant purple-brown stepped pixel mesas along the horizon
    ctx.fillStyle = '#4A1F24';
    for (let mx = 0; mx < w; mx += 260) {
      ctx.fillRect(mx + 20, horizonH - 22, 110, 22);
      ctx.fillRect(mx + 42, horizonH - 32, 66, 12);
      ctx.fillRect(mx + 150, horizonH - 16, 85, 16);
    }
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(0, horizonH - 2, w, 4);

    // Warm golden dirt floor & Dan-the-Man pixel tile grid
    const tileSize = 64;
    ctx.fillStyle = this.blueprint.theme.groundAccent;
    for (let x = 0; x < w; x += tileSize) {
      for (let y = horizonH; y < h; y += tileSize) {
        if (((x / tileSize + y / tileSize) & 1) === 0) {
          ctx.globalAlpha = 0.2;
          ctx.fillRect(x, y, tileSize, tileSize);
        }
        // Pixel pebbles & desert cracks
        if ((x * 7 + y * 13) % 5 === 0) {
          ctx.globalAlpha = 0.42;
          ctx.fillRect(x + 14, y + 20, 8, 4);
          ctx.fillRect(x + 18, y + 24, 6, 4);
        }
      }
    }
    ctx.globalAlpha = 1;

    // Ghost town wooden boardwalks with pixel planks & main street wheel tracks
    if (this.stageId === 'ghost_town') {
      const drawBoardwalk = (bx: number, by: number, bw: number, bh: number) => {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
        ctx.fillStyle = '#8C522B';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#B87442';
        ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = '#4A2B16';
        for (let px = bx + 16; px < bx + bw; px += 20) {
          ctx.fillRect(px, by, 3, bh);
        }
      };
      drawBoardwalk(240, 220, 1060, 26);
      drawBoardwalk(240, 834, 1060, 26);

      // Wagon wheel pixel ruts along Main Street
      ctx.fillStyle = 'rgba(54, 30, 14, 0.34)';
      ctx.fillRect(40, 502, w - 80, 6);
      ctx.fillRect(40, 572, w - 80, 6);
    }

    // Hunting Grounds watering hole & prairie grass tufts
    if (this.stageId === 'hunting_grounds') {
      // Frontier creek / watering pond in valley center
      ctx.fillStyle = '#0B0705';
      ctx.beginPath();
      ctx.ellipse(900, 650, 115, 58, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0E7490';
      ctx.beginPath();
      ctx.ellipse(900, 650, 108, 52, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(855, 636, 42, 4);
      ctx.fillRect(910, 656, 36, 4);

      // Green pixel grass clumps across prairie
      ctx.fillStyle = '#4D7C0F';
      for (let gx = 120; gx < w - 120; gx += 180) {
        for (let gy = 140; gy < h - 120; gy += 190) {
          if ((gx + gy) % 3 === 0) {
            ctx.fillRect(gx, gy, 4, 9);
            ctx.fillRect(gx + 6, gy - 2, 4, 11);
            ctx.fillRect(gx + 12, gy + 1, 4, 8);
          }
        }
      }
    }

    // Sunset dramatic light for Boss Duel
    if (this.stageId === 'boss_duel') {
      const sunGrad = ctx.createLinearGradient(0, 0, w, 0);
      sunGrad.addColorStop(0, 'rgba(20, 10, 8, 0.25)');
      sunGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.12)');
      sunGrad.addColorStop(1, 'rgba(220, 38, 38, 0.22)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (this.stageId === 'training_camp') {
      // Painted chalk firing line & range distance markers
      ctx.fillStyle = 'rgba(248, 250, 252, 0.35)';
      ctx.fillRect(340, 95, 6, h - 175);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.24)';
      ctx.fillRect(720, 95, 4, h - 175);
      ctx.fillRect(1080, 95, 4, h - 175);
    } else if (this.stageId === 'sniper_hunt') {
      // Deep Red Canyon rim atmosphere
      const canyonGrad = ctx.createLinearGradient(0, 0, w, 0);
      canyonGrad.addColorStop(0, 'rgba(127, 29, 29, 0.06)');
      canyonGrad.addColorStop(1, 'rgba(127, 29, 29, 0.2)');
      ctx.fillStyle = canyonGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Chunky pixel-outlined arena border
    ctx.strokeStyle = '#0B0705';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.strokeStyle = '#5A3A21';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  }

  private renderTrainWorld(ctx: CanvasRenderingContext2D): void {
    const w = this.blueprint.worldWidth;
    const h = this.blueprint.worldHeight;

    // Rushing desert ground underneath train
    ctx.fillStyle = '#B87B4B';
    ctx.fillRect(0, 0, w, h);

    // Speed-scrolling desert brush & rocks
    const scrollOff = this.trainScroll % 360;
    ctx.fillStyle = '#9C5E34';
    for (let x = -scrollOff; x < w + 360; x += 360) {
      ctx.beginPath();
      ctx.ellipse(x + 90, 120, 48, 22, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 240, 690, 62, 26, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Passing desert cactus silhouettes outside tracks
      ctx.fillStyle = '#4B6B36';
      ctx.fillRect(x + 170, 95, 10, 26);
      ctx.fillRect(x + 50, 660, 12, 30);
      ctx.fillStyle = '#9C5E34';
    }

    // Gravel track bed
    ctx.fillStyle = '#594A3E';
    ctx.fillRect(0, 232, w, 336);

    // Rushing wooden railroad ties
    const tieOff = this.trainScroll % 44;
    ctx.fillStyle = '#3A2618';
    for (let x = -tieOff; x < w + 44; x += 44) {
      ctx.fillRect(x, 245, 14, 310);
    }

    // Twin steel rails
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(0, 275, w, 6);
    ctx.fillRect(0, 519, w, 6);

    // Draw 4 Train Cars + Couplings
    const cars = [
      { x1: 110, x2: 580, floor: '#7A5230', name: 'عربة المؤخرة' },
      { x1: 640, x2: 1120, floor: '#6E4728', name: 'عربة البضائع' },
      { x1: 1180, x2: 1700, floor: '#5A3A22', name: 'عربة الخزنة المدرعة' },
      { x1: 1760, x2: 2300, floor: '#3A3B3E', name: 'القاطرة البخارية' },
    ];

    // Couplings
    ctx.fillStyle = '#27272A';
    ctx.fillRect(580, 355, 60, 90);
    ctx.fillRect(1120, 355, 60, 90);
    ctx.fillRect(1700, 355, 60, 90);

    for (const car of cars) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(car.x1 + 8, 256, car.x2 - car.x1, 304);

      // Floor deck
      ctx.fillStyle = car.floor;
      ctx.fillRect(car.x1, 250, car.x2 - car.x1, 300);

      // Wood plank lines
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      for (let py = 278; py < 530; py += 28) {
        ctx.beginPath();
        ctx.moveTo(car.x1 + 12, py);
        ctx.lineTo(car.x2 - 12, py);
        ctx.stroke();
      }
    }

    // Locomotive boiler front nose & smokestack visual
    ctx.fillStyle = '#1E1F22';
    ctx.fillRect(2160, 260, 140, 280);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(2205, 285, 34, 34); // Smokestack brass ring
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(2300, 270);
    ctx.lineTo(2355, 400);
    ctx.lineTo(2300, 530);
    ctx.closePath();
    ctx.fill();
  }

  private renderObstacles(ctx: CanvasRenderingContext2D): void {
    for (const o of this.obstacles) {
      if (o.destructible && o.hp <= 0) continue;

      // Hard arcade drop shadow
      ctx.fillStyle = 'rgba(11, 7, 5, 0.45)';
      ctx.fillRect(o.x + 5, o.y + 7, o.w, o.h);

      if (o.type === 'saloon_wall') {
        // Cover-Art Authentic Wooden Western Storefront Building (Saloon/Hotel style)
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 4, o.y - 4, o.w + 8, o.h + 8);
        // Stepped false-front roof parapet
        ctx.fillStyle = '#854D22';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#B8743B';
        ctx.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 24);
        // Bright top roof lip + cornice
        ctx.fillStyle = '#D99B52';
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 7);
        // Porch awning overhang along front face
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x + 2, o.y + o.h - 20, o.w - 4, 4);
        ctx.fillStyle = '#6E3C1B';
        ctx.fillRect(o.x + 4, o.y + o.h - 16, o.w - 8, 16);
        // Warm framed storefront windows
        for (let wx = o.x + 24; wx < o.x + o.w - 44; wx += 56) {
          ctx.fillStyle = '#0B0705';
          ctx.fillRect(wx, o.y + 20, 26, 28);
          ctx.fillStyle = '#D97706';
          ctx.fillRect(wx + 3, o.y + 23, 20, 22);
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(wx + 5, o.y + 25, 7, 9);
          ctx.fillRect(wx + 14, o.y + 25, 7, 9);
        }
        // Double swinging Saloon doors in center front
        const doorX = o.x + o.w / 2 - 18;
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(doorX, o.y + o.h - 24, 36, 24);
        ctx.fillStyle = '#9C5B2D';
        ctx.fillRect(doorX + 3, o.y + o.h - 21, 13, 18);
        ctx.fillRect(doorX + 20, o.y + o.h - 21, 13, 18);
        if (o.labelAr) {
          ctx.fillStyle = '#0B0705';
          ctx.fillRect(o.x + o.w / 2 - 78, o.y + 10, 156, 26);
          ctx.fillStyle = '#EAB875';
          ctx.fillRect(o.x + o.w / 2 - 75, o.y + 13, 150, 20);
          ctx.fillStyle = '#3B1E0E';
          ctx.font = '800 14px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(o.labelAr, o.x + o.w / 2, o.y + 28);
        }
      } else if (o.type === 'train_wall') {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 2, o.y - 2, o.w + 4, o.h + 4);
        ctx.fillStyle = '#372B24';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#D99B26';
        ctx.fillRect(o.x + 2, o.y + 2, Math.max(0, o.w - 4), 4);
      } else if (o.type === 'crate') {
        // Cover-Art Chunky Red TNT Plank Crates alternating with Oak Supply Crates
        const isRedTntCrate = o.id % 2 === 1;
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);
        ctx.fillStyle =
          o.hitFlash > 0
            ? '#FEF08A'
            : isRedTntCrate
              ? '#C82323'
              : '#B4743E';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        // Top highlight & bottom shadow plank
        ctx.fillStyle =
          o.hitFlash > 0
            ? '#FFFFFF'
            : isRedTntCrate
              ? '#EF4444'
              : '#E09F5A';
        ctx.fillRect(o.x, o.y, o.w, 6);
        ctx.fillStyle = isRedTntCrate ? '#7F1D1D' : '#6E421F';
        ctx.fillRect(o.x, o.y + o.h - 6, o.w, 6);
        ctx.strokeStyle = isRedTntCrate ? '#450A0A' : '#3D220E';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
        // Plank lines
        ctx.fillStyle = isRedTntCrate ? '#7F1D1D' : '#6E421F';
        ctx.fillRect(o.x + 5, o.y + Math.round(o.h * 0.34), o.w - 10, 2);
        ctx.fillRect(o.x + 5, o.y + Math.round(o.h * 0.66), o.w - 10, 2);
        if (isRedTntCrate) {
          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 14px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('TNT', o.x + o.w / 2, o.y + o.h / 2 + 5);
        }
      } else if (o.type === 'barrel_tnt') {
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        // Cover-Art Crimson Stave Barrel with Slate Steel Bands
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 3, o.y - 2, o.w + 6, o.h + 4);
        ctx.fillStyle = o.hitFlash > 0 ? '#FFFFFF' : '#B91C1C';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        // Top wooden lid rim
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(o.x + 3, o.y + 2, o.w - 6, 6);
        // Steel hoops
        ctx.fillStyle = '#334155';
        ctx.fillRect(o.x - 1, o.y + 8, o.w + 2, 4);
        ctx.fillRect(o.x - 1, o.y + o.h - 11, o.w + 2, 4);
        // Vertical stave highlights
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(o.x + 6, o.y + 13, 6, o.h - 26);
        ctx.fillRect(o.x + 17, o.y + 13, 7, o.h - 26);
        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TNT', cx, cy + 4);
        if (Math.floor(this.stageElapsed * 6) % 2 === 0) {
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(cx - 2, o.y - 3, 4, 4);
        }
      } else if (o.type === 'rock') {
        // Stepped 3-tone pixel boulder
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 3, o.y + 3, o.w + 6, o.h - 6);
        ctx.fillRect(o.x + 5, o.y - 3, o.w - 10, o.h + 6);
        ctx.fillStyle = '#7C3E28';
        ctx.fillRect(o.x, o.y + 5, o.w, o.h - 10);
        ctx.fillRect(o.x + 6, o.y, o.w - 12, o.h);
        ctx.fillStyle = '#9E5439';
        ctx.fillRect(o.x + 8, o.y + 4, o.w - 20, 12);
      } else if (o.type === 'cactus') {
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(cx - 10, cy - 16, 20, 32);
        ctx.fillRect(cx - 18, cy - 8, 36, 12);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(cx - 7, cy - 13, 14, 26);
        ctx.fillRect(cx - 15, cy - 5, 30, 6);
        ctx.fillStyle = '#15803D';
        ctx.fillRect(cx + 1, cy - 13, 6, 26);
      } else if (o.type === 'wreck_coach') {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);
        ctx.fillStyle = '#7A4626';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#A6653A';
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 8);
      } else if (o.type === 'safe_vault') {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);
        ctx.fillStyle = o.hitFlash > 0 ? '#FDE047' : '#334155';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 4;
        ctx.strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6);
        // Vault wheel
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 16, 0, Math.PI * 2);
        ctx.stroke();
        // HP bar
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 2, o.y - 14, o.w + 4, 9);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(o.x, o.y - 12, o.w * (o.hp / o.maxHp), 5);
      } else if (o.type === 'brake_lever') {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);
        ctx.fillStyle = o.hitFlash > 0 ? '#FEF08A' : '#B91C1C';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 3;
        ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 13px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('كابح', o.x + o.w / 2, o.y + o.h / 2 + 5);
        // HP bar
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 2, o.y - 14, o.w + 4, 9);
        ctx.fillStyle = '#34D399';
        ctx.fillRect(o.x, o.y - 12, o.w * (o.hp / o.maxHp), 5);
      } else if (o.type === 'target_dummy') {
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        // Wooden post stand
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(cx - 5, cy + 4, 10, o.h / 2);
        ctx.fillStyle = '#78350F';
        ctx.fillRect(cx - 3, cy + 5, 6, o.h / 2 - 2);
        // Pixel bullseye target board
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(o.x - 2, o.y - 2, o.w + 4, o.h + 4);
        ctx.fillStyle = o.hitFlash > 0 ? '#FEF08A' : '#F8FAFC';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        // Concentric red & white bullseye rings
        ctx.fillStyle = o.hitFlash > 0 ? '#FBBF24' : '#DC2626';
        ctx.fillRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10);
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(o.x + 11, o.y + 11, o.w - 22, o.h - 22);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(cx - 4, cy - 4, 8, 8);
        if (o.hp < o.maxHp) {
          ctx.fillStyle = '#0B0705';
          ctx.fillRect(o.x - 2, o.y - 11, o.w + 4, 7);
          ctx.fillStyle = '#34D399';
          ctx.fillRect(o.x, o.y - 9, o.w * Math.max(0, o.hp / o.maxHp), 3);
        }
      }

      if (o.hitFlash > 0) o.hitFlash -= 0.016;
    }
  }

  private renderPickups(ctx: CanvasRenderingContext2D): void {
    for (const pk of this.pickups) {
      const bob = Math.sin(pk.bobPhase) * 4;
      const y = pk.y + bob;
      ctx.save();
      ctx.translate(pk.x, y);

      ctx.fillStyle = 'rgba(11, 7, 5, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 14 - bob, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (pk.type === 'health') {
        // Dan the Man style glowing Red Pixel Heart
        const p = 3;
        const drawHeart = (color: string, ox = 0, oy = 0, scale = 1) => {
          ctx.fillStyle = color;
          ctx.fillRect(-4 * p * scale + ox, -2 * p * scale + oy, 3 * p * scale, 3 * p * scale);
          ctx.fillRect(1 * p * scale + ox, -2 * p * scale + oy, 3 * p * scale, 3 * p * scale);
          ctx.fillRect(-4 * p * scale + ox, -1 * p * scale + oy, 8 * p * scale, 2 * p * scale);
          ctx.fillRect(-3 * p * scale + ox, 1 * p * scale + oy, 6 * p * scale, 1.5 * p * scale);
          ctx.fillRect(-1.5 * p * scale + ox, 2.5 * p * scale + oy, 3 * p * scale, 1.5 * p * scale);
        };
        drawHeart('#0B0705', -2, -2, 1.2);
        drawHeart('#EF4444');
        // White pixel shine
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-9, -4, 3, 3);
      } else if (pk.type === 'ammo') {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-13, -10, 26, 20);
        ctx.fillStyle = '#D97706';
        ctx.fillRect(-11, -8, 22, 16);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(-8, -5, 4, 10);
        ctx.fillRect(-2, -5, 4, 10);
        ctx.fillRect(4, -5, 4, 10);
      } else if (pk.type === 'deadeye') {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-12, -12, 24, 24);
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#BAE6FD';
        ctx.fillRect(-3, -7, 6, 14);
        ctx.fillRect(-7, -3, 14, 6);
      } else {
        // Dan the Man spinning Gold Pixel Coin ($)
        const spinW = Math.max(4, Math.abs(Math.cos(pk.bobPhase * 0.9)) * 11);
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-spinW - 2, -13, (spinW + 2) * 2, 26);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(-spinW, -11, spinW * 2, 22);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(-Math.max(2, spinW - 3), -8, Math.max(2, spinW), 16);
      }
      ctx.restore();
    }
  }

  private renderDynamites(ctx: CanvasRenderingContext2D): void {
    for (const d of this.dynamites) {
      const fusePct = 1 - Math.max(0, d.fuseTimer / d.maxFuse);
      const ringColor = d.fromPlayer ? '251, 191, 36' : '239, 68, 68';
      ctx.save();
      ctx.strokeStyle = `rgba(${ringColor}, ${0.45 + fusePct * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(d.targetX, d.targetY, d.blastRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(${ringColor}, ${0.12 + fusePct * 0.2})`;
      ctx.beginPath();
      ctx.arc(d.targetX, d.targetY, d.blastRadius * fusePct, 0, Math.PI * 2);
      ctx.fill();

      // Arcing dynamite stick
      const arcLift = Math.sin(d.flightProgress * Math.PI) * 52;
      ctx.translate(d.x, d.y - arcLift);
      ctx.rotate(d.flightProgress * 8);
      ctx.fillStyle = d.fromPlayer ? '#F59E0B' : '#DC2626';
      ctx.fillRect(-8, -3, 16, 6);
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(9, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderTumbleweeds(ctx: CanvasRenderingContext2D): void {
    for (const tw of this.tumbleweeds) {
      ctx.save();
      ctx.translate(tw.x, tw.y);
      ctx.rotate(tw.rot);
      ctx.strokeStyle = 'rgba(105, 72, 36, 0.72)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, tw.radius, tw.radius * 0.6, i * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private renderAnimals(ctx: CanvasRenderingContext2D): void {
    for (const a of this.animals) {
      const facing = Math.cos(a.angle) >= 0 ? 1 : -1;
      const speedMag = Math.hypot(a.vx, a.vy);
      const hop =
        speedMag > 12 ? Math.abs(Math.sin(this.stageElapsed * 15 + a.id)) * 4 : 0;
      const legStride =
        speedMag > 12 ? Math.sin(this.stageElapsed * 15 + a.id) * 4 : 0;
      const flash = a.hitFlash > 0;

      ctx.save();
      ctx.translate(Math.round(a.x), Math.round(a.y));

      // Ground arcade shadow
      ctx.fillStyle = 'rgba(11, 7, 5, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, a.radius * 0.72, a.radius * 1.15, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.scale(facing, 1);

      if (a.species === 'rabbit') {
        // Small fast Jackrabbit
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-10, -8 - hop, 20, 14);
        ctx.fillRect(2, -18 - hop, 5, 11);
        ctx.fillRect(6, -16 - hop, 4, 9);
        ctx.fillStyle = flash ? '#FFFFFF' : '#D6B68C';
        ctx.fillRect(-8, -6 - hop, 16, 10);
        ctx.fillRect(3, -16 - hop, 3, 9);
        ctx.fillStyle = '#F8FAFC'; // Fluffy tail
        ctx.fillRect(-11, -4 - hop, 4, 5);
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(5, -3 - hop, 2, 2);
      } else if (a.species === 'coyote') {
        // Slender Prairie Coyote
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-14 + legStride, 4, 6, 9);
        ctx.fillRect(6 - legStride, 4, 6, 9);
        ctx.fillRect(-16, -9 - hop, 30, 15);
        ctx.fillRect(8, -16 - hop, 12, 11);
        ctx.fillStyle = flash ? '#FFFFFF' : '#B88B5A';
        ctx.fillRect(-14, -7 - hop, 26, 11);
        ctx.fillRect(9, -14 - hop, 10, 8);
        ctx.fillStyle = '#78350F';
        ctx.fillRect(-20, -6 - hop, 6, 4); // Tail
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(15, -12 - hop, 3, 3); // Eye
      } else if (a.species === 'deer') {
        // Antlered Mountain Buck
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-13 + legStride, 5, 6, 11);
        ctx.fillRect(6 - legStride, 5, 6, 11);
        ctx.fillRect(-17, -11 - hop, 32, 18);
        ctx.fillRect(8, -23 - hop, 12, 14);
        ctx.fillStyle = flash ? '#FFFFFF' : '#C27D44';
        ctx.fillRect(-15, -9 - hop, 28, 14);
        ctx.fillRect(9, -21 - hop, 10, 11);
        // Branching pixel antlers
        ctx.fillStyle = '#F3E5CE';
        ctx.fillRect(10, -32 - hop, 3, 11);
        ctx.fillRect(6, -29 - hop, 9, 3);
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(15, -18 - hop, 3, 3);
      } else if (a.species === 'boar') {
        // Armored Wild Razorback Boar with Tusks
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-13 + legStride, 5, 7, 8);
        ctx.fillRect(5 - legStride, 5, 7, 8);
        ctx.fillRect(-18, -11 - hop, 36, 18);
        ctx.fillStyle = flash ? '#FFFFFF' : '#4A3228';
        ctx.fillRect(-16, -9 - hop, 32, 14);
        ctx.fillStyle = '#F8FAFC'; // White curved tusks
        ctx.fillRect(16, -2 - hop, 5, 4);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(11, -6 - hop, 3, 3);
      } else if (a.species === 'cougar') {
        // Sleek Mountain Cougar Predator
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-15 + legStride, 5, 7, 10);
        ctx.fillRect(7 - legStride, 5, 7, 10);
        ctx.fillRect(-19, -10 - hop, 38, 16);
        ctx.fillRect(12, -16 - hop, 12, 11);
        ctx.fillStyle = flash ? '#FFFFFF' : '#D98A3A';
        ctx.fillRect(-17, -8 - hop, 34, 12);
        ctx.fillRect(13, -14 - hop, 10, 8);
        ctx.fillStyle = '#B45309';
        ctx.fillRect(-26, -7 - hop, 8, 4);
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(18, -12 - hop, 3, 3);
      } else if (a.species === 'bison') {
        // Massive Prairie Bison Bull
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-18 + legStride, 8, 10, 12);
        ctx.fillRect(8 - legStride, 8, 10, 12);
        ctx.fillRect(-26, -18 - hop, 52, 28);
        ctx.fillStyle = flash ? '#FFFFFF' : '#5C3824';
        ctx.fillRect(-24, -16 - hop, 48, 24);
        ctx.fillStyle = flash ? '#FFFFFF' : '#3B2214'; // Shaggy front hump
        ctx.fillRect(2, -17 - hop, 23, 25);
        ctx.fillStyle = '#E2E8F0'; // Curved horns
        ctx.fillRect(20, -19 - hop, 7, 4);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(18, -9 - hop, 4, 4);
      } else {
        // Legendary Grizzly Bear
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-18 + legStride, 8, 11, 13);
        ctx.fillRect(7 - legStride, 8, 11, 13);
        ctx.fillRect(-26, -20 - hop, 52, 30);
        ctx.fillRect(12, -26 - hop, 16, 15);
        ctx.fillStyle = flash ? '#FFFFFF' : '#452719';
        ctx.fillRect(-24, -18 - hop, 48, 26);
        ctx.fillRect(13, -24 - hop, 14, 12);
        ctx.fillStyle = '#9A6340'; // Snout
        ctx.fillRect(21, -18 - hop, 7, 6);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(19, -21 - hop, 4, 4);
      }

      ctx.restore();

      // Difficulty Tier badge & HP bar above animal
      const tierColor =
        a.tier === 'easy'
          ? '#34D399'
          : a.tier === 'medium'
            ? '#FBBF24'
            : a.tier === 'hard'
              ? '#FB923C'
              : '#EF4444';
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-22, -a.radius - 23, 44, 14);
      ctx.fillStyle = tierColor;
      ctx.font = '800 10px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.tierLabelAr, 0, -a.radius - 13);

      if (a.hp < a.maxHp) {
        const bw = 38;
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-bw / 2 - 2, -a.radius - 33, bw + 4, 8);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-bw / 2, -a.radius - 31, bw * Math.max(0, a.hp / a.maxHp), 4);
      }

      ctx.restore();
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const e of this.enemies) {
      // Sniper / Boss laser telegraph line before firing
      if (
        e.windupTimer > 0 &&
        (e.type === 'sniper' || (e.type === 'boss_cuervo' && e.phase >= 2))
      ) {
        const locked = e.windupTimer <= 0.28;
        ctx.save();
        ctx.strokeStyle = locked
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(239, 68, 68, 0.72)';
        ctx.lineWidth = locked ? 3 : 1.5;
        ctx.setLineDash(locked ? [] : [8, 6]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - 4);
        ctx.lineTo(e.aimX, e.aimY);
        ctx.stroke();
        ctx.restore();
      }

      const scale = e.isBoss ? 1.32 : 1;
      const facing = Math.cos(e.angle) >= 0 ? 1 : -1;
      const speedMag = Math.hypot(e.vx, e.vy);
      const stride =
        speedMag > 10 ? Math.sin(this.stageElapsed * 14 + e.id) * 4 : 0;
      const bob = Math.abs(stride) * 0.4;
      const flash = e.hitFlash > 0;

      ctx.save();
      ctx.translate(Math.round(e.x), Math.round(e.y));

      // Ground arcade ellipse shadow
      ctx.fillStyle = 'rgba(11, 7, 5, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 15 * scale, e.radius * 0.95, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.scale(scale, scale);

      // Cover-Art Chunky Denim Legs + Cowboy Boots + Spurs
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-9 + stride, 6, 8, 10);
      ctx.fillRect(1 - stride, 6, 8, 10);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-7 + stride, 6, 5, 5);
      ctx.fillRect(2 - stride, 6, 5, 5);
      ctx.fillStyle = '#5C3317';
      ctx.fillRect(-7 + stride, 10, 5, 4);
      ctx.fillRect(2 - stride, 10, 5, 4);

      // Sweeping Flared Duster Coat Tails + Torso
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-14, -10 - bob, 28, 20);
      ctx.fillStyle = flash ? '#FFFFFF' : e.coatColor;
      ctx.fillRect(-12, -8 - bob, 24, 16);
      // Flared open bottom coat hem
      ctx.fillStyle = flash ? '#FEF08A' : '#2E1A12';
      ctx.fillRect(-4, 0 - bob, 8, 8);

      // Class-specific chest detail (armor vest / bandolier / iron shoulder)
      if (!flash) {
        if (e.type === 'shotgunner' || e.type === 'train_guard') {
          ctx.fillStyle = e.type === 'train_guard' ? '#64748B' : '#9A3412';
          ctx.fillRect(-8, -7 - bob, 16, 10);
          ctx.fillStyle = '#FBBF24';
          ctx.fillRect(facing * 4, -5 - bob, 3, 3);
        } else if (e.type === 'dynamiter') {
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(-8, -5 - bob, 16, 4);
        } else if (e.type === 'mini_boss') {
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(facing * 6, -8 - bob, 7, 11);
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(facing * 7, -7 - bob, 4, 4);
        }
      }

      // Expressive Cover-Art Pixel Head + Jaw
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-10, -25 - bob, 20, 17);
      ctx.fillStyle = flash ? '#FEF08A' : '#EAB892';
      ctx.fillRect(-8, -23 - bob, 16, 13);

      // Bandana mask on lower face for bandits, dynamiters & wanted fugitives
      if (
        !flash &&
        (e.type === 'bandit' ||
          e.type === 'dynamiter' ||
          e.type === 'outlaw_fugitive')
      ) {
        ctx.fillStyle =
          e.type === 'dynamiter'
            ? '#F59E0B'
            : e.type === 'outlaw_fugitive'
              ? '#991B1B'
              : '#B91C1C';
        ctx.fillRect(-8, -15 - bob, 16, 5);
      }

      // Expressive White-Sclera Eyes & Furrowed Brows
      const eyeX = facing > 0 ? 0 : -6;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(eyeX, -19 - bob, 4, 3);
      ctx.fillRect(eyeX + facing * 5, -19 - bob, 4, 3);
      ctx.fillStyle = e.isBoss ? '#DC2626' : '#0B0705';
      ctx.fillRect(eyeX + (facing > 0 ? 1 : 0), -19 - bob, 2, 3);
      ctx.fillRect(eyeX + facing * 5 + (facing > 0 ? 1 : 0), -19 - bob, 2, 3);
      if (e.type === 'sniper' && !flash) {
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(eyeX + facing * 3, -19 - bob, 5, 4);
      }

      // Curved Cowboy Hat matching Title Art style
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-15, -28 - bob, 30, 6);
      ctx.fillRect(-9, -36 - bob, 18, 9);
      ctx.fillStyle = flash ? '#FFFFFF' : e.hatColor;
      ctx.fillRect(-13, -27 - bob, 26, 4);
      ctx.fillRect(-7, -34 - bob, 14, 7);
      ctx.fillStyle = e.isBoss ? '#DC2626' : '#D97706';
      ctx.fillRect(-7, -28 - bob, 14, 2);

      ctx.restore();

      // Aimed weapon barrel rotating cleanly around torso
      ctx.save();
      ctx.translate(0, (-4 - bob) * scale);
      ctx.rotate(e.angle);
      ctx.fillStyle = '#0B0705';
      if (e.type === 'sniper' || e.type === 'shotgunner') {
        ctx.fillRect(4, -3.5, e.radius + 14, 7);
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(6, -2, e.radius + 10, 4);
      } else if (e.type === 'boss_cuervo') {
        ctx.fillRect(4, -8, e.radius + 10, 5);
        ctx.fillRect(4, 3, e.radius + 10, 5);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(6, -7, e.radius + 6, 3);
        ctx.fillRect(6, 4, e.radius + 6, 3);
      } else {
        ctx.fillRect(4, -3, e.radius + 8, 6);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(6, -1.5, e.radius + 5, 3);
      }
      ctx.restore();

      // Overhead stealth / windup status icon
      if (e.windupTimer > 0 && e.type !== 'sniper') {
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-5, -46 * scale, 10, 10);
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(-3, -44 * scale, 6, 6);
      } else if (this.stageId === 'sniper_hunt') {
        if (e.alertState === 'SUSPICIOUS') {
          ctx.fillStyle = '#0B0705';
          ctx.fillRect(-8, -51 * scale, 16, 15);
          ctx.fillStyle = '#FBBF24';
          ctx.font = '900 12px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('؟', 0, -40 * scale);
        } else if (e.alertState === 'ALERTED') {
          ctx.fillStyle = '#0B0705';
          ctx.fillRect(-8, -51 * scale, 16, 15);
          ctx.fillStyle = '#EF4444';
          ctx.font = '900 12px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', 0, -40 * scale);
        } else {
          // Subtle target wanted diamond for unaware gang outlaws
          ctx.fillStyle = '#0B0705';
          ctx.fillRect(-4, -46 * scale, 8, 8);
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(-2, -44 * scale, 4, 4);
        }
      }

      // Segmented Arcade HP bar for damaged enemies
      if (!e.isBoss && e.hp < e.maxHp) {
        const bw = 34;
        ctx.fillStyle = '#0B0705';
        ctx.fillRect(-bw / 2 - 2, -42, bw + 4, 8);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(
          -bw / 2,
          -40,
          bw * Math.max(0, e.hp / e.maxHp),
          4
        );
        ctx.fillStyle = '#FCA5A5';
        ctx.fillRect(
          -bw / 2,
          -40,
          bw * Math.max(0, e.hp / e.maxHp),
          1.5
        );
      }

      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    const facing = Math.cos(p.angle) >= 0 ? 1 : -1;
    const isMoving = Math.hypot(p.vx, p.vy) > 15;
    const stride = isMoving ? Math.sin(p.walkCycle) * 5 : 0;
    const bob = isMoving ? Math.abs(Math.sin(p.walkCycle)) * 2.5 : Math.sin(this.stageElapsed * 5) * 1.2;
    const flash = p.hitFlash > 0;
    const scarfFlutter = Math.sin(this.stageElapsed * (isMoving ? 18 : 7)) * 3;

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));

    // Shadow
    ctx.fillStyle = 'rgba(11, 7, 5, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 15, p.radius, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Precision scope sightline when Sharps Sniper Rifle is equipped
    if (p.activeWeapon === 'sniper' && !p.isReloading) {
      ctx.save();
      ctx.translate(0, -4 - bob);
      ctx.rotate(p.angle);
      ctx.strokeStyle = this.scopeOpen
        ? 'rgba(103, 232, 249, 0.72)'
        : p.walkMode
          ? 'rgba(103, 232, 249, 0.55)'
          : 'rgba(103, 232, 249, 0.25)';
      ctx.lineWidth = this.scopeOpen ? 2.2 : p.walkMode ? 2 : 1.2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(36, 0);
      ctx.lineTo(860, 0);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    if (p.dodgeTimer > 0) {
      ctx.scale(1.24, 0.78);
    }

    // Cover-Art Chunky Denim Legs, Thigh Holster Strap & Spurred Boots
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(-10 + stride, 5, 9, 12);
    ctx.fillRect(1 - stride, 5, 9, 12);
    ctx.fillStyle = '#4E4B47'; // Slate-gray trousers from cover art
    ctx.fillRect(-8 + stride, 5, 5, 6);
    ctx.fillRect(3 - stride, 5, 5, 6);
    ctx.fillStyle = '#78350F'; // Brown thigh holster strap
    ctx.fillRect(-8 + stride, 7, 5, 2);
    ctx.fillStyle = '#6B3A1E'; // Cowboy boots
    ctx.fillRect(-8 + stride, 11, 6, 4);
    ctx.fillRect(2 - stride, 11, 6, 4);
    ctx.fillStyle = '#CBD5E1'; // Boot spurs
    ctx.fillRect(facing > 0 ? -10 + stride : 8 + stride, 12, 2, 2);

    // Sweeping Cover-Art Red-Brown Long Duster Coat Flaps
    const tailDir = -facing;
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(tailDir * 12 - 4, 2 - bob, 11, 10);
    ctx.fillRect(-14, -12 - bob, 28, 19);
    ctx.fillStyle = flash ? '#FCA5A5' : '#A63A1E'; // Iconic hero rust-red trench coat
    ctx.fillRect(tailDir * 11 - 2, 3 - bob, 8, 7);
    ctx.fillRect(-12, -10 - bob, 24, 15);
    ctx.fillStyle = flash ? '#FFFFFF' : '#4E4B47'; // Under-shirt/vest
    ctx.fillRect(-4, -9 - bob, 8, 11);
    // Red Neck Bandana Scarf
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-7, -11 - bob, 14, 4);
    // Gold belt buckle
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(-10, 1 - bob, 20, 4);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-3, 1 - bob, 6, 4);

    // Armor vest trim when vest equipped
    if (p.armor > 0 && !flash) {
      ctx.fillStyle = '#60A5FA';
      ctx.fillRect(-10, -8 - bob, 4, 8);
      ctx.fillRect(6, -8 - bob, 4, 8);
    }

    // Iconic Long Flowing Red Headband Ribbon Tails matching Cover Art!
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(tailDir * 11 - 6, -24 - bob + scarfFlutter * 0.45, 16, 6);
    ctx.fillRect(tailDir * 15 - 6, -19 - bob - scarfFlutter * 0.55, 15, 5);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(tailDir * 11 - 4, -23 - bob + scarfFlutter * 0.45, 13, 4);
    ctx.fillRect(tailDir * 15 - 4, -18 - bob - scarfFlutter * 0.55, 12, 3);

    // Expressive Cover-Art Blocky Pixel Head
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(-11, -27 - bob, 22, 17);
    ctx.fillStyle = flash ? '#FFFFFF' : '#F6C6A0';
    ctx.fillRect(-9, -25 - bob, 18, 13);

    // Red Headband wrapped across forehead
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-9, -25 - bob, 18, 4);
    ctx.fillStyle = '#F87171';
    ctx.fillRect(-7, -25 - bob, 9, 2);

    // Expressive White-Sclera Eyes & Gritty Mouth
    const eyeX = facing > 0 ? -1 : -7;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(eyeX, -20 - bob, 4, 4);
    ctx.fillRect(eyeX + facing * 6, -20 - bob, 4, 4);
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(eyeX + (facing > 0 ? 2 : 0), -19 - bob, 2, 3);
    ctx.fillRect(eyeX + facing * 6 + (facing > 0 ? 2 : 0), -19 - bob, 2, 3);
    // Determined mouth grin
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(facing > 0 ? 0 : -5, -14 - bob, 6, 2);

    // Curved Cowboy Hat matching Title Art
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(-16, -30 - bob, 32, 6);
    ctx.fillRect(-10, -38 - bob, 20, 9);
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(-14, -29 - bob, 28, 4);
    ctx.fillRect(-8, -36 - bob, 16, 7);
    ctx.fillStyle = '#A16228'; // Brim highlight
    ctx.fillRect(-12, -29 - bob, 16, 2);
    ctx.fillStyle = '#D99B26'; // Hat band
    ctx.fillRect(-8, -30 - bob, 16, 2);

    ctx.restore();

    // Rotating Arm & Cover-Art Weapon Sprites
    ctx.save();
    ctx.translate(0, -4 - bob);
    ctx.rotate(p.angle);
    const recoilPush = p.muzzleFlashTimer > 0 ? -3 : 0;
    ctx.translate(recoilPush, 0);

    // Hand holding weapon
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(6, -4, 7, 8);
    ctx.fillStyle = '#F6C6A0';
    ctx.fillRect(7, -2.5, 5, 5);

    if (p.activeWeapon === 'sniper') {
      // Sharps 1874 long sniper + brass scope
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(8, -5, 34, 9);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(9, -3, 12, 6);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(20, -2, 20, 4);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(15, -7, 13, 3.5);
    } else if (p.activeWeapon === 'maxim') {
      // Cover-Art Golden-Brass Ribbed Maxim Machine Gun + Large Gold Drum Magazine!
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(7, -7, 32, 13);
      ctx.fillRect(12, 5, 13, 12);
      ctx.fillStyle = '#CA8A04'; // Gold drum mag
      ctx.fillRect(14, 6, 9, 9);
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(16, 8, 5, 5);
      ctx.fillStyle = '#475569'; // Steel receiver
      ctx.fillRect(9, -5, 10, 9);
      ctx.fillStyle = '#D99B26'; // Golden-brass water-cooled jacket
      ctx.fillRect(19, -5, 15, 9);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(20, -4, 13, 2.5);
      ctx.fillStyle = '#E2E8F0'; // Barrel tip
      ctx.fillRect(34, -2, 5, 4);
    } else if (p.activeWeapon === 'winchester') {
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(8, -4.5, 28, 9);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(9, -3, 11, 6);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(19, -2, 15, 4);
    } else if (p.activeWeapon === 'shotgun') {
      // Double-Barrel Coach Shotgun (wider mahogany stock + twin steel barrels)
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(8, -5.5, 29, 11);
      ctx.fillStyle = '#7C2D12';
      ctx.fillRect(9, -4, 11, 8);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(20, -4, 15, 3);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(20, 0, 15, 3);
    } else if (p.activeWeapon === 'dual_pistols') {
      // Twin Silver Colt Peacemakers!
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(9, -10, 16, 7);
      ctx.fillRect(9, 3, 16, 7);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(11, -8.5, 12, 4);
      ctx.fillRect(11, 4.5, 12, 4);
    } else if (p.activeWeapon === 'bow') {
      // Curved Frontier Hunting Bow + String + Nocked Arrow
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(10, 0, 16, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.strokeStyle = '#E5DDD0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(14, -15);
      ctx.lineTo(10, 0);
      ctx.lineTo(14, 15);
      ctx.stroke();
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(11, -1, 18, 2);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(28, -2.5, 5, 5);
    } else {
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(9, -4, 17, 8);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(11, -2.5, 13, 4);
    }

    // Comic Starburst Muzzle Flash
    if (p.muzzleFlashTimer > 0 && p.activeWeapon !== 'bow') {
      const tip =
        p.activeWeapon === 'sniper'
          ? 42
          : p.activeWeapon === 'maxim'
            ? 37
            : p.activeWeapon === 'winchester' || p.activeWeapon === 'shotgun'
              ? 36
              : 26;
      const flashY =
        p.activeWeapon === 'dual_pistols' ? p.dualHandToggle * 6.5 : 0;
      ctx.fillStyle =
        p.activeWeapon === 'sniper'
          ? '#67E8F9'
          : p.activeWeapon === 'shotgun'
            ? '#FB923C'
            : p.activeWeapon === 'maxim'
              ? '#FBBF24'
              : '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(tip, flashY - 7);
      ctx.lineTo(tip + 10, flashY - 3);
      ctx.lineTo(tip + 22, flashY);
      ctx.lineTo(tip + 10, flashY + 3);
      ctx.lineTo(tip, flashY + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tip, flashY - 2.5, 9, 5);
    }
    ctx.restore();

    // Active reload arcade meter directly under player
    if (p.isReloading) {
      const prog = Math.min(1, p.reloadTimer / p.reloadDuration);
      const bw = 48;
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-bw / 2 - 2, 22, bw + 4, 10);
      ctx.fillStyle = '#1E1109';
      ctx.fillRect(-bw / 2, 24, bw, 6);
      // Sweet spot zone (42%..72%)
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(-bw / 2 + bw * 0.42, 24, bw * 0.3, 6);
      // Crisp sliding pixel needle
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-bw / 2 + bw * prog - 2, 21, 4, 12);
    }

    ctx.restore();
  }

  private renderAllies(ctx: CanvasRenderingContext2D): void {
    for (const al of this.allies) {
      const facing = Math.cos(al.angle) >= 0 ? 1 : -1;
      const isMoving = Math.hypot(al.vx, al.vy) > 12;
      const stride = isMoving ? Math.sin(al.walkCycle) * 4 : 0;
      const bob = isMoving ? Math.abs(Math.sin(al.walkCycle)) * 2 : 0;
      const flash = al.hitFlash > 0;

      ctx.save();
      ctx.translate(Math.round(al.x), Math.round(al.y));

      // Shadow
      ctx.fillStyle = 'rgba(11, 7, 5, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 14, al.radius, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boots & legs
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-8 + stride, 4, 7, 11);
      ctx.fillRect(1 - stride, 4, 7, 11);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6 + stride, 4, 4, 6);
      ctx.fillRect(2 - stride, 4, 4, 6);

      // Allied Posse Blue/Teal Frontier Coat + Sheriff Star Trim
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-12, -11 - bob, 24, 17);
      ctx.fillStyle = flash ? '#FFFFFF' : al.coatColor;
      ctx.fillRect(-10, -9 - bob, 20, 13);
      ctx.fillStyle = '#FBBF24'; // Gold Sheriff Star badge on chest
      ctx.fillRect(facing > 0 ? 2 : -5, -6 - bob, 3, 3);

      // Head + Bandana
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-9, -24 - bob, 18, 14);
      ctx.fillStyle = flash ? '#FFFFFF' : '#F6C6A0';
      ctx.fillRect(-7, -22 - bob, 14, 11);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(-7, -13 - bob, 14, 3);

      // Hat
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-14, -27 - bob, 28, 5);
      ctx.fillRect(-8, -34 - bob, 16, 7);
      ctx.fillStyle = al.hatColor;
      ctx.fillRect(-12, -26 - bob, 24, 3);
      ctx.fillRect(-6, -32 - bob, 12, 6);

      // Gun pointing toward target
      ctx.save();
      ctx.translate(0, -4 - bob);
      ctx.rotate(al.angle);
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(8, -3, al.role === 'rifleman' || al.role === 'sharpshooter' ? 24 : 15, 6);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(10, -1.5, al.role === 'rifleman' || al.role === 'sharpshooter' ? 20 : 11, 3);
      ctx.restore();

      // Ally Name & Green Health Bar
      ctx.fillStyle = '#0B0705';
      ctx.fillRect(-16, -42 - bob, 32, 5);
      ctx.fillStyle = '#34D399';
      ctx.fillRect(-15, -41 - bob, 30 * Math.max(0, al.hp / al.maxHp), 3);

      ctx.font = '700 10px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#BAE6FD';
      ctx.fillText(al.nameAr, 0, -46 - bob);

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const pr of this.projectiles) {
      ctx.save();
      if (pr.weaponId === 'bow') {
        const ang = Math.atan2(pr.vy, pr.vx);
        ctx.translate(pr.x, pr.y);
        ctx.rotate(ang);
        ctx.fillStyle = '#92400E';
        ctx.fillRect(-16, -1.5, 18, 3);
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(2, -4);
        ctx.lineTo(10, 0);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#34D399';
        ctx.fillRect(-18, -3.5, 6, 2);
        ctx.fillRect(-18, 1.5, 6, 2);
      } else {
        ctx.strokeStyle = pr.color;
        ctx.lineWidth = pr.weaponId === 'winchester' ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(pr.prevX, pr.prevY);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rotation);
      ctx.fillStyle = pt.color;
      if (pt.kind === 'casing') {
        ctx.fillRect(-3, -1.5, 6, 3);
      } else {
        // Crisp retro-arcade pixel square particles
        const sz = Math.max(2, Math.round(pt.size * 1.6));
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      }
      ctx.restore();
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.font = `800 ${Math.round(14 * ft.scale)}px Cairo, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(18,10,6,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private renderTrainObjectivePointer(ctx: CanvasRenderingContext2D): void {
    let target: Obstacle | undefined;
    if (!this.safeCracked) {
      target = this.obstacles.find((o) => o.type === 'safe_vault' && o.hp > 0);
    } else if (!this.brakePulled) {
      target = this.obstacles.find((o) => o.type === 'brake_lever' && o.hp > 0);
    }
    if (!target) return;

    const tx = target.x + target.w / 2;
    const ty = target.y - 24 + Math.sin(this.stageElapsed * 6) * 5;
    ctx.save();
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.moveTo(tx, ty + 10);
    ctx.lineTo(tx - 8, ty - 4);
    ctx.lineTo(tx + 8, ty - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderSniperScopeOverlay(ctx: CanvasRenderingContext2D): void {
    const cx = this.mouseScreenX;
    const cy = this.mouseScreenY;
    const r = Math.max(135, Math.min(this.viewW, this.viewH) * 0.31);

    ctx.save();
    // Darkened peripheral vignette outside the telescopic lens
    ctx.beginPath();
    ctx.rect(0, 0, this.viewW, this.viewH);
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(6, 4, 3, 0.72)';
    ctx.fill('evenodd');

    // Subtle cool cyan optical tint inside scope lens
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(103, 232, 249, 0.05)';
    ctx.fill();

    // Precision mil-dot crosshairs clipped inside lens
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(11, 7, 5, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Fine mil-dot distance ticks
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.65)';
    ctx.lineWidth = 1.5;
    for (let step = 28; step < r - 12; step += 28) {
      ctx.beginPath();
      ctx.moveTo(cx - step, cy - 5);
      ctx.lineTo(cx - step, cy + 5);
      ctx.moveTo(cx + step, cy - 5);
      ctx.lineTo(cx + step, cy + 5);
      ctx.moveTo(cx - 5, cy - step);
      ctx.lineTo(cx + 5, cy - step);
      ctx.moveTo(cx - 5, cy + step);
      ctx.lineTo(cx + 5, cy + step);
      ctx.stroke();
    }

    // Center red illuminated dot
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Chunky brass telescopic lens rim
    ctx.strokeStyle = '#0B0705';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#D99B26';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Magnification tag below lens
    ctx.fillStyle = '#0B0705';
    ctx.fillRect(cx - 34, cy + r - 14, 68, 22);
    ctx.strokeStyle = '#67E8F9';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 34, cy + r - 14, 68, 22);
    ctx.fillStyle = '#67E8F9';
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`×${this.scopeZoom.toFixed(1)}`, cx, cy + r + 2);

    ctx.restore();
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D): void {
    const x = this.mouseScreenX;
    const y = this.mouseScreenY;
    const spread =
      this.player.activeWeapon === 'sniper'
        ? 5
        : this.player.activeWeapon === 'winchester'
          ? 7
          : this.player.activeWeapon === 'revolver'
            ? 10
            : 12;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = this.player.deadeyeActive ? '#FBBF24' : '#F3E5CE';
    ctx.lineWidth = 2;

    const arm = 7;
    ctx.beginPath();
    ctx.moveTo(-spread - arm, 0);
    ctx.lineTo(-spread, 0);
    ctx.moveTo(spread, 0);
    ctx.lineTo(spread + arm, 0);
    ctx.moveTo(0, -spread - arm);
    ctx.lineTo(0, -spread);
    ctx.moveTo(0, spread);
    ctx.lineTo(0, spread + arm);
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
