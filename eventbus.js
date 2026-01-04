/**
 * 事件总线 - 实现发布订阅模式，彻底解耦各模块
 * 
 * 优势：
 * 1. 模块之间无需直接引用，通过事件通信
 * 2. 易于扩展新功能而不影响现有代码
 * 3. 可以轻松追踪系统事件流
 */
class EventBus {
    constructor() {
        this.events = {};
        this.debugMode = false; // 开启后可以追踪所有事件
    }

    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {string} subscriberId - 订阅者ID（用于调试）
     * @returns {Function} 取消订阅的函数
     */
    on(eventName, callback, subscriberId = 'anonymous') {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        const listener = { callback, subscriberId };
        this.events[eventName].push(listener);
        
        if (this.debugMode) {
            console.log(`[EventBus] ${subscriberId} 订阅了 ${eventName}`);
        }
        
        // 返回取消订阅函数
        return () => this.off(eventName, callback);
    }

    /**
     * 取消订阅
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        
        this.events[eventName] = this.events[eventName].filter(
            listener => listener.callback !== callback
        );
    }

    /**
     * 发布事件
     * @param {string} eventName - 事件名称
     * @param {any} data - 事件数据
     */
    emit(eventName, data) {
        if (this.debugMode) {
            console.log(`[EventBus] 发布事件: ${eventName}`, data);
        }
        
        if (!this.events[eventName]) return;
        
        this.events[eventName].forEach(listener => {
            try {
                listener.callback(data);
            } catch (error) {
                console.error(`[EventBus] 事件处理出错 ${eventName}:`, error);
            }
        });
    }

    /**
     * 一次性订阅（触发一次后自动取消）
     */
    once(eventName, callback, subscriberId = 'anonymous') {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        return this.on(eventName, onceCallback, subscriberId);
    }

    /**
     * 清空所有订阅
     */
    clear() {
        this.events = {};
    }

    /**
     * 获取调试信息
     */
    getDebugInfo() {
        const info = {};
        for (const [eventName, listeners] of Object.entries(this.events)) {
            info[eventName] = listeners.map(l => l.subscriberId);
        }
        return info;
    }
}

// 导出全局单例
const eventBus = new EventBus();

