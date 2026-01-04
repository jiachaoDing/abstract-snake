// 资源管理器

// --- 资源路径配置 ---
// 如果你在中国香港 OSS/COS 上传了资源，请将下面的路径改为你的 Bucket 访问地址
// 例如: 'https://abstract-snake.oss-cn-hongkong.aliyuncs.com/assets/'
const ASSET_BASE_URL = 'https://snake-1361770797.cos.ap-hongkong.myqcloud.com/assets/'; 
// -------------------

const Assets = {
    images: {
        head: new Image(),
        body: new Image(),
        food: new Image(),
        food2: new Image(),
        food3: new Image(),
        knife: new Image()
    },
    audio: {
        eat: new Audio(ASSET_BASE_URL + 'eatfood.aac'),
        dead: new Audio(ASSET_BASE_URL + 'dead.aac'),
        kemiao: new Audio(ASSET_BASE_URL + 'kemiao.MP3'),
        bgm: new Audio(ASSET_BASE_URL + 'backend.mp3')
    },
    loaded: {
        head: false,
        body: false,
        food: false,
        food2: false,
        food3: false,
        knife: false
    },

    init() {
        this.images.head.src = ASSET_BASE_URL + 'head.png';
        this.images.body.src = ASSET_BASE_URL + 'body.png';
        this.images.food.src = ASSET_BASE_URL + 'food.png';
        this.images.food2.src = ASSET_BASE_URL + 'food2.png';
        this.images.food3.src = ASSET_BASE_URL + 'food3.png';
        this.images.knife.src = ASSET_BASE_URL + 'knife.png';

        this.images.head.onload = () => this.loaded.head = true;
        this.images.body.onload = () => this.loaded.body = true;
        this.images.food.onload = () => this.loaded.food = true;
        this.images.food2.onload = () => this.loaded.food2 = true;
        this.images.food3.onload = () => this.loaded.food3 = true;
        this.images.knife.onload = () => this.loaded.knife = true;

        // 设置 BGM 循环
        this.audio.bgm.loop = true;
        this.audio.bgm.volume = 0.5; // 默认音量 50%
    },

    play(sound) {
        if (this.audio[sound]) {
            this.audio[sound].currentTime = 0;
            this.audio[sound].play().catch(e => console.log("Audio play failed:", e));
        }
    }
};

Assets.init();
