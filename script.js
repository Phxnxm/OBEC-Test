const webAppUrl = "https://script.google.com/macros/s/AKfycbwatEvxPhIrvQfYU9k2Unls8NDsBGQhRE2dGAvq53VDbR8S9tCF-flazJN2TqzqIlPP/exec";
let appData = {};
let currentUserEmail = ""; 

window.onload = function() {
    fetchDataFromGoogleSheets();
};

function fetchDataFromGoogleSheets() {
    fetch(webAppUrl)
        .then(response => response.json())
        .then(rows => {
            rows.forEach(row => {
                if (!row.subject_id) return;
                const sid = row.subject_id.toString().trim();
                if (sid === "") return;

                if (!appData[sid]) {
                    appData[sid] = { title: "", guideline: "", questions: [] };
                }
                if (row.title) appData[sid].title = row.title;
                if (row.guideline) appData[sid].guideline = row.guideline;

                if (row.question && row.question.toString().trim() !== "") {
                    appData[sid].questions.push({
                        question: row.question,
                        options: [row.opt1, row.opt2, row.opt3, row.opt4],
                        answer: parseInt(row.answer) - 1
                    });
                }
            });
            document.getElementById('loading-screen').classList.remove('active');
            
            // เมื่อโหลดข้อมูลเสร็จ ให้ไปหน้ากรอกอีเมลเป็นหน้าแรกสุด
            switchScreen('user-info-screen');
        })
        .catch(err => {
            alert("ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบลิงก์ Web App");
            console.error(err);
        });
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

let currentMode = ""; 
let currentSubject = "";
let currentQuestionIndex = 0;
let score = 0;
let currentQuestions = [];
let userAnswers = [];
let timerInterval;
let timeRemaining = 0; 
let blurWarningCount = 0; 

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ยืนยันการเข้าสู่ระบบ
function confirmUserInfo() {
    const emailInput = document.getElementById('user-email-input').value.trim();
    if (emailInput === "" || !emailInput.includes('@')) {
        alert("กรุณากรอก Email ให้ถูกต้องเพื่อเข้าสู่ระบบครับ");
        return;
    }
    currentUserEmail = emailInput;
    
    // เมื่อกรอกเสร็จ ให้พาวิ่งไปหน้าเมนูหลัก
    switchScreen('main-menu-screen'); 
}

function showMainMenu() { 
    clearInterval(timerInterval); 
    switchScreen('main-menu-screen'); 
}

function selectMode(mode) {
    clearInterval(timerInterval); 
    currentMode = mode;
    const titleObj = document.getElementById('selection-title');
    if(mode === 'quiz') titleObj.innerText = "📝 เลือกวิชาเพื่อทำแบบทดสอบ";
    else if (mode === 'guideline') titleObj.innerText = "📖 เลือกวิชาเพื่อดูแนวข้อสอบและเฉลย";
    switchScreen('subject-selection-screen');
}

function handleSubjectClick(subjectKey) {
    currentSubject = subjectKey;
    if (!appData[subjectKey]) {
        alert("ยังไม่มีข้อมูลข้อสอบหรือเนื้อหาสำหรับวิชานี้");
        return;
    }
    
    // ข้ามไปทำข้อสอบหรือดูเนื้อหาได้เลย เพราะล็อกอินมาแล้ว
    if (currentMode === 'quiz') {
        startQuiz(currentSubject); 
    } else {
        showGuideline(subjectKey);
    }
}

function showGuideline(subjectKey) {
    const title = appData[subjectKey].title || "ไม่ระบุชื่อวิชา";
    const guidelineText = appData[subjectKey].guideline || "";
    
    document.getElementById('guideline-title').innerText = "แนวข้อสอบและเฉลย: " + title;
    
    const guidelineContainer = document.getElementById('guideline-text');
    guidelineContainer.innerHTML = ''; 

    if (guidelineText !== "") {
        const introDiv = document.createElement('div');
        introDiv.innerHTML = guidelineText + "<hr style='margin: 20px 0; border: 1px solid #e2e8f0;'>";
        guidelineContainer.appendChild(introDiv);
    }
    
    const rawQuestions = appData[subjectKey].questions || [];
    
    if (rawQuestions.length === 0) {
        guidelineContainer.innerHTML += "<p>ยังไม่มีข้อสอบในระบบสำหรับวิชานี้</p>";
    } else {
        rawQuestions.forEach((q, index) => {
            const qBlock = document.createElement('div');
            qBlock.style.marginBottom = "30px";
            
            const qText = document.createElement('div');
            qText.innerHTML = `<b>${index + 1}.) ${q.question}</b>`;
            qText.style.marginBottom = "12px";
            qText.style.fontSize = "18px";
            qBlock.appendChild(qText);
            
            const optContainer = document.createElement('div');
            optContainer.style.display = "flex";
            optContainer.style.flexDirection = "column";
            optContainer.style.gap = "8px";
            
            q.options.forEach((opt, optIndex) => {
                const optItem = document.createElement('div');
                optItem.style.display = "flex";
                optItem.style.alignItems = "flex-start";
                optItem.style.marginLeft = "15px";
                
                const radio = document.createElement('input');
                radio.type = "radio";
                radio.disabled = true; 
                radio.style.marginRight = "10px";
                radio.style.marginTop = "5px"; 
                
                const label = document.createElement('span');
                label.innerHTML = opt;
                label.style.lineHeight = "1.6";
                
                if (optIndex === q.answer) {
                    radio.checked = true;
                    label.style.color = "#2f855a";
                    label.style.fontWeight = "bold";
                    label.innerHTML += ' <span style="font-size: 14px;">(คำตอบ)</span>';
                }
                
                optItem.appendChild(radio);
                optItem.appendChild(label);
                optContainer.appendChild(optItem);
            });
            qBlock.appendChild(optContainer);
            guidelineContainer.appendChild(qBlock);
        });
    }
    switchScreen('guideline-screen');
}

function startTimer() {
    clearInterval(timerInterval); 
    timeRemaining = currentQuestions.length * 60; 
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert("หมดเวลาทำข้อสอบ! ระบบกำลังส่งคำตอบของคุณโดยอัตโนมัติ");
            calculateScoreAndShowResult();
        }
    }, 1000); 
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const seconds = (timeRemaining % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `🕒 ${minutes}:${seconds}`;
}

