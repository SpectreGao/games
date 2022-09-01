//作者：张晓雷
//邮箱：zhangxiaolei@outlook.com
//AI 基于盘面分析，无预测能力。
//2021-1-4 初步完成

//╮(╯▽╰)╭
//因为写“五子棋AI”的缘故，了解了一下五子棋，后来只是掌握了一个小技巧，结果就能稳赢这个“AI”。
//这个“AI”之所以代码这么多，是因为在写之前并不会玩五子棋，做了一些毫无意义的“优化”。
//算了，都存起来吧。。。
//ε(┬┬﹏┬┬)3

const log = console.log;
const QSA = name => document.querySelectorAll(name);
const QS = name => document.querySelector(name);
QS('.desk').oncontextmenu = e => e.preventDefault();

let lastFocusEle,
    gameStart = false,
    gameOver = false,
    ai_done = true,
    ui_ai = 'ai-stone',
    ui_man = 'man-stone',
    ui_focus = 'ai-stone ai-focus';

const table = [];

QSA('#border>div').forEach((line, yIndex) => {

    const lineArr = table[yIndex] = [];

    line.querySelectorAll('div').forEach((item, xIndex) => {

        item.addEventListener('mousedown', function (event) {

            if (!gameOver && ai_done && event.buttons === 1) {

                if (!gameStart) {
                    QS('#user-select').setAttribute('disabled', 'disabled')
                    gameStart = true;
                }
                if (!table[yIndex][xIndex].value) {
                    ai_done = false;
                    table[yIndex][xIndex].put(2)
                    setTimeout(() => {
                        AI_GO();
                        ai_done = true;
                    }, 200);
                }
            }
        })

        lineArr.push({
            el: item.querySelector('i'),
            value: 0,
            y: yIndex,
            x: xIndex,
            score: {
                ai: 0,
                man: 0
            },
            put: function (type) {
                if (type === 1) {
                    this.value = 1;
                    //默认黑
                    this.el.setAttribute('class', ui_focus)
                    lastFocusEle = this.el;
                } else if (type === 2) {
                    this.value = 2;
                    //默认白
                    this.el.setAttribute('class', ui_man)
                    if (lastFocusEle) {
                        lastFocusEle.setAttribute('class', ui_ai)
                    }
                }
                checkFive.stone = type;
                checkWin(this.y, this.x, checkFive);
            },
        });
    })
})

class logger {

    constructor(type) {
        this.type = type;
    }

    init() {

        this.stage = 1;
        this.score = 0;
        this.rise = 1;
        this.dist = 4;
        this.space = 0;
        this.same = false;

        this.kill = 0;
        this.killLock = false;

        this.empty_2 = 0;
        this.emptyLock_2 = false;

        this.empty_3 = 0;
        this.emptyLock_3 = false;

        this.adv3_2 = 0;
        this.adv3_2_end = false;

        this.adv3_3 = 0;
        this.adv3_3_end = false;
    }

    mid(stage) {
        this.dist = 4;
        this.same = false;
        this.stage = stage;
        this.killLock = false;
    }

