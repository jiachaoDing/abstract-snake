/**
 * 智能渲染器 - 实现按需渲染和脏标记机制
 * 
 * 核心优化：
 * 1. 只在游戏状态变化时重绘（脏标记机制）
 * 2. 分层渲染：背景层、实体层分离
 * 3. 局部刷新：仅重绘变化区域（可选）
 * 4. 帧率独立：渲染与逻辑完全解耦
 */
class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isDirty = true; // 初始标记为需要绘制
        this.renderQueue = []; // 渲染队列
        this.isRendering = false;
        this.continuousRender = false; // 是否持续渲染
        this.lastRenderTime = 0;
        this.renderCount = 0;
        this.skipCount = 0; // 跳过的渲染次数（用于性能统计）
        
        // 订阅需要重绘的事件
        eventBus.on('game:stateChanged', () => this.markDirty(), 'Renderer');
        eventBus.on('game:resize', () => this.markDirty(), 'Renderer');
        eventBus.on('game:initialized', () => this.markDirty(), 'Renderer');
        eventBus.on('game:reset', () => this.markDirty(), 'Renderer');
        
        // 游戏开始时启用持续渲染
        eventBus.on('game:started', () => {
            this.continuousRender = true;
            this.markDirty();
        }, 'Renderer');
        
        // 游戏结束时停用持续渲染
        eventBus.on('game:stopped', () => {
            this.continuousRender = false;
        }, 'Renderer');
        
        eventBus.on('game:over', () => {
            this.continuousRender = false;
        }, 'Renderer');
        
        // 启动渲染循环
        this.startRenderLoop();
    }

    /**
     * 标记为需要重绘
     */
    markDirty() {
        this.isDirty = true;
    }

    /**
     * 添加渲染任务到队列
     */
    addRenderTask(name, renderFunc, priority = 0) {
        const existingIndex = this.renderQueue.findIndex(task => task.name === name);
        
        if (existingIndex !== -1) {
            // 更新现有任务
            this.renderQueue[existingIndex] = { name, renderFunc, priority };
        } else {
            // 添加新任务
            this.renderQueue.push({ name, renderFunc, priority });
        }
        
        // 按优先级排序（优先级小的先渲染，即 0 最先）
        this.renderQueue.sort((a, b) => a.priority - b.priority);
    }

    /**
     * 移除渲染任务
     */
    removeRenderTask(name) {
        this.renderQueue = this.renderQueue.filter(task => task.name !== name);
    }

    /**
     * 启动智能渲染循环
     */
    startRenderLoop() {
        const loop = (timestamp) => {
            // 如果启用持续渲染，始终标记为脏
            if (this.continuousRender) {
                this.isDirty = true;
            }
            
            // 只有脏标记为 true 时才执行渲染
            if (this.isDirty) {
                this.render(timestamp);
                // 如果不是持续渲染模式，则清除脏标记
                if (!this.continuousRender) {
                    this.isDirty = false;
                }
                this.renderCount++;
                
            } else {
                this.skipCount++;
                // 即使不渲染，也要更新最后时间，防止下次渲染时 deltaTime 过大
                this.lastRenderTime = timestamp;
            }
            
            requestAnimationFrame(loop);
        };
        
        requestAnimationFrame(loop);
    }

    /**
     * 执行渲染
     */
    render(timestamp) {
        const deltaTime = this.lastRenderTime ? timestamp - this.lastRenderTime : 16;
        this.lastRenderTime = timestamp;
        
        // 按优先级执行渲染队列（注意：background 任务会清空画布）
        let renderedTasks = 0;
        for (const task of this.renderQueue) {
            try {
                task.renderFunc(this.ctx, deltaTime);
                renderedTasks++;
            } catch (error) {
                console.error(`[Renderer] 渲染任务 ${task.name} 出错:`, error);
            }
        }
        
        
        // 发布渲染完成事件
        eventBus.emit('render:complete', { 
            timestamp, 
            deltaTime,
            renderCount: this.renderCount,
            skipCount: this.skipCount
        });
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        const total = this.renderCount + this.skipCount;
        const efficiency = total > 0 ? ((this.skipCount / total) * 100).toFixed(1) : 0;
        
        return {
            totalFrames: total,
            renderedFrames: this.renderCount,
            skippedFrames: this.skipCount,
            efficiency: `${efficiency}%`, // 跳过的帧百分比（越高越好）
            averageRenderRate: this.renderCount > 0 
                ? (this.renderCount / (performance.now() / 1000)).toFixed(2) 
                : 0
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.renderCount = 0;
        this.skipCount = 0;
    }

    /**
     * 清空渲染队列
     */
    clear() {
        this.renderQueue = [];
        this.markDirty();
    }
}