function confirmSubmit() {
    let unansweredCount = userAnswers.filter(ans => ans === null).length;
    
    if (unansweredCount > 0) {
        if (confirm(`⚠️ คุณยังมีข้อสอบที่ไม่ได้ตอบอีก ${unansweredCount} ข้อ\nต้องการส่งคำตอบเลยหรือไม่?`)) {
            clearInterval(timerInterval);
            calculateScoreAndShowResult();
        }
    } else {
        if (confirm("คุณต้องการส่งคำตอบและสิ้นสุดการสอบใช่หรือไม่?")) {
            clearInterval(timerInterval);
            calculateScoreAndShowResult();
        }
    }
}

function startQuiz(subjectKey) {
    blurWarningCount = 0; // รีเซ็ตการแจ้งเตือนสลับหน้าจอ

    const rawQuestions = appData[subjectKey].questions || [];
    if(rawQuestions.length === 0) {
        alert("วิชานี้ยังไม่มีคำถาม กรุณาเพิ่มใน Google Sheets");
        return;
    }

    let copiedQuestions = JSON.parse(JSON.stringify(rawQuestions));
    currentQuestions = shuffleArray(copiedQuestions); 
    currentQuestions = currentQuestions.slice(0, 20);

    currentQuestions.forEach(q => {
        let optionsObj = q.options.map((optText, idx) => ({
            text: optText,
            isCorrect: (idx === q.answer)
        }));
        
        optionsObj = shuffleArray(optionsObj);
        q.options = optionsObj.map(o => o.text);
        q.answer = optionsObj.findIndex(o => o.isCorrect);
    });
    
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);

    document.getElementById('subject-title').innerText = "ชุดข้อสอบ : " + (appData[subjectKey].title || "ไม่ระบุชื่อวิชา");
    document.getElementById('total-q-num').innerText = currentQuestions.length;
    
    switchScreen('quiz-screen');
    startTimer(); 
    loadQuestion();
}

