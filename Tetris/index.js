// 作者 : 张晓雷
// 邮箱 : zhangxiaolei@outlook.com
// Released under the MIT License.
// 方块图形以及UI借鉴了 https://simon.lc/tetr.js/，双图层的灵感也是来自它的三图层。
// 游戏细节上，Farter 给予很多指导，但受限于作者自身技术，许多地方实现的并不好。
// 游戏并非一次写成，第一次初步实现和后续完善之间间隔了一年，后续的完善是在之前的基础上，有许多不合理的地方，只是做了修补。
// 像长条的旋转，最初的设计非常怪异，后续在此基础上做了单独处理。
// 作者并非从事计算机行业，代码风格比较业余。
// 更新日期：2020-8-21

"use strict";

function random(begin, end) {
  return Math.floor(Math.random() * (end - begin + 1) + begin);
}

// Knuth-Shuffle 洗牌算法
function kShuffle(arr) {
  let ridx, end;
  for (let i = arr.length - 1; i >= 0; i--) {
    end = arr[i];
    ridx = random(0, i);
    arr[i] = arr[ridx];
    arr[ridx] = end;
  }
}
//BAG-7
function randGenerator() {
  let bag = [];
  return function () {
    if (bag.length === 0) {
      bag = [1, 2, 3, 4, 5, 6, 7];
      kShuffle(bag);
    }
    return bag.pop();
  }
}

function copyAtoB(a, b) {
  if (a.length === b.length) {
    let i = a.length;
    while (i--) {
      b[i][0] = a[i][0];
      b[i][1] = a[i][1];
    }
  }
}

function c4a() {
  return [[0, 0], [0, 0], [0, 0], [0, 0]]
}

//克隆数据
function clone(obj) {

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    let copy = [];
    for (let i = 0; i < obj.length; i++) {
      copy[i] = clone(obj[i])
    }
    return copy;
  }

  if (typeof obj === "object") {
    let copy = {};
    for (let attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = clone(obj[attr])
      }
    }
    return copy;
  }
}

//获取方块的最低点和最高点
function getTopAndLow(arr) {
  let s = arr[0][0], b = s;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i][0] < s) {
      s = arr[i][0];
    } else if (arr[i][0] > b) {
      b = arr[i][0];
    }
  }
  return [s, b];
}

function objCopy(origin, newOne) {
  let keys = Object.keys(origin);
  for (let key of keys) {
    newOne[key] = origin[key]
  }
}

// 每队数组最后一位是旋转的中心点，不能改变次序，第一队数组是四方块，没有中心。
const tetris = {
  1: [[3, 4], [3, 5], [4, 5], [4, 4]],  // O
  2: [[4, 3], [4, 4], [4, 5], [4, 6]],  // I
  3: [[4, 3], [4, 5], [3, 4], [4, 4]],  // T
  4: [[3, 3], [3, 4], [4, 5], [4, 4]],  // Z
  5: [[3, 4], [3, 5], [4, 3], [4, 4]],  // S
  6: [[4, 3], [4, 5], [3, 3], [4, 4]],  // L
  7: [[4, 3], [4, 5], [3, 5], [4, 4]]   // J
}
//----------------------BG----------O----------I----------T----------Z-----------S---------J----------L-------shadow-/
const tetrisColor = ["#1E1E1E", "#EEE685", "#B9D3EE", "#f54ff5", "#f56565", "#32CD32", "#4faaf5", "#ffa500", "#363636"];

const createColor = index => tetrisColor[index];
//1~29(n * 0.85)
const timeList = [1000, 850, 722, 613, 521, 442, 375, 318, 270, 229, 194, 164, 139, 118, 100, 85, 72, 61, 51, 43, 36, 30, 25, 21, 17, 14, 11, 9, 7];
// 存储所有信息数据的table
const table = [];

for (let i = 0; i <= 24; i++) {
  table.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
}

let moving, old, sMov = c4a();
let rtype = [], rlist = [];
let tetrisType, tetrisStage;
let gameStart, gameOver, gameJustBegun = false;
const readyNum = 6;
const rand = randGenerator();
const QS = name => document.querySelector(name);
const QSA = name => document.querySelectorAll(name);
const canvasBox = QS('#canvas-box')
const bgLayerEl = QS('#bg-layer');
const cubeShadowLayerEl = QS('#cube-shadow-layer');
const bgCanvas = bgLayerEl.getContext("2d");
const cuShCanvas = cubeShadowLayerEl.getContext("2d");
const clearSound = QS('#clear-sound');
const lockSound = QS('#lock-sound');
const offsound = QS('#off-sound');
const scanvas = QS("#s-canvas");
const pix2 = scanvas.getContext("2d");
const holdCanvas = QS('#hold')
const holdPix = holdCanvas.getContext('2d')

let isDrawBg = false;
let isNotDrawCS = false;

const HOLD = {

  type: undefined,

  isChange: undefined,

  tetris: function () {
    return this.type && tetris[this.type]
  },

  get: function () {
    return {
      type: this.type,
      tetris: this.tetris()
    }
  },

  exchange: function (type) {
    this.type = type;
  },

  have: function () {
    return this.type !== undefined
  },

  reset: function () {
    this.type = undefined
  }
}

function holdDisplay() {
  let tmpType = HOLD.type, tx, ty;
  if (tmpType) {
    holdPix.clearRect(0, 0, cs * 4.2, cs * 3);
    HOLD.tetris().forEach(i => {
      tx = tmpType === 1 || tmpType === 2
        ? (i[1] - 3) * cs + cs / 5
        : (i[1] - 3) * cs + cs / 1.4
      ty = tmpType === 2
        ? (i[0] - 3) * cs
        : (i[0] - 3) * cs + (cs / 2)
      holdPix.drawImage(hcanvas, cs * (tmpType - 1), 0, cs, cs, Math.floor(tx), Math.floor(ty), cs, cs);
    })
  }
}