    step(y, x) {

        if (this.kill === 3) {
            if (this.emptyLock_2 && this.emptyLock_3) {
                this.score = -3;
                return true;
            }
        } else if (this.kill >= 4) {
            this.score = -4;
            return true;
        }

        if (this.stage === 3) {
            if (this.adv3_2 && this.adv3_2_end || this.adv3_3 && this.adv3_3_end) {
                this.score = -3;
                return true;
            }
            if (this.space < 4) {
                this.score = 0;
            }
        }

        if (y >= 0 && y <= 14 && x >= 0 && x <= 14) {

            const stone = table[y][x].value;
            //自己
            if (stone === this.type) {
                //第一阶段
                if (this.stage === 1) {
                    !this.emptyLock_2 && this.empty_2++;
                    !this.killLock && this.kill++;
                    //第二阶段
                } else if (this.stage === 2) {

                    !this.emptyLock_3 && this.empty_3++;
                    !this.killLock && this.kill++;
                    //必须保留
                    if (this.kill >= 4) {
                        this.score = -4;
                        return true;
                    }
                    //第三阶段
                }
                //第一和第二阶段
                if (this.stage !== 3) {
                    this.space += 1;
                    this.score += 5;
                    this.score *= this.dist;
                    this.dist -= 1;
                    //连续
                    if (this.same) {
                        this.rise *= 2;
                    } else {
                        this.same = true;
                    }
                }
            } else if (stone === 0) {
                //空白
                //第一阶段
                if (this.stage === 1) {
                    if (this.empty_2 === 3) {
                        this.adv3_2_end = true;
                    }
                    this.emptyLock_2 = true;
                    //第二阶段
                } else if (this.stage === 2) {
                    if (this.empty_3 === 3) {
                        this.adv3_3_end = true;
                    }
                    this.emptyLock_3 = true;
                    if (this.empty_2 === 3) {
                        this.adv3_2++;
                    }
                    if (this.empty_2 > 1) {
                        this.score += this.empty_2 * 5;
                    }
                    //第三阶段
                } else if (this.stage === 3) {
                    if (this.empty_3 === 3) {
                        this.adv3_3++;
                    }
                    if (this.empty_3 > 1) {
                        this.score += this.empty_3 * 5
                    }
                }

                //第一和第二阶段
                if (this.stage !== 3) {
                    this.killLock = true;
                    this.space += 1;

                    //必须保留
                    if (this.kill >= 4) {
                        this.score = -4;
                        return true;
                    }
                    this.dist -= 1;
                }
            } else {
                //第一和第二阶段
                if (this.stage !== 3) {
                    if (this.kill >= 4) {
                        this.score = -4;
                        return true;
                    }
                }
                return true;
            }
        } else {
            return true;
        }
    }

    result() {
        return this.score < 0
            ? this.score
            : this.score * this.rise;
    }
}

const logger_ai = new logger(1);
const logger_man = new logger(2);

function walker(y, x, logg, best) {

    let max_y, max_x;

    //Up
    logg.init();
    max_y = y - 4;
    for (let i = y - 1; i >= max_y; i--) {
        if (logg.step(i, x)) break
    }
    logg.mid(2);
    //Down
    max_y = y + 4;
    for (let i = y + 1; i <= max_y; i++) {
        if (logg.step(i, x)) break
    }
    logg.mid(3);
    max_y = y - 4;
    for (let i = y - 1; i >= max_y; i--) {
        if (logg.step(i, x)) break
    }
    let ud = logg.result();

    //Left
    logg.init();
    max_x = x - 4;
    for (let i = x - 1; i >= max_x; i--) {
        if (logg.step(y, i)) break
    }
    logg.mid(2);
    //Right
    max_x = x + 4;
    for (let i = x + 1; i <= max_x; i++) {
        if (logg.step(y, i)) break
    }
    logg.mid(3);
    max_x = x - 4;
    for (let i = x - 1; i >= max_x; i--) {
        if (logg.step(y, i)) break
    }
    let lr = logg.result();

    //Left-Up
    logg.init();
    max_y = y - 4;
    max_x = x - 4;
    for (let i = y - 1, j = x - 1; i >= max_y; i--) {
        if (logg.step(i, j)) break
        j--;
    }
    logg.mid(2);
    //Right-Down
    max_y = y + 4;
    max_x = x + 4;
    for (let i = y + 1, j = x + 1; i <= max_y; i++) {
        if (logg.step(i, j)) break
        j++;
    }
    logg.mid(3);
    max_y = y - 4;
    max_x = x - 4;
    for (let i = y - 1, j = x - 1; i >= max_y; i--) {
        if (logg.step(i, j)) break
        j--;
    }
    let lu_rd = logg.result();

    //Right-Up
    logg.init();
    max_y = y - 4;
    max_x = x + 4;
    for (let i = y - 1, j = x + 1; i >= max_y; i--) {
        if (logg.step(i, j)) break
        j++;
    }
    logg.mid(2);
    //Left-Down
    max_y = y + 4;
    max_x = x - 4;
    for (let i = y + 1, j = x - 1; i <= max_y; i++) {
        if (logg.step(i, j)) break
        j--;
    }
    logg.mid(3);
    max_y = y - 4;
    max_x = x + 4;
    for (let i = y - 1, j = x + 1; i >= max_y; i--) {
        if (logg.step(i, j)) break
        j++;
    }
    let ru_ld = logg.result();

    for (let i of [-4, -3]) {
        if (ud === i || lr === i || lu_rd === i || ru_ld === i) {
            switch (i) {
                case -4: best.add(y, x, 44444); break
                case -3: best.add(y, x, 33333); break
            }
            return;
        }
    }

    let n = (ud && 1) + (lr && 1) + (lu_rd && 1) + (ru_ld && 1)

    best.add(y, x, (ud + lr + lu_rd + ru_ld) * n);
}

