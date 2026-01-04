/**
 * 主脚本 - 整合新架构的所有模块
 * 
 * 新架构优势：
 * 1. 事件驱动：模块间通过事件总线通信，完全解耦
 * 2. 按需渲染：只在游戏状态变化时重绘，大幅降低 CPU 使用
 * 3. 独立动画：动画系统有自己的渲染循环，不影响游戏主循环
 * 4. 性能监控：内置性能统计，可实时查看优化效果
 */

// ============= 全局变量 =============
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const animCanvas = document.getElementById('animCanvas');
const scoreElement = document.getElementById('score');
const maxLengthElement = document.getElementById('max-length');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const shareBtn = document.getElementById('share-btn');
const finalMaxLengthElement = document.getElementById('final-max-length');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const loadingStatus = startScreen.querySelector('.loading-status');

// ============= 核心系统初始化 =============
// 创建渲染器（负责游戏画布的智能渲染）
const renderer = new Renderer(canvas, ctx);

// 创建动画管理器（独立的动画系统）
const animationManager = new AnimationManager(animCanvas);

// 创建游戏引擎（游戏逻辑核心）
const gameEngine = new GameEngine();

// 创建背景星空
const starfield = new Starfield(canvas.width, canvas.height);

// 立即执行一次初始化调整，确保画布铺满全屏
resizeCanvas();

// 开启持续渲染，让背景在首页就开始动起来
renderer.continuousRender = true;

// ============= 注册动画 =============
animationManager.register('opening', {
    src: ASSET_BASE_URL + 'sprite_sheet_66.png',
    audioSrc: ASSET_BASE_URL + 'animation1.MP3',
    cols: 11,
    rows: 6,
    totalFrames: 66,
    frameDuration: SPECIAL_ANIM_CONFIG.frameDuration,
    scaleRatio: SPECIAL_ANIM_CONFIG.scale,
    brightness: SPECIAL_ANIM_CONFIG.brightness,
    audioDelay: 300
});

// ============= 设置渲染任务 =============
// 将游戏实体的绘制注册到渲染队列
renderer.addRenderTask('background', (ctx, deltaTime) => {
    starfield.update(deltaTime);
    starfield.draw(ctx);
}, 0);

renderer.addRenderTask('food', (ctx) => {
    try {
        const data = gameEngine.getRenderData();
        if (data && data.foodManager) {
            data.foodManager.draw(ctx);
        }
    } catch (e) {
        console.error('[Render] 绘制食物出错:', e);
    }
}, 1);

renderer.addRenderTask('snake', (ctx) => {
    try {
        const data = gameEngine.getRenderData();
        if (data && data.snake) {
            // 传入移动进度实现平滑渲染
            data.snake.draw(ctx, data.snakeMoveProgress);
        }
    } catch (e) {
        console.error('[Render] 绘制蛇出错:', e);
    }
}, 2);

renderer.addRenderTask('knives', (ctx) => {
    try {
        const data = gameEngine.getRenderData();
        if (data && data.knifeManager && data.knifeManager.knives) {
            data.knifeManager.draw(ctx);
        }
    } catch (e) {
        console.error('[Render] 绘制飞刀出错:', e);
    }
}, 3);

// ============= 事件订阅 =============
// 监听游戏状态变化
eventBus.on('game:scoreChanged', (data) => {
    scoreElement.innerText = data.score;
    maxLengthElement.innerText = data.maxSnakeLength;
}, 'UI');

eventBus.on('game:reset', (data) => {
    scoreElement.innerText = data.score;
    maxLengthElement.innerText = data.maxSnakeLength;
    gameOverScreen.classList.add('hidden');
    document.getElementById('score-board').style.display = 'block';
}, 'UI');

eventBus.on('game:over', (data) => {
    gameOverScreen.classList.remove('hidden');
    finalMaxLengthElement.innerText = data.maxSnakeLength;
    // 停止 BGM
    Assets.audio.bgm.pause();
}, 'UI');

eventBus.on('game:paused', () => {
    Assets.audio.bgm.pause();
}, 'BGM');

eventBus.on('game:resumed', () => {
    Assets.audio.bgm.play().catch(e => console.log("BGM play failed:", e));
}, 'BGM');

eventBus.on('game:started', () => {
    Assets.audio.bgm.currentTime = 0;
    Assets.audio.bgm.play().catch(e => console.log("BGM play failed:", e));
}, 'BGM');

eventBus.on('game:specialFoodEaten', () => {
    // 播放特殊食物动画
    animationManager.play('opening');
}, 'AnimationController');

// 监听窗口大小变化
eventBus.on('game:resize', () => {
    renderer.markDirty();
}, 'WindowManager');

// ============= 资源加载检测 =============
let assetCheckInterval = setInterval(() => {
    // 检查普通图片资源
    const totalImages = Object.keys(Assets.loaded).length;
    const loadedImages = Object.values(Assets.loaded).filter(v => v).length;
    
    // 检查动画资源（不仅要加载，还要完成预渲染）
    const animators = Array.from(animationManager.animations.values());
    const totalAnims = animators.length;
    const loadedAnims = animators.filter(a => a.isPreRendered).length;
    
    if (loadedImages === totalImages && loadedAnims === totalAnims) {
        loadingStatus.innerText = "所有资源已就绪（含预渲染动画）！";
        startBtn.classList.remove('hidden');
        clearInterval(assetCheckInterval);
    } else {
        loadingStatus.innerText = `资源加载中 (图片:${loadedImages}/${totalImages}, 动画:${loadedAnims}/${totalAnims})...`;
    }
}, 100);