function holdFunc() {
  if (HOLD.have() && !HOLD.isChange) {
    let tmp = HOLD.get();
    copyAtoB(tmp.tetris, old);
    copyAtoB(tmp.tetris, moving);
    if (tmp.type === 2) {
      straightStage = 0;
    }
    tetrisStage = '0'
    HOLD.exchange(tetrisType);
    tetrisType = tmp.type;
    HOLD.isChange = true;
    shadow();
  }
  if (!HOLD.have()) {
    HOLD.exchange(tetrisType);
    amt_done && createNewCube();
  }
  holdDisplay();
}

const hcanvas = QS('#saveCubeBox');
const hpix = hcanvas.getContext("2d")
const scoreDisplay = QS("#panel-score");
const fineshLineDisplay = QS("#panel-line");
const levalDisplay = QS("#panel-level");

const UI = Object.create(null);
UI.startAndPause = QS("#startPause");
UI.reset = QS("#reset");
UI.bg = QS('html');
UI.uiFontSize = QS('.game-border')
UI.pausebox = QS('#u-gamepause')
UI.setting = QS('#u-option')
UI.recommend = QS('#recommend')
UI.gameover = QS("#u-gameOver");
UI.inputTop10 = QS("#u-enterTop10");
UI.top10 = QS("#u-info");
UI.rstgaming = QS("#rst-game")

//gap参数决定了所有窗口上的关联尺寸! 它主要设定主 canvas 的上下预留尺寸, gap / 2为单边的尺寸。
let realWidth, realHeight, gap = 30, cs;
let scanvasWidth, scanvasHeight;

let amt_w;
//--------------left-bottom-right-top
const alphalist = [0.9, 0.5, 0.6, 1];

function setMainCanvas() {

  let originalHeight = window.innerHeight;

  document.body.style.height = originalHeight + 'px';

  cs = Math.floor((originalHeight - gap) / 20);
  realHeight = cs * 20;
  realWidth = amt_w = cs * 10;

  hcanvas.width = cs * (9 + 7)
  hcanvas.height = cs;

  let color, alpha = 0;
  hpix.translate(cs / 2, cs / 2);

  for (let n, i = 1; i <= (7 + 1 + 7); i++) {

    if (i < 9) {
      color = createColor(i)
    } else {
      !alpha && (alpha = 0.4)
      color = createColor(i - 8)
    }

    hpix.fillStyle = color;
    n = 4;

    while (n--) {
      hpix.globalAlpha = alphalist[n] - alpha
      hpix.beginPath();
      hpix.moveTo(0, 0)
      hpix.lineTo(-cs / 2, -cs / 2)
      hpix.lineTo(cs / 2, -cs / 2)
      hpix.fill()
      hpix.rotate(Math.PI * 0.5)
    }
    hpix.translate(cs, 0);
  }
  canvasBox.style.width = realWidth + 'px';
  canvasBox.style.height = realHeight + 'px';

  bgLayerEl.width = cubeShadowLayerEl.width = realWidth;
  bgLayerEl.height = cubeShadowLayerEl.height = realHeight;

  scanvas.width = scanvasWidth = cs * 4.4;
  scanvas.height = scanvasHeight = 6 * cs * 2.8 - cs * 0.8;
  holdCanvas.width = cs * 4.4;
  holdCanvas.height = cs * 3;
  UI.uiFontSize.style.fontSize = cs * 0.9 + 'px';
  //在暂停的情况下，调整尺寸后只需要绘制一次，在运行时，调整尺寸就不停的绘制。
  //暂停
  if (!gameStart && gameJustBegun) {
    drawBg();
    drawCS();
  }
  //中途
  if (gameStart) {
    isDrawBg = true;
  }
  smallDisplay();
  holdDisplay();
}

function drawBg() {
  bgCanvas.clearRect(0, 0, realWidth, realHeight);
  let t;
  for (let j = 5; j <= 24; j++) {
    for (let i = 0; i <= 9; i++) {
      t = Math.abs(table[j][i]);
      if (t !== 0) {
        drawCube(bgCanvas, i, j, t);
      }
    }
  }
}

let isDelay, isDelayColor;

function drawCS() {

  cuShCanvas.clearRect(0, 0, realWidth, realHeight);

  sMov.forEach(i => {
    drawCube(cuShCanvas, i[1], i[0], 8)
  })

  old.forEach(i => {
    drawCube(cuShCanvas, i[1], i[0], isDelayColor ? tetrisType + 8 : tetrisType)
  })
}

setMainCanvas();

window.onresize = setMainCanvas;

function drawCube(can, x, y, c) {
  can.drawImage(hcanvas, cs * (c - 1), 0, cs, cs, x * cs, y * cs - (cs * 5), cs, cs);
}

//数据来源：https://harddrop.com/wiki/SRS

const wallKick = {

  JLSTZ: {
    '0R': [[-1, 0], [-1, +1], [0, -2], [-1, -2]],
    'R0': [[+1, 0], [+1, -1], [0, +2], [+1, +2]],
    'R2': [[+1, 0], [+1, -1], [0, +2], [+1, +2]],
    '2R': [[-1, 0], [-1, +1], [0, -2], [-1, -2]],
    '2L': [[+1, 0], [+1, +1], [0, -2], [+1, -2]],
    'L2': [[-1, 0], [-1, -1], [0, +2], [-1, +2]],
    'L0': [[-1, 0], [-1, -1], [0, +2], [-1, +2]],
    '0L': [[+1, 0], [+1, +1], [0, -2], [+1, -2]]
  },

  I: {
    '0R': [[-2, 0], [+1, 0], [-2, -1], [+1, +2]],
    'R0': [[+2, 0], [-1, 0], [+2, +1], [-1, -2]],
    'R2': [[-1, 0], [+2, 0], [-1, +2], [+2, -1]],
    '2R': [[+1, 0], [-2, 0], [+1, -2], [-2, +1]],
    '2L': [[+2, 0], [-1, 0], [+2, +1], [-1, -2]],
    'L2': [[-2, 0], [+1, 0], [-2, -1], [+1, +2]],
    'L0': [[+1, 0], [-2, 0], [+1, -2], [-2, +1]],
    '0L': [[-1, 0], [+2, 0], [-1, +2], [+2, -1]]
  },
  //根据当前状态和旋转指令，把任意旋转转换成符合数据表的key
  parse: function (origin, newdire) {

    let v, t, a = ['0', 'R', '2', 'L'], o = { '0': 0, 'R': 1, '2': 2, 'L': 3 };

    if (newdire === 'r') {
      v = 1;
    } else if (newdire === 'l') {
      v = -1;
    } else if (newdire === 'o') {
      v = 2;
    }

    t = o[origin] + v;

    if (t === 4) {
      t = 0;
    } else if (t === -1) {
      t = 3;
    } else if (t === 5) {
      t = 1;
    }

    return [origin, a[t]]
  },

  get: function (type, origin, newdire) {
    let k = this.parse(origin, newdire).join('');
    return type === 2 ? this.I[k] : this.JLSTZ[k]
  }
}

