'use strict';

import seedrandom from "seedrandom";

function normalizeAngle(a) {
  while(a > 180) a -= 360;
  while(a < -180) a += 360;
  return a;
}

/**
 * Object represents a tank that is involved in the battle during simulation
 */
class Tank {

  /**
   * Constructor should not be called directly but through
   * `Simulation.addTank()` method
   * @param {AiDefinition} aiDefinition - definition of tank's AI Script
   * @param {Number} id - unique id of the tank
   * @param {Team} team - reference to team object where the tank belongs
   */
  constructor(aiDefinition, id) {
    if(typeof aiDefinition != 'object') {
      throw "AI definition must be an object";
    }
    this._id = id;
    this._name = aiDefinition.name;
    this._team =  null;
    this._maxEnergy = 100;
    this._energy = this._maxEnergy;
    this._x = 0;
    this._y = 0;
    this._lastX = 0;
    this._lastY = 0;
    this._angle = 0;
    this._gunAngle = 0;
    this._radarAngle = 0;
    this._throttle = 0;
    this._actualThrottle = 0;
    this._speed = 0;
    this._turn = 0;
    this._gunTurn = 0;
    this._radarTurn = 0;
    this._wallHit = false;
    this._enemyHit = false;
    this._allyHit = false;
    this._beingRammed = false;
    this._radarRange = 300;
    this._radarFocal = 6;
    this._enemySpot = null;
    this._allySpot = null;
    this._bulletsSpot = [];
    this._gunReloadTime = 70;
    this._gunTimer = 0;
    this._shootingPower = 0;
    this._targetingAlarmTimer = 0;
    this._debugData = {};
    this._score = 0;
    this._state = null;
    this._hasBoost = false;
    this._maxBoost = 400;
    this._boost = this._maxBoost;
    this._wallDistance = null;
    this._skin = 'zebra';
  }

  /**
   * @return unique id of the tank
   */
  get id() {
    return this._id;
  }
  /**
   * @return skin name applied to the tank
   */
  get skin() {
    return this._skin;
  }

  /**
   * @return an object that represents current state of the tank
   */
  get state() {
    return this._state;
  }

  /**
   * @return amount of energy that the tank has
   */
  get energy() {
    return this._energy;
  }

  /**
   * @return current score of the tank
   */
  get score() {
    return this._score;
  }

  onEnemyHitScore(damage) {
    this._score += damage;
  }

  onEnemyKillScore() {
    this._score += 20;
  }

  onSurviveScore() {
    this._score += 10;
  }

  /**
   * @return initial amount of the energy
   */
  get maxEnergy() {
    return this._maxEnergy;
  }

  /**
   * @return range of tank's radar
   */
  get radarRange() {
    return this._radarRange;
  }

  /**
   * @return angle that radar field covers
   */
  get radarFocal() {
    return this._radarFocal;
  }

  /**
   * @return name of the tank
   */
  get name() {
    return this._name;
  }

  /**
   * @return full name contains name of the tank and its unique ID
   */
  get fullName() {
    return this._name + " #" + this._id;
  }

  /**
   * @return name of the team
   */
  get team() {
    return this._team;
  }

  /**
   * @return x position of the tank
   */
  get x() {
    return this._x;
  }

  /**
   * @return y position of the tank
   */
  get y() {
    return this._y;
  }

  /**
   * @return linear speed of the tank
   */
  get speed() {
    return this._speed;
  }

  get gunLength() {
    return 25;
  }

  /**
   * @return rotation of tank's body
   */
  get angle() {
    return this._angle;
  }

  /**
   * @return current throttle of the tank
   */
  get throttle() {
    return this._throttle;
  }
  /**
   * @return true if tank has boost turned on. Otherwise false
   */
  get hasBoost() {
    return (this._hasBoost && this._boost > 0);
  }

  /**
   * @return amount of boost that has left
   */
  get boost() {
    return this._boost;
  }

  /**
   * @return initial amount of boost
   */
  get maxBoost() {
    return this._maxBoost;
  }

  /**
   * @return rotation of tank's gun (relative to tank's body)
   */
  get gunAngle() {
    return this._gunAngle;
  }

  /**
   * @return rotation of tank's radar (relative to tank's body)
   */
  get radarAngle() {
    return this._radarAngle;
  }

  get enemySpot() {
    return this._enemySpot;
  }

  get allySpot() {
    return this._allySpot;
  }

  setThrottle(v) {
    this._throttle = Math.min(1, Math.max(-1, v));
  }

  setTurn(v) {
    this._turn = Math.min(1, Math.max(-1, v));
  }

  setGunTurn(v) {
    this._gunTurn = Math.min(1, Math.max(-1, v));
  }

  setRadarTurn(v) {
    this._radarTurn = Math.min(1, Math.max(-1, v));
  }

  setBoost(v) {
    this._hasBoost = v ? true : false;
  }

  setDebugData(v) {
    this._debugData = v;
  }

  onWallHit() {
    this._wallHit = true;
    this.onDamage(0.2);
  }

  onEnemyHit() {
    this._enemyHit = true;
    this.onDamage(0.2);
  }

  onAllyHit() {
    this._allyHit = true;
    this.onDamage(0.2);
  }

  onBeingRam(speed) {
    this._beingRammed = true;
    this.onDamage(0.1 + Math.round(speed*4)*0.1);
  }

  onEnemySpot(enemy) {
    this._enemySpot = enemy;
  }

  onAllySpot(ally) {
    this._allySpot = ally;
  }

  onBulletSpot(bullet) {
    this._bulletsSpot.push(bullet);
  }

  onWallSpot(distance) {
    this._wallDistance = distance;
  }

