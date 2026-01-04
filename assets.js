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
        eat: new Audio('assets/eatfood.aac'),
        dead: new Audio('assets/dead.aac'),
        kemiao: new Audio('assets/kemiao.MP3'),
        bgm: new Audio('assets/backend.mp3')
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
        this.images.head.src = 'assets/head.png';
        this.images.body.src = 'assets/body.png';
        this.images.food.src = 'assets/food.png';
        this.images.food2.src = 'assets/food2.png';
        this.images.food3.src = 'assets/food3.png';
        this.images.knife.src = 'assets/knife.png';

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

