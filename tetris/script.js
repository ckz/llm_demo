// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#000000',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#00FFFF',
    '#FF00FF',
    '#FFA500'
];

// 方块形状
const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]] // Z
];

// 游戏状态
let canvas;
let ctx;
let nextCanvas;
let nextCtx;
let board;
let piece;
let nextPiece;
let score = 0;
let level = 1;
let gameOver = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let requestId = null;

// 初始化游戏
function init() {
    canvas = document.getElementById('tetris');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('next');
    nextCtx = nextCanvas.getContext('2d');
    
    // 设置画布缩放
    ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);
    
    board = createBoard();
    addListeners();
    resetGame();
}

// 创建游戏板
function createBoard() {
    return Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// 创建新方块
function createPiece(type) {
    return {
        pos: {x: type === 4 ? 4 : 3, y: 0},
        shape: SHAPES[type],
        color: type
    };
}

// 重置游戏
function resetGame() {
    board = createBoard();
    score = 0;
    level = 1;
    gameOver = false;
    updateScore();
    piece = createPiece(Math.floor(Math.random() * 7) + 1);
    nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
}

// 绘制方块
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBoard();
    drawPiece(ctx, piece);
    drawNext();
}

// 绘制游戏板
function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(x, y, 1, 1);
            }
        });
    });
}

// 绘制当前方块
function drawPiece(context, piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + piece.pos.x, y + piece.pos.y, 1, 1);
            }
        });
    });
}

// 绘制下一个方块
function drawNext() {
    nextCtx.fillStyle = '#fff';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawPiece(nextCtx, {
        pos: {x: 1, y: 1},
        shape: nextPiece.shape,
        color: nextPiece.color
    });
}

// 碰撞检测
function collide() {
    const [m, o] = [piece.shape, piece.pos];
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 合并方块到游戏板
function merge() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = value;
            }
        });
    });
}

// 旋转方块
function rotate() {
    const pos = piece.pos.x;
    let offset = 1;
    const matrix = piece.shape.map((row, i) =>
        row.map((val, j) => piece.shape[piece.shape.length - 1 - j][i])
    );

    const prevShape = piece.shape;
    piece.shape = matrix;

    while (collide()) {
        piece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.shape[0].length) {
            piece.shape = prevShape;
            piece.pos.x = pos;
            return;
        }
    }
}

// 移动方块
function move(dir) {
    piece.pos.x += dir;
    if (collide()) {
        piece.pos.x -= dir;
    }
}

// 下落方块
function drop() {
    piece.pos.y++;
    if (collide()) {
        piece.pos.y--;
        merge();
        clearLines();
        if (piece.pos.y === 0) {
            gameOver = true;
            return;
        }
        piece = nextPiece;
        nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
    }
    dropCounter = 0;
}

// 清除完整行
function clearLines() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y > 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        linesCleared++;
        y++;
    }
    if (linesCleared > 0) {
        score += [40, 100, 300, 1200][linesCleared - 1] * level;
        level = Math.floor(score / 1000) + 1;
        dropInterval = 1000 - (level - 1) * 50;
        updateScore();
    }
}

// 更新分数显示
function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
}

// 游戏循环
function update(time = 0) {
    if (gameOver) {
        cancelAnimationFrame(requestId);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    
    if (dropCounter > dropInterval) {
        drop();
    }
    
    draw();
    requestId = requestAnimationFrame(update);
}

// 添加事件监听
function addListeners() {
    document.addEventListener('keydown', event => {
        if (gameOver) return;
        
        switch(event.keyCode) {
            case 37: // 左箭头
                move(-1);
                break;
            case 39: // 右箭头
                move(1);
                break;
            case 40: // 下箭头
                drop();
                break;
            case 38: // 上箭头
                rotate();
                break;
        }
    });
    
    document.getElementById('start-btn').addEventListener('click', () => {
        resetGame();
        update();
    });
}

// 初始化游戏
init();