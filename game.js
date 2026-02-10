// ELEMENTLAR
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const playerNameInput = document.getElementById("playerName");

const gameScreen = document.getElementById("gameScreen");
const stageDisplay = document.getElementById("stageDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const timerDisplay = document.getElementById("timerDisplay");
const questionText = document.getElementById("questionText");
const answersContainer = document.getElementById("answersContainer");

const winScreen = document.getElementById("winScreen");
const restartBtn = document.getElementById("restartBtn");

// ===================== BACKGROUND MUSIC =====================
// use bundled sound file from assets (was pointing to missing file)
const bgMusic = new Audio("assets/sounds/bg-music.mp3");
bgMusic.preload = 'auto';
bgMusic.loop = true;
bgMusic.volume = 0.15;
bgMusic.addEventListener('error', (e)=>{
  console.warn('bgMusic failed to load or play', e);
});

let soundEnabled = true;

// AUDIO FUNCTION (safe play + match bg volume)
function playSound(src){
  if(!soundEnabled) return;
  const s = new Audio(src);
  s.volume = Math.max(0, Math.min(1, bgMusic.volume));
  s.play().catch(()=>{});
}

// ================= GAME STATE ==================
let playerName="";
let stage=1;
let lives=3;
let timer=40;
let timerInterval;
let currentQuestionIndex=0;
let stageStartTime=0;
let correctAnswersCount=0;

// ================= LEADERBOARD FUNCTIONS ==================
function loadLeaderboard(){
  const data = localStorage.getItem("ekoGameLeaderboard");
  return data ? JSON.parse(data) : [];
}

function saveLeaderboard(leaderboard){
  localStorage.setItem("ekoGameLeaderboard", JSON.stringify(leaderboard.slice(0, 10)));
}

function getMedal(correctAnswers){
  if(correctAnswers >= 8) return "🥇";
  if(correctAnswers >= 5) return "🥈";
  if(correctAnswers >= 3) return "🥉";
  return "⭐";
}

function addToLeaderboard(playerName, correctAnswers, timeSpent){
  let leaderboard = loadLeaderboard();
  const medal = getMedal(correctAnswers);
  
  const entry = {
    name: playerName,
    actions: correctAnswers,
    time: timeSpent,
    medal: medal,
    stage: stage,
    timestamp: new Date().getTime()
  };
  
  leaderboard.push(entry);
  leaderboard.sort((a, b) => {
    if(b.actions !== a.actions) return b.actions - a.actions;
    return a.time - b.time;
  });
  
  saveLeaderboard(leaderboard);
  updateLeaderboardUI();
}

function updateLeaderboardUI(){
  const leaderboard = loadLeaderboard();
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = "";
  
  leaderboard.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.name}</td>
      <td>${entry.actions}</td>
      <td>${entry.time}s</td>
      <td>${entry.medal}</td>
    `;
    tbody.appendChild(row);
  });
}

// ================= ANIMATION FUNCTIONS ==================
function showCorrectAnimation(){
  const overlay = document.getElementById("animationOverlay");
  const content = document.getElementById("animationContent");
  
  overlay.style.display = "flex";
  content.innerHTML = `
    <div class="success-card">
      <div class="icon-wrap">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" fill="rgba(16,185,129,0.95)" />
          <path class="check-path" d="M18 34 L28 44 L46 22" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="msg">To'g'ri javob!</div>
      <div class="confetti"></div>
    </div>
  `;

  // create confetti pieces
  const confetti = content.querySelector('.confetti');
  const colors = ['#10b981','#059669','#34d399','#60a5fa','#f97316','#f43f5e'];
  for(let i=0;i<28;i++){
    const piece = document.createElement('div');
    piece.className='confetti-piece';
    piece.style.left = (10 + Math.random()*80) + '%';
    piece.style.top = (-20 - Math.random()*10) + 'vh';
    piece.style.background = colors[Math.floor(Math.random()*colors.length)];
    piece.style.animationDelay = (Math.random()*0.25) + 's';
    piece.style.transform = `rotate(${Math.random()*360}deg)`;
    piece.style.width = (6 + Math.random()*10) + 'px';
    piece.style.height = (10 + Math.random()*18) + 'px';
    confetti.appendChild(piece);
  }

  // show subtle pulse on question box
  const questionBox = document.querySelector('.question-box');
  if(questionBox){
    questionBox.classList.add('correct-animations');
    setTimeout(()=>questionBox.classList.remove('correct-animations'),700);
  }

  setTimeout(()=>{
    overlay.style.display='none';
    content.innerHTML='';
  }, 1600);
}

function showWrongAnimation(){
  const overlay = document.getElementById('animationOverlay');
  const content = document.getElementById('animationContent');
  
  overlay.style.display = 'flex';
  content.innerHTML = `
    <div class="fail-card">
      <div class="icon-wrap">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" fill="rgba(239,68,68,0.95)" />
          <g stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
            <path class="cross-path" d="M22 22 L42 42" />
            <path class="cross-path" d="M42 22 L22 42" />
          </g>
        </svg>
      </div>
      <div class="msg">Xato javob</div>
    </div>
  `;

  // shake question box
  const questionBox = document.querySelector('.question-box');
  if(questionBox){
    questionBox.classList.add('wrong-animations');
    setTimeout(()=>questionBox.classList.remove('wrong-animations'),700);
  }

  setTimeout(()=>{ overlay.style.display='none'; content.innerHTML=''; }, 1200);
}

// ================= STAGES 2 BOSQICH ==================
// Har bosqich 10 savol, har savol 8 variant, 1 to‘g‘ri
const stages = [
  [ // 1-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 2-bosqich
    {q:"EkoLifeGroup Axilmi?", options:["Ha albatta","Judayam","Ular jamoasini yaxshi ko'radi","Yaxshi emas","Bilmadim","Axil emas","Judayam hayajonlanadi","Ha zo'r jamoa"], correct:3},
    {q:"Qaysi daraxt kislorod ishlab chiqaradi?", options:["Eucalyptus","Olma","Anor","Archa","Mango","Qovun","Lim","Bodring"], correct:0},
    {q:"Qaysi hayvon suv muhitini toza saqlaydi?", options:["Baliq","It","Sigir","Tovuq","Tulkin","Mushuk","Qarg‘a","Siyoh"], correct:0},
    {q:"Qaysi chiqindi qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi transport ekologik?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi faoliyat ekologik toza?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0},
    {q:"O‘rmon nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi materialni ajratib tashlash kerak?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:0},
    {q:"Qaysi energiya ekologik?", options:["Shamol","Uglovodorod","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:0}
  ],
  [ // 3-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 4-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 5-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 6-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 7-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 8-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 9-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 10-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 11-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 12-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 13-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 14-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 15-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 16-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 17-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 18-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 19-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 20-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 21-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 22-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 23-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 24-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 25-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 26-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 27-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 28-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 29-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 30-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 31-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 32-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 33-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 34-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 35-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 36-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 37-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 38-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 39-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 40-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 41-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 42-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 43-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 44-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 45-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 46-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 47-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 48-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 49-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 50-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 51-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 52-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 53-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 54-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 55-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 56-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 57-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 58-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 59-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 60-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 61-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 62-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 63-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 64-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 65-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 66-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 67-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 68-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 69-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 70-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 71-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 72-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 73-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 74-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 75-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 76-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 77-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 78-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 79-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 80-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 81-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 82-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 83-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 84-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 85-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 86-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 87-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 88-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 89-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 90-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 91-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 92-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 93-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 94-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 95-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 96-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 97-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 98-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 99-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ],
  [ // 100-bosqich
    {q:"Qaysi daraxt ko‘p kislorod ishlab chiqaradi?", options:["Olma","Eucalyptus","Mango","Archa","Qovun","Anor","Lim","Bodring"], correct:1},
    {q:"Qaysi harakat ekologik muhitni ifloslantirmaydi?", options:["Plastik tashlash","Avto ishlatish","Tashqarida chiqindi qoldirish","Chiqindilarni ajratish","Yonilg‘i ishlatish","Kimyoviy chiqindi","Parchalash","Gaz chiqarish"], correct:3},
    {q:"Qaysi hayvon suvni ifloslantirmaydi?", options:["Baliq","Siyoh","Tulkin","Sigir","It","Mushuk","Qarg‘a","Tovuq"], correct:0},
    {q:"Qaysi energiya turi ekologik toza?", options:["Uglovodorod","Shamol","Gaz","Yoqilg‘i","Neon","Atom","Kokis","Katalizator"], correct:1},
    {q:"Qaysi material qayta ishlanishi mumkin?", options:["Plastik","Shisha","Temir","Barchasi","Gaz","Yog'","Kimyoviy","Qog'oz"], correct:3},
    {q:"Qaysi vosita ekologik toza?", options:["Elektr mashina","Benzin mashina","Avtobus","Motosikl","Traktor","Samolyot","Velosiped","Trek"], correct:0},
    {q:"Qaysi chiqindini qadoqlash kerak?", options:["Plastik","Tuproq","Suv","Shisha","Shamol","Daraxt","Metall","Gaz"], correct:0},
    {q:"O‘rmonlar nimani ta’minlaydi?", options:["Kislorod","Vodorod","Gaz","Yo‘q","Ozon","Yonilg‘i","Kimyo","Karbondioksid"], correct:0},
    {q:"Qaysi hayvonlar suvni toza saqlashga yordam beradi?", options:["Baliq","Tulkin","Sigir","Qarg‘a","It","Mushuk","Tovuq","Siyoh"], correct:0},
    {q:"Qaysi faoliyat ekologiyani yaxshilaydi?", options:["Chiqindilarni ajratish","Yonilg‘i ishlatish","Avto ishlatish","Tashqarida chiqindi","Gaz chiqarish","Plastik tashlash","Kimyoviy ishlatish","Barchasi"], correct:0}
  ]
];

// ================= START GAME =================
startBtn.addEventListener("click", ()=>{
  if (soundEnabled) {
    bgMusic.play().catch(()=>{});
  }
  
  const name = playerNameInput.value.trim();
  if(!name){ alert("Iltimos, ismingizni kiriting!"); return;}

  playerName = name;
  correctAnswersCount = 0;
  stage = 1;
  lives = 3;
  currentQuestionIndex = 0;
  stageStartTime = Date.now();
  
  startScreen.style.display="none";
  gameScreen.style.display="block";
  startStage(0);
});

// ================= STAGE FUNCTIONS =================
function startStage(stageIndex){
  stage = stageIndex + 1;
  currentQuestionIndex = 0;
  lives = 3;
  // reset per-stage tracking
  stageStartTime = Date.now();
  correctAnswersCount = 0;
  updateTopBar();
  showQuestion();
}

function updateTopBar(){
  stageDisplay.textContent = `${stage}-chi Bosqich`;
  livesDisplay.textContent = "❤️".repeat(lives);
  timerDisplay.textContent = timer + "s";
}

function showQuestion(){
  clearInterval(timerInterval);
  if(currentQuestionIndex >= stages[stage-1].length){
    if(stage < stages.length){
      startStage(stage); return;
    } else { endGame(); return; }
  }
  const q = stages[stage-1][currentQuestionIndex];
  questionText.textContent = q.q;
  answersContainer.innerHTML = "";
  q.options.forEach((opt,i)=>{
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", ()=>checkAnswer(i));
    answersContainer.appendChild(btn);
  });

  timer = 40;
  timerDisplay.textContent = timer + "s";
  timerInterval = setInterval(()=>{
    timer--;
    timerDisplay.textContent = timer + "s";
    if(timer<=0){ clearInterval(timerInterval); wrongAnswer(); }
  },1000);
}

function checkAnswer(i){
  clearInterval(timerInterval);
  const q = stages[stage-1][currentQuestionIndex];
  if(i===q.correct){
    playSound("assets/sounds/correct.mp3");
    showCorrectAnimation();
    correctAnswersCount++;
    currentQuestionIndex++;
    
    // Check if stage is complete
    if(currentQuestionIndex >= stages[stage-1].length){
      const timeSpent = Math.round((Date.now() - stageStartTime) / 1000);
      addToLeaderboard(playerName, correctAnswersCount, timeSpent);
    }
    
    setTimeout(() => {
      showQuestion();
    }, 900);
  } else { wrongAnswer(); }
}

function wrongAnswer(){
  playSound("assets/sounds/wrong.mp3");
  showWrongAnimation();
  lives--;
  if(lives>0){
    updateTopBar();
    currentQuestionIndex++;
    // if stage finished after this wrong answer, save to leaderboard
    if(currentQuestionIndex >= stages[stage-1].length){
      const timeSpent = Math.round((Date.now() - stageStartTime) / 1000);
      addToLeaderboard(playerName, correctAnswersCount, timeSpent);
    }
    setTimeout(() => {
      showQuestion();
    }, 900);
  } else {
    alert("Jonlaringiz tugadi! Memorize mini-game orqali 1 jon yutib olishingiz mumkin!");
    startMemorizeMiniGame();
  }
}

// ================= MEMORIZE MINI GAME =================
function startMemorizeMiniGame(){
  gameScreen.style.display="none";
  const miniGameContainer = document.createElement("div");
  miniGameContainer.id="miniGameContainer";
  miniGameContainer.style.cssText="position:fixed; inset:0; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:100; flex-direction:column;";
  miniGameContainer.innerHTML=`
    <h2 style="color:white;">🧠 Memorize Game</h2>
    <div id="miniBoard" style="display:grid; grid-template-columns:repeat(4,70px); grid-gap:10px;"></div>
    <p style="color:white;">3 ta pairni toping</p>
  `;
  document.body.appendChild(miniGameContainer);

  const miniBoard = document.getElementById("miniBoard");
  const icons=["🍎","🍎","👓","👓","🍇","🍇","🎨","🎨"];
  const cardsArr=[...icons]; cardsArr.sort(()=>Math.random()-0.5);

  let firstCard=null, secondCard=null, matchedPairs=0, lock=false;

  cardsArr.forEach(icon=>{
    const card = document.createElement("div");
    card.style.cssText="width:70px;height:70px;background:#38bdf8;display:flex;align-items:center;justify-content:center;font-size:32px;cursor:pointer;border-radius:8px;";
    card.dataset.icon=icon; card.textContent="?";
    card.addEventListener("click", ()=>{
      if(lock || card===firstCard) return;
      card.textContent=icon;
      if(!firstCard){ firstCard=card; return;}
      secondCard=card; lock=true;
      setTimeout(()=>{
        if(firstCard.dataset.icon===secondCard.dataset.icon){
          matchedPairs++; firstCard.style.visibility="hidden"; secondCard.style.visibility="hidden";
          if(matchedPairs>=3){
            alert("🎉 Mini game yutdingiz! 1 jon qo‘shildi.");
            lives=1;
            document.body.removeChild(miniGameContainer);
            gameScreen.style.display="block";
            updateTopBar();
            showQuestion();
          }
        } else { firstCard.textContent="?"; secondCard.textContent="?"; }
        firstCard=null; secondCard=null; lock=false;
      },600);
    });
    miniBoard.appendChild(card);
  });
}

// ================= END GAME =================
function endGame(){
  bgMusic.pause();
  bgMusic.currentTime = 0;
  
  // Final leaderboard saqlash
  const timeSpent = Math.round((Date.now() - stageStartTime) / 1000);
  addToLeaderboard(playerName, correctAnswersCount, timeSpent);

  gameScreen.style.display="none";
  winScreen.style.display="block";
}

restartBtn.addEventListener("click", ()=>{
  winScreen.style.display="none";
  startScreen.style.display="block";
});

// ================= BACK BUTTON ==================
const backBtn = document.getElementById("backBtn");

backBtn.addEventListener("click", ()=>{
  // Stop timer and clear game state
  clearInterval(timerInterval);
  
  // Hide game screen, show start screen
  gameScreen.style.display="none";
  startScreen.style.display="block";
  
  // Keep leaderboard data (data remains in localStorage)
  updateLeaderboardUI();
});

const soundToggle = document.getElementById("soundToggle");
const volumeSlider = document.getElementById("volumeSlider");

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    bgMusic.play().catch(()=>{});
    soundToggle.textContent = "🔊";
  } else {
    bgMusic.pause();
    soundToggle.textContent = "🔇";
  }
});

volumeSlider.addEventListener("input", (e) => {
  bgMusic.volume = e.target.value / 100;
});

// initialize UI to reflect current bgMusic state
volumeSlider.value = Math.round(bgMusic.volume * 100);
soundToggle.textContent = soundEnabled ? "🔊" : "🔇";

// make toggle play only when needed
soundToggle.addEventListener('dblclick', ()=>{
  // hidden shortcut: stop and reset
  bgMusic.pause(); bgMusic.currentTime = 0;

// ================= PARTNERSHIP BUTTON ==================
const partnershipBtn = document.getElementById("partnershipBtn");
const partnershipContent = document.querySelector(".partnership-content");

partnershipBtn.addEventListener("click", () => {
  partnershipContent.classList.toggle("active");
});

// Close partner info when clicking outside
document.addEventListener("click", (e) => {
  if(!partnershipBtn.contains(e.target) && !partnershipContent.contains(e.target)){
    partnershipContent.classList.remove("active");
  }
});

// Leaderboard-ga sarlavha qo'shish va avval 10ta natijalarni ko'rsatish
window.addEventListener("load", () => {
  updateLeaderboardUI();
});
});


