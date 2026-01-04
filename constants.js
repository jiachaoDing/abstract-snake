// 游戏常量配置
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const GRID_SIZE = IS_MOBILE ? 16 : 40; 
const MOVE_INTERVAL = 150; // 蛇逻辑步进速度 (ms)
const FOOD_COUNT = 8;
const SPECIAL_FOOD_THRESHOLD = 5; // 每吃多少个普通食物出现一个特殊食物
const SUPER_FOOD_THRESHOLD = 10;   // 暂时调低阈值方便测试（原为25）
const SUPER_FOOD_DURATION = 8000;  // 超级食物持续时间 (ms)
const SUPER_MOVE_INTERVAL = 80;    // 超级食物生效时的步进速度 (ms)
const INITIAL_SNAKE_LENGTH = 12;
const BODY_SPACING = 3; // 一个身体占几个格子
const ANIM_FRAME_DURATION = 60; // 动画每帧时长

// 特效动画独立调整参数
const SPECIAL_ANIM_CONFIG = {
    scale: IS_MOBILE ? 0.6 : 0.6,   // 手机端和电脑端缩放比例
    brightness: 1.8,                 // 亮度
    frameDuration: 55                // 播放速度（毫秒/帧）
};