function random(begin, end) {
    return Math.floor(Math.random() * (end - begin + 1) + begin);
}

class bestScore {

    constructor(type) {
        this.list = [];
        this.type = type;
    }

    add(y, x, val) {
        if (val) {
            if (this.type === 1) {
                table[y][x].score.ai = val;
            } else {
                table[y][x].score.man = val;
            }
            if (this.list.length === 0) {
                this.list.push([y, x, val]);
            } else {
                let head = this.list[0][2];
                if (val > head) {
                    this.list = [];
                    this.list.push([y, x, val])
                } else if (val === head) {
                    this.list.push([y, x, val]);
                }
            }
        }
    }

    get() {
        return this.list.length ? this.list : [[0, 0, 0]];
    }

    reset() {
        this.list = [];
    }
}

const best_ai = new bestScore(1)
const best_man = new bestScore(2);

function AI_GO() {
    if (gameOver) return;
    best_ai.reset();
    best_man.reset();
    table.forEach((line, y) => {
        line.forEach((_, x) => {
            if (!table[y][x].value) {
                walker(y, x, logger_ai, best_ai);
                walker(y, x, logger_man, best_man);
            }
        })
    })
    let ai_ = best_ai.get();
    let man_ = best_man.get();
    let ai = ai_.length === 1 ? ai_[0] : ai_[random(0, ai_.length - 1)];
    let man = man_.length === 1 ? man_[0] : man_[random(0, man_.length - 1)];
    if (ai[2] === 0 && man[2] === 0) {
        winDisplay('gg')
    } else {
        if (ai[2] === 44444) {
            table[ai[0]][ai[1]].put(1)
        } else if (man[2] === 44444) {
            table[man[0]][man[1]].put(1)
        } else if (ai[2] === 33333) {
            table[ai[0]][ai[1]].put(1)
        } else if (man[2] === 33333) {
            table[man[0]][man[1]].put(1)
        } else {
            let eq = [];
            for (let a of ai_) {
                for (let m of man_) {
                    if (a[0] === m[0] && a[1] === m[1]) {
                        eq.push(a);
                    }
                }
            }
            if (eq.length) {
                eq = eq.length === 1 ? eq[0] : eq[random(0, eq.length - 1)];
                table[eq[0]][eq[1]].put(1);
                return;
            }
            if (man[2] > ai[2] * 2) {
                if (man_.length > 1) {
                    let cp = -Infinity, item, tmp;
                    for (let it of man_) {
                        tmp = it[2] + table[it[0]][it[1]].score.ai;
                        if (tmp > cp) {
                            item = it;
                            cp = tmp;
                        }
                    }
                    table[item[0]][item[1]].put(1);
                } else {
                    table[man[0]][man[1]].put(1)
                }
            } else {
                if (ai_.length > 1) {
                    let cp = -Infinity, item, tmp;
                    for (let it of ai_) {
                        tmp = it[2] + table[it[0]][it[1]].score.man;
                        if (tmp > cp) {
                            item = it;
                            cp = tmp;
                        }
                    }
                    table[item[0]][item[1]].put(1);
                } else {
                    table[ai[0]][ai[1]].put(1)
                }
            }
        }
    }
}