function renderNavigator() {
    const navContainer = document.getElementById('question-navigator');
    navContainer.innerHTML = '';
    
    currentQuestions.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.innerText = index + 1;
        btn.classList.add('nav-btn');
        
        if (userAnswers[index] !== null) {
            btn.classList.add('answered');
        }
        
        if (index === currentQuestionIndex) {
            btn.classList.add('active');
        }
        
        btn.onclick = () => {
            currentQuestionIndex = index;
            loadQuestion();
        };
        
        navContainer.appendChild(btn);
    });
}

function loadQuestion() {
    renderNavigator(); 

    const qData = currentQuestions[currentQuestionIndex];
    document.getElementById('current-q-num').innerText = currentQuestionIndex + 1;
    document.getElementById('question-text').innerText = qData.question;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 

    let currentSelectedOption = userAnswers[currentQuestionIndex] !== undefined ? userAnswers[currentQuestionIndex] : null;

    qData.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.innerHTML = option; 
        button.classList.add('option-btn');
        
        if (currentSelectedOption === index) {
            button.style.backgroundColor = "#bee3f8";
            button.style.borderColor = "#3182ce";
        }

        button.onclick = () => {
            const allBtns = optionsContainer.querySelectorAll('.option-btn');
            allBtns.forEach(btn => {
                btn.style.backgroundColor = "white";
                btn.style.borderColor = "#cbd5e0";
            });
            
            button.style.backgroundColor = "#bee3f8";
            button.style.borderColor = "#3182ce";
            
            currentSelectedOption = index;
            userAnswers[currentQuestionIndex] = index;
            renderNavigator(); 
        };
        optionsContainer.appendChild(button);
    });

    const btnGroup = document.createElement('div');
    btnGroup.style.display = "flex";
    btnGroup.style.gap = "10px";
    btnGroup.style.marginTop = "20px";

    if (currentQuestionIndex > 0) {
        const backBtn = document.createElement('button');
        backBtn.innerText = "⬅️ ย้อนกลับ";
        backBtn.classList.add('btn-secondary');
        backBtn.style.flex = "1"; 
        backBtn.onclick = () => {
            currentQuestionIndex--; 
            loadQuestion();
        };
        btnGroup.appendChild(backBtn);
    }

    if (currentQuestionIndex < currentQuestions.length - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.innerText = "ถัดไป ➡️";
        nextBtn.classList.add('btn-primary');
        nextBtn.style.flex = "1";
        nextBtn.style.margin = "0"; 
        nextBtn.onclick = () => {
            currentQuestionIndex++;
            loadQuestion();
        };
        btnGroup.appendChild(nextBtn);
    }

    optionsContainer.appendChild(btnGroup);
}

function calculateScoreAndShowResult() {
    clearInterval(timerInterval); 
    score = 0;
    for (let i = 0; i < currentQuestions.length; i++) {
        if (userAnswers[i] === currentQuestions[i].answer) {
            score++;
        }
    }
    
    // ส่งข้อมูลคะแนนและ Email กลับไปยัง Google Sheets
    saveScoreToSheets(currentUserEmail, appData[currentSubject].title, score, currentQuestions.length);

    showResult();
}

function saveScoreToSheets(email, subjectName, score, total) {
    const payload = {
        email: email,
        subject: subjectName,
        score: score,
        total: total
    };

    fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        console.log("บันทึกคะแนนลง Sheets สำเร็จ");
    }).catch(err => {
        console.error("เกิดข้อผิดพลาดในการบันทึกคะแนน: ", err);
    });
}