//180度的踢墙。
wallKick.JLSTZ['02'] = wallKick.JLSTZ['R2']//.concat(wallKick.JLSTZ['L2'])
wallKick.JLSTZ['RL'] = wallKick.JLSTZ['2L']//.concat(wallKick.JLSTZ['0L'])
wallKick.JLSTZ['20'] = wallKick.JLSTZ['L0']//.concat(wallKick.JLSTZ['R0'])
wallKick.JLSTZ['LR'] = wallKick.JLSTZ['0R']//.concat(wallKick.JLSTZ['2R'])
wallKick.I['02'] = wallKick.I['R2']//.concat(wallKick.I['L2'])
wallKick.I['RL'] = wallKick.I['2L']//.concat(wallKick.I['0L'])
wallKick.I['20'] = wallKick.I['L0']//.concat(wallKick.I['R0'])
wallKick.I['LR'] = wallKick.I['0R']//.concat(wallKick.I['2R'])

function digtalNumber(n, el) {
  el.innerText = n;
}

function smallDisplay() {
  let len = rlist.length;
  pix2.clearRect(0, 0, scanvasWidth, scanvasHeight);
  let tmpTetris, tmpType, tx, ty;
  while (len--) {
    tmpTetris = rlist[len]
    tmpType = rtype[len]
    tmpTetris.forEach(i => {
      tx = tmpType === 1 || tmpType === 2
        ? (i[1] - 3) * cs + cs / 5
        : (i[1] - 3) * cs + cs / 1.4
      ty = tmpType === 2
        ? (i[0] - 3) * cs + (len * cs * 2.8 - cs / 2)
        : (i[0] - 3) * cs + (len * cs * 2.8);
      pix2.drawImage(hcanvas, cs * (tmpType - 1), 0, cs, cs, Math.round(tx), Math.round(ty), cs, cs);
    })
  }
}

{
  //初次载入，候选项就载入，让界面好看一点。
  let t;
  for (let i = 0; i < 6; i++) {
    t = rand();
    rtype.push(t);
    rlist.push(tetris[t])
  }
  smallDisplay();
}

function createNewCube() {

  let rn, f;

  while (rlist.length < readyNum + 1) {
    rn = rand();
    rtype.push(rn);
    rlist.push(tetris[rn])
  }

  tetrisType = rtype.shift();

  f = rlist.shift();

  copyAtoB(f, moving);
  copyAtoB(f, old);
  shadow();
  //开始cube绘制
  isNotDrawCS = false;

  if (tetrisType === 2) {
    straightStage = 0;
  }

  tetrisStage = '0';
  smallDisplay(rlist, rtype)
  HOLD.isChange = false;
}

function clearLock() {
  if (checkCanDown()) {
    isDelay = false;
    isDelayColor = false;
    clearTimeout(softlock);
  } else if (isDelay) {
    clearTimeout(softlock);
  }
}

function moveOneStep(m, to, s) {
  let len = 4;
  s = s || 1;
  if (m.length === 4) {
    if (to === "left") {
      while (len--) { m[len][1] -= s }
    } else if (to === "right") {
      while (len--) { m[len][1] += s }
    } else if (to === "down") {
      while (len--) { m[len][0] += s }
    } else if (to === "up") {
      while (len--) { m[len][0] -= s }
    }
  }
}

//向下试探一步，确认是否能继续下落

let canMoveUsed = c4a();

function checkCanDown() {
  copyAtoB(moving, canMoveUsed);
  moveOneStep(canMoveUsed, "down");
  for (let i of canMoveUsed) {
    if (i[0] > 24 || table[i[0]][i[1]] < 0) {
      return false;
    }
  }
  return true;
}

//true 有接触 false 没接触
function checkIsTouch() {
  for (let i of moving) {
    if (i[1] < 0 || i[1] > 9 || i[0] > 24 || table[i[0]][i[1]] < 0) {
      return true;
    }
  }
  return false;
}

function checkGetScore() {
  let checkSave = [];
  let [min, max] = getTopAndLow(old);
  for (; max >= min; max--) {
    if (table[max].every(function (n) {
      return n !== 0;
    })) {
      checkSave.push(max);
    }
  }
  return checkSave;
}
//方块数据求负锁定
function tetrisLock() {
  old.forEach(function (i) {
    table[i[0]][i[1]] = -tetrisType;
  })
}

function shadow() {
  copyAtoB(moving, sMov);
  for (let x = 4; x <= 24; x++) {
    for (let i of sMov) {
      if (i[0] === 24 || table[i[0] + 1][i[1]] < 0) { return }
    }
    moveOneStep(sMov, "down");
  }
}

const BT_start_color = '#fdfd22';//yellow
const BT_pause_color = '#ffa500';//orange