function winDisplay(val) {
    gameOver = !!val;
    QS('#win-display').innerText = val === 'ai'
        ? '电脑赢了！'
        : val === 'man'
            ? '玩家赢了！'
            : val === 'gg'
                ? '和局！'
                : '';
}

const checkFive = {

    sum: 0,

    stone: undefined,

    reset: function () {
        this.sum = 0;
    },

    step: function (y, x) {

        if (y >= 0 && y <= 14 && x >= 0 && x <= 14) {
            if (table[y][x].value === this.stone) {
                this.sum += 1;
                if (this.sum >= 4) {
                    if (this.stone === 1) {
                        winDisplay('ai')
                    } else if (this.stone === 2) {
                        winDisplay('man')
                    }
                }
            } else {
                return true;
            }
        } else {
            return true;
        }
    }
}

function checkWin(y, x, check) {

    let max_y, max_x;

    //Up
    check.reset();
    max_y = y - 4;
    for (let i = y - 1; i >= max_y; i--) {
        if (check.step(i, x)) break
    }
    //Down
    max_y = y + 4;
    for (let i = y + 1; i <= max_y; i++) {
        if (check.step(i, x)) break
    }

    //Left
    check.reset();
    max_x = x - 4;
    for (let i = x - 1; i >= max_x; i--) {
        if (check.step(y, i)) break
    }
    //Right
    max_x = x + 4;
    for (let i = x + 1; i <= max_x; i++) {
        if (check.step(y, i)) break
    }

    //Left-Up
    check.reset();
    max_y = y - 4;
    max_x = x - 4;
    for (let i = y - 1, j = x - 1; i >= max_y; i--) {
        if (check.step(i, j)) break
        j--;
    }
    //Right-Down
    max_y = y + 4;
    max_x = x + 4;
    for (let i = y + 1, j = x + 1; i <= max_y; i++) {
        if (check.step(i, j)) break
        j++;
    }

    //Right-Up
    check.reset();
    max_y = y - 4;
    max_x = x + 4;
    for (let i = y - 1, j = x + 1; i >= max_y; i--) {
        if (check.step(i, j)) break
        j++;
    }
    //Left-Down
    max_y = y + 4;
    max_x = x - 4;
    for (let i = y + 1, j = x - 1; i <= max_y; i++) {
        if (check.step(i, j)) break
        j--;
    }
}

function reset_game() {
    table.forEach((line, y) => {
        line.forEach((_, x) => {
            table[y][x].el.removeAttribute('class');
            table[y][x].value = 0;
        })
    })
    gameStart = false;
    gameOver = false;
    ai_done = true;
    lastFocusEle = null;
    winDisplay(false);
    QS('#user-select').removeAttribute('disabled')
}

QS('#start-ai').addEventListener('click', function () {
    reset_game();
    ai_done = false;
    if (!gameStart) {
        QS('#user-select').setAttribute('disabled', 'disabled')
        gameStart = true;
    }
    setTimeout(() => {
        table[7][7].put(1);
        ai_done = true;
    }, 300);
})

QS('#game-rst').addEventListener('click', function () {
    reset_game();
})

QS('#user-select').addEventListener('change', function (event) {
    let s = this.options.selectedIndex;
    if (s === 0) {
        ui_ai = 'ai-stone';
        ui_man = 'man-stone';
        ui_focus = 'ai-stone ai-focus';
        QS('#tips-ai').setAttribute('class', 'ai-stone')
        QS('#tips-man').setAttribute('class', 'man-stone')
    } else if (s === 1) {
        ui_ai = 'man-stone';
        ui_man = 'ai-stone';
        ui_focus = 'man-stone man-focus';
        QS('#tips-ai').setAttribute('class', 'man-stone')
        QS('#tips-man').setAttribute('class', 'ai-stone')
    }
})
