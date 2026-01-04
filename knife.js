// 飞刀类
class Knife {
    constructor() {
        this.reset(0, 0);
    }

    /**
     * 重置飞刀状态（用于对象池复用）
     */
    reset(canvasWidth, canvasHeight, side = 'right') {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // 速度基于 GRID_SIZE 缩放
        const speed = (GRID_SIZE / 40) * (25 + Math.random() * 25);
        let angle;

        // 根据发射边设置初始位置和发射角度
        switch (side) {
            case 'right':
                this.x = canvasWidth;
                this.y = Math.random() * canvasHeight;
                angle = Math.PI / 2 + Math.random() * Math.PI;
                break;
            case 'top':
                this.x = Math.random() * canvasWidth;
                this.y = 0;
                angle = Math.random() * Math.PI;
                break;
            case 'left':
                this.x = 0;
                this.y = Math.random() * canvasHeight;
                angle = -Math.PI / 2 + Math.random() * Math.PI;
                break;
            case 'bottom':
                this.x = Math.random() * canvasWidth;
                this.y = canvasHeight;
                angle = Math.PI + Math.random() * Math.PI;
                break;
            default:
                this.x = 0;
                this.y = 0;
                angle = 0;
        }

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.rotation = 0;
        // 降低旋转速度，设为每 150ms 旋转的弧度
        this.rotationSpeed = 0.5 + Math.random() * 0.5; 
        
        this.lifetime = 15000; 
        this.age = 0;
        this.isExpired = false;

        // 尺寸基于 GRID_SIZE 缩放
        this.width = GRID_SIZE * 2.5; 
        this.height = GRID_SIZE * 2.5;
    }

    update(deltaTime, snake) {
        if (this.isExpired) return null;

        // 速度改为基于毫秒的物理平滑更新
        // 由于现在的逻辑频率是 60fps (16.67ms)，而原本飞刀是在 150ms 的频率下移动 vx/vy
        // 为了保持原有的视觉速度感，我们需要将位移量平摊到每一帧
        // 原本 150ms 移动 vx，现在每 16.67ms 移动一次，所以每次移动量是原 vx 的 (16.67/150) 倍
        // 但为了应对不稳定的 deltaTime，我们使用 (deltaTime / 150) 作为缩放系数
        const moveScale = deltaTime / 150; 
        this.x += this.vx * moveScale;
        this.y += this.vy * moveScale;

        // 实现"穿墙"逻辑 (Wrap around)
        if (this.x < 0) this.x = this.canvasWidth;
        else if (this.x > this.canvasWidth) this.x = 0;
        
        if (this.y < 0) this.y = this.canvasHeight;
        else if (this.y > this.canvasHeight) this.y = 0;

        // 旋转也改为基于时间的平滑更新
        this.rotation += this.rotationSpeed * moveScale;
        
        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.isExpired = true;
        }