function checkEnd() {
  if (table[4].some(function (i) {
    return (i < 0);
  })) {
    stopLoop();
    drawCS();
    gameOver = true;
    gameStart = false;
    resetKeyStatus();
    UI.startAndPause.innerText = "开始";
    UI.startAndPause.style.backgroundColor = BT_start_color;
    inTop10Check();
    return true;
  } else {
    return false;
  }
}

let softlock;

function downLoop() {
  if (!gameStart || isDelay || !amt_done) return;
  moveOneStep(moving, "down");
  if (checkCanDown()) {
    copyAtoB(moving, old)
  } else {
    if (checkIsTouch()) {
      copyAtoB(old, moving)
    } else {
      copyAtoB(moving, old)
    }
    checkOverLoop('down');
  }
}

function moveToDeep() {
  if (!amt_done) return;
  for (let x = 0; x <= 24; x++) {
    for (let i of moving) {
      if (i[0] === 24 || table[i[0] + 1][i[1]] < 0) {
        if (isDelay) {
          clearTimeout(softlock)
          isDelay = isDelayColor = false;
        }
        copyAtoB(moving, old)
        checkOverLoop('deep');
        return;
      }
    }
    moveOneStep(moving, "down");
  }
}

function moveToLeftOrRight(to) {

  //isDelay对于限制左右移动无意义。在未得分的情况下，不需添加；在得分的场景，移动会导致 checkIsTouch 为true，进而复位。

  if (!amt_done) return;

  moveOneStep(moving, to);

  if (checkIsTouch()) {
    copyAtoB(old, moving)
  } else {
    copyAtoB(moving, old)
    shadow()
    if (checkCanDown()) {
      if (isDelay) {
        isDelay = false;
        isDelayColor = false;
        clearTimeout(softlock)
      }
    } else {
      clearTimeout(softlock)
      checkOverLoop('down');
    }
  }
}

function overLoopAndCreate() {
  stopLoop()
  amt_list = checkGetScore()
  amt_line = amt_list.length;
  if (amt_line) {
    scoreCreate()
    soundPlay(clearSound)
  } else {
    normalCreate()
    soundPlay(lockSound)
  }
}

function checkOverLoop(type) {

  if (type === 'deep') {

    tetrisLock()
    overLoopAndCreate()

  } else if (type === 'down') {

    if (tetrisType === 1) {
      isSquareBlink ? isSquareBlink = false : isDelayColor = true;
      isDelay = true;
    } else {
      isDelay = isDelayColor = true;
    }

    softlock = setTimeout(function () {

      if (!checkCanDown()) {
        tetrisLock();
        overLoopAndCreate()
      }

      isDelay = isDelayColor = false;
    }, keyboard.lockRange);
  }
}

function normalCreate() {
  isDrawBg = true;
  if (checkEnd()) { return }
  createNewCube();
  if (!downLock && gameStart) {
    startLoop(false);
  }
}

let gameScore = 0;

let amt_line, amt_list;

