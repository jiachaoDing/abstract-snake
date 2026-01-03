const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

// 图片资源
const snakeHeadImg = new Image();
snakeHeadImg.src = 'assets/head.png';
const snakeBodyImg = new Image();
snakeBodyImg.src = 'assets/body.png';
const foodImg = new Image();
foodImg.src = 'assets/food.png';

let imagesLoaded = {
    head: false,
    body: false,
    food: false
};

snakeHeadImg.onload = () => imagesLoaded.head = true;
snakeBodyImg.onload = () => imagesLoaded.body = true;
foodImg.onload = () => imagesLoaded.food = true;

// 音频资源
const eatAudio = new Audio('assets/eatfood.aac');
const deadAudio = new Audio('assets/dead.aac');

function playAudio(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play failed:", e));
}

// 游戏配置
const GRID_SIZE = 40;
let tileCountX, tileCountY;
let score = 0;
let dx = 1, dy = 0; // 初始向右移动
let nextDx = 1, nextDy = 0;
let snake = [];
let food = { x: 5, y: 5 };
let gameLoop;
let isGameOver = false;

// 帧率控制
let lastTime = 0;
let moveTimer = 0;
const MOVE_INTERVAL = 150; // 蛇移动的逻辑间隔 (150ms)，控制移动速度

// 触摸控制变量
let touchStartX = 0;
let touchStartY = 0;

function initGame() {
    resizeCanvas();
    resetGameState();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    lastTime = 0;
    moveTimer = 0;
    gameLoop = requestAnimationFrame(gameStep);
}

function gameStep(timestamp) {
    if (isGameOver) return;

    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    moveTimer += deltaTime;

    // 逻辑更新：只有达到 MOVE_INTERVAL 时才移动蛇
    if (moveTimer >= MOVE_INTERVAL) {
        moveSnake();
        if (checkCollision()) {
            endGame();
            return;
        }
        moveTimer = 0;
    }

    // 画面绘制：每一帧都进行 (通常是 60FPS)，确保动画流畅
    draw();

    gameLoop = requestAnimationFrame(gameStep);
}

function resetGameState() {
    score = 0;
    scoreElement.innerText = score;
    dx = 1; dy = 0;
    nextDx = 1; nextDy = 0;
    isGameOver = false;
    gameOverScreen.classList.add('hidden');
    
    const centerX = Math.floor(tileCountX / 2);
    const centerY = Math.floor(tileCountY / 2);
    // 初始长度为 12，以配合 1 body = 4 格子的逻辑 (3个body)
    snake = [];
    for (let i = 0; i < 12; i++) {
        snake.push({ x: centerX - i, y: centerY, dx: 1, dy: 0 });
    }
    
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
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
            createFood();
            break;
        }
    }
}

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imagesLoaded.food) {
        const targetSize = GRID_SIZE * 3;
        const ratio = foodImg.width / foodImg.height;
        let drawW = targetSize, drawH = targetSize;
        if (ratio > 1) drawH = targetSize / ratio;
        else drawW = targetSize * ratio;
        
        ctx.drawImage(foodImg, 
            food.x * GRID_SIZE - (drawW - GRID_SIZE) / 2, 
            food.y * GRID_SIZE - (drawH - GRID_SIZE) / 2, 
            drawW, drawH);
    } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    }

    // 画蛇 - 分层绘制：先画身体，后画头
    // 1. 绘制身体部分 (index % 4 === 2) - 这样可以让身体分布在 3, 7, 11... 个格子，避开头部
    snake.forEach((part, index) => {
        if (index === 0) return; // 先跳过头
        
        if (index % 4 === 2) {
            ctx.save();
            ctx.translate(part.x * GRID_SIZE + GRID_SIZE / 2, part.y * GRID_SIZE + GRID_SIZE / 2);

            if (imagesLoaded.body) {
                ctx.rotate(-Math.PI / 2); // 额外逆时针旋转 90 度
                const bodySize = GRID_SIZE * 6; 
                // 保持比例绘制
                const ratio = snakeBodyImg.width / snakeBodyImg.height;
                let drawW = bodySize, drawH = bodySize;
                if (ratio > 1) drawH = bodySize / ratio;
                else drawW = bodySize * ratio;

                ctx.drawImage(snakeBodyImg, -drawW / 2, -drawH / 2, drawW, drawH);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(-GRID_SIZE/2, -GRID_SIZE/2, GRID_SIZE, GRID_SIZE);
            }
            ctx.restore();
        }
    });

    // 2. 绘制蛇头 (确保在身体之上)
    const head = snake[0];
    ctx.save();
    ctx.translate(head.x * GRID_SIZE + GRID_SIZE / 2, head.y * GRID_SIZE + GRID_SIZE / 2);
    
    if (imagesLoaded.head) {
        const headSize = GRID_SIZE * 2;
        // 保持比例绘制本体
        const ratio = snakeHeadImg.width / snakeHeadImg.height;
        let drawW = headSize, drawH = headSize;
        if (ratio > 1) drawH = headSize / ratio;
        else drawW = headSize * ratio;

        ctx.drawImage(snakeHeadImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(-GRID_SIZE/2, -GRID_SIZE/2, GRID_SIZE, GRID_SIZE);
    }
    ctx.restore();
}

function moveSnake() {
    dx = nextDx;
    dy = nextDy;
    let nextX = snake[0].x + dx;
    let nextY = snake[0].y + dy;

    if (nextX < 0) nextX = tileCountX - 1;
    else if (nextX >= tileCountX) nextX = 0;
    if (nextY < 0) nextY = tileCountY - 1;
    else if (nextY >= tileCountY) nextY = 0;

    const head = { x: nextX, y: nextY, dx: dx, dy: dy };
    snake.unshift(head);

    // 吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.innerText = score;
        playAudio(eatAudio);
        createFood();
        // 吃到食物时增加四节，因为一个 body 占四个格子
        const tail = snake[snake.length - 1];
        for (let i = 0; i < 4; i++) {
            snake.push({ ...tail });
        }
    } else {
        snake.pop();
    }
}

function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) return true;
    }
    return false;
}

function endGame() {
    isGameOver = true;
    playAudio(deadAudio);
    gameOverScreen.classList.remove('hidden');
    if (gameLoop) cancelAnimationFrame(gameLoop);
}

window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp': if (dy === 0) { nextDx = 0; nextDy = -1; } break;
        case 'ArrowDown': if (dy === 0) { nextDx = 0; nextDy = 1; } break;
        case 'ArrowLeft': if (dx === 0) { nextDx = -1; nextDy = 0; } break;
        case 'ArrowRight': if (dx === 0) { nextDx = 1; nextDy = 0; } break;
    }
});

canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) {
            if (diffX > 0 && dx === 0) { nextDx = 1; nextDy = 0; }
            else if (diffX < 0 && dx === 0) { nextDx = -1; nextDy = 0; }
        }
    } else {
        if (Math.abs(diffY) > 30) {
            if (diffY > 0 && dy === 0) { nextDx = 0; nextDy = 1; }
            else if (diffY < 0 && dy === 0) { nextDx = 0; nextDy = -1; }
        }
    }
}, { passive: true });

window.addEventListener('resize', resizeCanvas);
restartBtn.addEventListener('click', initGame);
initGame();
