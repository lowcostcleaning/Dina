// app.js - Birthday Portal Interactivity & Games

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. STATE & DATA INITIALIZATION
    // -------------------------------------------------------------
    let currentScreen = 'screen-intro';
    let questLevel = 1; // 1 to 4
    let currentQuizIndex = 0;
    let isSoundEnabled = true;
    let isScanning = false;
    let scanTimeout = null;

    // Web Audio Synthesizer for Retro/Funny Sound Effects
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playSound(type) {
        if (!isSoundEnabled) return;
        try {
            // Re-enable audio context if suspended (browser security)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'success') {
                // Happy Chime
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.linearRampToValueAtTime(0.2, now + 0.24);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            } else if (type === 'error') {
                // Sad Buzz
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(130, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.35);
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'scan') {
                // Scanner sweeping noise
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(800, now + 1.5);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0.1, now + 1.3);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 1.5);
                osc.start(now);
                osc.stop(now + 1.5);
            } else if (type === 'fanfare') {
                // Cute short melody
                const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
                const durations = [0.15, 0.15, 0.15, 0.15, 0.15, 0.4];
                let time = now;
                notes.forEach((freq, idx) => {
                    const noteOsc = audioCtx.createOscillator();
                    const noteGain = audioCtx.createGain();
                    noteOsc.type = 'sine';
                    noteOsc.frequency.setValueAtTime(freq, time);
                    noteGain.gain.setValueAtTime(0.15, time);
                    noteGain.gain.linearRampToValueAtTime(0.01, time + durations[idx]);
                    noteOsc.connect(noteGain);
                    noteGain.connect(audioCtx.destination);
                    noteOsc.start(time);
                    noteOsc.stop(time + durations[idx]);
                    time += durations[idx] - 0.02;
                });
            }
        } catch (e) {
            console.log('AudioContext not supported or blocked:', e);
        }
    }

    // -------------------------------------------------------------
    // DATASETS
    // -------------------------------------------------------------
    const quizQuestions = [
        {
            q: "Какое твое любимое занятие, когда никто не видит и дел совсем нет?",
            options: [
                { text: "Планировать грандиозный захват мира и расставлять папочки по цветам.", isCorrect: false },
                { text: "Скроллить смешные рилсы и вздыхать: «Ну это же буквально я!»", isCorrect: true, comment: "Детектор подтверждает: это 100% попадание!" },
                { text: "Внезапно начать генеральную уборку в 3 часа ночи под техно.", isCorrect: false },
                { text: "Заниматься спортом (ха-ха, очень смешно, листаем дальше)." }
            ]
        },
        {
            q: "Представь идеальное утро Дины. Какое оно?",
            options: [
                { text: "Проснуться в 5 утра, выпить сельдереевый смузи и побежать марафон." },
                { text: "Проснуться в 12:00, полежать до 13:00, неспешно заказать самый эстетичный кофе и сказать: «Какая сложная жизнь!»", isCorrect: true, comment: "Идеально! Жизнь должна быть гедонистичной." },
                { text: "Сразу начать отвечать на рабочие сообщения в прыжке." }
            ]
        },
        {
            q: "Если Дина пишет в чат «Я буду через 5 минут», это означает, что:",
            options: [
                { text: "Она ровно через 300 секунд переступит порог." },
                { text: "Она только-только нанесла маску для лица и вообще думает, идти ли.", isCorrect: false },
                { text: "Она находится на стыке пространственно-временного континуума: выбирает наряд, сушит волосы и пьет чай одновременно.", isCorrect: true, comment: "Время — понятие относительное, особенно для Дины!" }
            ]
        }
    ];

    const emotionQuestions = [
        {
            img: "SaveInta.com_702670252_18586297342058209_9041956576166705422_n.jpg",
            q: "Уровень эстетики и шарма на этой фотографии по шкале приборов:",
            options: [
                { text: "Ну, симпатично, 7 из 10." },
                { text: "Приборы сгорели от перегрузки! В радиусе километра зафиксирована зона повышенной красоты.", isCorrect: true, comment: "Конечно! Уровень эстетики просто зашкаливает." },
                { text: "Нормально, сойдет." }
            ]
        },
        {
            img: "SaveInta.com_703978277_18586297324058209_375413065061604416_n.jpg",
            q: "Взгляд Дины на этом кадре транслирует окружающим:",
            options: [
                { text: "«Почему все вокруг ведут себя так неэстетично?»" },
                { text: "«Я восхитительна, и спорить с этим бесполезно.»", isCorrect: true, comment: "Факт! Сияние королевы невозможно скрыть." },
                { text: "«Кажется, я забыла закрыть дверь...»" }
            ]
        }
    ];

    const decryptWords = ["Дина", "самая", "очаровательная", "красотка", "в", "этой", "галактике", "и", "точка"];
    let decryptAnswer = [];

    // Tarot cards config
    const tarotCardsData = [
        { img: 'SaveInta.com_682096421_18580621609058209_7094717074753438823_n.jpg', title: 'Дина-Гедонист', text: 'Твой девиз сегодня — роскошный отдых, эстетичные завтраки и ноль забот. Разрешено тратить миллионы на радости жизни!' },
        { img: 'SaveInta.com_682489762_18580621648058209_5696642674362851020_n.jpg', title: 'Дина-Загадка', text: 'Твой взгляд сегодня разбивает сердечки. Окружающие пытаются разгадать твою тайну, но ты слишком недосягаема!' },
        { img: 'SaveInta.com_683824081_18580621627058209_3503828004721892018_n.jpg', title: 'Дина-Шеф', text: 'Уровень стиля и авторитета сегодня бьет рекорды. Куда укажешь — туда все и побегут исполнять твои капризы!' },
        { img: 'SaveInta.com_685338945_18580621591058209_2682582034008583597_n.jpg', title: 'Дина-Тусовщица', text: 'Ноги сами просятся на танцпол, а рука тянется к бокалу игристого. Твой вайб заряжает всех вокруг!' },
        { img: 'SaveInta.com_685864235_18580621618058209_7675581102547582177_n.jpg', title: 'Дина-Муза', text: 'Ты вдохновляешь поэтов, художников, бариста и прохожих. Твоя красота спасет этот мир от скуки!' },
        { img: 'SaveInta.com_702670252_18586297342058209_9041956576166705422_n.jpg', title: 'Дина-Богиня', text: 'Впрочем, это твое стандартное состояние. Просто продолжай сиять и принимать комплименты!' }
    ];

    // Compliments Array for Generator
    const funnyCompliments = [
        "Дина, твоя харизма настолько мощная, что ею можно заряжать айфоны!",
        "Если бы за эстетичность давали штрафы, ты бы уже была пожизненно заключена в замке роскоши.",
        "Дина, ты как дорогой кофе: бодришь, восхищаешь своим ароматом и стоишь всех денег мира.",
        "Твоей способности выглядеть шикарно в любой ситуации завидует даже Райан Гослинг.",
        "Диночка, ты — ходячий антидепрессант! Рядом с тобой уровень счастья поднимается до 200%.",
        "Твоя улыбка лечит плохое настроение, снимает сглаз и привлекает финансовое благополучие.",
        "Ты настолько крутая, что котики уступают тебе дорогу и первыми просят погладить.",
        "Дина, оставайся всегда такой же яркой! Миру нужно больше твоего невероятного вайба.",
        "Ты — воплощение стиля. Даже обычные домашние тапочки на тебе смотрятся как от Гуччи."
    ];

    // -------------------------------------------------------------
    // 2. BALLOONS & PARTICLES GENERATOR
    // -------------------------------------------------------------
    function createBalloons() {
        const colors = ['#ff2a85', '#ffb800', '#00d2ff', '#a266ff', '#ff5e97'];
        const container = document.getElementById('particle-container');
        for (let i = 0; i < 15; i++) {
            const balloon = document.createElement('div');
            balloon.classList.add('balloon');
            
            const sizeWidth = Math.floor(Math.random() * 20) + 30;
            balloon.style.width = `${sizeWidth}px`;
            balloon.style.height = `${sizeWidth * 1.25}px`;
            
            balloon.style.left = `${Math.random() * 90}%`;
            balloon.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            balloon.style.animationDelay = `${Math.random() * 8}s`;
            balloon.style.animationDuration = `${Math.random() * 10 + 10}s`;
            container.appendChild(balloon);
        }
    }

    function createParticles() {
        const container = document.getElementById('particle-container');
        for (let i = 0; i < 40; i++) {
            const particle = document.createElement('div');
            particle.classList.add('bg-particle');
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 6}s`;
            particle.style.animationDuration = `${Math.random() * 6 + 6}s`;
            container.appendChild(particle);
        }
    }

    createBalloons();
    createParticles();

    // Lucide Icons initialization
    lucide.createIcons();

    // -------------------------------------------------------------
    // 3. NAVIGATION CONTROLLER
    // -------------------------------------------------------------
    const header = document.getElementById('main-header');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentText = document.getElementById('progress-percent');

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(scr => {
            scr.classList.add('hidden');
        });
        const activeScreen = document.getElementById(screenId);
        activeScreen.classList.remove('hidden');
        currentScreen = screenId;
        playSound('click');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update progress bar
        if (screenId === 'screen-intro') {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
            updateProgress();
        }

        // Auto trigger final screen effects
        if (screenId === 'screen-final') {
            triggerConfettiRain();
            playSound('fanfare');
        }
    }

    function updateProgress() {
        let percent = 0;
        if (currentScreen === 'screen-quest') {
            percent = Math.floor(((questLevel - 1) + 0.5) * 20); // 10% - 70%
        } else if (currentScreen === 'screen-contests') {
            percent = 80;
        } else if (currentScreen === 'screen-cinema') {
            percent = 90;
        } else if (currentScreen === 'screen-final') {
            percent = 100;
        }
        progressBar.style.width = `${percent}%`;
        progressPercentText.innerText = `${percent}%`;
    }

    // -------------------------------------------------------------
    // 4. DIALOG MODAL CONTROLLER
    // -------------------------------------------------------------
    const dialogOverlay = document.getElementById('dialog-overlay');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogText = document.getElementById('dialog-text');
    const dialogCloseBtn = document.getElementById('dialog-close-btn');

    function showDialog(title, text) {
        dialogTitle.innerText = title;
        dialogText.innerText = text;
        dialogOverlay.classList.remove('hidden');
    }
    dialogCloseBtn.addEventListener('click', () => {
        dialogOverlay.classList.add('hidden');
        playSound('click');
    });

    // Sound toggle
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    audioToggleBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            audioToggleBtn.querySelector('span').innerText = 'Звуки: ВКЛ';
            audioToggleBtn.querySelector('i').setAttribute('data-lucide', 'volume-2');
            playSound('click');
        } else {
            audioToggleBtn.querySelector('span').innerText = 'Звуки: ВЫКЛ';
            audioToggleBtn.querySelector('i').setAttribute('data-lucide', 'volume-x');
        }
        lucide.createIcons();
    });

    // Intro button handler
    document.getElementById('start-quest-btn').addEventListener('click', () => {
        showScreen('screen-quest');
        startQuestLevel(1);
    });

    // -------------------------------------------------------------
    // 5. QUEST LOGIC
    // -------------------------------------------------------------
    const levelIndicator = document.getElementById('level-indicator');
    const questTitle = document.getElementById('quest-title');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const questFeedbackPanel = document.getElementById('quest-feedback');
    const feedbackIconBox = document.getElementById('feedback-icon-box');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackDesc = document.getElementById('feedback-desc');

    const stageQuiz = document.getElementById('stage-quiz');
    const stageEmotion = document.getElementById('stage-emotion');
    const stageDecrypt = document.getElementById('stage-decrypt');
    const stageDetector = document.getElementById('stage-detector');

    function scrollToQuestTop() {
        const questCard = document.querySelector('.quest-card');
        if (questCard) {
            questCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function startQuestLevel(level) {
        questLevel = level;
        levelIndicator.innerText = `Уровень ${level} из 4`;
        nextLevelBtn.classList.add('hidden');
        questFeedbackPanel.classList.add('hidden');
        
        // Hide all stages
        stageQuiz.classList.add('hidden');
        stageEmotion.classList.add('hidden');
        stageDecrypt.classList.add('hidden');
        stageDetector.classList.add('hidden');

        updateProgress();
        scrollToQuestTop();

        if (level === 1) {
            questTitle.innerText = "Тест на Диноведение";
            stageQuiz.classList.remove('hidden');
            currentQuizIndex = 0;
            renderQuizQuestion();
        } else if (level === 2) {
            questTitle.innerText = "Где логика? Вайб-детектор";
            stageEmotion.classList.remove('hidden');
            currentQuizIndex = 0;
            renderEmotionQuestion();
        } else if (level === 3) {
            questTitle.innerText = "Разблокировщик Комплиментов";
            stageDecrypt.classList.remove('hidden');
            initDecryptGame();
        } else if (level === 4) {
            questTitle.innerText = "Шуточный Детектор Лжи";
            stageDetector.classList.remove('hidden');
            initLieDetector();
        }
    }

    // --- LEVEL 1: QUIZ ---
    const questionBox = document.getElementById('question-box');
    function renderQuizQuestion() {
        const currentQ = quizQuestions[currentQuizIndex];
        questionBox.innerHTML = `
            <h3 class="question-text">${currentQ.q}</h3>
            <div class="options-grid"></div>
        `;
        const optionsGrid = questionBox.querySelector('.options-grid');
        currentQ.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.classList.add('btn', 'btn-choice');
            btn.innerText = opt.text;
            btn.addEventListener('click', () => handleQuizAnswer(btn, opt));
            optionsGrid.appendChild(btn);
        });
    }

    function handleQuizAnswer(selectedBtn, option) {
        // Disable other buttons
        const buttons = questionBox.querySelectorAll('.btn-choice');
        buttons.forEach(b => b.style.pointerEvents = 'none');

        if (option.isCorrect) {
            selectedBtn.classList.add('correct');
            playSound('success');
            
            // Show Feedback
            questFeedbackPanel.classList.remove('hidden', 'wrong-answer');
            feedbackIconBox.innerHTML = '<i data-lucide="check-circle" class="success-icon"></i>';
            feedbackTitle.innerText = "Правильно!";
            feedbackDesc.innerText = option.comment || "Идеальный ответ.";
            lucide.createIcons();
            
            setTimeout(() => {
                currentQuizIndex++;
                if (currentQuizIndex < quizQuestions.length) {
                    questFeedbackPanel.classList.add('hidden');
                    renderQuizQuestion();
                    scrollToQuestTop();
                } else {
                    nextLevelBtn.classList.remove('hidden');
                    nextLevelBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 2000);
        } else {
            selectedBtn.classList.add('wrong');
            playSound('error');
            
            // Show Feedback
            questFeedbackPanel.classList.remove('hidden');
            questFeedbackPanel.classList.add('wrong-answer');
            feedbackIconBox.innerHTML = '<i data-lucide="alert-triangle" class="error-icon"></i>';
            feedbackTitle.innerText = "Ошибка системы!";
            feedbackDesc.innerText = "Дина не одобряет этот ответ. Попробуй еще раз!";
            lucide.createIcons();

            // Vibrate/Shake options
            questionBox.classList.add('shake-anim');
            setTimeout(() => questionBox.classList.remove('shake-anim'), 500);

            setTimeout(() => {
                buttons.forEach(b => {
                    b.style.pointerEvents = 'auto';
                    b.classList.remove('wrong');
                });
                questFeedbackPanel.classList.add('hidden');
            }, 2000);
        }
    }

    // --- LEVEL 2: EMOTION GAME ---
    const emotionImg = document.getElementById('emotion-img');
    const emotionOptionsBox = document.getElementById('emotion-options-box');

    function renderEmotionQuestion() {
        const currentQ = emotionQuestions[currentQuizIndex];
        emotionImg.src = currentQ.img;
        emotionOptionsBox.innerHTML = `
            <h3 class="question-text">${currentQ.q}</h3>
            <div class="options-grid"></div>
        `;
        const grid = emotionOptionsBox.querySelector('.options-grid');
        currentQ.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.classList.add('btn', 'btn-choice');
            btn.innerText = opt.text;
            btn.addEventListener('click', () => handleEmotionAnswer(btn, opt));
            grid.appendChild(btn);
        });
    }

    function handleEmotionAnswer(selectedBtn, option) {
        const buttons = emotionOptionsBox.querySelectorAll('.btn-choice');
        buttons.forEach(b => b.style.pointerEvents = 'none');

        if (option.isCorrect) {
            selectedBtn.classList.add('correct');
            playSound('success');

            questFeedbackPanel.classList.remove('hidden', 'wrong-answer');
            feedbackIconBox.innerHTML = '<i data-lucide="check-circle" class="success-icon"></i>';
            feedbackTitle.innerText = "Совершенно верно!";
            feedbackDesc.innerText = option.comment;
            lucide.createIcons();

            setTimeout(() => {
                currentQuizIndex++;
                if (currentQuizIndex < emotionQuestions.length) {
                    questFeedbackPanel.classList.add('hidden');
                    renderEmotionQuestion();
                    scrollToQuestTop();
                } else {
                    nextLevelBtn.classList.remove('hidden');
                    nextLevelBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 2000);
        } else {
            selectedBtn.classList.add('wrong');
            playSound('error');

            questFeedbackPanel.classList.remove('hidden');
            questFeedbackPanel.classList.add('wrong-answer');
            feedbackIconBox.innerHTML = '<i data-lucide="alert-triangle" class="error-icon"></i>';
            feedbackTitle.innerText = "Не совсем...";
            feedbackDesc.innerText = "Интуиция Дины подсказывает, что тут кроется другой смысл. Попробуй заново!";
            lucide.createIcons();

            setTimeout(() => {
                buttons.forEach(b => {
                    b.style.pointerEvents = 'auto';
                    b.classList.remove('wrong');
                });
                questFeedbackPanel.classList.add('hidden');
            }, 2000);
        }
    }

    // --- LEVEL 3: DECRYPTOR GAME ---
    const targetSentenceBox = document.getElementById('target-sentence');
    const scrambledWordsBox = document.getElementById('scrambled-words');
    const resetDecryptBtn = document.getElementById('reset-decrypt-btn');

    function initDecryptGame() {
        decryptAnswer = [];
        targetSentenceBox.innerHTML = '<div class="placeholder-text">Нажимай на слова ниже...</div>';
        
        // Shuffle words
        const words = [...decryptWords].sort(() => Math.random() - 0.5);
        scrambledWordsBox.innerHTML = '';
        words.forEach((w, idx) => {
            const btn = document.createElement('button');
            btn.classList.add('word-pill');
            btn.innerText = w;
            btn.dataset.word = w;
            btn.dataset.index = idx;
            btn.addEventListener('click', () => clickDecryptWord(btn));
            scrambledWordsBox.appendChild(btn);
        });
    }

    function clickDecryptWord(btn) {
        playSound('click');
        btn.classList.add('used');

        if (decryptAnswer.length === 0) {
            targetSentenceBox.innerHTML = '';
        }

        const wordText = btn.dataset.word;
        decryptAnswer.push(wordText);

        const wordSpan = document.createElement('span');
        wordSpan.classList.add('selected-word');
        wordSpan.innerText = wordText;
        targetSentenceBox.appendChild(wordSpan);

        // Check if all words are selected
        if (decryptAnswer.length === decryptWords.length) {
            // Check order
            let isCorrect = true;
            for (let i = 0; i < decryptWords.length; i++) {
                if (decryptAnswer[i] !== decryptWords[i]) {
                    isCorrect = false;
                    break;
                }
            }

            if (isCorrect) {
                playSound('success');
                questFeedbackPanel.classList.remove('hidden', 'wrong-answer');
                feedbackIconBox.innerHTML = '<i data-lucide="check-circle" class="success-icon"></i>';
                feedbackTitle.innerText = "Фраза расшифрована!";
                feedbackDesc.innerText = "«Дина самая очаровательная красотка в этой галактике и точка!» — И это абсолютная истина!";
                lucide.createIcons();
                nextLevelBtn.classList.remove('hidden');
            } else {
                playSound('error');
                showDialog("Сбой шифрования!", "Слова собраны в неверном порядке. Собери фразу, чтобы она звучала логично и приятно!");
                setTimeout(() => {
                    initDecryptGame();
                }, 1500);
            }
        }
    }

    resetDecryptBtn.addEventListener('click', () => {
        playSound('click');
        initDecryptGame();
    });

    // --- LEVEL 4: LIE DETECTOR ---
    const scannerPad = document.getElementById('scanner-pad');
    const scannerStatus = document.getElementById('scanner-status');
    const detectorYesBtn = document.getElementById('detector-yes-btn');
    const detectorNoBtn = document.getElementById('detector-no-btn');

    function initLieDetector() {
        scannerStatus.innerText = "Удерживай палец на сканере (нажми и держи)";
        scannerPad.className = "fingerprint-btn";
        detectorYesBtn.disabled = true;
        detectorNoBtn.disabled = true;
        isScanning = false;
        
        // Setup Touch / Click events
        scannerPad.addEventListener('mousedown', startScanning);
        scannerPad.addEventListener('mouseup', stopScanning);
        scannerPad.addEventListener('mouseleave', stopScanning);
        
        scannerPad.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startScanning();
        });
        scannerPad.addEventListener('touchend', stopScanning);
        scannerPad.addEventListener('touchcancel', stopScanning);
    }

    function startScanning() {
        if (isScanning) return;
        isScanning = true;
        scannerPad.classList.add('scanning');
        scannerStatus.innerText = "Сканирование сетчатки пальца...";
        playSound('scan');

        scanTimeout = setTimeout(() => {
            scannerPad.classList.remove('scanning');
            scannerPad.classList.add('scanned');
            scannerStatus.innerText = "ЛИЧНОСТЬ ИДЕНТИФИЦИРОВАНА: ДИНА. Ответ разблокирован.";
            playSound('success');
            
            detectorYesBtn.disabled = false;
            detectorNoBtn.disabled = false;
            isScanning = false;
        }, 1500);
    }

    function stopScanning() {
        if (!isScanning) return;
        clearTimeout(scanTimeout);
        scannerPad.classList.remove('scanning');
        scannerStatus.innerText = "Сканирование прервано! Держите дольше.";
        playSound('error');
        isScanning = false;
    }

    detectorYesBtn.addEventListener('click', () => {
        playSound('success');
        questFeedbackPanel.classList.remove('hidden', 'wrong-answer');
        feedbackIconBox.innerHTML = '<i data-lucide="check-circle" class="success-icon"></i>';
        feedbackTitle.innerText = "ПРАВДА!";
        feedbackDesc.innerText = "Детектор лжи показывает 100% искренности! Поздравляем, миссия пройдена.";
        lucide.createIcons();
        nextLevelBtn.classList.remove('hidden');
    });

    detectorNoBtn.addEventListener('click', () => {
        playSound('error');
        showDialog("ОШИБКА ДЕТЕКТОРА!", "Кого ты пытаешься обмануть? Скромность — это хорошо, но сиять тебе предписано судьбой. Выбери правильный ответ!");
        
        detectorNoBtn.classList.add('shake-anim');
        setTimeout(() => detectorNoBtn.classList.remove('shake-anim'), 500);
    });

    // NEXT LEVEL BTN Action
    nextLevelBtn.addEventListener('click', () => {
        if (questLevel < 4) {
            startQuestLevel(questLevel + 1);
        } else {
            // Quest complete! Go to Contests Zone
            showScreen('screen-contests');
            initWheel();
            initTarotDeck();
        }
    });

    // -------------------------------------------------------------
    // 6. CONTESTS: WHEEL OF WISHES
    // -------------------------------------------------------------
    const canvas = document.getElementById('wheel-canvas');
    const ctx = canvas.getContext('2d');
    const spinBtn = document.getElementById('spin-btn');
    const wheelResultBox = document.getElementById('wheel-result');
    const wheelResultVal = document.getElementById('wheel-result-val');

    const wishesOptions = [
        "💅 Спа-день каждый понедельник",
        "✈️ VIP Поездка в Париж за покупками",
        "💸 Миллиард долларов на мелкие расходы",
        "🍕 Пицца без калорий всю жизнь",
        "😴 Сон до 15:00 без чувства вины",
        "🤵 Личный дворецкий, одобряющий шопинг",
        "👑 Статус Императрицы Вселенной",
        "🌟 Официальное право лениться"
    ];

    const colors = ["#ff2a85", "#120a24", "#ffb800", "#120a24", "#00d2ff", "#120a24", "#a266ff", "#120a24"];
    let wheelAngle = 0;
    let isSpinning = false;

    function initWheel() {
        drawWheel();
    }

    function drawWheel() {
        const size = canvas.width;
        const center = size / 2;
        const radius = center - 10;
        
        ctx.clearRect(0, 0, size, size);
        const arc = Math.PI * 2 / wishesOptions.length;

        for (let i = 0; i < wishesOptions.length; i++) {
            const angle = wheelAngle + i * arc;
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, angle, angle + arc, false);
            ctx.lineTo(center, center);
            ctx.fill();

            // Border segment
            ctx.strokeStyle = "rgba(255,255,255,0.1)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Text
            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.translate(center, center);
            ctx.rotate(angle + arc / 2);
            ctx.textAlign = "right";
            ctx.font = "bold 9px Montserrat";
            
            // Draw shortened text if needed
            let text = wishesOptions[i];
            ctx.fillText(text, radius - 15, 4);
            ctx.restore();
        }

        // Central cap
        ctx.beginPath();
        ctx.arc(center, center, 20, 0, Math.PI * 2, false);
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff2a85";
        ctx.fill();
    }

    spinBtn.addEventListener('click', () => {
        if (isSpinning) return;
        isSpinning = true;
        wheelResultBox.classList.add('hidden');
        playSound('click');

        const extraSpins = 4 + Math.random() * 3; // 4 to 7 full spins
        const spinDuration = 5000; // 5 seconds
        const start = performance.now();
        const initialAngle = wheelAngle;
        const targetAngle = initialAngle + extraSpins * Math.PI * 2;

        let lastTickAngle = initialAngle;

        function animateSpin(timestamp) {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / spinDuration, 1);
            
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            wheelAngle = initialAngle + (targetAngle - initialAngle) * easeOut;

            // Tick sound based on angle rotation
            if (wheelAngle - lastTickAngle > (Math.PI * 2 / wishesOptions.length)) {
                playSound('click');
                lastTickAngle = wheelAngle;
            }

            drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                isSpinning = false;
                // Calculate winning slice
                // The pointer is at the top (3 * Math.PI / 2, or 270 deg)
                const totalOptions = wishesOptions.length;
                const arc = Math.PI * 2 / totalOptions;
                
                // Normalize wheelAngle to [0, 2*PI]
                let currentAngle = wheelAngle % (Math.PI * 2);
                if (currentAngle < 0) {
                    currentAngle += Math.PI * 2;
                }
                
                // Calculate which option is under the pointer (at 270 degrees / 1.5 * PI)
                let winningAngle = (1.5 * Math.PI - currentAngle);
                if (winningAngle < 0) {
                    winningAngle += Math.PI * 2;
                }
                
                const winIndex = Math.floor(winningAngle / arc) % totalOptions;

                wheelResultVal.innerText = wishesOptions[winIndex];
                wheelResultBox.classList.remove('hidden');
                
                playSound('success');
                confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.8 }
                });
            }
        }

        requestAnimationFrame(animateSpin);
    });

    // -------------------------------------------------------------
    // 7. CONTESTS: TAROT DECK (TODAY'S TOTEM)
    // -------------------------------------------------------------
    const tarotDeck = document.getElementById('tarot-deck');
    const tarotResultBox = document.getElementById('tarot-result');
    let hasSelectedTarot = false;

    function initTarotDeck() {
        tarotDeck.innerHTML = '';
        tarotResultBox.classList.add('hidden');
        hasSelectedTarot = false;

        // Shuffle cards data
        const shuffled = [...tarotCardsData].sort(() => Math.random() - 0.5);

        shuffled.forEach((card, idx) => {
            const cardEl = document.createElement('div');
            cardEl.classList.add('tarot-card');
            cardEl.innerHTML = `
                <div class="tarot-inner">
                    <div class="tarot-back">
                        <i data-lucide="sparkles"></i>
                        <span class="card-number">Карта ${idx + 1}</span>
                    </div>
                    <div class="tarot-front">
                        <div class="tarot-img-box">
                            <img src="${card.img}" alt="${card.title}">
                            <div class="tarot-label-overlay">${card.title}</div>
                        </div>
                    </div>
                </div>
            `;
            
            cardEl.addEventListener('click', () => selectTarotCard(cardEl, card));
            tarotDeck.appendChild(cardEl);
        });

        lucide.createIcons();
    }

    function selectTarotCard(cardEl, cardData) {
        if (hasSelectedTarot) return;
        hasSelectedTarot = true;
        playSound('success');

        cardEl.classList.add('flipped');

        // Show description below
        setTimeout(() => {
            tarotResultBox.innerHTML = `
                <div class="tarot-result-title">🌟 Твой тотем сегодня: ${cardData.title} 🌟</div>
                <div class="tarot-result-text">${cardData.text}</div>
                <button class="btn btn-secondary btn-sm" id="reset-tarot-btn">
                    <i data-lucide="refresh-cw"></i> Выбрать другую карту
                </button>
            `;
            tarotResultBox.classList.remove('hidden');
            lucide.createIcons();
            
            document.getElementById('reset-tarot-btn').addEventListener('click', () => {
                playSound('click');
                initTarotDeck();
            });

            confetti({
                particleCount: 40,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 40,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }, 800);
    }

    // Go to Cinema btn
    document.getElementById('to-cinema-btn').addEventListener('click', () => {
        showScreen('screen-cinema');
        initCinema();
    });

    // -------------------------------------------------------------
    // 8. CINEMA HALL GALLERY
    // -------------------------------------------------------------
    const cinemaPlayer = document.getElementById('cinema-player');
    const cinemaPlaceholder = document.getElementById('cinema-placeholder');
    const movieCards = document.querySelectorAll('.movie-card');

    function initCinema() {
        cinemaPlayer.classList.remove('playing');
        cinemaPlayer.pause();
        cinemaPlaceholder.style.display = 'flex';
        movieCards.forEach(c => c.classList.remove('active'));
    }

    movieCards.forEach(card => {
        card.addEventListener('click', () => {
            const videoSrc = card.getAttribute('data-video-src');
            
            // Set active card
            movieCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Setup player
            cinemaPlaceholder.style.display = 'none';
            cinemaPlayer.classList.add('playing');
            cinemaPlayer.src = videoSrc;
            
            playSound('click');
            cinemaPlayer.load();
            
            // Auto play handling (might be blocked by browser autoplay policy if user hasn't interacted)
            cinemaPlayer.play().catch(e => {
                console.log("Autoplay blocked, waiting for user click play:", e);
            });
        });
    });

    // Go to Final screen btn
    document.getElementById('to-final-btn').addEventListener('click', () => {
        cinemaPlayer.pause();
        showScreen('screen-final');
    });

    // -------------------------------------------------------------
    // 9. FINAL SCREEN & DIPLOMA
    // -------------------------------------------------------------
    const wishesScreen = document.getElementById('wishes-screen');
    const genWishBtn = document.getElementById('gen-wish-btn');
    const restartAppBtn = document.getElementById('restart-app-btn');
    const printDiplomaBtn = document.getElementById('print-diploma-btn');

    genWishBtn.addEventListener('click', () => {
        playSound('click');
        const randomIndex = Math.floor(Math.random() * funnyCompliments.length);
        wishesScreen.innerHTML = `«${funnyCompliments[randomIndex]}»`;
        wishesScreen.style.borderLeftColor = '#ff2a85';
        
        confetti({
            particleCount: 15,
            spread: 40,
            origin: { y: 0.8 }
        });
    });

    printDiplomaBtn.addEventListener('click', () => {
        playSound('click');
        window.print();
    });

    restartAppBtn.addEventListener('click', () => {
        showScreen('screen-intro');
    });

    // Confetti Rain Functionality
    function triggerConfettiRain() {
        const duration = 4 * 1000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }
});
