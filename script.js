const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

// 游戏配置
const GRID_SIZE = 20;
let tileCountX, tileCountY;
let score = 0;
let dx = 1, dy = 0; // 初始向右移动
let nextDx = 1, nextDy = 0;
let snake = [];
let food = { x: 5, y: 5 };
let gameLoop;
let isGameOver = false;

// 触摸控制变量
let touchStartX = 0;
let touchStartY = 0;

function initGame() {
    resizeCanvas();
    resetGameState();
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(draw, 100); // 10FPS
}

function resetGameState() {
    score = 0;
    scoreElement.innerText = score;
    dx = 1; dy = 0;
    nextDx = 1; nextDy = 0;
    isGameOver = false;
    gameOverScreen.classList.add('hidden');
    
    // 初始蛇位置（屏幕中心）
    const centerX = Math.floor(tileCountX / 2);
    const centerY = Math.floor(tileCountY / 2);
    snake = [
        { x: centerX, y: centerY },
        { x: centerX - 1, y: centerY },
        { x: centerX - 2, y: centerY }
    ];
    
    createFood();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    tileCountX = Math.floor(canvas.width / GRID_SIZE);
    tileCountY = Math.floor(canvas.height / GRID_SIZE);
}

function createFood() {
    food = {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY)
    };
    // 确保食物不在蛇身上
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
            createFood();
            break;
        }
    }
}

function draw() {
    if (isGameOver) return;

    moveSnake();
    
    if (checkCollision()) {
        endGame();
        return;
    }

    // 清屏
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画食物
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);

    // 画蛇
    ctx.fillStyle = 'lime';
    snake.forEach((part, index) => {
        // 头部稍微亮一点
        if (index === 0) ctx.fillStyle = '#00FF00';
        else ctx.fillStyle = 'green';
        
        ctx.fillRect(part.x * GRID_SIZE, part.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    });
}

function moveSnake() {
    dx = nextDx;
    dy = nextDy;
    
    let nextX = snake[0].x + dx;
    let nextY = snake[0].y + dy;

    // 无限模式：穿透边界
    if (nextX < 0) nextX = tileCountX - 1;
    else if (nextX >= tileCountX) nextX = 0;
    
    if (nextY < 0) nextY = tileCountY - 1;
    else if (nextY >= tileCountY) nextY = 0;

    const head = { x: nextX, y: nextY };
    snake.unshift(head);

    // 吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.innerText = score;
        createFood();
    } else {
        snake.pop();
    }
}

function checkCollision() {
    const head = snake[0];
    
    // 撞到自己
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            return true;
        }
    }
    
    return false;
}

function endGame() {
    isGameOver = true;
    gameOverScreen.classList.remove('hidden');
    clearInterval(gameLoop);
}

// 输入处理 - 键盘
window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp':
            if (dy === 0) { nextDx = 0; nextDy = -1; }
            break;
        case 'ArrowDown':
            if (dy === 0) { nextDx = 0; nextDy = 1; }
            break;
        case 'ArrowLeft':
            if (dx === 0) { nextDx = -1; nextDy = 0; }
            break;
        case 'ArrowRight':
            if (dx === 0) { nextDx = 1; nextDy = 0; }
            break;
    }
});

// 输入处理 - 触摸（滑动控制）
canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // 确定滑动方向（取位移较大的轴）
    if (Math.abs(diffX) > Math.abs(diffY)) {
        // 水平滑动
        if (Math.abs(diffX) > 30) { // 阈值防止误触
            if (diffX > 0 && dx === 0) { nextDx = 1; nextDy = 0; }
            else if (diffX < 0 && dx === 0) { nextDx = -1; nextDy = 0; }
        }
    } else {
        // 垂直滑动
        if (Math.abs(diffY) > 30) {
            if (diffY > 0 && dy === 0) { nextDx = 0; nextDy = 1; }
            else if (diffY < 0 && dy === 0) { nextDx = 0; nextDy = -1; }
        }
    }
}, { passive: true });

// 窗口大小改变
window.addEventListener('resize', () => {
    resizeCanvas();
});

restartBtn.addEventListener('click', initGame);

// 启动游戏
initGame();

