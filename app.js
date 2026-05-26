let deferredPrompt; 

const App = {
    state: {
        stats: { total: 0, correct: 0, timeSec: 0, streak: 0, lastLogin: null },
        domains: {},
        session: null,
        timer: null
    },

    init() {
        this.loadData();
        this.checkStreak();
        this.populateDomains();
        this.renderDashboard();
        this.setupAutoPause();
        this.setupPWA();
        this.checkApiStatus();
    },

    // --- PWA WIDGET INSTALL ---
    setupPWA() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const btn = document.getElementById('btn-install');
            btn.classList.remove('hidden');
            btn.addEventListener('click', async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') btn.classList.add('hidden');
                deferredPrompt = null;
            });
        });
    },

    // --- ENCRYPTED API MANAGEMENT ---
    saveApiKey() {
        const key = document.getElementById("api-key-input").value.trim();
        if(key) {
            // Encode Base64 to prevent raw text sniffing in browser dev tools
            localStorage.setItem("cma_gemini_node", btoa(key)); 
            document.getElementById("api-save-msg").classList.remove("hidden");
            this.checkApiStatus();
            setTimeout(() => document.getElementById("api-save-msg").classList.add("hidden"), 3000);
        }
    },

    checkApiStatus() {
        const hasKey = localStorage.getItem("cma_gemini_node");
        const status = document.getElementById("api-status");
        if(hasKey) {
            status.innerText = "🟢 Node Active";
            status.className = "text-[9px] text-emerald-400 font-bold uppercase tracking-wider";
            document.getElementById("api-key-input").placeholder = "•••••••••••••••••••••••••";
        }
    },

    // --- DATA & FACTORY RESET ---
    loadData() {
        const stored = localStorage.getItem("cma_quantum_v3");
        if (stored) this.state = JSON.parse(stored);
        Object.keys(QUESTION_BANK).forEach(d => {
            if (!this.state.domains[d]) this.state.domains[d] = { answered: 0, correct: 0, timeSec: 0 };
        });
    },

    saveData() { localStorage.setItem("cma_quantum_v3", JSON.stringify(this.state)); },

    factoryReset() {
        if (confirm("🚨 DOUBLE CHECK: Are you sure you want to flush all stats? This wipes your streak and accuracy data. Type 'OK' to proceed.")) {
            localStorage.removeItem("cma_quantum_v3");
            location.reload();
        }
    },

    checkStreak() {
        const today = new Date().toDateString();
        if (this.state.stats.lastLogin !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (this.state.stats.lastLogin !== yesterday.toDateString()) this.state.stats.streak = 0;
        }
        document.getElementById("streak-counter").innerText = this.state.stats.streak;
    },

    // --- DASHBOARD UI ---
    populateDomains() {
        const select = document.getElementById("manual-domain");
        select.innerHTML = "";
        Object.keys(QUESTION_BANK).forEach(d => select.innerHTML += `<option value="${d}">${d.split(":")[0]} (${QUESTION_BANK[d].length} Qs)</option>`);
    },

    renderDashboard() {
        const s = this.state.stats;
        document.getElementById("stat-total").innerText = s.total;
        document.getElementById("stat-accuracy").innerText = s.total > 0 ? `${Math.round((s.correct / s.total) * 100)}%` : "0%";
        document.getElementById("stat-time").innerText = s.total > 0 ? `${Math.round(s.timeSec / s.total)}s` : "0s";

        const matrix = document.getElementById("domain-matrix");
        matrix.innerHTML = "";
        
        Object.keys(this.state.domains).forEach(d => {
            const data = this.state.domains[d];
            const acc = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
            
            let color = "border-slate-700 bg-slate-800 text-slate-400";
            let icon = "⚪";
            if (data.answered > 0) {
                if (acc < 50) { color = "border-rose-900/50 bg-rose-950/30 text-rose-400"; icon = "🛑"; }
                else if (acc < 75) { color = "border-amber-900/50 bg-amber-950/30 text-amber-400"; icon = "⚠️"; }
                else { color = "border-emerald-900/50 bg-emerald-950/30 text-emerald-400"; icon = "👑"; }
            }

            matrix.innerHTML += `
                <div onclick="App.openGoalModal('${d}')" class="cursor-pointer hover:scale-[1.02] transition-transform border ${color} p-4 rounded-xl flex justify-between items-center shadow-lg">
                    <div><p class="text-[10px] font-bold uppercase tracking-wider">${icon} ${d.split(":")[0]}</p><p class="text-xs opacity-70 mt-1">${data.answered} Attempted</p></div>
                    <div class="text-2xl font-black">${acc}%</div>
                </div>
            `;
        });
    },

    openGoalModal(domainKey) {
        const data = this.state.domains[domainKey];
        const acc = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
        const avg = data.answered > 0 ? Math.round(data.timeSec / data.answered) : 0;

        document.getElementById("goal-title").innerText = domainKey;
        document.getElementById("goal-current-acc").innerText = `Current: ${acc}%`;
        document.getElementById("goal-bar-acc").style.width = `${Math.min(acc, 100)}%`;
        
        const timeEl = document.getElementById("goal-current-time");
        timeEl.innerText = `Current Avg: ${avg}s`;
        timeEl.className = avg > 90 ? "text-sm font-black text-rose-400" : "text-sm font-black text-emerald-400";

        let advice = data.answered === 0 ? "Untouched. Launch a micro-sprint to establish a baseline."
            : acc < 50 ? "Critical logic flaw. Switch to Reverse-Diagnostic: answer blindly, read explanations, map rules."
            : acc < 75 ? "Basics understood, falling for exceptions. Focus strictly on tracking the anomaly rules."
            : "Ready to pass. Focus on reducing velocity to under 90s per question.";
        
        document.getElementById("goal-advice").innerText = advice;
        document.getElementById("modal-goal").classList.remove("hidden");
    },

    openSettings() { document.getElementById("modal-settings").classList.remove("hidden"); },

    // --- SESSION BUILDER ---
    launchManualSession() { this.buildSession(document.getElementById("manual-domain").value); },
    launchAdaptiveSession() {
        let weakest = Object.keys(this.state.domains)[0], lowest = 100;
        Object.keys(this.state.domains).forEach(d => {
            let acc = this.state.domains[d].answered > 0 ? (this.state.domains[d].correct / this.state.domains[d].answered) : -1;
            if (acc < lowest) { lowest = acc; weakest = d; }
        });
        this.buildSession(weakest);
    },

    buildSession(dKey) {
        let pool = [...QUESTION_BANK[dKey]].sort(() => 0.5 - Math.random());
        this.state.session = { domain: dKey, questions: pool.slice(0, 20), index: 0, correct: 0, time: 0, timerActive: true, evaluated: false };
        this.switchView("view-quiz");
        this.renderQuestion();
        this.startTimer();
    },

    // --- QUIZ LOGIC ---
    renderQuestion() {
        const sesh = this.state.session, q = sesh.questions[sesh.index];
        sesh.evaluated = false; sesh.selected = null;

        document.getElementById("quiz-domain").innerText = sesh.domain.split(":")[0];
        document.getElementById("quiz-question").innerText = q.q;
        document.getElementById("quiz-feedback").classList.add("hidden");
        
        const btnNext = document.getElementById("btn-next");
        btnNext.innerText = "Verify Logic";
        btnNext.className = "bg-slate-200 hover:bg-white text-slate-900 font-extrabold text-xs px-6 py-2.5 rounded-xl transition shadow-lg";

        const opts = document.getElementById("quiz-options");
        opts.innerHTML = "";
        q.options.forEach((opt, idx) => {
            opts.innerHTML += `<button onclick="App.selectOption(${idx})" id="opt-${idx}" class="w-full text-left bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-sm text-slate-300 hover:border-indigo-400 focus:outline-none flex gap-3"><span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0 border border-slate-700">${String.fromCharCode(65+idx)}</span>${opt}</button>`;
        });
    },

    selectOption(idx) {
        if (this.state.session.evaluated) return;
        this.state.session.selected = idx;
        for(let i=0; i<4; i++) document.getElementById(`opt-${i}`).classList.remove("border-indigo-500", "bg-indigo-950/50", "text-indigo-300");
        document.getElementById(`opt-${idx}`).classList.add("border-indigo-500", "bg-indigo-950/50", "text-indigo-300");
    },

    handleNext() {
        const sesh = this.state.session;
        if (sesh.selected === null) return;
        const q = sesh.questions[sesh.index];

        if (!sesh.evaluated) {
            sesh.evaluated = true;
            const isC = (sesh.selected === q.ans);
            if (isC) sesh.correct++;
            
            const sBtn = document.getElementById(`opt-${sesh.selected}`);
            if (isC) sBtn.className = "w-full text-left bg-emerald-950/50 border border-emerald-500 p-3.5 rounded-xl text-sm text-emerald-400 font-bold flex gap-3";
            else {
                sBtn.className = "w-full text-left bg-rose-950/50 border border-rose-500 p-3.5 rounded-xl text-sm text-rose-400 font-bold flex gap-3";
                document.getElementById(`opt-${q.ans}`).className = "w-full text-left border border-emerald-500/50 p-3.5 rounded-xl text-sm text-emerald-500 flex gap-3 opacity-80 bg-slate-900";
            }

            const fb = document.getElementById("quiz-feedback");
            fb.classList.remove("hidden");
            fb.className = isC ? "p-4 rounded-xl text-sm border bg-emerald-950/20 border-emerald-900/50" : "p-4 rounded-xl text-sm border bg-rose-950/20 border-rose-900/50";
            document.getElementById("feedback-text").innerHTML = `<b class="${isC ? 'text-emerald-400' : 'text-rose-400'}">Database Explanation:</b><br><br><span class="text-slate-300">${q.exp}</span>`;

            const nBtn = document.getElementById("btn-next");
            nBtn.innerText = (sesh.index + 1 === sesh.questions.length) ? "Complete Sprint ➔" : "Next Question ➔";
            nBtn.className = "bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/30";
        } else {
            if (sesh.index + 1 < sesh.questions.length) { sesh.index++; this.renderQuestion(); }
            else this.finishSprint();
        }
    },

    // --- DIRECT IN-APP GEMINI API CALL ---
    async triggerGemini() {
        const sesh = this.state.session;
        const q = sesh.questions[sesh.index];
        const prompt = `Act as an expert US CMA Tutor. Question from ${sesh.domain}: "${q.q}". Options: A) ${q.options[0]} B) ${q.options[1]} C) ${q.options[2]} D) ${q.options[3]}. Correct is ${String.fromCharCode(65+q.ans)}. Give a very brief, punchy, bullet-point explanation of why this is correct and why the others fail structurally. No pleasantries.`;
        
        const encodedNode = localStorage.getItem("cma_gemini_node");
        
        // If API Key exists, call it in-app
        if (encodedNode) {
            const apiKey = atob(encodedNode); // Decrypt local key
            const fbBox = document.getElementById("quiz-feedback");
            const fbText = document.getElementById("feedback-text");
            
            fbBox.classList.remove("hidden");
            fbBox.className = "p-4 rounded-xl text-sm border bg-cyan-950/20 border-cyan-900/50";
            fbText.innerHTML = `<span class="animate-pulse font-bold text-cyan-400">🤖 Initiating handshake with Gemini Neural Net...</span>`;
            
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                
                const data = await response.json();
                
                if(data.error) throw new Error("API Auth Failed");
                
                // Parse markdown bold markers (**text**) into HTML
                let formattedResponse = data.candidates[0].content.parts[0].text;
                formattedResponse = formattedResponse.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>');
                formattedResponse = formattedResponse.replace(/\n/g, '<br>');
                
                fbText.innerHTML = `<b class="text-cyan-400 mb-2 block">🤖 Gemini Insight:</b><div class="text-slate-300 text-xs">${formattedResponse}</div>`;
                
            } catch(e) {
                this.fallbackGemini(prompt, true);
            }
        } else {
            // Fallback if no key is entered
            this.fallbackGemini(prompt, false);
        }
    },

    fallbackGemini(prompt, isError) {
        const temp = document.createElement("textarea");
        temp.value = prompt; document.body.appendChild(temp); temp.select(); document.execCommand("copy"); document.body.removeChild(temp);
        if(isError) alert("⚠️ API Key Error or Network Failure. Prompt copied to clipboard instead. Opening Web App...");
        else alert("📋 No API Key found in settings. Prompt copied to clipboard! Paste it in the Gemini tab.");
        window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
    },

    // --- TIMERS & COMPLETION ---
    startTimer() {
        if(this.state.timer) clearInterval(this.state.timer);
        this.state.timer = setInterval(() => {
            if(this.state.session && this.state.session.timerActive) {
                this.state.session.time++;
                let m = String(Math.floor(this.state.session.time / 60)).padStart(2,'0'), s = String(this.state.session.time % 60).padStart(2,'0');
                document.getElementById("quiz-timer").innerText = `${m}:${s}`;
            }
        }, 1000);
    },

    setupAutoPause() {
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && this.state.session) this.state.session.timerActive = false;
            else if (!document.hidden && this.state.session) this.state.session.timerActive = true;
        });
    },

    finishSprint() {
        clearInterval(this.state.timer);
        const sesh = this.state.session;
        this.state.stats.total += sesh.questions.length; this.state.stats.correct += sesh.correct; this.state.stats.timeSec += sesh.time;
        this.state.domains[sesh.domain].answered += sesh.questions.length; this.state.domains[sesh.domain].correct += sesh.correct; this.state.domains[sesh.domain].timeSec += sesh.time;

        const today = new Date().toDateString();
        if (this.state.stats.lastLogin !== today) { this.state.stats.streak++; this.state.stats.lastLogin = today; }

        this.saveData();
        document.getElementById("sum-acc").innerText = `${Math.round((sesh.correct / sesh.questions.length)*100)}%`;
        let m = String(Math.floor(sesh.time / 60)).padStart(2,'0'), s = String(sesh.time % 60).padStart(2,'0');
        document.getElementById("sum-time").innerText = `${m}:${s}`;
        this.switchView("view-summary");
    },

    endSession() { this.state.session = null; this.init(); this.switchView("view-dashboard"); },
    switchView(id) { ["view-dashboard", "view-quiz", "view-summary"].forEach(v => document.getElementById(v).classList.add("hidden")); document.getElementById(id).classList.remove("hidden"); }
};