function scoreCreate() {

  clearTimeout(softlock)

  amt_done = false;

  //纯粹占位
  amt_list.forEach(function (i) {
    table.splice(i, 1, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  })
  //此时 0 为不绘制，所以无需处理消除部分
  isDrawBg = true;

  setAnimate();

  cuShCanvas.clearRect(0, 0, realWidth, realHeight);

  isNotDrawCS = true;
}

let finishLine = 0;

function updateScore() {

  finishLine += amt_line;

  switch (amt_line) {
    case 1: gameScore += 40 * gameLevel; break
    case 2: gameScore += 100 * gameLevel; break
    case 3: gameScore += 300 * gameLevel; break
    case 4: gameScore += 1200 * gameLevel; break
  }

  digtalNumber(gameScore, scoreDisplay);
  digtalNumber(finishLine, fineshLineDisplay);
  changeLevalAndDisplay(finishLine);

  if (checkEnd()) { return }

  createNewCube();

  if (!downLock && gameStart) {
    startLoop(false);
  }

  amt_done = true;
}

function offset(m, a) {
  let [x, y] = a;
  if (x < 0) {
    moveOneStep(m, 'left', -x)
  } else if (x > 0) {
    moveOneStep(m, 'right', x)
  }
  if (y < 0) {
    moveOneStep(m, 'down', -y);
  } else if (y > 0) {
    moveOneStep(m, 'up', y);
  }
}

let straightStage = 1;

function straightRotate(m) {

  let sm = (a, y, x) => {
    y && (a[0] += y)
    x && (a[1] += x)
  }

  if (straightStage === 0) {
    sm(m[0], -1, +2);
    sm(m[1], 0, +1);
    sm(m[2], 1, 0);
    sm(m[3], +2, -1);
    straightStage = 1;
  } else if (straightStage === 1) {
    sm(m[0], +2, +1);
    sm(m[1], +1, 0);
    sm(m[2], 0, -1);
    sm(m[3], -1, -2);
    straightStage = 2;
  } else if (straightStage === 2) {
    sm(m[0], 1, -2);
    sm(m[1], 0, -1);
    sm(m[2], -1, 0);
    sm(m[3], -2, 1);
    straightStage = 3;
  } else if (straightStage === 3) {
    sm(m[0], -2, -1);
    sm(m[1], -1, 0);
    sm(m[2], 0, 1);
    sm(m[3], 1, 2);
    straightStage = 0;
  }
}

let isSquareBlink = false;

function rotate(d) {

  if (!amt_done) return;

  if (tetrisType === 1) {
    if (isDelay) {
      isDelayColor = false;
      isSquareBlink = true;
      clearTimeout(softlock)
      checkOverLoop('down');
    }
    return;
  }

  let step;

  if (d === 'r') {
    step = 1
  } else if (d === 'l') {
    step = 3
  } else if (d === 'o') {
    step = 2
  }
  // 历史遗留问题，长条特殊处理，旋转状态暂存。
  let sstmp;

  if (tetrisType === 2) {
    sstmp = straightStage;
    while (step--) {
      straightRotate(moving);
    }
  } else {
    let c = moving[3], tmp = c4a();
    while (step--) {
      copyAtoB(moving, tmp);
      for (let i, m, idx = 0; idx < 3; idx++) {
        i = tmp[idx];
        m = moving[idx];
        if (i[0] > c[0] && i[1] === c[1]) { m[0] -= 1; m[1] -= 1 }
        if (i[0] === c[0] && i[1] > c[1]) { m[0] += 1; m[1] -= 1 }
        if (i[0] < c[0] && i[1] < c[1]) { m[1] += 2 }
        if (i[0] < c[0] && i[1] === c[1]) { m[0] += 1; m[1] += 1 }
        if (i[0] < c[0] && i[1] > c[1]) { m[0] += 2 }
        if (i[0] > c[0] && i[1] > c[1]) { m[1] -= 2 }
        if (i[0] > c[0] && i[1] < c[1]) { m[0] -= 2 }
        if (i[0] === c[0] && i[1] < c[1]) { m[0] -= 1; m[1] += 1 }
      }
    }
  }

  // SRS
  // wallkick对象的 get 和 parse 方法通过方块的当前状态]和旋转方向(d) 来计算出偏转数据额和下一个状态。
  // 长条的 straightStage 和 tetrisStage 是像个不同的值，一个是旋转计数，一个是偏转状态。

  let kicktmp = c4a();

  copyAtoB(moving, kicktmp);

  if (checkIsTouch()) {

    let kickData = wallKick.get(tetrisType, tetrisStage, d)

    for (let i = 0; i <= 3; i++) {
      offset(moving, kickData[i])
      if (!checkIsTouch()) {
        clearLock();
        tetrisStage = wallKick.parse(tetrisStage, d)[1];
        copyAtoB(moving, old);
        shadow();
        break;
      } else {
        //第四次仍然失败，则偏转失败，tetrisStage 的值因为失败所以无需改变。
        if (i === 3) {
          if (tetrisType === 2) {
            straightStage = sstmp;
          }
          copyAtoB(old, moving);
          shadow();
          return;
        }
        copyAtoB(kicktmp, moving);
      }
    }
  } else {
    clearLock();
    tetrisStage = wallKick.parse(tetrisStage, d)[1];
    copyAtoB(moving, old);
    shadow();
  }
  if (!checkCanDown()) {
    checkOverLoop('down');
  }
};

/*
屏蔽系统连续触发锁。因为所有的移动都是由函数定时循环驱动的，所以要屏蔽系统的连续触发，以避免作用交错在一起。
每次按下按键，只会执行一次移动函数（函数内定时，连续触发），松开按键，锁开启，移动函数停止运行。
*/
let leftLock = false;
let rightLock = false;
let downLock = false;
let deepLock = false;

let leftStop;
let rightStop;
let downStop;

//确保每次按下旋转只能旋转一次，不会进入连续触发
let rotateLock = false;
let rotateLock1 = false;
let rotateLock2 = false;

window.addEventListener('keydown', (event) => {

  let key = toUpper(event.key)

  if (!(popupStatus.inputTop10 || popupStatus.setting) && key === keyboard.pause) {
    gameStartOrPause.call(UI.startAndPause)
  }

  if (!gameStart) return;

  if (key === keyboard.left) {
    if (!leftLock) {
      clearTimeout(rightStop)
      leftLock = true;
      moveToLeft()
    }
  } else if (key === keyboard.right) {
    if (!rightLock) {
      clearTimeout(leftStop)
      rightLock = true;
      moveToRight()
    }
  } else if (key === keyboard.down) {
    if (!downLock) {
      stopLoop();  //防止downLoop循环和向下按钮的动作相互重合
      moveToDown()
      downLock = true;
    }
  } else if (key === keyboard.deep) {
    if (!deepLock) {
      moveToDeep();
      deepLock = true;
    }
  } else if (key === keyboard.rotate) {
    if (!rotateLock) {
      rotate('r');
      rotateLock = true;
    }
  } else if (key === keyboard.rotate1) {
    if (!rotateLock1) {
      rotate('l');
      rotateLock1 = true;
    }
  } else if (key === keyboard.rotate2) {
    if (!rotateLock2) {
      rotate('o');
      rotateLock2 = true;
    }
  } else if (key === keyboard.holdkey) {
    holdFunc()
  }
}, false)

// 解除连续触发
window.addEventListener('keyup', (event) => {

  if (!gameStart) return;

  let key = toUpper(event.key)

  if (key === keyboard.left) {
    clearTimeout(leftStop)
    leftLock = false;
    if (rightLock) {
      clearTimeout(rightStop)
      moveToRight()
    }
  } else if (key === keyboard.right) {
    clearTimeout(rightStop)
    rightLock = false;
    if (leftLock) {
      clearTimeout(leftStop)
      moveToLeft()
    }
  } else if (key === keyboard.deep) {
    deepLock = false;
  } else if (key === keyboard.down) {
    clearTimeout(downStop)
    downLock = false;
    if (gameStart && amt_done) {
      stopLoop()
      startLoop(false)
    }
  } else if (key === keyboard.rotate) {
    rotateLock = false;
  } else if (key === keyboard.rotate1) {
    rotateLock1 = false;
  } else if (key === keyboard.rotate2) {
    rotateLock2 = false;
  }

  if (tetrisType === 1 && isDelay && !isDelayColor) {
    isDelayColor = true
  }

}, false)

function moveToLeft(speed = keyboard.firstDelay) {
  moveToLeftOrRight('left')
  leftStop = setTimeout(() => {
    moveToLeft(keyboard.repeDelay)
  }, speed);
}

function moveToRight(speed = keyboard.firstDelay) {
  moveToLeftOrRight('right')
  rightStop = setTimeout(() => {
    moveToRight(keyboard.repeDelay)
  }, speed);
}

function moveToDown(speed = keyboard.firstDelay) {
  downLoop()
  downStop = setTimeout(() => {
    moveToDown(keyboard.repeDelay)
  }, speed);
}

function resetGame() {
  table.forEach(line => {
    line.forEach((_, index, arr) => {
      arr[index] = 0;
    })
  })
  stopLoop();
  moving = c4a();
  old = c4a();
  sMov = c4a();
  finishLine = 0;
  timeSpeed = 1000;
  gameScore = 0;
  digtalNumber(0, scoreDisplay);
  digtalNumber(0, fineshLineDisplay);
  digtalNumber(0, levalDisplay);
  gameStart = false;
  gameOver = true;
  gameJustBegun = false;
  isDelay = false;
  isDelayColor = false;
  resetKeyStatus();
  UI.startAndPause.style.backgroundColor = BT_start_color;
  UI.startAndPause.innerText = "开始";
  drawBg();
  drawCS();
  //清空HOLD窗口
  holdPix.clearRect(0, 0, cs * 4.2, cs * 3);
  HOLD.reset();
}

let timeSpeed, stopGame;

function startLoop(now = true) {
  now && downLoop()
  stopGame = setTimeout(() => {
    startLoop()
  }, timeSpeed);
}

function stopLoop() {
  clearTimeout(stopGame)
}

function changeLoopSpeed(speed) {
  timeSpeed = speed;
}

let gameLevel = 1;

function changeLevalAndDisplay(line) {

  let speed, levelDisplay;
  levelDisplay = gameLevel = line < 10 ? 1 : Math.ceil(line / 10);

  if (gameLevel <= timeList.length) {
    speed = timeList[gameLevel - 1];
  } else {
    //通关后维持最后一关的速度
    speed = timeList[timeList.length - 1]
    levelDisplay = '通关';
  }

  changeLoopSpeed(speed);
  digtalNumber(levelDisplay, levalDisplay);
}

let distanceTop10 = QS("#u-distancetop10");

function inTop10Check() {
  if (gameScore && (localData.data.length < 10 || gameScore > localData.data[9][1])) {
    popupWin('inputTop10')
    QS('#u-enterName').focus();
    QS("#u-score").innerText = gameScore;
    QS("#u-level").innerText = gameLevel > timeList.length ? '通关' : gameLevel;
    QS("#u-lines").innerText = finishLine;
  } else {
    popupWin('gameover')
    let lastItem = localData.data.length ? localData.data.length - 1 : 0;
    distanceTop10.innerText = (localData.data[lastItem] ? localData.data[lastItem][1] : 0) - gameScore;
  }
}

function pauseClue() {
  popupWin('pausebox')
  UI.pausebox.querySelector('i').innerText = '单击 [继续] 按钮或按 [' + convertUiKey(keyboard.pause) + '] 键继续游戏';
}

function resetKeyStatus() {

  deepLock = false;
  rotateLock = false;
  rotateLock1 = false;
  rotateLock2 = false;

  if (leftLock) {
    leftLock = false;
    clearTimeout(leftStop)
  }
  if (rightLock) {
    rightLock = false;
    clearTimeout(rightStop)
  }
  if (downLock) {
    downLock = false;
    clearTimeout(downStop)
  }
}

function gameStartOrPause() {
  //游戏开始
  if (!gameStart) {
    gameOver && resetGame();
    gameStart = true;
    window.requestAnimationFrame(tableAnimation);
    gameOver = false;
    this.innerText = "暂停";
    this.style.backgroundColor = BT_pause_color;
    popupWin(false)
    changeLevalAndDisplay(finishLine);
    if (!gameJustBegun) {
      createNewCube()
      gameJustBegun = true;
    }
    if (amt_done) {
      startLoop(false);
    }
    if (isDelay) {
      checkOverLoop('down')
    }
    if (!opm_is && opm_step !== 0) {
      opm_step = 0;
      opm_is = false;
      opm_ready = false;
      opm_beginTime = undefined;
    }
  } else {
    //游戏暂停
    if (isDelay) {
      clearTimeout(softlock)
    }
    stopLoop();
    resetKeyStatus()
    gameStart = false;
    this.innerText = "继续";
    this.style.backgroundColor = BT_start_color;
    pauseClue()
  }
}

UI.startAndPause.addEventListener("click", function () { gameStartOrPause.call(this) }, false);

UI.reset.addEventListener("click", function () {
  if (!gameOver) {
    popupWin('rstgaming')
  } else {
    resetGame();
    popupWin(false);
  }
}, false);

//初始游戏网格界面
resetGame();

//.t-close
QSA((".w-border")).forEach(function (item) {
  item.querySelectorAll(".t-close").forEach(function (i) {
    i.addEventListener("click", function () {
      item.style.display = "none";
    }, false);
  })
})

const bgColor = {
  //绿
  0: 'rgb(35, 80, 48)',
  //蓝
  1: 'rgb(55, 68, 103)',
  //黑
  2: 'rgb(30, 30, 30)',
  //紫
  3: 'rgb(110, 14, 73)'
}

// 如果要调整刻度，只需要修改数组数据，刻度递增量为1，默认值为数组 length 值的一半。不要忘了修改UI的范围提示。
// 1 ~ 10
const firstDelayList = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190]
// 1 ~ 10
const repeDelayList = [16, 20, 25, 30, 35, 40, 45, 50, 55, 60]
// 1 ~ 5
const lockRangeList = [200, 300, 400, 500, 600]