  onTargetingAlarm() {
    this._targetingAlarmTimer = 3;
  }

  isAlly(tank) {
    if(!this._team) return false;
    if(!tank.team) return false;
    return this._team.name == tank.team.name;
  }

  /**
   * @return true if tank is on the radar of an enemy. Otherwise false
   */
  get targetingAlarm() {
    return this._targetingAlarmTimer > 0;
  }

  onDamage(damage) {
    this._energy = Math.max(0, this._energy - damage);
  }

  moveTo(xPosition, yPosition, angle) {
    this._x = xPosition;
    this._y = yPosition;
    this._lastX = xPosition;
    this._lastY = yPosition;
    if(angle !== undefined) {
      this._angle = angle;
    }
  }

  /**
   * @return debug data set by AI script via `control.DEBUG`
   */
  get debugData() {
    return this._debugData;
  }

  get isShooting() {
    return this._shootingPower > 0;
  }

  get shootingPower() {
    return this._shootingPower;
  }

  handleShoot() {
    let value = this._shootingPower;
    this._shootingPower = 0;
    return value;
  }

  get isReloading() {
    return this._gunTimer > 0;
  }

  shoot(value) {
    value = Math.max(0.1, Math.min(1, value));
    if(!this.isReloading) {
      this._gunTimer = Math.round(value*this._gunReloadTime);
      this._shootingPower = value;
    }
  }

  randomize(seed) {
    if(seed === undefined) {
      seed = (new Date()).getTime() + Math.round(Math.random()*1000000);
    }
    let rng = seedrandom(seed);
    this._angle = Math.round(360*rng())-180;
  }

  init(settings) {
    if(settings && settings.SKIN) {
      this._skin = settings.SKIN;
    }
  }

  simulationStep(collisionResolver) {
    let self = this;

    if(self._energy == 0) {
      return;
    }

    if(self._hasBoost && self._boost > 0) {
      self._boost--;
    }

    let oldX = self._x;
    let oldY = self._y;

    let maxSpeed = self._throttle * (self.hasBoost ? 4 : 2);
    let accelerationFactor = (self.hasBoost ? 10 : 20);
    self._actualThrottle += (maxSpeed - self._actualThrottle)/accelerationFactor;

    let v = self._actualThrottle;
    let rotation = self._angle*(Math.PI/180);
    self._x += v*Math.cos(rotation);
    self._y += v*Math.sin(rotation);
    self._wallHit = false;
    self._enemyHit = false;
    self._allyHit = false;
    let hitTest = !collisionResolver.checkTank(self);
    if(hitTest) {
      self._x = oldX;
      self._y = oldY;
      self._actualThrottle = 0;
    }
    if(this._beingRammed) {
      // must be done later because ramming is
      // reported after collisionResolver.checkTank(self)
      // it is detected when collisionResolver.checkTank
      // is called for attacing tank
      self._enemyHit = true;
      this._beingRammed = false;
    }

    self._angle += 2*self._turn;
    self._radarAngle += 6*self._radarTurn;
    self._gunAngle += 3*self._gunTurn;

    self._angle = normalizeAngle(self._angle);
    self._radarAngle = normalizeAngle(self._radarAngle);
    self._gunAngle = normalizeAngle(self._gunAngle);
    collisionResolver.updateTank(self);

    self._enemySpot = null;
    self._allySpot = null;
    self._wallDistance = null;
    self._targetingAlarmTimer = Math.max(0, self._targetingAlarmTimer-1);
    collisionResolver.scanTanks(self);
    collisionResolver.scanBullets(self);
    collisionResolver.scanWalls(self);

    if(self._gunTimer > 0) {
      self._gunTimer--;
    }

    let enemyData = null;
    let allyData = null;
    let bulletsData = [];
    while(self._bulletsSpot.length) {
      let bullet = self._bulletsSpot.shift();
      bulletsData.push({
        id: bullet.id,
        x: bullet.x,
        y: bullet.y,
        angle: bullet.angle,
        speed: bullet.speed,
        damage: bullet.damage
      });
    }

    if(self._enemySpot) {
      enemyData = {
        id: self._enemySpot.id,
        x: self._enemySpot.x,
        y: self._enemySpot.y,
        angle: self._enemySpot.angle,
        speed: self._enemySpot.speed * (self._enemySpot.throttle < 0 ? -1 : 1),
        energy: self._enemySpot.energy,
      };
    }
    if(self._allySpot) {
      allyData = {
        id: self._allySpot.id,
        x: self._allySpot.x,
        y: self._allySpot.y,
        angle: self._allySpot.angle,
        speed: self._allySpot.speed,
        energy: self._allySpot.energy,
      };
    }

    let dx = self._x - self._lastX;
    let dy = self._y - self._lastY;
    self._speed = Math.sqrt(dx*dx + dy*dy);

    self._lastX = self._x;
    self._lastY = self._y;

    // add any state vars here that the Tank should know about!
    self._state = {
      x: self._x,
      y: self._y,
      angle: self._angle,
      energy: self._energy,
      boost: self._boost,
      speed: self._speed,
      collisions: {
        wall: self._wallHit,
        enemy: self._enemyHit,
        ally: self._allyHit
      },
      radar: {
        angle: self._radarAngle,
        targetingAlarm: self.targetingAlarm,
        wallDistance: self._wallDistance,
        enemy: enemyData,
        ally: allyData,
        bullets: bulletsData
      },
      gun: {
        angle: self._gunAngle,
        reloading: self.isReloading
      },
      radio: {
        inbox: self.team ? self.team.getMessages(self.id) : []
      }
    };
  }
}

export default Tank;
