/**
 * 游戏引擎 - 事件驱动的游戏逻辑核心
 * 
 * 核心理念：
 * 1. 逻辑与渲染完全分离
 * 2. 使用固定时间步长（Fixed Timestep）确保游戏逻辑稳定
 * 3. 通过事件系统通知渲染器
 * 4. 支持暂停、恢复等高级功能
 */
class GameEngine {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.logicLoopId = null;
        this.lastLogicTime = 0;
        this.accumulator = 0; // 时间累加器
        
        // 游戏实体
        this.snake = null;
        this.foodManager = null;
        this.knifeManager = null;
        
        // 游戏状态
        this.score = 0;
        this.maxSnakeLength = 0;
        this.tileCountX = 0;
        this.tileCountY = 0;
        this.isGameOver = false;
        
        // 核心性能重构：将逻辑更新与蛇移动频率解耦
        // 现在逻辑更新频率为 60FPS (约 16ms)，确保物理平滑
        this.fixedDeltaTime = 1000 / 60; 
        this.snakeMoveTimer = 0; // 专门控制蛇网格移动的计时器
        this.moveInterval = MOVE_INTERVAL; // 蛇的移动间隔
    }

    /**
     * 初始化游戏
     */
    init(tileCountX, tileCountY, canvasWidth, canvasHeight) {
        this.tileCountX = tileCountX;
        this.tileCountY = tileCountY;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // 创建游戏实体
        this.snake = new Snake();
        this.foodManager = new FoodManager();
        this.knifeManager = new KnifeManager(canvasWidth, canvasHeight);
        
        // 重置游戏状态
        this.reset();
        
        // 发布初始化完成事件
        eventBus.emit('game:initialized', {
            tileCountX: this.tileCountX,
            tileCountY: this.tileCountY
        });
    }

    /**
     * 重置游戏
     */
    reset() {
        this.score = 0;
        this.isGameOver = false;
        this.accumulator = 0;
        this.snakeMoveTimer = 0;
        this.moveInterval = MOVE_INTERVAL;
        
        // 重置实体
        this.snake.reset(this.tileCountX, this.tileCountY);
        this.foodManager.reset();
        this.foodManager.create(this.tileCountX, this.tileCountY, this.snake.body);
        this.knifeManager.reset();
        
        // 更新最大长度
        if (this.snake.body.length > this.maxSnakeLength) {
            this.maxSnakeLength = this.snake.body.length;
        }
        
        // 发布重置事件
        eventBus.emit('game:reset', {
            score: this.score,
            maxSnakeLength: this.maxSnakeLength
        });
        
        // 触发重绘
        eventBus.emit('game:stateChanged');
    }

    /**
     * 启动游戏循环
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastLogicTime = performance.now();
        
        // 启动逻辑循环（使用 requestAnimationFrame 但只执行逻辑）
        this.startLogicLoop();
        
        eventBus.emit('game:started');
    }

    /**
     * 暂停游戏
     */
    pause() {
        this.isPaused = true;
        eventBus.emit('game:paused');
    }

    /**
     * 恢复游戏
     */
    resume() {
        this.isPaused = false;
        this.lastLogicTime = performance.now();
        eventBus.emit('game:resumed');
    }

    /**
     * 停止游戏
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.logicLoopId) {
            cancelAnimationFrame(this.logicLoopId);
            this.logicLoopId = null;
        }
        
        eventBus.emit('game:stopped');
    }

    /**
     * 游戏逻辑循环
     * 
     * 使用固定时间步长（Fixed Timestep）算法：
     * - 确保游戏逻辑以恒定速率更新
     * - 与帧率无关，保证在不同设备上行为一致
     */
    startLogicLoop() {
        const loop = (timestamp) => {
            if (!this.isRunning || this.isGameOver) return;
            
            // 计算真实经过的时间
            const deltaTime = timestamp - this.lastLogicTime;
            this.lastLogicTime = timestamp;
            
            // 如果暂停，跳过逻辑更新但保持循环
            if (!this.isPaused) {
                // 将真实时间累加到累加器
                this.accumulator += deltaTime;
                
                // 当累加器超过固定时间步长时，执行逻辑更新
                while (this.accumulator >= this.fixedDeltaTime) {
                    this.updateLogic(this.fixedDeltaTime);
                    this.accumulator -= this.fixedDeltaTime;
                }
            }
            
            // 继续循环
            this.logicLoopId = requestAnimationFrame(loop);
        };
        
        this.logicLoopId = requestAnimationFrame(loop);
    }

    /**
     * 更新游戏逻辑（固定时间步长）
     */
    updateLogic(deltaTime) {
        // 1. 更新蛇的状态管理器（每 16ms 更新一次，非常平滑）
        if (this.snake && this.snake.stateManager) {
            this.snake.stateManager.update(deltaTime);
            
            // 根据状态调整移动速度
            if (this.snake.stateManager.flags.isSpeeding) {
                this.moveInterval = SUPER_MOVE_INTERVAL;
            } else {
                this.moveInterval = MOVE_INTERVAL;
            }
        }

        // 2. 更新飞刀物理（每 16ms 更新一次，解决卡顿感）
        if (this.knifeManager.update(deltaTime, this.snake)) {
            // 如果处于无敌状态，不游戏结束
            if (!this.snake.isInvincible) {
                this.gameOver();
                return;
            }
        }

        // 3. 处理蛇的网格移动（保持经典的网格逻辑，但视觉上将通过插值平滑）
        this.snakeMoveTimer += deltaTime;
        if (this.snakeMoveTimer >= this.moveInterval) {
            this.snakeMoveTimer -= this.moveInterval;
            this.moveSnake();
        }
        
        // 发布状态变化事件（通知渲染器重绘）
        eventBus.emit('game:stateChanged');
    }

    /**
     * 执行蛇的网格移动逻辑
     */
    moveSnake() {
        const result = this.snake.move(this.tileCountX, this.tileCountY, this.foodManager);
        
        // 处理得分
        if (result.scoreGain > 0) {
            this.score += result.scoreGain;
            
            // 更新最大长度
            if (this.snake.body.length > this.maxSnakeLength) {
                this.maxSnakeLength = this.snake.body.length;
            }
            
            // 发布得分变化事件
            eventBus.emit('game:scoreChanged', {
                score: this.score,
                maxSnakeLength: this.maxSnakeLength,
                foodType: result.type
            });
        }
        
        // 处理特殊食物
        if (result.type === 'special') {
            // 触发动画
            eventBus.emit('game:specialFoodEaten');
            
            // 生成飞刀：不再重置，让飞刀持续累加
            this.knifeManager.spawn(3);
        }

        // 处理超级食物 (food3)
        if (result.type === 'super') {
            // 使用新的状态管理器添加效果
            this.snake.stateManager.addEffect('invincible', SUPER_FOOD_DURATION);
            this.snake.stateManager.addEffect('speedBoost', SUPER_FOOD_DURATION);
            
            Assets.play('kemiao'); // 播放加速音效
            console.log("触发超级效果：加速 + 无敌");
        }
        
        // 检查自碰撞
        if (this.snake.checkSelfCollision()) {
            // 自碰撞目前设定也是无敌无法避免的
            if (!this.snake.isInvincible) {
                this.gameOver();
                return;
            }
        }
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.isGameOver = true;
        this.stop();
        
        Assets.play('dead');
        
        eventBus.emit('game:over', {
            score: this.score,
            maxSnakeLength: this.maxSnakeLength
        });
    }

    /**
     * 设置蛇的方向
     */
    setSnakeDirection(dx, dy) {
        if (this.snake && !this.isGameOver && !this.isPaused) {
            this.snake.setDirection(dx, dy);
        }
    }

    /**
     * 调整画布大小
     */
    resize(tileCountX, tileCountY, canvasWidth, canvasHeight) {
        this.tileCountX = tileCountX;
        this.tileCountY = tileCountY;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // 更新飞刀管理器的画布尺寸
        if (this.knifeManager) {
            this.knifeManager.updateCanvasSize(canvasWidth, canvasHeight);
        }
        
        // 重新生成食物
        if (this.foodManager) {
            this.foodManager.create(this.tileCountX, this.tileCountY, this.snake.body);
        }
        
        eventBus.emit('game:resize', {
            tileCountX: this.tileCountX,
            tileCountY: this.tileCountY
        });
        
        eventBus.emit('game:stateChanged');
    }

    /**
     * 获取渲染数据（新增 progress 用于平滑插值）
     */
    getRenderData() {
        return {
            snake: this.snake,
            foodManager: this.foodManager,
            knifeManager: this.knifeManager,
            score: this.score,
            maxSnakeLength: this.maxSnakeLength,
            // 蛇移动的进度百分比 (0.0 到 1.0)
            snakeMoveProgress: Math.min(1, this.snakeMoveTimer / this.moveInterval)
        };
    }
}

