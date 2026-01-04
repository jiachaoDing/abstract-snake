// 食物管理器
class FoodManager {
    constructor() {
        this.foods = [];
        this.food1EatenCount = 0;
        this.food1EatenForSuperCount = 0;
    }

    reset() {
        this.foods = [];
        this.food1EatenCount = 0;
        this.food1EatenForSuperCount = 0;
    }

    create(tileCountX, tileCountY, snake) {
        // 1. 检查超级食物 (food3, 3x3)
        if (this.food1EatenForSuperCount >= SUPER_FOOD_THRESHOLD) {
            const superW = 3;
            const superH = 3;
            let spawned = false;
            let attempts = 0;
            while (!spawned && attempts < 50) {
                attempts++;
                let newSuper = {
                    x: Math.floor(Math.random() * (tileCountX - superW)),
                    y: Math.floor(Math.random() * (tileCountY - superH)),
                    angle: 0,
                    type: 'super'
                };
                
                let conflict = snake.some(part => 
                    part.x >= newSuper.x && part.x < newSuper.x + superW &&
                    part.y >= newSuper.y && part.y < newSuper.y + superH
                ) || this.foods.some(f => {
                    const fW = f.type === 'special' ? 6 : (f.type === 'super' ? 3 : 1);
                    const fH = f.type === 'special' ? 4 : (f.type === 'super' ? 3 : 1);
                    return !(newSuper.x + superW <= f.x || newSuper.x >= f.x + fW || 
                             newSuper.y + superH <= f.y || newSuper.y >= f.y + fH);
                });

                if (!conflict) {
                    this.foods.push(newSuper);
                    spawned = true;
                    this.food1EatenForSuperCount -= SUPER_FOOD_THRESHOLD;
                }
            }
        }

        const specialW = 6;
        const specialH = 4;

        // 2. 每吃到 5 个普通食物，就生成一个特殊食物 (food2, 6x4)
        if (this.food1EatenCount >= SPECIAL_FOOD_THRESHOLD) {
            let spawned = false;
            let attempts = 0;
            while (!spawned && attempts < 50) { // 防止死循环
                attempts++;
                let newSpecial = {
                    x: Math.floor(Math.random() * (tileCountX - specialW)),
                    y: Math.floor(Math.random() * (tileCountY - specialH)),
                    angle: 0,
                    type: 'special'
                };

                // 检查碰撞
                let conflict = snake.some(part => 
                    part.x >= newSpecial.x && part.x < newSpecial.x + specialW &&
                    part.y >= newSpecial.y && part.y < newSpecial.y + specialH
                ) || this.foods.some(f => {
                    const fW = f.type === 'special' ? 6 : (f.type === 'super' ? 3 : 1);
                    const fH = f.type === 'special' ? 4 : (f.type === 'super' ? 3 : 1);
                    return !(newSpecial.x + specialW <= f.x || newSpecial.x >= f.x + fW || 
                             newSpecial.y + specialH <= f.y || newSpecial.y >= f.y + fH);
                });

                if (!conflict) {
                    this.foods.push(newSpecial);
                    spawned = true;
                    // 成功生成一个后，减去阈值，支持累积生成
                    this.food1EatenCount -= SPECIAL_FOOD_THRESHOLD;
                }
            }
        }

        // 2. 补齐普通食物到 FOOD_COUNT 总数
        const normalFoods = this.foods.filter(f => f.type === 'normal');
        while (normalFoods.length < FOOD_COUNT) {
            let newNormal = {
                x: Math.floor(Math.random() * tileCountX),
                y: Math.floor(Math.random() * tileCountY),
                angle: Math.random() * Math.PI * 2,
                type: 'normal'
            };

            let conflict = snake.some(part => part.x === newNormal.x && part.y === newNormal.y) || 
                           this.foods.some(f => {
                               const fW = f.type === 'special' ? 6 : (f.type === 'super' ? 3 : 1);
                               const fH = f.type === 'special' ? 4 : (f.type === 'super' ? 3 : 1);
                               return !(newNormal.x + 1 <= f.x || newNormal.x >= f.x + fW || 
                                        newNormal.y + 1 <= f.y || newNormal.y >= f.y + fH);
                           });

            if (!conflict) {
                this.foods.push(newNormal);
                normalFoods.push(newNormal);
            }
        }
    }

