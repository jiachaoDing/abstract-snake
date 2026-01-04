/**
 * 蛇状态管理器 - 负责管理蛇的所有状态、效果及其生命周期
 * 
 * 设计初衷：
 * 1. 解耦状态逻辑与物理移动逻辑
 * 2. 方便未来扩展新效果（如：磁铁、幽灵模式、缩小等）
 * 3. 统一处理状态计时器
 */
class SnakeStateManager {
    constructor(snake) {
        this.snake = snake;
        this.activeEffects = new Map(); // 存储当前激活的效果：name -> { endTime, data }
        
        // 预定义状态标志（为了性能，常用状态直接暴露）
        this.flags = {
            isInvincible: false,
            isSpeeding: false,
            isGhost: false, // 未来扩展：穿墙/穿身
            isMagnet: false  // 未来扩展：吸引食物
        };
    }

    /**
     * 激活一个效果
     * @param {string} name 效果名称
     * @param {number} duration 持续时间 (ms)
     * @param {object} data 附加数据
     */
    addEffect(name, duration, data = {}) {
        const endTime = performance.now() + duration;
        this.activeEffects.set(name, { endTime, data });
        this.updateFlags();
        
        // 发布状态激活事件
        eventBus.emit('snake:effectStarted', { name, duration, data });
    }

    /**
     * 移除一个效果
     */
    removeEffect(name) {
        if (this.activeEffects.has(name)) {
            this.activeEffects.delete(name);
            this.updateFlags();
            eventBus.emit('snake:effectEnded', { name });
        }
    }

    /**
     * 每帧更新计时器
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        const now = performance.now();
        let changed = false;

        for (const [name, effect] of this.activeEffects.entries()) {
            if (now >= effect.endTime) {
                this.activeEffects.delete(name);
                changed = true;
                eventBus.emit('snake:effectEnded', { name });
            }
        }

        if (changed) {
            this.updateFlags();
        }
    }

    /**
     * 根据当前激活的效果更新状态标志
     */
    updateFlags() {
        const oldFlags = { ...this.flags };
        
        // 重置所有标志
        this.flags.isInvincible = this.activeEffects.has('invincible');
        this.flags.isSpeeding = this.activeEffects.has('speedBoost');
        this.flags.isGhost = this.activeEffects.has('ghost');
        this.flags.isMagnet = this.activeEffects.has('magnet');

        // 同步到蛇对象上，保持向下兼容
        this.snake.isInvincible = this.flags.isInvincible;

        // 如果状态发生变化，触发事件
        if (JSON.stringify(oldFlags) !== JSON.stringify(this.flags)) {
            eventBus.emit('snake:stateChanged', { flags: this.flags });
        }
    }

    /**
     * 检查是否具有某种效果
     */
    hasEffect(name) {
        return this.activeEffects.has(name);
    }

    /**
     * 获取效果剩余时间
     */
    getRemainingTime(name) {
        const effect = this.activeEffects.get(name);
        if (!effect) return 0;
        return Math.max(0, effect.endTime - performance.now());
    }

    /**
     * 重置所有状态
     */
    reset() {
        this.activeEffects.clear();
        this.updateFlags();
    }
}

