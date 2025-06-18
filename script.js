class MosquitoGame {
    constructor() {
        console.log('MosquitoGame constructor called');
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOver');
        this.gameCompleteScreen = document.getElementById('gameComplete');
        
        this.scoreElement = document.getElementById('score');
        this.bloodElement = document.getElementById('blood');
        this.livesElement = document.getElementById('lives');
        this.stageElement = document.getElementById('stage');
        this.timerElement = document.getElementById('timer');
        this.progressFillElement = document.getElementById('progressFill');
        this.progressTextElement = document.getElementById('progressText');
        
        this.finalScoreElement = document.getElementById('finalScore');
        this.finalStageElement = document.getElementById('finalStage');
        this.finalTimeElement = document.getElementById('finalTime');
        this.completeScoreElement = document.getElementById('completeScore');
        this.completeTimeElement = document.getElementById('completeTime');
        
        this.gameRunning = false;
        this.gameStarted = false;
        
        this.initializeCanvas();
        console.log('Canvas initialized');
        this.initializeStageData();
        console.log('Stage data initialized');
        this.initializeGame();
        console.log('Game initialized');
        this.bindEvents();
        console.log('Events bound - initialization complete');
    }
    
    initializeCanvas() {
        const container = document.getElementById('gameContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        });
    }
    
    initializeStageData() {
        // 絶妙なバランス調整：血液量×生存時間でステージアップ
        this.stageConfigs = [
            { 
                stage: 1, 
                handSpeed: 1.2,          // ゆっくりスタート
                handPairs: 1,            // 手のペア1つ
                smokeCount: 0,           // 煙なし
                smokeSize: 0,
                smokeSpeed: 0,
                stageThreshold: 30       // 血液3×10秒 or 血液5×6秒でクリア
            },
            { 
                stage: 2, 
                handSpeed: 1.7, 
                handPairs: 1, 
                smokeCount: 1,           // 煙初登場
                smokeSize: 40,           // 小さめの煙
                smokeSpeed: 0.5,
                stageThreshold: 70       // 血液5×16秒 or 血液8×10秒
            },
            { 
                stage: 3, 
                handSpeed: 2.2, 
                handPairs: 2,            // 手のペア増加
                smokeCount: 1, 
                smokeSize: 50,
                smokeSpeed: 0.8,
                stageThreshold: 150      // 血液10×15秒
            },
            { 
                stage: 4, 
                handSpeed: 2.8, 
                handPairs: 3, 
                smokeCount: 2,           // 煙2つ
                smokeSize: 60,
                smokeSpeed: 1.0,
                stageThreshold: 300      // 血液12×21秒
            },
            { 
                stage: 5, 
                handSpeed: 3.4,          // 中間ステージ
                handPairs: 4, 
                smokeCount: 3, 
                smokeSize: 70,
                smokeSpeed: 1.2,
                stageThreshold: 500      // 血液16×25秒
            },
            { 
                stage: 6, 
                handSpeed: 4.0, 
                handPairs: 4, 
                smokeCount: 3,           // 煙3つ
                smokeSize: 75,
                smokeSpeed: 1.5,
                stageThreshold: 750      // 血液20×30秒
            },
            { 
                stage: 7, 
                handSpeed: 4.6, 
                handPairs: 5,            // 手のペア5つ
                smokeCount: 4, 
                smokeSize: 80,
                smokeSpeed: 1.8,
                stageThreshold: 1100      // 血液25×34秒
            },
            { 
                stage: 8, 
                handSpeed: 5.2, 
                handPairs: 6, 
                smokeCount: 5,           // 煙5つ
                smokeSize: 85,
                smokeSpeed: 2.0,
                stageThreshold: 1550     // 血液30×38秒
            },
            { 
                stage: 9, 
                handSpeed: 5.8, 
                handPairs: 7,            // 手のペア7つ
                smokeCount: 6, 
                smokeSize: 90,
                smokeSpeed: 2.3,
                stageThreshold: 2100     // 血液35×43秒
            },
            { 
                stage: 10, 
                handSpeed: 6.4,          // 最終ステージ（激ムズ）
                handPairs: 8,            // 手のペア8つ
                smokeCount: 7,           // 煙7つ
                smokeSize: 95,           // 大きな煙
                smokeSpeed: 2.5,         // 速い煙の動き
                stageThreshold: Infinity // クリア不要（サバイバル）
            }
        ];
    }
    
    initializeGame() {
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: 15,
            speed: 8,
            baseSpeed: 8,
            blood: 0,
            maxBlood: 12,
            lives: 3,
            maxLives: 3,
            angle: 0,
            wingFlap: 0,
            invulnerable: false,
            invulnerableTime: 0
        };

        // Number of blood drops required to gain one extra life
        this.bloodForLife = 30;
        // Counter for blood collected since last life gain
        this.bloodSinceLife = 0;
        // Hard cap for maximum lives attainable
        this.maxLifeLimit = 6;
        
        this.handPairs = [];
        this.bloodDrops = [];
        this.particles = [];
        this.smokeAreas = [];
        
        this.score = 0;
        this.currentStage = 1;
        this.gameStartTime = Date.now();
        this.stageStartTime = Date.now();
        this.totalBloodCollected = 0;
        
        this.lastHandSpawn = 0;
        this.lastBloodSpawn = 0;
        this.lastSmokeSpawn = 0;
        
        this.keys = {};
        this.touchPos = null;
        
        this.updateDifficultyForStage();
        this.updateUI();
        this.spawnInitialBlood();
    }
    
    updateDifficultyForStage() {
        const config = this.stageConfigs[this.currentStage - 1];
        this.handSpawnRate = Math.max(1500, 3500 - (this.currentStage * 200));
        this.bloodSpawnRate = Math.max(2000, 3000 - (this.currentStage * 100));
        this.smokeSpawnRate = Math.max(3000, 5000 - (this.currentStage * 200));
    }
    
    bindEvents() {
        console.log('Binding events...');
        const startBtn = document.getElementById('startBtn');
        if (!startBtn) {
            console.error('Start button not found!');
            return;
        }
        startBtn.addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.touchPos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.touchPos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchPos = null;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.touchPos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.touchPos) {
                const rect = this.canvas.getBoundingClientRect();
                this.touchPos = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.touchPos = null;
        });
    }
    
    startGame() {
        console.log('startGame() called');
        if (!this.startScreen) {
            console.error('Start screen element not found!');
            return;
        }
        this.startScreen.classList.add('hidden');
        this.gameRunning = true;
        this.gameStarted = true;
        console.log('Starting game loop...');
        this.gameLoop();
    }
    
    restartGame() {
        this.gameOverScreen.classList.add('hidden');
        this.gameCompleteScreen.classList.add('hidden');
        this.initializeGame();
        this.startGame();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.updatePlayer();
        this.updateHandPairs();
        this.updateBloodDrops();
        this.updateSmokeAreas();
        this.updateParticles();
        this.spawnEnemies();
        this.checkCollisions();
        this.checkStageProgress();
        this.updateUI();
    }
    
    updatePlayer() {
        if (this.touchPos) {
            const dx = this.touchPos.x - this.player.x;
            const dy = this.touchPos.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                const angle = Math.atan2(dy, dx);
                this.player.angle = angle;
                this.player.x += Math.cos(angle) * this.player.speed;
                this.player.y += Math.sin(angle) * this.player.speed;
            }
        }
        
        this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
        this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));
        
        // 血液を集めると少し遅くなるが、以前よりペナルティを軽減
        this.player.speed = this.player.baseSpeed * (1 - (this.player.blood / this.player.maxBlood) * 0.3);
        this.player.wingFlap += 0.3;
        
        if (this.player.invulnerable) {
            this.player.invulnerableTime--;
            if (this.player.invulnerableTime <= 0) {
                this.player.invulnerable = false;
            }
        }
    }
    
    updateHandPairs() {
        for (let i = this.handPairs.length - 1; i >= 0; i--) {
            const pair = this.handPairs[i];
            const leftHand = pair.leftHand;
            const rightHand = pair.rightHand;

            const centerX = (leftHand.x + rightHand.x) / 2;
            const centerY = (leftHand.y + rightHand.y) / 2;

            // プレイヤーと各手の距離
            const leftDist = Math.hypot(this.player.x - leftHand.x, this.player.y - leftHand.y);
            const rightDist = Math.hypot(this.player.x - rightHand.x, this.player.y - rightHand.y);

            // 挟み込み開始条件
            if (!pair.closing && leftDist < pair.attackRadius && rightDist < pair.attackRadius) {
                pair.closing = true;
            }

            if (pair.closing) {
                // 挟み込み動作
                leftHand.x += (centerX - leftHand.x) * pair.closingSpeed;
                leftHand.y += (centerY - leftHand.y) * pair.closingSpeed;
                rightHand.x += (centerX - rightHand.x) * pair.closingSpeed;
                rightHand.y += (centerY - rightHand.y) * pair.closingSpeed;
            } else {
                // プレイヤーを追尾
                const dx = this.player.x - centerX;
                const dy = this.player.y - centerY;
                const angle = Math.atan2(dy, dx);
                const speed = pair.speed;

                leftHand.x += Math.cos(angle + 0.3) * speed;
                leftHand.y += Math.sin(angle + 0.3) * speed;
                rightHand.x += Math.cos(angle - 0.3) * speed;
                rightHand.y += Math.sin(angle - 0.3) * speed;
            }
            
            pair.life--;
            if (pair.life <= 0) {
                this.handPairs.splice(i, 1);
            }
        }
    }
    
    updateBloodDrops() {
        for (let i = this.bloodDrops.length - 1; i >= 0; i--) {
            const drop = this.bloodDrops[i];
            drop.life--;
            drop.pulse += 0.1;
            
            if (drop.life <= 0) {
                this.bloodDrops.splice(i, 1);
            }
        }
    }
    
    updateSmokeAreas() {
        for (let i = this.smokeAreas.length - 1; i >= 0; i--) {
            const smoke = this.smokeAreas[i];
            
            // \u7159\u306e\u79fb\u52d5
            if (smoke.vx && smoke.vy) {
                smoke.x += smoke.vx;
                smoke.y += smoke.vy;
                
                // \u58c1\u3067\u53cd\u5c04
                if (smoke.x - smoke.radius < 0 || smoke.x + smoke.radius > this.canvas.width) {
                    smoke.vx = -smoke.vx;
                }
                if (smoke.y - smoke.radius < 0 || smoke.y + smoke.radius > this.canvas.height) {
                    smoke.vy = -smoke.vy;
                }
            }
            
            // \u7159\u306e\u900f\u660e\u5ea6\u3068\u30b5\u30a4\u30ba\u306e\u5909\u5316
            if (smoke.growing) {
                smoke.opacity = Math.min(smoke.opacity + 0.02, smoke.maxOpacity);
                if (smoke.opacity >= smoke.maxOpacity) {
                    smoke.growing = false;
                }
            } else {
                smoke.life--;
                if (smoke.life < 100) {
                    smoke.opacity = Math.max(0, smoke.opacity - 0.01);
                }

                // 時間経過で徐々に縮小
                smoke.radius *= 0.997;
            }
            
            // 描画点を小さくゆらめかせ、煙をふらふら動かす
            if (smoke.points) {
                const minR = smoke.radius * 0.75;
                const maxR = smoke.radius * 1.25;
                smoke.points.forEach(p => {
                    p.radius += (Math.random() - 0.5);
                    p.angle += 0.01; // ゆっくり回転
                    if (p.radius < minR) p.radius = minR;
                    if (p.radius > maxR) p.radius = maxR;
                });
            }

            // \u7159\u306e\u30d1\u30fc\u30c6\u30a3\u30af\u30eb\u306e\u751f\u6210
            if (Math.random() < 0.3) {
                smoke.particles.push({
                    x: smoke.x + (Math.random() - 0.5) * smoke.radius,
                    y: smoke.y + (Math.random() - 0.5) * smoke.radius,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 30 + Math.random() * 20,
                    alpha: 0.5 + Math.random() * 0.3,
                    size: 3 + Math.random() * 4
                });
            }
            
            // パーティクルの更新
            for (let j = smoke.particles.length - 1; j >= 0; j--) {
                const particle = smoke.particles[j];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;
                particle.alpha -= 0.02;
                
                if (particle.life <= 0 || particle.alpha <= 0) {
                    smoke.particles.splice(j, 1);
                }
            }
            
            if (smoke.life <= 0 && smoke.opacity <= 0) {
                this.smokeAreas.splice(i, 1);
            }
        }
    }
    
    checkStageProgress() {
        const currentTime = Date.now();
        const survivalTime = Math.floor((currentTime - this.stageStartTime) / 1000);
        
        // ステージアップ条件: 血液量 × 生存時間
        const stageProgress = this.totalBloodCollected * survivalTime;
        const config = this.stageConfigs[this.currentStage - 1];
        
        if (stageProgress >= config.stageThreshold && this.currentStage < 10) {
            this.advanceStage();
        }
    }
    
    advanceStage() {
        this.currentStage++;
        this.stageStartTime = Date.now();
        
        // ステージクリアエフェクト
        this.createStageAdvanceEffect();
        
        // 難易度更新
        this.updateDifficultyForStage();
        
        // ステージ10でゲームクリア
        if (this.currentStage > 10) {
            this.gameComplete();
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            particle.life--;
            particle.alpha -= 0.015;
            
            if (particle.life <= 0 || particle.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    spawnEnemies() {
        const currentTime = Date.now();
        const config = this.stageConfigs[this.currentStage - 1];
        
        // 手のペアの生成
        if (currentTime - this.lastHandSpawn > this.handSpawnRate) {
            const activeHandPairs = this.handPairs.length;
            if (activeHandPairs < config.handPairs) {
                this.spawnHandPair();
            }
            this.lastHandSpawn = currentTime;
        }
        
        // 血液の生成
        if (currentTime - this.lastBloodSpawn > this.bloodSpawnRate) {
            this.spawnMultipleBloodDrops();
            this.lastBloodSpawn = currentTime;
        }
        
        // 蚊取り線香の煙の生成
        if (config.smokeCount > 0 && currentTime - this.lastSmokeSpawn > this.smokeSpawnRate) {
            const activeSmokeAreas = this.smokeAreas.length;
            if (activeSmokeAreas < config.smokeCount) {
                this.spawnSmokeArea();
            }
            this.lastSmokeSpawn = currentTime;
        }
    }
    
    spawnHandPair() {
        const side = Math.floor(Math.random() * 4);
        let leftX, leftY, rightX, rightY;
        const handDistance = 80;
        const config = this.stageConfigs[this.currentStage - 1];
        
        switch (side) {
            case 0: // 左から
                leftX = -60;
                leftY = Math.random() * (this.canvas.height - 200) + 100;
                rightX = leftX - handDistance;
                rightY = leftY + 30;
                break;
            case 1: // 右から
                rightX = this.canvas.width + 60;
                rightY = Math.random() * (this.canvas.height - 200) + 100;
                leftX = rightX + handDistance;
                leftY = rightY + 30;
                break;
            case 2: // 上から
                leftX = Math.random() * (this.canvas.width - 200) + 100;
                leftY = -60;
                rightX = leftX + handDistance;
                rightY = leftY - 30;
                break;
            case 3: // 下から
                leftX = Math.random() * (this.canvas.width - 200) + 100;
                leftY = this.canvas.height + 60;
                rightX = leftX + handDistance;
                rightY = leftY + 30;
                break;
        }
        
        this.handPairs.push({
            leftHand: {
                x: leftX,
                y: leftY,
                size: 35,
                type: 'left'
            },
            rightHand: {
                x: rightX,
                y: rightY,
                size: 35,
                type: 'right'
            },
            speed: config.handSpeed + Math.random() * 0.5,
            life: 600 + Math.random() * 400,
            attackRadius: 80,
            closingSpeed: 0.15,
            closing: false
        });
    }
    
    spawnSmokeArea() {
        const config = this.stageConfigs[this.currentStage - 1];
        const x = Math.random() * (this.canvas.width - 120) + 60;
        const y = Math.random() * (this.canvas.height - 120) + 60;
        
        // ステージ設定に基づいた煙のサイズ
        const baseRadius = config.smokeSize || 40;
        const radius = baseRadius + Math.random() * 20;
        
        // 煙の移動速度をステージ設定から取得
        const speed = config.smokeSpeed || 0;
        const angle = Math.random() * Math.PI * 2;
        
        const pointCount = 14 + Math.floor(Math.random() * 4);
        const points = [];
        for (let i = 0; i < pointCount; i++) {
            const a = (Math.PI * 2 * i) / pointCount;
            const r = radius * (0.8 + Math.random() * 0.4);
            points.push({ angle: a, radius: r });
        }

        this.smokeAreas.push({
            x: x,
            y: y,
            radius: radius,
            opacity: 0,
            maxOpacity: 0.6 + Math.random() * 0.3,
            life: 800 + Math.random() * 400,
            maxLife: 800 + Math.random() * 400,
            particles: [],
            growing: true,
            points: points,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
        });
    }
    
    spawnMultipleBloodDrops() {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const type = Math.floor(Math.random() * 3);
            let size, points;
            
            switch (type) {
                case 0: // 小
                    size = 6;
                    points = 5;
                    break;
                case 1: // 中
                    size = 10;
                    points = 15;
                    break;
                case 2: // 大
                    size = 14;
                    points = 30;
                    break;
            }
            
            this.bloodDrops.push({
                x: Math.random() * (this.canvas.width - 60) + 30,
                y: Math.random() * (this.canvas.height - 60) + 30,
                size: size,
                points: points,
                type: type,
                life: 600 + Math.random() * 400,
                pulse: 0
            });
        }
    }
    
    spawnInitialBlood() {
        for (let i = 0; i < 5; i++) {
            this.spawnMultipleBloodDrops();
        }
    }
    
    checkCollisions() {
        if (this.player.invulnerable) return;
        
        for (let i = this.handPairs.length - 1; i >= 0; i--) {
            const pair = this.handPairs[i];
            const leftHand = pair.leftHand;
            const rightHand = pair.rightHand;
            
            const leftDistance = Math.sqrt(
                (this.player.x - leftHand.x) ** 2 + 
                (this.player.y - leftHand.y) ** 2
            );
            
            const rightDistance = Math.sqrt(
                (this.player.x - rightHand.x) ** 2 + 
                (this.player.y - rightHand.y) ** 2
            );
            
            // 両手で挟まれた時のみダメージ
            const leftHandTouching = leftDistance < this.player.size + leftHand.size - 15;
            const rightHandTouching = rightDistance < this.player.size + rightHand.size - 15;
            
            if (leftHandTouching && rightHandTouching) {
                // 挟み込み成功エフェクト
                this.createClapEffect(
                    (leftHand.x + rightHand.x) / 2,
                    (leftHand.y + rightHand.y) / 2
                );
                this.takeDamage();
                // 成功した手のペアを削除
                this.handPairs.splice(i, 1);
                return;
            }
        }
        
        for (let i = this.bloodDrops.length - 1; i >= 0; i--) {
            const drop = this.bloodDrops[i];
            const distance = Math.sqrt(
                (this.player.x - drop.x) ** 2 + 
                (this.player.y - drop.y) ** 2
            );
            
            if (distance < this.player.size + drop.size) {
                this.bloodDrops.splice(i, 1);
                const bloodAmount = 1; // 血液の取得量を一定に
                this.player.blood = Math.min(this.player.blood + bloodAmount, this.player.maxBlood);
                this.score += drop.points;
                this.totalBloodCollected += bloodAmount; // 血液量を集計
                // Extra life mechanic - collect blood drops towards new life
                this.bloodSinceLife += bloodAmount;
                if (this.bloodSinceLife >= this.bloodForLife) {
                    if (this.player.maxLives < this.maxLifeLimit) {
                        this.player.maxLives++;
                    }
                    if (this.player.lives < this.player.maxLives) {
                        this.player.lives++;
                    }
                    this.bloodSinceLife = 0;
                }
                this.createBloodParticles(drop.x, drop.y, drop.type);
            }
        }
        
        // 蚊取り線香の煙との当たり判定
        for (let i = this.smokeAreas.length - 1; i >= 0; i--) {
            const smoke = this.smokeAreas[i];
            const distance = Math.sqrt(
                (this.player.x - smoke.x) ** 2 + 
                (this.player.y - smoke.y) ** 2
            );
            
            if (distance < this.player.size + smoke.radius && smoke.opacity > 0.2) {
                this.takeDamage();
                return;
            }
        }
    }
    
    takeDamage() {
        this.player.lives--;
        this.player.invulnerable = true;
        this.player.invulnerableTime = 90; // 1.5秒間の無敵時間
        
        this.createDamageParticles(this.player.x, this.player.y);
        
        if (this.player.lives <= 0) {
            this.gameOver();
        }
    }
    
    createBloodParticles(x, y, type) {
        const particleCount = type === 2 ? 12 : type === 1 ? 8 : 6;
        const colors = ['#FF0000', '#CC0000', '#990000'];
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 40,
                alpha: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 2 + Math.random() * 2
            });
        }
    }
    
    createClapEffect(x, y) {
        // 手の挟み込み成功エフェクト
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                life: 40,
                alpha: 1,
                color: '#FFA500',
                size: 4 + Math.random() * 3
            });
        }
        
        // パチン！という文字エフェクトを追加
        this.particles.push({
            x: x,
            y: y - 20,
            vx: 0,
            vy: -2,
            life: 60,
            alpha: 1,
            color: '#FF6347',
            size: 20,
            text: 'パチン！'
        });
    }
    
    createDamageParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 60,
                alpha: 1,
                color: '#FFFF00',
                size: 3 + Math.random() * 2
            });
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        
        const currentTime = Date.now();
        const totalSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.finalScoreElement.textContent = this.score;
        this.finalStageElement.textContent = this.currentStage;
        this.finalTimeElement.textContent = timeString;
        this.gameOverScreen.classList.remove('hidden');
    }
    
    gameComplete() {
        this.gameRunning = false;
        
        const currentTime = Date.now();
        const totalSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.completeScoreElement.textContent = this.score;
        this.completeTimeElement.textContent = timeString;
        this.gameCompleteScreen.classList.remove('hidden');
        
        this.createGameCompleteEffect();
    }
    
    createStageAdvanceEffect() {
        // ステージアップ時のエフェクト
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 80,
                alpha: 1,
                color: '#FFD700',
                size: 5 + Math.random() * 5
            });
        }
    }
    
    createGameCompleteEffect() {
        // ゲームクリア時の豪華なエフェクト
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                life: 120,
                alpha: 1,
                color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)],
                size: 8 + Math.random() * 8
            });
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `スコア: ${this.score}`;
        this.bloodElement.textContent = `血液: ${this.player.blood}/${this.player.maxBlood}`;
        this.stageElement.textContent = `ステージ: ${this.currentStage}`;
        
        if (this.livesElement) {
            this.livesElement.textContent = `ライフ: ${'♥'.repeat(this.player.lives)}${'♡'.repeat(this.player.maxLives - this.player.lives)}`;
        }
        
        // タイマー表示
        const currentTime = Date.now();
        const totalSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        this.timerElement.textContent = `時間: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 進捗バー表示
        const stageConfig = this.stageConfigs[this.currentStage - 1];
        const survivalTime = Math.floor((currentTime - this.stageStartTime) / 1000);
        const stageProgress = this.totalBloodCollected * survivalTime;
        const progressPercent = Math.min(100, (stageProgress / stageConfig.stageThreshold) * 100);
        
        this.progressFillElement.style.width = `${progressPercent}%`;
        
        if (this.currentStage >= 10) {
            this.progressTextElement.textContent = '最終ステージ';
        } else {
            this.progressTextElement.textContent = `ステージ${this.currentStage + 1}まで ${Math.floor(progressPercent)}%`;
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        this.drawBloodDrops();
        this.drawSmokeAreas();
        this.drawPlayer();
        this.drawHands();
        this.drawParticles();
    }
    
    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#F0F8FF');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle);
        
        // 無敵時間中の点滅効果
        if (this.player.invulnerable && Math.floor(this.player.invulnerableTime / 10) % 2 === 0) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // より詳細な羽の描画（透明度と静脈付き）
        const wingFlap = Math.sin(this.player.wingFlap) * 0.3;
        const wingSpeed = Math.sin(this.player.wingFlap * 15) * 0.1; // 高速な羽ばたき
        
        // 左翼
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(200, 200, 255, 0.2)';
        this.ctx.strokeStyle = 'rgba(150, 150, 200, 0.4)';
        this.ctx.lineWidth = 0.5;
        this.ctx.translate(-this.player.size * 0.8, -this.player.size * 0.3);
        this.ctx.rotate(-0.3 + wingFlap + wingSpeed);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.player.size * 0.8, this.player.size * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        // 羽の静脈
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(this.player.size * 0.6, -this.player.size * 0.1 + i * this.player.size * 0.1);
            this.ctx.stroke();
        }
        this.ctx.restore();
        
        // 右翼
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(200, 200, 255, 0.2)';
        this.ctx.strokeStyle = 'rgba(150, 150, 200, 0.4)';
        this.ctx.lineWidth = 0.5;
        this.ctx.translate(this.player.size * 0.8, -this.player.size * 0.3);
        this.ctx.rotate(0.3 - wingFlap - wingSpeed);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.player.size * 0.8, this.player.size * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        // 羽の静脈
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(this.player.size * 0.6, -this.player.size * 0.1 + i * this.player.size * 0.1);
            this.ctx.stroke();
        }
        this.ctx.restore();
        
        // 胴体の詳細（頭部、胸部、腹部の3セグメント）
        // 頭部
        this.ctx.fillStyle = '#1a0f08';
        this.ctx.beginPath();
        this.ctx.ellipse(-this.player.size * 0.7, 0, this.player.size * 0.4, this.player.size * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 胸部
        this.ctx.fillStyle = '#2C1810';
        this.ctx.beginPath();
        this.ctx.ellipse(-this.player.size * 0.2, 0, this.player.size * 0.35, this.player.size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 腹部（縞模様付き）
        this.ctx.fillStyle = '#3a2418';
        this.ctx.beginPath();
        this.ctx.ellipse(this.player.size * 0.3, 0, this.player.size * 0.6, this.player.size * 0.35, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 腹部の縞模様
        this.ctx.strokeStyle = '#2C1810';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const x = this.player.size * (0.1 + i * 0.15);
            this.ctx.beginPath();
            this.ctx.moveTo(x, -this.player.size * 0.3);
            this.ctx.lineTo(x, this.player.size * 0.3);
            this.ctx.stroke();
        }
        
        // 複眼（より詳細）
        this.ctx.fillStyle = '#4B0000';
        this.ctx.beginPath();
        this.ctx.ellipse(-this.player.size * 0.85, -this.player.size * 0.15, this.player.size * 0.2, this.player.size * 0.18, -0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(-this.player.size * 0.85, this.player.size * 0.15, this.player.size * 0.2, this.player.size * 0.18, 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 複眼の光沢
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(-this.player.size * 0.9, -this.player.size * 0.15, this.player.size * 0.08, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(-this.player.size * 0.9, this.player.size * 0.15, this.player.size * 0.08, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 触角（羽毛状）
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1.5;
        // 上触角
        this.ctx.beginPath();
        this.ctx.moveTo(-this.player.size * 1.1, -this.player.size * 0.25);
        this.ctx.quadraticCurveTo(-this.player.size * 1.3, -this.player.size * 0.35, -this.player.size * 1.5, -this.player.size * 0.5);
        this.ctx.stroke();
        // 触角の毛
        for (let i = 0; i < 5; i++) {
            const x = -this.player.size * (1.2 + i * 0.06);
            const y = -this.player.size * (0.3 + i * 0.04);
            this.ctx.strokeStyle = 'rgba(101, 67, 33, 0.6)';
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - this.player.size * 0.03, y - this.player.size * 0.05);
            this.ctx.stroke();
        }
        
        // 下触角
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(-this.player.size * 1.1, this.player.size * 0.25);
        this.ctx.quadraticCurveTo(-this.player.size * 1.3, this.player.size * 0.35, -this.player.size * 1.5, this.player.size * 0.5);
        this.ctx.stroke();
        // 触角の毛
        for (let i = 0; i < 5; i++) {
            const x = -this.player.size * (1.2 + i * 0.06);
            const y = this.player.size * (0.3 + i * 0.04);
            this.ctx.strokeStyle = 'rgba(101, 67, 33, 0.6)';
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - this.player.size * 0.03, y + this.player.size * 0.05);
            this.ctx.stroke();
        }
        
        // 口器（より詳細な針）
        const gradient = this.ctx.createLinearGradient(
            -this.player.size * 1.1, 0,
            -this.player.size * 1.6, 0
        );
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(1, '#654321');
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-this.player.size * 1.1, 0);
        this.ctx.lineTo(-this.player.size * 1.6, 0);
        this.ctx.stroke();
        
        // 針の先端
        this.ctx.fillStyle = '#654321';
        this.ctx.beginPath();
        this.ctx.arc(-this.player.size * 1.6, 0, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 6本の足（より詳細な関節付き）
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
            const legX = -this.player.size * 0.4 + i * this.player.size * 0.25;
            const legY = i % 2 === 0 ? this.player.size * 0.35 : -this.player.size * 0.35;
            const legAngle = i % 2 === 0 ? 0.5 : -0.5;
            
            // 脚の第1節
            this.ctx.beginPath();
            this.ctx.moveTo(legX, 0);
            const joint1X = legX + Math.cos(legAngle) * this.player.size * 0.2;
            const joint1Y = legY * 0.4;
            this.ctx.lineTo(joint1X, joint1Y);
            this.ctx.stroke();
            
            // 脚の第2節
            this.ctx.beginPath();
            this.ctx.moveTo(joint1X, joint1Y);
            const joint2X = joint1X + Math.cos(legAngle * 1.5) * this.player.size * 0.15;
            const joint2Y = joint1Y + Math.abs(legY) * 0.3 * (legY > 0 ? 1 : -1);
            this.ctx.lineTo(joint2X, joint2Y);
            this.ctx.stroke();
            
            // 脚の第3節（先端）
            this.ctx.beginPath();
            this.ctx.moveTo(joint2X, joint2Y);
            this.ctx.lineTo(joint2X + this.player.size * 0.05, legY);
            this.ctx.stroke();
            
            // 関節の点
            this.ctx.fillStyle = '#4a3621';
            this.ctx.beginPath();
            this.ctx.arc(joint1X, joint1Y, 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(joint2X, joint2Y, 0.8, 0, Math.PI * 2);
            this.ctx.fill();

        }
        
        // 血で膨らんだ腹部（より詳細）
        if (this.player.blood > 0) {
            const swellingFactor = 1 + (this.player.blood / this.player.maxBlood) * 1.2;
            
            // 血液で満たされた腹部
            const bloodGradient = this.ctx.createRadialGradient(
                this.player.size * 0.3, 0, 0,
                this.player.size * 0.3, 0, this.player.size * 0.5 * swellingFactor
            );
            bloodGradient.addColorStop(0, '#CC0000');
            bloodGradient.addColorStop(0.7, '#8B0000');
            bloodGradient.addColorStop(1, '#660000');
            
            this.ctx.fillStyle = bloodGradient;
            this.ctx.beginPath();
            this.ctx.ellipse(this.player.size * 0.3, 0, 
                           this.player.size * 0.5 * swellingFactor, 
                           this.player.size * 0.4 * swellingFactor, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 血管のような模様
            this.ctx.strokeStyle = 'rgba(139, 0, 0, 0.5)';
            this.ctx.lineWidth = 0.5;
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3;
                this.ctx.beginPath();
                this.ctx.moveTo(this.player.size * 0.3, 0);
                this.ctx.lineTo(
                    this.player.size * 0.3 + Math.cos(angle) * this.player.size * 0.3 * swellingFactor,
                    Math.sin(angle) * this.player.size * 0.3 * swellingFactor
                );
                this.ctx.stroke();
            }
            
            // 血の光沢（より自然に）
            this.ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
            this.ctx.beginPath();
            this.ctx.ellipse(this.player.size * 0.2, -this.player.size * 0.1, 
                           this.player.size * 0.15 * swellingFactor, 
                           this.player.size * 0.1 * swellingFactor, -0.3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawHands() {
        this.handPairs.forEach(pair => {
            // ペア情報を手に追加
            pair.leftHand.pair = pair;
            pair.rightHand.pair = pair;
            this.drawHand(pair.leftHand, 'left');
            this.drawHand(pair.rightHand, 'right');
        });
    }
    
    drawHand(hand, type) {
        this.ctx.save();
        this.ctx.translate(hand.x, hand.y);
        
        // 手の向きを計算（挟み込む動作を考慮）
        const pairCenter = hand.pair ? {
            x: (hand.pair.leftHand.x + hand.pair.rightHand.x) / 2,
            y: (hand.pair.leftHand.y + hand.pair.rightHand.y) / 2
        } : {x: hand.x, y: hand.y};
        
        const dx = this.player.x - pairCenter.x;
        const dy = this.player.y - pairCenter.y;
        const baseAngle = Math.atan2(dy, dx);
        
        // 左手と右手で異なる角度にして挟み込む動作を表現
        const handOffset = hand.type === 'left' ? -0.3 : 0.3;
        const angle = baseAngle + handOffset;
        this.ctx.rotate(angle);
        
        // 影の描画
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(2, 2, hand.size * 0.9, hand.size * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 手のひら（ベース）
        this.ctx.fillStyle = '#FDBCB4';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, hand.size * 0.8, hand.size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 手の甘の線
        this.ctx.strokeStyle = '#E6A073';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(-hand.size * 0.3, -hand.size * 0.2);
        this.ctx.lineTo(hand.size * 0.3, hand.size * 0.2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(-hand.size * 0.2, hand.size * 0.3);
        this.ctx.lineTo(hand.size * 0.2, -hand.size * 0.3);
        this.ctx.stroke();
        
        // 5本の指を描画
        const fingerPositions = [
            { x: hand.size * 0.6, y: -hand.size * 0.5, width: 0.12, length: 0.4 }, // 親指
            { x: hand.size * 0.8, y: -hand.size * 0.2, width: 0.1, length: 0.5 },  // 人差し指
            { x: hand.size * 0.9, y: 0, width: 0.11, length: 0.55 },               // 中指
            { x: hand.size * 0.8, y: hand.size * 0.2, width: 0.1, length: 0.5 },   // 薬指
            { x: hand.size * 0.6, y: hand.size * 0.4, width: 0.08, length: 0.35 }  // 小指
        ];
        
        fingerPositions.forEach((finger, i) => {
            this.ctx.fillStyle = '#F4A586';
            
            // 指の節を表現するために3つのセグメントで描画
            for (let j = 0; j < 3; j++) {
                const segmentX = finger.x + (finger.length * hand.size * j / 3);
                const segmentY = finger.y;
                const segmentWidth = finger.width * hand.size * (1 - j * 0.1);
                const segmentHeight = finger.length * hand.size / 3;
                
                this.ctx.beginPath();
                this.ctx.ellipse(segmentX, segmentY, segmentWidth, segmentHeight * 0.6, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 指の節の線
                if (j < 2) {
                    this.ctx.strokeStyle = '#E6A073';
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(segmentX + segmentWidth, segmentY - segmentHeight * 0.3);
                    this.ctx.lineTo(segmentX + segmentWidth, segmentY + segmentHeight * 0.3);
                    this.ctx.stroke();
                }
            }
            
            // 爪の描画
            this.ctx.fillStyle = '#FFE4E1';
            const nailX = finger.x + finger.length * hand.size;
            const nailY = finger.y;
            this.ctx.beginPath();
            this.ctx.ellipse(nailX, nailY, finger.width * hand.size * 0.7, finger.width * hand.size * 0.5, 0, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 指紋の細かい描写
        this.ctx.strokeStyle = 'rgba(230, 160, 115, 0.5)';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, hand.size * (0.3 + i * 0.15), 0.5, Math.PI - 0.5);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawBloodDrops() {
        this.bloodDrops.forEach(drop => {
            this.ctx.save();
            
            // パルスアニメーション
            const pulseSize = drop.size + Math.sin(drop.pulse) * 2;
            
            // 影の描画
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(drop.x + 2, drop.y + 2, pulseSize * 0.8, pulseSize * 0.6, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 血液のメイン部分
            const colors = ['#8B0000', '#CC0000', '#FF0000'];
            this.ctx.fillStyle = colors[drop.type];
            this.ctx.beginPath();
            this.ctx.arc(drop.x, drop.y, pulseSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 光沢の描画
            const highlightColors = ['#CC0000', '#FF3333', '#FF6666'];
            this.ctx.fillStyle = highlightColors[drop.type];
            this.ctx.beginPath();
            this.ctx.arc(drop.x - pulseSize * 0.3, drop.y - pulseSize * 0.3, pulseSize * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 小さなハイライト
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(drop.x - pulseSize * 0.2, drop.y - pulseSize * 0.2, pulseSize * 0.15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // タイプ別のポイント表示
            if (drop.type > 0) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.font = `${Math.max(8, pulseSize * 0.5)}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`+${drop.points}`, drop.x, drop.y + pulseSize + 15);
            }
            
            this.ctx.restore();
        });
    }
    
    drawSmokeAreas() {
        this.smokeAreas.forEach(smoke => {
            this.ctx.save();
            this.ctx.globalAlpha = smoke.opacity;

            // 煙のメインエリア（グラデーション）
            const gradient = this.ctx.createRadialGradient(
                smoke.x, smoke.y, 0,
                smoke.x, smoke.y, smoke.radius
            );
            gradient.addColorStop(0, 'rgba(150, 150, 150, 0.8)');
            gradient.addColorStop(0.4, 'rgba(200, 200, 200, 0.6)');
            gradient.addColorStop(1, 'rgba(230, 230, 230, 0.1)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            if (smoke.points) {
                smoke.points.forEach((p, idx) => {
                    const px = smoke.x + Math.cos(p.angle) * p.radius;
                    const py = smoke.y + Math.sin(p.angle) * p.radius;
                    if (idx === 0) this.ctx.moveTo(px, py);
                    else this.ctx.lineTo(px, py);
                });
                this.ctx.closePath();
            } else {
                this.ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
            }
            this.ctx.fill();
            // 煙の渦巻きを描画
            this.ctx.strokeStyle = "rgba(120,120,120,0.5)";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            for (let a = 0; a <= Math.PI * 4; a += 0.2) {
                const r = (smoke.radius * a) / (Math.PI * 4);
                const px = smoke.x + Math.cos(a + smoke.life * 0.02) * r;
                const py = smoke.y + Math.sin(a + smoke.life * 0.02) * r;
                if (a === 0) this.ctx.moveTo(px, py); else this.ctx.lineTo(px, py);
            }
            this.ctx.stroke();
            
            // 煙のパーティクル
            smoke.particles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.alpha * smoke.opacity;
                this.ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
            
            // 危険を示す赤い境界線
            if (smoke.opacity > 0.5) {
                this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                if (smoke.points) {
                    smoke.points.forEach((p, idx) => {
                        const px = smoke.x + Math.cos(p.angle) * (p.radius + 5);
                        const py = smoke.y + Math.sin(p.angle) * (p.radius + 5);
                        if (idx === 0) this.ctx.moveTo(px, py);
                        else this.ctx.lineTo(px, py);
                    });
                    this.ctx.closePath();
                } else {
                    this.ctx.arc(smoke.x, smoke.y, smoke.radius + 5, 0, Math.PI * 2);
                }
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            this.ctx.restore();
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            
            // テキストパーティクルの場合
            if (particle.text) {
                this.ctx.font = `bold ${particle.size}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(particle.text, particle.x, particle.y);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size || 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // パーティクルの光沢効果
            if (particle.color.includes('#FF')) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, ' + (particle.alpha * 0.5) + ')';
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, (particle.size || 2) * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing game...');
    try {
        const game = new MosquitoGame();
        console.log('Game instance created successfully');
    } catch (error) {
        console.error('Error creating game instance:', error);
    }
});