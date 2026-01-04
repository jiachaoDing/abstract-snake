/**
 * 动画管理器 - 完全独立的动画系统
 * 
 * 核心特性：
 * 1. 独立的渲染循环（不依赖游戏主循环）
 * 2. 支持多个动画同时播放
 * 3. 动画优先级管理
 * 4. 零侵入设计：不影响游戏性能
 */
class AnimationManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.animations = new Map(); // 存储所有动画实例
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastTime = 0;
        
        // 独立的渲染循环标志
        this.hasActiveAnimations = false;
    }

    /**
     * 注册一个动画
     */
    register(id, animatorConfig) {
        const animator = new SpriteAnimator({
            ...animatorConfig,
            canvas: this.canvas,
            onComplete: () => {
                // 动画完成后的回调
                if (animatorConfig.onComplete) {
                    animatorConfig.onComplete();
                }
                
                // 发布动画完成事件
                eventBus.emit('animation:complete', { id });
            }
        });
        
        this.animations.set(id, animator);
        return animator;
    }

    /**
     * 播放动画
     */
    play(id) {
        const animator = this.animations.get(id);
        if (!animator) {
            console.warn(`[AnimationManager] 动画 ${id} 不存在`);
            return;
        }
        
        animator.start();
        
        // 启动独立的渲染循环
        if (!this.isRunning) {
            this.startRenderLoop();
        }
        
        // 发布动画开始事件
        eventBus.emit('animation:start', { id });
    }

    /**
     * 停止动画
     */
    stop(id) {
        const animator = this.animations.get(id);
        if (animator) {
            animator.isPlaying = false;
            if (animator.audio) {
                animator.audio.pause();
            }
        }
    }

    /**
     * 停止所有动画
     */
    stopAll() {
        this.animations.forEach((animator, id) => {
            animator.isPlaying = false;
            if (animator.audio) {
                animator.audio.pause();
            }
        });
        
        this.stopRenderLoop();
    }

    /**
     * 启动独立的渲染循环
     * 
     * 关键优化：这个循环完全独立于游戏主循环
     * 只在有动画播放时运行，不会影响游戏性能
     */
    startRenderLoop() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        
        const loop = (timestamp) => {
            if (!this.isRunning) return;
            
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;
            
            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 更新和绘制所有活动动画
            let hasActiveAnimation = false;
            this.animations.forEach((animator) => {
                if (animator.isPlaying) {
                    animator.update(deltaTime);
                    animator.draw();
                    hasActiveAnimation = true;
                }
            });
            
            // 如果还有活动动画，继续循环
            if (hasActiveAnimation) {
                this.animationFrameId = requestAnimationFrame(loop);
            } else {
                this.stopRenderLoop();
            }
        };
        
        this.animationFrameId = requestAnimationFrame(loop);
    }

    /**
     * 停止渲染循环
     */
    stopRenderLoop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.filter = "none";
    }

    /**
     * 检查是否有活动动画正在播放
     */
    hasActive() {
        if (!this.isRunning) return false;
        for (const animator of this.animations.values()) {
            if (animator.isPlaying) return true;
        }
        return false;
    }

    /**
     * 重置画布大小
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 通知所有动画重新计算布局
        this.animations.forEach(animator => {
            animator.calculateLayout();
        });
    }

    /**
     * 获取调试信息
     */
    getDebugInfo() {
        const info = {
            isRunning: this.isRunning,
            activeAnimations: this.animations.size,
            animations: []
        };
        
        this.animations.forEach((animator, id) => {
            info.animations.push({
                id,
                isPlaying: animator.isPlaying,
                currentFrame: animator.currentFrame,
                totalFrames: animator.totalFrames
            });
        });
        
        return info;
    }
}

