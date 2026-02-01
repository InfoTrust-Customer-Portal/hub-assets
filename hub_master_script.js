/**
 * INFOTRUST PORTAL - MASTER SCRIPT
 * Contains logic for:
 * 1. Global Utilities (Accessibility, Share, Accordions)
 * 2. API Connectors (Locked Assets, Feedback Forms)
 * 3. Navigation & Routing (SPA Switcher, Hash Polling)
 * 4. Newsletter Archive (Filtering, Sorting)
 * 5. Homepage Widgets (Live Time)
 * 6. Education Hub (Course Rendering, Quizzes, Certification)
 */

(function() {
    console.log("InfoTrust Global Scripts Loaded");

    // ===============================================
    // 1. GLOBAL UTILITIES
    // ===============================================

    // Accessibility Toggle (High Contrast Mode)
    window.toggleAccessibility = function() {
        document.body.classList.toggle('accessibility-mode');
        const btns = document.querySelectorAll('.util-btn[onclick="toggleAccessibility()"]');
        btns.forEach(btn => btn.classList.toggle('active'));
    };

    // Copy Current URL to Clipboard
    window.copyToClipboard = function() {
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = window.location.href;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        
        const btns = document.querySelectorAll('.share-trigger');
        btns.forEach(btn => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = 'Copied <i class="fa-solid fa-check"></i>';
            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
        });
    };

    // Global Accordion Toggle (Used in FAQ & Education Notes)
    window.toggleAccordion = function(header) {
        header.classList.toggle('active');
        var content = header.nextElementSibling;
        if (content.style.maxHeight) { 
            content.style.maxHeight = null;
            content.classList.remove('open');
        } else { 
            content.classList.add('open');
            content.style.maxHeight = content.scrollHeight + "px";
        }
    };

    // Safe DOM Setters
    function safeSetText(id, text) { const el = document.getElementById(id); if(el) el.innerText = text; }
    function safeSetHTML(id, html) { const el = document.getElementById(id); if(el) el.innerHTML = html; }

    // ===============================================
    // 2. API CONNECTORS
    // ===============================================

    // Capture Interest (Locked Content Upsell)
    window.captureInterest = function(btnElement, deliverableName) {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        btnElement.disabled = true;

        const userEmail = window.analyticsUserEmail || "unknown@user.com"; 
        const timestamp = new Date().toISOString();

        const payload = {
            email: userEmail,
            domain: window.location.hostname,
            path: window.location.pathname,
            date: timestamp,
            deliverable: deliverableName,
            type: "upsell_interest"
        };

        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw3QwMuUpiPeRKEtV_wi2RvMGWTqffS8qe6M0iI7VbiXUrnn5pPez-QTIbexztbKsbR/exec";

        fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(() => {
            btnElement.classList.add('sent');
            btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Request Sent';
        })
        .catch(error => {
            console.error("Error:", error);
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
            alert("Request failed. Please contact your account manager.");
        });
    };

    // Submit Feedback (Newsletters & Education)
    window.updateRatingDisplay = function(val) {
        const el = document.getElementById('ratingValue');
        if(el) el.innerText = val + "/5";
    };

    window.submitFeedback = function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = "Sending...";
        btn.disabled = true;

        const rating = document.getElementById('ratingSlider')?.value || "N/A";
        const notes = document.getElementById('feedbackNotes')?.value || "";
        const timestamp = new Date().toISOString();
        // Append Course ID if available (Education Hub context)
        const context = (typeof currentCourseId !== 'undefined' && currentCourseId) ? ` (${currentCourseId})` : "";
        const pageUrl = window.location.href + context;

        const data = { 
            timestamp: timestamp, 
            url: pageUrl, 
            rating: rating, 
            feedback: notes,
            type: "content_feedback"
        };

        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeHVZiDONjwbGlzgXSdTWYCNvZ0CiOhkV-9SAh2Jl5wzVxfA4rlb5RwYjSU8TUibzp/exec";

        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(() => {
            const form = document.getElementById('feedbackForm');
            if(form) form.style.display = 'none';
            const msg = document.getElementById('feedbackMessage');
            if(msg) msg.style.display = 'block';
        })
        .catch(err => {
            console.error('Error:', err);
            alert("Error sending feedback.");
            btn.innerText = originalText;
            btn.disabled = false;
        });
    };

    // ===============================================
    // 3. NAVIGATION & ROUTING (SPA LOGIC)
    // ===============================================

    // Unified View Switcher (Handles Newsletters, Education, & Archives)
    window.switchView = function(viewId) {
        // 1. Hide all views
        const sections = document.querySelectorAll('.view-section');
        if(sections.length === 0) return; // Exit if not a SPA page

        sections.forEach(el => el.classList.add('it-hidden'));
        
        // 2. Show Target View
        const target = document.getElementById(viewId);
        if(target) target.classList.remove('it-hidden');

        // 3. Education Hub Logic: Load Course Data
        if (window.courseData && window.courseData[viewId]) {
            window.loadLesson(viewId); // Call Education Logic
        }

        // 4. Handle Navigation UI State (Pills vs Back Buttons)
        const archiveNav = document.getElementById('archive-nav') || document.getElementById('landing-nav');
        const articleNav = document.getElementById('article-nav') || document.getElementById('lesson-nav');
        
        // If we are returning to the main list (archive or landing)
        if (viewId === 'view-archive' || viewId === 'view-landing') {
            if(archiveNav) archiveNav.classList.remove('it-hidden');
            if(articleNav) articleNav.classList.add('it-hidden');
            // Reset URL clean
            history.pushState("", document.title, window.location.pathname + window.location.search);
        } else {
            // We are drilling down into content
            if(archiveNav) archiveNav.classList.add('it-hidden');
            if(articleNav) articleNav.classList.remove('it-hidden');
            // Set Hash
            window.location.hash = viewId;
        }
        
        // 5. Scroll to Top
        setTimeout(() => window.scrollTo(0, 0), 10);
    };

    // Global Hash Polling (Fixes React/FuseBase Navigation bugs)
    // Checks every 500ms if the URL hash doesn't match the visible content
    setInterval(function() {
        if (window.location.hash) {
            var targetId = window.location.hash.substring(1);
            var targetElement = document.getElementById(targetId);
            
            // If the element exists but is hidden, force the switch
            if (targetElement && targetElement.classList.contains('it-hidden')) {
                window.switchView(targetId);
            }
        }
    }, 500);

    // ===============================================
    // 4. NEWSLETTER ARCHIVE LOGIC
    // ===============================================

    window.filterNews = function() {
        const searchInput = document.getElementById('search-input');
        const topicFilter = document.getElementById('filter-topic');
        if(!searchInput || !topicFilter) return;

        const search = searchInput.value.toLowerCase().trim();
        const topic = topicFilter.value;
        const items = document.querySelectorAll('.news-item');

        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            const tags = item.getAttribute('data-tags') ? item.getAttribute('data-tags').toLowerCase() : "";
            const matchSearch = text.includes(search);
            const matchTopic = (topic === 'All') || tags.includes(topic.toLowerCase());
            
            item.style.display = (matchSearch && matchTopic) ? 'flex' : 'none';
        });
    };

    window.sortNews = function() {
        const orderSelect = document.getElementById('sort-order');
        const grid = document.getElementById('news-container');
        if(!orderSelect || !grid) return;

        const order = orderSelect.value;
        const items = Array.from(grid.children);
        
        items.sort((a, b) => {
            const dateA = new Date(a.getAttribute('data-date'));
            const dateB = new Date(b.getAttribute('data-date'));
            return (order === 'newest') ? dateB - dateA : dateA - dateB;
        });
        
        items.forEach(item => grid.appendChild(item));
    };

    // ===============================================
    // 5. HOMEPAGE WIDGETS
    // ===============================================

    function updateDateTime() {
        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-time');
        if(!dateEl || !timeEl) return;

        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
    }
    
    if(document.getElementById('current-date')) {
        updateDateTime();
        setInterval(updateDateTime, 1000);
    }

    // ===============================================
    // 6. EDUCATION HUB LOGIC
    // ===============================================
    
    // Variables for Quiz State
    let currentCourseId = null;
    let quizHistory = [];
    let currentScore = 0;

    // -- Course Rendering --
    window.loadLesson = function(id) {
        // Data object (window.courseData) must be defined in the HTML widget of the page
        const data = window.courseData ? window.courseData[id] : null;
        if (!data) return; // Exit if not education content
        
        currentCourseId = id;

        // Populate Content
        safeSetText('lesson-title', data.title);
        safeSetHTML('lesson-difficulty', `<i class="fa-solid fa-signal"></i> ${data.difficulty}`);
        safeSetHTML('lesson-duration', `<i class="fa-regular fa-clock"></i> ${data.duration} Min`);
        safeSetHTML('lesson-updated', `<i class="fa-regular fa-calendar"></i> ${data.updated}`);

        const videoEl = document.getElementById('lesson-video');
        if(videoEl) videoEl.src = data.video;
        
        const objEl = document.getElementById('lesson-objectives');
        if(objEl && data.objectives) objEl.innerHTML = data.objectives.map(o => `<li>${o}</li>`).join('');

        const notesContainer = document.getElementById('lesson-notes');
        if(notesContainer && data.notes) {
            notesContainer.innerHTML = data.notes.map(note => `
                <div class="accordion-item">
                    <div class="accordion-header" onclick="window.toggleAccordion(this)">
                        ${note.title} <i class="fa-solid fa-chevron-down accordion-icon"></i>
                    </div>
                    <div class="accordion-content"><div class="accordion-body">${note.content}</div></div>
                </div>
            `).join('');
        }

        // Warning Panel Logic
        const warnPanel = document.getElementById('lesson-warning-panel');
        if (warnPanel) {
            if (data.warningPanel) {
                warnPanel.classList.remove('it-hidden');
                safeSetHTML('warning-table-body', data.warningPanel.map(w => 
                    `<tr><td>${w.type}</td><td>${w.cause}</td><td>${w.solution}</td></tr>`
                ).join(''));
            } else {
                warnPanel.classList.add('it-hidden');
            }
        }

        // Sidebar Content
        if(data.tags) safeSetHTML('lesson-tags', data.tags.map(t => `<span class="tool-tag">${t}</span>`).join(''));
        
        // Related & Resources
        const cardRelated = document.getElementById('card-related');
        if (cardRelated) {
            if (data.related && data.related.length > 0) {
                cardRelated.style.display = 'block';
                safeSetHTML('lesson-related', data.related.map(r => 
                    `<li><a onclick="switchView('${r.linkId}')" style="cursor:pointer"><i class="fa-solid ${r.icon}"></i> ${r.title}</a></li>`
                ).join(''));
            } else {
                cardRelated.style.display = 'none';
            }
        }

        const cardResources = document.getElementById('card-resources');
        if (cardResources) {
            if (data.resources && data.resources.length > 0) {
                cardResources.style.display = 'block';
                safeSetHTML('lesson-resources', data.resources.map(r => 
                    `<li><a href="${r.url}" target="_blank"><i class="fa-solid ${r.icon}"></i> ${r.title}</a></li>`
                ).join(''));
            } else {
                cardResources.style.display = 'none';
            }
        }

        // Reset Quiz & Feedback UI
        resetQuizUI();
        const feedbackForm = document.getElementById('feedbackForm');
        if(feedbackForm) {
            feedbackForm.reset();
            feedbackForm.style.display = 'block';
            const msg = document.getElementById('feedbackMessage');
            if(msg) msg.style.display = 'none';
        }
    };

    // -- Course Filtering --
    window.filterCourses = function() {
        const searchVal = document.getElementById('searchInput')?.value.toLowerCase().trim() || "";
        const diffVal = document.getElementById('difficultyFilter')?.value || "All";
        const cards = document.querySelectorAll('.course-card');

        cards.forEach(card => {
            const title = (card.getAttribute('data-title') || '').toLowerCase();
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();
            const difficulty = card.getAttribute('data-difficulty') || 'Beginner';

            const matchesSearch = title.includes(searchVal) || tags.includes(searchVal);
            const matchesDiff = (diffVal === 'All') || (difficulty === diffVal);

            card.style.display = (matchesSearch && matchesDiff) ? 'flex' : 'none';
        });
    };

    window.sortCourses = function() {
        const sortVal = document.getElementById('sortOrder')?.value;
        const grid = document.getElementById('courseGrid');
        if (!sortVal || !grid) return;

        const cards = Array.from(grid.querySelectorAll('.course-card'));
        const diffWeight = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };

        cards.sort((a, b) => {
            const durA = parseInt(a.getAttribute('data-duration')) || 0;
            const durB = parseInt(b.getAttribute('data-duration')) || 0;
            const titleA = (a.getAttribute('data-title') || '').toLowerCase();
            const titleB = (b.getAttribute('data-title') || '').toLowerCase();
            
            let diffA = (a.getAttribute('data-difficulty') || 'Beginner');
            let diffB = (b.getAttribute('data-difficulty') || 'Beginner');
            diffA = diffA.charAt(0).toUpperCase() + diffA.slice(1).toLowerCase();
            diffB = diffB.charAt(0).toUpperCase() + diffB.slice(1).toLowerCase();
            
            const valA = diffWeight[diffA] || 0;
            const valB = diffWeight[diffB] || 0;

            if (sortVal === 'duration-asc') return durA - durB;
            if (sortVal === 'duration-desc') return durB - durA;
            if (sortVal === 'az') return titleA.localeCompare(titleB);
            if (sortVal === 'difficulty-asc') return valA - valB;
            if (sortVal === 'difficulty-desc') return valB - valA;
            return 0;
        });

        cards.forEach(card => grid.appendChild(card));
    };

    window.clearFilters = function() {
        const searchInput = document.getElementById('searchInput');
        const diffFilter = document.getElementById('difficultyFilter');
        const sortOrder = document.getElementById('sortOrder');

        if(searchInput) searchInput.value = "";
        if(diffFilter) diffFilter.value = "All";
        if(sortOrder) sortOrder.value = "default";
        
        window.filterCourses();
        window.sortCourses();
    };

    // -- Quiz Logic --
    function resetQuizUI() {
        const data = window.courseData ? window.courseData[currentCourseId] : null;
        const quizSection = document.getElementById('quiz-section');
        
        if(!data || !data.quiz || data.quiz.length === 0) {
            if(quizSection) quizSection.style.display = 'none';
            return;
        }
        if(quizSection) quizSection.style.display = 'flex';

        const container = document.getElementById('dynamic-quiz-content');
        if(container) {
            container.innerHTML = data.quiz.map((q, idx) => {
                const optionsHTML = q.options.map((opt, optIdx) => {
                    const isCorrect = (optIdx === q.correct);
                    return `<button class="quiz-option-btn" onclick="checkAnswer(this, ${isCorrect}, ${idx})">${opt}</button>`;
                }).join('');

                return `
                    <div id="q-${idx}" class="quiz-step">
                        <div class="quiz-question-text"><span>${idx + 1}.</span> <span>${q.q}</span></div>
                        <div class="quiz-options">${optionsHTML}</div>
                        <div class="quiz-feedback" id="feedback-${idx}"></div>
                    </div>
                `;
            }).join('');
        }

        const intro = document.getElementById('quiz-intro');
        const results = document.getElementById('quiz-results');
        const progress = document.getElementById('quiz-progress');
        if(intro) intro.classList.add('active');
        if(results) results.classList.remove('active');
        if(progress) progress.style.display = 'none';
    }

    window.startQuiz = function() {
        document.getElementById('quiz-intro').classList.remove('active');
        const firstQ = document.getElementById('q-0');
        if(firstQ) firstQ.classList.add('active');
        
        currentScore = 0;
        quizHistory = [];
        updateQuizProgress(0);
    };

    function updateQuizProgress(currentIdx) {
        const total = window.courseData[currentCourseId].quiz.length;
        const bar = document.getElementById('progress-bar-fill');
        const text = document.getElementById('progress-text');
        const progressEl = document.getElementById('quiz-progress');
        
        if(progressEl) progressEl.style.display = 'flex';
        if(text) text.innerText = `Question ${currentIdx + 1} of ${total}`;
        if(bar) bar.style.width = ((currentIdx + 1) / total * 100) + '%';
    }

    window.checkAnswer = function(btn, isCorrect, qIdx) {
        const data = window.courseData[currentCourseId];
        const parent = document.getElementById(`q-${qIdx}`);
        const feedback = document.getElementById(`feedback-${qIdx}`);
        const btns = parent.querySelectorAll('.quiz-option-btn');

        if(isCorrect) {
            btn.classList.add('correct');
            feedback.innerHTML = '<span style="color:#2ECC71"><i class="fa-solid fa-check"></i> Correct!</span>';
            currentScore++;
        } else {
            btn.classList.add('incorrect');
            feedback.innerHTML = '<span style="color:#E74C3C"><i class="fa-solid fa-xmark"></i> Incorrect.</span>';
        }

        btns.forEach(b => {
            b.disabled = true;
            if(!b.classList.contains('correct') && !b.classList.contains('incorrect')) {
                 b.style.opacity = "0.5";
            }
        });

        quizHistory.push({
            q: data.quiz[qIdx].q,
            userAns: btn.innerText,
            correct: isCorrect,
            correctAns: data.quiz[qIdx].options[data.quiz[qIdx].correct]
        });

        setTimeout(() => {
            parent.classList.remove('active');
            const nextIdx = qIdx + 1;
            if(nextIdx < data.quiz.length) {
                document.getElementById(`q-${nextIdx}`).classList.add('active');
                updateQuizProgress(nextIdx);
            } else {
                showResults();
            }
        }, 1500);
    };

    function showResults() {
        const resultsEl = document.getElementById('quiz-results');
        resultsEl.classList.add('active');
        document.getElementById('quiz-progress').style.display = 'none';
        
        const total = window.courseData[currentCourseId].quiz.length;
        document.getElementById('final-score').innerText = currentScore;

        const container = document.getElementById('quiz-review-container');
        if(container) {
            container.innerHTML = quizHistory.map((h, i) => {
                const icon = h.correct ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';
                const cls = h.correct ? '' : 'wrong';
                const correctText = h.correct ? '' : `<div style="font-size:12px; color:#555; margin-top:4px;">Correct: ${h.correctAns}</div>`;
                return `
                    <div class="review-item">
                        <div class="review-q">${i+1}. ${h.q}</div>
                        <div class="review-a ${cls}">${icon} Your Answer: ${h.userAns}</div>
                        ${correctText}
                    </div>
                `;
            }).join('');
        }

        // Certification
        if(currentScore === total) {
            if(typeof confetti === 'function') {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            }
            safeSetText('cert-title', window.courseData[currentCourseId].title);
            setTimeout(() => {
                const modal = document.getElementById('certificate-modal');
                if(modal) modal.style.setProperty('display', 'flex', 'important');
            }, 800);
        }
    }

    window.closeCert = function() {
        document.getElementById('certificate-modal').style.setProperty('display', 'none', 'important');
    };

})();