window.addEventListener("DOMContentLoaded", () => App.init());
            yesterday.setDate(yesterday.getDate() - 1);
            if (this.state.stats.lastLogin !== yesterday.toDateString()) {
                this.state.stats.streak = 0; // Reset streak if missed a day
            }
        }
        document.getElementById("streak-counter").innerText = `${this.state.stats.streak} Days`;
    },

    // --- DASHBOARD UI ---
    populateDomains() {
        const select = document.getElementById("manual-domain");
        select.innerHTML = "";
        Object.keys(QUESTION_BANK).forEach(domain => {
            select.innerHTML += `<option value="${domain}">${domain} (${QUESTION_BANK[domain].length} Qs available)</option>`;
        });
    },

    renderDashboard() {
        const s = this.state.stats;
        document.getElementById("stat-total").innerText = s.total;
        document.getElementById("stat-accuracy").innerText = s.total > 0 ? `${Math.round((s.correct / s.total) * 100)}%` : "0%";
        document.getElementById("stat-time").innerText = s.total > 0 ? `${Math.round(s.timeSec / s.total)}s` : "0s";

        const matrix = document.getElementById("domain-matrix");
        matrix.innerHTML = "";
        
        Object.keys(this.state.domains).forEach(d => {
            const data = this.state.domains[d];
            const acc = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
            
            // Dynamic Color Logic
            let color = "border-slate-700 bg-slate-800 text-slate-400"; // Default Untouched
            let icon = "⚪";
            if (data.answered > 0) {
                if (acc < 50) { color = "border-rose-500 bg-rose-900/20 text-rose-400"; icon = "🛑"; }
                else if (acc < 75) { color = "border-amber-500 bg-amber-900/20 text-amber-400"; icon = "⚠️"; }
                else { color = "border-emerald-500 bg-emerald-900/20 text-emerald-400"; icon = "👑"; }
            }

            matrix.innerHTML += `
                <div class="border ${color} p-4 rounded-xl flex justify-between items-center shadow-md">
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-wider">${icon} ${d.split(":")[0]}</p>
                        <p class="text-xs opacity-70 mt-1">${data.answered} Attempted</p>
                    </div>
                    <div class="text-2xl font-black">${acc}%</div>
                </div>
            `;
        });
    },

    // --- SESSION LOGIC (ADAPTIVE & MANUAL) ---
    launchManualSession() {
        const domain = document.getElementById("manual-domain").value;
        this.buildSession(domain);
    },

    launchAdaptiveSession() {
        // Find weakest domain algorithm
        let weakestDomain = Object.keys(this.state.domains)[0];
        let lowestAcc = 100;
        
        Object.keys(this.state.domains).forEach(d => {
            const data = this.state.domains[d];
            const acc = data.answered > 0 ? (data.correct / data.answered) : -1; // -1 favors untouched domains
            if (acc < lowestAcc) {
                lowestAcc = acc;
                weakestDomain = d;
            }
        });
        
        alert(`⚡ Smart Sprint Activated! Targeting your weakest area: ${weakestDomain.split(":")[0]}`);
        this.buildSession(weakestDomain);
    },

    buildSession(domainKey) {
        let pool = [...QUESTION_BANK[domainKey]]; // Copy array
        pool.sort(() => 0.5 - Math.random()); // Shuffle questions
        
        const qCount = Math.min(20, pool.length); // Max 20 questions
        
        this.state.session = {
            domain: domainKey,
            questions: pool.slice(0, qCount),
            index: 0,
            correct: 0,
            time: 0,
            timerActive: true,
            evaluated: false
        };

        this.switchView("view-quiz");
        this.renderQuestion();
        this.startTimer();
    },

    // --- QUIZ EXECUTION ---
    renderQuestion() {
        const sesh = this.state.session;
        const q = sesh.questions[sesh.index];
        sesh.evaluated = false;
        sesh.selected = null;

        document.getElementById("quiz-domain").innerText = sesh.domain;
        document.getElementById("quiz-progress").innerText = `Q ${sesh.index + 1} / ${sesh.questions.length}`;
        document.getElementById("quiz-question").innerText = q.q;
        document.getElementById("quiz-feedback").classList.add("hidden");
        
        const btnNext = document.getElementById("btn-next");
        btnNext.innerText = "Verify";
        btnNext.className = "bg-white text-slate-900 font-extrabold text-xs px-6 py-2 rounded-lg hover:bg-slate-200 transition-all";

        const optionsDiv = document.getElementById("quiz-options");
        optionsDiv.innerHTML = "";
        
        q.options.forEach((opt, idx) => {
            optionsDiv.innerHTML += `
                <button onclick="App.selectOption(${idx})" id="opt-${idx}" class="w-full text-left bg-slate-900 border border-slate-700 p-3 rounded-lg text-sm text-slate-300 font-medium hover:border-indigo-400 transition-all focus:outline-none flex gap-3 items-center">
                    <span class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-700">${String.fromCharCode(65+idx)}</span>
                    ${opt}
                </button>
            `;
        });

        // Pre-build the Gemini Prompt
        const prompt = `Act as my US CMA Part 1 Tutor. I am reverse-engineering this question from ${sesh.domain}:\n\n[Q]: ${q.q}\nA) ${q.options[0]}\nB) ${q.options[1]}\nC) ${q.options[2]}\nD) ${q.options[3]}\n\nThe correct answer is Option ${String.fromCharCode(65+q.ans)}. Explain the operational accounting logic behind this, and why the other options are traps. Be direct and highly analytical.`;
        document.getElementById("gemini-prompt").value = prompt;
    },

    selectOption(idx) {
        if (this.state.session.evaluated) return;
        this.state.session.selected = idx;
        
        for(let i=0; i<4; i++) {
            let el = document.getElementById(`opt-${i}`);
            if(el) el.classList.remove("border-indigo-500", "bg-indigo-900/30", "text-indigo-300");
        }
        let active = document.getElementById(`opt-${idx}`);
        active.classList.add("border-indigo-500", "bg-indigo-900/30", "text-indigo-300");
    },

    handleNext() {
        const sesh = this.state.session;
        if (sesh.selected === null) return;

        const q = sesh.questions[sesh.index];

        if (!sesh.evaluated) {
            // EVALUATE
            sesh.evaluated = true;
            const isCorrect = (sesh.selected === q.ans);
            
            // Update Session Stats
            if (isCorrect) sesh.correct++;
            
            // UI Feedback
            const selectedBtn = document.getElementById(`opt-${sesh.selected}`);
            if (isCorrect) {
                selectedBtn.className = "w-full text-left bg-emerald-900/30 border border-emerald-500 p-3 rounded-lg text-sm text-emerald-400 font-bold flex gap-3 items-center";
            } else {
                selectedBtn.className = "w-full text-left bg-rose-900/30 border border-rose-500 p-3 rounded-lg text-sm text-rose-400 font-bold flex gap-3 items-center";
                document.getElementById(`opt-${q.ans}`).className = "w-full text-left bg-slate-900 border border-emerald-500/50 p-3 rounded-lg text-sm text-emerald-500 font-medium flex gap-3 items-center opacity-80";
            }

            const fbBox = document.getElementById("quiz-feedback");
            fbBox.classList.remove("hidden");
            fbBox.className = isCorrect ? "p-4 rounded-xl text-sm border shadow-inner bg-emerald-950/20 border-emerald-900/50" : "p-4 rounded-xl text-sm border shadow-inner bg-rose-950/20 border-rose-900/50";
            document.getElementById("feedback-text").innerHTML = `<b>Explanation:</b> ${q.exp}`;

            const btnNext = document.getElementById("btn-next");
            btnNext.innerText = (sesh.index + 1 === sesh.questions.length) ? "Complete Sprint ➔" : "Next Question ➔";
            btnNext.className = "bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-6 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]";
            
        } else {
            // MOVE NEXT
            if (sesh.index + 1 < sesh.questions.length) {
                sesh.index++;
                this.renderQuestion();
            } else {
                this.finishSprint();
            }
        }
    },

    // --- TIMER & VISIBILITY LOGIC ---
    startTimer() {
        if(this.state.timer) clearInterval(this.state.timer);
        this.state.timer = setInterval(() => {
            if(this.state.session && this.state.session.timerActive) {
                this.state.session.time++;
                let m = String(Math.floor(this.state.session.time / 60)).padStart(2,'0');
                let s = String(this.state.session.time % 60).padStart(2,'0');
                document.getElementById("quiz-timer").innerText = `${m}:${s}`;
            }
        }, 1000);
    },

    setupAutoPause() {
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && this.state.session) {
                this.state.session.timerActive = false;
                document.getElementById("quiz-timer").classList.add("text-rose-500");
            } else if (!document.hidden && this.state.session) {
                this.state.session.timerActive = true;
                document.getElementById("quiz-timer").classList.remove("text-rose-500");
            }
        });
    },

    // --- COMPLETION & SAVING ---
    finishSprint() {
        clearInterval(this.state.timer);
        const sesh = this.state.session;
        
        // Push to Global Stats
        this.state.stats.total += sesh.questions.length;
        this.state.stats.correct += sesh.correct;
        this.state.stats.timeSec += sesh.time;
        
        // Push to Domain Stats
        this.state.domains[sesh.domain].answered += sesh.questions.length;
        this.state.domains[sesh.domain].correct += sesh.correct;

        // Daily Streak Update
        const today = new Date().toDateString();
        if (this.state.stats.lastLogin !== today) {
            this.state.stats.streak++;
            this.state.stats.lastLogin = today;
        }

        this.saveData();
        
        // Render Summary
        document.getElementById("sum-acc").innerText = `${Math.round((sesh.correct / sesh.questions.length)*100)}%`;
        let m = String(Math.floor(sesh.time / 60)).padStart(2,'0');
        let s = String(sesh.time % 60).padStart(2,'0');
        document.getElementById("sum-time").innerText = `${m}:${s}`;
        
        this.switchView("view-summary");
    },

    endSession() {
        this.state.session = null;
        this.renderDashboard();
        this.checkStreak();
        this.switchView("view-dashboard");
    },

    // --- UTILITIES ---
    switchView(viewId) {
        ["view-dashboard", "view-quiz", "view-summary"].forEach(id => {
            document.getElementById(id).classList.add("hidden");
        });
        document.getElementById(viewId).classList.remove("hidden");
    },

    toggleGemini() {
        const el = document.getElementById("gemini-overlay");
        if (el.classList.contains("translate-x-full")) {
            el.classList.remove("translate-x-full");
        } else {
            el.classList.add("translate-x-full");
        }
    },

    copyPrompt() {
        const txt = document.getElementById("gemini-prompt");
        txt.select();
        navigator.clipboard.writeText(txt.value).then(() => {
            window.open("https://gemini.google.com/app", "_blank");
        });
    }
};

// Boot App
window.addEventListener("DOMContentLoaded", () => App.init());