// ============= 游戏控制函数 =============
function initGame() {
    startScreen.classList.add('hidden');
    resizeCanvas();
    
    // 初始化游戏引擎
    const tileCountX = Math.floor(canvas.width / GRID_SIZE);
    const tileCountY = Math.floor(canvas.height / GRID_SIZE);
    
    gameEngine.init(tileCountX, tileCountY, canvas.width, canvas.height);
    
    // 强制触发一次渲染
    renderer.markDirty();
    
    // 启动游戏
    gameEngine.start();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    animCanvas.width = canvas.width;
    animCanvas.height = canvas.height;
    
    // 通知动画管理器调整大小
    animationManager.resize(canvas.width, canvas.height);
    
    // 通知背景星空调整大小
    if (typeof starfield !== 'undefined') {
        starfield.resize(canvas.width, canvas.height);
    }
}

// ============= 输入处理 =============
// 键盘控制
window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp': 
            gameEngine.setSnakeDirection(0, -1); 
            break;
        case 'ArrowDown': 
            gameEngine.setSnakeDirection(0, 1); 
            break;
        case 'ArrowLeft': 
            gameEngine.setSnakeDirection(-1, 0); 
            break;
        case 'ArrowRight': 
            gameEngine.setSnakeDirection(1, 0); 
            break;
        case 'p':
        case 'P':
            // 暂停/恢复功能
            if (gameEngine.isPaused) {
                gameEngine.resume();
            } else {
                gameEngine.pause();
            }
            break;
        case 'd':
        case 'D':
            // 调试模式：显示性能统计
            console.log('=== 性能统计 ===');
            console.log('渲染器:', renderer.getPerformanceStats());
            console.log('动画管理器:', animationManager.getDebugInfo());
            console.log('事件总线:', eventBus.getDebugInfo());
            break;
    }
});

// 触摸控制
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) {
            gameEngine.setSnakeDirection(diffX > 0 ? 1 : -1, 0);
        }
    } else {
        if (Math.abs(diffY) > 30) {
            gameEngine.setSnakeDirection(0, diffY > 0 ? 1 : -1);
        }
    }
}, { passive: true });

// ============= 窗口事件 =============
window.addEventListener('resize', () => {
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    resizeCanvas();
    
    // 如果游戏已初始化，通知游戏引擎
    if (gameEngine.snake) {
        const tileCountX = Math.floor(canvas.width / GRID_SIZE);
        const tileCountY = Math.floor(canvas.height / GRID_SIZE);
        gameEngine.resize(tileCountX, tileCountY, canvas.width, canvas.height);
    }
});

// ============= 按钮事件 =============
restartBtn.addEventListener('click', () => {
    // 停止所有动画
    animationManager.stopAll();
    // 重新初始化游戏
    initGame();
});

shareBtn.addEventListener('click', () => {
    const maxLength = finalMaxLengthElement.innerText;
    const url = window.location.href;
    const shareText = `我在贪吃牢大中最长${maxLength}，你也来试试吧！\n${url}`;
    
    copyToClipboard(shareText);
});

function copyToClipboard(text) {
    // 创建隐藏的 textarea 用于兼容性复制
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // 确保在移动端不会触发页面滚动或弹出键盘
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    // 选中文字
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // 兼容 iOS

    let successful = false;
    try {
        // 优先使用传统的 execCommand('copy')，它在移动端浏览器（如微信）中稳定性更高
        successful = document.execCommand('copy');
    } catch (err) {
        successful = false;
    }

    if (successful) {
        showCopyFeedback();
    } else if (navigator.clipboard) {
        // 备选方案：使用现代 Clipboard API
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback();
        }).catch(err => {
            console.error('Clipboard API failed:', err);
            alert('复制失败，请手动长按链接分享');
        });
    } else {
        alert('复制失败，请手动长按链接分享');
    }

    document.body.removeChild(textArea);
}

function showCopyFeedback() {
    const originalText = shareBtn.innerText;
    shareBtn.innerText = '已复制链接！';
    shareBtn.style.backgroundColor = '#4CAF50';
    setTimeout(() => {
        shareBtn.innerText = originalText;
        shareBtn.style.backgroundColor = '#2196F3';
    }, 2000);
}

startBtn.addEventListener('click', initGame);

// ============= 性能监控（可选） =============
// 每5秒输出一次性能统计（开发模式）
if (window.location.search.includes('debug=true')) {
    eventBus.debugMode = true;
    setInterval(() => {
        console.log('=== 性能报告 ===');
        console.log('渲染器:', renderer.getPerformanceStats());
        console.log('动画:', animationManager.getDebugInfo());
    }, 5000);
}

// ============= 导出全局对象（便于调试） =============
window.gameDebug = {
    engine: gameEngine,
    renderer: renderer,
    animationManager: animationManager,
    eventBus: eventBus,
    getStats: () => ({
        renderer: renderer.getPerformanceStats(),
        animations: animationManager.getDebugInfo(),
        events: eventBus.getDebugInfo()
    })
};

console.log('🎮 游戏已加载！');
console.log('💡 提示：');
console.log('  - 按 P 键暂停/恢复');
console.log('  - 按 D 键查看性能统计');
console.log('  - 在 URL 添加 ?debug=true 开启自动性能监控');
console.log('  - 在控制台输入 gameDebug.getStats() 查看详细统计');