function MakeRange(name, ruler) {

  const bl = document.createElement('b')
  const br = document.createElement('b')
  this.input = document.createElement('input')
  this.input.setAttribute('type', 'number')
  document.querySelector(name).append(bl, this.input, br);

  this.ruler = ruler;
  this.min = 1;
  this.max = this.ruler.length;
  this.value = undefined;

  this.getValue = function () {

    let val = this.value;

    if (val >= this.min && val <= this.max) {
      return this.ruler[val - 1]
    } else {
      return false
    }
  }

  this.init = function (val) {
    this.input.value = this.value = this.ruler.indexOf(val) + 1;
    this.input.title = this.getValue() + '毫秒'
  }

  bl.addEventListener('click', () => {
    if (this.value > this.min) {
      this.value -= 1
      this.input.value = this.value;
      this.input.title = this.getValue() + '毫秒'
    }
  })

  br.addEventListener('click', () => {
    if (this.value < this.max) {
      this.value += 1
      this.input.value = this.value
      this.input.title = this.getValue() + '毫秒'
    }
  })
}

const firstDelayTime = new MakeRange('.first-range', firstDelayList)
const repeDelayTime = new MakeRange('.repe-range', repeDelayList)
const lockRange = new MakeRange('.lock-range', lockRangeList)

