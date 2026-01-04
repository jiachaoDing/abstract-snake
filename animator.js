class SpriteAnimator {
    constructor(config) {
        this.canvas = config.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.image = new Image();
        this.image.src = config.src;
        this.cols = config.cols;
        this.rows = config.rows;
        this.totalFrames = config.totalFrames;
        this.frameDuration = config.frameDuration || 60;
        this.scaleRatio = config.scaleRatio || 0.5;
        this.brightness = config.brightness || 1.0; 
        this.onComplete = config.onComplete;
        
        // 核心优化：预渲染帧缓存
        this.frameCache = []; 
        this.isPreRendered = false;
        
        this.lastDrawnFrame = -1; // 记录上一帧，防止重复绘制
        this.layout = {}; // 缓存布局计算结果
        
        // 音频资源
        this.audio = null;
        this.audioDelay = config.audioDelay || 200; 
        this.audioStarted = false;
        
        if (config.audioSrc) {
            this.audio = new Audio(config.audioSrc);
            this.audio.preload = 'auto'; // 强制预加载音频
            // 当音频元数据加载完成后，动态计算每帧时长以匹配总时长
            this.audio.onloadedmetadata = () => {
                if (this.audio.duration && this.audio.duration !== Infinity) {
                    const effectiveDuration = Math.max(0, (this.audio.duration * 1000) - this.audioDelay);
                    this.frameDuration = effectiveDuration / this.totalFrames;
                }
            };
        }
        
        this.currentFrame = 0;
        this.timer = 0;
        this.isLoaded = false;
        this.isPlaying = false;

        this.image.onload = () => {
            this.isLoaded = true;
            this.calculateLayout();
            // 开始异步预渲染
            this.preRenderAllFrames();
        };
    }

    // 性能爆发点：将每一帧提前绘制到独立的小画布中，并提前处理好滤镜
    async preRenderAllFrames() {
        console.log(`[Animator] 开始预渲染动画帧: ${this.image.src}`);
        const frameW = this.image.width / this.cols;
        const frameH = this.image.height / this.rows;

        for (let i = 0; i < this.totalFrames; i++) {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = frameW;
            offCanvas.height = frameH;
            const offCtx = offCanvas.getContext('2d');

            // 1. 处理亮度（直接在预渲染阶段处理，避免播放时的 CSS 滤镜开销）
            if (this.brightness !== 1.0) {
                offCtx.filter = `brightness(${this.brightness})`;
            }

            // 2. 切割并绘制
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            offCtx.drawImage(
                this.image,
                col * frameW, row * frameH, frameW, frameH,
                0, 0, frameW, frameH
            );

            // 3. 存储处理好的位图数据
            try {
                // 如果浏览器支持，转换为 ImageBitmap 可以进一步提升贴图性能
                if (window.createImageBitmap) {
                    this.frameCache[i] = await createImageBitmap(offCanvas);
                } else {
                    this.frameCache[i] = offCanvas;
                }
            } catch (e) {
                this.frameCache[i] = offCanvas;
            }
        }
        
        this.isPreRendered = true;
        console.log(`[Animator] 预渲染完成，共 ${this.totalFrames} 帧`);
    }

    // 性能优化：预先计算并缓存布局，避免在渲染循环中进行浮点运算
    calculateLayout() {
        if (!this.isLoaded) return;
        const frameW = this.image.width / this.cols;
        const frameH = this.image.height / this.rows;
        const baseScale = Math.max(this.canvas.width / frameW, this.canvas.height / frameH);
        const scale = baseScale * this.scaleRatio;
        this.layout = {
            drawW: frameW * scale,
            drawH: frameH * scale,
            drawX: (this.canvas.width - frameW * scale) / 2,
            drawY: (this.canvas.height - frameH * scale) / 2
        };
    }

    start() {
        if (!this.isPreRendered) {
            console.warn("[Animator] 预渲染未完成，可能会有轻微卡顿");
        }
        this.currentFrame = 0;
        this.lastDrawnFrame = -1;
        this.timer = 0;
        this.isPlaying = true;
        this.audioStarted = false;
        this.calculateLayout(); // 确保布局是最新的
        
        // 关键优化：播放时不再需要 CSS 滤镜，因为已经在预渲染阶段处理过了
        this.canvas.style.filter = "none";
    }

    update(deltaTime) {
        if (!this.isPlaying || !this.isLoaded) return;

        // 处理音频延迟播放
        if (this.audio && !this.audioStarted) {
            if (this.currentFrame > 0 || this.timer > this.audioDelay) {
                this.audio.currentTime = 0;
                this.audio.play().catch(e => console.log("Animation audio play failed:", e));
                this.audioStarted = true;
            }
        }

        this.timer += deltaTime;
        if (this.timer >= this.frameDuration) {
            this.currentFrame++;
            this.timer = 0;
            if (this.currentFrame >= this.totalFrames) {
                this.isPlaying = false;
                if (this.audio) {
                    this.audio.pause();
                }
                
                // 结束时清空画布
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                if (this.onComplete) this.onComplete();
            }
        }
    }

    draw() {
        if (!this.isPlaying || !this.isPreRendered) return;
        
        const { drawW, drawH, drawX, drawY } = this.layout;
        const frame = this.frameCache[this.currentFrame];

        if (frame) {
            // 极简绘制：直接将预渲染好的帧贴上去
            // 注意：这里不再需要 clearRect，清屏由 AnimationManager 统一负责
            this.ctx.drawImage(frame, drawX, drawY, drawW, drawH);
        }
        
        this.lastDrawnFrame = this.currentFrame; 
    }
}
