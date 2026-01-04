// 蛇逻辑管理器
class Snake {
    constructor() {
        this.body = [];
        this.dx = 1;
        this.dy = 0;
        this.nextDx = 1;
        this.nextDy = 0;
        this.isInvincible = false; // 由 stateManager 维护
        this.stateManager = new SnakeStateManager(this); // 引入状态管理器
        this.occupancyGrid = null;
        this.occupiedTiles = []; // 记录当前占据的坐标，用于快速清除
    }

    reset(tileCountX, tileCountY) {
        this.dx = 1; this.dy = 0;
        this.nextDx = 1; this.nextDy = 0;
        this.isInvincible = false;
        this.stateManager.reset(); // 重置状态管理器
        const centerX = Math.floor(tileCountX / 2);
        const centerY = Math.floor(tileCountY / 2);
        this.body = [];
        this.occupiedTiles = [];
        
        // 初始化空间占据网格
        this.occupancyGrid = Array.from({ length: tileCountX }, () => 
            Array.from({ length: tileCountY }, () => [])
        );

        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            const x = centerX - i;
            const y = centerY;
            this.body.push({ x, y, dx: 1, dy: 0 });
            this.occupancyGrid[x][y].push(i);
            this.occupiedTiles.push({ x, y });
        }
    }

    setDirection(newDx, newDy) {
        if ((newDx !== 0 && this.dx === 0) || (newDy !== 0 && this.dy === 0)) {
            this.nextDx = newDx;
            this.nextDy = newDy;
        }
    }

    /**
     * 增量更新占据网格（优化点：不再全量清空网格，只清除上次记录的格子）
     */
    updateOccupancyGrid(tileCountX, tileCountY) {
        // 1. 只清除上次标记过的格子
        for (const tile of this.occupiedTiles) {
            this.occupancyGrid[tile.x][tile.y] = [];
        }
        this.occupiedTiles = [];

        // 2. 填充新位置
        for (let i = 0; i < this.body.length; i++) {
            const part = this.body[i];
            const x = (part.x % tileCountX + tileCountX) % tileCountX;
            const y = (part.y % tileCountY + tileCountY) % tileCountY;
            
            if (this.occupancyGrid[x][y].length === 0) {
                this.occupiedTiles.push({ x, y });
            }
            this.occupancyGrid[x][y].push(i);
        }
    }

    move(tileCountX, tileCountY, foodManager) {
        this.dx = this.nextDx;
        this.dy = this.nextDy;
        let nextX = this.body[0].x + this.dx;
        let nextY = this.body[0].y + this.dy;

        // 无限模式边界穿透
        if (nextX < 0) nextX = tileCountX - 1;
        else if (nextX >= tileCountX) nextX = 0;
        if (nextY < 0) nextY = tileCountY - 1;
        else if (nextY >= tileCountY) nextY = 0;

        const head = { x: nextX, y: nextY, dx: this.dx, dy: this.dy };
        this.body.unshift(head);

        const foodIndex = foodManager.checkCollision(head, tileCountX, tileCountY);
        
        if (foodIndex !== -1) {
            const eatenFood = foodManager.foods[foodIndex];
            const isSpecial = eatenFood.type === 'special';
            const isSuper = eatenFood.type === 'super';
            let scoreGain = 10;
            if (isSpecial) scoreGain = 50;
            if (isSuper) scoreGain = 100;
            
            if (eatenFood.type === 'normal') {
                // 普通食物：增加计数并增长身体 (增加 4 节逻辑长度)
                foodManager.food1EatenCount++;
                foodManager.food1EatenForSuperCount++;
                const tail = this.body[this.body.length - 1];
                for (let i = 0; i < 4; i++) this.body.push({ ...tail });
            } else {
                // 特殊/超级食物：增加身体 (增加 4 节逻辑长度)
                const tail = this.body[this.body.length - 1];
                this.body.pop(); // 先抵消 unshift
                for (let i = 0; i < 4; i++) this.body.push({ ...tail });
            }
            
            foodManager.foods.splice(foodIndex, 1);
            foodManager.create(tileCountX, tileCountY, this.body);
            
            // 仅在吃到普通食物时播放 eat 音效
            if (eatenFood.type === 'normal') {
                Assets.play('eat');
            }
            
            this.updateOccupancyGrid(tileCountX, tileCountY);
            return { scoreGain, type: eatenFood.type };
        } else {
            // 没有吃到任何东西，正常移除末尾
            this.body.pop();
            this.updateOccupancyGrid(tileCountX, tileCountY);
            return { scoreGain: 0, type: null };
        }
    }

    checkSelfCollision() {
        const head = this.body[0];
        const segmentsAtHead = this.occupancyGrid[head.x][head.y];
        // 如果该位置有超过一个段（头自己算一个），则发生自碰撞
        return segmentsAtHead.length > 1;
    }

    draw(ctx, progress = 0) {
        ctx.save();
        // 无敌状态下的发光效果
        if (this.isInvincible) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'gold';
        }

        // 缓存身体贴图尺寸计算
        let bodyDrawW = 0, bodyDrawH = 0;
        const hasBodyAsset = Assets.loaded.body;
        if (hasBodyAsset) {
            const bodySize = GRID_SIZE * 6;
            const ratio = Assets.images.body.width / Assets.images.body.height;
            bodyDrawW = bodySize;
            bodyDrawH = bodySize;
            if (ratio > 1) bodyDrawH = bodySize / ratio;
            else bodyDrawW = bodySize * ratio;
        }

        // 画身体 (从尾部开始画，确保头部在最上面)
        const bodyLen = this.body.length;
        for (let i = bodyLen - 1; i >= 1; i--) {
            if (i % BODY_SPACING === 2) {
                const part = this.body[i];
                const nextPart = this.body[i - 1]; // 实际上是向着前一节移动
                
                // 平滑插值坐标
                let drawX = part.x;
                let drawY = part.y;
                
                // 如果不是最后一节，向上一节位置平滑过渡
                // 处理穿墙时的插值：如果差值超过1个格子，说明发生了穿墙，此时不插值或特殊处理
                if (Math.abs(nextPart.x - part.x) <= 1 && Math.abs(nextPart.y - part.y) <= 1) {
                    drawX = part.x + (nextPart.x - part.x) * progress;
                    drawY = part.y + (nextPart.y - part.y) * progress;
                }

                ctx.save();
                ctx.translate(drawX * GRID_SIZE + GRID_SIZE / 2, drawY * GRID_SIZE + GRID_SIZE / 2);
                
                const angle = Math.atan2(part.dy, part.dx) - Math.PI;
                ctx.rotate(angle);
                
                if (hasBodyAsset) {
                    ctx.rotate(-Math.PI / 2);
                    ctx.drawImage(Assets.images.body, -bodyDrawW / 2, -bodyDrawH / 2, bodyDrawW, bodyDrawH);
                } else {
                    ctx.fillStyle = 'green';
                    ctx.fillRect(-GRID_SIZE / 2, -GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
                }
                ctx.restore();
            }
        }

        // 画头
        const head = this.body[0];
        // 头部的平滑位置：根据当前方向向下一个格子延伸
        let headDrawX = head.x;
        let headDrawY = head.y;
        
        // 注意：这里的头部位置实际上已经是“新位置”了，所以我们是向“新位置”靠近
        // 逻辑上：move 发生后，body[0] 是目标点。在移动周期内，我们从上一个位置滑向 body[0]
        // 这里的简化处理：让身体追随头部，头部直接在网格点上（因为头部转向是即时的）
        // 或者更高级：记录上一个位置进行 LERP
        
        ctx.save();
        ctx.translate(headDrawX * GRID_SIZE + GRID_SIZE / 2, headDrawY * GRID_SIZE + GRID_SIZE / 2);
        if (Assets.loaded.head) {
            const headSize = GRID_SIZE * 2;
            const ratio = Assets.images.head.width / Assets.images.head.height;
            let drawW = headSize, drawH = headSize;
            if (ratio > 1) drawH = headSize / ratio;
            else drawW = headSize * ratio;
            ctx.drawImage(Assets.images.head, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(-GRID_SIZE / 2, -GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
        }
        ctx.restore();
        ctx.restore(); 
    }
}