//初始数据
let initGameDate = {
  data: [],
  bg: "rgb(30, 30, 30)",
  opm: false,
  frame: undefined,
  offsound: false,
  keyboard: {
    deep: "F",
    left: "A",
    right: "D",
    down: "S",
    rotate: "W", //顺时针
    rotate1: "Q", //逆时针
    rotate2: "R",
    holdkey: "E",
    pause: " ", //理想键位是ESC，但是全屏功能的退出也是ESC，冲突了。
    firstDelay: firstDelayList[Math.floor(firstDelayList.length / 2)],
    repeDelay: repeDelayList[Math.floor(repeDelayList.length / 2)],
    lockRange: lockRangeList[Math.floor(lockRangeList.length / 2)]
  }
}
//载入数据

let localData = JSON.parse(localStorage.getItem("TetrisGameData"));

if (!localData) {
  localData = clone(initGameDate);
}

let opm_frame;
let amt_wait, amt_wait_v;
let amt_wait_time = 90;

if (!localData.opm) {
  opm_frame = localData.frame = 1000 / 60;
} else {
  opm_frame = localData.frame;
}

amt_wait = amt_wait_v = Math.floor(amt_wait_time / opm_frame)

let opm_is = localData.opm;

let keyboard = localData.keyboard;

UI.bg.style.backgroundColor = localData.bg;

//将比赛记录保存到浏览器
function saveData() {
  if (window.localStorage) {
    localStorage.setItem("TetrisGameData", JSON.stringify(localData))
  } else {
    console.error("未能完成存储！")
  }
}

function checkDataAndSave(data) {

  let len = localData.data.length;

  let local = localData.data;

  if (len < 10) {

    local.push(data);
    local.sort(function (a, b) {
      return b[1] - a[1];
    })

  } else {

    for (let i = 0; i < len; i++) {
      if (data[1] > local[i][1]) {
        local.splice(i, 0, data);
        local.pop();
        break;
      }
    }
  }
  saveData();
}

UI.trList = QSA("#table-list tr");

//展示前清空
function clearInfo() {
  let len = UI.trList.length;
  for (let j = 1; j < len; j++) {
    for (let i = 0; i < UI.trList[j].children.length; i++) {
      UI.trList[j].children[i].innerText = "";
    }
  }
}

//展示Top10
function displayinfoFunc(data) {
  let len = data.length + 1;
  for (let j = 1; j < len; j++) {
    for (let i = 0; i < UI.trList[j].children.length; i++) {
      if (i === 0) {
        UI.trList[j].children[i].innerText = j;
      } else {
        UI.trList[j].children[i].innerText = data[j - 1][i - 1];
      }
    }
  }
}

QS('#rst-gaming').addEventListener('click', function () {
  resetGame()
  popupWin(false)
})

QS("#top10").addEventListener('click', function () {
  displayinfoFunc(localData.data);
  popupWin('top10')
})

function soundPlay(item) {
  if (!localData.offsound) {
    if (item.play) {
      item.currentTime = 0;
    }
    item.play()
  }
}

const popupStatus = Object.create(null);

['top10', 'gameover', 'inputTop10', 'pausebox', 'setting', 'rstgaming'].forEach(key => {
  popupStatus[key] = false;
})

function popupWin(name) {
  for (let key in popupStatus) {
    if (popupStatus[key]) {
      UI[key].style.display = 'none';
      popupStatus[key] = false;
    }
  }
  if (name) {
    UI[name].style.display = 'block';
    popupStatus[name] = true;
  }
}

function getAttribute(el, keyName) {
  return el.getAttribute(keyName);
}

let optUsedOjb;

function displayOptKey() {
  optUsedOjb = clone(keyboard)
  optList.forEach(el => {
    el.value = convertUiKey(keyboard[getAttribute(el, 'key')])
  })
  firstDelayTime.init(keyboard.firstDelay);
  repeDelayTime.init(keyboard.repeDelay);
  lockRange.init(keyboard.lockRange);
  offsound.checked = localData.offsound;
}

QS("#setting").addEventListener("click", function () {
  gameJustBegun && gameStart && gameStartOrPause.call(UI.startAndPause)
  popupWin('setting')
  displayOptKey();
})

QS("#clearData").addEventListener("click", function () {
  if (confirm("清除所有游戏数据 (英雄榜、键位设置) ?")) {
    localData.data = [];
    localStorage.clear();
    clearInfo();
    document.location.reload();
  }
}, false)

//top10 录入区域
QS("#u-enterNameBT").addEventListener("click", function () {
  let name = QS("#u-enterName").value;
  checkDataAndSave([name || "匿名", gameScore, gameLevel > timeList.length ? '通关' : gameLevel, finishLine]);
  popupWin(false)
});

function toUpper(t) {
  return t.length === 1
    ? /^[a-z]$/.test(t)
      ? t.toUpperCase()
      : t
    : t
}

const convertList = {
  ' ': '空格',
  'Control': 'ctrl',
  'Escape': 'ESC',
  'ArrowLeft': '←',
  'ArrowRight': '→',
  'ArrowUp': '↑',
  'ArrowDown': '↓'
}

function convertUiKey(val) {
  let res = convertList[val]
  return res || val
}

let inputTmp;

const optList = QSA('.opt-i');

