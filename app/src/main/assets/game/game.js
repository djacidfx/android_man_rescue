/// <reference path="references.ts" />
var DNStateManager = (function() {
    function DNStateManager(manifest, sound_manifest, athlases, localizable_images) {
        var _this = this;
        this.statesConstainer = new createjs.Container();
        this.mouseDown = false;
        this.timeDevider = 1;
        this.liveTime = 0;
        this.isLoading = true;
        this.lastTime = 0;
        this.lastMouseUpHandlerTime = -1;
        this.lastMouseDownHandlerTime = -1;
        this.lastMouseMoveHandlerTime = -1;
        DNGameConfig.loadAPI();
        DNStateManager.g_instance = this;
        this.states = Array();
        //  create stage and point it to the canvas:
        this.canvas = document.getElementById("canvas");
        //  check to see if we are running in a browser with touch support
        this.stage = new createjs.Stage(this.canvas);
        this.stage.autoClear = false;
        //  enable touch interactions if supported on the current device:
        createjs.Touch.enable(this.stage);
        //  enabled mouse over / out events
        this.stage.enableMouseOver(5);
        createjs.Ticker.setFPS(30);
        createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
        createjs.Ticker.addEventListener("tick", function(e) {
            return _this.update(e);
        });
        if (Constants.DEBUG_MODE) {
            document.onkeydown = function(e) {
                return _this.onKeyDown(e);
            };
            document.onkeyup = function(e) {
                return _this.onKeyUp(e);
            };
        }
        this.pushState(new PreloaderState(manifest, sound_manifest, athlases, localizable_images));
        this.stage.addChild(this.statesConstainer);
        Constants.PIXEL_RATIO = (window.devicePixelRatio ? window.devicePixelRatio : 1);
        window.onresize = (function(e) {
            return _this.onResize(e);
        });
        this.onResize(null);
        //  ???
        if (viewporter.ACTIVE) {
            window.addEventListener('viewportready', function() {
                return _this.onOrientationChanged();
            });
            window.addEventListener('viewportchange', function() {
                return _this.onOrientationChanged();
            });
        } else {
            window.addEventListener("orientationchange", function() {
                return _this.onOrientationChanged();
            });
        }
        this.onOrientationChanged();
        this.stage.addEventListener(Constants.MOUSE_MOVE, (function(e) {
            return _this.handleMouse(e);
        }));
        this.stage.addEventListener(Constants.MOUSE_DOWN, (function(e) {
            return _this.handleMouse(e);
        }));
        this.stage.addEventListener(Constants.MOUSE_UP, (function(e) {
            return _this.handleMouse(e);
        }));
        if (Visibility.isSupported()) {
            Visibility.change(function(e, state) {
                console.log(state);
                if (state == "hidden") {
                    DNStateManager.g_instance.onLostFocus(null);
                } else if (state == "visible") {
                    DNStateManager.g_instance.onFocus(null);
                }
            });
        }
    }
    DNStateManager.prototype.isLandscape = function() {
        return viewporter.isLandscape();
    };
    DNStateManager.prototype.onOrientationChanged = function() {
        this.resizeTo(window.innerWidth, window.innerHeight);
    };
    DNStateManager.prototype.onResize = function(e) {
        this.resizeTo(window.innerWidth, window.innerHeight);
    };
    //  Jelly Madness style
    DNStateManager.prototype.resizeTo = function(w, h) {
        //  if portrait
        if (w < h) {
            Constants.SCREEN_SCALE = w / Constants.ASSETS_WIDTH * Constants.PIXEL_RATIO;
        } else {
            Constants.SCREEN_SCALE = Math.min(w / Constants.ASSETS_WIDTH, h / Constants.ASSETS_HEIGHT) * Constants.PIXEL_RATIO;
        }
        //  canvas h = screen h anyway
        Constants.SCREEN_HEIGHT = h / Constants.SCREEN_SCALE * Constants.PIXEL_RATIO;
        this.canvas.width = Constants.ASSETS_WIDTH * Constants.SCREEN_SCALE;
        this.canvas.height = h * Constants.PIXEL_RATIO;
        this.canvas.style.width = this.canvas.width / Constants.PIXEL_RATIO + "px";
        this.canvas.style.height = this.canvas.height / Constants.PIXEL_RATIO + "px";
        this.statesConstainer.scaleX = this.statesConstainer.scaleY = Constants.SCREEN_SCALE;
        this.canvas.style.marginLeft = (w - Constants.ASSETS_WIDTH * Constants.SCREEN_SCALE / Constants.PIXEL_RATIO) / 2 + "px";
        this.canvas.style.marginTop = "0px";
    };
    DNStateManager.prototype.allAssetsLoaded = function() {
        this.isLoading = false;
        GameData.getInstance().load();
        this.changeState(new MainMenuState());
    };
    DNStateManager.prototype.update = function(event) {
        var tm = createjs.Ticker.getTime();
        var delta = (tm - this.lastTime);
        this.lastTime = tm;
        var dt = delta * 0.001 / this.timeDevider;
        this.liveTime += dt;
        DNSoundManager.g_instance.update();
        if (this.states.length != 0) {
            var top_state = this.states[this.states.length - 1];
            if (!top_state.isInitiliazed()) {
                top_state.init();
            }
            top_state.update(dt);
        }
        for (var i = 0; i < this.states.length; i++) {
            this.states[i].alignByCenter(i == 0);
        }
        for (var i = 0; i < this.states.length; i++) {
            this.states[i].forceUpdate(dt);
        }
        this.stage.update(event);
    };
    DNStateManager.prototype.changeState = function(game_state) {
        while (this.states.length != 0) {
            this.popState();
        }
        this.pushState(game_state);
    };
    DNStateManager.prototype.pushState = function(game_state) {
        this.states.push(game_state);
        this.statesConstainer.addChild(game_state);
    };
    DNStateManager.prototype.popState = function() {
        if (this.states.length != 0) {
            this.states[this.states.length - 1].cleanup();
            this.statesConstainer.removeChild(this.states[this.states.length - 1]);
            this.states.pop();
            if (this.states.length != 0) {
                this.states[this.states.length - 1].resume();
            }
        }
    };
    DNStateManager.prototype.onLostFocus = function(e) {
        DNSoundManager.g_instance.onLostFocus();
    };
    DNStateManager.prototype.onFocus = function(e) {
        DNSoundManager.g_instance.onFocus();
    };
    DNStateManager.prototype.handleMouse = function(event) {
        if (this.states.length == 0) {
            return;
        }
        event.preventDefault();
        var top_state = this.states[this.states.length - 1];
        switch (event.type) {
            case Constants.MOUSE_DOWN:
                {
                    DNSoundManager.g_instance.init();
                    DNSoundManager.g_instance.playMusic(0.2);
                    if (this.liveTime == this.lastMouseDownHandlerTime) {
                        return;
                    }
                    this.lastMouseDownHandlerTime = this.liveTime;
                    this.mouseDown = true;
                    top_state.onMouseDown(event.stageX / Constants.SCREEN_SCALE, event.stageY / Constants.SCREEN_SCALE);
                }
                break;
            case Constants.MOUSE_UP:
                {
                    if (this.liveTime == this.lastMouseUpHandlerTime) {
                        return;
                    }
                    this.lastMouseUpHandlerTime = this.liveTime;
                    this.mouseDown = false;
                    top_state.onMouseUp(event.stageX / Constants.SCREEN_SCALE, event.stageY / Constants.SCREEN_SCALE);
                }
                break;
            case Constants.MOUSE_MOVE:
                {
                    if (this.liveTime == this.lastMouseMoveHandlerTime) {
                        return;
                    }
                    this.lastMouseMoveHandlerTime = this.liveTime;
                    if (this.mouseDown) {
                        top_state.onMouseMove(event.stageX / Constants.SCREEN_SCALE, event.stageY / Constants.SCREEN_SCALE);
                    }
                }
                break;
        }
    };
    DNStateManager.prototype.onKeyDown = function(event) {
        switch (event.keyCode) {
            case 65:
                {
                    this.timeDevider = 5;
                }
                break;
            case 68:
                {
                    this.timeDevider = 10;
                }
                break;
        }
        this.stage.update();
    };
    DNStateManager.prototype.onKeyUp = function(event) {
        switch (event.keyCode) {
            case 65:
                {
                    this.timeDevider = 1;
                }
                break;
            case 68:
                {
                    this.timeDevider = 1;
                }
                break;
        }
    };
    DNStateManager.prototype.onPause = function() {
        if (this.states.length != 0) {
            this.states[this.states.length - 1].onPause();
        }
    };
    DNStateManager.prototype.onResume = function() {
        if (this.states.length != 0) {
            this.states[this.states.length - 1].onResume();
        }
    };
    DNStateManager.prototype.onRestart = function() {
        if (this.states.length != 0) {
            this.states[this.states.length - 1].onRestart();
        }
    };
    DNStateManager.prototype.isMouseDownNow = function() {
        return this.mouseDown;
    };
    DNStateManager.prototype.getTopState = function() {
        if (this.states.length > 0) {
            return this.states[this.states.length - 1];
        }
        return null;
    };
    return DNStateManager;
})();
/// <reference path="references.ts" />
var __extends = this.__extends || function(d, b) {
    for (var p in b)
        if (b.hasOwnProperty(p)) d[p] = b[p];

    function __() {
        this.constructor = d;
    }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var DNGameState = (function(_super) {
    __extends(DNGameState, _super);

    function DNGameState() {
        _super.call(this);
        this.liveTime = 0.0;
        this.gameObjects = new Array();
        this.gui = new Array();
        this.newGameObjects = new Array();
        this.initiliazed = false;
        this.consoleH = 200;
        this.haveFill = false;
    }
    DNGameState.prototype.getShader = function() {
        return this.shaderShape;
    };
    DNGameState.prototype.addShader = function(color) {
        //  shading
        this.shaderShape = Utils.DrawRect(Constants.ASSETS_WIDTH, Constants.ASSETS_HEIGHT, color, this);
        this.shaderShape.alpha = 0;
        createjs.Tween.get(this.shaderShape).wait(300).to({
            alpha: 0.75
        }, 800, createjs.Ease.linear);
    };
    DNGameState.prototype.consolePrint = function(text) {
        var label = new createjs.Text(text, "bold 35px Verdana", "#000000");
        this.addChild(label);
        label.x = 50;
        label.y = this.consoleH;
        this.consoleH += 40;
    };
    DNGameState.prototype.isInitiliazed = function() {
        return this.initiliazed;
    };
    DNGameState.prototype.onMouseDown = function(x, y) {
        DNGUIObject.wasHandlerThisFrame = false;
        for (var i = 0; i < this.gui.length; i++) {
            this.gui[i].onMouseDown(x, y);
        }
    };
    DNGameState.prototype.onMouseMove = function(x, y) {
        DNGUIObject.wasHandlerThisFrame = false;
        for (var i = 0; i < this.gui.length; i++) {
            this.gui[i].onMouseMove(x, y);
        }
    };
    DNGameState.prototype.onMouseUp = function(x, y) {
        DNGUIObject.wasHandlerThisFrame = false;
        for (var i = 0; i < this.gui.length; i++) {
            this.gui[i].onMouseUp(x, y);
        }
    };
    DNGameState.prototype.addGuiObject = function(gui_object) {
        this.gui.push(gui_object);
        this.addGameObject(gui_object);
    };
    DNGameState.prototype.update = function(dt) {
        this.liveTime += dt;
        this.newGameObjects = new Array();
        for (var i = 0; i < this.gameObjects.length; i++) {
            var obj = this.gameObjects[i];
            obj.update(dt);
            if (obj.isDead()) {
                obj.onDead();
            } else {
                this.newGameObjects.push(obj);
            }
        }
        this.gameObjects = this.newGameObjects;
    };
    DNGameState.prototype.forceUpdate = function(dt) {
        for (var i = 0; i < this.gameObjects.length; i++) {
            this.gameObjects[i].forceUpdate(dt);
        }
    };
    DNGameState.prototype.addGameObject = function(obj) {
        this.gameObjects.push(obj);
    };
    DNGameState.prototype.addGameObjectAt = function(obj, layer) {
        this.gameObjects.push(obj);
        if (layer) {
            layer.addChild(obj);
        }
    };
    DNGameState.prototype.addGameObjectAtPos = function(obj, layer, x, y) {
        this.gameObjects.push(obj);
        if (layer) {
            layer.addChild(obj);
            obj.x = x;
            obj.y = y;
        }
    };
    DNGameState.prototype.cleanup = function() {};
    DNGameState.prototype.resume = function() {};
    DNGameState.prototype.init = function() {
        this.initiliazed = true;
    };
    DNGameState.prototype.onOrientationChanged = function(landscape) {};
    DNGameState.prototype.alignByCenter = function(need_fill) {
        if (!Constants.g_isPC) {
            this.y = (Constants.SCREEN_HEIGHT - Constants.ASSETS_HEIGHT) / 2;
        } else {
            return;
        }
        if (need_fill) {
            if (Constants.ASSETS_HEIGHT < Constants.SCREEN_HEIGHT && !this.haveFill) {
                this.haveFill = true;
                var fill_down = DNAssetsManager.g_instance.getImage(Images.FILL);
                this.addChild(fill_down);
                var fill_up = DNAssetsManager.g_instance.getImage(Images.FILL);
                this.addChild(fill_up);
                fill_up.scaleY = -1;
                var fill_h = 206;
                var diff = (Constants.SCREEN_HEIGHT - Constants.ASSETS_HEIGHT) / 2;
                if (diff > fill_h) {
                    fill_down.scaleY = (diff / fill_h);
                    fill_up.scaleY = -(diff / fill_h);
                    fill_down.y = Constants.ASSETS_HEIGHT;
                } else {
                    fill_down.y = Constants.ASSETS_HEIGHT;
                }
            }
        }
    };
    DNGameState.prototype.loadLayout = function(layout, layer) {
        for (var i = 0; i < layout.length; i++) {
            var element = layout[i];
            var gui_object = this.loadGUIObject(element, layer);
            if (element["children"]) {
                this.loadLayout(element["children"], gui_object);
            }
        }
    };
    DNGameState.prototype.checkParam = function(element, param) {
        if (!param) {}
    };
    DNGameState.prototype.loadGUIObject = function(element, layer) {
        var picture = element["picture"];
        var gui_object;
        switch (element["type"]) {
            case Layouts.TYPE_LOCALIZABLE_LABEL:
                gui_object = new DNLocalizableLabel(element["font"], element["text"], element["align_h"], element["max_width"], element["max_scale"]);
                break;
            case Layouts.TYPE_BITMAP_LABEL:
                gui_object = new DNBitmapLabel(element["font"], element["text"], element["align_h"], element["max_width"], element["max_scale"]);
                break;
            case Layouts.TYPE_LOGO_PLACEHOLDER:
                gui_object = new DNLogoPlaceholder(element["max_width"] || 200, element["max_height"] || 100);
                break;
            case Layouts.TYPE_BUTTON:
                this.checkParam(element, picture);
                gui_object = new DNButton(picture);
                break;
            case Layouts.TYPE_STATIC_PICTURE:
                this.checkParam(element, picture);
                gui_object = new DNStaticPicture(picture);
                break;
            case Layouts.TYPE_PLACEHOLDER:
                gui_object = new DNPlaceholder();
                break;
            case Layouts.TYPE_FLAT_BUTTON:
                gui_object = new DNFlatButton(picture);
                break;
            case Layouts.TYPE_FANCY_BUTTON:
                gui_object = new DNFancyButton(picture);
                break;
            case Layouts.TYPE_PROGRESS_BAR:
                gui_object = new DNProgressBar(element["back"], picture);
                break;
        }
        if (gui_object) {
            gui_object.name = element["name"];
            gui_object.x = element["x"] || 0;
            gui_object.y = element["y"] || 0;
            gui_object.rotation = element["rotation"] || 0;
            gui_object.scaleX = gui_object.scaleY = (element["scale"] || 1);
            gui_object.alpha = (element["alpha"] || 1);
            this.addGuiObject(gui_object);
            layer.addChild(gui_object);
        } else {}
        return gui_object;
    };
    DNGameState.prototype.findGUIObject = function(name) {
        for (var i = 0; i < this.gui.length; i++) {
            if (this.gui[i].name == name) {
                return this.gui[i];
            }
        }
        return null;
    };
    DNGameState.prototype.onPause = function() {};
    DNGameState.prototype.onResume = function() {};
    DNGameState.prototype.onRestart = function() {};
    DNGameState.prototype.onKeyUp = function(key_code) {};
    DNGameState.prototype.onKeyDown = function(key_code) {};
    return DNGameState;
})(createjs.Container);
/// <reference path="references.ts" />
var SubmarineState = (function(_super) {
    __extends(SubmarineState, _super);

    function SubmarineState() {
        _super.call(this);
        this.layout = [{
            type: Layouts.TYPE_STATIC_PICTURE,
            picture: Images.WINDOW,
            x: Constants.ASSETS_WIDTH + 250,
            y: Constants.ASSETS_HEIGHT * 0.50,
            name: "panel",
            children: [{
                    type: Layouts.TYPE_BITMAP_LABEL,
                    x: 10,
                    y: -115,
                    font: Fonts.fontGreen,
                    text: "Level failed!",
                    name: "caption",
                },
                {
                    type: Layouts.TYPE_BITMAP_LABEL,
                    x: 5,
                    y: -15,
                    font: Fonts.fontGUI,
                    text: "score:",
                    name: "score_caption",
                    align_h: 1 /* RIGHT */ ,
                    max_scale: 0.85,
                },
                {
                    type: Layouts.TYPE_BITMAP_LABEL,
                    x: 20,
                    y: -15,
                    font: Fonts.fontGUI,
                    text: "000000",
                    name: "score",
                    align_h: 0 /* LEFT */ ,
                    max_scale: 0.85,
                },
                {
                    type: Layouts.TYPE_BITMAP_LABEL,
                    x: 5,
                    y: 25,
                    font: Fonts.fontGUI,
                    text: "total score:",
                    name: "total_score_caption",
                    align_h: 1 /* RIGHT */ ,
                    max_scale: 0.85,
                },
                {
                    type: Layouts.TYPE_BITMAP_LABEL,
                    x: 20,
                    y: 25,
                    font: Fonts.fontGUI,
                    text: "000000",
                    name: "total_score",
                    align_h: 0 /* LEFT */ ,
                    max_scale: 0.85,
                },
                {
                    type: Layouts.TYPE_PLACEHOLDER,
                    x: 273,
                    y: -18,
                    name: "screw_place",
                },
                {
                    type: Layouts.TYPE_STATIC_PICTURE,
                    x: -5,
                    y: -120,
                    picture: Images.TUBE,
                    name: "tube",
                },
                {
                    type: Layouts.TYPE_PLACEHOLDER,
                    x: -110 + 5,
                    y: 140,
                    name: "down_place_1",
                },
                {
                    type: Layouts.TYPE_PLACEHOLDER,
                    x: -65 + 5,
                    y: 140,
                    name: "down_place_1_5",
                },
                {
                    type: Layouts.TYPE_PLACEHOLDER,
                    x: 0 + 5,
                    y: 140,
                    name: "down_place_2",
                },
                {
                    type: Layouts.TYPE_PLACEHOLDER,
                    x: +65 + 5,
                    y: 140,
                    name: "down_place_2_5",
                },
                {
                    type: Layouts.TYPE_PLACEHOLDER,
                    x: +110 + 5,
                    y: 140,
                    name: "down_place_3",
                },
            ]
        }];
        this.hiddingNow = false;
        this.screw = new DNMovieClip("screw", 0.04, true);
        this.screwSpeed = 1.3;
        this.bubbleLayer = new createjs.Container();
        this.tubeOffset = 12;
        this.addShader("#1adce8");
        this.addChild(this.bubbleLayer);
        this.loadLayout(this.layout, this);
        this.panel = this.findGUIObject("panel");
        this.bubbleSpawner = new BubbleSpawner2(this, this.bubbleLayer);
        this.addGameObjectAt(this.bubbleSpawner, this);
        createjs.Tween.get(this.panel).wait(200).to({
            x: Constants.ASSETS_WIDTH / 2
        }, 1400, createjs.Ease.circOut);
        this.findGUIObject("screw_place").addChild(this.screw);
        this.tube = this.findGUIObject("tube");
        this.tube.getChildAt(0).x = 87 - 114;
        this.tube.getChildAt(0).y = -127;
        this.panel.addChildAt(this.tube, 0);
        DNSoundManager.g_instance.play(Sounds.POPUP, 0.15);
    }
    SubmarineState.prototype.setScoreTexts = function(score) {
        if (score != undefined) {
            this.findGUIObject("score").setText(Utils.GetScoreString(score));
            this.findGUIObject("total_score").setText(Utils.GetScoreString(GameData.getInstance().getTotalScore()));
        } else {
            this.findGUIObject("score").visible = false;
            this.findGUIObject("score_caption").visible = false;
            this.findGUIObject("total_score").visible = false;
            this.findGUIObject("total_score_caption").visible = false;
        }
    };
    SubmarineState.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        if (this.hiddingNow) {
            this.tube.rotation = Math.sin(this.liveTime * 8) * this.tubeOffset;
            this.tubeOffset += dt * 9;
        } else {
            this.tube.rotation = Math.sin(this.liveTime * 8) * this.tubeOffset;
            this.tubeOffset -= dt * 5;
            if (this.tubeOffset < 0) {
                this.tubeOffset = 0;
            }
        }
        this.panel.rotation = this.tube.rotation * 0.16;
        if (!this.hiddingNow) {
            this.screwSpeed -= dt * 0.2;
            if (this.screwSpeed < 0.8) {
                this.bubbleSpawner.pause();
            }
            if (this.screwSpeed < 0) {
                this.screwSpeed = 0;
            }
        } else {
            this.screwSpeed += dt * 2;
            if (this.screwSpeed >= 1.5) {
                this.screwSpeed = 1.5;
            }
        }
        this.bubbleSpawner.x = this.panel.x + 220;
        this.bubbleSpawner.y = this.panel.y + 20;
        this.screw.update(dt * this.screwSpeed);
        this.bubbleLayer.alpha = this.getShader().alpha / 0.7;
    };
    SubmarineState.prototype.hide = function() {
        if (!this.hiddingNow) {
            createjs.Tween.removeTweens(this.getShader());
            createjs.Tween.get(this.getShader()).wait(300).to({
                alpha: 0.0
            }, 1400, createjs.Ease.linear).call(function() {
                return DNStateManager.g_instance.popState();
            });
            createjs.Tween.get(this.panel).to({
                x: -320
            }, 1400, createjs.Ease.circIn);
            this.hiddingNow = true;
            DNSoundManager.g_instance.play(Sounds.POPUP, 0.15);
            this.bubbleSpawner.resume();
        }
    };
    SubmarineState.prototype.onRestartTouch = function() {
		gradle.event('btn_restart');
        DNStateManager.g_instance.pushState(new ShadeInState(new PlayState(-1)));
    };
    SubmarineState.prototype.onExitTouch = function() {
		gradle.event('btn_exit');
        DNStateManager.g_instance.pushState(new TransitionInState(new SelectLevelState(PlayState.level)));
    };
    return SubmarineState;
})(DNGameState);
/// <reference path="references.ts" />
var GameData = (function() {
    function GameData() {
        this.COMPLETED_STR = "levelsCompleted";
        this.SCORE_STR = "totalScore";
        this.SCORE_STARS = "starsPerLevel";
        this.totalScore = 0;
        this.levelsCompleted = 0;
        this.starsPerLevel = new Array();
        //  10 - rainbow
        //  9 - monster
        //  8 - bomb
        //  7 - line
        //  6 - vertical
        //  0 - hole
        //  1-5 chip
        //[
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        //],
        this.levels = [
            [
                [0, 0, 4, 4, 4, 4, 4, 4, 0, 0],
                [0, 0, 4, 4, 4, 4, 4, 4, 0, 0],
                [0, 0, 4, 4, 4, 4, 4, 4, 0, 0],
                [0, 0, 2, 3, 3, 3, 3, 2, 0, 0],
                [0, 0, 3, 2, 2, 2, 2, 0, 0, 0],
                [0, 0, 0, 2, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 0, 5, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 2, 5, 1, 1, 0, 0, 0],
                [0, 0, 0, 3, 2, 5, 1, 0, 0, 0],
                [0, 0, 0, 4, 3, 2, 5, 0, 0, 0],
                [0, 0, 0, 1, 4, 3, 2, 0, 0, 0],
                [0, 0, 0, 9, 1, 4, 3, 0, 0, 0],
                [0, 0, 0, 0, 9, 1, 4, 0, 0, 0],
                [0, 0, 0, 0, 0, 9, 1, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 9, 0, 0, 0],
            ],
            [
                [3, 3, 1, 4, 4, 4, 4, 2, 3, 3],
                [3, 1, 1, 1, 3, 3, 2, 2, 2, 3],
                [1, 1, 8, 1, 1, 2, 2, 8, 2, 2],
                [0, 1, 1, 1, 3, 3, 2, 2, 2, 0],
                [0, 0, 1, 4, 4, 4, 4, 2, 0, 0],
                [0, 0, 0, 9, 0, 0, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
                [0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
                [0, 0, 0, 3, 2, 2, 3, 0, 0, 0],
                [0, 0, 0, 4, 3, 3, 4, 0, 0, 0],
                [0, 0, 0, 5, 4, 4, 1, 0, 0, 0],
                [0, 0, 0, 5, 5, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 5, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 2, 3, 4, 4, 1, 2, 0, 0],
                [0, 0, 2, 3, 3, 1, 1, 2, 0, 0],
                [0, 0, 2, 5, 2, 2, 5, 2, 0, 0],
                [0, 0, 5, 5, 2, 4, 5, 5, 0, 0],
                [0, 0, 5, 4, 4, 0, 4, 5, 0, 0],
                [0, 0, 4, 0, 0, 0, 0, 4, 0, 0],
                [0, 0, 9, 0, 0, 0, 0, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 5, 1, 4, 1, 5, 1, 0, 0],
                [0, 0, 4, 4, 2, 4, 4, 0, 0, 0],
                [0, 0, 5, 1, 4, 1, 5, 0, 0, 0],
                [0, 0, 2, 2, 8, 2, 2, 0, 0, 0],
                [0, 0, 1, 3, 4, 1, 3, 0, 0, 0],
                [0, 0, 1, 1, 2, 3, 3, 0, 0, 0],
                [0, 0, 1, 1, 10, 3, 3, 0, 0, 0],
                [0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 4, 3, 2, 1, 1, 2, 3, 4, 0],
                [0, 4, 3, 2, 1, 1, 2, 3, 4, 0],
                [0, 0, 4, 3, 2, 2, 3, 4, 0, 0],
                [0, 0, 5, 4, 3, 3, 4, 5, 0, 0],
                [0, 0, 2, 5, 4, 4, 5, 2, 0, 0],
                [0, 0, 0, 2, 5, 5, 2, 0, 0, 0],
                [0, 0, 0, 3, 2, 2, 3, 0, 0, 0],
                [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
            ],
            [
                [0, 0, 3, 3, 4, 4, 3, 3, 0, 0],
                [0, 0, 7, 1, 1, 2, 2, 1, 0, 0],
                [0, 0, 3, 3, 4, 4, 3, 3, 0, 0],
                [0, 0, 1, 2, 2, 1, 1, 7, 0, 0],
                [0, 0, 3, 3, 4, 4, 3, 3, 0, 0],
                [0, 0, 9, 0, 9, 9, 0, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 4, 4, 4, 1, 1, 4, 4, 4, 0],
                [0, 0, 4, 1, 1, 1, 1, 4, 0, 0],
                [0, 0, 4, 2, 2, 2, 2, 4, 0, 0],
                [0, 0, 9, 3, 2, 2, 3, 9, 0, 0],
                [0, 0, 0, 3, 3, 3, 3, 0, 0, 0],
                [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 2, 1, 1, 6, 1, 1, 2, 0, 0],
                [0, 3, 4, 4, 1, 4, 4, 3, 0, 0],
                [0, 0, 2, 1, 7, 1, 2, 0, 0, 0],
                [0, 0, 5, 5, 6, 5, 5, 0, 0, 0],
                [0, 0, 0, 2, 1, 2, 0, 0, 0, 0],
                [0, 0, 0, 9, 6, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 6, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 0, 0, 3, 5, 5, 0, 0, 0],
                [0, 0, 0, 0, 3, 3, 1, 0, 0, 0],
                [0, 0, 0, 0, 5, 4, 4, 0, 0, 0],
                [0, 0, 0, 0, 1, 3, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 2, 2, 0, 0, 0],
                [0, 0, 0, 0, 0, 1, 2, 0, 0, 0],
                [0, 0, 0, 0, 0, 3, 3, 0, 0, 0],
                [0, 0, 0, 0, 0, 4, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
            ],
            [
                [0, 1, 1, 3, 3, 2, 2, 4, 4, 0],
                [0, 4, 4, 4, 3, 2, 1, 1, 1, 0],
                [0, 0, 5, 1, 3, 2, 4, 5, 0, 0],
                [0, 0, 5, 5, 3, 2, 5, 5, 0, 0],
                [0, 0, 1, 5, 3, 2, 5, 4, 0, 0],
                [0, 0, 0, 2, 2, 3, 3, 0, 0, 0],
                [0, 0, 0, 2, 0, 0, 3, 0, 0, 0],
                [0, 0, 0, 9, 0, 0, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 0, 1, 5, 5, 1, 0, 0, 0],
                [0, 0, 0, 5, 2, 2, 5, 0, 0, 0],
                [0, 0, 0, 5, 2, 2, 5, 0, 0, 0],
                [0, 0, 0, 3, 5, 5, 3, 0, 0, 0],
                [0, 0, 0, 4, 1, 1, 4, 0, 0, 0],
                [0, 0, 0, 4, 3, 3, 4, 0, 0, 0],
                [0, 0, 0, 0, 4, 4, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 1, 1, 1, 4, 4, 4, 4, 0],
                [0, 5, 5, 5, 3, 3, 5, 5, 5, 0],
                [0, 2, 2, 1, 4, 4, 1, 2, 2, 0],
                [0, 2, 2, 4, 3, 3, 4, 2, 2, 0],
                [0, 1, 1, 0, 9, 9, 0, 1, 1, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [4, 4, 4, 3, 4, 4, 3, 4, 4, 4],
                [0, 3, 3, 2, 9, 9, 2, 3, 3, 0],
                [0, 2, 2, 1, 0, 0, 1, 2, 2, 0],
                [0, 1, 1, 3, 0, 0, 3, 1, 1, 0],
                [0, 3, 3, 2, 0, 0, 2, 3, 3, 0],
                [0, 2, 2, 1, 0, 0, 1, 2, 2, 0],
                [0, 1, 1, 4, 0, 0, 4, 1, 1, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 5, 4, 5, 4, 5, 4, 3, 0],
                [0, 0, 2, 1, 3, 1, 4, 1, 3, 0],
                [0, 0, 2, 2, 3, 3, 4, 4, 3, 0],
                [0, 0, 1, 2, 1, 3, 1, 0, 3, 0],
                [0, 0, 0, 1, 9, 1, 0, 0, 7, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 2, 2, 2, 3, 1, 1, 1, 0],
                [0, 0, 0, 1, 4, 3, 3, 2, 0, 0],
                [0, 0, 0, 1, 4, 1, 1, 2, 0, 0],
                [0, 0, 0, 7, 3, 3, 2, 7, 0, 0],
                [0, 0, 0, 2, 4, 1, 1, 2, 0, 0],
                [0, 0, 0, 1, 3, 9, 9, 9, 0, 0],
                [0, 0, 0, 9, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 2, 1, 3, 4, 4, 3, 1, 7, 0],
                [0, 2, 1, 2, 3, 3, 2, 1, 2, 0],
                [0, 1, 8, 1, 4, 4, 1, 8, 1, 0],
                [0, 2, 1, 2, 3, 3, 2, 1, 2, 0],
                [0, 0, 1, 3, 4, 4, 3, 1, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [3, 3, 1, 1, 2, 1, 1, 3, 3, 0],
                [4, 4, 3, 2, 1, 2, 3, 4, 4, 0],
                [4, 4, 1, 3, 2, 3, 1, 4, 4, 0],
                [1, 1, 1, 2, 8, 2, 1, 1, 1, 0],
                [0, 2, 5, 2, 3, 2, 5, 2, 0, 0],
                [0, 0, 5, 5, 3, 5, 5, 0, 0, 0],
                [0, 0, 2, 5, 6, 5, 2, 0, 0, 0],
                [0, 0, 9, 9, 9, 9, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 2, 4, 4, 4, 2, 0, 0, 0],
                [0, 0, 2, 5, 3, 5, 2, 0, 0, 0],
                [0, 0, 2, 3, 1, 3, 2, 0, 0, 0],
                [0, 0, 2, 1, 2, 1, 2, 0, 0, 0],
                [0, 0, 5, 2, 2, 2, 5, 0, 0, 0],
                [0, 0, 5, 1, 2, 1, 5, 0, 0, 0],
                [0, 0, 9, 5, 1, 5, 9, 0, 0, 0],
                [0, 0, 0, 9, 5, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 1, 5, 2, 1, 5, 0, 0, 0],
                [0, 0, 1, 4, 2, 3, 5, 0, 0, 0],
                [0, 0, 2, 2, 6, 2, 2, 0, 0, 0],
                [0, 0, 1, 3, 2, 4, 5, 0, 0, 0],
                [0, 0, 9, 5, 2, 1, 9, 0, 0, 0],
                [0, 0, 0, 5, 6, 1, 0, 0, 0, 0],
                [0, 0, 0, 9, 8, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 6, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 5, 2, 2, 2, 4, 0, 0, 0],
                [0, 0, 1, 5, 1, 4, 1, 0, 0, 0],
                [0, 0, 1, 2, 2, 2, 1, 0, 0, 0],
                [0, 0, 1, 5, 3, 4, 1, 0, 0, 0],
                [0, 0, 5, 5, 6, 4, 4, 0, 0, 0],
                [0, 0, 5, 9, 9, 9, 4, 0, 0, 0],
                [0, 0, 9, 0, 0, 0, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [1, 2, 1, 4, 1, 1, 4, 1, 2, 1],
                [2, 3, 2, 3, 4, 4, 3, 2, 3, 2],
                [3, 3, 3, 10, 2, 2, 10, 3, 3, 3],
                [0, 10, 1, 4, 1, 1, 4, 1, 10, 0],
                [0, 2, 1, 2, 4, 4, 2, 1, 2, 0],
                [0, 9, 0, 2, 4, 4, 2, 0, 9, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 4, 2, 1, 1, 3, 3, 1, 5, 0],
                [0, 4, 2, 1, 1, 2, 2, 1, 5, 0],
                [0, 9, 2, 3, 3, 2, 2, 1, 9, 0],
                [0, 0, 4, 5, 5, 4, 4, 5, 0, 0],
                [0, 0, 0, 5, 5, 1, 1, 0, 0, 0],
                [0, 0, 0, 4, 4, 1, 1, 0, 0, 0],
                [0, 0, 0, 9, 9, 9, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 3, 4, 3, 2, 4, 2, 0, 0],
                [0, 0, 4, 4, 4, 4, 4, 4, 0, 0],
                [0, 0, 1, 3, 1, 3, 2, 3, 0, 0],
                [0, 0, 1, 1, 1, 3, 3, 3, 0, 0],
                [0, 0, 4, 3, 4, 1, 2, 1, 0, 0],
                [0, 0, 4, 4, 4, 1, 1, 1, 0, 0],
                [0, 0, 9, 0, 9, 9, 0, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 3, 2, 1, 5, 1, 2, 3, 0, 0],
                [0, 3, 2, 5, 5, 5, 2, 3, 0, 0],
                [0, 4, 5, 5, 8, 5, 5, 4, 0, 0],
                [0, 4, 3, 5, 5, 5, 3, 4, 0, 0],
                [0, 0, 4, 2, 5, 2, 4, 0, 0, 0],
                [0, 0, 9, 4, 1, 4, 9, 0, 0, 0],
                [0, 0, 0, 9, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 4, 1, 1, 1, 1, 2, 0, 0],
                [0, 0, 5, 3, 10, 10, 3, 5, 0, 0],
                [0, 0, 5, 4, 4, 2, 2, 5, 0, 0],
                [0, 0, 5, 5, 1, 1, 5, 5, 0, 0],
                [0, 0, 0, 0, 10, 10, 0, 0, 0, 0],
                [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 2, 3, 3, 3, 3, 2, 1, 0],
                [0, 2, 1, 2, 2, 2, 2, 1, 2, 0],
                [0, 3, 4, 1, 2, 2, 1, 4, 3, 0],
                [0, 4, 2, 2, 1, 1, 2, 2, 4, 0],
                [0, 4, 2, 2, 1, 1, 2, 2, 4, 0],
                [0, 0, 4, 1, 1, 1, 1, 4, 0, 0],
                [0, 0, 1, 4, 2, 2, 4, 1, 0, 0],
                [0, 0, 0, 9, 4, 4, 9, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
            ],
            [
                [0, 2, 2, 1, 1, 1, 1, 2, 2, 0],
                [0, 1, 1, 2, 2, 2, 2, 1, 1, 0],
                [0, 3, 3, 3, 1, 1, 3, 3, 3, 0],
                [0, 2, 10, 1, 4, 4, 1, 10, 2, 0],
                [0, 2, 2, 3, 4, 4, 3, 2, 2, 0],
                [0, 0, 3, 3, 2, 2, 3, 3, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 1, 2, 2, 2, 2, 1, 1, 0],
                [0, 3, 2, 1, 3, 3, 1, 2, 3, 0],
                [0, 2, 2, 4, 4, 4, 4, 2, 2, 0],
                [0, 0, 3, 3, 1, 1, 3, 3, 0, 0],
                [0, 0, 2, 10, 4, 4, 10, 2, 0, 0],
                [0, 0, 0, 4, 2, 2, 4, 0, 0, 0],
                [0, 0, 0, 2, 9, 9, 2, 0, 0, 0],
                [0, 0, 0, 2, 0, 0, 2, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 2, 1, 2, 2, 2, 2, 1, 2, 0],
                [0, 2, 1, 3, 3, 3, 3, 1, 2, 0],
                [0, 4, 2, 2, 1, 1, 2, 2, 4, 0],
                [0, 4, 8, 3, 2, 2, 3, 8, 4, 0],
                [0, 3, 3, 4, 1, 1, 4, 3, 3, 0],
                [0, 2, 4, 3, 3, 3, 3, 4, 2, 0],
                [0, 4, 4, 4, 1, 1, 4, 4, 4, 0],
                [0, 2, 0, 0, 9, 9, 0, 0, 2, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 4, 4, 1, 2, 3, 1, 4, 4, 0],
                [0, 4, 4, 1, 2, 3, 1, 4, 4, 0],
                [0, 4, 1, 2, 2, 3, 3, 1, 4, 0],
                [0, 0, 3, 1, 3, 2, 1, 2, 0, 0],
                [0, 0, 4, 1, 2, 3, 1, 4, 0, 0],
                [0, 0, 9, 3, 2, 3, 2, 9, 0, 0],
                [0, 0, 0, 9, 2, 3, 9, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [5, 5, 4, 4, 3, 3, 2, 2, 1, 1],
                [5, 4, 3, 3, 3, 2, 2, 1, 1, 5],
                [4, 3, 2, 2, 2, 1, 1, 5, 5, 9],
                [3, 2, 1, 1, 1, 5, 5, 4, 9, 0],
                [2, 1, 5, 5, 5, 4, 4, 9, 0, 0],
                [1, 5, 4, 4, 4, 3, 9, 0, 0, 0],
                [5, 4, 3, 3, 3, 9, 0, 0, 0, 0],
                [4, 3, 9, 9, 9, 0, 0, 0, 0, 0],
                [9, 9, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 2, 10, 10, 10, 4, 4, 0, 0],
                [0, 2, 2, 4, 4, 5, 5, 4, 0, 0],
                [0, 1, 4, 4, 3, 6, 4, 4, 0, 0],
                [0, 4, 4, 4, 3, 3, 3, 2, 0, 0],
                [0, 1, 5, 5, 5, 5, 2, 3, 4, 0],
                [0, 0, 0, 4, 1, 1, 4, 3, 2, 0],
                [0, 0, 0, 4, 1, 1, 5, 9, 2, 0],
                [0, 0, 0, 4, 9, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 2, 1, 2, 1, 2, 4, 0, 0],
                [0, 2, 8, 4, 1, 8, 3, 4, 0, 0],
                [0, 1, 4, 4, 3, 6, 4, 4, 0, 0],
                [0, 4, 4, 4, 3, 10, 3, 2, 0, 0],
                [0, 1, 1, 3, 1, 2, 3, 3, 4, 0],
                [0, 0, 10, 2, 2, 1, 2, 10, 2, 0],
                [0, 0, 0, 4, 1, 1, 5, 9, 2, 0],
                [0, 0, 2, 4, 2, 3, 4, 3, 0, 0],
                [0, 0, 0, 9, 0, 0, 9, 0, 0, 0],
            ],
            [
                [0, 2, 2, 3, 2, 3, 3, 2, 2, 0],
                [0, 1, 4, 4, 7, 3, 4, 1, 0, 0],
                [0, 0, 2, 3, 2, 4, 3, 3, 0, 0],
                [0, 1, 3, 1, 3, 3, 2, 0, 1, 0],
                [0, 0, 3, 3, 1, 3, 3, 2, 0, 0],
                [0, 4, 4, 4, 3, 1, 2, 2, 2, 0],
                [0, 2, 2, 3, 4, 3, 7, 4, 3, 0],
                [0, 9, 0, 9, 0, 9, 4, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 5, 2, 5, 2, 5, 3, 5, 2, 0],
                [0, 2, 3, 2, 7, 2, 3, 2, 2, 0],
                [0, 3, 2, 3, 2, 3, 3, 3, 3, 0],
                [0, 3, 10, 2, 10, 2, 10, 3, 1, 0],
                [0, 5, 5, 3, 5, 9, 2, 3, 3, 0],
                [0, 3, 2, 5, 10, 10, 3, 2, 1, 0],
                [0, 7, 5, 2, 5, 5, 3, 3, 7, 0],
                [0, 0, 9, 0, 0, 0, 0, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 5, 2, 5, 2, 5, 3, 5, 2, 0],
                [0, 4, 2, 1, 3, 7, 10, 2, 4, 0],
                [0, 3, 5, 10, 2, 3, 5, 2, 3, 0],
                [0, 4, 1, 5, 1, 5, 3, 10, 4, 0],
                [0, 1, 5, 1, 2, 2, 1, 2, 5, 0],
                [0, 2, 7, 2, 3, 10, 3, 2, 3, 0],
                [0, 1, 2, 3, 3, 5, 1, 1, 2, 0],
                [0, 0, 9, 0, 10, 0, 0, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [2, 2, 1, 4, 4, 4, 1, 2, 2, 0],
                [0, 0, 3, 1, 1, 1, 3, 0, 0, 0],
                [0, 0, 10, 4, 1, 4, 10, 0, 0, 0],
                [0, 0, 1, 4, 7, 4, 1, 0, 0, 0],
                [0, 0, 2, 4, 0, 4, 2, 0, 0, 0],
                [0, 0, 9, 9, 0, 9, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 3, 3, 1, 1, 1, 5, 2, 5, 0],
                [0, 3, 2, 2, 4, 5, 4, 2, 5, 0],
                [0, 0, 2, 5, 4, 1, 4, 2, 0, 0],
                [0, 0, 4, 5, 5, 1, 4, 5, 0, 0],
                [0, 0, 3, 2, 1, 5, 2, 0, 0, 0],
                [0, 0, 3, 4, 4, 2, 2, 0, 0, 0],
                [0, 0, 3, 2, 4, 5, 5, 0, 0, 0],
                [0, 0, 2, 4, 9, 0, 9, 0, 0, 0],
                [0, 0, 9, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [4, 4, 3, 2, 1, 2, 3, 4, 1, 1],
                [4, 4, 3, 2, 1, 2, 3, 4, 1, 1],
                [6, 1, 4, 3, 2, 3, 4, 1, 2, 7],
                [0, 3, 2, 4, 3, 4, 2, 3, 4, 0],
                [0, 3, 2, 4, 3, 4, 2, 3, 4, 0],
                [0, 3, 2, 4, 3, 4, 2, 3, 4, 0],
                [0, 3, 3, 4, 1, 4, 3, 3, 1, 0],
                [0, 9, 9, 2, 9, 2, 9, 4, 9, 0],
                [0, 0, 0, 9, 0, 9, 0, 9, 0, 0],
            ],
            [
                [0, 1, 1, 1, 4, 4, 5, 5, 5, 0],
                [0, 1, 1, 3, 3, 3, 2, 2, 2, 0],
                [0, 4, 4, 4, 4, 1, 1, 1, 2, 0],
                [0, 3, 3, 2, 2, 2, 5, 5, 5, 0],
                [0, 0, 3, 3, 1, 1, 2, 2, 0, 0],
                [0, 0, 1, 1, 4, 4, 4, 4, 0, 0],
                [0, 0, 5, 5, 1, 1, 5, 5, 0, 0],
                [0, 0, 9, 9, 5, 5, 9, 9, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
            ],
            [
                [0, 1, 1, 1, 2, 2, 5, 5, 5, 0],
                [0, 1, 2, 1, 2, 2, 5, 2, 5, 0],
                [0, 1, 1, 1, 0, 0, 5, 5, 5, 0],
                [0, 3, 4, 4, 0, 0, 4, 4, 3, 0],
                [0, 3, 5, 2, 0, 0, 2, 1, 3, 0],
                [0, 3, 5, 5, 0, 0, 1, 1, 3, 0],
                [0, 4, 5, 5, 0, 0, 1, 1, 4, 0],
                [0, 9, 9, 9, 0, 0, 9, 9, 9, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [1, 1, 1, 2, 2, 2, 2, 1, 1, 1],
                [5, 5, 2, 2, 3, 3, 2, 2, 5, 5],
                [0, 2, 2, 3, 4, 4, 3, 2, 2, 0],
                [0, 0, 5, 1, 1, 1, 1, 5, 0, 0],
                [0, 0, 4, 4, 3, 3, 4, 4, 0, 0],
                [0, 0, 0, 5, 5, 5, 5, 0, 0, 0],
                [0, 0, 0, 1, 1, 2, 2, 0, 0, 0],
                [0, 0, 0, 1, 1, 2, 2, 0, 0, 0],
                [0, 0, 0, 9, 9, 9, 9, 0, 0, 0],
            ],
            [
                [1, 1, 5, 1, 5, 1, 3, 5, 2, 2],
                [0, 2, 2, 5, 10, 5, 2, 2, 2, 0],
                [0, 1, 1, 1, 1, 2, 3, 1, 2, 0],
                [0, 5, 3, 1, 8, 3, 1, 2, 3, 0],
                [0, 5, 1, 2, 3, 1, 2, 1, 2, 0],
                [0, 5, 5, 3, 1, 2, 3, 2, 2, 0],
                [0, 5, 5, 3, 2, 3, 1, 1, 5, 0],
                [0, 0, 2, 2, 9, 5, 5, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 4, 1, 3, 1, 3, 4, 3, 0],
                [0, 3, 2, 3, 2, 3, 2, 3, 2, 0],
                [0, 4, 1, 1, 1, 2, 3, 1, 4, 0],
                [0, 2, 3, 3, 2, 7, 1, 3, 4, 0],
                [0, 4, 1, 2, 3, 1, 2, 1, 0, 0],
                [0, 0, 1, 4, 1, 2, 3, 2, 0, 0],
                [0, 0, 8, 3, 2, 8, 1, 1, 0, 0],
                [0, 0, 2, 2, 9, 1, 1, 3, 0, 0],
                [0, 0, 9, 0, 0, 0, 9, 0, 0, 0],
            ],
            [
                [0, 1, 2, 1, 4, 4, 1, 3, 1, 0],
                [0, 1, 4, 3, 10, 1, 2, 1, 1, 0],
                [0, 1, 3, 1, 3, 2, 1, 2, 1, 0],
                [0, 4, 1, 3, 1, 1, 2, 1, 2, 0],
                [0, 1, 4, 2, 1, 1, 4, 2, 1, 0],
                [0, 4, 2, 9, 2, 4, 9, 4, 2, 0],
                [0, 4, 4, 2, 1, 7, 4, 1, 1, 0],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                [0, 0, 9, 0, 0, 0, 9, 0, 0, 0],
            ],
            [
                [0, 4, 4, 2, 1, 4, 2, 4, 1, 0],
                [0, 1, 3, 2, 1, 1, 3, 1, 1, 0],
                [0, 1, 1, 4, 4, 1, 7, 2, 1, 0],
                [0, 1, 6, 2, 2, 1, 3, 3, 2, 0],
                [0, 9, 2, 2, 2, 2, 9, 2, 1, 0],
                [0, 0, 1, 2, 6, 6, 2, 0, 0, 0],
                [0, 0, 1, 9, 2, 4, 0, 7, 0, 0],
                [0, 0, 1, 0, 0, 0, 9, 0, 0, 0],
                [0, 0, 9, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 2, 4, 4, 4, 1, 2, 2, 2, 0],
                [0, 2, 4, 4, 1, 1, 1, 4, 4, 0],
                [0, 4, 2, 1, 3, 3, 4, 1, 4, 0],
                [0, 1, 1, 4, 4, 3, 2, 2, 1, 0],
                [0, 3, 2, 1, 7, 3, 2, 1, 3, 0],
                [0, 1, 2, 3, 3, 3, 4, 2, 1, 0],
                [0, 0, 1, 2, 4, 3, 2, 1, 0, 0],
                [0, 0, 0, 0, 9, 0, 0, 0, 0, 0],
                [0, 0, 9, 0, 0, 0, 9, 0, 0, 0],
            ],
            [
                [0, 2, 2, 2, 1, 1, 5, 5, 5, 0],
                [0, 3, 3, 3, 3, 4, 4, 4, 4, 0],
                [0, 4, 3, 2, 2, 2, 2, 4, 3, 0],
                [0, 4, 5, 5, 4, 4, 5, 5, 3, 0],
                [0, 4, 1, 1, 4, 4, 1, 1, 3, 0],
                [0, 4, 4, 5, 5, 5, 5, 3, 3, 0],
                [0, 0, 0, 9, 9, 9, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 3, 3, 4, 4, 3, 3, 0, 0],
                [0, 0, 1, 1, 10, 10, 1, 1, 0, 0],
                [0, 0, 3, 3, 1, 1, 3, 3, 0, 0],
                [0, 0, 4, 4, 4, 4, 4, 4, 0, 0],
                [0, 0, 2, 2, 3, 3, 2, 2, 0, 0],
                [0, 0, 4, 4, 4, 1, 1, 1, 0, 0],
                [0, 0, 1, 1, 1, 4, 4, 4, 0, 0],
                [0, 0, 0, 9, 2, 2, 9, 0, 0, 0],
                [0, 0, 0, 0, 9, 9, 0, 0, 0, 0],
            ],
            [
                [0, 1, 2, 3, 4, 4, 3, 2, 1, 0],
                [0, 2, 3, 3, 3, 4, 4, 4, 2, 0],
                [0, 3, 4, 2, 2, 2, 2, 3, 3, 0],
                [0, 4, 4, 2, 1, 1, 2, 3, 4, 0],
                [0, 0, 4, 2, 1, 1, 2, 3, 0, 0],
                [0, 0, 4, 2, 2, 2, 2, 3, 0, 0],
                [0, 0, 3, 3, 3, 4, 4, 4, 0, 0],
                [0, 0, 9, 9, 9, 9, 9, 9, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 0, 1, 1, 4, 2, 2, 3, 0, 0],
                [0, 0, 2, 1, 4, 5, 2, 3, 0, 0],
                [0, 0, 2, 2, 4, 5, 5, 3, 0, 0],
                [0, 0, 1, 3, 3, 2, 3, 3, 0, 0],
                [0, 0, 4, 1, 3, 9, 2, 0, 0, 0],
                [0, 0, 4, 4, 2, 0, 9, 0, 0, 0],
                [0, 0, 3, 3, 3, 0, 0, 0, 0, 0],
                [0, 0, 4, 1, 3, 0, 0, 0, 0, 0],
                [0, 0, 9, 9, 9, 0, 0, 0, 0, 0],
            ],
            [
                [0, 1, 2, 3, 4, 4, 3, 2, 1, 0],
                [0, 2, 3, 4, 2, 2, 4, 3, 2, 0],
                [0, 3, 4, 2, 1, 1, 2, 4, 3, 0],
                [0, 4, 2, 1, 3, 3, 1, 2, 4, 0],
                [0, 4, 2, 1, 3, 3, 1, 2, 4, 0],
                [0, 0, 4, 2, 1, 1, 2, 4, 0, 0],
                [0, 0, 0, 4, 2, 2, 4, 0, 0, 0],
                [0, 0, 0, 9, 4, 4, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 4, 4, 2, 1, 2, 1, 4, 4, 0],
                [0, 2, 1, 2, 1, 2, 1, 2, 1, 0],
                [0, 2, 1, 3, 1, 2, 3, 2, 1, 0],
                [0, 4, 1, 3, 1, 2, 3, 2, 4, 0],
                [0, 4, 2, 3, 2, 1, 3, 1, 4, 0],
                [0, 9, 2, 3, 4, 4, 3, 1, 9, 0],
                [0, 0, 9, 4, 9, 9, 4, 9, 0, 0],
                [0, 0, 0, 9, 0, 0, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [10, 5, 2, 5, 2, 5, 3, 5, 2, 0],
                [10, 2, 3, 2, 7, 2, 3, 2, 2, 0],
                [10, 3, 2, 3, 2, 3, 3, 3, 2, 0],
                [0, 1, 10, 1, 3, 3, 2, 2, 1, 0],
                [0, 9, 3, 3, 1, 3, 3, 2, 2, 0],
                [0, 3, 3, 2, 3, 10, 3, 2, 2, 0],
                [0, 5, 5, 2, 2, 5, 5, 5, 3, 0],
                [0, 0, 0, 0, 0, 0, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [1, 3, 3, 3, 2, 1, 1, 1, 5, 1],
                [2, 3, 2, 4, 3, 2, 2, 1, 5, 1],
                [2, 3, 3, 2, 4, 3, 3, 1, 4, 2],
                [2, 2, 4, 3, 2, 4, 3, 1, 1, 1],
                [2, 1, 3, 2, 1, 5, 4, 3, 3, 1],
                [0, 2, 2, 4, 5, 5, 4, 2, 2, 0],
                [0, 0, 3, 3, 0, 0, 3, 2, 0, 0],
                [0, 0, 0, 9, 0, 0, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [2, 2, 1, 1, 1, 3, 2, 3, 3, 3],
                [4, 5, 5, 5, 5, 2, 3, 2, 3, 5],
                [2, 3, 4, 1, 3, 2, 2, 2, 1, 3],
                [4, 4, 4, 3, 2, 1, 3, 1, 1, 1],
                [4, 4, 3, 2, 1, 3, 2, 4, 3, 2],
                [1, 3, 2, 2, 1, 1, 3, 2, 1, 4],
                [0, 0, 9, 9, 0, 0, 9, 9, 0, 0],
                [0, 0, 0, 9, 0, 0, 9, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            [
                [0, 2, 1, 3, 1, 1, 4, 3, 2, 0],
                [0, 2, 1, 4, 2, 2, 4, 2, 2, 0],
                [0, 1, 2, 3, 3, 3, 1, 3, 2, 0],
                [0, 3, 1, 4, 4, 2, 2, 4, 3, 0],
                [0, 2, 2, 3, 5, 2, 2, 2, 6, 0],
                [0, 1, 2, 4, 5, 2, 1, 4, 0, 0],
                [0, 2, 1, 5, 5, 3, 1, 1, 0, 0],
                [0, 2, 6, 5, 6, 4, 2, 1, 0, 0],
                [0, 9, 0, 9, 0, 9, 0, 9, 0, 0],
            ],
            [
                [0, 0, 2, 1, 3, 4, 4, 1, 0, 0],
                [0, 0, 2, 1, 1, 4, 4, 1, 0, 0],
                [0, 0, 2, 4, 2, 1, 3, 1, 0, 0],
                [0, 0, 2, 3, 1, 4, 3, 1, 0, 0],
                [0, 0, 0, 1, 2, 1, 2, 0, 0, 0],
                [0, 0, 0, 2, 3, 2, 1, 0, 0, 0],
                [0, 0, 0, 3, 3, 3, 1, 0, 0, 0],
                [0, 0, 0, 2, 2, 2, 2, 0, 0, 0],
                [0, 0, 0, 9, 9, 9, 9, 0, 0, 0],
            ],
        ];
    }
    GameData.getInstance = function() {
        if (GameData.instance == null) {
            GameData.instance = new GameData();
        }
        return GameData.instance;
    };
    GameData.prototype.levelsAvailable = function() {
        if (Constants.DEBUG_MODE) {
            return this.getTotalLevelCount();
        }
        return Math.min(this.levelsCompleted + 1, this.getTotalLevelCount());
    };
    GameData.prototype.getTotalLevelCount = function() {
        return this.levels.length;
    };
    GameData.prototype.getLevelDef = function(level) {
        return this.levels[level];
    };
    GameData.prototype.save = function() {
        try {
            window.localStorage.setItem(this.COMPLETED_STR, this.levelsCompleted.toString());
            window.localStorage.setItem(this.SCORE_STR, this.totalScore.toString());
            window.localStorage.setItem(this.SCORE_STARS, JSON.stringify(this.starsPerLevel));
        } catch (e) {}
    };
    GameData.prototype.load = function() {
        try {
            for (var i = 0; i < this.getTotalLevelCount(); i++) {
                this.starsPerLevel.push(0);
            }
            if (window.localStorage.getItem(this.SCORE_STARS)) {
                this.starsPerLevel = JSON.parse(window.localStorage.getItem(this.SCORE_STARS));
            }
            this.levelsCompleted = +window.localStorage.getItem(this.COMPLETED_STR) || 0;
            this.totalScore = +window.localStorage.getItem(this.SCORE_STR) || 0;
        } catch (e) {}
    };
    GameData.prototype.getTotalScore = function() {
        return this.totalScore;
    };
    GameData.prototype.onWinLevel = function(level, score, stars) {
        this.totalScore += score;
        this.starsPerLevel[level] = Math.max(this.starsPerLevel[level], stars);
        if (level == this.levelsCompleted) {
            this.levelsCompleted++;
        }
        this.save();
    };
    GameData.prototype.getStarsInLevel = function(level_num) {
        if (level_num > this.getTotalLevelCount() - 1) {
            return 0;
        }
        return this.starsPerLevel[level_num];
    };
    GameData.prototype.getTotalStars = function() {
        var total = 0;
        for (var i = 0; i < this.getTotalLevelCount(); i++) {
            total += this.starsPerLevel[i];
        }
        return total;
    };
    GameData.prototype.getMaximumStars = function() {
        return this.getTotalLevelCount() * 3;
    };
    GameData.instance = null;
    return GameData;
})();
/// <reference path="references.ts" />
var DNGameObject = (function(_super) {
    __extends(DNGameObject, _super);

    function DNGameObject() {
        _super.call(this);
        this.liveTime = 0;
        this.killed = false;
    }
    DNGameObject.prototype.update = function(dt) {
        this.liveTime += dt;
    };
    DNGameObject.prototype.forceUpdate = function(dt) {};
    DNGameObject.prototype.kill = function() {
        this.killed = true;
    };
    DNGameObject.prototype.isDead = function() {
        return this.killed;
    };
    DNGameObject.prototype.onDead = function() {
        //  cleanup here
        if (this.parent) {
            this.parent.removeChild(this);
        }
    };
    return DNGameObject;
})(createjs.Container);
/// <reference path="references.ts" />
var DNGUIObject = (function(_super) {
    __extends(DNGUIObject, _super);

    function DNGUIObject() {
        _super.apply(this, arguments);
    }
    DNGUIObject.prototype.onMouseDown = function(x, y) {};
    DNGUIObject.prototype.onMouseUp = function(x, y) {};
    DNGUIObject.prototype.onMouseMove = function(x, y) {};
    DNGUIObject.prototype.setHandler = function(callback) {
        //  do nothing
    };
    DNGUIObject.wasHandlerThisFrame = false;
    return DNGUIObject;
})(DNGameObject);
/// <reference path="references.ts" />
var DNButton = (function(_super) {
    __extends(DNButton, _super);

    function DNButton(name, callback) {
        _super.call(this);
        this.selected = false;
        this.func = null;
        this.enabled = true;
        this.picture = DNAssetsManager.g_instance.getCenteredImageWithProxy(name);
        this.addChild(this.picture);
        this.func = callback;
        this.picWidth = this.picture.getBounds().width * 1.15;
        this.picHeight = this.picture.getBounds().height * 1.15;
    }
    DNButton.prototype.getPicture = function() {
        return this.picture;
    };
    DNButton.prototype.setHandler = function(callback) {
        this.func = callback;
    };
    DNButton.prototype.select = function() {
        if (!this.selected) {
            createjs.Tween.removeTweens(this.picture);
            createjs.Tween.get(this.picture).to({
                scaleX: 1.15,
                scaleY: 1.15
            }, 150, createjs.Ease.linear);
            this.selected = true;
        }
    };
    DNButton.prototype.deselect = function() {
        if (this.selected) {
            createjs.Tween.removeTweens(this.picture);
            createjs.Tween.get(this.picture).to({
                scaleX: 1.0,
                scaleY: 1.0
            }, 150, createjs.Ease.linear);
            this.selected = false;
        }
    };
    DNButton.prototype.onMouseDown = function(x, y) {
        if (this.hitTestSmart(x, y)) {
            this.liveTime = 0;
            this.select();
        }
    };
    DNButton.prototype.onMouseUp = function(x, y) {
        if (this.hitTestSmart(x, y) && this.selected) {
            if (!DNGUIObject.wasHandlerThisFrame) {
                DNGUIObject.wasHandlerThisFrame = true;
                this.func();
                //  run action
                DNSoundManager.g_instance.play(Sounds.CLICK);
            }
        }
        this.deselect();
    };
    DNButton.prototype.onMouseMove = function(x, y) {
        if (!this.hitTestSmart(x, y)) {
            this.deselect();
        }
    };
    DNButton.prototype.hitTestSmart = function(x, y) {
        if (!this.enabled) {
            return;
        }
        if (!this.parent || !this.visible) {
            return false;
        }
        var pos = this.picture.localToGlobal(0, 0);
        pos.x /= Constants.SCREEN_SCALE;
        pos.y /= Constants.SCREEN_SCALE;
        var w = (this.picture.getBounds().width || 100) * 0.6 * this.scaleX;
        var h = (this.picture.getBounds().height || 100) * 0.6 * this.scaleY;
        return pos.x < x + w && pos.x > x - w && pos.y < y + h && pos.y > y - h;
    };
    DNButton.prototype.setEnabled = function(enabled) {
        this.enabled = enabled;
    };
    return DNButton;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNJellyButton = (function(_super) {
    __extends(DNJellyButton, _super);

    function DNJellyButton(name, callback) {
        _super.call(this);
        this.selected = false;
        this.func = null;
        this.enabled = true;
        this.picture = DNAssetsManager.g_instance.getCenteredImageWithProxy(name);
        this.addChild(this.picture);
        this.func = callback;
    }
    DNJellyButton.prototype.getPicture = function() {
        return this.picture;
    };
    DNJellyButton.prototype.setHandler = function(callback) {
        this.func = callback;
    };
    DNJellyButton.prototype.forceUpdate = function(dt) {
        _super.prototype.forceUpdate.call(this, dt);
        if (this.jellier) {
            this.jellier.update(dt);
            if (this.jellier.isDead()) {
                this.jellier = null;
            }
        }
    };
    DNJellyButton.prototype.select = function() {
        if (!this.selected) {
            this.picture.scaleX = this.picture.scaleY = 1;
            this.jellier = new Jellier(this.picture, 15, 0);
            this.selected = true;
        }
    };
    DNJellyButton.prototype.deselect = function() {
        if (this.selected) {
            this.selected = false;
        }
    };
    DNJellyButton.prototype.onMouseDown = function(x, y) {
        if (this.hitTestSmart(x, y) && !DNGUIObject.wasHandlerThisFrame) {
            DNGUIObject.wasHandlerThisFrame = true;
            this.liveTime = 0;
            this.select();
        }
    };
    DNJellyButton.prototype.onMouseUp = function(x, y) {
        if (this.hitTestSmart(x, y) && this.selected) {
            if (!DNGUIObject.wasHandlerThisFrame) {
                DNGUIObject.wasHandlerThisFrame = true;
                if (this.func) {
                    this.func();
                }
                //  run action
                DNSoundManager.g_instance.play(Sounds.CLICK);
            }
        }
        this.deselect();
    };
    DNJellyButton.prototype.onMouseMove = function(x, y) {
        if (!this.hitTestSmart(x, y)) {
            this.deselect();
        }
    };
    DNJellyButton.prototype.hitTestSmart = function(x, y) {
        if (!this.enabled) {
            return;
        }
        if (!this.parent || !this.visible) {
            return false;
        }
        var pos = this.picture.localToGlobal(0, 0);
        pos.x /= Constants.SCREEN_SCALE;
        pos.y /= Constants.SCREEN_SCALE;
        var w = this.picture.getBounds().width * 0.6 * this.scaleX;
        var h = (this.picture.getBounds().height || 100) * 0.6 * this.scaleY;
        return pos.x < x + w && pos.x > x - w && pos.y < y + h && pos.y > y - h;
    };
    DNJellyButton.prototype.setEnabled = function(enabled) {
        this.enabled = enabled;
    };
    return DNJellyButton;
})(DNGUIObject);
/// <reference path="references.ts" />
var AddStarEffect = (function(_super) {
    __extends(AddStarEffect, _super);

    function AddStarEffect(goal) {
        _super.call(this);
        this.speed = 900;
        this.finished = false;
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.PLUS));
        this.goal = goal;
    }
    AddStarEffect.prototype.initSpeed = function() {
        var dir_x = this.goal.x - this.x;
        var dir_y = this.goal.y - this.y;
        var len = Math.sqrt(dir_x * dir_x + dir_y * dir_y);
        if (len < Constants.CELL_SIZE * 3) {
            this.speed = 250;
        } else if (len < Constants.CELL_SIZE * 6) {
            this.speed = 700;
        }
    };
    AddStarEffect.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        if (this.finished) {
            this.scaleX -= dt * 3;
            this.scaleY -= dt * 3;
            if (this.scaleX <= 0) {
                //this.scaleX -= dt * 3;
                //this.scaleY -= dt * 3;
                this.kill();
            }
            return;
        }
        this.rotation += dt * 800;
        var dir_x = this.goal.x - this.x;
        var dir_y = this.goal.y - this.y;
        var len = Math.sqrt(dir_x * dir_x + dir_y * dir_y);
        if (len < this.speed * dt) {
            this.x = this.goal.x;
            this.y = this.goal.y;
            this.goal.addPlus();
            //this.kill();
            this.finished = true;
        } else {
            dir_x /= len;
            dir_y /= len;
            this.x += dir_x * dt * this.speed;
            this.y += dir_y * dt * this.speed;
        }
    };
    return AddStarEffect;
})(DNGameObject);
/// <reference path="references.ts" />
function init() {
    var manifest = [];
    var athlases = [{
            "images": ["all"],
            "frames": [
                [780, 426, 73, 73],
                [780, 501, 73, 73],
                [780, 576, 73, 73],
                [907, 232, 73, 73],
                [794, 651, 73, 73],
                [855, 426, 73, 73],
                [686, 618, 86, 25],
                [791, 266, 98, 74],
                [936, 635, 20, 29],
                [891, 307, 63, 40],
                [875, 349, 63, 40],
                [869, 717, 63, 40],
                [728, 645, 32, 31],
                [794, 726, 35, 36],
                [586, 849, 92, 94],
                [680, 849, 92, 94],
                [774, 849, 92, 94],
                [481, 849, 103, 94],
                [868, 849, 92, 94],
                [510, 395, 174, 174],
                [697, 330, 92, 94],
                [686, 426, 92, 94],
                [686, 522, 92, 94],
                [791, 342, 82, 82],
                [697, 2, 301, 128],
                [481, 807, 497, 40],
                [697, 132, 92, 196],
                [907, 132, 74, 98],
                [855, 501, 71, 71],
                [510, 765, 471, 40],
                [510, 685, 140, 78],
                [652, 685, 140, 78],
                [510, 571, 174, 112],
                [686, 645, 40, 32],
                [875, 391, 26, 31],
                [928, 504, 27, 34],
                [686, 645, 40, 32],
                [928, 606, 29, 27],
                [903, 391, 25, 31],
                [875, 391, 26, 31],
                [962, 878, 32, 41],
                [962, 921, 33, 22],
                [936, 693, 31, 16],
                [928, 576, 26, 28],
                [936, 666, 26, 25],
                [962, 849, 36, 27],
                [831, 726, 33, 29],
                [928, 540, 26, 34],
                [957, 504, 24, 27],
                [956, 307, 31, 42],
                [928, 504, 27, 34],
                [940, 351, 47, 49],
                [869, 647, 65, 68],
                [930, 402, 50, 49],
                [930, 453, 50, 49],
                [2, 803, 477, 140],
                [2, 2, 693, 391],
                [791, 132, 114, 132],
                [855, 574, 71, 71],
                [2, 395, 506, 406]
            ],
            "animations": {
                "block_1": [0],
                "block_10": [1],
                "block_2": [2],
                "block_3": [3],
                "block_4": [4],
                "block_5": [5],
                "boat": [6],
                "bomb": [7],
                "bonus_arrow": [8],
                "bonus_fish_glow_1": [9],
                "bonus_fish_glow_2": [10],
                "bonus_fish_glow_3": [11],
                "bubble": [12],
                "bubble_quick": [13],
                "button_credits": [14],
                "button_exit": [15],
                "button_more_games": [16],
                "button_pause": [17],
                "button_play": [18],
                "button_play_big": [19],
                "button_restart": [20],
                "button_sound_off": [21],
                "button_sound_on": [22],
                "hint": [23],
                "hypnocat": [24],
                "ingame_panel": [25],
                "jelly": [26],
                "level_button": [27],
                "line": [28],
                "map_panel": [29],
                "oxygen_back": [30],
                "oxygen_front": [31],
                "oxygen_red": [32],
                "particle_10_1": [33],
                "particle_10_2": [34],
                "particle_10_3": [35],
                "particle_1_1": [36],
                "particle_1_2": [37],
                "particle_1_3": [38],
                "particle_2_1": [39],
                "particle_2_2": [40],
                "particle_2_3": [41],
                "particle_3_1": [42],
                "particle_3_2": [43],
                "particle_3_3": [44],
                "particle_4_1": [45],
                "particle_4_2": [46],
                "particle_4_3": [47],
                "particle_5_1": [48],
                "particle_5_2": [49],
                "particle_5_3": [50],
                "plus": [51],
                "plus_frame": [52],
                "star_off": [53],
                "star_on": [54],
                "swordfish": [55],
                "title": [56],
                "tube": [57],
                "vert_bonus": [58],
                "window": [59]
            }
        },
        {
            "images": ["font_green"],
            "frames": [
                [1, 32, 6, 6],
                [8, 4, 16, 36],
                [25, 1, 26, 19],
                [52, 7, 30, 28],
                [83, 1, 22, 40],
                [106, 6, 33, 30],
                [140, 5, 33, 34],
                [174, 1, 16, 18],
                [191, 1, 23, 41],
                [215, 1, 23, 41],
                [239, 4, 26, 26],
                [266, 11, 22, 22],
                [289, 23, 15, 19],
                [305, 15, 19, 12],
                [325, 23, 15, 15],
                [341, 2, 26, 38],
                [368, 4, 31, 34],
                [400, 4, 21, 34],
                [422, 3, 25, 35],
                [448, 2, 27, 36],
                [476, 3, 28, 35],
                [1, 45, 27, 34],
                [29, 44, 28, 35],
                [58, 45, 25, 34],
                [84, 44, 28, 35],
                [113, 44, 28, 35],
                [142, 52, 15, 27],
                [158, 52, 15, 32],
                [174, 47, 23, 30],
                [198, 54, 19, 20],
                [218, 47, 23, 30],
                [242, 44, 27, 37],
                [270, 48, 30, 30],
                [301, 45, 33, 34],
                [335, 44, 29, 35],
                [365, 44, 26, 35],
                [392, 45, 28, 34],
                [421, 45, 24, 34],
                [446, 45, 24, 34],
                [471, 43, 30, 36],
                [1, 86, 29, 34],
                [31, 86, 17, 34],
                [49, 86, 27, 34],
                [77, 85, 32, 36],
                [110, 86, 23, 33],
                [134, 86, 35, 35],
                [170, 86, 32, 34],
                [203, 88, 31, 32],
                [235, 85, 29, 35],
                [265, 86, 33, 39],
                [299, 85, 29, 36],
                [329, 85, 27, 35],
                [357, 86, 27, 34],
                [385, 87, 30, 34],
                [416, 85, 32, 35],
                [449, 86, 43, 34],
                [1, 134, 32, 35],
                [34, 136, 32, 34],
                [67, 135, 24, 34],
                [92, 133, 20, 40],
                [113, 133, 26, 38],
                [140, 133, 19, 39],
                [160, 135, 26, 22],
                [187, 165, 19, 12],
                [207, 126, 18, 17],
                [226, 135, 33, 34],
                [260, 134, 29, 35],
                [290, 135, 26, 34],
                [317, 135, 28, 34],
                [346, 134, 29, 35],
                [376, 135, 24, 34],
                [401, 134, 30, 35],
                [432, 135, 29, 34],
                [462, 135, 15, 34],
                [478, 135, 27, 34],
                [1, 179, 31, 35],
                [33, 179, 23, 34],
                [57, 178, 41, 35],
                [99, 178, 30, 35],
                [130, 179, 31, 31],
                [162, 179, 29, 34],
                [192, 179, 33, 39],
                [226, 178, 29, 36],
                [256, 179, 27, 34],
                [284, 179, 27, 34],
                [312, 179, 30, 36],
                [343, 179, 32, 34],
                [376, 180, 43, 33],
                [420, 179, 32, 34],
                [453, 180, 34, 33],
                [1, 230, 25, 34],
                [27, 227, 24, 40],
                [52, 228, 15, 39],
                [68, 227, 24, 40],
                [93, 236, 28, 20],
                [122, 235, 17, 37],
                [140, 224, 20, 13],
                [161, 240, 15, 15],
                [177, 257, 14, 17],
                [192, 236, 28, 36],
                [221, 219, 33, 45],
                [255, 219, 33, 45],
                [289, 220, 33, 44],
                [323, 220, 34, 44],
                [358, 223, 34, 41],
                [393, 221, 34, 43],
                [428, 230, 42, 34],
                [471, 229, 27, 44],
                [1, 276, 24, 45],
                [26, 276, 25, 45],
                [52, 278, 24, 43],
                [77, 280, 24, 41],
                [102, 275, 22, 46],
                [125, 275, 22, 46],
                [148, 279, 21, 42],
                [170, 282, 20, 39],
                [191, 287, 31, 34],
                [223, 277, 32, 44],
                [256, 278, 31, 43],
                [288, 279, 31, 42],
                [320, 280, 31, 41],
                [352, 279, 31, 42],
                [384, 283, 31, 38],
                [416, 277, 30, 45],
                [447, 278, 30, 44],
                [478, 279, 30, 43],
                [1, 329, 30, 41],
                [32, 326, 32, 44],
                [65, 335, 29, 34],
                [95, 335, 47, 34],
                [143, 324, 33, 45],
                [177, 324, 33, 45],
                [211, 326, 33, 43],
                [245, 325, 34, 44],
                [280, 328, 34, 41],
                [315, 326, 34, 42],
                [350, 334, 44, 35],
                [395, 335, 26, 44],
                [422, 324, 29, 45],
                [452, 323, 29, 46],
                [1, 381, 29, 44],
                [31, 384, 29, 41],
                [61, 380, 21, 45],
                [83, 380, 21, 45],
                [105, 383, 21, 42],
                [127, 385, 20, 40],
                [148, 391, 31, 34],
                [180, 382, 30, 43],
                [211, 380, 31, 42],
                [243, 380, 31, 42],
                [275, 381, 31, 41],
                [307, 381, 31, 41],
                [339, 384, 31, 38],
                [371, 381, 30, 46],
                [402, 380, 30, 47],
                [433, 383, 30, 44],
                [464, 386, 30, 41],
                [1, 428, 34, 42],
                [36, 436, 29, 34],
                [66, 430, 34, 40],
            ],
            "animations": {
                "font_green_ ": [0],
                "font_green_!": [1],
                "font_green_\"": [2],
                "font_green_#": [3],
                "font_green_$": [4],
                "font_green_%": [5],
                "font_green_&": [6],
                "font_green_\'": [7],
                "font_green_(": [8],
                "font_green_)": [9],
                "font_green_*": [10],
                "font_green_+": [11],
                "font_green_,": [12],
                "font_green_-": [13],
                "font_green_.": [14],
                "font_green_/": [15],
                "font_green_0": [16],
                "font_green_1": [17],
                "font_green_2": [18],
                "font_green_3": [19],
                "font_green_4": [20],
                "font_green_5": [21],
                "font_green_6": [22],
                "font_green_7": [23],
                "font_green_8": [24],
                "font_green_9": [25],
                "font_green_:": [26],
                "font_green_;": [27],
                "font_green_<": [28],
                "font_green_=": [29],
                "font_green_>": [30],
                "font_green_?": [31],
                "font_green_@": [32],
                "font_green_A": [33],
                "font_green_B": [34],
                "font_green_C": [35],
                "font_green_D": [36],
                "font_green_E": [37],
                "font_green_F": [38],
                "font_green_G": [39],
                "font_green_H": [40],
                "font_green_I": [41],
                "font_green_J": [42],
                "font_green_K": [43],
                "font_green_L": [44],
                "font_green_M": [45],
                "font_green_N": [46],
                "font_green_O": [47],
                "font_green_P": [48],
                "font_green_Q": [49],
                "font_green_R": [50],
                "font_green_S": [51],
                "font_green_T": [52],
                "font_green_U": [53],
                "font_green_V": [54],
                "font_green_W": [55],
                "font_green_X": [56],
                "font_green_Y": [57],
                "font_green_Z": [58],
                "font_green_[": [59],
                "font_green_\\": [60],
                "font_green_]": [61],
                "font_green_^": [62],
                "font_green__": [63],
                "font_green_`": [64],
                "font_green_a": [65],
                "font_green_b": [66],
                "font_green_c": [67],
                "font_green_d": [68],
                "font_green_e": [69],
                "font_green_f": [70],
                "font_green_g": [71],
                "font_green_h": [72],
                "font_green_i": [73],
                "font_green_j": [74],
                "font_green_k": [75],
                "font_green_l": [76],
                "font_green_m": [77],
                "font_green_n": [78],
                "font_green_o": [79],
                "font_green_p": [80],
                "font_green_q": [81],
                "font_green_r": [82],
                "font_green_s": [83],
                "font_green_t": [84],
                "font_green_u": [85],
                "font_green_v": [86],
                "font_green_w": [87],
                "font_green_x": [88],
                "font_green_y": [89],
                "font_green_z": [90],
                "font_green_{": [91],
                "font_green_|": [92],
                "font_green_}": [93],
                "font_green_~": [94],
                "font_green_¡": [95],
                "font_green_¨": [96],
                "font_green_·": [97],
                "font_green_¸": [98],
                "font_green_¿": [99],
                "font_green_À": [100],
                "font_green_Á": [101],
                "font_green_Â": [102],
                "font_green_Ã": [103],
                "font_green_Ä": [104],
                "font_green_Å": [105],
                "font_green_Æ": [106],
                "font_green_Ç": [107],
                "font_green_È": [108],
                "font_green_É": [109],
                "font_green_Ê": [110],
                "font_green_Ë": [111],
                "font_green_Ì": [112],
                "font_green_Í": [113],
                "font_green_Î": [114],
                "font_green_Ï": [115],
                "font_green_Ð": [116],
                "font_green_Ñ": [117],
                "font_green_Ò": [118],
                "font_green_Ó": [119],
                "font_green_Ô": [120],
                "font_green_Õ": [121],
                "font_green_Ö": [122],
                "font_green_Ù": [123],
                "font_green_Ú": [124],
                "font_green_Û": [125],
                "font_green_Ü": [126],
                "font_green_Ý": [127],
                "font_green_Þ": [128],
                "font_green_ß": [129],
                "font_green_à": [130],
                "font_green_á": [131],
                "font_green_â": [132],
                "font_green_ã": [133],
                "font_green_ä": [134],
                "font_green_å": [135],
                "font_green_æ": [136],
                "font_green_ç": [137],
                "font_green_è": [138],
                "font_green_é": [139],
                "font_green_ê": [140],
                "font_green_ë": [141],
                "font_green_ì": [142],
                "font_green_í": [143],
                "font_green_î": [144],
                "font_green_ï": [145],
                "font_green_ð": [146],
                "font_green_ñ": [147],
                "font_green_ò": [148],
                "font_green_ó": [149],
                "font_green_ô": [150],
                "font_green_õ": [151],
                "font_green_ö": [152],
                "font_green_ù": [153],
                "font_green_ú": [154],
                "font_green_û": [155],
                "font_green_ü": [156],
                "font_green_ý": [157],
                "font_green_þ": [158],
                "font_green_ÿ": [159],
            }
        },
        {
            "images": ["diver_1"],
            "frames": [
                [2, 2, 83, 83],
                [2, 87, 83, 83],
                [2, 172, 83, 83],
                [2, 257, 83, 83],
                [2, 342, 83, 83],
                [2, 427, 83, 83],
                [87, 2, 83, 83],
                [172, 2, 83, 83],
                [257, 2, 83, 83],
                [342, 2, 83, 83],
                [427, 2, 83, 83],
                [87, 87, 83, 83],
                [87, 172, 83, 83],
                [87, 257, 83, 83],
                [87, 342, 83, 83],
                [87, 427, 83, 83],
                [172, 87, 83, 83],
                [257, 87, 83, 83],
                [342, 87, 83, 83],
                [427, 87, 83, 83],
                [172, 172, 83, 83],
                [172, 257, 83, 83],
                [172, 342, 83, 83],
                [172, 427, 83, 83],
                [257, 172, 83, 83],
                [342, 172, 83, 83],
                [427, 172, 83, 83],
                [257, 257, 83, 83],
                [257, 342, 83, 83],
                [257, 427, 83, 83],
                [342, 257, 83, 83],
                [427, 257, 83, 83],
                [427, 257, 83, 83],
                [342, 257, 83, 83],
                [257, 427, 83, 83],
                [257, 342, 83, 83],
                [257, 257, 83, 83],
                [427, 172, 83, 83],
                [342, 172, 83, 83],
                [257, 172, 83, 83],
                [172, 427, 83, 83],
                [172, 342, 83, 83],
                [172, 257, 83, 83],
                [172, 172, 83, 83],
                [427, 87, 83, 83],
                [342, 87, 83, 83],
                [257, 87, 83, 83],
                [172, 87, 83, 83],
                [87, 427, 83, 83],
                [87, 342, 83, 83],
                [87, 257, 83, 83],
                [87, 172, 83, 83],
                [87, 87, 83, 83],
                [427, 2, 83, 83],
                [342, 2, 83, 83],
                [257, 2, 83, 83],
                [172, 2, 83, 83],
                [87, 2, 83, 83],
                [2, 427, 83, 83],
                [2, 342, 83, 83],
                [2, 257, 83, 83],
                [2, 172, 83, 83],
                [2, 87, 83, 83],
                [2, 2, 83, 83]
            ],
            "animations": {
                "diver_1_0": [0],
                "diver_1_1": [1],
                "diver_1_2": [2],
                "diver_1_3": [3],
                "diver_1_4": [4],
                "diver_1_5": [5],
                "diver_1_6": [6],
                "diver_1_7": [7],
                "diver_1_8": [8],
                "diver_1_9": [9],
                "diver_1_10": [10],
                "diver_1_11": [11],
                "diver_1_12": [12],
                "diver_1_13": [13],
                "diver_1_14": [14],
                "diver_1_15": [15],
                "diver_1_16": [16],
                "diver_1_17": [17],
                "diver_1_18": [18],
                "diver_1_19": [19],
                "diver_1_20": [20],
                "diver_1_21": [21],
                "diver_1_22": [22],
                "diver_1_23": [23],
                "diver_1_24": [24],
                "diver_1_25": [25],
                "diver_1_26": [26],
                "diver_1_27": [27],
                "diver_1_28": [28],
                "diver_1_29": [29],
                "diver_1_30": [30],
                "diver_1_31": [31],
                "diver_1_32": [32],
                "diver_1_33": [33],
                "diver_1_34": [34],
                "diver_1_35": [35],
                "diver_1_36": [36],
                "diver_1_37": [37],
                "diver_1_38": [38],
                "diver_1_39": [39],
                "diver_1_40": [40],
                "diver_1_41": [41],
                "diver_1_42": [42],
                "diver_1_43": [43],
                "diver_1_44": [44],
                "diver_1_45": [45],
                "diver_1_46": [46],
                "diver_1_47": [47],
                "diver_1_48": [48],
                "diver_1_49": [49],
                "diver_1_50": [50],
                "diver_1_51": [51],
                "diver_1_52": [52],
                "diver_1_53": [53],
                "diver_1_54": [54],
                "diver_1_55": [55],
                "diver_1_56": [56],
                "diver_1_57": [57],
                "diver_1_58": [58],
                "diver_1_59": [59],
                "diver_1_60": [60],
                "diver_1_61": [61],
                "diver_1_62": [62],
                "diver_1_63": [63]
            }
        },
        {
            "images": ["diver_2"],
            "frames": [
                [2, 2, 83, 83],
                [2, 87, 83, 83],
                [2, 172, 83, 83],
                [2, 257, 83, 83],
                [2, 342, 83, 83],
                [2, 427, 83, 83],
                [87, 2, 83, 83],
                [172, 2, 83, 83],
                [257, 2, 83, 83],
                [342, 2, 83, 83],
                [427, 2, 83, 83],
                [87, 87, 83, 83],
                [87, 172, 83, 83],
                [87, 257, 83, 83],
                [87, 342, 83, 83],
                [87, 427, 83, 83],
                [172, 87, 83, 83],
                [257, 87, 83, 83],
                [342, 87, 83, 83],
                [427, 87, 83, 83],
                [172, 172, 83, 83],
                [172, 257, 83, 83],
                [172, 342, 83, 83],
                [172, 427, 83, 83],
                [257, 172, 83, 83],
                [342, 172, 83, 83],
                [427, 172, 83, 83],
                [257, 257, 83, 83],
                [257, 342, 83, 83],
                [257, 427, 83, 83],
                [342, 257, 83, 83],
                [427, 257, 83, 83],
                [427, 257, 83, 83],
                [342, 257, 83, 83],
                [257, 427, 83, 83],
                [257, 342, 83, 83],
                [257, 257, 83, 83],
                [427, 172, 83, 83],
                [342, 172, 83, 83],
                [257, 172, 83, 83],
                [172, 427, 83, 83],
                [172, 342, 83, 83],
                [172, 257, 83, 83],
                [172, 172, 83, 83],
                [427, 87, 83, 83],
                [342, 87, 83, 83],
                [257, 87, 83, 83],
                [172, 87, 83, 83],
                [87, 427, 83, 83],
                [87, 342, 83, 83],
                [87, 257, 83, 83],
                [87, 172, 83, 83],
                [87, 87, 83, 83],
                [427, 2, 83, 83],
                [342, 2, 83, 83],
                [257, 2, 83, 83],
                [172, 2, 83, 83],
                [87, 2, 83, 83],
                [2, 427, 83, 83],
                [2, 342, 83, 83],
                [2, 257, 83, 83],
                [2, 172, 83, 83],
                [2, 87, 83, 83],
                [2, 2, 83, 83]
            ],
            "animations": {
                "diver_2_0": [0],
                "diver_2_1": [1],
                "diver_2_2": [2],
                "diver_2_3": [3],
                "diver_2_4": [4],
                "diver_2_5": [5],
                "diver_2_6": [6],
                "diver_2_7": [7],
                "diver_2_8": [8],
                "diver_2_9": [9],
                "diver_2_10": [10],
                "diver_2_11": [11],
                "diver_2_12": [12],
                "diver_2_13": [13],
                "diver_2_14": [14],
                "diver_2_15": [15],
                "diver_2_16": [16],
                "diver_2_17": [17],
                "diver_2_18": [18],
                "diver_2_19": [19],
                "diver_2_20": [20],
                "diver_2_21": [21],
                "diver_2_22": [22],
                "diver_2_23": [23],
                "diver_2_24": [24],
                "diver_2_25": [25],
                "diver_2_26": [26],
                "diver_2_27": [27],
                "diver_2_28": [28],
                "diver_2_29": [29],
                "diver_2_30": [30],
                "diver_2_31": [31],
                "diver_2_32": [32],
                "diver_2_33": [33],
                "diver_2_34": [34],
                "diver_2_35": [35],
                "diver_2_36": [36],
                "diver_2_37": [37],
                "diver_2_38": [38],
                "diver_2_39": [39],
                "diver_2_40": [40],
                "diver_2_41": [41],
                "diver_2_42": [42],
                "diver_2_43": [43],
                "diver_2_44": [44],
                "diver_2_45": [45],
                "diver_2_46": [46],
                "diver_2_47": [47],
                "diver_2_48": [48],
                "diver_2_49": [49],
                "diver_2_50": [50],
                "diver_2_51": [51],
                "diver_2_52": [52],
                "diver_2_53": [53],
                "diver_2_54": [54],
                "diver_2_55": [55],
                "diver_2_56": [56],
                "diver_2_57": [57],
                "diver_2_58": [58],
                "diver_2_59": [59],
                "diver_2_60": [60],
                "diver_2_61": [61],
                "diver_2_62": [62],
                "diver_2_63": [63]
            }
        },
        {
            "images": ["diver_3"],
            "frames": [
                [2, 2, 83, 84],
                [2, 88, 83, 84],
                [2, 174, 83, 84],
                [87, 2, 83, 84],
                [87, 88, 83, 84],
                [87, 174, 83, 84],
                [172, 2, 83, 84],
                [172, 88, 83, 84],
                [172, 174, 83, 84],
                [257, 2, 83, 84],
                [257, 88, 83, 84],
                [257, 174, 83, 84],
                [342, 2, 83, 84],
                [342, 88, 83, 84],
                [342, 174, 83, 84],
                [427, 2, 83, 84],
                [427, 88, 83, 84],
                [427, 174, 83, 84],
                [512, 2, 83, 84],
                [512, 88, 83, 84],
                [512, 174, 83, 84],
                [597, 2, 83, 84],
                [597, 88, 83, 84],
                [597, 174, 83, 84],
                [682, 2, 83, 84],
                [767, 2, 83, 84],
                [852, 2, 83, 84],
                [682, 88, 83, 84],
                [682, 174, 83, 84],
                [767, 88, 83, 84],
                [767, 174, 83, 84],
                [852, 88, 83, 84],
                [852, 88, 83, 84],
                [767, 174, 83, 84],
                [767, 88, 83, 84],
                [682, 174, 83, 84],
                [682, 88, 83, 84],
                [852, 2, 83, 84],
                [767, 2, 83, 84],
                [682, 2, 83, 84],
                [597, 174, 83, 84],
                [597, 88, 83, 84],
                [597, 2, 83, 84],
                [512, 174, 83, 84],
                [512, 88, 83, 84],
                [512, 2, 83, 84],
                [427, 174, 83, 84],
                [427, 88, 83, 84],
                [427, 2, 83, 84],
                [342, 174, 83, 84],
                [342, 88, 83, 84],
                [342, 2, 83, 84],
                [257, 174, 83, 84],
                [257, 88, 83, 84],
                [257, 2, 83, 84],
                [172, 174, 83, 84],
                [172, 88, 83, 84],
                [172, 2, 83, 84],
                [87, 174, 83, 84],
                [87, 88, 83, 84],
                [87, 2, 83, 84],
                [2, 174, 83, 84],
                [2, 88, 83, 84],
                [2, 2, 83, 84]
            ],
            "animations": {
                "diver_3_0": [0],
                "diver_3_1": [1],
                "diver_3_2": [2],
                "diver_3_3": [3],
                "diver_3_4": [4],
                "diver_3_5": [5],
                "diver_3_6": [6],
                "diver_3_7": [7],
                "diver_3_8": [8],
                "diver_3_9": [9],
                "diver_3_10": [10],
                "diver_3_11": [11],
                "diver_3_12": [12],
                "diver_3_13": [13],
                "diver_3_14": [14],
                "diver_3_15": [15],
                "diver_3_16": [16],
                "diver_3_17": [17],
                "diver_3_18": [18],
                "diver_3_19": [19],
                "diver_3_20": [20],
                "diver_3_21": [21],
                "diver_3_22": [22],
                "diver_3_23": [23],
                "diver_3_24": [24],
                "diver_3_25": [25],
                "diver_3_26": [26],
                "diver_3_27": [27],
                "diver_3_28": [28],
                "diver_3_29": [29],
                "diver_3_30": [30],
                "diver_3_31": [31],
                "diver_3_32": [32],
                "diver_3_33": [33],
                "diver_3_34": [34],
                "diver_3_35": [35],
                "diver_3_36": [36],
                "diver_3_37": [37],
                "diver_3_38": [38],
                "diver_3_39": [39],
                "diver_3_40": [40],
                "diver_3_41": [41],
                "diver_3_42": [42],
                "diver_3_43": [43],
                "diver_3_44": [44],
                "diver_3_45": [45],
                "diver_3_46": [46],
                "diver_3_47": [47],
                "diver_3_48": [48],
                "diver_3_49": [49],
                "diver_3_50": [50],
                "diver_3_51": [51],
                "diver_3_52": [52],
                "diver_3_53": [53],
                "diver_3_54": [54],
                "diver_3_55": [55],
                "diver_3_56": [56],
                "diver_3_57": [57],
                "diver_3_58": [58],
                "diver_3_59": [59],
                "diver_3_60": [60],
                "diver_3_61": [61],
                "diver_3_62": [62],
                "diver_3_63": [63]
            }
        },
        {
            "images": ["bonus_fish"],
            "frames": [
                [136, 2, 65, 46],
                [69, 2, 65, 46],
                [2, 2, 65, 46],
                [69, 2, 65, 46]
            ],
            "animations": {
                "bonus_fish_0": [0],
                "bonus_fish_1": [1],
                "bonus_fish_2": [2],
                "bonus_fish_3": [3]
            }
        },
        {
            "images": ["font_messages"],
            "frames": [
                [1, 40, 6, 6],
                [8, 4, 19, 44],
                [28, 1, 31, 22],
                [60, 9, 34, 33],
                [95, 2, 25, 48],
                [121, 8, 40, 37],
                [162, 7, 39, 40],
                [202, 1, 19, 21],
                [222, 2, 27, 49],
                [250, 2, 27, 49],
                [278, 4, 32, 31],
                [311, 13, 26, 28],
                [338, 29, 17, 22],
                [356, 19, 22, 14],
                [379, 30, 17, 17],
                [397, 3, 30, 45],
                [428, 5, 37, 42],
                [466, 5, 25, 41],
                [492, 3, 30, 42],
                [523, 3, 32, 44],
                [556, 4, 33, 43],
                [590, 5, 32, 42],
                [623, 3, 33, 44],
                [657, 5, 30, 41],
                [688, 4, 34, 42],
                [723, 5, 33, 41],
                [757, 14, 17, 33],
                [775, 14, 17, 38],
                [793, 8, 27, 36],
                [821, 15, 22, 24],
                [844, 8, 27, 36],
                [872, 5, 32, 44],
                [905, 8, 36, 36],
                [942, 6, 40, 40],
                [983, 5, 35, 42],
                [1, 64, 32, 41],
                [34, 65, 34, 40],
                [69, 64, 29, 41],
                [99, 64, 29, 41],
                [129, 62, 36, 44],
                [166, 64, 35, 41],
                [202, 65, 19, 39],
                [222, 64, 32, 42],
                [255, 62, 37, 44],
                [293, 64, 27, 40],
                [321, 64, 42, 42],
                [364, 64, 38, 41],
                [403, 66, 37, 38],
                [441, 64, 34, 43],
                [476, 65, 40, 46],
                [517, 64, 34, 42],
                [552, 63, 32, 43],
                [585, 64, 33, 40],
                [619, 65, 36, 41],
                [656, 64, 39, 41],
                [696, 64, 52, 41],
                [749, 63, 39, 42],
                [789, 65, 39, 41],
                [829, 64, 31, 41],
                [861, 60, 23, 49],
                [885, 62, 30, 45],
                [916, 60, 22, 48],
                [939, 64, 31, 26],
                [971, 101, 22, 14],
                [994, 53, 21, 19],
                [1, 121, 40, 40],
                [42, 120, 35, 42],
                [78, 121, 31, 41],
                [110, 121, 34, 40],
                [145, 120, 35, 42],
                [181, 121, 29, 40],
                [211, 120, 36, 42],
                [248, 121, 35, 40],
                [284, 121, 18, 39],
                [303, 120, 32, 42],
                [336, 121, 36, 41],
                [373, 120, 28, 41],
                [402, 120, 49, 41],
                [452, 120, 36, 41],
                [489, 121, 37, 38],
                [527, 121, 34, 42],
                [562, 121, 40, 46],
                [603, 120, 34, 42],
                [638, 120, 32, 42],
                [671, 121, 33, 40],
                [705, 121, 36, 41],
                [742, 121, 39, 40],
                [782, 119, 52, 41],
                [835, 120, 38, 41],
                [874, 121, 39, 40],
                [914, 121, 30, 39],
                [945, 116, 28, 49],
                [974, 117, 17, 47],
                [992, 116, 28, 49],
                [1, 190, 34, 23],
                [36, 189, 19, 44],
                [56, 175, 23, 14],
                [80, 194, 17, 17],
                [98, 215, 16, 20],
                [115, 189, 33, 44],
                [149, 169, 40, 54],
                [190, 169, 40, 54],
                [231, 171, 40, 52],
                [272, 170, 40, 53],
                [313, 174, 39, 49],
                [353, 171, 40, 52],
                [394, 183, 50, 40],
                [445, 182, 32, 53],
                [478, 168, 29, 55],
                [508, 168, 30, 55],
                [539, 171, 29, 52],
                [569, 173, 29, 50],
                [599, 168, 25, 54],
                [625, 168, 26, 54],
                [652, 171, 25, 51],
                [678, 174, 23, 48],
                [702, 183, 38, 40],
                [741, 170, 38, 53],
                [780, 170, 37, 52],
                [818, 171, 37, 51],
                [856, 173, 37, 49],
                [894, 172, 37, 50],
                [932, 175, 37, 47],
                [970, 170, 36, 54],
                [1, 237, 36, 54],
                [38, 239, 36, 52],
                [75, 242, 36, 49],
                [112, 237, 39, 54],
                [152, 249, 34, 42],
                [187, 249, 57, 42],
                [245, 236, 40, 54],
                [286, 236, 40, 54],
                [327, 238, 40, 52],
                [368, 238, 40, 52],
                [409, 241, 39, 49],
                [449, 239, 40, 51],
                [490, 249, 53, 42],
                [544, 250, 31, 53],
                [576, 236, 35, 55],
                [612, 236, 35, 55],
                [648, 237, 35, 54],
                [684, 241, 35, 50],
                [720, 236, 26, 53],
                [747, 236, 25, 53],
                [773, 238, 25, 51],
                [799, 241, 23, 48],
                [823, 250, 38, 40],
                [862, 236, 36, 54],
                [899, 236, 37, 52],
                [937, 236, 37, 52],
                [975, 238, 37, 50],
                [1, 304, 37, 51],
                [39, 308, 37, 47],
                [77, 305, 36, 53],
                [114, 304, 36, 54],
                [151, 305, 36, 53],
                [188, 309, 36, 49],
                [225, 305, 39, 52],
                [265, 316, 34, 42],
                [300, 309, 39, 48],
            ],
            "animations": {
                "font_messages_ ": [0],
                "font_messages_!": [1],
                "font_messages_\"": [2],
                "font_messages_#": [3],
                "font_messages_$": [4],
                "font_messages_%": [5],
                "font_messages_&": [6],
                "font_messages_\'": [7],
                "font_messages_(": [8],
                "font_messages_)": [9],
                "font_messages_*": [10],
                "font_messages_+": [11],
                "font_messages_,": [12],
                "font_messages_-": [13],
                "font_messages_.": [14],
                "font_messages_/": [15],
                "font_messages_0": [16],
                "font_messages_1": [17],
                "font_messages_2": [18],
                "font_messages_3": [19],
                "font_messages_4": [20],
                "font_messages_5": [21],
                "font_messages_6": [22],
                "font_messages_7": [23],
                "font_messages_8": [24],
                "font_messages_9": [25],
                "font_messages_:": [26],
                "font_messages_;": [27],
                "font_messages_<": [28],
                "font_messages_=": [29],
                "font_messages_>": [30],
                "font_messages_?": [31],
                "font_messages_@": [32],
                "font_messages_A": [33],
                "font_messages_B": [34],
                "font_messages_C": [35],
                "font_messages_D": [36],
                "font_messages_E": [37],
                "font_messages_F": [38],
                "font_messages_G": [39],
                "font_messages_H": [40],
                "font_messages_I": [41],
                "font_messages_J": [42],
                "font_messages_K": [43],
                "font_messages_L": [44],
                "font_messages_M": [45],
                "font_messages_N": [46],
                "font_messages_O": [47],
                "font_messages_P": [48],
                "font_messages_Q": [49],
                "font_messages_R": [50],
                "font_messages_S": [51],
                "font_messages_T": [52],
                "font_messages_U": [53],
                "font_messages_V": [54],
                "font_messages_W": [55],
                "font_messages_X": [56],
                "font_messages_Y": [57],
                "font_messages_Z": [58],
                "font_messages_[": [59],
                "font_messages_\\": [60],
                "font_messages_]": [61],
                "font_messages_^": [62],
                "font_messages__": [63],
                "font_messages_`": [64],
                "font_messages_a": [65],
                "font_messages_b": [66],
                "font_messages_c": [67],
                "font_messages_d": [68],
                "font_messages_e": [69],
                "font_messages_f": [70],
                "font_messages_g": [71],
                "font_messages_h": [72],
                "font_messages_i": [73],
                "font_messages_j": [74],
                "font_messages_k": [75],
                "font_messages_l": [76],
                "font_messages_m": [77],
                "font_messages_n": [78],
                "font_messages_o": [79],
                "font_messages_p": [80],
                "font_messages_q": [81],
                "font_messages_r": [82],
                "font_messages_s": [83],
                "font_messages_t": [84],
                "font_messages_u": [85],
                "font_messages_v": [86],
                "font_messages_w": [87],
                "font_messages_x": [88],
                "font_messages_y": [89],
                "font_messages_z": [90],
                "font_messages_{": [91],
                "font_messages_|": [92],
                "font_messages_}": [93],
                "font_messages_~": [94],
                "font_messages_¡": [95],
                "font_messages_¨": [96],
                "font_messages_·": [97],
                "font_messages_¸": [98],
                "font_messages_¿": [99],
                "font_messages_À": [100],
                "font_messages_Á": [101],
                "font_messages_Â": [102],
                "font_messages_Ã": [103],
                "font_messages_Ä": [104],
                "font_messages_Å": [105],
                "font_messages_Æ": [106],
                "font_messages_Ç": [107],
                "font_messages_È": [108],
                "font_messages_É": [109],
                "font_messages_Ê": [110],
                "font_messages_Ë": [111],
                "font_messages_Ì": [112],
                "font_messages_Í": [113],
                "font_messages_Î": [114],
                "font_messages_Ï": [115],
                "font_messages_Ð": [116],
                "font_messages_Ñ": [117],
                "font_messages_Ò": [118],
                "font_messages_Ó": [119],
                "font_messages_Ô": [120],
                "font_messages_Õ": [121],
                "font_messages_Ö": [122],
                "font_messages_Ù": [123],
                "font_messages_Ú": [124],
                "font_messages_Û": [125],
                "font_messages_Ü": [126],
                "font_messages_Ý": [127],
                "font_messages_Þ": [128],
                "font_messages_ß": [129],
                "font_messages_à": [130],
                "font_messages_á": [131],
                "font_messages_â": [132],
                "font_messages_ã": [133],
                "font_messages_ä": [134],
                "font_messages_å": [135],
                "font_messages_æ": [136],
                "font_messages_ç": [137],
                "font_messages_è": [138],
                "font_messages_é": [139],
                "font_messages_ê": [140],
                "font_messages_ë": [141],
                "font_messages_ì": [142],
                "font_messages_í": [143],
                "font_messages_î": [144],
                "font_messages_ï": [145],
                "font_messages_ð": [146],
                "font_messages_ñ": [147],
                "font_messages_ò": [148],
                "font_messages_ó": [149],
                "font_messages_ô": [150],
                "font_messages_õ": [151],
                "font_messages_ö": [152],
                "font_messages_ù": [153],
                "font_messages_ú": [154],
                "font_messages_û": [155],
                "font_messages_ü": [156],
                "font_messages_ý": [157],
                "font_messages_þ": [158],
                "font_messages_ÿ": [159],
            }
        },
        {
            "images": ["font_gui"],
            "frames": [
                [1, 29, 6, 6],
                [8, 3, 15, 33],
                [24, 1, 24, 18],
                [49, 7, 27, 25],
                [77, 2, 20, 36],
                [98, 6, 31, 28],
                [130, 5, 30, 31],
                [161, 1, 15, 17],
                [177, 1, 21, 37],
                [199, 1, 21, 37],
                [221, 4, 25, 24],
                [247, 9, 21, 22],
                [269, 21, 14, 17],
                [284, 14, 17, 12],
                [302, 21, 14, 14],
                [317, 2, 24, 35],
                [342, 4, 28, 31],
                [371, 4, 20, 31],
                [392, 3, 23, 32],
                [416, 2, 25, 33],
                [442, 3, 26, 32],
                [469, 4, 25, 31],
                [1, 39, 26, 33],
                [28, 41, 23, 31],
                [52, 40, 26, 32],
                [79, 40, 25, 32],
                [105, 47, 14, 25],
                [120, 47, 14, 29],
                [135, 43, 21, 28],
                [157, 48, 17, 19],
                [175, 43, 21, 28],
                [197, 40, 26, 34],
                [224, 43, 28, 27],
                [253, 41, 31, 30],
                [285, 40, 27, 32],
                [313, 40, 25, 32],
                [339, 41, 26, 31],
                [366, 41, 23, 31],
                [390, 41, 23, 31],
                [414, 39, 28, 33],
                [443, 41, 27, 31],
                [471, 41, 16, 31],
                [1, 78, 25, 31],
                [27, 77, 29, 33],
                [57, 78, 21, 30],
                [79, 78, 32, 31],
                [112, 78, 29, 31],
                [142, 80, 28, 29],
                [171, 77, 26, 32],
                [198, 78, 31, 35],
                [230, 77, 27, 33],
                [258, 77, 24, 32],
                [283, 78, 25, 31],
                [309, 78, 27, 32],
                [337, 77, 30, 32],
                [368, 78, 39, 31],
                [408, 77, 30, 32],
                [439, 79, 29, 31],
                [469, 78, 23, 31],
                [1, 119, 19, 37],
                [21, 120, 24, 35],
                [46, 119, 18, 36],
                [65, 122, 24, 20],
                [90, 148, 17, 12],
                [108, 114, 17, 16],
                [126, 122, 31, 30],
                [158, 121, 27, 32],
                [186, 122, 24, 31],
                [211, 122, 26, 31],
                [238, 121, 27, 32],
                [266, 122, 23, 31],
                [290, 121, 28, 32],
                [319, 122, 27, 31],
                [347, 122, 14, 31],
                [362, 122, 25, 31],
                [388, 122, 28, 32],
                [417, 122, 22, 31],
                [440, 121, 38, 32],
                [479, 121, 28, 32],
                [1, 166, 28, 29],
                [30, 166, 26, 31],
                [57, 166, 31, 35],
                [89, 165, 27, 33],
                [117, 166, 24, 31],
                [142, 166, 26, 31],
                [169, 166, 28, 33],
                [198, 166, 30, 31],
                [229, 166, 39, 31],
                [269, 166, 30, 31],
                [300, 167, 31, 30],
                [332, 166, 24, 31],
                [357, 164, 22, 36],
                [380, 164, 14, 35],
                [395, 163, 23, 37],
                [419, 171, 26, 19],
                [446, 170, 16, 34],
                [463, 161, 18, 12],
                [482, 175, 14, 14],
                [1, 240, 14, 16],
                [16, 221, 25, 33],
                [42, 206, 31, 40],
                [74, 206, 31, 40],
                [106, 207, 31, 39],
                [138, 206, 30, 40],
                [169, 210, 30, 36],
                [200, 208, 31, 38],
                [232, 216, 38, 31],
                [271, 215, 25, 40],
                [297, 206, 23, 41],
                [321, 206, 23, 41],
                [345, 208, 23, 39],
                [369, 210, 23, 37],
                [393, 205, 21, 42],
                [415, 205, 20, 42],
                [436, 209, 19, 38],
                [456, 211, 18, 36],
                [475, 216, 29, 31],
                [1, 258, 29, 40],
                [31, 259, 28, 39],
                [60, 260, 28, 38],
                [89, 261, 28, 37],
                [118, 260, 28, 38],
                [147, 263, 28, 35],
                [176, 257, 27, 42],
                [204, 258, 27, 41],
                [232, 259, 27, 40],
                [260, 261, 27, 38],
                [288, 259, 29, 40],
                [318, 267, 27, 31],
                [346, 267, 43, 31],
                [390, 257, 31, 40],
                [422, 257, 31, 40],
                [454, 259, 31, 38],
                [1, 302, 30, 39],
                [32, 305, 30, 36],
                [63, 303, 31, 38],
                [95, 310, 41, 32],
                [137, 311, 24, 40],
                [162, 301, 27, 41],
                [190, 300, 27, 42],
                [218, 302, 27, 40],
                [246, 304, 27, 38],
                [274, 301, 20, 41],
                [295, 301, 19, 41],
                [315, 304, 19, 38],
                [335, 306, 18, 36],
                [354, 311, 29, 31],
                [384, 302, 28, 40],
                [413, 301, 28, 39],
                [442, 301, 28, 39],
                [471, 302, 28, 38],
                [1, 352, 28, 39],
                [30, 355, 28, 36],
                [59, 353, 28, 42],
                [88, 353, 28, 42],
                [117, 355, 28, 40],
                [146, 357, 28, 38],
                [175, 355, 31, 38],
                [207, 362, 27, 31],
                [235, 357, 30, 36],
            ],
            "animations": {
                "font_gui_ ": [0],
                "font_gui_!": [1],
                "font_gui_\"": [2],
                "font_gui_#": [3],
                "font_gui_$": [4],
                "font_gui_%": [5],
                "font_gui_&": [6],
                "font_gui_\'": [7],
                "font_gui_(": [8],
                "font_gui_)": [9],
                "font_gui_*": [10],
                "font_gui_+": [11],
                "font_gui_,": [12],
                "font_gui_-": [13],
                "font_gui_.": [14],
                "font_gui_/": [15],
                "font_gui_0": [16],
                "font_gui_1": [17],
                "font_gui_2": [18],
                "font_gui_3": [19],
                "font_gui_4": [20],
                "font_gui_5": [21],
                "font_gui_6": [22],
                "font_gui_7": [23],
                "font_gui_8": [24],
                "font_gui_9": [25],
                "font_gui_:": [26],
                "font_gui_;": [27],
                "font_gui_<": [28],
                "font_gui_=": [29],
                "font_gui_>": [30],
                "font_gui_?": [31],
                "font_gui_@": [32],
                "font_gui_A": [33],
                "font_gui_B": [34],
                "font_gui_C": [35],
                "font_gui_D": [36],
                "font_gui_E": [37],
                "font_gui_F": [38],
                "font_gui_G": [39],
                "font_gui_H": [40],
                "font_gui_I": [41],
                "font_gui_J": [42],
                "font_gui_K": [43],
                "font_gui_L": [44],
                "font_gui_M": [45],
                "font_gui_N": [46],
                "font_gui_O": [47],
                "font_gui_P": [48],
                "font_gui_Q": [49],
                "font_gui_R": [50],
                "font_gui_S": [51],
                "font_gui_T": [52],
                "font_gui_U": [53],
                "font_gui_V": [54],
                "font_gui_W": [55],
                "font_gui_X": [56],
                "font_gui_Y": [57],
                "font_gui_Z": [58],
                "font_gui_[": [59],
                "font_gui_\\": [60],
                "font_gui_]": [61],
                "font_gui_^": [62],
                "font_gui__": [63],
                "font_gui_`": [64],
                "font_gui_a": [65],
                "font_gui_b": [66],
                "font_gui_c": [67],
                "font_gui_d": [68],
                "font_gui_e": [69],
                "font_gui_f": [70],
                "font_gui_g": [71],
                "font_gui_h": [72],
                "font_gui_i": [73],
                "font_gui_j": [74],
                "font_gui_k": [75],
                "font_gui_l": [76],
                "font_gui_m": [77],
                "font_gui_n": [78],
                "font_gui_o": [79],
                "font_gui_p": [80],
                "font_gui_q": [81],
                "font_gui_r": [82],
                "font_gui_s": [83],
                "font_gui_t": [84],
                "font_gui_u": [85],
                "font_gui_v": [86],
                "font_gui_w": [87],
                "font_gui_x": [88],
                "font_gui_y": [89],
                "font_gui_z": [90],
                "font_gui_{": [91],
                "font_gui_|": [92],
                "font_gui_}": [93],
                "font_gui_~": [94],
                "font_gui_¡": [95],
                "font_gui_¨": [96],
                "font_gui_·": [97],
                "font_gui_¸": [98],
                "font_gui_¿": [99],
                "font_gui_À": [100],
                "font_gui_Á": [101],
                "font_gui_Â": [102],
                "font_gui_Ã": [103],
                "font_gui_Ä": [104],
                "font_gui_Å": [105],
                "font_gui_Æ": [106],
                "font_gui_Ç": [107],
                "font_gui_È": [108],
                "font_gui_É": [109],
                "font_gui_Ê": [110],
                "font_gui_Ë": [111],
                "font_gui_Ì": [112],
                "font_gui_Í": [113],
                "font_gui_Î": [114],
                "font_gui_Ï": [115],
                "font_gui_Ð": [116],
                "font_gui_Ñ": [117],
                "font_gui_Ò": [118],
                "font_gui_Ó": [119],
                "font_gui_Ô": [120],
                "font_gui_Õ": [121],
                "font_gui_Ö": [122],
                "font_gui_Ù": [123],
                "font_gui_Ú": [124],
                "font_gui_Û": [125],
                "font_gui_Ü": [126],
                "font_gui_Ý": [127],
                "font_gui_Þ": [128],
                "font_gui_ß": [129],
                "font_gui_à": [130],
                "font_gui_á": [131],
                "font_gui_â": [132],
                "font_gui_ã": [133],
                "font_gui_ä": [134],
                "font_gui_å": [135],
                "font_gui_æ": [136],
                "font_gui_ç": [137],
                "font_gui_è": [138],
                "font_gui_é": [139],
                "font_gui_ê": [140],
                "font_gui_ë": [141],
                "font_gui_ì": [142],
                "font_gui_í": [143],
                "font_gui_î": [144],
                "font_gui_ï": [145],
                "font_gui_ð": [146],
                "font_gui_ñ": [147],
                "font_gui_ò": [148],
                "font_gui_ó": [149],
                "font_gui_ô": [150],
                "font_gui_õ": [151],
                "font_gui_ö": [152],
                "font_gui_ù": [153],
                "font_gui_ú": [154],
                "font_gui_û": [155],
                "font_gui_ü": [156],
                "font_gui_ý": [157],
                "font_gui_þ": [158],
                "font_gui_ÿ": [159],
            }
        },
        {
            "images": ["water_splash"],
            "frames": [
                [428, 263, 140, 85],
                [286, 263, 140, 85],
                [428, 176, 140, 85],
                [286, 176, 140, 85],
                [428, 89, 140, 85],
                [286, 89, 140, 85],
                [144, 263, 140, 85],
                [144, 176, 140, 85],
                [144, 89, 140, 85],
                [428, 2, 140, 85],
                [286, 2, 140, 85],
                [144, 2, 140, 85],
                [2, 263, 140, 85],
                [2, 176, 140, 85],
                [2, 89, 140, 85],
                [2, 2, 140, 85]
            ],
            "animations": {
                "water_splash_0": [0],
                "water_splash_1": [1],
                "water_splash_2": [2],
                "water_splash_3": [3],
                "water_splash_4": [4],
                "water_splash_5": [5],
                "water_splash_6": [6],
                "water_splash_7": [7],
                "water_splash_8": [8],
                "water_splash_9": [9],
                "water_splash_10": [10],
                "water_splash_11": [11],
                "water_splash_12": [12],
                "water_splash_13": [13],
                "water_splash_14": [14],
                "water_splash_15": [15]
            }
        },
        {
            "images": ["score_font"],
            "frames": [
                [312, 2, 29, 42],
                [281, 2, 29, 42],
                [250, 2, 29, 42],
                [219, 2, 29, 42],
                [188, 2, 29, 42],
                [157, 2, 29, 42],
                [126, 2, 29, 42],
                [95, 2, 29, 42],
                [64, 2, 29, 42],
                [33, 2, 29, 42],
                [2, 2, 29, 42]
            ],
            "animations": {
                "score_font/0": [0],
                "score_font/1": [1],
                "score_font/2": [2],
                "score_font/3": [3],
                "score_font/4": [4],
                "score_font/5": [5],
                "score_font/6": [6],
                "score_font/7": [7],
                "score_font/8": [8],
                "score_font/9": [9],
                "score_font/p": [10]
            }
        },
        {
            "images": ["screw"],
            "frames": [
                [2, 727, 62, 143],
                [2, 582, 62, 143],
                [2, 437, 62, 143],
                [2, 292, 62, 143],
                [2, 147, 62, 143],
                [2, 2, 62, 143]
            ],
            "animations": {
                "screw_0": [0],
                "screw_1": [1],
                "screw_2": [2],
                "screw_3": [3],
                "screw_4": [4],
                "screw_5": [5]
            }
        },
        {
            "images": ["explosion"],
            "frames": [
                [2, 2, 195, 195],
                [199, 2, 195, 195],
                [396, 2, 195, 195],
                [2, 199, 195, 195],
                [2, 396, 195, 195],
                [2, 593, 195, 195],
                [199, 199, 195, 195],
                [396, 199, 195, 195],
                [199, 396, 195, 195],
                [199, 593, 195, 195],
                [396, 396, 195, 195],
                [396, 593, 195, 195]
            ],
            "animations": {
                "explosion_0": [0],
                "explosion_1": [1],
                "explosion_2": [2],
                "explosion_3": [3],
                "explosion_4": [4],
                "explosion_5": [5],
                "explosion_6": [6],
                "explosion_7": [7],
                "explosion_8": [8],
                "explosion_9": [9],
                "explosion_10": [10],
                "explosion_11": [11]
            }
        },
        {
            "images": ["transform"],
            "frames": [
                [422, 142, 138, 138],
                [282, 282, 138, 138],
                [282, 142, 138, 138],
                [422, 2, 138, 138],
                [282, 2, 138, 138],
                [142, 282, 138, 138],
                [142, 142, 138, 138],
                [142, 2, 138, 138],
                [2, 282, 138, 138],
                [2, 142, 138, 138],
                [2, 2, 138, 138]
            ],
            "animations": {
                "transform_0": [0],
                "transform_1": [1],
                "transform_2": [2],
                "transform_3": [3],
                "transform_4": [4],
                "transform_5": [5],
                "transform_6": [6],
                "transform_7": [7],
                "transform_8": [8],
                "transform_9": [9],
                "transform_10": [10]
            }
        }
    ];
    var art = [
        Images.TRANSITION_UP,
        Images.TRANSITION_DOWN,
        "wave_1",
        "wave_2",
        "wave_3",
    ];
    var jpg = [
        "background_1",
        "background_2",
        "background_3",
        "map_1",
        "map_2",
        "map_3",
        Images.FILL,
    ];
    var sound = [
        Sounds.MUSIC,
        Sounds.CLICK,
        Sounds.MATCH_1,
        Sounds.MATCH_2,
        Sounds.MATCH_3,
        Sounds.LINE,
        Sounds.WIN,
        Sounds.LOSE,
        Sounds.BOMB,
        Sounds.POPUP,
        Sounds.FREEDOM_1,
        Sounds.FREEDOM_2,
        Sounds.PLUS,
        Sounds.JUMP,
    ];
    for (var i = 0; i < athlases.length; i++) {
        art.push(athlases[i]["images"][0]);
    }
    for (var i = 0; i < art.length; i++) {
        manifest.push({
            src: "images/" + art[i] + ".png",
            id: art[i]
        });
    }
    for (var i = 0; i < jpg.length; i++) {
        manifest.push({
            src: "images/" + jpg[i] + ".jpg",
            id: jpg[i]
        });
    }
    var sound_manifest = [];
    createjs.Sound.alternateExtensions = ["ogg"];
    for (var i = 0; i < sound.length; i++) {
        sound_manifest.push({
            src: sound[i] + ".mp3",
            id: sound[i]
        });
    }
    Constants.g_isPC = false;!Utils.IsMobileBrowser();
    new DNStateManager(manifest, sound_manifest, athlases, []);
};
/// <reference path="references.ts" />
var AutoreleaseEffect = (function(_super) {
    __extends(AutoreleaseEffect, _super);

    function AutoreleaseEffect(name, count, frame_time, loop) {
        _super.call(this);
        this.frames = new Array();
        this.frame = -1;
        this.loop = false;
        this.paused = false;
        this.frameTime = frame_time;
        for (var i = 0; i < count; i++) {
            this.frames.push(DNAssetsManager.g_instance.getCenteredImageWithProxy(name + i));
        }
        if (loop) {
            this.loop = loop;
        }
        this.update(100);
    }
    AutoreleaseEffect.prototype.pause = function() {
        this.paused = true;
    };
    AutoreleaseEffect.prototype.play = function() {
        this.paused = false;
        this.liveTime = 0;
    };
    AutoreleaseEffect.prototype.gotoAndStop = function(frame) {
        this.frame = frame;
        this.pause();
        //if frame == old frame
        this.removeAllChildren();
        this.addChild(this.frames[frame]);
    };
    AutoreleaseEffect.prototype.totalFrames = function() {
        return this.frames.length;
    };
    AutoreleaseEffect.prototype.setFrameTime = function(tm) {
        this.frameTime = tm;
    };
    AutoreleaseEffect.prototype.update = function(dt) {
        if (this.paused) {
            return;
        }
        _super.prototype.update.call(this, dt);
        if (this.liveTime > this.frameTime) {
            this.liveTime = 0;
            this.frame++;
            if (this.frame >= this.frames.length) {
                this.frame = this.frames.length - 1;
                if (this.loop) {
                    this.frame = 0;
                } else {
                    this.kill();
                }
            }
            this.removeAllChildren();
            var pic = this.frames[this.frame];
            this.addChild(pic);
        }
    };
    return AutoreleaseEffect;
})(DNGameObject);
/// <reference path="references.ts" />
var BonusArrows = (function(_super) {
    __extends(BonusArrows, _super);

    function BonusArrows() {
        _super.call(this);
        this.arrLeft = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.BONUS_ARROW);
        this.addChild(this.arrLeft);
        this.arrRight = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.BONUS_ARROW);
        this.addChild(this.arrRight);
        this.arrRight.scaleX = -1;
        this.update(0);
    }
    BonusArrows.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.arrLeft.x = +Constants.CELL_SIZE / 2 + Math.sin(this.liveTime * 9) * 3;
        this.arrRight.x = -Constants.CELL_SIZE / 2 - Math.sin(this.liveTime * 9) * 3;
    };
    return BonusArrows;
})(DNGameObject);
/// <reference path="references.ts" />
var Bubble = (function(_super) {
    __extends(Bubble, _super);

    function Bubble() {
        _super.call(this);
        this.speed = Utils.RandomRange(-180, -100);
        this.speedX = Utils.RandomRange(-4, 4);
        this.maxScale = Utils.RandomRange(0.6, 1.3);
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.BUBBLE));
        this.scaleX = this.scaleY = 0;
    }
    Bubble.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.y += this.speed * dt;
        this.x += this.speedX * dt;
        this.scaleX = this.scaleY = Math.min(this.maxScale, this.scaleX + dt * 2);
        if (this.y < 250) {
            this.alpha -= dt * 1.5;
            if (this.alpha <= 0) {
                this.kill();
            }
        }
    };
    return Bubble;
})(DNGameObject);
/// <reference path="references.ts" />
var BubblePause = (function(_super) {
    __extends(BubblePause, _super);

    function BubblePause() {
        _super.call(this);
        this.speed = Utils.RandomRange(-150, -40);
        this.speedX = Utils.RandomRange(-4, 4);
        this.maxScale = Utils.RandomRange(0.1, 1.2);
        this.maxLiveTime = Utils.RandomRange(0.3, 1.6);
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.BUBBLE_QUICK));
        this.scaleX = this.scaleY = 0;
    }
    BubblePause.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.y += this.speed * dt;
        this.x += this.speedX * dt;
        this.scaleX = this.scaleY = Math.min(this.maxScale, this.scaleX + dt * 2);
        if (this.liveTime >= this.maxLiveTime) {
            this.alpha -= dt * 2;
            if (this.alpha <= 0) {
                this.kill();
            }
        }
    };
    return BubblePause;
})(DNGameObject);
/// <reference path="references.ts" />
var BubbleQuick = (function(_super) {
    __extends(BubbleQuick, _super);

    function BubbleQuick() {
        _super.call(this);
        this.speedY = Utils.RandomRange(-150, -40);
        this.speedX = Utils.RandomRange(-4, 4);
        this.maxScale = Utils.RandomRange(0.1, 1.2);
        this.maxLiveTime = Utils.RandomRange(0.3, 1.6);
        this.surfaceLevel = 100;
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.BUBBLE_QUICK));
        this.scaleX = this.scaleY = 0;
    }
    BubbleQuick.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.y += this.speedY * dt;
        this.x += this.speedX * dt;
        this.scaleX = this.scaleY = Math.min(this.maxScale, this.scaleX + dt * 2);
        if (this.y < -50) {
            this.kill();
        }
        if (this.liveTime >= this.maxLiveTime || this.y < this.surfaceLevel) {
            this.alpha -= dt * 3;
            if (this.alpha <= 0) {
                this.kill();
            }
        }
    };
    return BubbleQuick;
})(DNGameObject);
/// <reference path="references.ts" />
var BubbleSpawner = (function(_super) {
    __extends(BubbleSpawner, _super);

    function BubbleSpawner(state, layer, max_delay, delay) {
        _super.call(this);
        this.counter = 0;
        this.delay = Utils.RandomRange(-10, +10);
        this.timeToSpawn = 0;
        this.state = state;
        this.layer = layer;
        this.maxDelay = max_delay;
        this.delayInPortions = delay || 10;
    }
    BubbleSpawner.prototype.update = function(dt) {
        this.delay -= dt;
        if (this.delay > 0) {
            return;
        }
        _super.prototype.update.call(this, dt);
        if (this.liveTime >= this.timeToSpawn) {
            this.liveTime = 0;
            this.timeToSpawn = Utils.RandomRange(0.05, this.maxDelay);
            this.state.addGameObjectAtPos(new Bubble(), this.layer, this.x, this.y);
            this.counter--;
            if (this.counter <= 0) {
                this.delay = this.delayInPortions * Utils.RandomRange(0.5, 1);
                this.counter = Utils.RandomRangeInt(8, 11);
            }
        }
    };
    return BubbleSpawner;
})(DNGameObject);
/// <reference path="references.ts" />
var BubbleSpawner2 = (function(_super) {
    __extends(BubbleSpawner2, _super);

    function BubbleSpawner2(state, layer) {
        _super.call(this);
        this.delay = 0;
        this.timeToSpawn = 0;
        this.maxDelay = 0.6;
        this.state = state;
        this.layer = layer;
        this.maxDelay = 0.3;
    }
    BubbleSpawner2.prototype.pause = function() {
        this.delay = 1000;
    };
    BubbleSpawner2.prototype.resume = function() {
        this.delay = 0;
    };
    BubbleSpawner2.prototype.update = function(dt) {
        this.delay -= dt;
        if (this.delay > 0) {
            return;
        }
        _super.prototype.update.call(this, dt);
        if (this.liveTime >= this.timeToSpawn) {
            this.liveTime = 0;
            this.timeToSpawn = Utils.RandomRange(0.05, this.maxDelay);
            this.state.addGameObjectAtPos(new BubblePause(), this.layer, this.x, this.y);
        }
    };
    return BubbleSpawner2;
})(DNGameObject);
/// <reference path="references.ts" />
var Chip = (function(_super) {
    __extends(Chip, _super);

    function Chip(id, x_index, y_index, spawn_y_pos, spawn_delay) {
        _super.call(this);
        this.landY = 100;
        this.state = null;
        this.diverAnim = null;
        this.selected = false;
        this.stateTime = 0;
        this.bonusType = null;
        this.matchReason = null;
        this.monster = false;
        this.moveAwaySpeed = Utils.RandomRange(50, 70) * 0.6;
        this.blinkPic = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.HINT);
        this.bonusArrows = new BonusArrows();
        this.plus = false;
        this.plusPic = null;
        this.effect = null;
        this.wasMatchEffect = false;
        this.matchDelay = 0;
        //  bibb
        if (id > 5 && id != Constants.UNIVERSAL_COLOR_ID) {
            id = 5;
        }
        this.spawnYPos = spawn_y_pos;
        this.setIncexes(x_index, y_index);
        this.chipPicture = DNAssetsManager.g_instance.getCenteredImageWithProxy("block_" + id);
        this.addChild(this.chipPicture);
        this.colorID = id;
        this.setState(Chip.STATE_SPAWN_NEW);
        this.spawnDelay = spawn_delay;
        this.addChild(this.blinkPic);
        this.blinkPic.visible = false;
        this.blinkPic.scaleX = this.blinkPic.scaleY = 0.8;
    }
    Chip.prototype.isMonster = function() {
        return this.monster;
    };
    Chip.prototype.havePlus = function() {
        return this.plus;
    };
    Chip.prototype.addPlus = function() {
        this.plus = true;
        this.plusPic = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.PLUS);
        this.addChild(this.plusPic);
        this.plusPic.alpha = 0;
        createjs.Tween.get(this.plusPic).to({
            alpha: 1.0
        }, 350, createjs.Ease.linear);
        this.plusPic.scaleX = this.plusPic.scaleY = 0.5;
        createjs.Tween.get(this.plusPic).to({
            scaleX: 1,
            scaleY: 1
        }, 350, createjs.Ease.backOut);
        var frame = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.PLUS_FRAME);
        frame.y = 1;
        frame.x = 1;
        this.addChild(frame);
        frame.alpha = 0;
        createjs.Tween.get(frame).to({
            alpha: 1.0
        }, 350, createjs.Ease.linear);
    };
    Chip.prototype.moveRightPosition = function() {
        this.y = this.spawnYPos;
        this.setState(Chip.STATE_NORMAL);
    };
    Chip.prototype.blink = function(time) {
        this.blinkPic.visible = true;
        this.blinkPic.alpha = 0.5 + Math.sin(time * 6) * 0.5;
    };
    Chip.prototype.stopBlink = function() {
        this.blinkPic.visible = false;
        //this.chipPictureSelected.visible = false;
    };
    Chip.prototype.getBonusType = function() {
        return this.bonusType;
    };
    Chip.prototype.getColorID = function() {
        return this.colorID;
    };
    Chip.prototype.getIndeces = function() {
        return new createjs.Point(this.indexX, this.indexY);
    };
    Chip.prototype.getIndexX = function() {
        return this.indexX;
    };
    Chip.prototype.getIndexY = function() {
        return this.indexY;
    };
    Chip.prototype.setIncexes = function(x, y) {
        this.indexX = x;
        this.indexY = y;
    };
    Chip.prototype.setEffect = function(effect) {
        this.effect = effect;
    };
    Chip.prototype.sink = function() {
        this.sinkSpeed = Utils.RandomRange(50, 70) * 0.4;
        this.sinkRotationSpeed = Utils.RandomRange(-0.2, 0.2);
        this.setState(Chip.STATE_SINK);
        //  move front
        PlayState.g_instance.addChild(this);
    };
    Chip.prototype.update = function(dt) {
        this.stateTime += dt;
        if (this.diverAnim) {
            this.diverAnim.update(dt);
        }
        if (this.effect) {
            this.effect.y = this.y;
            if (this.effect.isDead()) {
                this.effect = null;
            }
        }
        if (this.bonusArrows) {
            this.bonusArrows.x = this.x;
            this.bonusArrows.y = this.y;
            this.bonusArrows.alpha = this.alpha;
        }
        switch (this.state) {
            case Chip.STATE_NORMAL:
                break;
            case Chip.STATE_SINK:
                {
                    this.sinkSpeed -= this.acceleration.y * dt / 30;
                    this.y += dt * this.sinkSpeed;
                    this.rotation += this.sinkRotationSpeed;
                    if (this.y > 740) {
                        this.y = 740;
                    }
                }
                break;
            case Chip.STATE_SPAWN_NEW:
                {
                    this.spawnDelay -= dt;
                    if (this.spawnDelay < 0) {
                        this.speed.y += this.acceleration.y * dt;
                        this.x += dt * this.speed.x;
                        this.y += dt * this.speed.y;
                        if (this.y <= this.spawnYPos) {
                            this.y = this.spawnYPos;
                            this.setState(Chip.STATE_NORMAL);
                            PlayState.g_instance.onShiftEnded();
                        }
                    }
                }
                break;
            case Chip.STATE_SHIFT_DOWN:
                {
                    if (this.stateTime < 0.15) {
                        break;
                    }
                    this.speed.y += this.acceleration.y * dt;
                    this.x += dt * this.speed.x;
                    this.y += dt * this.speed.y;
                    if (this.y <= this.spawnYPos) {
                        this.y = this.spawnYPos;
                        this.setState(Chip.STATE_NORMAL);
                        PlayState.g_instance.onShiftEnded();
                    }
                }
                break;
            case Chip.STATE_RESURFACE:
                {
                    this.speed.y += this.acceleration.y * dt;
                    this.y += dt * this.speed.y;
                    if (this.monster) {
                        //  130
                        if (this.y <= 130) {
                            this.y = 130;
                            PlayState.g_instance.addPointsAtPos(this.x, this.y + 50, 10);
                            PlayState.g_instance.clearCell(this);
                            PlayState.g_instance.checkWin();
                            PlayState.g_instance.playFreedomSound();
                            this.setState(Chip.STATE_JUMP_FROM_WATER);
                            //??
                            DNSoundManager.g_instance.playSinglePerFrame(Sounds.JUMP);
                            PlayState.g_instance.underChipsLayer.addChild(this);
                            var effect = new AutoreleaseEffect("water_splash_", 16, 0.045);
                            effect.scaleX = effect.scaleY = 1.6;
                            PlayState.g_instance.addGameObjectAtPos(effect, PlayState.g_instance, this.x + 5, this.y - 25);
                            this.boatPic = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.BOAT);
                            PlayState.g_instance.underChipsLayer.addChild(this.boatPic);
                            this.boatPic.x = this.x;
                            this.boatPic.y = this.landY;
                            this.boatPic.alpha = 0;
                            this.boatPic.scaleX = this.boatPic.scaleY = 0.3;
                            createjs.Tween.get(this.boatPic).wait(500).to({
                                scaleX: 1,
                                scaleY: 1
                            }, 450, createjs.Ease.backOut);
                            createjs.Tween.get(this.boatPic).wait(500).to({
                                alpha: 1
                            }, 450, createjs.Ease.linear);
                            PlayState.g_instance.shiftChips();
                            break;
                        }
                    }
                }
                break;
            case Chip.STATE_JUMP_FROM_WATER:
                {
                    this.speed.y -= this.acceleration.y * dt * 1.6;
                    this.y += dt * this.speed.y;
                    if (this.y >= this.landY && this.stateTime > 0.3) {
                        this.y = this.landY;
                        this.setState(Chip.STATE_MOVE_AWAY);
                    }
                }
                break;
            case Chip.STATE_FALL_DOWN:
                {
                    //this.speed.y += this.acceleration.y * dt;
                    this.speed.y -= this.acceleration.y * dt;
                    this.x += dt * this.speed.x;
                    this.y += dt * this.speed.y;
                    //  ???
                    if (this.monster) {
                        if (this.y >= 730) {
                            this.y = 725;
                            //PlayState.g_instance.addPointsAt(this, Chip.MATCH_LAND, 0);
                            PlayState.g_instance.addPointsAtPos(this.x, this.y, 10);
                            PlayState.g_instance.clearCell(this);
                            PlayState.g_instance.checkWin();
                            PlayState.g_instance.playFreedomSound();
                            this.kill();
                            break;
                        }
                    } else {
                        if (this.y >= 750) {
                            this.kill();
                        }
                    }
                }
                break;
            case Chip.STATE_MOVE_AWAY:
                {
                    this.x += this.moveAwaySpeed * dt;
                    this.boatPic.x = this.x;
                    this.boatPic.y = 105 + Math.sin(this.stateTime * 3) * 3;
                    this.y = this.landY + Math.sin(this.stateTime * 3) * 3;
                    if (this.x > Constants.ASSETS_WIDTH + 100) {
                        this.kill();
                    }
                }
                break;
            case Chip.STATE_MATCH:
                {
                    this.matchDelay -= dt;
                    if (this.matchDelay <= 0) {
                        if (!this.wasMatchEffect) {
                            if (this.matchReason == Chip.MATCH_REASON_BONUS_LINE) {
                                PlayState.g_instance.addBubblesAt(this.x, this.y);
                            }
                            if (this.colorID > 0) {
                                var count = Utils.RandomRangeInt(3, 6);
                                for (var i = 0; i < count; i++) {
                                    PlayState.g_instance.addGameObjectAtPos(new MatchParticle(this.colorID), PlayState.g_instance.particlesLayer, this.x + Utils.RandomRange(-Constants.CELL_SIZE / 2, Constants.CELL_SIZE / 2), this.y + Utils.RandomRange(-Constants.CELL_SIZE / 2, Constants.CELL_SIZE / 2));
                                }
                            }
                            this.wasMatchEffect = true;
                        }
                        this.alpha -= dt * 3;
                        if (this.alpha <= 0) {
                            this.kill();
                        }
                    }
                }
                break;
        }
    };
    Chip.prototype.setState = function(state) {
        if (state == this.state) {
            return;
        }
        this.stateTime = 0;
        this.state = state;
        switch (state) {
            case Chip.STATE_NORMAL:
                break;
            case Chip.STATE_SHIFT_DOWN:
                break;
            case Chip.STATE_SPAWN_NEW:
                {
                    this.speed = new createjs.Point(0, -300);
                    this.acceleration = new createjs.Point(0, Constants.GRAVITY_ACC);
                    this.alpha = 0;
                    createjs.Tween.get(this).to({
                        alpha: 1
                    }, 300, createjs.Ease.linear);
                }
                break;
            case Chip.STATE_JUMP_FROM_WATER:
                this.speed = new createjs.Point(0, -500);
                break;
        }
    };
    Chip.prototype.shiftDown = function(new_index_y, new_y) {
        this.speed = new createjs.Point(0, 0);
        this.deselect();
        this.indexY = new_index_y;
        this.spawnYPos = new_y;
        this.setState(Chip.STATE_SHIFT_DOWN);
        if (this.monster && new_index_y == 0) {
            this.resurface();
            PlayState.g_instance.clearCell(this); //  ??? hz need more testing
            //  ???
            PlayState.g_instance.frontChipsLayer.addChild(this);
        }
    };
    Chip.prototype.match = function(reason, delay) {
        if (this.isMonster()) {
            return;
        }
        if (this.plus) {
            this.plusPic.visible = false;
            PlayState.g_instance.querySpawnNewChips(4);
            PlayState.g_instance.addPlusEffectAt(this.x, this.y - 7);
            //PlayState.g_instance.addGameObjectAtPos(new PlusEffect(), PlayState.g_instance, this.x, this.y - 7);
            DNSoundManager.g_instance.play(Sounds.PLUS, 0.5);
        }
        this.matchDelay = delay || 0;
        if (reason == Chip.MATCH_REASON_BONUS) {
            if (this.isBonus()) {
                return;
            } else {
                this.kill();
            }
            PlayState.g_instance.addBubblesAt(this.x, this.y);
        } else if (reason == Chip.MATCH_REASON_BONUS_LINE) {
            if (this.isBonus()) {
                PlayState.g_instance.addBubblesAt(this.x, this.y);
                return;
            }
        } else if (reason == Chip.MATCH_REASON_SIMPLE) {
            if (this.isBonus()) {
                PlayState.g_instance.addBubblesAt(this.x, this.y);
                this.kill();
            }
        }
        this.stateTime = 0;
        this.matchReason = reason;
        this.setState(Chip.STATE_MATCH);
        PlayState.g_instance.clearCell(this);
    };
    Chip.prototype.select = function() {
        this.selected = true;
    };
    Chip.prototype.deselect = function() {
        if (this.selected) {
            this.selected = false;
            this.chipPicture.visible = true;
        }
    };
    Chip.prototype.isOutOfField = function() {
        if (this.state == Chip.STATE_MATCH) {
            return true;
        }
        if (this.isDead()) {
            return true;
        }
        return false;
    };
    Chip.prototype.isNormal = function() {
        return this.state == Chip.STATE_NORMAL;
    };
    Chip.prototype.getState = function() {
        return this.state;
    };
    Chip.prototype.isBonus = function() {
        return this.bonusType != null;;
    };
    Chip.prototype.convertToMonster = function() {
        this.removeAllChildren();
        this.colorID = -1;
        //this.diverAnim = new DNMovieClip("diver_1", Utils.RandomRange(0.045, 0.055), true); // 
        this.diverAnim = new DNMovieClip("diver_" + Utils.RandomRangeInt(1, 3), Utils.RandomRange(0.045, 0.055), true);
        this.diverAnim.goto(Utils.RandomRangeInt(0, this.diverAnim.totalFrames() - 1));
        //  
        this.addChild(this.diverAnim);
        this.monster = true;
    };
    Chip.prototype.convertToBonus = function(type) {
        this.removeAllChildren();
        this.bonusType = type;
        if (type == Chip.BONUS_BOMB) {
            var new_pic = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.BOMB);
            this.addChild(new_pic);
            new_pic.alpha = 0;
            createjs.Tween.get(new_pic).to({
                alpha: 1
            }, 400, createjs.Ease.linear);
        }
        if (type == Chip.BONUS_VERT) {
            var new_pic = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.VERT_BONUS);
            this.addChild(new_pic);
            new_pic.alpha = 0;
            createjs.Tween.get(new_pic).to({
                alpha: 1
            }, 400, createjs.Ease.linear);
            this.bonusArrows = new BonusArrows();
            this.bonusArrows.rotation = 90;
            this.bonusArrows.x = this.x;
            this.bonusArrows.y = this.y;
            this.bonusArrows.alpha = 0;
            createjs.Tween.get(this.bonusArrows).to({
                alpha: 1
            }, 400, createjs.Ease.linear);
            PlayState.g_instance.addGameObjectAt(this.bonusArrows, PlayState.g_instance.veryFrontChipsLayer);
        }
        if (type == Chip.BONUS_LINE) {
            var new_pic = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.LINE);
            this.addChild(new_pic);
            new_pic.alpha = 0;
            createjs.Tween.get(new_pic).to({
                alpha: 1
            }, 400, createjs.Ease.linear);
            this.bonusArrows = new BonusArrows();
            this.bonusArrows.x = this.x;
            this.bonusArrows.y = this.y;
            this.bonusArrows.alpha = 0;
            createjs.Tween.get(this.bonusArrows).to({
                alpha: 1
            }, 400, createjs.Ease.linear);
            PlayState.g_instance.addGameObjectAt(this.bonusArrows, PlayState.g_instance.veryFrontChipsLayer);
        }
        if (this.state != Chip.STATE_SPAWN_NEW) {
            PlayState.g_instance.addConverToBonusEffect(this);
        }
        this.colorID = -1;
        if (this.plus) {
            PlayState.g_instance.querySpawnNewChips(3);
        }
        //  move front  ???
        PlayState.g_instance.frontChipsLayer.addChild(this);
    };
    Chip.prototype.resurface = function() {
        this.setState(Chip.STATE_RESURFACE);
        this.speed = new createjs.Point(0, 0);
    };
    Chip.prototype.fallDown = function() {
        this.setState(Chip.STATE_FALL_DOWN);
        this.speed = new createjs.Point(0, 0);
        if (!this.isBonus()) {
            this.select();
        }
    };
    Chip.prototype.onDead = function() {
        _super.prototype.onDead.call(this);
        if (this.bonusArrows) {
            this.bonusArrows.kill();
        }
    };
    Chip.BONUS_BOMB = "BONUS_BOMB";
    Chip.BONUS_LINE = "BONUS_LINE";
    Chip.BONUS_VERT = "BONUS_VERTICAL";
    Chip.STATE_NORMAL = "STATE_NORMAL";
    Chip.STATE_SPAWN_NEW = "STATE_SPAWN_NEW";
    Chip.STATE_SHIFT_DOWN = "STATE_SHIFT_DOWN";
    Chip.STATE_MATCH = "STATE_MATCH";
    Chip.STATE_FALL_DOWN = "STATE_FALL_DOWN";
    Chip.STATE_MOVE_AWAY = "MOVE_AWAY";
    Chip.STATE_RESURFACE = "STATE_RESURFACE";
    Chip.STATE_JUMP_FROM_WATER = "STATE_JUMP_FROM_WATER";
    Chip.STATE_SINK = "STATE_SINK";
    Chip.MATCH_I_AM_BONUS = "MATCH_I_AM_BONUS";
    Chip.MATCH_REASON_SIMPLE = "MATCH_REASON_SIMPLE";
    Chip.MATCH_REASON_BONUS = "MATCH_REASON_BONUS";
    Chip.MATCH_REASON_BONUS_LINE = "MATCH_REASON_BONUS_LINE";
    Chip.MATCH_LAND = "MATCH_LAND";
    return Chip;
})(DNGameObject);
/// <reference path="references.ts" />
var Constants = (function() {
    function Constants() {}
    Constants.HINT_DELAY = 5.0;
    Constants.LOAD_COMPLETE = "LOAD_COMPLETE";
    //  Messages... Why lib does not contain them???
    Constants.MOUSE_DOWN = "stagemousedown";
    Constants.MOUSE_UP = "stagemouseup";
    Constants.MOUSE_MOVE = "stagemousemove"; //   hz
    Constants.CELL_SIZE = 68;
    Constants.FIELD_OFFSET_X = 10;
    Constants.FIELD_OFFSET_Y = 115;
    //  gameplay const
    Constants.MATCH_TIME = 0.25;
    Constants.GRAVITY_ACC = -700; // pixels per second
    Constants.ASSETS_WIDTH = 700;
    Constants.ASSETS_HEIGHT = 800;
    Constants.PIXEL_RATIO = 1;
    Constants.SCREEN_HEIGHT = 800;
    Constants.SCREEN_SCALE = 1;
    Constants.DPI = -1;
    Constants.g_isPC = false;
    Constants.DEBUG_MODE = false;
    Constants.DRAW_GABARITES = false;
    Constants.FONT_SCORE = {
        name: "score_font/",
        letterDist: -6
    };
    Constants.FONT_GUI = {
        name: "gui_font/",
        letterDist: -7
    };
    Constants.TRANSITION_TIME = 400;
    Constants.TRANSITION_PAUSE = 300;
    Constants.UNIVERSAL_COLOR_ID = 10;
    return Constants;
})();
/// <reference path="references.ts" />
var ConvertToBonusEffect = (function(_super) {
    __extends(ConvertToBonusEffect, _super);

    function ConvertToBonusEffect(chip) {
        _super.call(this);
        this.chip = chip;
        //this.addChild(AssetsManager.g_instance.getCenteredImage(Images.SHINING));
        this.scaleX = this.scaleY = 2.5;
    }
    ConvertToBonusEffect.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.rotation += dt * Math.PI * 35;
        if (this.scaleX > 1) {
            this.scaleX -= dt * 3;
            this.scaleY -= dt * 3;
        }
        this.x = this.chip.x;
        this.y = this.chip.y - Constants.CELL_SIZE / 2;
        if (this.chip.isDead()) {
            this.alpha -= dt * 3;
            if (this.alpha <= 0) {
                this.kill();
            }
        }
    };
    return ConvertToBonusEffect;
})(DNGameObject);
/// <reference path="references.ts" />
var MainMenuState = (function(_super) {
    __extends(MainMenuState, _super);

    function MainMenuState() {
        var _this = this;
        _super.call(this);
        this.someThing = true;
        this.soundButtonPlace = new createjs.Container();
        this.bubbleLayer = new createjs.Container();
        this.addChild(DNAssetsManager.g_instance.getImage("background_2"));
        this.addGameObjectAtPos(new SeeWaves(2), this, 0, 22);
        this.addChild(this.bubbleLayer);
        this.addGameObjectAtPos(new BubbleSpawner(this, this.bubbleLayer, 0.8), this, 60, 730);
        this.addGameObjectAtPos(new BubbleSpawner(this, this.bubbleLayer, 0.8), this, 630, 710);
        this.addGameObjectAt(new Fish(), this);
        this.addGameObjectAt(new Fish(), this);
        this.title = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.TITLE);
        this.addChild(this.title);
        this.title.x = Constants.ASSETS_WIDTH / 2;
        this.title.y = 450;
        this.title.alpha = 0;
        this.title.scaleX = this.title.scaleY = 0.7;
        this.addGameObjectAt(new Fish(), this);
        this.addGameObjectAt(new Fish(), this);
        this.buttonPlay = new DNFancyButton(Images.BUTTON_PLAY_BIG, function() {
            return _this.onPlayTouch();
        });
        this.addChild(this.buttonPlay);
        this.addGuiObject(this.buttonPlay);
        this.buttonPlay.x = Constants.ASSETS_WIDTH / 2;
        this.buttonPlay.y = 570;
        createjs.Tween.get(this.buttonPlay).to({
            scaleX: 0.94,
            scaleY: 0.94
        }, 150, createjs.Ease.linear).to({
            scaleX: 1.06,
            scaleY: 1.06
        }, 300, createjs.Ease.linear).to({
            scaleX: 1,
            scaleY: 1
        }, 150, createjs.Ease.linear).wait(4000);
        this.buttonCredits = new DNFancyButton(Images.BUTTON_CREDITS, function() {
            return _this.onCreditsTouch();
        });
        this.addChild(this.buttonCredits);
        this.addGuiObject(this.buttonCredits);
        this.buttonCredits.x = 540;
        this.buttonCredits.y = 570 + 65;
        this.buttonMoreGames = new DNFancyButton(Images.BUTTON_MORE_GAMES, function() {
            return _this.onMoreGamesTouch();
        });
        this.addChild(this.buttonMoreGames);
        this.addGuiObject(this.buttonMoreGames);
        this.buttonMoreGames.x = 160;
        this.buttonMoreGames.y = 570;
        this.buttonMoreGames.visible = DNGameConfig.haveMoreGames;
        this.addChild(this.soundButtonPlace);
        this.soundButtonPlace.x = 540;
        this.soundButtonPlace.y = 570 - 65;
        this.buttonMoreGames.alpha = 0;
        this.buttonPlay.alpha = 0;
        this.buttonCredits.alpha = 0;
        this.soundButtonPlace.alpha = 0;
        this.setSoundButton();
        var logo = new DNLogoPlaceholder(450, 100);
        //var logo: DNLogoPlaceholder = new DNLogoPlaceholder(70, 30);
        this.addGuiObject(logo);
        logo.x = Constants.ASSETS_WIDTH / 2;
        logo.y = 80;
        this.addChild(logo);
        this.update(0);
    }
    MainMenuState.prototype.init = function() {
        _super.prototype.init.call(this);
        createjs.Tween.get(this.title).to({
            alpha: 1,
            scaleX: 1,
            scaleY: 1
        }, 600, createjs.Ease.backOut).wait(300).to({
            y: 280
        }, 700, createjs.Ease.sineIn);
        this.showButton(this.buttonMoreGames, 1300);
        this.showButton(this.buttonPlay, 1400);
        this.showButton(this.buttonCredits, 1600);
        this.showButton(this.soundButtonPlace, 1500);
    };
    MainMenuState.prototype.showButton = function(button, delay) {
        button.scaleX = button.scaleY = 0.2;
        button.alpha = 0;
        createjs.Tween.get(button).wait(delay).to({
            scaleX: 1,
            scaleY: 1,
            alpha: 1
        }, 350, createjs.Ease.backOut);
        createjs.Tween.get(button).wait(delay).to({
            rotation: 360
        }, 400, createjs.Ease.circOut);
    };
    MainMenuState.prototype.onSoundTouch = function() {
        DNSoundManager.g_instance.setSoundEnabled(!DNSoundManager.g_instance.isSoundEnabled());
        this.setSoundButton();
    };
    MainMenuState.prototype.setSoundButton = function() {
		//gradle.event('setSoundButton');
        var _this = this;
        this.soundButtonPlace.removeAllChildren();
        this.soundButton = new DNFancyButton(DNSoundManager.g_instance.isSoundEnabled() ? Images.BUTTON_SOUND_ON : Images.BUTTON_SOUND_OFF, function() {
            return _this.onSoundTouch();
        });
        this.soundButtonPlace.addChild(this.soundButton);
        this.addGuiObject(this.soundButton);
    };
    MainMenuState.prototype.onCreditsTouch = function() {
		gradle.event('onCreditsTouch');
        DNStateManager.g_instance.pushState(new CreditsState());
    };
    MainMenuState.prototype.onMoreGamesTouch = function() {
		gradle.event('onCreditsTouch');
        DNGameConfig.goMoreGames();
    };
    MainMenuState.prototype.onPlayTouch = function() {
		gradle.event('btn_play');
        DNStateManager.g_instance.pushState(new TransitionInState(new SelectLevelState()));
    };
    return MainMenuState;
})(DNGameState);
/// <reference path="MainMenuState.ts" />
var CreditsState = (function(_super) {
    __extends(CreditsState, _super);

    function CreditsState() {
        _super.call(this);
        this.hiddingNow = false;
        //  shading
        this.shader = new createjs.Shape();
        this.shader.graphics.beginFill("#ffffff");
        this.shader.graphics.drawRect(0, 0, Constants.ASSETS_WIDTH, Constants.SCREEN_HEIGHT);
        this.shader.graphics.endFill();
        this.addChild(this.shader);
        this.shader.alpha = 0;
        this.shader.y = -this.y;
        createjs.Tween.get(this.shader).to({
            alpha: 1.0
        }, 500, createjs.Ease.linear);
        this.container = new createjs.Container();
        this.addChild(this.container);
        this.container.alpha = 0;
        createjs.Tween.get(this.container).to({
            alpha: 1.0
        }, 500, createjs.Ease.linear);
        var texts = gradle.strings;
        var big = [
            0,
            0,
            1,
            0,
            0,
            1,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            1,
            1
        ];
        for (var i = 0; i < texts.length; i++) {
            var line = new DNBitmapLabel(Fonts.fontGUI, texts[i]);
            this.container.addChild(line);
            line.x = Constants.ASSETS_WIDTH / 2;
            line.y = i * 40 + (Constants.SCREEN_HEIGHT - Constants.ASSETS_HEIGHT) / 2;
            if (big[i] != 0) {
                line.scaleX = line.scaleY = 0.80;
            }
        }
        var pic = DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.HYPNOCAT);
        this.container.addChild(pic);
        pic.x = Constants.ASSETS_WIDTH / 2;
        pic.y = Constants.ASSETS_HEIGHT - 100 + (Constants.SCREEN_HEIGHT - Constants.ASSETS_HEIGHT) / 2;
    }
    CreditsState.prototype.onMouseDown = function(x, y) {
        this.hide();
    };
    CreditsState.prototype.hide = function() {
        if (!this.hiddingNow) {
            createjs.Tween.removeTweens(this.shader);
            createjs.Tween.get(this.shader).to({
                alpha: 0.0
            }, 400, createjs.Ease.linear).call(function() {
                return DNStateManager.g_instance.popState();
            });
            createjs.Tween.get(this.container).to({
                alpha: 0.0
            }, 400, createjs.Ease.linear);
            this.hiddingNow = true;
        }
    };
    CreditsState.prototype.alignByCenter = function() {
        //  do nothing
    };
    return CreditsState;
})(DNGameState);
/// <reference path="references.ts" />
var DNAssetsManager = (function() {
    function DNAssetsManager(manifest, sound_manifest, athlases, localizable_images, progress_callback) {
        this.imageNameToSpriteSheetName = new Object();
        this.athlasNameToPicturesCount = new Object();
        DNAssetsManager.g_instance = this;
        this.athlases = athlases;
        this.localizableImages = localizable_images;
        this.manifest = manifest;
        this.soundManifest = sound_manifest;
        this.progressCallBack = progress_callback;
        this.startDownLoad();
    }
    DNAssetsManager.prototype.startDownLoad = function() {
        var _this = this;
        this.loader = new createjs.LoadQueue(false);
        this.loader.addEventListener("progress", function(e) {
            return _this.progressCallBack(e);
        });
        this.loader.addEventListener("complete", function(e) {
            return _this.handleComplete(e);
        });
        createjs.Sound.registerManifest(this.soundManifest, "sound/");
        this.loader.installPlugin(createjs.SoundJS);
        this.loader.loadManifest(this.manifest);
    };
    DNAssetsManager.prototype.handleComplete = function(event) {
        for (var i = 0; i < this.athlases.length; i++) {
            var obj = this.athlases[i];
            this.athlasNameToPicturesCount[obj["images"][0]] = obj["frames"].length;
            obj["images"] = [this.getBitmap(obj["images"][0]).image];
            var sprite_sheet = new createjs.SpriteSheet(obj);
            var animation_names = sprite_sheet.getAnimations();
            for (var nm = 0; nm < animation_names.length; nm++) {
                this.imageNameToSpriteSheetName[animation_names[nm]] = sprite_sheet;
            }
        }
        DNStateManager.g_instance.allAssetsLoaded();
    };
    DNAssetsManager.prototype.getAthlasFramesCount = function(name) {
        return this.athlasNameToPicturesCount[name];
    };
    DNAssetsManager.prototype.getResult = function(name) {
        return this.loader.getResult(name);
    };
    DNAssetsManager.prototype.getBitmap = function(name) {
        var bitmap = new createjs.Bitmap(this.loader.getResult(name));
        if (!bitmap.getBounds()) {}
        return bitmap;
    };
    DNAssetsManager.prototype.getCenteredBitmap = function(name) {
        var bitmap = new createjs.Bitmap(this.loader.getResult(name));
        if (!bitmap.image) {}
        bitmap.x = -bitmap.image.width / 2;
        bitmap.y = -bitmap.image.height / 2;
        return bitmap;
    };
    DNAssetsManager.prototype.getImage = function(name) {
        if (this.localizableImages.indexOf(name) != -1) {
            name = DNStringManager.getInstance().getLanguagePrefix() + name;
        }
        if (this.imageNameToSpriteSheetName[name]) {
            return this.getSprite(name);
        }
        return this.getBitmap(name);
    };
    DNAssetsManager.prototype.getCenteredImage = function(name) {
        var image = this.getImage(name);
        image.x = -image.getBounds().width / 2;
        image.y = -image.getBounds().height / 2;
        return image;
    };
    DNAssetsManager.prototype.getCenteredImageWithProxy = function(name) {
        var proxy = new createjs.Container();
        proxy.addChild(this.getCenteredImage(name));
        return proxy;
    };
    DNAssetsManager.prototype.getCenteredBitmapWithProxy = function(name) {
        var proxy = new createjs.Container();
        proxy.addChild(this.getCenteredBitmap(name));
        return proxy;
    };
    DNAssetsManager.prototype.getSprite = function(name) {
        var sprite = new createjs.Sprite(this.imageNameToSpriteSheetName[name], name);
        sprite.stop();
        return sprite;
    };
    DNAssetsManager.prototype.getCenteredSprite = function(name) {
        var sprite = this.getSprite(name);
        sprite.x = -sprite.getBounds().width / 2;
        sprite.y = -sprite.getBounds().height / 2;
        return sprite;
    };
    return DNAssetsManager;
})();
/// <reference path="references.ts" />
var DNCharDesc = (function() {
    function DNCharDesc() {}
    return DNCharDesc;
})();;
var DNBitmapFont = (function() {
    function DNBitmapFont() {}
    return DNBitmapFont;
})();
var Fonts = (function() {
    function Fonts() {}
    Fonts.fontGreen = {
        name: "font_green_",
        height: 36,
        charSet: {
            " ": {
                offset_x: -3,
                offset_y: 26,
                width: 8
            },
            "!": {
                offset_x: -2,
                offset_y: -2,
                width: 11
            },
            "\"": {
                offset_x: -3,
                offset_y: -5,
                width: 19
            },
            "#": {
                offset_x: -3,
                offset_y: 1,
                width: 24
            },
            "$": {
                offset_x: -2,
                offset_y: -5,
                width: 18
            },
            "%": {
                offset_x: -2,
                offset_y: 0,
                width: 29
            },
            "&": {
                offset_x: -4,
                offset_y: -1,
                width: 25
            },
            "\'": {
                offset_x: -3,
                offset_y: -5,
                width: 9
            },
            "(": {
                offset_x: -2,
                offset_y: -5,
                width: 16
            },
            ")": {
                offset_x: -5,
                offset_y: -5,
                width: 15
            },
            "*": {
                offset_x: -3,
                offset_y: -2,
                width: 21
            },
            "+": {
                offset_x: -2,
                offset_y: 5,
                width: 18
            },
            ",": {
                offset_x: -2,
                offset_y: 17,
                width: 10
            },
            "-": {
                offset_x: -2,
                offset_y: 9,
                width: 15
            },
            ".": {
                offset_x: -2,
                offset_y: 17,
                width: 10
            },
            "/": {
                offset_x: -3,
                offset_y: -4,
                width: 20
            },
            "0": {
                offset_x: -2,
                offset_y: -2,
                width: 26
            },
            "1": {
                offset_x: -4,
                offset_y: -2,
                width: 15
            },
            "2": {
                offset_x: -2,
                offset_y: -3,
                width: 21
            },
            "3": {
                offset_x: -3,
                offset_y: -4,
                width: 21
            },
            "4": {
                offset_x: -4,
                offset_y: -3,
                width: 21
            },
            "5": {
                offset_x: -3,
                offset_y: -2,
                width: 21
            },
            "6": {
                offset_x: -3,
                offset_y: -3,
                width: 23
            },
            "7": {
                offset_x: -2,
                offset_y: -2,
                width: 21
            },
            "8": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "9": {
                offset_x: -2,
                offset_y: -3,
                width: 23
            },
            ":": {
                offset_x: -2,
                offset_y: 5,
                width: 10
            },
            ";": {
                offset_x: -2,
                offset_y: 5,
                width: 10
            },
            "<": {
                offset_x: -2,
                offset_y: 0,
                width: 18
            },
            "=": {
                offset_x: -2,
                offset_y: 7,
                width: 16
            },
            ">": {
                offset_x: -3,
                offset_y: 0,
                width: 18
            },
            "?": {
                offset_x: -3,
                offset_y: -3,
                width: 22
            },
            "@": {
                offset_x: -2,
                offset_y: 1,
                width: 26
            },
            "A": {
                offset_x: -4,
                offset_y: -2,
                width: 25
            },
            "B": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "C": {
                offset_x: -2,
                offset_y: -3,
                width: 21
            },
            "D": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "E": {
                offset_x: -2,
                offset_y: -2,
                width: 19
            },
            "F": {
                offset_x: -2,
                offset_y: -2,
                width: 20
            },
            "G": {
                offset_x: -2,
                offset_y: -4,
                width: 26
            },
            "H": {
                offset_x: -2,
                offset_y: -2,
                width: 25
            },
            "I": {
                offset_x: -2,
                offset_y: -2,
                width: 12
            },
            "J": {
                offset_x: -4,
                offset_y: -2,
                width: 20
            },
            "K": {
                offset_x: -2,
                offset_y: -3,
                width: 25
            },
            "L": {
                offset_x: -2,
                offset_y: -2,
                width: 17
            },
            "M": {
                offset_x: -2,
                offset_y: -2,
                width: 31
            },
            "N": {
                offset_x: -2,
                offset_y: -2,
                width: 28
            },
            "O": {
                offset_x: -2,
                offset_y: 0,
                width: 26
            },
            "P": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "Q": {
                offset_x: -2,
                offset_y: -2,
                width: 29
            },
            "R": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "S": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "T": {
                offset_x: -2,
                offset_y: -2,
                width: 23
            },
            "U": {
                offset_x: -2,
                offset_y: -1,
                width: 26
            },
            "V": {
                offset_x: -4,
                offset_y: -3,
                width: 25
            },
            "W": {
                offset_x: -3,
                offset_y: -2,
                width: 36
            },
            "X": {
                offset_x: -4,
                offset_y: -3,
                width: 24
            },
            "Y": {
                offset_x: -3,
                offset_y: -1,
                width: 24
            },
            "Z": {
                offset_x: -3,
                offset_y: -2,
                width: 19
            },
            "[": {
                offset_x: -1,
                offset_y: -4,
                width: 15
            },
            "\\": {
                offset_x: -3,
                offset_y: -4,
                width: 20
            },
            "]": {
                offset_x: -3,
                offset_y: -4,
                width: 15
            },
            "^": {
                offset_x: -3,
                offset_y: -2,
                width: 19
            },
            "_": {
                offset_x: -3,
                offset_y: 28,
                width: 13
            },
            "`": {
                offset_x: -3,
                offset_y: -11,
                width: 11
            },
            "a": {
                offset_x: -4,
                offset_y: -2,
                width: 25
            },
            "b": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "c": {
                offset_x: -2,
                offset_y: -2,
                width: 21
            },
            "d": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "e": {
                offset_x: -3,
                offset_y: -3,
                width: 24
            },
            "f": {
                offset_x: -2,
                offset_y: -2,
                width: 20
            },
            "g": {
                offset_x: -2,
                offset_y: -3,
                width: 26
            },
            "h": {
                offset_x: -2,
                offset_y: -2,
                width: 25
            },
            "i": {
                offset_x: -2,
                offset_y: -2,
                width: 11
            },
            "j": {
                offset_x: -4,
                offset_y: -2,
                width: 20
            },
            "k": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "l": {
                offset_x: -2,
                offset_y: -2,
                width: 18
            },
            "m": {
                offset_x: -3,
                offset_y: -3,
                width: 36
            },
            "n": {
                offset_x: -2,
                offset_y: -3,
                width: 26
            },
            "o": {
                offset_x: -2,
                offset_y: -2,
                width: 26
            },
            "p": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "q": {
                offset_x: -2,
                offset_y: -2,
                width: 29
            },
            "r": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "s": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "t": {
                offset_x: -2,
                offset_y: -2,
                width: 23
            },
            "u": {
                offset_x: -2,
                offset_y: -2,
                width: 25
            },
            "v": {
                offset_x: -4,
                offset_y: -2,
                width: 25
            },
            "w": {
                offset_x: -3,
                offset_y: -1,
                width: 36
            },
            "x": {
                offset_x: -4,
                offset_y: -2,
                width: 24
            },
            "y": {
                offset_x: -5,
                offset_y: -1,
                width: 24
            },
            "z": {
                offset_x: -3,
                offset_y: -2,
                width: 20
            },
            "{": {
                offset_x: -3,
                offset_y: -5,
                width: 17
            },
            "|": {
                offset_x: -2,
                offset_y: -4,
                width: 11
            },
            "}": {
                offset_x: -5,
                offset_y: -5,
                width: 16
            },
            "~": {
                offset_x: -2,
                offset_y: 4,
                width: 24
            },
            "¡": {
                offset_x: -3,
                offset_y: 3,
                width: 12
            },
            "¨": {
                offset_x: -3,
                offset_y: -8,
                width: 14
            },
            "·": {
                offset_x: -2,
                offset_y: 8,
                width: 10
            },
            "¸": {
                offset_x: -3,
                offset_y: 25,
                width: 8
            },
            "¿": {
                offset_x: -2,
                offset_y: 4,
                width: 23
            },
            "À": {
                offset_x: -4,
                offset_y: -13,
                width: 25
            },
            "Á": {
                offset_x: -4,
                offset_y: -13,
                width: 25
            },
            "Â": {
                offset_x: -4,
                offset_y: -12,
                width: 25
            },
            "Ã": {
                offset_x: -4,
                offset_y: -12,
                width: 26
            },
            "Ä": {
                offset_x: -4,
                offset_y: -9,
                width: 26
            },
            "Å": {
                offset_x: -5,
                offset_y: -11,
                width: 25
            },
            "Æ": {
                offset_x: -5,
                offset_y: -2,
                width: 33
            },
            "Ç": {
                offset_x: -2,
                offset_y: -3,
                width: 21
            },
            "È": {
                offset_x: -2,
                offset_y: -13,
                width: 19
            },
            "É": {
                offset_x: -2,
                offset_y: -13,
                width: 19
            },
            "Ê": {
                offset_x: -2,
                offset_y: -11,
                width: 19
            },
            "Ë": {
                offset_x: -2,
                offset_y: -9,
                width: 19
            },
            "Ì": {
                offset_x: -7,
                offset_y: -14,
                width: 12
            },
            "Í": {
                offset_x: -2,
                offset_y: -14,
                width: 12
            },
            "Î": {
                offset_x: -4,
                offset_y: -10,
                width: 12
            },
            "Ï": {
                offset_x: -3,
                offset_y: -7,
                width: 13
            },
            "Ð": {
                offset_x: -3,
                offset_y: -2,
                width: 26
            },
            "Ñ": {
                offset_x: -2,
                offset_y: -12,
                width: 28
            },
            "Ò": {
                offset_x: -2,
                offset_y: -11,
                width: 26
            },
            "Ó": {
                offset_x: -2,
                offset_y: -10,
                width: 26
            },
            "Ô": {
                offset_x: -2,
                offset_y: -9,
                width: 26
            },
            "Õ": {
                offset_x: -2,
                offset_y: -10,
                width: 26
            },
            "Ö": {
                offset_x: -2,
                offset_y: -6,
                width: 26
            },
            "Ù": {
                offset_x: -2,
                offset_y: -12,
                width: 26
            },
            "Ú": {
                offset_x: -2,
                offset_y: -11,
                width: 26
            },
            "Û": {
                offset_x: -2,
                offset_y: -10,
                width: 26
            },
            "Ü": {
                offset_x: -2,
                offset_y: -8,
                width: 26
            },
            "Ý": {
                offset_x: -3,
                offset_y: -11,
                width: 24
            },
            "Þ": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "ß": {
                offset_x: -2,
                offset_y: -2,
                width: 42
            },
            "à": {
                offset_x: -4,
                offset_y: -13,
                width: 25
            },
            "á": {
                offset_x: -4,
                offset_y: -13,
                width: 25
            },
            "â": {
                offset_x: -4,
                offset_y: -11,
                width: 25
            },
            "ã": {
                offset_x: -4,
                offset_y: -12,
                width: 26
            },
            "ä": {
                offset_x: -4,
                offset_y: -9,
                width: 26
            },
            "å": {
                offset_x: -5,
                offset_y: -11,
                width: 25
            },
            "æ": {
                offset_x: -4,
                offset_y: -3,
                width: 38
            },
            "ç": {
                offset_x: -2,
                offset_y: -2,
                width: 21
            },
            "è": {
                offset_x: -3,
                offset_y: -13,
                width: 24
            },
            "é": {
                offset_x: -3,
                offset_y: -14,
                width: 24
            },
            "ê": {
                offset_x: -3,
                offset_y: -12,
                width: 24
            },
            "ë": {
                offset_x: -3,
                offset_y: -9,
                width: 24
            },
            "ì": {
                offset_x: -8,
                offset_y: -13,
                width: 11
            },
            "í": {
                offset_x: -2,
                offset_y: -13,
                width: 11
            },
            "î": {
                offset_x: -5,
                offset_y: -10,
                width: 11
            },
            "ï": {
                offset_x: -4,
                offset_y: -8,
                width: 12
            },
            "ð": {
                offset_x: -3,
                offset_y: -2,
                width: 26
            },
            "ñ": {
                offset_x: -2,
                offset_y: -11,
                width: 26
            },
            "ò": {
                offset_x: -2,
                offset_y: -13,
                width: 26
            },
            "ó": {
                offset_x: -2,
                offset_y: -13,
                width: 26
            },
            "ô": {
                offset_x: -2,
                offset_y: -12,
                width: 26
            },
            "õ": {
                offset_x: -2,
                offset_y: -12,
                width: 26
            },
            "ö": {
                offset_x: -2,
                offset_y: -9,
                width: 26
            },
            "ù": {
                offset_x: -2,
                offset_y: -12,
                width: 25
            },
            "ú": {
                offset_x: -2,
                offset_y: -13,
                width: 25
            },
            "û": {
                offset_x: -2,
                offset_y: -10,
                width: 25
            },
            "ü": {
                offset_x: -2,
                offset_y: -7,
                width: 25
            },
            "ý": {
                offset_x: -5,
                offset_y: -10,
                width: 24
            },
            "þ": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "ÿ": {
                offset_x: -5,
                offset_y: -8,
                width: 24
            },
        }
    };
    Fonts.fontGUI = {
        name: "font_gui_",
        height: 36,
        charSet: {
            " ": {
                offset_x: -3,
                offset_y: 23,
                width: 7
            },
            "!": {
                offset_x: -2,
                offset_y: -3,
                width: 10
            },
            "\"": {
                offset_x: -3,
                offset_y: -5,
                width: 17
            },
            "#": {
                offset_x: -3,
                offset_y: 1,
                width: 22
            },
            "$": {
                offset_x: -2,
                offset_y: -4,
                width: 16
            },
            "%": {
                offset_x: -2,
                offset_y: 0,
                width: 27
            },
            "&": {
                offset_x: -3,
                offset_y: -1,
                width: 23
            },
            "\'": {
                offset_x: -3,
                offset_y: -5,
                width: 8
            },
            "(": {
                offset_x: -2,
                offset_y: -5,
                width: 15
            },
            ")": {
                offset_x: -4,
                offset_y: -5,
                width: 14
            },
            "*": {
                offset_x: -2,
                offset_y: -2,
                width: 20
            },
            "+": {
                offset_x: -2,
                offset_y: 3,
                width: 17
            },
            ",": {
                offset_x: -2,
                offset_y: 15,
                width: 9
            },
            "-": {
                offset_x: -2,
                offset_y: 8,
                width: 13
            },
            ".": {
                offset_x: -2,
                offset_y: 15,
                width: 9
            },
            "/": {
                offset_x: -3,
                offset_y: -4,
                width: 18
            },
            "0": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "1": {
                offset_x: -4,
                offset_y: -2,
                width: 14
            },
            "2": {
                offset_x: -2,
                offset_y: -3,
                width: 19
            },
            "3": {
                offset_x: -3,
                offset_y: -4,
                width: 19
            },
            "4": {
                offset_x: -4,
                offset_y: -3,
                width: 19
            },
            "5": {
                offset_x: -3,
                offset_y: -2,
                width: 19
            },
            "6": {
                offset_x: -2,
                offset_y: -4,
                width: 22
            },
            "7": {
                offset_x: -2,
                offset_y: -2,
                width: 19
            },
            "8": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "9": {
                offset_x: -2,
                offset_y: -3,
                width: 21
            },
            ":": {
                offset_x: -2,
                offset_y: 4,
                width: 9
            },
            ";": {
                offset_x: -2,
                offset_y: 4,
                width: 9
            },
            "<": {
                offset_x: -2,
                offset_y: 0,
                width: 16
            },
            "=": {
                offset_x: -2,
                offset_y: 5,
                width: 13
            },
            ">": {
                offset_x: -3,
                offset_y: 0,
                width: 16
            },
            "?": {
                offset_x: -3,
                offset_y: -3,
                width: 20
            },
            "@": {
                offset_x: -2,
                offset_y: 0,
                width: 24
            },
            "A": {
                offset_x: -4,
                offset_y: -2,
                width: 23
            },
            "B": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "C": {
                offset_x: -2,
                offset_y: -3,
                width: 20
            },
            "D": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "E": {
                offset_x: -2,
                offset_y: -2,
                width: 17
            },
            "F": {
                offset_x: -2,
                offset_y: -2,
                width: 18
            },
            "G": {
                offset_x: -2,
                offset_y: -4,
                width: 24
            },
            "H": {
                offset_x: -2,
                offset_y: -2,
                width: 23
            },
            "I": {
                offset_x: -2,
                offset_y: -2,
                width: 11
            },
            "J": {
                offset_x: -4,
                offset_y: -2,
                width: 18
            },
            "K": {
                offset_x: -2,
                offset_y: -3,
                width: 23
            },
            "L": {
                offset_x: -2,
                offset_y: -2,
                width: 16
            },
            "M": {
                offset_x: -2,
                offset_y: -2,
                width: 28
            },
            "N": {
                offset_x: -2,
                offset_y: -2,
                width: 25
            },
            "O": {
                offset_x: -2,
                offset_y: 0,
                width: 24
            },
            "P": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "Q": {
                offset_x: -2,
                offset_y: -2,
                width: 27
            },
            "R": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "S": {
                offset_x: -2,
                offset_y: -3,
                width: 20
            },
            "T": {
                offset_x: -2,
                offset_y: -2,
                width: 21
            },
            "U": {
                offset_x: -2,
                offset_y: -2,
                width: 23
            },
            "V": {
                offset_x: -4,
                offset_y: -3,
                width: 22
            },
            "W": {
                offset_x: -3,
                offset_y: -2,
                width: 33
            },
            "X": {
                offset_x: -4,
                offset_y: -3,
                width: 21
            },
            "Y": {
                offset_x: -3,
                offset_y: -1,
                width: 21
            },
            "Z": {
                offset_x: -3,
                offset_y: -2,
                width: 18
            },
            "[": {
                offset_x: -2,
                offset_y: -5,
                width: 13
            },
            "\\": {
                offset_x: -3,
                offset_y: -4,
                width: 18
            },
            "]": {
                offset_x: -2,
                offset_y: -5,
                width: 14
            },
            "^": {
                offset_x: -3,
                offset_y: -2,
                width: 17
            },
            "_": {
                offset_x: -3,
                offset_y: 24,
                width: 11
            },
            "`": {
                offset_x: -3,
                offset_y: -10,
                width: 10
            },
            "a": {
                offset_x: -4,
                offset_y: -2,
                width: 23
            },
            "b": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "c": {
                offset_x: -2,
                offset_y: -2,
                width: 19
            },
            "d": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "e": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "f": {
                offset_x: -2,
                offset_y: -2,
                width: 18
            },
            "g": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "h": {
                offset_x: -2,
                offset_y: -2,
                width: 23
            },
            "i": {
                offset_x: -2,
                offset_y: -2,
                width: 10
            },
            "j": {
                offset_x: -4,
                offset_y: -2,
                width: 18
            },
            "k": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "l": {
                offset_x: -2,
                offset_y: -2,
                width: 16
            },
            "m": {
                offset_x: -3,
                offset_y: -3,
                width: 33
            },
            "n": {
                offset_x: -2,
                offset_y: -3,
                width: 24
            },
            "o": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "p": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "q": {
                offset_x: -2,
                offset_y: -2,
                width: 27
            },
            "r": {
                offset_x: -2,
                offset_y: -3,
                width: 22
            },
            "s": {
                offset_x: -2,
                offset_y: -2,
                width: 20
            },
            "t": {
                offset_x: -3,
                offset_y: -2,
                width: 20
            },
            "u": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "v": {
                offset_x: -4,
                offset_y: -2,
                width: 22
            },
            "w": {
                offset_x: -3,
                offset_y: -2,
                width: 33
            },
            "x": {
                offset_x: -4,
                offset_y: -2,
                width: 21
            },
            "y": {
                offset_x: -4,
                offset_y: -1,
                width: 22
            },
            "z": {
                offset_x: -3,
                offset_y: -2,
                width: 19
            },
            "{": {
                offset_x: -3,
                offset_y: -4,
                width: 15
            },
            "|": {
                offset_x: -2,
                offset_y: -4,
                width: 10
            },
            "}": {
                offset_x: -5,
                offset_y: -5,
                width: 15
            },
            "~": {
                offset_x: -2,
                offset_y: 3,
                width: 22
            },
            "¡": {
                offset_x: -3,
                offset_y: 2,
                width: 11
            },
            "¨": {
                offset_x: -3,
                offset_y: -7,
                width: 12
            },
            "·": {
                offset_x: -2,
                offset_y: 7,
                width: 9
            },
            "¸": {
                offset_x: -3,
                offset_y: 22,
                width: 8
            },
            "¿": {
                offset_x: -2,
                offset_y: 3,
                width: 20
            },
            "À": {
                offset_x: -4,
                offset_y: -12,
                width: 23
            },
            "Á": {
                offset_x: -4,
                offset_y: -12,
                width: 23
            },
            "Â": {
                offset_x: -4,
                offset_y: -11,
                width: 23
            },
            "Ã": {
                offset_x: -4,
                offset_y: -12,
                width: 22
            },
            "Ä": {
                offset_x: -4,
                offset_y: -8,
                width: 22
            },
            "Å": {
                offset_x: -4,
                offset_y: -10,
                width: 23
            },
            "Æ": {
                offset_x: -4,
                offset_y: -2,
                width: 30
            },
            "Ç": {
                offset_x: -2,
                offset_y: -3,
                width: 19
            },
            "È": {
                offset_x: -2,
                offset_y: -12,
                width: 17
            },
            "É": {
                offset_x: -2,
                offset_y: -12,
                width: 17
            },
            "Ê": {
                offset_x: -2,
                offset_y: -10,
                width: 17
            },
            "Ë": {
                offset_x: -2,
                offset_y: -8,
                width: 17
            },
            "Ì": {
                offset_x: -7,
                offset_y: -13,
                width: 11
            },
            "Í": {
                offset_x: -2,
                offset_y: -13,
                width: 11
            },
            "Î": {
                offset_x: -4,
                offset_y: -9,
                width: 11
            },
            "Ï": {
                offset_x: -3,
                offset_y: -7,
                width: 11
            },
            "Ð": {
                offset_x: -3,
                offset_y: -2,
                width: 23
            },
            "Ñ": {
                offset_x: -2,
                offset_y: -11,
                width: 25
            },
            "Ò": {
                offset_x: -2,
                offset_y: -10,
                width: 24
            },
            "Ó": {
                offset_x: -2,
                offset_y: -9,
                width: 24
            },
            "Ô": {
                offset_x: -2,
                offset_y: -8,
                width: 24
            },
            "Õ": {
                offset_x: -2,
                offset_y: -9,
                width: 24
            },
            "Ö": {
                offset_x: -2,
                offset_y: -6,
                width: 24
            },
            "Ù": {
                offset_x: -2,
                offset_y: -12,
                width: 23
            },
            "Ú": {
                offset_x: -2,
                offset_y: -11,
                width: 23
            },
            "Û": {
                offset_x: -2,
                offset_y: -10,
                width: 23
            },
            "Ü": {
                offset_x: -2,
                offset_y: -8,
                width: 23
            },
            "Ý": {
                offset_x: -3,
                offset_y: -10,
                width: 21
            },
            "Þ": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "ß": {
                offset_x: -2,
                offset_y: -2,
                width: 38
            },
            "à": {
                offset_x: -4,
                offset_y: -12,
                width: 23
            },
            "á": {
                offset_x: -4,
                offset_y: -12,
                width: 23
            },
            "â": {
                offset_x: -4,
                offset_y: -10,
                width: 23
            },
            "ã": {
                offset_x: -4,
                offset_y: -11,
                width: 22
            },
            "ä": {
                offset_x: -4,
                offset_y: -8,
                width: 22
            },
            "å": {
                offset_x: -4,
                offset_y: -10,
                width: 23
            },
            "æ": {
                offset_x: -4,
                offset_y: -3,
                width: 34
            },
            "ç": {
                offset_x: -2,
                offset_y: -2,
                width: 19
            },
            "è": {
                offset_x: -2,
                offset_y: -12,
                width: 22
            },
            "é": {
                offset_x: -2,
                offset_y: -13,
                width: 22
            },
            "ê": {
                offset_x: -2,
                offset_y: -11,
                width: 22
            },
            "ë": {
                offset_x: -2,
                offset_y: -9,
                width: 22
            },
            "ì": {
                offset_x: -8,
                offset_y: -12,
                width: 10
            },
            "í": {
                offset_x: -2,
                offset_y: -12,
                width: 10
            },
            "î": {
                offset_x: -4,
                offset_y: -9,
                width: 10
            },
            "ï": {
                offset_x: -4,
                offset_y: -7,
                width: 10
            },
            "ð": {
                offset_x: -3,
                offset_y: -2,
                width: 23
            },
            "ñ": {
                offset_x: -2,
                offset_y: -11,
                width: 24
            },
            "ò": {
                offset_x: -2,
                offset_y: -12,
                width: 24
            },
            "ó": {
                offset_x: -2,
                offset_y: -12,
                width: 24
            },
            "ô": {
                offset_x: -2,
                offset_y: -11,
                width: 24
            },
            "õ": {
                offset_x: -2,
                offset_y: -12,
                width: 24
            },
            "ö": {
                offset_x: -2,
                offset_y: -9,
                width: 24
            },
            "ù": {
                offset_x: -2,
                offset_y: -11,
                width: 22
            },
            "ú": {
                offset_x: -2,
                offset_y: -11,
                width: 22
            },
            "û": {
                offset_x: -2,
                offset_y: -9,
                width: 22
            },
            "ü": {
                offset_x: -2,
                offset_y: -7,
                width: 23
            },
            "ý": {
                offset_x: -4,
                offset_y: -9,
                width: 22
            },
            "þ": {
                offset_x: -2,
                offset_y: -2,
                width: 22
            },
            "ÿ": {
                offset_x: -4,
                offset_y: -7,
                width: 22
            },
        }
    };
    Fonts.fontMessages = {
        name: "font_messages_",
        height: 50,
        charSet: {
            " ": {
                offset_x: -3,
                offset_y: 33,
                width: 10
            },
            "!": {
                offset_x: -2,
                offset_y: -3,
                width: 14
            },
            "\"": {
                offset_x: -3,
                offset_y: -6,
                width: 24
            },
            "#": {
                offset_x: -2,
                offset_y: 2,
                width: 30
            },
            "$": {
                offset_x: -2,
                offset_y: -5,
                width: 21
            },
            "%": {
                offset_x: -2,
                offset_y: 1,
                width: 36
            },
            "&": {
                offset_x: -3,
                offset_y: 0,
                width: 32
            },
            "\'": {
                offset_x: -3,
                offset_y: -6,
                width: 12
            },
            "(": {
                offset_x: -2,
                offset_y: -5,
                width: 20
            },
            ")": {
                offset_x: -5,
                offset_y: -5,
                width: 19
            },
            "*": {
                offset_x: -3,
                offset_y: -3,
                width: 27
            },
            "+": {
                offset_x: -2,
                offset_y: 6,
                width: 22
            },
            ",": {
                offset_x: -2,
                offset_y: 22,
                width: 12
            },
            "-": {
                offset_x: -1,
                offset_y: 12,
                width: 20
            },
            ".": {
                offset_x: -2,
                offset_y: 23,
                width: 12
            },
            "/": {
                offset_x: -2,
                offset_y: -4,
                width: 25
            },
            "0": {
                offset_x: -2,
                offset_y: -2,
                width: 32
            },
            "1": {
                offset_x: -4,
                offset_y: -2,
                width: 19
            },
            "2": {
                offset_x: -2,
                offset_y: -4,
                width: 26
            },
            "3": {
                offset_x: -3,
                offset_y: -4,
                width: 27
            },
            "4": {
                offset_x: -3,
                offset_y: -3,
                width: 27
            },
            "5": {
                offset_x: -3,
                offset_y: -2,
                width: 27
            },
            "6": {
                offset_x: -2,
                offset_y: -4,
                width: 29
            },
            "7": {
                offset_x: -2,
                offset_y: -2,
                width: 26
            },
            "8": {
                offset_x: -2,
                offset_y: -3,
                width: 30
            },
            "9": {
                offset_x: -2,
                offset_y: -2,
                width: 28
            },
            ":": {
                offset_x: -2,
                offset_y: 7,
                width: 13
            },
            ";": {
                offset_x: -2,
                offset_y: 7,
                width: 13
            },
            "<": {
                offset_x: -2,
                offset_y: 1,
                width: 23
            },
            "=": {
                offset_x: -1,
                offset_y: 8,
                width: 20
            },
            ">": {
                offset_x: -3,
                offset_y: 1,
                width: 23
            },
            "?": {
                offset_x: -2,
                offset_y: -2,
                width: 28
            },
            "@": {
                offset_x: -1,
                offset_y: 1,
                width: 33
            },
            "A": {
                offset_x: -4,
                offset_y: -1,
                width: 31
            },
            "B": {
                offset_x: -2,
                offset_y: -2,
                width: 30
            },
            "C": {
                offset_x: -2,
                offset_y: -2,
                width: 27
            },
            "D": {
                offset_x: -2,
                offset_y: -1,
                width: 29
            },
            "E": {
                offset_x: -2,
                offset_y: -2,
                width: 23
            },
            "F": {
                offset_x: -2,
                offset_y: -2,
                width: 24
            },
            "G": {
                offset_x: -2,
                offset_y: -4,
                width: 32
            },
            "H": {
                offset_x: -2,
                offset_y: -2,
                width: 31
            },
            "I": {
                offset_x: -2,
                offset_y: -1,
                width: 15
            },
            "J": {
                offset_x: -4,
                offset_y: -2,
                width: 26
            },
            "K": {
                offset_x: -2,
                offset_y: -4,
                width: 30
            },
            "L": {
                offset_x: -1,
                offset_y: -2,
                width: 23
            },
            "M": {
                offset_x: -2,
                offset_y: -2,
                width: 39
            },
            "N": {
                offset_x: -2,
                offset_y: -2,
                width: 35
            },
            "O": {
                offset_x: -2,
                offset_y: 0,
                width: 33
            },
            "P": {
                offset_x: -2,
                offset_y: -2,
                width: 30
            },
            "Q": {
                offset_x: -2,
                offset_y: -1,
                width: 36
            },
            "R": {
                offset_x: -2,
                offset_y: -2,
                width: 30
            },
            "S": {
                offset_x: -2,
                offset_y: -3,
                width: 28
            },
            "T": {
                offset_x: -2,
                offset_y: -2,
                width: 29
            },
            "U": {
                offset_x: -2,
                offset_y: -1,
                width: 32
            },
            "V": {
                offset_x: -4,
                offset_y: -2,
                width: 31
            },
            "W": {
                offset_x: -3,
                offset_y: -2,
                width: 45
            },
            "X": {
                offset_x: -5,
                offset_y: -3,
                width: 29
            },
            "Y": {
                offset_x: -3,
                offset_y: -1,
                width: 30
            },
            "Z": {
                offset_x: -4,
                offset_y: -2,
                width: 24
            },
            "[": {
                offset_x: -1,
                offset_y: -6,
                width: 18
            },
            "\\": {
                offset_x: -2,
                offset_y: -4,
                width: 25
            },
            "]": {
                offset_x: -2,
                offset_y: -6,
                width: 19
            },
            "^": {
                offset_x: -3,
                offset_y: -2,
                width: 24
            },
            "_": {
                offset_x: -3,
                offset_y: 35,
                width: 16
            },
            "`": {
                offset_x: -3,
                offset_y: -13,
                width: 14
            },
            "a": {
                offset_x: -4,
                offset_y: -1,
                width: 31
            },
            "b": {
                offset_x: -2,
                offset_y: -2,
                width: 30
            },
            "c": {
                offset_x: -2,
                offset_y: -1,
                width: 26
            },
            "d": {
                offset_x: -2,
                offset_y: -1,
                width: 29
            },
            "e": {
                offset_x: -3,
                offset_y: -2,
                width: 30
            },
            "f": {
                offset_x: -2,
                offset_y: -1,
                width: 24
            },
            "g": {
                offset_x: -2,
                offset_y: -2,
                width: 32
            },
            "h": {
                offset_x: -2,
                offset_y: -1,
                width: 31
            },
            "i": {
                offset_x: -2,
                offset_y: -1,
                width: 15
            },
            "j": {
                offset_x: -4,
                offset_y: -2,
                width: 26
            },
            "k": {
                offset_x: -2,
                offset_y: -1,
                width: 30
            },
            "l": {
                offset_x: -2,
                offset_y: -2,
                width: 23
            },
            "m": {
                offset_x: -3,
                offset_y: -2,
                width: 44
            },
            "n": {
                offset_x: -1,
                offset_y: -2,
                width: 33
            },
            "o": {
                offset_x: -2,
                offset_y: -1,
                width: 33
            },
            "p": {
                offset_x: -2,
                offset_y: -1,
                width: 30
            },
            "q": {
                offset_x: -2,
                offset_y: -1,
                width: 36
            },
            "r": {
                offset_x: -2,
                offset_y: -2,
                width: 30
            },
            "s": {
                offset_x: -2,
                offset_y: -2,
                width: 28
            },
            "t": {
                offset_x: -3,
                offset_y: -1,
                width: 28
            },
            "u": {
                offset_x: -2,
                offset_y: -1,
                width: 30
            },
            "v": {
                offset_x: -4,
                offset_y: -1,
                width: 31
            },
            "w": {
                offset_x: -3,
                offset_y: -3,
                width: 45
            },
            "x": {
                offset_x: -4,
                offset_y: -2,
                width: 30
            },
            "y": {
                offset_x: -4,
                offset_y: -1,
                width: 30
            },
            "z": {
                offset_x: -3,
                offset_y: -1,
                width: 25
            },
            "{": {
                offset_x: -3,
                offset_y: -6,
                width: 21
            },
            "|": {
                offset_x: -1,
                offset_y: -5,
                width: 14
            },
            "}": {
                offset_x: -5,
                offset_y: -6,
                width: 20
            },
            "~": {
                offset_x: -2,
                offset_y: 6,
                width: 30
            },
            "¡": {
                offset_x: -3,
                offset_y: 5,
                width: 14
            },
            "¨": {
                offset_x: -3,
                offset_y: -9,
                width: 17
            },
            "·": {
                offset_x: -2,
                offset_y: 10,
                width: 12
            },
            "¸": {
                offset_x: -3,
                offset_y: 31,
                width: 10
            },
            "¿": {
                offset_x: -2,
                offset_y: 5,
                width: 28
            },
            "À": {
                offset_x: -4,
                offset_y: -15,
                width: 31
            },
            "Á": {
                offset_x: -4,
                offset_y: -15,
                width: 31
            },
            "Â": {
                offset_x: -4,
                offset_y: -13,
                width: 31
            },
            "Ã": {
                offset_x: -4,
                offset_y: -14,
                width: 32
            },
            "Ä": {
                offset_x: -4,
                offset_y: -10,
                width: 31
            },
            "Å": {
                offset_x: -4,
                offset_y: -13,
                width: 31
            },
            "Æ": {
                offset_x: -5,
                offset_y: -1,
                width: 42
            },
            "Ç": {
                offset_x: -2,
                offset_y: -2,
                width: 27
            },
            "È": {
                offset_x: -2,
                offset_y: -16,
                width: 23
            },
            "É": {
                offset_x: -2,
                offset_y: -16,
                width: 23
            },
            "Ê": {
                offset_x: -2,
                offset_y: -13,
                width: 23
            },
            "Ë": {
                offset_x: -2,
                offset_y: -11,
                width: 23
            },
            "Ì": {
                offset_x: -8,
                offset_y: -16,
                width: 15
            },
            "Í": {
                offset_x: -2,
                offset_y: -16,
                width: 15
            },
            "Î": {
                offset_x: -5,
                offset_y: -13,
                width: 15
            },
            "Ï": {
                offset_x: -4,
                offset_y: -10,
                width: 14
            },
            "Ð": {
                offset_x: -4,
                offset_y: -1,
                width: 31
            },
            "Ñ": {
                offset_x: -2,
                offset_y: -14,
                width: 35
            },
            "Ò": {
                offset_x: -2,
                offset_y: -14,
                width: 33
            },
            "Ó": {
                offset_x: -2,
                offset_y: -13,
                width: 33
            },
            "Ô": {
                offset_x: -2,
                offset_y: -11,
                width: 33
            },
            "Õ": {
                offset_x: -2,
                offset_y: -12,
                width: 33
            },
            "Ö": {
                offset_x: -2,
                offset_y: -9,
                width: 33
            },
            "Ù": {
                offset_x: -2,
                offset_y: -14,
                width: 32
            },
            "Ú": {
                offset_x: -2,
                offset_y: -14,
                width: 32
            },
            "Û": {
                offset_x: -2,
                offset_y: -12,
                width: 32
            },
            "Ü": {
                offset_x: -2,
                offset_y: -9,
                width: 32
            },
            "Ý": {
                offset_x: -3,
                offset_y: -14,
                width: 30
            },
            "Þ": {
                offset_x: -2,
                offset_y: -2,
                width: 30
            },
            "ß": {
                offset_x: -2,
                offset_y: -2,
                width: 53
            },
            "à": {
                offset_x: -4,
                offset_y: -15,
                width: 31
            },
            "á": {
                offset_x: -4,
                offset_y: -15,
                width: 31
            },
            "â": {
                offset_x: -4,
                offset_y: -13,
                width: 31
            },
            "ã": {
                offset_x: -4,
                offset_y: -13,
                width: 32
            },
            "ä": {
                offset_x: -4,
                offset_y: -10,
                width: 31
            },
            "å": {
                offset_x: -4,
                offset_y: -12,
                width: 31
            },
            "æ": {
                offset_x: -4,
                offset_y: -2,
                width: 47
            },
            "ç": {
                offset_x: -2,
                offset_y: -1,
                width: 26
            },
            "è": {
                offset_x: -3,
                offset_y: -15,
                width: 30
            },
            "é": {
                offset_x: -3,
                offset_y: -15,
                width: 30
            },
            "ê": {
                offset_x: -3,
                offset_y: -14,
                width: 30
            },
            "ë": {
                offset_x: -3,
                offset_y: -10,
                width: 30
            },
            "ì": {
                offset_x: -10,
                offset_y: -15,
                width: 15
            },
            "í": {
                offset_x: -2,
                offset_y: -15,
                width: 15
            },
            "î": {
                offset_x: -5,
                offset_y: -13,
                width: 15
            },
            "ï": {
                offset_x: -4,
                offset_y: -10,
                width: 15
            },
            "ð": {
                offset_x: -4,
                offset_y: -1,
                width: 31
            },
            "ñ": {
                offset_x: -1,
                offset_y: -15,
                width: 33
            },
            "ò": {
                offset_x: -2,
                offset_y: -15,
                width: 33
            },
            "ó": {
                offset_x: -2,
                offset_y: -15,
                width: 33
            },
            "ô": {
                offset_x: -2,
                offset_y: -13,
                width: 33
            },
            "õ": {
                offset_x: -2,
                offset_y: -14,
                width: 33
            },
            "ö": {
                offset_x: -2,
                offset_y: -10,
                width: 33
            },
            "ù": {
                offset_x: -2,
                offset_y: -13,
                width: 30
            },
            "ú": {
                offset_x: -2,
                offset_y: -14,
                width: 30
            },
            "û": {
                offset_x: -2,
                offset_y: -13,
                width: 30
            },
            "ü": {
                offset_x: -2,
                offset_y: -9,
                width: 30
            },
            "ý": {
                offset_x: -4,
                offset_y: -13,
                width: 30
            },
            "þ": {
                offset_x: -2,
                offset_y: -2,
                width: 30
            },
            "ÿ": {
                offset_x: -4,
                offset_y: -9,
                width: 31
            },
        }
    };
    return Fonts;
})();
/// <reference path="references.ts" />
var DN_TEXT_ALIGN_HOR;
(function(DN_TEXT_ALIGN_HOR) {
    DN_TEXT_ALIGN_HOR[DN_TEXT_ALIGN_HOR["LEFT"] = 0] = "LEFT";
    DN_TEXT_ALIGN_HOR[DN_TEXT_ALIGN_HOR["RIGHT"] = 1] = "RIGHT";
    DN_TEXT_ALIGN_HOR[DN_TEXT_ALIGN_HOR["CENTER"] = 2] = "CENTER";
})(DN_TEXT_ALIGN_HOR || (DN_TEXT_ALIGN_HOR = {}));;
var DN_TEXT_ALIGN_VERT;
(function(DN_TEXT_ALIGN_VERT) {
    DN_TEXT_ALIGN_VERT[DN_TEXT_ALIGN_VERT["TOP"] = 0] = "TOP";
    DN_TEXT_ALIGN_VERT[DN_TEXT_ALIGN_VERT["MIDDLE"] = 1] = "MIDDLE";
    DN_TEXT_ALIGN_VERT[DN_TEXT_ALIGN_VERT["BOTTOM"] = 2] = "BOTTOM";
})(DN_TEXT_ALIGN_VERT || (DN_TEXT_ALIGN_VERT = {}));;
var DNBitmapLabel = (function(_super) {
    __extends(DNBitmapLabel, _super);

    function DNBitmapLabel(bitmap_font, text, align_h, max_width, max_scale) {
        _super.call(this);
        this.maxW = 0;
        this.alignH = 2 /* CENTER */ ;
        this.alignW = 0 /* TOP */ ;
        this.pic = new createjs.Container();
        this.symbols = [];
        this.maxScale = 1000;
        if (align_h != undefined) {
            this.alignH = align_h;
        }
        this.maxW = max_width || 0;
        this.font = bitmap_font;
        this.maxScale = max_scale || 1000;
        if (Constants.DRAW_GABARITES) {
            this.debugShape = Utils.DrawRect(max_width, this.font.height, "#ff0000", this);
            this.debugShape.alpha = 0.5;
        }
        this.addChild(this.pic);
        if (text) {
            this.setText(text);
        }
    }
    DNBitmapLabel.prototype.setText = function(text) {
        this.text = text;
        this.pic.removeAllChildren();
        this.symbols = [];
        var x_offset = 0;
        for (var i = 0; i < text.length; i++) {
            var char_code = text.charAt(i);
            var ch = new createjs.Container();
            var ch_pic = DNAssetsManager.g_instance.getImage(this.font.name + char_code);
            if (!ch_pic.getBounds()) {
                continue;
            }
            if (!this.font.charSet[char_code]) {
                continue;
            }
            ch.addChild(ch_pic);
            this.pic.addChild(ch);
            ch.x = x_offset;
            ch.x += this.font.charSet[char_code]["offset_x"];
            ch.y += this.font.charSet[char_code]["offset_y"];
            x_offset += this.font.charSet[char_code]["width"];
            this.symbols.push(ch);
        }
        this.calcScale();
        this.calcAlign();
    };
    DNBitmapLabel.prototype.setMinScale = function(min_scale) {
        this.pic.scaleX = this.pic.scaleY = min_scale;
        this.calcAlign();
    };
    DNBitmapLabel.prototype.calcScale = function() {
        var scale = 1;
        if (this.maxW != 0) {
            if (this.pic.getBounds().width > this.maxW) {
                scale = this.maxW / this.pic.getBounds().width;
            }
        }
        this.pic.scaleX = this.pic.scaleY = Math.min(scale, this.maxScale);
    };
    DNBitmapLabel.prototype.calcAlign = function() {
        switch (this.alignH) {
            case 2 /* CENTER */ :
                this.pic.x = -this.pic.getBounds().width * 0.5 * this.pic.scaleX;
                if (this.debugShape) {
                    this.debugShape.x = -this.maxW / 2;
                }
                break;
            case 0 /* LEFT */ :
                this.pic.x = 0;
                if (this.debugShape) {
                    this.debugShape.x = 0;
                }
                break;
            case 1 /* RIGHT */ :
                this.pic.x = -this.pic.getBounds().width * this.pic.scaleX;
                if (this.debugShape) {
                    this.debugShape.x = -this.maxW;
                }
                break;
        }
    };
    DNBitmapLabel.prototype.getText = function() {
        return this.text;
    };
    return DNBitmapLabel;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNFancyButton = (function(_super) {
    __extends(DNFancyButton, _super);

    function DNFancyButton(name, callback) {
        _super.call(this);
        this.selected = false;
        this.func = null;
        this.enabled = true;
        this.scaleTime = 0;
        this.picture = DNAssetsManager.g_instance.getCenteredImageWithProxy(name);
        this.addChild(this.picture);
        this.func = callback;
        this.picWidth = (this.picture.getBounds().width || 100) * 1.2;
        this.picHeight = (this.picture.getBounds().height || 100) * 1.2;
    }
    DNFancyButton.prototype.getPicture = function() {
        return this.picture;
    };
    DNFancyButton.prototype.setHandler = function(callback) {
        this.func = callback;
    };
    DNFancyButton.prototype.select = function() {
        if (!this.selected) {
            createjs.Tween.removeTweens(this.picture);
            this.scaleTime = 0;
            createjs.Tween.get(this.picture).to({
                scaleX: 1.25,
                scaleY: 1.25
            }, 400, createjs.Ease.backInOut);
            this.selected = true;
        }
    };
    DNFancyButton.prototype.deselect = function() {
        if (this.selected) {
            createjs.Tween.removeTweens(this.picture);
            createjs.Tween.get(this.picture).to({
                scaleX: 1,
                scaleY: 1,
                rotation: 0
            }, 400, createjs.Ease.backInOut);
            this.selected = false;
        }
    };
    DNFancyButton.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        if (this.selected) {
            this.scaleTime += dt;
            if (this.scaleTime > 0.3) {
                this.picture.rotation = Math.sin((this.scaleTime - 0.3) * 13) * 4;
            }
        }
    };
    DNFancyButton.prototype.onMouseDown = function(x, y) {
        if (this.hitTestSmart(x, y)) {
            this.liveTime = 0;
            this.select();
        }
    };
    DNFancyButton.prototype.onMouseUp = function(x, y) {
        if (this.hitTestSmart(x, y) && this.selected) {
            if (!DNGUIObject.wasHandlerThisFrame) {
                DNGUIObject.wasHandlerThisFrame = true;
                this.func();
                //  run action
                DNSoundManager.g_instance.play(Sounds.CLICK);
            }
        }
        this.deselect();
    };
    DNFancyButton.prototype.onMouseMove = function(x, y) {
        if (!this.hitTestSmart(x, y)) {
            this.deselect();
        }
    };
    DNFancyButton.prototype.hitTestSmart = function(x, y) {
        if (!this.enabled) {
            return;
        }
        if (!this.parent || !this.visible) {
            return false;
        }
        var pos = this.picture.localToGlobal(0, 0);
        pos.x /= Constants.SCREEN_SCALE;
        pos.y /= Constants.SCREEN_SCALE;
        var w = this.picWidth * 0.5 * this.scaleX;
        var h = this.picHeight * 0.5 * this.scaleY;
        return pos.x < x + w && pos.x > x - w && pos.y < y + h && pos.y > y - h;
    };
    DNFancyButton.prototype.setEnabled = function(enabled) {
        this.enabled = enabled;
    };
    return DNFancyButton;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNFlatButton = (function(_super) {
    __extends(DNFlatButton, _super);

    function DNFlatButton(name, callback) {
        _super.call(this);
        this.func = null;
        this.enabled = true;
        this.wasHandlerThisFrame = false;
        this.setPicture(name);
        this.func = callback;
    }
    DNFlatButton.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.wasHandlerThisFrame = false;
    };
    DNFlatButton.prototype.setPicture = function(name) {
        if (this.picture && this.picture.parent) {
            this.picture.parent.removeChild(this.picture);
        }
        this.picture = DNAssetsManager.g_instance.getCenteredImageWithProxy(name);
        this.addChild(this.picture);
    };
    DNFlatButton.prototype.setHandler = function(callback) {
        this.func = callback;
    };
    DNFlatButton.prototype.onMouseDown = function(x, y) {
        if (this.hitTestSmart(x, y)) {
            this.liveTime = 0;
            if (!DNGUIObject.wasHandlerThisFrame) {
                DNGUIObject.wasHandlerThisFrame = true;
                this.wasHandlerThisFrame = true;
                this.func();
                //  run action
                DNSoundManager.g_instance.play(Sounds.CLICK);
            }
        }
    };
    DNFlatButton.prototype.hitTestSmart = function(x, y) {
        if (!this.enabled) {
            return;
        }
        if (!this.parent || !this.visible) {
            return false;
        }
        var pos = this.picture.localToGlobal(0, 0);
        pos.x /= Constants.SCREEN_SCALE;
        pos.y /= Constants.SCREEN_SCALE;
        var w = (this.picture.getBounds().width || 100) * 0.6 * this.scaleX;
        var h = (this.picture.getBounds().height || 100) * 0.6 * this.scaleY;
        return pos.x < x + w && pos.x > x - w && pos.y < y + h && pos.y > y - h;
    };
    return DNFlatButton;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNFontDef = (function() {
    function DNFontDef() {}
    return DNFontDef;
})();
/// <reference path="references.ts" />
var DNGameConfig = (function() {
    function DNGameConfig() {}
    DNGameConfig.loadAPI = function() {
        
    };
    DNGameConfig.submitHighScore = function(score) {};
    DNGameConfig.showLeaderboards = function() {};
    DNGameConfig.levelWin = function(level, score) {
        gradle.event('level_win');
    };
    DNGameConfig.levelStart = function(level) {};
    DNGameConfig.levelFailed = function(level, score) {
        gradle.event('level_failed');
    };
    DNGameConfig.goMoreGames = function() {};
    
    DNGameConfig.pauseGame = function() {
		gradle.event('pauseGame');
        DNSoundManager.g_instance.onPause();
        DNStateManager.g_instance.onPause();
    };
    DNGameConfig.resumeGame = function() {
		gradle.event('resumeGame');
        DNSoundManager.g_instance.onResume();
        DNStateManager.g_instance.onResume();
    };
    DNGameConfig.restartGame = function() {
		gradle.event('restartGame');
        DNStateManager.g_instance.onRestart();
    };
    DNGameConfig.soundChange = function(sound_on) {
		gradle.event('soundChange');
        DNSoundManager.g_instance.setSoundEnabled(sound_on);
    };
    DNGameConfig.getBrandingPic = function() {
        return null;
    };
    DNGameConfig.goLogo = function() {};
    DNGameConfig.needShowRotateScreen = false;
    DNGameConfig.haveHighScores = false;
    DNGameConfig.haveMoreGames = false;
    DNGameConfig.haveBranding = false;
    return DNGameConfig;
})();
/// <reference path="references.ts" />
var DNLanguageSelector = (function(_super) {
    __extends(DNLanguageSelector, _super);

    function DNLanguageSelector(state, languages) {
        var _this = this;
        _super.call(this, "flags/back", null);
        this.allLanguages = [];
        this.state = DNLanguageSelector.STATE_NORMAL;
        this.setHandler(function() {
            return _this.onTap();
        });
        this.allLanguagesNames = languages;
        for (var i = 0; i < this.allLanguagesNames.length; i++) {
            this.allLanguages.push(new DNFlatButton("flags/" + this.allLanguagesNames[i], function() {
                return _this.onFlagTap();
            }));
            this.addChild(this.allLanguages[i]);
            state.addGuiObject(this.allLanguages[i]);
            this.allLanguages[i].visible = false;
        }
        this.setLanguage(DNStringManager.getInstance().getLanguage());
    }
    DNLanguageSelector.prototype.setLanguage = function(lang) {
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy("flags/" + lang));
        DNStringManager.getInstance().setLanguage(lang);
    };
    DNLanguageSelector.prototype.onTap = function() {
        switch (this.state) {
            case DNLanguageSelector.STATE_NORMAL:
                this.show();
                break;
            case DNLanguageSelector.STATE_SHOWED:
                this.hide();
                break;
        }
    };
    DNLanguageSelector.prototype.show = function() {
        var _this = this;
        this.state = DNLanguageSelector.STATE_SHOW;
        for (var i = 0; i < this.allLanguages.length; i++) {
            this.allLanguages[i].y = 0;
            this.allLanguages[i].visible = true;
            this.allLanguages[i].scaleX = this.allLanguages[i].scaleY = 0.5;
            var tween = createjs.Tween.get(this.allLanguages[i]).wait(50 * i).to({
                y: -100 - 86 * (i % 4),
                x: Math.floor(i / 4) * -86,
                scaleX: 1,
                scaleY: 1
            }, 400, createjs.Ease.cubicOut);
            if (i == this.allLanguages.length - 1) {
                tween.call(function() {
                    return _this.onShowEnded();
                });
            }
        }
    };
    DNLanguageSelector.prototype.hide = function() {
        var _this = this;
        this.state = DNLanguageSelector.STATE_SHOW;
        for (var i = 0; i < this.allLanguages.length; i++) {
            var tween = createjs.Tween.get(this.allLanguages[i]).wait(70 * i).to({
                x: 0,
                y: 0,
                scaleX: 0.5,
                scaleY: 0.5
            }, 300, createjs.Ease.cubicOut);
            if (i == this.allLanguages.length - 1) {
                tween.call(function() {
                    return _this.onHideEnded();
                });
            }
        }
    };
    DNLanguageSelector.prototype.onShowEnded = function() {
        this.state = DNLanguageSelector.STATE_SHOWED;
    };
    DNLanguageSelector.prototype.onHideEnded = function() {
        for (var i = 0; i < this.allLanguages.length; i++) {
            this.allLanguages[i].visible = false;
        }
        this.state = DNLanguageSelector.STATE_NORMAL;
    };
    DNLanguageSelector.prototype.onFlagTap = function() {
        if (this.state == DNLanguageSelector.STATE_SHOWED) {
            for (var i = 0; i < this.allLanguages.length; i++) {
                if (this.allLanguages[i].wasHandlerThisFrame) {
                    this.setLanguage(this.allLanguagesNames[i]);
                    this.hide();
                    return;
                }
            }
        }
    };
    DNLanguageSelector.STATE_NORMAL = 0;
    DNLanguageSelector.STATE_SHOW = 1;
    DNLanguageSelector.STATE_SHOWED = 2;
    DNLanguageSelector.STATE_HIDE = 3;
    return DNLanguageSelector;
})(DNFlatButton);
/// <reference path="references.ts" />
var DNLoadingBar = (function(_super) {
    __extends(DNLoadingBar, _super);

    function DNLoadingBar(font_color, frame_color, fill_color) {
        _super.call(this);
        this.loadingShape = new createjs.Shape();
        this.loadingShapeBack1 = new createjs.Shape();
        this.loadingShapeBack2 = new createjs.Shape();
        this.maxWidth = 300;
        this.deltaY = 50;
        //--------------
        this.loadingShapeBack1.graphics.beginFill(frame_color);
        this.loadingShapeBack1.graphics.drawRect(0 - 4, 0 - 4, this.maxWidth + 8, this.deltaY + 8);
        this.loadingShapeBack1.graphics.endFill();
        this.addChild(this.loadingShapeBack1);
        this.loadingShape.graphics.beginFill(fill_color);
        this.loadingShape.graphics.drawRect(0, 0, this.maxWidth, this.deltaY);
        this.loadingShape.graphics.endFill();
        this.addChild(this.loadingShape);
        this.loadingShape.scaleX = 0;
        this.loadingShape.x = -this.maxWidth / 2;
        this.loadingShape.y = +this.deltaY * 1.5;
        this.loadingShapeBack1.x = this.loadingShape.x;
        this.loadingShapeBack1.y = this.loadingShape.y;
        this.labelPercentDownload = new createjs.Text("0%", "bold 35px Verdana", font_color);
        this.labelPercentDownload.textAlign = "center"; /// need left
        this.addChild(this.labelPercentDownload);
        this.labelPercentDownload.y = 75;
    }
    DNLoadingBar.prototype.setProgress = function(progress) {
        this.labelPercentDownload.text = (progress * 100).toFixed(0) + "%";
        this.loadingShape.scaleX = progress;
    };
    return DNLoadingBar;
})(createjs.Container);
/// <reference path="references.ts" />
var DNLocalizableLabel = (function(_super) {
    __extends(DNLocalizableLabel, _super);

    function DNLocalizableLabel() {
        _super.apply(this, arguments);
    }
    DNLocalizableLabel.prototype.setText = function(text) {
        _super.prototype.setText.call(this, DNStringManager.getInstance().getString(text));
    };
    return DNLocalizableLabel;
})(DNBitmapLabel);
/// <reference path="references.ts" />
var DNLogoPlaceholder = (function(_super) {
    __extends(DNLogoPlaceholder, _super);

    function DNLogoPlaceholder(max_width, max_height) {
        _super.call(this);
        this.scaleCalculated = false;
        this.maxWidth = max_width;
        this.maxHeight = max_height;
        this.visible = DNGameConfig.haveBranding;
        if (Constants.DEBUG_MODE) {
            var shape = new createjs.Shape();
            shape.graphics.beginFill("#ff0000");
            shape.graphics.drawRect(0, 0, max_width, max_height);
            shape.graphics.endFill();
            shape.x = -max_width / 2;
            shape.y = -max_height / 2;
            this.addChild(shape);
        } else {
            this.picture = DNGameConfig.getBrandingPic();
            this.addChild(this.picture);
        }
        this.calcScale();
    }
    DNLogoPlaceholder.prototype.calcScale = function() {
        if (!this.scaleCalculated) {
            if (!this.picture || !this.picture.getBounds()) {
                return;
            }
            try {
                var scale = Math.min(this.maxWidth / this.picture.getBounds().width, this.maxHeight / this.picture.getBounds().height);
                if (scale < 1) {
                    this.picture.scaleX = this.picture.scaleY = scale;
                } else {
                    scale = 1;
                }
                this.picture.x = -this.picture.getBounds().width / 2 * scale;
                this.picture.y = -this.picture.getBounds().height / 2 * scale;
                this.scaleCalculated = true;
            } catch (e) {}
        }
    };
    DNLogoPlaceholder.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.calcScale();
    };
    DNLogoPlaceholder.prototype.onMouseDown = function(x, y) {
        if (this.hitTestSmart(x, y)) {
            DNGameConfig.goLogo();
        }
    };
    DNLogoPlaceholder.prototype.hitTestSmart = function(x, y) {
        if (!this.parent || !this.visible) {
            return false;
        }
        if (!this.picture || !this.picture.getBounds()) {
            return false;
        }
        var pos = this.localToGlobal(0, 0);
        pos.x /= Constants.SCREEN_SCALE;
        pos.y /= Constants.SCREEN_SCALE;
        var w = this.picture.getBounds().width * 0.5 * this.scaleX;
        var h = this.picture.getBounds().height * 0.5 * this.scaleY;
        return pos.x < x + w && pos.x > x - w && pos.y < y + h && pos.y > y - h;
    };
    return DNLogoPlaceholder;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNMovieClip = (function(_super) {
    __extends(DNMovieClip, _super);

    function DNMovieClip(name, frame_time, loop) {
        _super.call(this);
        this.frames = [];
        this.frame = 0;
        this.loop = false;
        this.paused = false;
        this.frameTime = frame_time;
        var count = DNAssetsManager.g_instance.getAthlasFramesCount(name);
        for (var i = 0; i < count; i++) {
            this.frames.push(DNAssetsManager.g_instance.getCenteredImageWithProxy(name + "_" + i));
            this.addChild(this.frames[i]);
        }
        if (loop) {
            this.loop = loop;
        }
        this.goto(0);
    }
    DNMovieClip.prototype.pause = function() {
        this.paused = true;
    };
    DNMovieClip.prototype.play = function() {
        this.paused = false;
        this.liveTime = 0;
    };
    DNMovieClip.prototype.gotoAndStop = function(frame) {
        this.goto(frame);
        this.pause();
    };
    DNMovieClip.prototype.goto = function(frame) {
        this.frame = frame;
        for (var i = 0; i < this.frames.length; i++) {
            this.frames[i].visible = (i == frame);
        }
    };
    DNMovieClip.prototype.totalFrames = function() {
        return this.frames.length;
    };
    DNMovieClip.prototype.setLoop = function(loop) {
        this.loop = loop;
    };
    DNMovieClip.prototype.setFrameTime = function(tm) {
        this.frameTime = tm;
    };
    DNMovieClip.prototype.update = function(dt) {
        if (this.paused) {
            return;
        }
        _super.prototype.update.call(this, dt);
        if (this.liveTime > this.frameTime) {
            this.liveTime = 0;
            this.frame++;
            if (this.frame >= this.frames.length) {
                this.frame = this.frames.length - 1;
                if (this.loop) {
                    this.frame = 0;
                } else {
                    this.kill();
                }
            }
            this.goto(this.frame);
        }
    };
    return DNMovieClip;
})(DNGameObject);
/// <reference path="references.ts" />
var DNPlaceholder = (function(_super) {
    __extends(DNPlaceholder, _super);

    function DNPlaceholder() {
        _super.call(this);
    }
    return DNPlaceholder;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNProgressBar = (function(_super) {
    __extends(DNProgressBar, _super);

    function DNProgressBar(back, front) {
        _super.call(this);
        this.shape = new createjs.Shape();
        this.width = 0;
        if (back) {
            this.addChild(DNAssetsManager.g_instance.getImage(back));
        }
        var front_pic = DNAssetsManager.g_instance.getImage(front);
        this.addChild(front_pic);
        this.width = front_pic.getBounds().width;
        this.shape.graphics.beginFill("#000000");
        this.shape.graphics.drawRect(0, 0, front_pic.getBounds().width, (front_pic.getBounds().height || 100));
        this.shape.graphics.endFill();
        front_pic.mask = this.shape;
    }
    DNProgressBar.prototype.setProgress = function(progress) {
        if (progress > 1) {
            progress = 1;
        }
        this.shape.x = (progress - 1) * this.width;
    };
    return DNProgressBar;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNSoundManager = (function() {
    function DNSoundManager() {
        this.soundEnabled = true;
        this.initiliazed = false;
        this.focus = true;
        this.hidden = false;
        this.wasSoundEnabled = true;
        this.wasPauseCall = false;
        this.soundsOnFrame = [];
        //  dirty hack
        this.wasMusicPlay = false;
    }
    DNSoundManager.prototype.onLostFocus = function() {
        this.focus = false;
        this.update();
    };
    DNSoundManager.prototype.onFocus = function() {
        this.focus = true;
        this.update();
    };
    DNSoundManager.prototype.init = function() {
        try {
            if (!this.initiliazed) {
                if (!createjs.Sound.initializeDefaultPlugins()) {
                    return;
                }
                this.initiliazed = true;
            }
        } catch (e) {}
    };
    DNSoundManager.prototype.isSoundEnabled = function() {
        return this.soundEnabled;
    };
    DNSoundManager.prototype.setSoundEnabled = function(enabled) {
        this.soundEnabled = enabled;
        var is_mute = !enabled || !this.focus || this.hidden;
        try {
            if (createjs.Sound.getMute() == is_mute) {
                return;
            }
            createjs.Sound.setMute(is_mute);
        } catch (e) {}
    };
    DNSoundManager.prototype.play = function(name, volume) {
        try {
            if (!volume) {
                volume = 1;
            }
            if (this.initiliazed && this.soundEnabled) {
                return createjs.Sound.play(name, createjs.Sound.INTERRUPT_NONE, 0, 0, 0, volume);
            }
        } catch (e) {}
        return null;
    };
    DNSoundManager.prototype.playMusic = function(volume) {
        try {
            if (!volume) {
                volume = 1;
            }
            if (this.initiliazed && this.soundEnabled) {
                if (!this.wasMusicPlay) {
                    this.wasMusicPlay = true;
                    var music_instance = createjs.Sound.play(Sounds.MUSIC, createjs.Sound.INTERRUPT_NONE, 0, 0, -1, volume);
                    if (music_instance.playState == "playFailed") {
                        this.wasMusicPlay = false;
                        return null;
                    }
                }
            }
        } catch (e) {}
        return null;
    };
    DNSoundManager.prototype.update = function() {
        this.soundsOnFrame.length = 0;
        if (this.initiliazed) {
            if (document.hidden || document["webkitHidden"] || document.msHidden) {
                this.hidden = true;
            } else {
                this.hidden = false;
            }
            this.setSoundEnabled(this.soundEnabled);
        }
    };
    DNSoundManager.prototype.playSinglePerFrame = function(name, volume) {
        if (this.soundsOnFrame.indexOf(name) == -1) {
            this.soundsOnFrame.push(name);
            this.play(name, volume);
        }
    };
    DNSoundManager.prototype.onPause = function() {
        this.wasPauseCall = true;
        //console.log("on pause");
        this.wasSoundEnabled = this.isSoundEnabled();
        if (this.isSoundEnabled()) {
            this.setSoundEnabled(false);
        }
    };
    DNSoundManager.prototype.onResume = function() {
        if (this.wasPauseCall) {
            //console.log("on resume");
            if (this.wasSoundEnabled) {
                this.setSoundEnabled(true);
            }
            this.wasPauseCall = false;
        }
    };
    DNSoundManager.g_instance = new DNSoundManager();
    return DNSoundManager;
})();
/// <reference path="references.ts" />
var DNStaticPicture = (function(_super) {
    __extends(DNStaticPicture, _super);

    function DNStaticPicture(name) {
        _super.call(this);
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy(name));
    }
    return DNStaticPicture;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNStringManager = (function() {
    function DNStringManager() {
        this.container = new createjs.Container();
        this.strings = new Object();
        this.allStrings = null;
        this.allStrings = g_strings;
        this.setLanguage("en");
    }
    DNStringManager.getInstance = function() {
        return DNStringManager.g_instance;
    };
    DNStringManager.prototype.getString = function(string_id) {
        return this.strings[string_id];
    };
    DNStringManager.prototype.setLanguage = function(lang) {
        this.strings = this.allStrings[lang];
        this.language = lang;
    };
    DNStringManager.prototype.getLanguage = function() {
        return this.language;
    };
    DNStringManager.prototype.getLanguagePrefix = function() {
        if (this.language == "en") {
            return "";
        }
        return this.language + "/";
    };
    DNStringManager.g_instance = new DNStringManager();
    return DNStringManager;
})();
/// <reference path="references.ts" />
var DNTextBox = (function(_super) {
    __extends(DNTextBox, _super);

    function DNTextBox(bitmap_font, text, max_width, max_height) {
        _super.call(this);
        this.textScale = 1;
        this.minScale = 0.1;
        this.maxTextWidth = max_width;
        this.maxTextHeight = max_height;
        this.font = bitmap_font;
        this.setText(text);
    }
    DNTextBox.prototype.setText = function(text) {
        this.removeAllChildren();
        if (Constants.DRAW_GABARITES) {
            var debug_shape = new createjs.Shape();
            debug_shape.graphics.beginFill("#0000ff");
            debug_shape.graphics.drawRect(0, 0, this.maxTextWidth, this.maxTextHeight);
            debug_shape.graphics.endFill();
            debug_shape.alpha = 0.5;
            debug_shape.x = -this.maxTextWidth / 2;
            this.addChild(debug_shape);
        }
        var max_h = 0;
        var label = new DNBitmapLabel(this.font, " ");
        var space_width = label.getBounds().width;
        var len = text.length;
        var word = "";
        var words = [];
        var max_word_width = 0;
        for (var i = 0; i < len + 1; i++) {
            if (text.charAt(i) == ' ' || i == len) {
                if (word.length != 0) {
                    var label = new DNBitmapLabel(this.font, word);
                    label.scaleX = label.scaleY = this.textScale;
                    words.push(label);
                    var word_width = label.getBounds().width;
                    if (word_width > max_word_width) {
                        max_word_width = word_width;
                    }
                }
                word = "";
            } else {
                word = word + text.charAt(i);
            }
        }
        var y = 0;
        var line = 0;
        var words_in_line = 0;
        var word_start_index = 0;
        for (var i = 0; i < words.length; i++) {
            line += (words[i].getBounds().width + space_width) * this.textScale;
            words_in_line++;
            var last_word_in_line = (i == words.length - 1);
            if (line > this.maxTextWidth || last_word_in_line) {
                if (words_in_line > 1 && line > this.maxTextWidth) {
                    line -= words[i].getBounds().width;
                    words_in_line--;
                    i--;
                }
                var cur_line = "";
                for (var w = word_start_index; w < word_start_index + words_in_line; w++) {
                    cur_line += words[w].getText();
                    cur_line += " ";
                }
                //cur_line.pop();	//	убираем лишний пробел в конце
                var line_label = new DNBitmapLabel(this.font, cur_line);
                line_label.scaleX = line_label.scaleY = this.textScale;
                this.addChild(line_label);
                line_label.y = y;
                y += this.font.height * this.textScale;
                line = 0;
                word_start_index += words_in_line;
                words_in_line = 0;
                max_h = y;
            }
        }
        if ((max_h > this.maxTextHeight || max_word_width > this.maxTextWidth) && this.textScale > this.minScale) {
            this.textScale -= 0.05;
            this.setText(text);
        }
    };
    return DNTextBox;
})(DNGUIObject);
/// <reference path="references.ts" />
var DNTextField = (function(_super) {
    __extends(DNTextField, _super);

    function DNTextField(text, font_def) {
        _super.call(this);
        this.textWidth = 0;
        this.fontNamePrefix = "";
        this.letterDistance = 0;
        if (font_def) {
            this.fontNamePrefix = font_def.name;
            this.letterDistance = font_def.letterDist;
        }
        if (text) {
            this.setText(text);
        }
    }
    DNTextField.prototype.setText = function(text) {
        if (this.text == text) {
            return;
        }
        this.text = text;
        this.removeAllChildren();
        var x_offset = 0;
        for (var i = 0; i < text.length; i++) {
            var char_code = text.charAt(i);
            var ch = DNAssetsManager.g_instance.getImage(this.fontNamePrefix + char_code);
            this.addChild(ch);
            ch.x = x_offset;
            x_offset += ch.getBounds().width + this.letterDistance;
        }
        this.textWidth = x_offset;
    };
    DNTextField.prototype.getWidth = function() {
        return this.textWidth;
    };
    DNTextField.prototype.getText = function() {
        return this.text;
    };
    return DNTextField;
})(DNGUIObject);
/// <reference path="references.ts" />
var EducationState = (function(_super) {
    __extends(EducationState, _super);

    function EducationState() {
        _super.call(this);
    }
    EducationState.prototype.onMouseDown = function(x, y) {
        _super.prototype.onMouseDown.call(this, x, y);
    };
    return EducationState;
})(DNGameState);
/// <reference path="references.ts" />
var EndLevelEffect = (function(_super) {
    __extends(EndLevelEffect, _super);

    function EndLevelEffect(text) {
        _super.call(this, Fonts.fontMessages, text, 2 /* CENTER */ , 600);
        this.offsetY = 0;
        this.scaleX = this.scaleY = 1.25;
        this.x = Constants.ASSETS_WIDTH / 2;
        this.y = 320;
        for (var i = 0; i < this.symbols.length; i++) {
            Utils.RunShowAnim(this.symbols[i], i * 50);
            this.symbols[i].y = i * 10;
        }
        //createjs.Tween.get(this).wait(1200 + this.symbols.length * 50).to({ alpha: 0 }, 400, createjs.Ease.linear).call(() => this.kill()); 
    }
    EndLevelEffect.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        for (var i = 0; i < this.symbols.length; i++) {
            this.symbols[i].y = Math.sin(this.liveTime * 4 + i * 0.4) * 3;
        }
    };
    return EndLevelEffect;
})(DNLocalizableLabel);
/// <reference path="references.ts" />
var Fish = (function(_super) {
    __extends(Fish, _super);

    function Fish() {
        _super.call(this);
        //if (Math.random() < 0.5)
        //{
        //    this.clip = new AutoreleaseEffect("fish_1_", 4, Utils.RandomRange(0.06, 0.1), true);
        //}
        //else
        //{
        //    this.clip = new AutoreleaseEffect("fish_2_", 4, Utils.RandomRange(0.11, 0.13), true);
        //}
        this.clip = new AutoreleaseEffect("bonus_fish_", 4, Utils.RandomRange(0.11, 0.13), true);
        this.addChild(this.clip);
        this.toX = Utils.RandomRange(0, 700);
        this.toY = Utils.RandomRange(200, 600);
        //this.scale = Utils.RandomRange(0.9, 1.2);
        this.scale = Utils.RandomRange(0.7, 0.9);
        this.scaleX = this.scaleY = this.scale;
        this.scaleX *= -1;
        this.initPlaces();
        this.update(0);
    }
    Fish.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.clip.update(dt);
        this.x = this.fromX + (this.toX - this.fromX) * this.liveTime / this.moveTime;
        this.y = this.fromY + (this.toY - this.fromY) * this.liveTime / this.moveTime;
        if (this.liveTime >= this.moveTime) {
            this.initPlaces();
        }
    };
    Fish.prototype.initPlaces = function() {
        this.liveTime = 0;
        this.fromX = this.toX;
        this.fromY = this.toY;
        //  while min_lenght
        this.toX = Utils.RandomRange(0, 700);
        if (this.fromY < 250) {
            this.toY = Utils.RandomRange(0, +100) + this.fromY;
        } else if (this.fromY > 650) {
            this.toY = Utils.RandomRange(-100, 0) + this.fromY;
        } else {
            this.toY = Utils.RandomRange(-100, +100) + this.fromY;
        }
        var len = Math.sqrt((this.toY - this.fromY) * (this.toY - this.fromY) + (this.toX - this.fromX) * (this.toX - this.fromX));
        //this.moveTime = len / 200 * Utils.RandomRange(0.4, 2.0);
        this.moveTime = len / 200 * Utils.RandomRange(0.3, 3.5);
        this.rotation = Utils.RadToGrad(Math.atan2(this.toY - this.fromY, this.toX - this.fromX)) - 180;
        this.scaleY = ((this.fromX > this.toX) ? this.scale : -this.scale);
    };
    return Fish;
})(DNGameObject);
/// <reference path="references.ts" />
var FishStates;
(function(FishStates) {
    FishStates[FishStates["MoveToColumn"] = 0] = "MoveToColumn";
    FishStates[FishStates["EatColumn"] = 1] = "EatColumn";
    FishStates[FishStates["SwimAway"] = 2] = "SwimAway";
})(FishStates || (FishStates = {}));;
var FishEater = (function(_super) {
    __extends(FishEater, _super);

    function FishEater(column_x) {
        _super.call(this);
        this.state = 0 /* MoveToColumn */ ;
        this.columnX = column_x;
        this.clip = DNAssetsManager.g_instance.getCenteredImageWithProxy("bonus_fish_glow_" + Utils.RandomRangeInt(1, 3)); //new AutoreleaseEffect("bonus_fish_", 4, Utils.RandomRange(0.06, 0.1), true);
        this.addChild(this.clip);
        this.toX = column_x + Utils.RandomRange(-250, 250);
        this.toY = 850;
        this.scale = Utils.RandomRange(0.9, 1.2);
        this.scaleX = this.scaleY = this.scale;
        //  ??
        //this.scaleX *= -1;
        this.initPlaces();
        this.liveTime = Utils.RandomRange(-0.4, 0);
        this.update(0);
    }
    FishEater.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        //this.clip.update(dt);
        this.x = this.fromX + (this.toX - this.fromX) * this.liveTime / this.moveTime;
        this.y = this.fromY + (this.toY - this.fromY) * this.liveTime / this.moveTime;
        if (this.liveTime >= this.moveTime) {
            this.initPlaces();
        }
    };
    FishEater.prototype.initPlaces = function() {
        if (this.state == 2 /* SwimAway */ ) {
            this.kill();
            return;
        }
        //  ???
        if (this.toY < 250) {
            this.state = 2 /* SwimAway */ ;
        }
        this.liveTime = 0;
        this.fromX = this.toX;
        this.fromY = this.toY;
        switch (this.state) {
            case 0 /* MoveToColumn */ :
                {
                    this.toX = this.columnX + Utils.RandomRange(-Constants.CELL_SIZE * 0.7, Constants.CELL_SIZE * 0.7);
                    this.toY = 750;
                    this.state = 1 /* EatColumn */ ;
                }
                break;
            case 1 /* EatColumn */ :
                {
                    this.toX = this.columnX + Utils.RandomRange(-Constants.CELL_SIZE * 0.7, Constants.CELL_SIZE * 0.7);
                    this.toY = this.toY - Utils.RandomRange(100, 150);
                }
                break;
            case 2 /* SwimAway */ :
                {
                    this.toX = ((Math.random() < 0.5) ? -800 : 800);
                    this.toY = Utils.RandomRange(200, 600);
                }
                break;
        }
        var len = Math.sqrt((this.toY - this.fromY) * (this.toY - this.fromY) + (this.toX - this.fromX) * (this.toX - this.fromX));
        this.moveTime = len / 200 * Utils.RandomRange(0.25, 0.35);
        this.rotation = Utils.RadToGrad(Math.atan2(this.toY - this.fromY, this.toX - this.fromX)) - 180;
        this.scaleY = ((this.fromX > this.toX) ? this.scale : -this.scale);
    };
    return FishEater;
})(DNGameObject);
/// <reference path="references.ts" />
var FlyingPoints = (function(_super) {
    __extends(FlyingPoints, _super);

    function FlyingPoints(value) {
        _super.call(this);
        this.timeOffset = Math.random() * 10;
        this.label = new DNTextField("p" + value.toString(), Constants.FONT_SCORE);
        this.addChild(this.label);
        this.label.x = -this.label.getBounds().width * 0.5;
        this.label.y = -18;
        this.label.scaleX = this.label.scaleY = 0.4;
        this.label.alpha = 0;
        createjs.Tween.get(this.label).to({
            scaleX: 1,
            scaleY: 1,
            alpha: 1
        }, 400, createjs.Ease.backOut);
    }
    FlyingPoints.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        if (this.liveTime > 0.5) {
            this.y -= dt * 80;
        }
        if (this.liveTime > 0.8) {
            this.alpha -= dt * 3;
        }
        if (this.liveTime >= 1.5) {
            this.kill();
        }
    };
    return FlyingPoints;
})(DNGameObject);
/// <reference path="references.ts" />
var FPSCounter = (function(_super) {
    __extends(FPSCounter, _super);

    function FPSCounter() {
        _super.call(this);
        this.textField = new createjs.Text("0", "bold 40px Verdana", "#FF0000");
        this.counter = 0;
        this.addChild(this.textField);
    }
    FPSCounter.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.counter++;
        if (this.liveTime >= 1.0) {
            this.liveTime -= 1.0;
            this.textField.text = this.counter.toString();
            this.counter = 0;
        }
    };
    return FPSCounter;
})(DNGameObject);
/// <reference path="references.ts" />
var Images = (function() {
    function Images() {}
    Images.BUTTON_SOUND_ON = "button_sound_on";
    Images.BUTTON_SOUND_OFF = "button_sound_off";
    Images.BUTTON_PLAY = "button_play";
    Images.BUTTON_EXIT = "button_exit";
    Images.BUTTON_PAUSE = "button_pause";
    Images.BUTTON_RESTART = "button_restart";
    Images.BUTTON_CREDITS = "button_credits";
    Images.BUTTON_MORE_GAMES = "button_more_games";
    Images.TITLE = "title";
    Images.FILL = "fill";
    Images.HYPNOCAT = "hypnocat";
    Images.WINDOW = "window";
    //public static LEVEL_LOCKED: string = "level_locked";
    Images.LEVEL_BUTTON = "level_button";
    Images.MONSTER = "mini_monster";
    Images.BOMB = "bomb";
    Images.LINE = "line";
    Images.VERT_BONUS = "vert_bonus";
    Images.ADDITIONAL = "additional";
    Images.PLUS = "plus";
    Images.HEADER_COMPLETE = "header_complete";
    Images.HEADER_FAILED = "header_failed";
    Images.MAP_PANEL = "map_panel";
    Images.INGAME_PANEL = "ingame_panel";
    Images.BUBBLE = "bubble";
    Images.BUBBLE_QUICK = "bubble_quick";
    Images.BUTTON_PLAY_BIG = "button_play_big";
    Images.SWORDFISH = "swordfish";
    Images.WAVE_1 = "wave_1";
    Images.WAVE_2 = "wave_2";
    Images.STAR_ON = "star_on";
    Images.STAR_OFF = "star_off";
    Images.BOAT = "boat";
    Images.OUT_OF_MOVES = "out_of_moves";
    Images.OUT_OF_AIR = "out_of_air";
    Images.LEVEL_COMPLETED = "level_completed";
    Images.SCORE = "score";
    Images.TOTAL_SCORE = "total_score";
    Images.PLUS_FRAME = "plus_frame";
    Images.HINT = "hint";
    Images.OXYGEN_BACK = "oxygen_back";
    Images.OXYGEN_FRONT = "oxygen_front";
    Images.OXYGEN_RED = "oxygen_red";
    Images.TRANSITION_UP = "transition_up";
    Images.TRANSITION_DOWN = "transition_down";
    Images.TUBE = "tube";
    Images.BONUS_ARROW = "bonus_arrow";
    Images.JELLY = "jelly";
    return Images;
})();
/// <reference path="references.ts" />
var Jellier = (function(_super) {
    __extends(Jellier, _super);

    function Jellier(obj, speed, delay, max_scale) {
        _super.call(this);
        this.jellyScale = 0.1;
        this.maxScale = 0.2;
        if (max_scale) {
            this.maxScale = max_scale;
        }
        this.origScale = obj.scaleX;
        this.speed = speed;
        this.obj = obj;
        this.delay = delay;
    }
    Jellier.prototype.update = function(dt) {
        if (this.delay > 0) {
            this.delay -= dt;
            return;
        }
        _super.prototype.update.call(this, dt);
        var tm = this.liveTime * this.speed;
        this.jellyScale = this.maxScale * (Math.PI * 3 - tm) / (Math.PI * 3);
        var scale = Math.sin(tm) * this.jellyScale;
        this.obj.scaleX = this.origScale + scale;
        this.obj.scaleY = this.origScale - scale;
        if (tm >= Math.PI * 3) {
            this.obj.scaleX = this.obj.scaleY = 1.0 * this.origScale;
            this.kill();
        }
    };
    return Jellier;
})(DNGameObject);
/// <reference path="references.ts" />
var KillLineEffect = (function(_super) {
    __extends(KillLineEffect, _super);

    function KillLineEffect(is_left) {
        _super.call(this);
        this.scaleX = -1;
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.SWORDFISH));
        //this.speed = -2100;
        this.speed = +1200;
    }
    KillLineEffect.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.x += this.speed * dt;
        if (this.x > Constants.ASSETS_WIDTH + 250) {
            this.kill();
        }
    };
    return KillLineEffect;
})(DNGameObject);
/// <reference path="references.ts" />
var Layouts = (function() {
    function Layouts() {}
    Layouts.TYPE_LOCALIZABLE_LABEL = "localizable_label";
    Layouts.TYPE_BITMAP_LABEL = "bitmap_label";
    Layouts.TYPE_SKEW = "skew";
    Layouts.TYPE_STATIC_PICTURE = "static_picture";
    Layouts.TYPE_BUTTON = "button";
    Layouts.TYPE_PLACEHOLDER = "placeholder";
    Layouts.TYPE_LOGO_PLACEHOLDER = "TYPE_LOGO_PLACEHOLDER";
    Layouts.TYPE_FLAT_BUTTON = "flat_button";
    Layouts.TYPE_JELLY_BUTTON = "jelly_button";
    Layouts.TYPE_FANCY_BUTTON = "fancy_button";
    Layouts.TYPE_TEXT_FIELD = "textfield";
    Layouts.TYPE_PROGRESS_BAR = "progress_bar";
    Layouts.TYPE_LANGUAGE_SELECTOR = "language_selector";
    Layouts.NAME_BUTTON_PLAY = "play";
    Layouts.NAME_BUTTON_CREDITS = "credits";
    Layouts.NAME_SOUND_PLACE = "sound";
    Layouts.NAME_BUTTON_BACK = "back";
    Layouts.NAME_SELECT_LEVEL_PANEL = "select_level_panel";
    Layouts.NAME_BUTTON_CLOSE = "close";
    Layouts.NAME_BUTTON_EXIT = "exit";
    Layouts.NAME_BUTTON_RESTART = "restart";
    Layouts.NAME_PANEL = "panel";
    Layouts.NAME_CAPTION = "caption";
    Layouts.NAME_BUTTON_MORE_GAMES = "more_games";
    Layouts.NAME_PAUSE = "pause";
    Layouts.NAME_SCORE = "score";
    Layouts.NAME_HIGHSCORE = "highscore";
    Layouts.NAME_MOVES = "moves";
    Layouts.NAME_TITLE = "title";
    return Layouts;
})();
/// <reference path="MainMenuState.ts" />
var LoseState = (function(_super) {
    __extends(LoseState, _super);

    function LoseState(level, score) {
        var _this = this;
        _super.call(this);
        var button_restart = new DNFancyButton(Images.BUTTON_RESTART, function() {
            return _this.onRestartTouch();
        });
        this.findGUIObject("down_place_1_5").addChild(button_restart);
        this.addGuiObject(button_restart);
        var button_exit = new DNFancyButton(Images.BUTTON_EXIT, function() {
            return _this.onExitTouch();
        });
        this.findGUIObject("down_place_2_5").addChild(button_exit);
        this.addGuiObject(button_exit);
        this.setScoreTexts(score);
        DNGameConfig.levelFailed(level, score);
    }
    return LoseState;
})(SubmarineState);
/// <reference path="references.ts" />
var MatchParticle = (function(_super) {
    __extends(MatchParticle, _super);

    function MatchParticle(color_id) {
        _super.call(this);
        this.rotationSpeed = Utils.RandomRange(-300, 300);
        this.speedX = Utils.RandomRange(-70, 70);
        this.speedY = Utils.RandomRange(-70, 70);
        this.dieTime = Utils.RandomRange(0.4, 0.6);
        var pic = DNAssetsManager.g_instance.getCenteredImageWithProxy("particle_" + color_id + "_" + Utils.RandomRangeInt(1, 3));
        this.rotation = 360 * Math.random();
        this.addChild(pic);
        this.scaleX = this.scaleY = Utils.RandomRange(0.7, 1.3);
    }
    MatchParticle.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.rotation += dt * this.rotationSpeed;
        this.speedY += dt * Constants.GRAVITY_ACC * 0.2;
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
        if (this.y < 130) {
            this.y = 130;
        }
        if (this.liveTime > this.dieTime) {
            this.alpha -= dt * 2;
            if (this.alpha <= 0) {
                this.kill();
            }
        }
    };
    return MatchParticle;
})(DNGameObject);
/// <reference path="references.ts" />
var PauseState = (function(_super) {
    __extends(PauseState, _super);

    function PauseState() {
        var _this = this;
        _super.call(this);
        var buttons_y = 200;
        var offs_x = -20;
        var button_exit = new DNFancyButton(Images.BUTTON_EXIT, function() {
            return _this.onExitTouch();
        });
        this.findGUIObject("down_place_1").addChild(button_exit);
        this.addGuiObject(button_exit);
        var button_restart = new DNFancyButton(Images.BUTTON_RESTART, function() {
            return _this.onRestartTouch();
        });
        this.findGUIObject("down_place_2").addChild(button_restart);
        this.addGuiObject(button_restart);
        var button_play = new DNFancyButton(Images.BUTTON_PLAY, function() {
            return _this.hide();
        });
        this.findGUIObject("down_place_3").addChild(button_play);
        this.addGuiObject(button_play);
        this.findGUIObject("caption").setText("Pause");
        this.setScoreTexts();
        this.setSoundButton();
    }
    PauseState.prototype.setSoundButton = function() {
        var _this = this;
        if (this.soundButton && this.soundButton.parent) {
            this.soundButton.parent.removeChild(this.soundButton);
        }
        var enabled = DNSoundManager.g_instance.isSoundEnabled();
        this.soundButton = new DNFancyButton(enabled ? Images.BUTTON_SOUND_ON : Images.BUTTON_SOUND_OFF, function() {
            return _this.onSoundTouch();
        });
        this.panel.addChild(this.soundButton);
        this.addGuiObject(this.soundButton); // mb bug
        this.soundButton.x = 5;
        this.soundButton.y = 10;
    };
    PauseState.prototype.onSoundTouch = function() {
        DNSoundManager.g_instance.setSoundEnabled(!DNSoundManager.g_instance.isSoundEnabled());
        this.setSoundButton();
    };
    PauseState.prototype.onResume = function() {
        this.hide();
    };
    return PauseState;
})(SubmarineState);
/// <reference path="references.ts" />
var PlayState = (function(_super) {
    __extends(PlayState, _super);

    function PlayState(level) {
        var _this = this;
        _super.call(this);
        this.layout = [{
                type: Layouts.TYPE_STATIC_PICTURE,
                picture: Images.INGAME_PANEL,
                x: 300,
                y: 31,
                children: [{
                        type: Layouts.TYPE_BITMAP_LABEL,
                        x: -50,
                        y: -10,
                        font: Fonts.fontGUI,
                        name: "level",
                        max_scale: 0.78,
                    },
                    {
                        type: Layouts.TYPE_BITMAP_LABEL,
                        x: -115,
                        y: -10,
                        font: Fonts.fontGUI,
                        text: "level:",
                        max_scale: 0.78,
                    },
                    {
                        type: Layouts.TYPE_BITMAP_LABEL,
                        x: 180,
                        y: -10,
                        font: Fonts.fontGUI,
                        name: "score",
                        text: "000000",
                        max_scale: 0.78,
                    },
                    {
                        type: Layouts.TYPE_BITMAP_LABEL,
                        x: 70,
                        y: -10,
                        font: Fonts.fontGUI,
                        text: "score:",
                        max_scale: 0.78,
                    },
                ]
            },
            {
                type: Layouts.TYPE_FANCY_BUTTON,
                picture: Images.BUTTON_PAUSE,
                x: 59,
                y: 50,
                name: "pause",
            },
            {
                type: Layouts.TYPE_PROGRESS_BAR,
                picture: Images.OXYGEN_FRONT,
                back: Images.OXYGEN_BACK,
                x: 555,
                y: 10,
                name: "oxygen",
            },
            {
                type: Layouts.TYPE_STATIC_PICTURE,
                picture: Images.OXYGEN_RED,
                x: 555 + 70,
                y: 10 + 39,
                name: "oxygen_red",
            },
        ];
        this.INPUT_STATE_WAIT_ACTION = "INPUT_STATE_WAIT_ACTION";
        this.INPUT_STATE_LOCK = "INPUT_STATE_LOCK";
        this.INPUT_STATE_WAIT_SPAWN = "INPUT_STATE_WAIT_SPAWN";
        this.INPUT_STATE_SHIFT = "INPUT_STATE_SHIFT";
        this.INPUT_STATE_DELAY = "INPUT_STATE_DELAY";
        this.tutorial = null;
        this.inputState = null;
        this.waitWin = false;
        this.waitWinTime = 0;
        this.waitLose = false;
        this.waitLoseTime = 0;
        this.fieldWidth = 10;
        this.fieldHeight = 9;
        this.chipLayersContainer = new createjs.Container();
        this.underChipsLayer = new createjs.Container();
        this.backChipsLayer = new createjs.Container();
        this.frontChipsLayer = new createjs.Container();
        this.veryFrontChipsLayer = new createjs.Container();
        this.particlesLayer = new createjs.Container();
        this.inputStateTime = 0;
        this.score = 0;
        this.tmpScore = 0;
        this.timeLeft = 90;
        this.timeLeftTotal = 90;
        this.chipTypesCount = 1;
        this.selectedChips = new Array();
        this.hintChips = new Array();
        this.spawnQueries = 0;
        this.group = new Array();
        this.lastDropSoundTime = -10;
        this.lastDropID = -1;
        this.lastFreedomSoundTime = -10;
        if (level != -1) {
            PlayState.level = level;
        }
        var back_id = (PlayState.level % 3 + 1);
        this.addChild(DNAssetsManager.g_instance.getImage("background_" + back_id));
        this.addGameObjectAtPos(new SeeWaves(back_id), this, 0, 22 + 15);
        var bubble_layer = new createjs.Container();
        this.addChild(bubble_layer);
        this.addGameObjectAtPos(new BubbleSpawner(this, bubble_layer, 0.8), this, Utils.RandomRange(50, 650), 730);
        //  ????
        var count = Utils.RandomRangeInt(2, 4);
        for (var i = 0; i < count; i++) {
            this.addGameObjectAt(new Fish(), this);
        }
        PlayState.g_instance = this;
        //  alloc
        this.field = new Array(this.fieldWidth);
        for (var i = 0; i < this.fieldWidth; i++) {
            this.field[i] = new Array(this.fieldHeight);
        }
        this.addChild(this.chipLayersContainer);
        this.chipLayersContainer.addChild(this.underChipsLayer);
        this.chipLayersContainer.addChild(this.backChipsLayer);
        this.chipLayersContainer.addChild(this.frontChipsLayer);
        this.chipLayersContainer.addChild(this.veryFrontChipsLayer);
        this.chipLayersContainer.addChild(this.particlesLayer);
        //hz
        this.loadLayout(this.layout, this);
        this.findGUIObject("pause").setHandler(function() {
            return _this.onPauseClick();
        });
        this.scoreLabel = this.findGUIObject("score");
        this.findGUIObject("level").setText((PlayState.level + 1).toString());
        this.oxygenBar = this.findGUIObject("oxygen");
        this.oxygenRed = this.findGUIObject("oxygen_red");
        this.spawnDefinedChips(GameData.getInstance().getLevelDef(PlayState.level));
        var logo = new DNLogoPlaceholder(200, 60);
        this.addGuiObject(logo);
        logo.x = Constants.ASSETS_WIDTH / 2;
        logo.y = 760;
        this.addChild(logo);
        if (PlayState.level == 0) {
            this.tutorial = new Tutorial();
            this.addGameObject(this.tutorial);
        }
        DNGameConfig.levelStart(level);
        this.update(0);
    }
    PlayState.prototype.querySpawnNewChips = function(count) {
        this.spawnQueries += count;
    };
    PlayState.prototype.showHint = function() {
        if (this.hintChips.length == 0) {
            for (var x = 0; x < this.fieldWidth; x++) {
                for (var y = 0; y < this.fieldHeight; y++) {
                    if (this.field[x][y] != null) {
                        this.group = new Array();
                        this.fillGroup(this.field[x][y], this.field[x][y].getColorID());
                        if (this.group.length >= 3) {
                            //  error here ????!!!! need copy
                            this.hintChips = this.group;
                            return;
                        }
                    }
                }
            }
        }
    };
    PlayState.prototype.hideHint = function() {
        if (this.hintChips.length != 0) {
            for (var i = 0; i < this.hintChips.length; i++) {
                this.hintChips[i].stopBlink();
            }
            this.hintChips = new Array();
        }
    };
    PlayState.prototype.onPauseClick = function() {
        DNStateManager.g_instance.pushState(new PauseState());
    };
    PlayState.prototype.createChip = function(x, y, delay) {
        var id = Utils.RandomRangeInt(1, this.chipTypesCount);
        var chip = new Chip(id, x, y, this.getYPosByYIndex(y), delay + Utils.RandomRange(-0.09, 0.09));
        chip.setIncexes(x, y);
        this.addGameObjectAtPos(chip, this.backChipsLayer, this.getXPosByXIndex(x), Constants.ASSETS_HEIGHT + Constants.CELL_SIZE);
        this.backChipsLayer.addChildAt(chip, 0);
        this.field[x][y] = chip;
    };
    PlayState.prototype.createChipWithColorID = function(x, y, delay, id) {
        if (id == 0) {
            return;
        }
        var chip = new Chip(id, x, y, this.getYPosByYIndex(y), delay);
        chip.setIncexes(x, y);
        this.addGameObjectAtPos(chip, this.backChipsLayer, this.getXPosByXIndex(x), -Constants.CELL_SIZE);
        this.backChipsLayer.addChildAt(chip, 0);
        this.field[x][y] = chip;
        if (id == 9) {
            chip.convertToMonster();
        }
        if (id == 8) {
            chip.convertToBonus(Chip.BONUS_BOMB);
        }
        if (id == 7) {
            chip.convertToBonus(Chip.BONUS_LINE);
        }
        if (id == 6) {
            chip.convertToBonus(Chip.BONUS_VERT);
        }
        chip.moveRightPosition();
    };
    PlayState.prototype.getXPosByXIndex = function(x) {
        return x * Constants.CELL_SIZE + Constants.CELL_SIZE / 2 + Constants.FIELD_OFFSET_X;
    };
    PlayState.prototype.getYPosByYIndex = function(y) {
        return y * Constants.CELL_SIZE + Constants.CELL_SIZE / 2 + Constants.FIELD_OFFSET_Y;
    };
    PlayState.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.inputStateTime += dt;
        if (this.waitWin) {
            this.waitWinTime += dt;
            if (this.waitWinTime > 2.4) {
                var stars_count = 0;
                if (this.timeLeft >= this.timeLeftTotal / 2) {
                    stars_count = 3;
                } else if (this.timeLeft >= this.timeLeftTotal / 4) {
                    stars_count = 2;
                } else {
                    stars_count = 1;
                }
                DNStateManager.g_instance.pushState(new WinState(this.score, PlayState.level, stars_count));
                return;
            }
        }
        if (this.waitLose) {
            this.waitLoseTime += dt;
            if (this.waitLoseTime > 2.4) {
                DNStateManager.g_instance.pushState(new LoseState(PlayState.level, this.score));
                return;
            }
        }
        if (!this.tutorial) {
            this.timeLeft -= dt;
            this.oxygenBar.setProgress(this.timeLeft / this.timeLeftTotal);
        }
        if (this.timeLeft < 10) {
            this.oxygenRed.alpha = 0.5 + Math.sin(this.liveTime * 12) * 0.5;
            if (!this.waitLose) {
                this.oxygenRed.visible = true;
            }
        } else {
            this.oxygenRed.visible = false;
        }
        switch (this.inputState) {
            case this.INPUT_STATE_WAIT_ACTION:
                if (this.inputStateTime > Constants.HINT_DELAY && !this.tutorial) {
                    this.showHint();
                    if (this.hintChips.length != 0) {
                        for (var i = 0; i < this.hintChips.length; i++) {
                            this.hintChips[i].blink(this.inputStateTime - Constants.HINT_DELAY);
                        }
                    }
                }
                break;
            case this.INPUT_STATE_WAIT_SPAWN:
                if (this.allChipsNormal()) {
                    this.setInpunState(this.INPUT_STATE_WAIT_ACTION);
                }
                break;
            case this.INPUT_STATE_DELAY:
                {
                    if (this.inputStateTime > this.timeDelay) {
                        this.inputState = "";
                        this.shiftChips();
                    }
                }
                break;
            case this.INPUT_STATE_SHIFT:
                if (this.allChipsNormal()) {
                    if (this.spawnQueries != 0) {
                        this.spawnNewChips(this.spawnQueries);
                        this.spawnQueries = 0;
                    } else {
                        this.onShiftEnded();
                        this.setInpunState(this.INPUT_STATE_WAIT_ACTION);
                    }
                }
                break;
        }
        //  update score label
        if (this.tmpScore < this.score) {
            this.tmpScore += 17;
            if (this.tmpScore > this.score) {
                this.tmpScore = this.score;
            }
            var str_score = this.tmpScore.toString();
            switch (str_score.length) {
                case 1:
                    str_score = "00000" + str_score;
                    break;
                case 2:
                    str_score = "0000" + str_score;
                    break;
                case 3:
                    str_score = "000" + str_score;
                    break;
                case 4:
                    str_score = "00" + str_score;
                    break;
                case 5:
                    str_score = "0" + str_score;
                    break;
                case 6:
                    break;
            }
            this.scoreLabel.setText(str_score);
        }
    };
    PlayState.prototype.addBubblesAt = function(x, y) {
        var count = Utils.RandomRangeInt(2, 6);
        for (var i = 0; i < count; i++) {
            this.addGameObjectAtPos(new BubbleQuick(), this, x + Utils.RandomRange(-Constants.CELL_SIZE / 2, +Constants.CELL_SIZE / 2), y + Utils.RandomRange(-Constants.CELL_SIZE / 2, +Constants.CELL_SIZE / 2));
        }
    };
    PlayState.prototype.addPlusToRandomChip = function(from_x, from_y) {
        var chip = null;
        if (this.tutorial) {
            chip = this.field[5][3];
        } else {
            var all = this.collectNormalChipsToArray();
            if (all.length != 0) {
                chip = all[Utils.RandomRangeInt(0, all.length - 1)];
            }
        }
        if (chip) {
            //chip.addPlus();
            var add_star_effect = new AddStarEffect(chip);
            this.addGameObjectAtPos(add_star_effect, this, from_x, from_y);
            add_star_effect.initSpeed();
        }
    };
    PlayState.prototype.allChipsNormal = function() {
        for (var x = 0; x < this.fieldWidth; x++) {
            for (var y = 0; y < this.fieldHeight; y++) {
                if (this.field[x][y] != null && !this.field[x][y].isNormal()) {
                    return false;
                }
            }
        }
        return true;
    };
    PlayState.prototype.needSpawn = function() {
        for (var x = 0; x < this.fieldWidth; x++) {
            for (var y = 0; y < this.fieldHeight; y++) {
                if (this.field[x][y] == null) {
                    return true;
                }
            }
        }
        return false;
    };
    PlayState.prototype.addConverToBonusEffect = function(chip) {
        var effect = new AutoreleaseEffect("transform_", 11, 0.045);
        //  ???
        effect.scaleX = effect.scaleY = 1.3;
        this.addGameObjectAtPos(effect, this, chip.x, chip.y);
        chip.setEffect(effect);
    };
    //  first parameter - bonus chip
    PlayState.prototype.matchBonus = function(bonus_chip) {
        switch (bonus_chip.getBonusType()) {
            case Chip.BONUS_BOMB:
                this.boom(bonus_chip);
                break;
            case Chip.BONUS_LINE:
                this.killLine(bonus_chip);
                break;
            case Chip.BONUS_VERT:
                this.killVertLine(bonus_chip);
                break;
        }
        bonus_chip.match(Chip.MATCH_I_AM_BONUS);
    };
    PlayState.prototype.killLine = function(chip) {
        var chip_y = chip.getIndexY();
        for (var i = 0; i < this.fieldWidth; i++) {
            if (this.validCoords(i, chip_y) && this.field[i][chip_y] != null) {
                this.field[i][chip_y].match(Chip.MATCH_REASON_BONUS_LINE, Constants.CELL_SIZE / 1200 * i);
            }
        }
        //  ??
        this.addGameObjectAtPos(new KillLineEffect(false), this, -250, chip.y);
        DNSoundManager.g_instance.play(Sounds.LINE);
        this.delayForTime(0.6);
    };
    PlayState.prototype.killVertLine = function(chip) {
        var chip_x = chip.getIndexX();
        for (var i = 0; i < 6; i++) {
            this.addGameObjectAt(new FishEater(chip.x), this);
        }
        for (var i = 0; i < this.fieldHeight; i++) {
            if (this.validCoords(chip_x, i) && this.field[chip_x][i] != null) {
                this.field[chip_x][i].match(Chip.MATCH_REASON_BONUS_LINE, 0.13 * (this.fieldHeight - i));
            }
        }
        //  add effect here
        DNSoundManager.g_instance.play(Sounds.LINE);
        this.delayForTime(0.6);
    };
    PlayState.prototype.delayForTime = function(time) {
        this.timeDelay = time;
        this.setInpunState(this.INPUT_STATE_DELAY);
    };
    PlayState.prototype.boom = function(chip) {
        DNSoundManager.g_instance.play(Sounds.BOMB, 0.8);
        this.addGameObject(new Shaker(this.chipLayersContainer));
        var chip_x = chip.getIndexX();
        var chip_y = chip.getIndexY();
        var damage_zone = [
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0],
        ];
        var radius = 1;
        for (var x = 0; x < 5; x++) {
            for (var y = 0; y < 5; y++) {
                if (damage_zone[x][y] != 0) {
                    var new_x = chip_x + x - 2;
                    var new_y = chip_y + y - 2;
                    if (this.validCoords(new_x, new_y) && this.field[new_x][new_y] != null) {
                        this.field[new_x][new_y].match(Chip.MATCH_REASON_BONUS);
                    }
                }
            }
        }
        var effect = new AutoreleaseEffect("explosion_", 11, 0.05);
        effect.scaleX = effect.scaleY = 1.8;
        this.addGameObjectAtPos(effect, this, chip.x, chip.y);
        //this.addGameObjectAtPos(new RingEffect(), this, chip.x, chip.y);
    };
    PlayState.prototype.validCoords = function(x, y) {
        return x >= 0 && x < this.fieldWidth && y >= 0 && y < this.fieldHeight;
    };
    PlayState.prototype.onMouseUp = function(x, y) {
        _super.prototype.onMouseUp.call(this, x, y);
    };
    PlayState.prototype.collectNormalChipsToArray = function() {
        var all = new Array();
        for (var x = 0; x < this.fieldWidth; x++) {
            for (var y = 0; y < this.fieldHeight; y++) {
                if (this.field[x][y] != null && !this.field[x][y].isBonus() && !this.field[x][y].isMonster() && !this.field[x][y].havePlus()) {
                    all.push(this.field[x][y]);
                }
            }
        }
        return all;
    };
    PlayState.prototype.checkWin = function() {
        if (this.waitWin || this.waitLose) {
            return;
        }
        for (var x = 0; x < this.fieldWidth; x++) {
            for (var y = 0; y < this.fieldHeight; y++) {
                if (this.field[x][y] != null && this.field[x][y].isMonster()) {
                    return;
                }
            }
        }
        DNSoundManager.g_instance.play(Sounds.WIN, 0.2);
        this.waitWin = true;
        this.setInpunState(this.INPUT_STATE_LOCK);
        this.addGameObjectAt(new EndLevelEffect(Strings.LEVEL_COMPLETED), this);
    };
    //  move to match func
    PlayState.prototype.checkLose = function() {
        if (this.waitWin || this.waitLose) {
            return;
        }
        if (this.spawnQueries != 0) {
            return;
        }
        if (this.timeLeft < 0) {
            this.addGameObjectAt(new EndLevelEffect(Strings.OUT_OF_AIR), this);
            this.addChild(this.oxygenBar);
            createjs.Tween.get(this.oxygenBar).to({
                x: 280,
                y: 220
            }, 450, createjs.Ease.circOut).to({
                scaleX: 1.4,
                scaleY: 1.4
            }, 450, createjs.Ease.circOut).wait(1000).to({
                alpha: 0
            }, 450, createjs.Ease.linear);
            this.oxygenRed.visible = false;
            this.lose();
            return;
        }
        var monsters_count = 0;
        for (var x = 0; x < this.fieldWidth; x++) {
            for (var y = 0; y < this.fieldHeight; y++) {
                if (this.field[x][y] != null) {
                    if (this.field[x][y].isBonus()) {
                        return;
                    }
                    if (this.field[x][y].isMonster()) {
                        monsters_count++;
                    }
                    this.group = new Array();
                    this.fillGroup(this.field[x][y], this.field[x][y].getColorID());
                    if (this.group.length >= 3) {
                        return;
                    }
                }
            }
        }
        //  check another shift available
        var shift_available = false;
        for (var x = 0; x < this.fieldWidth; x++) {
            if (this.field[x][0] && this.field[x][0].isMonster()) {
                shift_available = true;
                break;
            }
        }
        if (monsters_count != 0 && !shift_available) {
            this.addGameObjectAt(new EndLevelEffect(Strings.OUT_OF_MOVES), this);
            this.lose();
        }
    };
    PlayState.prototype.lose = function() {
        DNSoundManager.g_instance.play(Sounds.LOSE, 0.5);
        this.waitLose = true;
        this.setInpunState(this.INPUT_STATE_LOCK);
        for (var x = 0; x < this.fieldWidth; x++) {
            for (var y = 0; y < this.fieldHeight; y++) {
                if (this.field[x][y] && this.field[x][y].isMonster()) {
                    this.field[x][y].sink();
                }
            }
        }
    };
    PlayState.prototype.onMouseDown = function(x, y) {
        _super.prototype.onMouseDown.call(this, x, y);
        y -= this.y;
        if (this.inputState != this.INPUT_STATE_WAIT_ACTION) {
            return;
        }
        if (this.tutorial) {
            if (this.tutorial.onTap()) {
                return;
            }
        }
        var new_group = this.getMatchGroupAt(x, y);
        if (new_group.length > 0) {
            if (new_group[0].isBonus()) {
                this.matchBonus(new_group[0]);
                this.shiftChips();
                return;
            }
        }
        if (new_group.length >= 3) {
            DNSoundManager.g_instance.play([Sounds.MATCH_1, Sounds.MATCH_2, Sounds.MATCH_3][Utils.RandomRangeInt(0, 2)], 0.8);
            var need_add_plus = false;
            if (new_group.length >= 10) {
                if (this.tutorial) {
                    this.field[4][0].convertToBonus(Chip.BONUS_BOMB);
                } else {
                    new_group[Utils.RandomRangeInt(0, new_group.length - 1)].convertToBonus(Chip.BONUS_BOMB);
                }
            } else if (new_group.length >= 8) {
                if (Math.random() < 0.5) {
                    new_group[Utils.RandomRangeInt(0, new_group.length - 1)].convertToBonus(Chip.BONUS_VERT);
                } else {
                    new_group[Utils.RandomRangeInt(0, new_group.length - 1)].convertToBonus(Chip.BONUS_LINE);
                }
            } else if (new_group.length >= 5) {
                need_add_plus = true;
            }
            var score_x = 0;
            var score_y = 0;
            for (var i = 0; i < new_group.length; i++) {
                if (!new_group[i].isBonus()) {
                    new_group[i].match(Chip.MATCH_REASON_SIMPLE);
                    score_x += new_group[i].x;
                    score_y += new_group[i].y;
                }
            }
            score_x /= new_group.length;
            score_y /= new_group.length;
            this.addPointsAtPos(score_x, score_y, new_group.length);
            if (need_add_plus) {
                this.addPlusToRandomChip(score_x, score_y);
            }
            this.shiftChips();
        } else {}
    };
    PlayState.prototype.addPlusEffectAt = function(x, y) {
        this.addGameObjectAtPos(new PlusEffect(), this, x, y);
        //for (var i: number = 0; i < this.fieldWidth; i++)
        //{
        //    this.addGameObjectAtPos(new PlusEffect(), this, this.getXPosByXIndex(i), 750);
        //}
    };
    PlayState.prototype.compareGroups = function(group_1, group_2) {
        if (group_1.length != group_2.length) {
            return false;
        }
        if (group_1.length == 0) {
            return false;
        }
        var chip = group_1[0];
        for (var i = 0; i < group_2.length; i++) {
            if (chip == group_2[i]) {
                return true;
            }
        }
        return false;
    };
    PlayState.prototype.findChipAt = function(x, y) {
        for (var x_ind = 0; x_ind < this.fieldWidth; x_ind++) {
            for (var y_ind = 0; y_ind < this.fieldHeight; y_ind++) {
                var chip = this.field[x_ind][y_ind];
                if (chip != null) {
                    if (x >= chip.x - Constants.CELL_SIZE / 2 && x <= chip.x + Constants.CELL_SIZE / 2 && y >= chip.y - Constants.CELL_SIZE / 2 && y <= chip.y + Constants.CELL_SIZE / 2) {
                        return chip;
                    }
                }
            }
        }
        return null;
    };
    PlayState.prototype.getMatchGroupAt = function(x, y) {
        this.group = new Array();
        var first_chip = this.findChipAt(x, y);
        if (this.tutorial) {
            if (!this.tutorial.isAccessibleChip(first_chip)) {
                return [];
            }
        }
        if (first_chip && first_chip.getColorID() != Constants.UNIVERSAL_COLOR_ID) {
            this.fillGroup(first_chip, first_chip.getColorID());
        }
        return this.group;
    };
    PlayState.prototype.matchColors = function(color_1, color_2) {
        return color_1 == color_2 || color_1 == Constants.UNIVERSAL_COLOR_ID || color_2 == Constants.UNIVERSAL_COLOR_ID;
    };
    PlayState.prototype.fillGroup = function(chip, color) {
        if (this.group.indexOf(chip) != -1) {
            return;
        }
        this.group.push(chip);
        var x = chip.getIndexX();
        var y = chip.getIndexY();
        if (color == -1) {
            //  only 1 chip in group
            return;
        }
        //  left
        if (x > 0) {
            if (this.field[x - 1][y] && this.matchColors(this.field[x - 1][y].getColorID(), color)) {
                this.fillGroup(this.field[x - 1][y], color);
            }
        }
        //  right
        if (x < this.fieldWidth - 1) {
            if (this.field[x + 1][y] && this.matchColors(this.field[x + 1][y].getColorID(), color)) {
                this.fillGroup(this.field[x + 1][y], color);
            }
        }
        //  top
        if (y > 0) {
            if (this.field[x][y - 1] && this.matchColors(this.field[x][y - 1].getColorID(), color)) {
                this.fillGroup(this.field[x][y - 1], color);
            }
        }
        //  right
        if (y < this.fieldHeight - 1) {
            if (this.field[x][y + 1] && this.matchColors(this.field[x][y + 1].getColorID(), color)) {
                this.fillGroup(this.field[x][y + 1], color);
            }
        }
    };
    PlayState.prototype.shiftChips = function() {
        if (this.inputState == this.INPUT_STATE_DELAY) {
            return;
        }
        for (var x_index = 0; x_index < this.fieldWidth; x_index++) {
            var holes_count = 0;
            for (var y_index = 0; y_index < this.fieldHeight; y_index++) {
                if (this.field[x_index][y_index] == null) {
                    holes_count++;
                } else if (holes_count != 0) {
                    var new_y_index = y_index - holes_count;
                    this.field[x_index][y_index].shiftDown(new_y_index, this.getYPosByYIndex(new_y_index));
                    this.field[x_index][new_y_index] = this.field[x_index][y_index];
                    this.field[x_index][y_index] = null;
                }
            }
        }
        this.setInpunState(this.INPUT_STATE_SHIFT);
    };
    PlayState.prototype.spawnDefinedChips = function(defines) {
        var spawned_count = 0;
        for (var x = 0; x < this.fieldWidth; x++) {
            var count = -1;
            for (var y = this.fieldHeight - 1; y >= 0; y--) {
                if (this.field[x][y] == null) {
                    if (count == -1) {
                        count = y;
                    }
                    spawned_count++;
                    this.createChipWithColorID(x, y, 0, defines[y][x]);
                    //  max in range 1-5
                    if (defines[y][x] <= 5) {
                        this.chipTypesCount = Math.max(defines[y][x], this.chipTypesCount);
                    }
                }
            }
        }
        this.setInpunState(this.INPUT_STATE_WAIT_SPAWN);
    };
    PlayState.prototype.spawnNewChips = function(max_count) {
        var spawned_count = 0;
        for (var x = 0; x < this.fieldWidth; x++) {
            var count = -1;
            var count_in_column = 0;
            //  check monster
            var was_monster = false;
            for (var i = 0; i < this.fieldHeight; i++) {
                if (this.field[x][i] != null && this.field[x][i].isMonster()) {
                    was_monster = true;
                    break;
                }
            }
            if (was_monster) {
                continue;
            }
            for (var y = 0; y < this.fieldHeight; y++) {
                if (this.field[x][y] == null) {
                    if (count == -1) {
                        count = y;
                    }
                    spawned_count++;
                    this.createChip(x, y, (y - count) * 0.21);
                    if (++count_in_column >= max_count) {
                        break;
                    }
                }
            }
        }
        this.setInpunState(this.INPUT_STATE_WAIT_SPAWN);
    };
    PlayState.prototype.setInpunState = function(state) {
        if (this.inputState == this.INPUT_STATE_WAIT_SPAWN && this.tutorial) {
            this.tutorial.onSpawnEnded();
        }
        //  ololo
        if (this.inputState == this.INPUT_STATE_DELAY) {
            return;
        }
        this.inputState = state;
        this.inputStateTime = 0.0;
        if (state != this.INPUT_STATE_WAIT_ACTION) {
            this.hideHint();
        }
        if (state == this.INPUT_STATE_SHIFT) {
            if (this.tutorial) {
                this.tutorial.onMatch();
            }
        }
    };
    PlayState.prototype.clearCell = function(chip) {
        var x = chip.getIndexX();
        var y = chip.getIndexY();
        if (this.field[x][y] == chip) {
            this.field[x][y] = null;
        }
    };
    PlayState.prototype.addPointsAtPos = function(x, y, count) {
        var score = Math.min(500, Math.max(50, count * 30));
        var points = new FlyingPoints(score);
        this.addGameObjectAtPos(points, this, x, y);
        points.scaleX = points.scaleY = 1.4;
        this.score += score;
    };
    PlayState.prototype.tryShowSuperb = function(x, y) {
        return true;
    };
    PlayState.prototype.getColorAt = function(x, y) {
        if (x < 0 || y < 0 || x >= this.fieldWidth || y >= this.fieldHeight || !this.field[x][y]) {
            return -1;
        }
        return this.field[x][y].getColorID();
    };
    PlayState.prototype.onShiftEnded = function() {
        this.checkLose();
    };
    PlayState.prototype.playFreedomSound = function() {
        if (this.liveTime != this.lastFreedomSoundTime) {
            this.lastFreedomSoundTime = this.liveTime;
            if (Math.random() < 0.5) {
                DNSoundManager.g_instance.play(Sounds.FREEDOM_2, 0.6);
            } else {
                DNSoundManager.g_instance.play(Sounds.FREEDOM_1, 0.6);
            }
        }
    };
    PlayState.prototype.configureYAlign = function() {
        if (Constants.SCREEN_HEIGHT < Constants.ASSETS_HEIGHT) {
            this.y = Constants.SCREEN_HEIGHT - Constants.ASSETS_HEIGHT;
        } else if (Constants.SCREEN_HEIGHT > Constants.ASSETS_HEIGHT) {
            this.y = (Constants.SCREEN_HEIGHT - Constants.ASSETS_HEIGHT) / 2;
        }
    };
    PlayState.prototype.moveChipFront = function(chip) {
        this.frontChipsLayer.addChild(chip);
    };
    PlayState.prototype.highlightArea = function(x1, y1, x2, y2) {
        var sz = Constants.CELL_SIZE / 2;
        var gap = 6;
        var left = this.getXPosByXIndex(x1) - sz - gap;
        var top = this.getYPosByYIndex(y1) - sz - gap;
        var right = this.getXPosByXIndex(x2) - sz + gap;
        var bottom = this.getYPosByYIndex(y2) - sz + gap;
        var highlighter = new TutorialHighlighter(left, top - gap, right, bottom + gap);
        this.addGameObjectAt(highlighter, this);
        return highlighter;
    };
    PlayState.prototype.onPause = function() {
        this.onPauseClick();
    };
    PlayState.prototype.onRestart = function() {
        DNStateManager.g_instance.pushState(new ShadeInState(new PlayState(-1)));
    };
    PlayState.level = -1;
    return PlayState;
})(DNGameState);
/// <reference path="references.ts" />
var PlusEffect = (function(_super) {
    __extends(PlusEffect, _super);

    function PlusEffect() {
        var _this = this;
        _super.call(this);
        this.addChild(DNAssetsManager.g_instance.getCenteredImageWithProxy(Images.PLUS));
        createjs.Tween.get(this).to({
            scaleX: 1.7,
            scaleY: 1.7
        }, 400, createjs.Ease.backOut);
        createjs.Tween.get(this).wait(400).to({
            alpha: 0
        }, 400, createjs.Ease.linear).call(function() {
            return _this.kill();
        });
        createjs.Tween.get(this, {
            loop: true
        }).wait(400).to({
            rotation: 180
        }, 400, createjs.Ease.linear);
    }
    return PlusEffect;
})(DNGameObject);
/// <reference path="references.ts" />
var PreloaderState = (function(_super) {
    __extends(PreloaderState, _super);

    function PreloaderState(manifest, sound_manifest, athlases, localizable_images) {
        var _this = this;
        _super.call(this);
        this.loadingBar = new DNLoadingBar("#038579", "#ffffff", "#AAFFAA");
        this.logo = new DNLogoPlaceholder(400, 130);
        this.addChild(this.loadingBar);
        this.loadingBar.x = Constants.ASSETS_WIDTH / 2;
        this.loadingBar.y = Constants.ASSETS_HEIGHT / 2;
        this.addChild(this.logo);
        this.logo.x = Constants.ASSETS_WIDTH / 2;
        this.logo.y = Constants.ASSETS_HEIGHT / 2 + 200;
        new DNAssetsManager(manifest, sound_manifest, athlases, localizable_images, function(e) {
            return _this.handleProgress(e);
        });
    }
    PreloaderState.prototype.handleProgress = function(e) {
        this.loadingBar.setProgress(e.loaded);
    };
    PreloaderState.prototype.onOrientationChanged = function(is_landscape) {
        //  do nothing
    };
    return PreloaderState;
})(DNGameState);
/// <reference path="references.ts" />
var SeeWaves = (function(_super) {
    __extends(SeeWaves, _super);

    function SeeWaves(id) {
        _super.call(this);
        this.wave1_0 = DNAssetsManager.g_instance.getImage("wave_" + id);
        this.wave1_1 = DNAssetsManager.g_instance.getImage("wave_" + id);
        this.wave2_0 = DNAssetsManager.g_instance.getImage("wave_" + id);
        this.wave2_1 = DNAssetsManager.g_instance.getImage("wave_" + id);
        this.addChild(this.wave2_0);
        this.addChild(this.wave2_1);
        this.wave2_1.x = Constants.ASSETS_WIDTH;
        this.addChild(this.wave1_0);
        this.addChild(this.wave1_1);
        this.wave1_1.x = Constants.ASSETS_WIDTH;
        this.wave1_0.y = this.wave1_1.y = 15;
    }
    SeeWaves.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        var speed_1 = 30 * dt;
        var speed_2 = 15 * dt;
        this.wave1_0.x += speed_1;
        if (this.wave1_0.x > Constants.ASSETS_WIDTH) {
            this.wave1_0.x -= Constants.ASSETS_WIDTH * 2;
        }
        this.wave1_1.x += speed_1;
        if (this.wave1_1.x > Constants.ASSETS_WIDTH) {
            this.wave1_1.x -= Constants.ASSETS_WIDTH * 2;
        }
        //---------------------------------------
        this.wave2_0.x += speed_2;
        if (this.wave2_0.x > Constants.ASSETS_WIDTH) {
            this.wave2_0.x -= Constants.ASSETS_WIDTH * 2;
        }
        this.wave2_1.x += speed_2;
        if (this.wave2_1.x > Constants.ASSETS_WIDTH) {
            this.wave2_1.x -= Constants.ASSETS_WIDTH * 2;
        }
    };
    return SeeWaves;
})(DNGameObject);
/// <reference path="references.ts" />
var SelectLevelButton = (function(_super) {
    __extends(SelectLevelButton, _super);

    function SelectLevelButton(num, locked) {
        //super(locked ? Images.LEVEL_LOCKED : Images.LEVEL_BUTTON, () => DNStateManager.g_instance.pushState(new TransitionInState(new PlayState(num))));
        _super.call(this, Images.LEVEL_BUTTON, function() {
            return DNStateManager.g_instance.pushState(new TransitionInState(new PlayState(num)));
        });
        this.locked = false;
        this.offs = Utils.RandomRange(0, 10);
        this.locked = locked;
        this.levelNum = num;
        if (!this.locked) {
            this.text = new DNBitmapLabel(Fonts.fontGreen, (num + 1).toString());
            this.getPicture().addChild(this.text);
            this.text.y = -36;
            this.text.scaleX = this.text.scaleY = 0.8;
            var stars_count = GameData.getInstance().getStarsInLevel(num);
            if (stars_count != 0) {
                var scales = [0.4, 0.4, 0.4];
                for (var i = 0; i < 3; i++) {
                    var star = DNAssetsManager.g_instance.getCenteredImageWithProxy((i < stars_count) ? Images.STAR_ON : Images.STAR_OFF);
                    star.x = -20 + i * 20;
                    //star.y = -2;
                    star.y = 13;
                    star.scaleX = star.scaleY = scales[i];
                    this.getPicture().addChild(star);
                }
            }
        } else {
            this.visible = false;
        }
        this.update(0);
    }
    SelectLevelButton.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        this.getPicture().y = Math.sin(this.liveTime * 2 + this.offs) * 2.5;
    };
    SelectLevelButton.prototype.onMouseDown = function(x, y) {
        if (this.locked) {
            return;
        }
        _super.prototype.onMouseDown.call(this, x, y);
        this.touchX = x;
    };
    SelectLevelButton.prototype.onMouseUp = function(x, y) {
        if (Math.abs(x - this.touchX) > 30) {
            this.deselect();
            return;
        }
        _super.prototype.onMouseUp.call(this, x, y);
    };
    return SelectLevelButton;
})(DNJellyButton);
/// <reference path="references.ts" />
var SelectLevelState = (function(_super) {
    __extends(SelectLevelState, _super);

    function SelectLevelState(last_level_num) {
        var _this = this;
        _super.call(this);
        this.layout = [{
                type: Layouts.TYPE_STATIC_PICTURE,
                picture: Images.MAP_PANEL,
                x: 300,
                y: 31,
                children: [{
                        type: Layouts.TYPE_BITMAP_LABEL,
                        x: -80,
                        y: -10,
                        font: Fonts.fontGUI,
                        name: "stars",
                        max_scale: 0.78,
                    },
                    {
                        type: Layouts.TYPE_BITMAP_LABEL,
                        x: 170,
                        y: -10,
                        font: Fonts.fontGUI,
                        name: "score",
                        text: "000000",
                        max_scale: 0.78,
                    },
                    {
                        type: Layouts.TYPE_BITMAP_LABEL,
                        x: 60,
                        y: -10,
                        font: Fonts.fontGUI,
                        text: "score:",
                        max_scale: 0.78,
                    },
                ]
            },
            {
                type: Layouts.TYPE_LOGO_PLACEHOLDER,
                x: 590,
                y: 45,
                max_width: 140,
                max_height: 70,
            },
            {
                type: Layouts.TYPE_FANCY_BUTTON,
                picture: Images.BUTTON_EXIT,
                x: 59,
                y: 50,
                name: "exit",
            },
        ];
        this.touchPointY = 0;
        this.touchPointX = 0;
        this.layer = new createjs.Container();
        this.xSpeed = 0;
        this.xAcc = 1000;
        this.calcSpeedCache = 0;
        this.slidePositions = new Array();
        this.mapH = Constants.ASSETS_HEIGHT * 1;
        this.mapW = Constants.ASSETS_WIDTH * 3;
        this.levelsPositions = [
            74,
            150,
            132,
            220,
            206,
            290,
            223,
            379,
            178,
            466,
            110,
            541,
            128,
            626,
            225,
            667,
            355,
            603,
            411,
            505,
            473,
            417,
            429,
            328,
            395,
            220,
            366,
            122,
            461,
            99,
            552,
            99,
            626,
            157,
            650,
            271,
            650,
            372,
            621,
            477,
            568,
            579,
            621,
            674,
            730,
            709,
            835,
            663,
            872,
            565,
            914,
            470,
            840,
            398,
            778,
            303,
            821,
            209,
            895,
            139,
            990,
            119,
            1084,
            140,
            1164,
            209,
            1196,
            310,
            1173,
            411,
            1094,
            477,
            1051,
            582,
            1132,
            642,
            1234,
            701,
            1328,
            742,
            1413,
            704,
            1402,
            598,
            1450,
            500,
            1393,
            411,
            1423,
            307,
            1382,
            202,
            1467,
            146,
            1563,
            153,
            1637,
            212,
            1624,
            321,
            1690,
            405,
            1630,
            505,
            1704,
            564,
            1660,
            662,
            1737,
            732,
            1846,
            732,
            1946,
            693,
            1946,
            586,
            2017,
            491,
            1978,
            388,
        ];
        this.allButtons = new Array();
        //  bubbling
        this.addChild(this.layer);
        this.loadLayout(this.layout, this);
        for (var i = 0; i < 3; i++) {
            var map = DNAssetsManager.g_instance.getImage("map_" + (i + 1));
            this.layer.addChild(map);
            map.x = Constants.ASSETS_WIDTH * i;
        }
        this.findGUIObject("exit").setHandler(function() {
            return _this.onExitTouch();
        });
        this.findGUIObject("score").setText(Utils.GetScoreString(GameData.getInstance().getTotalScore()));
        this.findGUIObject("stars").setText(GameData.getInstance().getTotalStars() + "/" + GameData.getInstance().getMaximumStars());
        var offset_x = 0;
        var offset_y = 0;
        for (var i = 0; i < this.levelsPositions.length / 2; i++) {
            var button = new SelectLevelButton(i, i >= GameData.getInstance().levelsAvailable());
            this.addGuiObject(button);
            this.layer.addChild(button);
            button.x = this.levelsPositions[i * 2] + offset_x;
            button.y = this.levelsPositions[i * 2 + 1] + offset_y;
            this.allButtons.push(button);
        }
        var cur_level = (last_level_num ? last_level_num : GameData.getInstance().levelsAvailable() - 1);
        var active_button = this.allButtons[cur_level];
        this.layer.x = +Constants.ASSETS_WIDTH / 2 - active_button.x;
        this.checkConstrains();
    }
    SelectLevelState.prototype.onExitTouch = function() {
        DNStateManager.g_instance.pushState(new TransitionInState(new MainMenuState()));
    };
    SelectLevelState.prototype.onLevelTouch = function(level) {
        DNStateManager.g_instance.pushState(new ShadeInState(new PlayState(level)));
    };
    SelectLevelState.prototype.onMouseDown = function(x, y) {
        _super.prototype.onMouseDown.call(this, x, y);
        this.touchPointX = this.layer.x - x;
        this.touchPointY = this.layer.y - y;
        this.slidePositions.length = 0;
        this.slidePositions.push({
            liveTime: this.liveTime,
            y: y,
            x: x
        });
    };
    SelectLevelState.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        if (!DNStateManager.g_instance.isMouseDownNow()) {
            if (this.xSpeed != 0) {
                this.layer.x += this.xSpeed * dt;
                if (this.xSpeed > 0) {
                    this.xSpeed -= dt * this.xAcc;
                    if (this.xSpeed < 0) {
                        this.xSpeed = 0;
                    }
                } else {
                    this.xSpeed += dt * this.xAcc;
                    if (this.xSpeed > 0) {
                        this.xSpeed = 0;
                    }
                }
            }
        }
        this.checkConstrains();
    };
    SelectLevelState.prototype.onMouseMove = function(x, y) {
        _super.prototype.onMouseMove.call(this, x, y);
        this.layer.x = x + this.touchPointX;
        this.checkConstrains();
        this.slidePositions.push({
            liveTime: this.liveTime,
            x: x,
            y: y
        });
        if (this.slidePositions.length > 100) {
            this.calcSpeedCache = this.calcXSpeed();
            this.slidePositions.length = 0;
        }
    };
    SelectLevelState.prototype.checkConstrains = function() {
        if (this.layer.x > 0) {
            this.layer.x = 0;
            this.xSpeed = 0;
        }
        if (Constants.g_isPC) {
            if (this.layer.x < Constants.ASSETS_WIDTH - this.mapW) {
                this.layer.x = Constants.ASSETS_WIDTH - this.mapW;
                this.xSpeed = 0;
            }
        } else {
            if (this.layer.x < Constants.ASSETS_WIDTH - this.mapW) {
                this.layer.x = Constants.ASSETS_WIDTH - this.mapW;
                this.xSpeed = 0;
            }
        }
    };
    SelectLevelState.prototype.onMouseUp = function(x, y) {
        _super.prototype.onMouseUp.call(this, x, y);
        this.slidePositions.push({
            liveTime: this.liveTime,
            x: x,
            y: y
        });
        this.xSpeed = this.calcXSpeed();
    };
    SelectLevelState.prototype.calcXSpeed = function() {
        if (this.slidePositions.length < 2) {
            return this.calcSpeedCache;
        }
        var slide_time = 0.2;
        var i;
        for (i = this.slidePositions.length - 2; i > 0; --i) {
            if (this.liveTime - this.slidePositions[i]["liveTime"] >= slide_time) {
                break;
            }
        }
        var delay = this.liveTime - this.slidePositions[i]["liveTime"];
        if (delay < 0.00001) {
            return 0;
        }
        return (this.slidePositions[this.slidePositions.length - 1]["x"] - this.slidePositions[i]["x"]) / delay;
    };
    return SelectLevelState;
})(DNGameState);
/// <reference path="references.ts" />
var ShadeInState = (function(_super) {
    __extends(ShadeInState, _super);

    function ShadeInState(next_state) {
        var _this = this;
        _super.call(this);
        this.nextState = null;
        this.nextState = next_state;
        //  shading
        this.shader = new createjs.Shape();
        this.shader.graphics.beginFill("#ffffff");
        this.shader.graphics.drawRect(0, 0, Constants.ASSETS_WIDTH, Constants.SCREEN_HEIGHT);
        this.shader.graphics.endFill();
        this.addChild(this.shader);
        this.shader.alpha = 0;
        createjs.Tween.get(this.shader, {
            loop: false
        }).to({
            alpha: 1.0
        }, 400, createjs.Ease.linear).call(function() {
            return _this.onFinishShade();
        });
    }
    ShadeInState.prototype.onFinishShade = function() {
        DNStateManager.g_instance.changeState(this.nextState);
        DNStateManager.g_instance.pushState(new ShadeOutState());
    };
    ShadeInState.prototype.setNextState = function(state) {
        this.nextState = state;
    };
    ShadeInState.prototype.alignByCenter = function() {
        //  do nothing
    };
    return ShadeInState;
})(DNGameState);
/// <reference path="references.ts" />
var ShadeOutState = (function(_super) {
    __extends(ShadeOutState, _super);

    function ShadeOutState() {
        var _this = this;
        _super.call(this);
        //  shading
        this.shader = new createjs.Shape();
        this.shader.graphics.beginFill("#ffffff");
        this.shader.graphics.drawRect(0, 0, Constants.ASSETS_WIDTH, Constants.SCREEN_HEIGHT);
        this.shader.graphics.endFill();
        this.addChild(this.shader);
        createjs.Tween.get(this.shader, {
            loop: false
        }).to({
            alpha: 0
        }, 400, createjs.Ease.linear).call(function() {
            return _this.onFinishShade();
        });
    }
    ShadeOutState.prototype.onFinishShade = function() {
        DNStateManager.g_instance.popState();
    };
    ShadeOutState.prototype.alignByCenter = function() {
        //  do nothing
    };
    return ShadeOutState;
})(DNGameState);
/// <reference path="references.ts" />
var Shaker = (function(_super) {
    __extends(Shaker, _super);

    function Shaker(layer) {
        _super.call(this);
        this.counter = 0;
        this.deltaTime = 0.07;
        this.distance = 7;
        this.layerForShake = layer;
        this.startX = layer.x;
        this.startY = layer.y;
    }
    Shaker.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        if (this.liveTime >= this.deltaTime) {
            this.layerForShake.x = this.startX + Utils.RandomRangeInt(-this.distance, this.distance);
            this.layerForShake.y = this.startY + Utils.RandomRangeInt(-this.distance, this.distance);
            this.liveTime = 0;
            if (++this.counter == 7) {
                this.kill();
            }
        }
    };
    Shaker.prototype.onDead = function() {
        _super.prototype.onDead.call(this);
        this.layerForShake.x = this.startX;
        this.layerForShake.y = this.startY;
    };
    return Shaker;
})(DNGameObject);
/// <reference path="references.ts" />
var Sounds = (function() {
    function Sounds() {}
    Sounds.MUSIC = "music";
    Sounds.CLICK = "click";
    Sounds.MATCH_1 = "match_1";
    Sounds.MATCH_2 = "match_2";
    Sounds.MATCH_3 = "match_3";
    Sounds.LINE = "line";
    Sounds.WIN = "win";
    Sounds.LOSE = "fail";
    Sounds.BOMB = "bomb";
    Sounds.JUMP = "jump";
    Sounds.POPUP = "popup_window";
    Sounds.FREEDOM_1 = "freedom_1";
    Sounds.FREEDOM_2 = "freedom_2";
    Sounds.PLUS = "plus";
    return Sounds;
})();
/// <reference path="references.ts" />
var Strings = (function() {
    function Strings() {}
    Strings.TUTORIAL_1 = "TUTORIAL_1";
    Strings.TAP_ANYWHERE = "TAP_ANYWHERE";
    Strings.TUTORIAL_2 = "TUTORIAL_2";
    Strings.TUTORIAL_3 = "TUTORIAL_3";
    Strings.TUTORIAL_4 = "TUTORIAL_4";
    Strings.TUTORIAL_5 = "TUTORIAL_5";
    Strings.TUTORIAL_6 = "TUTORIAL_6";
    Strings.OUT_OF_AIR = "OUT_OF_AIR";
    Strings.OUT_OF_MOVES = "OUT_OF_MOVES";
    Strings.LEVEL_COMPLETED = "LEVEL_COMPLETED";
    return Strings;
})();
/// <reference path="references.ts" />
var TransitionInState = (function(_super) {
    __extends(TransitionInState, _super);

    function TransitionInState(next_state) {
        var _this = this;
        _super.call(this);
        this.nextState = null;
        this.nextState = next_state;
        var up_pic = DNAssetsManager.g_instance.getImage(Images.TRANSITION_UP);
        this.addChild(up_pic);
        up_pic.y = -up_pic.getBounds().height;
        createjs.Tween.get(up_pic).to({
            y: Constants.SCREEN_HEIGHT / 2 - up_pic.getBounds().height + 200
        }, Constants.TRANSITION_TIME, createjs.Ease.circOut);
        var down_pic = DNAssetsManager.g_instance.getImage(Images.TRANSITION_DOWN);
        this.addChild(down_pic);
        down_pic.y = Constants.SCREEN_HEIGHT;
        createjs.Tween.get(down_pic).to({
            y: Constants.SCREEN_HEIGHT / 2
        }, Constants.TRANSITION_TIME, createjs.Ease.circOut).wait(Constants.TRANSITION_PAUSE).call(function() {
            return _this.onEndTransition();
        });
        //SoundManager.g_instance.play(SoundManager.SOUND_CLOSE);
    }
    TransitionInState.prototype.onEndTransition = function() {
        DNStateManager.g_instance.changeState(this.nextState);
        DNStateManager.g_instance.pushState(new TransitionOutState());
    };
    TransitionInState.prototype.alignByCenter = function() {};
    return TransitionInState;
})(DNGameState);
/// <reference path="references.ts" />
var TransitionOutState = (function(_super) {
    __extends(TransitionOutState, _super);

    function TransitionOutState() {
        _super.call(this);
        var up_pic = DNAssetsManager.g_instance.getImage(Images.TRANSITION_UP);
        this.addChild(up_pic);
        up_pic.y = Constants.SCREEN_HEIGHT / 2 - up_pic.getBounds().height + 200;
        createjs.Tween.get(up_pic).to({
            y: -up_pic.getBounds().height
        }, Constants.TRANSITION_TIME, createjs.Ease.circIn);
        var down_pic = DNAssetsManager.g_instance.getImage(Images.TRANSITION_DOWN);
        this.addChild(down_pic);
        down_pic.y = Constants.SCREEN_HEIGHT / 2;
        createjs.Tween.get(down_pic).to({
            y: Constants.SCREEN_HEIGHT
        }, Constants.TRANSITION_TIME, createjs.Ease.circIn).call(function() {
            return DNStateManager.g_instance.popState();
        });
        //DNSoundManager.g_instance.play(SoundManager.SOUND_OPEN);
    }
    TransitionOutState.prototype.alignByCenter = function() {};
    return TransitionOutState;
})(DNGameState);
/// <reference path="references.ts" />
var Tutorial = (function(_super) {
    __extends(Tutorial, _super);

    function Tutorial() {
        _super.call(this);
        this.stage = -1;
        this.text = null;
        this.tapAnywhere = null;
        this.stage1LayoutAccessible = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];
        this.stage2LayoutAccessible = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];
        this.stage3LayoutAccessible = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];
        this.stage4LayoutAccessible = [
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];
        this.stage5LayoutAccessible = [
            [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];
    }
    Tutorial.prototype.onSpawnEnded = function() {
        if (this.stage == -1) {
            this.onMatch();
        }
    };
    Tutorial.prototype.onTap = function() {
        if (this.stage == 0) {
            this.onMatch();
            return true;
        }
        return false;
    };
    Tutorial.prototype.update = function(dt) {
        _super.prototype.update.call(this, dt);
        if (this.tapAnywhere && this.liveTime >= 0) {
            this.tapAnywhere.scaleX = this.tapAnywhere.scaleY = 0.96 + Math.cos(this.liveTime * 6) * 0.04;
        }
    };
    Tutorial.prototype.onMatch = function() {
        this.stage++;
        if (this.highlighter) {
            this.highlighter.hide();
            this.highlighter = null;
        }
        if (this.text) {
            this.text.parent.removeChild(this.text);
            this.text = null;
        }
        if (this.tapAnywhere) {
            this.tapAnywhere.parent.removeChild(this.tapAnywhere);
            this.tapAnywhere = null;
        }
        if (this.stage == 0) {
            this.highlighter = PlayState.g_instance.highlightArea(4, 7, 5, 8);
            this.text = new DNTextBox(Fonts.fontGreen, DNStringManager.getInstance().getString(Strings.TUTORIAL_1), 500, 1000);
            this.text.x = Constants.ASSETS_WIDTH / 2;
            this.text.y = 250;
            this.text.alpha = 0;
            PlayState.g_instance.addChild(this.text);
            createjs.Tween.get(this.text).wait(500).to({
                alpha: 1.0
            }, 600, createjs.Ease.linear);
            this.tapAnywhere = new DNTextBox(Fonts.fontGreen, DNStringManager.getInstance().getString(Strings.TAP_ANYWHERE), 500, 1000);
            this.tapAnywhere.x = Constants.ASSETS_WIDTH / 2;
            this.tapAnywhere.y = 450;
            this.tapAnywhere.alpha = 0;
            PlayState.g_instance.addChild(this.tapAnywhere);
            createjs.Tween.get(this.tapAnywhere).wait(500).to({
                alpha: 1.0
            }, 600, createjs.Ease.linear);
            this.liveTime = -1.1;
        }
        if (this.stage == 1) {
            this.highlighter = PlayState.g_instance.highlightArea(4, 5, 6, 7);
            this.text = new DNTextBox(Fonts.fontGreen, DNStringManager.getInstance().getString(Strings.TUTORIAL_2), 500, 1000);
            this.text.x = Constants.ASSETS_WIDTH / 2;
            this.text.y = 160;
            this.text.alpha = 0;
            PlayState.g_instance.addChild(this.text);
            createjs.Tween.get(this.text).wait(500).to({
                alpha: 1.0
            }, 600, createjs.Ease.linear);
        }
        if (this.stage == 2) {
            this.highlighter = PlayState.g_instance.highlightArea(3, 4, 7, 6);
            this.text = new DNTextBox(Fonts.fontGreen, DNStringManager.getInstance().getString(Strings.TUTORIAL_3), 500, 1000);
            this.text.x = Constants.ASSETS_WIDTH / 2;
            this.text.y = 560;
            this.text.alpha = 0;
            PlayState.g_instance.addChild(this.text);
            createjs.Tween.get(this.text).wait(500).to({
                alpha: 1.0
            }, 600, createjs.Ease.linear);
        }
        if (this.stage == 3) {
            this.highlighter = PlayState.g_instance.highlightArea(3, 3, 7, 4);
            this.text = new DNTextBox(Fonts.fontGreen, DNStringManager.getInstance().getString(Strings.TUTORIAL_4), 500, 1000);
            this.text.x = Constants.ASSETS_WIDTH / 2;
            this.text.y = 120;
            this.text.alpha = 0;
            PlayState.g_instance.addChild(this.text);
            createjs.Tween.get(this.text).wait(500).to({
                alpha: 1.0
            }, 600, createjs.Ease.linear);
        }
        if (this.stage == 4) {
            this.highlighter = PlayState.g_instance.highlightArea(2, 0, 8, 3);
            this.text = new DNTextBox(Fonts.fontGreen, DNStringManager.getInstance().getString(Strings.TUTORIAL_5), 500, 1000);
            this.text.x = Constants.ASSETS_WIDTH / 2;
            this.text.y = 420;
            this.text.alpha = 0;
            PlayState.g_instance.addChild(this.text);
            createjs.Tween.get(this.text).wait(500).to({
                alpha: 1.0
            }, 600, createjs.Ease.linear);
        }
        if (this.stage == 5) {
            this.highlighter = PlayState.g_instance.highlightArea(4, 0, 5, 1);
            this.text = new DNTextBox(Fonts.fontGreen, DNStringManager.getInstance().getString(Strings.TUTORIAL_6), 500, 1000);
            this.text.x = Constants.ASSETS_WIDTH / 2 - 30;
            this.text.y = 300;
            this.text.alpha = 0;
            PlayState.g_instance.addChild(this.text);
            createjs.Tween.get(this.text).wait(500).to({
                alpha: 1.0
            }, 600, createjs.Ease.linear);
        }
    };
    Tutorial.prototype.isAccessibleChip = function(chip) {
        if (!this.highlighter) {
            return true;
        }
        if (chip == null) {
            return false;
        }
        if (this.stage == 0) {
            return false;
        }
        if (this.stage == 1) {
            return this.stage1LayoutAccessible[chip.getIndexY()][chip.getIndexX()] != 0;
        }
        if (this.stage == 2) {
            return this.stage2LayoutAccessible[chip.getIndexY()][chip.getIndexX()] != 0;
        }
        if (this.stage == 3) {
            return this.stage3LayoutAccessible[chip.getIndexY()][chip.getIndexX()] != 0;
        }
        if (this.stage == 4) {
            return this.stage4LayoutAccessible[chip.getIndexY()][chip.getIndexX()] != 0;
        }
        if (this.stage == 5) {
            return this.stage5LayoutAccessible[chip.getIndexY()][chip.getIndexX()] != 0;
        }
        return true;
    };
    Tutorial.prototype.onDead = function() {
        _super.prototype.onDead.call(this);
        this.highlighter.hide();
        if (this.text) {
            this.text.parent.removeChild(this.text);
            this.text = null;
        }
    };
    return Tutorial;
})(DNGameObject);
/// <reference path="references.ts" />
var TutorialHighlighter = (function(_super) {
    __extends(TutorialHighlighter, _super);

    function TutorialHighlighter(left, top, right, bottom) {
        _super.call(this);
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
        var shape = new createjs.Shape();
        shape.graphics.beginFill("#000000");
        shape.graphics.drawRect(0, 0, Constants.ASSETS_WIDTH, Constants.ASSETS_HEIGHT);
        shape.graphics.endFill();
        this.addChild(shape);
        var hole = new createjs.Shape();
        hole.graphics.beginFill("#000000");
        hole.graphics.drawRoundRect(left, top, right - left, bottom - top, 10);
        hole.graphics.endFill();
        this.addChild(hole);
        hole.compositeOperation = "destination-out";
        this.cache(0, 0, Constants.ASSETS_WIDTH, Constants.ASSETS_HEIGHT);
        this.alpha = 0.0;
        createjs.Tween.get(this).wait(300).to({
            alpha: 0.6
        }, 600, createjs.Ease.linear);
    }
    TutorialHighlighter.prototype.hide = function() {
        var _this = this;
        createjs.Tween.get(this).to({
            alpha: 0
        }, 400, createjs.Ease.linear).call(function() {
            return _this.kill();
        });
    };
    TutorialHighlighter.prototype.hitTextMouse = function(x, y) {
        return x > this.left && x < this.right && y > this.top && y < this.bottom;
    };
    return TutorialHighlighter;
})(DNGameObject);
/// <reference path="references.ts" />
var Utils = (function() {
    function Utils() {}
    Utils.RandomRange = function(from, to) {
        return from + (to - from) * Math.random();
    };
    Utils.RandomRangeInt = function(from, to) {
        return Math.floor(Math.random() * (to - from + 1)) + from;
    };
    Utils.IntToTimeString = function(time) {
        var minutes = Math.floor(time / 60);
        var s_minutes = minutes.toString();
        var seconds = time % 60;
        var s_seconds;
        if (seconds < 10) {
            s_seconds = "0" + seconds;
        } else {
            s_seconds = seconds.toString();
        }
        return s_minutes + ":" + s_seconds;
    };
    Utils.RadToGrad = function(rad) {
        return rad * 180 / Math.PI;
    };
    Utils.GradToRad = function(grad) {
        return grad * Math.PI / 180;
    };
    Utils.IsMobileBrowser = function() {
        if (window["orientation"] != undefined) {
            return true;
        }
        var check = false;
        (function(a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
                check = true;
        })(navigator.userAgent || navigator.vendor || window["opera"]);
        return check;
        return false;
    };
    Utils.ScaledOffset = function(val) {
        return (window.devicePixelRatio ? window.devicePixelRatio : 1) * val / Constants.SCREEN_SCALE;
    };
    Utils.LineIntersectCircle = function(A, B, C, r) {
        var a = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
        var b = 2 * ((B.x - A.x) * (A.x - C.x) + (B.y - A.y) * (A.y - C.y));
        var cc = C.x * C.x + C.y * C.y + A.x * A.x + A.y * A.y - 2 * (C.x * A.x + C.y * A.y) - r * r;
        var deter = b * b - 4 * a * cc;
        if (deter > 0) {
            var e = Math.sqrt(deter);
            var u1 = (-b + e) / (2 * a);
            var u2 = (-b - e) / (2 * a);
            if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    Utils.GetScoreString = function(score) {
        var str_score = score.toString();
        switch (str_score.length) {
            case 1:
                str_score = "00000" + str_score;
                break;
            case 2:
                str_score = "0000" + str_score;
                break;
            case 3:
                str_score = "000" + str_score;
                break;
            case 4:
                str_score = "00" + str_score;
                break;
            case 5:
                str_score = "0" + str_score;
                break;
            case 6:
                break;
        }
        return str_score;
    };
    Utils.RunShowAnim = function(obj, delay) {
        obj.alpha = 0;
        createjs.Tween.get(obj).wait(delay).to({
            alpha: 1
        }, 200, createjs.Ease.linear);
        obj.scaleX = obj.scaleY = 0.1;
        return createjs.Tween.get(obj).wait(delay).to({
            scaleX: 1,
            scaleY: 1
        }, 400, createjs.Ease.backOut);
    };
    Utils.goMoreGames = function() {
        DNGameConfig.goMoreGames();
    };
    Utils.shuffle = function(o) {
        for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x)
        ;
    };
    Utils.DetectLanguage = function() {
        var lang;
        if (navigator && navigator.userAgent && (lang = navigator.userAgent.match(/android.*\W(\w\w)-(\w\w)\W/i))) {
            lang = lang[1];
        }
        if (!lang && navigator) {
            if (navigator.language) {
                lang = navigator.language;
            } else if (navigator.browserLanguage) {
                lang = navigator.browserLanguage;
            } else if (navigator.systemLanguage) {
                lang = navigator.systemLanguage;
            } else if (navigator.userLanguage) {
                lang = navigator.userLanguage;
            }
            lang = lang.substr(0, 2);
        }
        return lang;
    };
    Utils.AlignScale = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var min_scale = 100000;
        for (var i = 0; i < args.length; i++) {
            if (args[i].pic.scaleX < min_scale) {
                min_scale = args[i].pic.scaleX;
            }
        }
        for (var i = 0; i < args.length; i++) {
            args[i].setMinScale(min_scale);
        }
    };
    Utils.DrawRect = function(width, height, color, parent) {
        var debug_shape = new createjs.Shape();
        debug_shape.graphics.beginFill(color);
        debug_shape.graphics.drawRect(0, 0, width, height);
        debug_shape.graphics.endFill();
        if (parent) {
            parent.addChild(debug_shape);
        }
        return debug_shape;
    };
    return Utils;
})();
/// <reference path="MainMenuState.ts" />
var WinState = (function(_super) {
    __extends(WinState, _super);

    function WinState(score, level, stars_count) {
        var _this = this;
        _super.call(this);
        GameData.getInstance().onWinLevel(level, score, stars_count);
        this.level = level;
        this.starsCount = stars_count;
        var button_play = new DNFancyButton(Images.BUTTON_PLAY, function() {
            return _this.onPlayTouch();
        });
        this.findGUIObject("down_place_3").addChild(button_play);
        this.addGuiObject(button_play);
        var button_restart = new DNFancyButton(Images.BUTTON_RESTART, function() {
            return _this.onRestartTouch();
        });
        this.findGUIObject("down_place_2").addChild(button_restart);
        this.addGuiObject(button_restart);
        var button_exit = new DNFancyButton(Images.BUTTON_EXIT, function() {
            return _this.onExitTouch();
        });
        this.findGUIObject("down_place_1").addChild(button_exit);
        this.addGuiObject(button_exit);
        this.findGUIObject("caption").setText("Level Completed");
        this.setScoreTexts(score);
        var scales = [1, 1.3, 1];
        for (var i = 0; i < 3; i++) {
            var star = DNAssetsManager.g_instance.getCenteredImageWithProxy(i < stars_count ? Images.STAR_ON : Images.STAR_OFF);
            this.panel.addChild(star);
            star.x = -60 + i * 60 + 5;
            star.y = -50;
            var delay = 200 * i + 1500;
            star.scaleX = star.scaleY = 0.1;
            createjs.Tween.get(star).wait(delay).to({
                scaleX: scales[i],
                scaleY: scales[i]
            }, 350, createjs.Ease.backOut);
            star.alpha = 0.0;
            createjs.Tween.get(star).wait(delay).to({
                alpha: 1
            }, 300, createjs.Ease.linear);
        }
        DNGameConfig.levelWin(level, score);
    }
    WinState.prototype.onPlayTouch = function() {
		gradle.event('next_level');
        if (this.level + 1 >= GameData.getInstance().getTotalLevelCount()) {
            DNStateManager.g_instance.pushState(new ShadeInState(new SelectLevelState()));
        } else {
            DNStateManager.g_instance.pushState(new ShadeInState(new PlayState(this.level + 1)));
        }
    };
    return WinState;
})(SubmarineState);
