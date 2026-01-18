// Переменные состояния
let currentQuestions = []; 
let currentIdx = 0;
let score = 0;
let timeLeft = 40 * 60; 
let timerInterval = null;
let isExamMode = false;
let isShowingAnswer = false; 

// Загрузка данных из LocalStorage
let stats = JSON.parse(localStorage.getItem('quiz_stats')) || { solved: 0, correct: 0, wrong: 0 };
let favorites = JSON.parse(localStorage.getItem('my_fav_questions')) || [];

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Нормализация текста
 */
const normalize = (str) => str.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Случайное перемешивание массива (алгоритм Фишера-Йейтса)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * РЕЖИМ: МАРАФОН
 */
function startMarathon() {
    isExamMode = false;
    isShowingAnswer = false;
    // Теперь марафон тоже перемешивает вопросы при старте
    currentQuestions = shuffleArray([...questionsData]); 
    currentIdx = 0;
    score = 0;
    
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    document.getElementById('timer').style.display = 'none'; 
    
    renderQuestion();
}

/**
 * РЕЖИМ: ЭКЗАМЕН
 */
function startExam() {
    isExamMode = true;
    isShowingAnswer = false;
    // Берем 32 случайных вопроса
    currentQuestions = shuffleArray([...questionsData]).slice(0, 32);
    
    currentIdx = 0;
    score = 0;
    timeLeft = 40 * 60;

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    document.getElementById('timer').style.display = 'inline-block';

    startTimer();
    renderQuestion();
}

/**
 * Отрисовка вопроса
 */
function renderQuestion() {
    isShowingAnswer = false;
    const q = currentQuestions[currentIdx];
    const isMultiple = q.correctAnswers.length > 1;
    
    document.getElementById('next-btn').innerText = "Ответить и далее →";
    document.getElementById('q-counter').innerText = `Вопрос ${currentIdx + 1} из ${currentQuestions.length}`;
    document.getElementById('question').innerText = q.question;
    document.getElementById('progress-line').style.width = `${(currentIdx / currentQuestions.length) * 100}%`;
    document.getElementById('feedback').innerHTML = "";

    const oArea = document.getElementById('options');
    oArea.innerHTML = "";
    
    // ПЕРЕМЕШИВАЕМ ВАРИАНТЫ ОТВЕТОВ
    const shuffledOptions = shuffleArray([...q.options]);
    
    const inputType = isMultiple ? 'checkbox' : 'radio';
    
    shuffledOptions.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'opt-label';
        label.innerHTML = `
            <input type="${inputType}" name="quiz-opt" value="${opt.replace(/"/g, '&quot;')}">
            <span>${opt}</span>
        `;
        oArea.appendChild(label);
    });
}

/**
 * Логика ответа
 */
function handleNext() {
    if (!isExamMode && isShowingAnswer) {
        currentIdx++;
        if (currentIdx < currentQuestions.length) {
            renderQuestion();
        } else {
            finishSession();
        }
        return;
    }

    const inputs = document.querySelectorAll('input[name="quiz-opt"]');
    const selected = Array.from(inputs).filter(i => i.checked).map(i => i.value);
    
    if (selected.length === 0) return alert("Выберите ответ!");

    const q = currentQuestions[currentIdx];

    const normCorrect = q.correctAnswers.map(normalize);
    const normSelected = selected.map(normalize);

    const isCorrect = normCorrect.length === normSelected.length && 
                      normCorrect.every(val => normSelected.includes(val));

    if (!isExamMode) {
        const labels = document.querySelectorAll('.opt-label');
        labels.forEach(label => {
            const val = normalize(label.querySelector('input').value);
            const isItRight = normCorrect.includes(val);
            const isItSelected = normSelected.includes(val);

            label.querySelector('input').disabled = true;

            if (isItRight) {
                label.classList.add('correct-ans');
            }
            if (isItSelected && !isItRight) {
                label.classList.add('wrong-ans');
            }
        });

        isShowingAnswer = true;
        document.getElementById('next-btn').innerText = "Следующий вопрос →";
        document.getElementById('feedback').innerHTML = isCorrect ? 
            "<span style='color: var(--success)'>✅ Правильно!</span>" : 
            "<span style='color: var(--danger)'>❌ Ошибка! Правильные ответы подсвечены.</span>";
    }

    if (isCorrect) {
        score++;
        stats.correct++;
    } else {
        stats.wrong++;
        if (!favorites.some(fav => fav.question === q.question)) {
            favorites.push(q);
            saveFavorites();
        }
    }
    stats.solved++;
    saveStats();

    if (isExamMode) {
        currentIdx++;
        if (currentIdx < currentQuestions.length) {
            renderQuestion();
        } else {
            finishSession();
        }
    }
}

function finishSession() {
    clearInterval(timerInterval);
    const container = document.getElementById('quiz-container');
    let passText = isExamMode ? (score >= 26 ? "🎉 Сдано!" : "❌ Не сдано (нужно 26/32)") : "";

    container.innerHTML = `
        <div class="result-screen" style="text-align: center; padding: 20px;">
            <h2>Завершено!</h2>
            <div style="font-size: 3rem; font-weight: bold; margin: 20px 0;">${score} / ${currentQuestions.length}</div>
            <p>${passText}</p>
            <button class="btn-check" onclick="location.reload()" style="width: 100%;">В меню</button>
        </div>
    `;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        const t = document.getElementById('timer');
        if (t) t.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) finishSession();
    }, 1000);
}

function saveStats() { localStorage.setItem('quiz_stats', JSON.stringify(stats)); }
function saveFavorites() { localStorage.setItem('my_fav_questions', JSON.stringify(favorites)); }

function showFavorites() {
    const list = document.getElementById('fav-list');
    list.innerHTML = favorites.length === 0 ? "Ошибок пока нет." : "";
    favorites.forEach((q, idx) => {
        const div = document.createElement('div');
        div.className = 'fav-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>${idx + 1}. ${q.question}</strong>
                <button onclick="removeFromFav(${idx})" style="color:red; background:none; border:none; cursor:pointer;">✕</button>
            </div>
            <p style="color:green; font-size:0.8em;">Правильно: ${q.correctAnswers.join('; ')}</p>
        `;
        list.appendChild(div);
    });
    document.getElementById('fav-modal').style.display = 'block';
}

function removeFromFav(idx) {
    favorites.splice(idx, 1);
    saveFavorites();
    showFavorites();
}

function closeFavorites() { document.getElementById('fav-modal').style.display = 'none'; }
function clearFavorites() { if(confirm("Очистить?")) { favorites = []; saveFavorites(); showFavorites(); } }

function resetStats() {
    if(confirm("Сбросить статистику?")) {
        localStorage.removeItem('quiz_stats');
        location.reload();
    }
}