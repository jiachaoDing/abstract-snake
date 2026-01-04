/**
 * 炫酷星空背景类
 * 实现多层视差滚动效果的宇宙星系背景
 */
class Starfield {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.stars = [];
        this.nebulae = [];
        this.init();
    }

    init() {
        this.stars = [];
        this.nebulae = [];
        
        // 1. 生成星云（大背景色块）
        const nebulaCount = 3;
        const colors = [
            'rgba(25, 0, 50, 0.3)',  // 深紫
            'rgba(0, 20, 40, 0.3)',  // 深蓝
            'rgba(40, 0, 20, 0.2)',  // 深红
        ];

        for (let i = 0; i < nebulaCount; i++) {
            this.nebulae.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * (this.width / 2) + this.width / 4,
                color: colors[i % colors.length],
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1
            });
        }

        // 2. 生成星星
        // 分成三层：远景（慢、小）、中景（中）、近景（快、亮）
        const layers = [
            { count: 100, size: [0.5, 1.2], speed: 0.02, color: '#444' }, // 远景
            { count: 50, size: [1.2, 2.2], speed: 0.05, color: '#888' }, // 中景
            { count: 20, size: [2.2, 3.5], speed: 0.1, color: '#fff' }   // 近景
        ];

        layers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                this.stars.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    size: Math.random() * (layer.size[1] - layer.size[0]) + layer.size[0],
                    speed: layer.speed,
                    color: layer.color,
                    opacity: Math.random(),
                    flickerSpeed: 0.01 + Math.random() * 0.02
                });
            }
        });
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        // 重新初始化以适应新大小，或者缩放坐标
        this.init();
    }

    update(deltaTime) {
        // 更新星云位置
        this.nebulae.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < -n.radius) n.x = this.width + n.radius;
            if (n.x > this.width + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = this.height + n.radius;
            if (n.y > this.height + n.radius) n.y = -n.radius;
        });

        // 更新星星位置（向下滚动，模拟飞向宇宙深处）
        this.stars.forEach(s => {
            s.y += s.speed * (deltaTime || 16);
            if (s.y > this.height) {
                s.y = 0;
                s.x = Math.random() * this.width;
            }
            
            // 闪烁效果
            s.opacity += s.flickerSpeed;
            if (s.opacity > 1 || s.opacity < 0.2) {
                s.flickerSpeed = -s.flickerSpeed;
            }
        });
    }

    draw(ctx) {
        // 1. 绘制纯黑底层
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. 绘制星云
        ctx.globalCompositeOperation = 'screen';
        this.nebulae.forEach(n => {
            const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
            gradient.addColorStop(0, n.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            // 优化：只填充星云所在的矩形区域
            ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
        });
        ctx.globalCompositeOperation = 'source-over';

        // 3. 绘制星星
        ctx.save();
        this.stars.forEach(s => {
            ctx.globalAlpha = s.opacity;
            ctx.fillStyle = s.color;
            
            if (s.size > 2) {
                // 较大的星星使用圆形
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 为最亮的星星增加一点辉光
                if (s.size > 3) {
                    ctx.save();
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = s.color;
                    ctx.globalAlpha = s.opacity * 0.5;
                    ctx.fill();
                    ctx.restore();
                }
            } else {
                // 微小的星星直接画矩形，性能更高
                ctx.fillRect(s.x, s.y, s.size, s.size);
            }
        });
        ctx.restore();
    }
}