function showResult() {
    document.getElementById('score-text').innerText = `${score} / ${currentQuestions.length}`;
    
    const percentage = (score / currentQuestions.length) * 100;
    const feedback = document.getElementById('feedback-text');
    
    if (percentage >= 60) {
        feedback.innerHTML = "🎉 <b>ยอดเยี่ยมมาก!</b> คุณผ่านเกณฑ์";
        feedback.style.color = "#2f855a";
    } else {
        feedback.innerHTML = "💪 <b>พยายามอีกนิดนะ!</b> ลองทบทวนข้อที่ผิดดูใหม่นะ";
        feedback.style.color = "#c53030";
    }
    
    switchScreen('result-screen');
}

function showReview() {
    const reviewContainer = document.getElementById('review-text');
    reviewContainer.innerHTML = ''; 
    
    currentQuestions.forEach((q, index) => {
        const qBlock = document.createElement('div');
        qBlock.style.marginBottom = "30px";
        qBlock.style.borderBottom = "1px dashed #cbd5e0";
        qBlock.style.paddingBottom = "20px";
        
        let isCorrect = (userAnswers[index] === q.answer);
        let icon = isCorrect ? "✅ ตอบถูก" : "❌ ตอบผิด";
        let iconColor = isCorrect ? "#2f855a" : "#c53030";

        const qText = document.createElement('div');
        qText.innerHTML = `<b>ข้อ ${index + 1}.) ${q.question}</b> <br><span style="color:${iconColor}; font-size:15px; margin-top:5px; display:inline-block;">${icon}</span>`;
        qText.style.marginBottom = "15px";
        qText.style.fontSize = "18px";
        qBlock.appendChild(qText);
        
        const optContainer = document.createElement('div');
        optContainer.style.display = "flex";
        optContainer.style.flexDirection = "column";
        optContainer.style.gap = "8px";
        
        q.options.forEach((opt, optIndex) => {
            const optItem = document.createElement('div');
            optItem.style.display = "flex";
            optItem.style.alignItems = "flex-start";
            optItem.style.marginLeft = "15px";
            
            const radio = document.createElement('input');
            radio.type = "radio";
            radio.disabled = true; 
            radio.style.marginRight = "10px";
            radio.style.marginTop = "5px"; 
            
            const label = document.createElement('span');
            label.innerHTML = opt;
            label.style.lineHeight = "1.6";
            
            if (optIndex === q.answer) {
                label.classList.add('review-correct');
                label.innerHTML += ' <span style="font-size: 13px;">(ข้อที่ถูก)</span>';
            }
            
            if (userAnswers[index] === optIndex) {
                radio.checked = true;
                if (optIndex !== q.answer) {
                    label.classList.add('review-wrong');
                    label.innerHTML += ' <span style="font-size: 13px; color: #c53030;">(คำตอบของคุณ)</span>';
                }
            }
            
            optItem.appendChild(radio);
            optItem.appendChild(label);
            optContainer.appendChild(optItem);
        });
        
        qBlock.appendChild(optContainer);
        reviewContainer.appendChild(qBlock);
    });
    
    switchScreen('review-screen');
}

// ========================================================
// ฟีเจอร์ Anti-Cheat (ป้องกันการทุจริต)
// ========================================================

document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('copy', event => {
    event.preventDefault();
    alert('⚠️ ไม่อนุญาตให้คัดลอกข้อความในระบบสอบครับ');
});

window.addEventListener('blur', () => {
    if (currentMode === 'quiz' && document.getElementById('quiz-screen').classList.contains('active')) {
        blurWarningCount++;
        alert(`🚨 คำเตือนครั้งที่ ${blurWarningCount}: ห้ามสลับหน้าจอหรือเปิดแท็บอื่นระหว่างทำข้อสอบ!`);
    }
});