    draw(ctx) {
        this.foods.forEach(f => {
            ctx.save();
            const isSpecial = f.type === 'special';
            if (isSpecial) {
                ctx.translate(f.x * GRID_SIZE, f.y * GRID_SIZE);
                if (Assets.loaded.food2) {
                    // 特殊食物大小更新为 6x4
                    ctx.drawImage(Assets.images.food2, 0, 0, GRID_SIZE * 6, GRID_SIZE * 4);
                } else {
                    ctx.fillStyle = 'blue';
                    ctx.fillRect(0, 0, GRID_SIZE * 6, GRID_SIZE * 4);
                }
            } else if (f.type === 'super') {
                ctx.translate(f.x * GRID_SIZE, f.y * GRID_SIZE);
                if (Assets.loaded.food3) {
                    // 超级食物 3x3
                    ctx.drawImage(Assets.images.food3, 0, 0, GRID_SIZE * 3, GRID_SIZE * 3);
                } else {
                    ctx.fillStyle = 'gold';
                    ctx.fillRect(0, 0, GRID_SIZE * 3, GRID_SIZE * 3);
                }
            } else {
                ctx.translate(f.x * GRID_SIZE + GRID_SIZE / 2, f.y * GRID_SIZE + GRID_SIZE / 2);
                ctx.rotate(f.angle);
                if (Assets.loaded.food) {
                    const targetSize = GRID_SIZE * 3;
                    const ratio = Assets.images.food.width / Assets.images.food.height;
                    let drawW = targetSize, drawH = targetSize;
                    if (ratio > 1) drawH = targetSize / ratio;
                    else drawW = targetSize * ratio;
                    ctx.drawImage(Assets.images.food, -drawW / 2, -drawH / 2, drawW, drawH);
                } else {
                    ctx.fillStyle = 'red';
                    ctx.fillRect(-GRID_SIZE / 2, -GRID_SIZE / 2, GRID_SIZE - 2, GRID_SIZE - 2);
                }
            }
            ctx.restore();
        });
    }

    checkCollision(head, tileCountX, tileCountY) {
        let foodIndex = this.foods.findIndex(f => {
            if (f.type === 'special') {
                let diffX = head.x - f.x;
                if (diffX < 0) diffX += tileCountX;
                if (diffX >= tileCountX) diffX -= tileCountX;
                let diffY = head.y - f.y;
                if (diffY < 0) diffY += tileCountY;
                if (diffY >= tileCountY) diffY -= tileCountY;
                // 碰撞区域同步更新为 6x4
                return diffX >= 0 && diffX < 6 && diffY >= 0 && diffY < 4;
            } else if (f.type === 'super') {
                let diffX = head.x - (f.x + 0.5); // 居中 2x2 判定在 3x3 中
                if (diffX < -tileCountX/2) diffX += tileCountX;
                if (diffX > tileCountX/2) diffX -= tileCountX;
                let diffY = head.y - (f.y + 0.5);
                if (diffY < -tileCountY/2) diffY += tileCountY;
                if (diffY > tileCountY/2) diffY -= tileCountY;
                // 3x3 的图，2x2 的判定：
                // 如果 f.x 是起始坐标，判定区在 f.x+0.5 到 f.x+2.5 之间？
                // 简化：如果 head.x 在 [f.x, f.x+2] 且 head.y 在 [f.y, f.y+2] 即使是 2x2
                // 这里用 head.x - f.x 处理穿墙
                let dX = head.x - f.x;
                if (dX < 0) dX += tileCountX;
                if (dX >= tileCountX) dX -= tileCountX;
                let dY = head.y - f.y;
                if (dY < 0) dY += tileCountY;
                if (dY >= tileCountY) dY -= tileCountY;
                return dX >= 0.5 && dX < 2.5 && dY >= 0.5 && dY < 2.5;
            } else {
                let diffX = Math.abs(head.x - f.x);
                if (diffX > tileCountX / 2) diffX = tileCountX - diffX;
                let diffY = Math.abs(head.y - f.y);
                if (diffY > tileCountY / 2) diffY = tileCountY - diffY;
                return diffX <= 1 && diffY <= 1;
            }
        });
        return foodIndex;
    }
}

