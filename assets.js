// 资源管理器

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

        // 设置音量
        this.audio.bgm.loop = true;
        this.audio.bgm.volume = 0.4;  // BGM 稍微调低一点
        this.audio.dead.volume = 1.0; // 死亡音效调到最大
        this.audio.eat.volume = 0.8;
        this.audio.kemiao.volume = 0.8;
    },

    play(sound) {
        if (this.audio[sound]) {
            this.audio[sound].currentTime = 0;
            this.audio[sound].play().catch(e => console.log("Audio play failed:", e));
        }
    }
};

Assets.init();
