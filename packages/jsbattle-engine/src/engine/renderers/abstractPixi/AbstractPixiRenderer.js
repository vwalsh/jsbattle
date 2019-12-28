'use strict';
import { Application } from 'pixi.js';
import { Container } from 'pixi.js';
import { Loader } from 'pixi.js';
import { autoDetectRenderer } from 'pixi.js';
import { settings } from 'pixi.js';
import { utils } from 'pixi.js';
import AbstractRenderer from "../abstract/AbstractRenderer.js";
import AbstractPixiView from "./AbstractPixiView.js";
import AbstractPixiTankView from "./AbstractPixiTankView.js";
import PixiRendererClockModel from "./PixiRendererClockModel.js";

export default class AbstractPixiRenderer extends AbstractRenderer  {

  constructor(name) {
    super();
    this._name = name;

    settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false;

    this._masterContainer = new Container();
    this._tankContainer = new Container();
    this._bulletContainer = new Container();
    this._hudContainer = new Container();
    this._masterContainer.addChild(this._tankContainer );
    this._masterContainer.addChild(this._bulletContainer);
    this._masterContainer.addChild(this._hudContainer);
    this._renderer = null;
    this._stage = null;
    this._clockModel = new PixiRendererClockModel();
    this._clockView = null;
    this._battlefieldView = null;
    if(window.devicePixelRatio >= 2) {
      this._rendererScale = 2;
    } else {
      this._rendererScale = 1;
    }
  }

  get stage() {
    return this._stage;
  }

  get battlefieldView() {
    return this._battlefieldView;
  }

  get masterContainer() {
    return this._masterContainer;
  }

  initBatlefield(battlefield) {
    super.initBatlefield(battlefield);
    this._masterContainer.x = -this.offsetX;
    this._masterContainer.y = -this.offsetY;

    let rendererSettings = {
      view: this._canvas,
      antialias: false,
      backgroundColor: 0xffffff,
      resolution: this._rendererScale,
      width: battlefield.width + 2 * battlefield.margin,
      height: battlefield.height + 2 * battlefield.margin
    };

    this._renderer = new autoDetectRenderer(
      rendererSettings
    );
    this._stage = new Container();

    this._battlefieldView = this._createBattlefieldView(battlefield);
    this._clockView = this._createClockView(this._clockModel);

    this._stage.addChild(this._battlefieldView.view);
    this._stage.addChild(this._masterContainer);
    this._stage.addChild(this._clockView.view);

    this._renderer.render(this._stage);
  }

  init(canvas) {
    this._canvas = canvas;
  }

  loadAssets(done, urlPrefix) {
    urlPrefix = urlPrefix || '';
    if(!this._name) {
      done();
      return;
    }
    let loader = new Loader();
    let loadedResources = [];
    for(let res in loader.resources) {
      loadedResources.push(res);
    }

    this._getSpritesheetUrls(this._name, this._rendererScale)
      .filter((url) => {
        return loadedResources.indexOf(url) == -1;
      })
      .forEach((url) => {
        loader.add(urlPrefix + url);
      });
    loader.load((loader, resources) => {
      this.onAssetsLoaded();
      done();
    });
  }


  onAssetsLoaded() {

  }

  preRender() {
    this._battlefieldView.update();
  }

  renderTank(tank, events) {
    super.renderTank(tank, events);
    let view = this.getTankView(tank.id);
    if(!view.parent && view.isAlive) {
      this._tankContainer.addChild(view.view);
      this._hudContainer.addChild(view.hudView);
    }
  }

  renderBullet(bullet, events) {
    super.renderBullet(bullet, events);
    let view = this.getBulletView(bullet.id);
    if(!view.parent && view.isAlive) {
      this._bulletContainer.addChild(view.view);
    }
  }

  renderClock(msElapsed, msLimit) {
    this._clockModel.update(msElapsed, msLimit);
    this._clockView.update();
  }

  postRender() {
    super.postRender();
    this._renderer.render(this._stage);
  }

  _getSpritesheetUrls(rendererName, rendererScale) {
    let resolution = (rendererScale == 2) ? "retina@2x" : "web";
    return [
      `img/spritesheets/${rendererName}/${resolution}/jsbattle.json`
    ];
  }

  _createTankView(tank) {
    return new AbstractPixiTankView(tank);
  }

  _createBulletView(bullet) {
    return new AbstractPixiView(bullet);
  }

  _createBattlefieldView(battlefield) {
    return new AbstractPixiView(battlefield);
  }

  _createClockView(clock) {
    return new AbstractPixiView(clock);
  }

  dispose() {
    this._renderer.context.gl.getExtension('WEBGL_lose_context').loseContext();
    this._renderer.destroy();
    this._renderer = null;
    this._canvas = null;
    this._stage = null;

    utils.clearTextureCache();
  }

}