        // 碰撞检测：返回碰撞结果
        return this.checkCollision(snake);
    }

    checkCollision(snake) {
        const kx = this.x;
        const ky = this.y;
        
        const radius = GRID_SIZE * 1.2;
        const radiusSq = radius * radius;

        // 优化：使用蛇的空间占据网格，只检查飞刀附近的格子
        if (snake.occupancyGrid) {
            const tileX = Math.floor(kx / GRID_SIZE);
            const tileY = Math.floor(ky / GRID_SIZE);
            
            const range = 2; 
            const gridW = snake.occupancyGrid.length;
            const gridH = snake.occupancyGrid[0].length;
            
            for (let ix = tileX - range; ix <= tileX + range; ix++) {
                for (let iy = tileY - range; iy <= tileY + range; iy++) {
                    const tx = (ix % gridW + gridW) % gridW;
                    const ty = (iy % gridH + gridH) % gridH;
                    
                    const segmentIndices = snake.occupancyGrid[tx][ty];
                    if (segmentIndices && segmentIndices.length > 0) {
                        for (const i of segmentIndices) {
                            const part = snake.body[i];
                            if (!part) continue;

                            const px = part.x * GRID_SIZE + GRID_SIZE / 2;
                            const py = part.y * GRID_SIZE + GRID_SIZE / 2;

                            const dx = kx - px;
                            const dy = ky - py;
                            const distSq = dx * dx + dy * dy;
                            
                            if (distSq < radiusSq) {
                                // 核心修改：无敌状态下，碰到蛇身任何部位飞刀都会消失，但不造成伤害
                                if (snake.isInvincible) {
                                    this.isExpired = true;
                                    return null;
                                }

                                if (i === 0) {
                                    return 'head_hit';
                                } else {
                                    this.onHitBody(snake, i);
                                    return 'body_hit';
                                }
                            }
                        }
                    }
                }
            }
            return null;
        }

        // 备用方案：如果网格未初始化，回退到全量检查
        for (let i = 0; i < snake.body.length; i++) {
            const part = snake.body[i];
            const px = part.x * GRID_SIZE + GRID_SIZE / 2;
            const py = part.y * GRID_SIZE + GRID_SIZE / 2;

            const dx = kx - px;
            const dy = ky - py;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < radiusSq) {
                if (snake.isInvincible) {
                    this.isExpired = true;
                    return null;
                }

                if (i === 0) {
                    return 'head_hit';
                } else {
                    this.onHitBody(snake, i);
                    return 'body_hit';
                }
            }
        }
        return null;
    }

    onHitBody(snake, index) {
        // 二次确认：如果蛇处于无敌状态，不进行截断
        if (snake.isInvincible) return;

        Assets.play('kemiao');
        snake.body.splice(index);
        this.isExpired = true; 
        
        // 关键修复：被砍后立即更新占据网格，防止同一帧的其他飞刀访问错误索引
        const tileCountX = Math.floor(this.canvasWidth / GRID_SIZE);
        const tileCountY = Math.floor(this.canvasHeight / GRID_SIZE);
        snake.updateOccupancyGrid(tileCountX, tileCountY);
    }
}

// 飞刀管理器
class KnifeManager {
    constructor(canvasWidth = 800, canvasHeight = 600) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.knives = [];
        this.pool = []; // 飞刀对象池
        this.sides = ['right', 'top', 'left', 'bottom'];
        this.currentSideIndex = 0;
    }
    
    updateCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * 获取一个飞刀实例（从池中获取或创建新实例）
     */
    getKnife(side) {
        let knife;
        if (this.pool.length > 0) {
            knife = this.pool.pop();
            knife.reset(this.canvasWidth, this.canvasHeight, side);
        } else {
            knife = new Knife();
            knife.reset(this.canvasWidth, this.canvasHeight, side);
        }
        return knife;
    }

    spawn(count = 5) {
        const side = this.sides[this.currentSideIndex];
        for (let i = 0; i < count; i++) {
            this.knives.push(this.getKnife(side));
        }
        // 循环切换发射边
        this.currentSideIndex = (this.currentSideIndex + 1) % this.sides.length;
    }

    update(deltaTime, snake) {
        let isDead = false;
        for (let i = this.knives.length - 1; i >= 0; i--) {
            const knife = this.knives[i];
            const hitResult = knife.update(deltaTime, snake);
            if (hitResult === 'head_hit') {
                isDead = true;
            }
            
            if (knife.isExpired) {
                // 回收到对象池
                this.pool.push(this.knives.splice(i, 1)[0]);
            }
        }
        return isDead;
    }

    draw(ctx) {
        if (!ctx || !Assets.loaded.knife) return;
        
        const len = this.knives.length;
        const knifeImg = Assets.images.knife;
        for (let i = 0; i < len; i++) {
            const knife = this.knives[i];
            ctx.save();
            ctx.translate(knife.x, knife.y);
            ctx.rotate(knife.rotation);
            
            ctx.drawImage(
                knifeImg,
                -knife.width / 2, -knife.height / 2,
                knife.width, knife.height
            );
            ctx.restore();
        }
    }

    reset() {
        // 将所有活动的飞刀收回池中
        while (this.knives.length > 0) {
            this.pool.push(this.knives.pop());
        }
        this.currentSideIndex = 0;
    }
}