//按键录入，主要目的是能够支持方向键录入
optList.forEach(function (item) {
  item.addEventListener("click", function () {
    inputTmp = this.value;
    this.value = "";
    let elkey = this.getAttribute('key')
    this.onkeydown = function (k) {
      let key = toUpper(k.key);
      this.value = '';
      optUsedOjb[elkey] = key;
      setTimeout(() => {
        this.value = convertUiKey(key);
      }, 0);
    }
  })
})

optList.forEach(function (item) {
  item.onblur = function () {
    if (this.value === "") {
      this.value = inputTmp;
    }
  }
})

QS("#opt-bt-yes").addEventListener("click", function () {

  optList.forEach(el => {
    keyboard[getAttribute(el, 'key')] = el.value;
  })

  localData.offsound = offsound.checked;

  objCopy(optUsedOjb, keyboard);

  const first = firstDelayTime.getValue();
  const repe = repeDelayTime.getValue();
  const lock = lockRange.getValue();
  if (first && repe) {
    keyboard.firstDelay = first;
    keyboard.repeDelay = repe;
    keyboard.lockRange = lock;
    saveData();
    popupWin(false)
  } else {
    alert('DAS & ARR 输入超出范围！')
  }
  if (!gameOver) {
    popupWin('pausebox')
  }
})

QSA('.bg-select span').forEach((item, index) => {
  item.addEventListener('click', function () {
    UI.bg.style.backgroundColor = bgColor[index];
    localData.bg = bgColor[index];
  })
})

QS('#rst-key').addEventListener('click', function () {
  if (confirm('重置键位？')) {
    keyboard = clone(initGameDate.keyboard);
    localData.keyboard = keyboard;
    displayOptKey();
    saveData();
    alert('已恢复默认键位')
  }
})

//AMT 消行过度动画计算

let amt_done = true;

function getBestFrame(size, time) {

  let frame = Math.floor(time / opm_frame)

  let stepSize = Math.floor(size / frame)

  return { frame: frame, stepSize: stepSize }
}

let amt_h;

const amt_queue = [];

function addFrameQueue(floor, line, time) {

  let { frame, stepSize } = getBestFrame(line * cs, time);

  let move = 0;

  floor -= 5;
  //此时floor表示最底层
  floor += (line - 1);

  while (frame--) {
    move += stepSize;
    amt_queue.push({ floor: floor, move: move })
  }

  amt_queue.push(() => {
    for (let i = 0; i < line; i++) {
      table.splice(floor + 5 + amt_base, 1)
      table.unshift([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    }
    isDrawBg = true;
    cuShCanvas.clearRect(0, 0, realWidth, realHeight);
  })

  amt_queue.push(line);
}

function setAnimate() {

  let time, list = amt_list;

  switch (amt_line) {
    case 1: time = 100; break
    case 2: time = 150; break
    case 3: time = 180; break
    case 4: time = 200; break
  }

  if (list.length === 1) {

    addFrameQueue(list[0], 1, time)

  } else {

    for (let line = 1, first = list[0], i = 1; i <= list.length; i++) {

      if (list[i] && first - list[i] === 1) {
        first = list[i];
        line += 1;

      } else {
        addFrameQueue(first, line, time);
        line = 1;
        first = list[i];
      }
    }
  }
}

function drawNow(frameObj, base) {

  let { floor, move } = frameObj;

  amt_h = (base ? floor + base : floor) * cs;

  cuShCanvas.fillStyle = '#1E1E1E';
  cuShCanvas.fillRect(0, 0, amt_w, amt_h + cs)
  cuShCanvas.drawImage(bgLayerEl, 0, 0, amt_w, amt_h, 0, move, amt_w, amt_h)
}

let amt_base = 0;

function drawBgAnimate() {

  if (amt_wait) {
    amt_wait--;
    return false;
  }

  let value;

  if (value = amt_queue.shift()) {
    if (amt_base) {
      drawNow(value, amt_base)
    } else {
      drawNow(value);
    }
  }

  if (typeof amt_queue[0] === 'function') {
    (amt_queue.shift())();
    amt_base = amt_queue.shift();
    if (!amt_queue.length) {
      amt_base = 0;
      amt_wait = amt_wait_v;
      return true;
    }
  }

  return false;
}

// 程序画面核心循环

let opm_ready = false;
let opm_step = 0;
let opm_beginTime;

function tableAnimation() {

  if (!isNotDrawCS) {
    drawCS();
  } else if (drawBgAnimate()) {
    updateScore()
  }

  if (isDrawBg) {
    drawBg();
    isDrawBg = false;
  }
  //消行动画帧数优化
  if (!opm_is) {
    if (!opm_ready) {
      opm_beginTime = new Date().getTime()
      opm_ready = true;
    } else {
      opm_step += 1;
      // 60帧 60 * 16.67 = 1000.2 ms = 1s
      if (opm_step === 60) {
        opm_frame = (new Date().getTime() - opm_beginTime) / 60;
        // 5 ~ 19 : 60Hz ~ 144Hz
        if (opm_frame > 4 && opm_frame < 20) {
          localData.opm = opm_is = true;
          localData.frame = opm_frame;
          amt_wait = amt_wait_v = Math.floor(amt_wait_time / opm_frame)
          saveData()
        } else {
          opm_is = true;
        }
      }
    }
  }

  if (gameStart) {
    window.requestAnimationFrame(tableAnimation);
  }
}

function requestFullScreen(el) {
  let requestMethod = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullScreen;
  if (requestMethod) {
    requestMethod.call(el);
  } else if (typeof window.ActiveXObject !== "undefined") {
    let wscript = new ActiveXObject("WScript.Shell");
    if (wscript !== null) {
      wscript.SendKeys("{F11}");
    }
  }
}

function fullscreenmode() {
  requestFullScreen(document.documentElement);
}

function exitscreenmode() {
  if (document.exitFullScreen) {
    document.exitFullScreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}
