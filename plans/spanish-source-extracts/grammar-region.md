# Spanish Grammar-Tab Source Extract

> **READ-ONLY REFERENCE** — See §Read-only notice at bottom of file.

---

## Source attribution

| Field | Value |
|---|---|
| Spanish repo | `gh-pages-deploy` (not `gh-pages-deploy-fresh` — confirmed newer by git log) |
| Commit SHA | `0101e2df2b3de45115e2dc6c31bc68ab801eb1ee` |
| Commit date | 2026-04-21 |
| Commit message | `feat(WP-AUD-2 PR-1): extract inline scripts; drop script-src 'unsafe-inline' (#35)` |
| Primary source file | `scripts/app.js` (32 791 lines) |
| CSS source file | `index.html` |

### Line ranges extracted

| Symbol | File | Lines |
|---|---|---|
| `GRAMMAR_LESSONS` array | `scripts/app.js` | 14695–25390 |
| `renderGrammarContent` | `scripts/app.js` | 29423–29560 |
| `renderGrammarLessonView` | `scripts/app.js` | 29562–29605 |
| `renderGrammarWelcome` | `scripts/app.js` | 30400–30505 |
| `bindGrammarWelcomeEvents` | `scripts/app.js` | 30507–30541 |
| `getNextRecommendedLesson` | `scripts/app.js` | 30543–30553 |
| `getGrammarLessonStatus` | `scripts/app.js` | 30555–30571 |
| `renderGrammarUnitOverview` | `scripts/app.js` | 30575–30661 |
| `startReviewSession` | `scripts/app.js` | 30764–30802 |
| `recordGrammarProgress` | `scripts/app.js` | 31643–31669 |
| `_injectReviewBanner` | `scripts/app.js` | 31673–31695 |
| `_renderGlossedPassage` | `scripts/app.js` | 31752–31775 |
| `renderGrammarStats` | `scripts/app.js` | 31825–31881 |
| Grammar CSS | `index.html` | 1026–1553 |

---

## Grammar render functions

### `renderGrammarContent` (coordinator) — app.js:29423–29560

```javascript
// app.js:29423–29560
  renderGrammarContent() {
    const container = document.getElementById("grammar-content");
    if (!this.grammarSelectedProfile) {
      container.innerHTML = this.renderGrammarWelcome();
      this.bindGrammarWelcomeEvents(container);
      return;
    }

    // Default to lesson view if not set
    if (!this.grammarViewMode) this.grammarViewMode = "lesson";

    let html = "";

    // Active selection indicator
    html += `<div class="grammar-active-selection">${this.grammarReviewMode ? '<span style="font-size:11px;color:var(--text-muted);font-weight:400;">🔄 </span>' : ""}<strong>${this.grammarSelectedProfile.description}</strong></div>`;

    // Lesson / Practice / Review tab bar
    html += `<div class="grammar-phase-selector" style="margin-bottom:16px;">`;
    html += `<button class="grammar-phase-btn${this.grammarViewMode === "lesson" ? " active" : ""}" data-viewmode="lesson">Lesson</button>`;
    html += `<button class="grammar-phase-btn${this.grammarViewMode === "practice" ? " active" : ""}" data-viewmode="practice">Practice</button>`;
    html += `<button class="grammar-phase-btn${this.grammarViewMode === "review" ? " active" : ""}" data-viewmode="review">Review</button>`;
    html += `</div>`;

    if (this.grammarViewMode === "lesson") {
      // LESSON VIEW: instructional content
      html += this.renderGrammarLessonView();
      container.innerHTML = html;
      // Bind lesson view events
      container.querySelectorAll("[data-viewmode]").forEach(btn => {
        btn.addEventListener("click", () => {
          this._stopAllTTS();
          this.grammarViewMode = btn.dataset.viewmode;
          this.renderGrammarContent();
        });
      });
      const paradigmToggle = container.querySelector("#grammar-paradigm-toggle");
      if (paradigmToggle) {
        paradigmToggle.addEventListener("click", () => {
          this.grammarParadigmVisible = !this.grammarParadigmVisible;
          const panel = container.querySelector("#grammar-paradigm-panel");
          if (panel) panel.classList.toggle("visible");
        });
      }
      // TTS listen button
      const ttsBtn = container.querySelector("#grammar-tts-btn");
      if (ttsBtn) {
        ttsBtn.addEventListener("click", () => this.toggleLessonTTS(ttsBtn));
      }
      // Pre-fetch audio for this lesson and the next one in sequence
      // Skip prefetch if pre-generated audio files are available
      const _curIdx = GRAMMAR_LESSONS.indexOf(this.grammarSelectedProfile);
      const _hasPregen = GRAMMAR_AUDIO_MAP[_curIdx];
      if (!_hasPregen && this._canUseOpenAITTS()) {
        const profile = this.grammarSelectedProfile;
        const curIdx = _curIdx;
        const nextProfile = curIdx >= 0 ? GRAMMAR_LESSONS[curIdx + 1] : null;
        const keepTexts = [
          ...this._chunkTextForTTS(this._getLessonTextFor(profile)),
          ...this._chunkTextForTTS(this._getLessonTextFor(nextProfile))
        ].filter(Boolean);
        this._evictTTSCache(keepTexts);
        this._prefetchLessonAudio(profile);
        this._prefetchLessonAudio(nextProfile);
      }
      return;
    }

    if (this.grammarViewMode === "review") {
      // REVIEW VIEW: spaced review of previously practiced material
      html += this.renderGrammarReviewView();
      container.innerHTML = html;
      this.bindGrammarReviewEvents(container);
      return;
    }

    // PRACTICE VIEW: exercises
    if (this.grammarExercises.length === 0) {
      html += `<div class="grammar-no-exercises">
        <p>No matching passages found for this pattern in the current corpus.</p>
        <p style="margin-top:8px">Exercises are generated from the translation texts. Try selecting a different pattern or switch to the Lesson tab to review the instructional content.</p>
      </div>`;
      container.innerHTML = html;
      container.querySelectorAll("[data-viewmode]").forEach(btn => {
        btn.addEventListener("click", () => {
          this._stopAllTTS();
          this.grammarViewMode = btn.dataset.viewmode;
          this.renderGrammarContent();
        });
      });
      return;
    }

    const ex = this.grammarExercises[this.grammarCurrentIdx];
    if (!ex) {
      this.renderGrammarComplete(container);
      return;
    }

    // Exercise counter
    html += `<div style="font-size:0.9em;color:var(--text-muted);margin-bottom:8px;">Exercise ${this.grammarCurrentIdx + 1} of ${this.grammarExercises.length}</div>`;

    // Render phase-specific content (thematic exercises bypass the phase selector)
    if (ex.type === "thematic") {
      // Feature 2: resolve FSRS-determined subtype before rendering
      ex.subtype = this._getEffectiveThematicSubtype(ex);
      html += this.renderThematicExercise(ex);
    } else {
      // FSRS auto-selects phase for paradigm exercises (no manual picker)
      const _phase = this._getEffectiveParadigmPhase(ex);
      this.grammarPhase = _phase;
      if (_phase === "repetition") {
        html += this.renderRepetitionPhase(ex);
      } else if (_phase === "cloze") {
        html += this.renderClozePhase(ex);
      } else {
        html += this.renderProductionPhase(ex);
      }
    }

    // Feedback area (populated dynamically)
    html += `<div id="grammar-feedback" class="grammar-feedback" aria-live="polite" aria-atomic="true"></div>`;

    // Paradigm toggle + panel
    html += `<button class="grammar-paradigm-toggle" id="grammar-paradigm-toggle">Show Paradigm Table</button>`;
    html += `<div id="grammar-paradigm-panel" class="grammar-paradigm-panel${this.grammarParadigmVisible ? " visible" : ""}">`;
    html += this.renderParadigmTable(ex);
    html += `</div>`;

    // Navigation
    html += `<div class="grammar-action-row">`;
    html += `<button class="action-btn" id="grammar-next-btn" style="margin-left:auto;">Next &#8594;</button>`;
    html += `</div>`;

    container.innerHTML = html;
    this.bindGrammarEvents(ex);
    // Feature 1: inject due-review banner when not already in review mode
    if (!this.grammarReviewMode) this._injectReviewBanner("grammar");
  }
```

### `renderGrammarLessonView` — app.js:29562–29605

```javascript
// app.js:29562–29605
  renderGrammarLessonView() {
    const profile = this.grammarSelectedProfile;
    let html = "";
    if (profile.lessonContent) {
      html += '<div class="grammar-lesson-panel" style="display:block;">';
      // Rule statement
      html += '<div class="grammar-rule-statement" style="margin-bottom:16px;font-size:1.05em;">' + this.escapeHtml(profile.rule) + '</div>';
      // Listen button
      html += '<div style="margin-bottom:16px;"><button id="grammar-tts-btn" class="action-btn" style="padding:8px 18px;font-size:0.9em;cursor:pointer;">&#9654; Listen to Lesson</button></div>';
      // Introduction
      html += '<div class="grammar-lesson-section"><h3>Introduction</h3>';
      html += '<p>' + this.escapeHtml(profile.lessonContent.introduction) + '</p></div>';
      // Key Points
      if (profile.lessonContent.keyPoints) {
        html += '<div class="grammar-lesson-section"><h3>Key Points</h3><ul class="grammar-lesson-keypoints">';
        profile.lessonContent.keyPoints.forEach(p => { html += '<li>' + this.escapeHtml(p) + '</li>'; });
        html += '</ul></div>';
      }
      // Paradigm table (always visible in lesson view)
      html += '<div class="grammar-lesson-section"><h3>Paradigm</h3>';
      html += '<div class="grammar-paradigm-panel visible" style="display:block;margin-top:8px;">';
      html += '<table class="paradigm-table"><tbody>';
      for (const [label, form] of Object.entries(profile.paradigm)) {
        html += '<tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap;">' + this.escapeHtml(label) + '</td><td style="padding:4px 0;"><strong>' + this.escapeHtml(form) + '</strong></td></tr>';
      }
      html += '</tbody></table></div></div>';
      // Cross-linguistic comparison
      if (profile.lessonContent.comparison) {
        html += '<div class="grammar-lesson-section"><h3>Cross-Linguistic Comparison</h3>';
        html += '<div class="grammar-lesson-comparison">' + this.escapeHtml(profile.lessonContent.comparison) + '</div></div>';
      }
      // Historical note
      if (profile.lessonContent.historicalNote) {
        html += '<div class="grammar-lesson-section"><h3>Historical Note</h3>';
        html += '<div class="grammar-lesson-historical">' + this.escapeHtml(profile.lessonContent.historicalNote) + '</div></div>';
      }
      html += '</div>';
    } else {
      html += '<div class="grammar-no-exercises"><p>No lesson content available for this topic.</p></div>';
    }
    // Button to switch to practice
    html += '<div style="margin-top:20px;text-align:center;"><button class="action-btn" data-viewmode="practice" style="padding:10px 24px;">Begin Practice Exercises &rarr;</button></div>';
    return html;
  }
```

### `renderGrammarWelcome` — app.js:30400–30505

```javascript
// app.js:30400–30505
  renderGrammarWelcome() {
    const catLabels = {
      ch1: "Unit 1: Cognates & Noun Basics",
      ch2: "Unit 2: estar, dar & Present -ar",
      ch3: "Unit 3: Present -er/-ir & Comparisons",
      ch4: "Unit 4: Adjective Forms & Demonstratives",
      ch5: "Unit 5: Irregular Verbs & Pronouns",
      ch6: "Unit 6: Past Participles & Present Perfect",
      ch7: "Unit 7: Imperfect & Progressive",
      ch8: "Unit 8: Preterite Tense",
      ch9: "Unit 9: Preterite Irregular & Pluperfect",
      ch10: "Unit 10: Future & gustar",
      ch11: "Unit 11: The Conditional",
      ch12: "Unit 12: Present Subjunctive & Passive",
      ch13: "Unit 13: Imperative",
      ch14: "Unit 14: Imperfect Subjunctive",
      ch15: "Unit 15: Comprehensive Review"
    };
    const unitDescriptions = {
      ch1: "Cognates, noun gender & plural formation, definite & indefinite articles",
      ch2: "estar & dar conjugation, present tense of regular -ar verbs, negative sentences",
      ch3: "Present tense -er/-ir verbs, comparisons, tener & hay expressions",
      ch4: "Adjective agreement & position, shortened adjectives, demonstrative adjectives & pronouns",
      ch5: "Irregular presents (decir, hacer, ir, etc.), object & reflexive pronouns, prepositional pronouns",
      ch6: "Past participles as adjectives, present perfect tense, absolute superlatives",
      ch7: "Imperfect tense, progressive construction, diminutives & augmentatives",
      ch8: "Regular & irregular preterite, personal a, time expressions with hacer",
      ch9: "Irregular preterites (decir, traer, etc.), pluperfect tense, passive voice",
      ch10: "Future tense, gustar & similar verbs, relative pronouns",
      ch11: "Conditional tense, probability in past, conditional perfect",
      ch12: "Present subjunctive formation & uses, passive se, impersonal se",
      ch13: "Formal & informal commands, nosotros commands, indirect commands with que",
      ch14: "Imperfect subjunctive, si-clauses, pluperfect subjunctive",
      ch15: "Comprehensive review of all tenses, moods, and constructions"
    };
    const catOrder = ["ch1","ch2","ch3","ch4","ch5","ch6","ch7","ch8","ch9","ch10","ch11","ch12","ch13","ch14","ch15"];

    // Compute progress for each unit
    let totalLessons = 0, totalCompleted = 0;
    const unitStats = {};
    for (const cat of catOrder) {
      const lessons = GRAMMAR_LESSONS.filter(p => p.category === cat);
      let done = 0;
      for (const l of lessons) {
        const s = this.getGrammarLessonStatus(l.pattern);
        if (s === "mastered") done++;
      }
      unitStats[cat] = { total: lessons.length, done };
      totalLessons += lessons.length;
      totalCompleted += done;
    }

    // Find the "current" unit — first incomplete one
    let currentUnit = catOrder[catOrder.length - 1];
    for (const cat of catOrder) {
      if (unitStats[cat].done < unitStats[cat].total) { currentUnit = cat; break; }
    }

    let html = '';

    // Overall progress header
    const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
    html += `<div style="text-align:center;margin-bottom:24px;">`;
    html += `<div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Overall Progress</div>`;
    html += `<div style="font-size:28px;font-weight:700;color:var(--text);font-family:'Helvetica Neue',Arial,sans-serif;">${totalCompleted} / ${totalLessons} <span style="font-size:14px;color:var(--text-muted);font-weight:400;">lessons mastered (${overallPct}%)</span></div>`;
    html += `<div style="max-width:300px;margin:10px auto 0;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">`;
    html += `<div style="height:100%;width:${overallPct}%;background:var(--accent);border-radius:3px;transition:width 0.3s;"></div></div>`;
    html += `</div>`;

    // How it works (compact)
    html += `<div class="progression-info" style="max-width:700px;">`;
    html += `<h4>How It Works</h4>`;
    html += `<p>Each lesson has three tabs: <strong>Lesson</strong> (instructional content with paradigm tables, cross-linguistic comparisons, and historical context), <strong>Practice</strong> (exercises in three phases — Repetition, Cloze, Production), and <strong>Review</strong> (mixed exercises drawn from the current lesson and its prerequisites for spaced reinforcement).</p>`;
    html += `<p>Work through units in order for a structured path, or jump to any topic. A lesson is marked <em>mastered</em> when you have completed exercises in all three practice phases correctly. Click any unit below to see its lessons.</p>`;
    html += `</div>`;

    // Path roadmap
    html += `<div class="path-roadmap">`;
    for (const cat of catOrder) {
      const s = unitStats[cat];
      const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
      const isCurrent = cat === currentUnit;
      const isComplete = s.done === s.total && s.total > 0;
      let cls = "path-unit-row";
      if (isComplete) cls += " completed";
      else if (isCurrent) cls += " current";
      html += `<div class="${cls}" data-unitclick="${cat}" role="button" tabindex="0">`;
      html += `<span class="path-unit-pct">${pct}%</span>`;
      html += `<span class="path-unit-name">${catLabels[cat]}</span>`;
      html += `<span class="path-unit-lessons">${s.done}/${s.total} lessons</span>`;
      html += `</div>`;
    }
    html += `</div>`;

    // Suggested next lesson
    const nextLesson = this.getNextRecommendedLesson();
    if (nextLesson) {
      html += `<div style="text-align:center;margin-top:20px;">`;
      html += `<button class="action-btn" id="grammar-start-next" data-pattern="${nextLesson.pattern}" style="padding:10px 24px;background:var(--accent);color:white;">`;
      html += `Continue: ${nextLesson.description} &rarr;</button></div>`;
    }

    // Stats
    html += `<div id="grammar-welcome-stats"></div>`;
    return html;
  }
```

### `getNextRecommendedLesson` — app.js:30543–30553

```javascript
// app.js:30543–30553
  getNextRecommendedLesson() {
    const catOrder = ["ch1","ch2","ch3","ch4","ch5","ch6","ch7","ch8","ch9","ch10","ch11","ch12","ch13","ch14","ch15"];
    for (const cat of catOrder) {
      const lessons = GRAMMAR_LESSONS.filter(p => p.category === cat);
      for (const l of lessons) {
        const status = this.getGrammarLessonStatus(l.pattern);
        if (status !== "mastered") return l;
      }
    }
    return null;
  }

  getGrammarLessonStatus(pattern) {
    // Returns "new", "started", or "mastered"
    let hasAny = false;
    let phases = { repetition: false, cloze: false, production: false };
    for (const key in this.grammarProgress) {
      if (key.startsWith(pattern + ":")) {
        hasAny = true;
        const entry = this.grammarProgress[key];
        if (entry.correct && entry.phase) {
          phases[entry.phase] = true;
        }
      }
    }
    if (!hasAny) return "new";
    if (phases.repetition && phases.cloze && phases.production) return "mastered";
    return "started";
  }
```

### `renderGrammarUnitOverview` — app.js:30575–30661

```javascript
// app.js:30575–30661
  renderGrammarUnitOverview(unitCat) {
    const container = document.getElementById("grammar-content");
    const catLabels = {
      ch1: "Unit 1: Cognates & Noun Basics",
      ch2: "Unit 2: estar, dar & Present -ar",
      ch3: "Unit 3: Present -er/-ir & Comparisons",
      ch4: "Unit 4: Adjective Forms & Demonstratives",
      ch5: "Unit 5: Irregular Verbs & Pronouns",
      ch6: "Unit 6: Past Participles & Present Perfect",
      ch7: "Unit 7: Imperfect & Progressive",
      ch8: "Unit 8: Preterite Tense",
      ch9: "Unit 9: Preterite Irregular & Pluperfect",
      ch10: "Unit 10: Future & gustar",
      ch11: "Unit 11: The Conditional",
      ch12: "Unit 12: Present Subjunctive & Passive",
      ch13: "Unit 13: Imperative",
      ch14: "Unit 14: Imperfect Subjunctive",
      ch15: "Unit 15: Comprehensive Review"
    };
    const unitDescriptions = {
      ch1: "Begin here. This chapter covers recognizing Spanish-English cognates, understanding grammatical gender of nouns, forming plurals, and using definite and indefinite articles correctly.",
      ch2: "This chapter introduces the verbs estar and dar, the present tense conjugation of regular -ar verbs, and negative sentence formation. These are the first active verb forms you will practice.",
      ch3: "Expanding the verb system to -er and -ir conjugations, this chapter also covers comparative and superlative constructions, tener expressions, and the distinction between hay and estar.",
      ch4: "This chapter addresses adjective agreement and position, shortened forms (gran, buen, etc.), and the demonstrative system (este/ese/aquel) as both adjectives and pronouns.",
      ch5: "Common irregular verbs in the present tense (decir, hacer, ir, venir, etc.), along with direct/indirect object pronouns, reflexive pronouns, and prepositional pronoun forms.",
      ch6: "Past participles used as adjectives, the present perfect tense (haber + past participle), and the absolute superlative (-ísimo). This chapter bridges present and past tense systems.",
      ch7: "The imperfect tense for habitual and ongoing past actions, the progressive construction (estar + gerund), and diminutive/augmentative suffixes.",
      ch8: "Regular preterite conjugation for -ar, -er, and -ir verbs, the personal a before human direct objects, and time expressions with hacer.",
      ch9: "Irregular preterite forms (decir, traer, conducir, etc.), the pluperfect tense, and passive voice constructions with ser + past participle.",
      ch10: "The future tense (regular and irregular stems), gustar and similar verbs (faltar, parecer, quedar), and relative pronouns (que, quien, el cual, cuyo).",
      ch11: "The conditional tense for hypothetical and polite expressions, probability in the past, and the conditional perfect (habría + past participle).",
      ch12: "Formation and uses of the present subjunctive, including noun/adjective/adverb clauses, passive se, and impersonal se constructions.",
      ch13: "Formal (usted/ustedes) and informal (tú/vosotros) command forms, nosotros commands, indirect commands with que, and pronoun placement with imperatives.",
      ch14: "The imperfect subjunctive (-ra and -se forms), si-clauses (contrary-to-fact conditions), and the pluperfect subjunctive for past unreal conditions.",
      ch15: "A comprehensive review integrating all tenses, moods, and constructions covered in the preceding fourteen chapters."
    };

    const lessons = GRAMMAR_LESSONS.filter(p => p.category === unitCat);
    let html = `<div class="unit-overview">`;
    html += `<h2>${catLabels[unitCat]}</h2>`;
    html += `<div class="unit-description">${unitDescriptions[unitCat]}</div>`;

    lessons.forEach((l, idx) => {
      const status = this.getGrammarLessonStatus(l.pattern);
      let numClass = "lesson-num";
      if (status === "mastered") numClass += " done";
      else if (status === "started") numClass += " active";
      const statusLabel = status === "mastered" ? "✓ Mastered" : status === "started" ? "In progress" : "Not started";
      html += `<div class="unit-lesson-card" data-lessonpattern="${l.pattern}" role="button" tabindex="0">`;
      html += `<div class="${numClass}">${status === "mastered" ? "✓" : (idx + 1)}</div>`;
      html += `<div class="lesson-info"><strong>${l.description}</strong><span>${l.rule}</span></div>`;
      html += `<span class="lesson-status ${status}">${statusLabel}</span>`;
      html += `</div>`;
    });

    // Prerequisites note for later chapters
    const unitNum = parseInt(unitCat.replace("ch", ""));
    if (unitNum > 1) {
      const prevUnit = "ch" + (unitNum - 1);
      const prevLessons = GRAMMAR_LESSONS.filter(p => p.category === prevUnit);
      const prevDone = prevLessons.filter(l => this.getGrammarLessonStatus(l.pattern) === "mastered").length;
      if (prevDone < prevLessons.length) {
        html += `<div class="progression-info" style="margin-top:16px;max-width:none;">`;
        html += `<p style="margin:0;"><strong>Prerequisite:</strong> ${catLabels[prevUnit]} — ${prevDone}/${prevLessons.length} lessons mastered. Completing earlier units first is recommended for a solid foundation.</p>`;
        html += `</div>`;
      }
    }

    html += `</div>`;
    container.innerHTML = html;

    // Bind lesson card clicks
    container.querySelectorAll("[data-lessonpattern]").forEach(card => {
      card.addEventListener("click", () => {
        const profile = GRAMMAR_LESSONS.find(p => p.pattern === card.dataset.lessonpattern);
        if (profile) {
          this.grammarSelectedProfile = profile;
          this.grammarViewMode = "lesson";
          this.grammarCurrentIdx = 0;
          this.grammarRetrying = false;
          this.generateGrammarExercises();
          this.renderGrammarSidebar();
          this.renderGrammarContent();
        }
      });
    });
  }
```

### `startReviewSession` — app.js:30764–30802

```javascript
// app.js:30764–30802
  startReviewSession(patterns, count) {
    // Generate review exercises from multiple patterns, mixing phases
    const allExercises = [];
    const phases = ["repetition", "cloze", "production"];

    for (const pattern of patterns) {
      const profile = GRAMMAR_LESSONS.find(p => p.pattern === pattern);
      if (!profile) continue;

      // Temporarily set selected profile to generate exercises for this pattern
      const origProfile = this.grammarSelectedProfile;
      this.grammarSelectedProfile = profile;
      this.generateGrammarExercises();

      for (const ex of this.grammarExercises) {
        // Assign a random phase for review variety
        const phase = phases[Math.floor(Math.random() * phases.length)];
        allExercises.push({ ...ex, reviewPhase: phase });
      }
      this.grammarSelectedProfile = origProfile;
    }

    // Shuffle and cap
    for (let i = allExercises.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allExercises[i], allExercises[j]] = [allExercises[j], allExercises[i]];
    }
    this.reviewExercises = allExercises.slice(0, count);
    this.reviewCurrentIdx = 0;
    this.reviewCorrect = 0;
    this.reviewTotal = 0;
    this.reviewSessionActive = true;
    this.reviewSessionId = Date.now();

    // Regenerate exercises for the main profile
    this.generateGrammarExercises();

    this.renderGrammarContent();
  }
```

### `_injectReviewBanner` — app.js:31673–31695

```javascript
// app.js:31673–31695
  _injectReviewBanner(type) {
    if (this._reviewBannerDismissed[type]) return;
    const count = this.scheduler.overdueCount(type + "_");
    if (count === 0) return;
    const containerId = type === "vocab" ? "vocab-content" : "grammar-content";
    const container = document.getElementById(containerId);
    if (!container || container.querySelector(".review-due-banner")) return;
    const noun = type === "vocab" ? "words" : "items";
    const banner = document.createElement("div");
    banner.className = "review-due-banner";
    banner.innerHTML = `<span>${count} ${noun} due for review</span><button class="rdb-go">Review now</button><button class="rdb-dismiss" aria-label="Dismiss">&#10005;</button>`;
    banner.querySelector(".rdb-go").addEventListener("click", () => {
      this._reviewBannerDismissed[type] = true;
      banner.remove();
      if (type === "vocab") this.startVocabReview();
      else this.startGrammarReview();
    });
    banner.querySelector(".rdb-dismiss").addEventListener("click", () => {
      this._reviewBannerDismissed[type] = true;
      banner.remove();
    });
    container.prepend(banner);
  }
```

### `_renderGlossedPassage` — app.js:31752–31775

```javascript
// app.js:31752–31775
  // Renders a passage with inline glosses for unmastered vocab, skipping the target token.
  // Does NOT interact with glossSeen tracking — read-only check of FSRS state.
  _renderGlossedPassage(text, skipToken) {
    if (!text) return "";
    const tokens = this.tokenize(text);
    const skipLower = skipToken ? skipToken.toLowerCase().replace(/[.,;:!?""''„"()\[\]]/g, "") : null;
    let html = "";
    for (const tok of tokens) {
      if (tok.type !== "word") { html += this.escapeHtml(tok.text); continue; }
      const lower = tok.text.toLowerCase();
      if (skipLower && lower === skipLower) { html += this.escapeHtml(tok.text); continue; }
      const entry = this.lookupWord(tok.text);
      if (entry) {
        const glossIsUseful = entry.gloss.toLowerCase().trim() !== lower;
        const seenKey = entry.lemma ? entry.lemma.toLowerCase() : lower;
        if (glossIsUseful && !this._isVocabMastered(seenKey)) {
          html += `<span class="word-wrapper"><span class="word-text">${this.escapeHtml(tok.text)}</span>` +
                  `<span class="tooltip">${this.escapeHtml(entry.gloss)}</span>` +
                  `<span class="first-gloss">${this.escapeHtml(entry.gloss)}</span></span>`;
          continue;
        }
      }
      html += this.escapeHtml(tok.text);
    }
    return html;
  }
```

### `renderGrammarStats` — app.js:31825–31881

```javascript
// app.js:31825–31881
  renderGrammarStats(container, append) {
    if (!container) container = document.getElementById("grammar-content");
    if (!container) return;

    const phases = ["repetition", "cloze", "production"];
    const phaseLabels = { repetition: "Repetition", cloze: "Cloze", production: "Production" };

    // Collect stats per pattern per phase (cached for performance)
    if (!this._grammarStatsCache) {
      const stats = {};
      for (const key in this.grammarProgress) {
        const entry = this.grammarProgress[key];
        if (!stats[entry.pattern]) stats[entry.pattern] = {};
        if (!stats[entry.pattern][entry.phase]) stats[entry.pattern][entry.phase] = { correct: 0, total: 0 };
        // Support both aggregate format (total: number) and legacy single-attempt format (correct: boolean)
        const entryTotal = typeof entry.total === 'number' ? entry.total : 1;
        const entryCorrect = typeof entry.correct === 'number' ? entry.correct : (entry.correct ? 1 : 0);
        stats[entry.pattern][entry.phase].total += entryTotal;
        stats[entry.pattern][entry.phase].correct += entryCorrect;
      }
      this._grammarStatsCache = stats;
    }
    const stats = this._grammarStatsCache;

    if (Object.keys(stats).length === 0) return;

    let html = `<div class="grammar-stats-panel"><h4>Progress Summary</h4>`;
    html += `<table class="grammar-stats-table"><thead><tr><th>Pattern</th>`;
    for (const p of phases) html += `<th>${phaseLabels[p]}</th>`;
    html += `</tr></thead><tbody>`;

    for (const profile of GRAMMAR_LESSONS) {
      const pStats = stats[profile.pattern];
      if (!pStats) continue;
      html += `<tr><td>${profile.description}</td>`;
      for (const p of phases) {
        const s = pStats[p];
        if (s) {
          const pct = Math.round((s.correct / s.total) * 100);
          html += `<td>${s.correct}/${s.total} (${pct}%)</td>`;
        } else {
          html += `<td>—</td>`;
        }
      }
      html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    if (append) {
      container.innerHTML += html;
    } else {
      const existing = container.querySelector(".grammar-stats-panel");
      if (existing) existing.remove();
      container.insertAdjacentHTML("beforeend", html);
    }
  }
```

---

## Grammar CSS

Source: `index.html` lines 1026–1553

```css
/* Grammar Mode */
#grammar-content {
  padding: 32px 48px;
  max-width: 900px;
  margin: 0 auto;
  font-family: 'Georgia', 'Times New Roman', serif;
}
.grammar-phase-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
}
.grammar-phase-btn {
  padding: 6px 14px;
  font-size: 11px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--white);
  color: var(--text-muted);
  border-radius: 3px;
  transition: all 0.15s;
}
.grammar-phase-btn:hover { background: var(--bg); color: var(--text); }
.grammar-phase-btn.active {
  background: var(--accent);
  color: var(--white);
  border-color: var(--accent);
}
.thematic-exercise {
  margin-bottom: 8px;
}
.thematic-source-badge {
  display: inline-block;
  margin-bottom: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(139,69,19,0.10);
  color: var(--accent);
  border: 1px solid rgba(139,69,19,0.20);
}
.thematic-exercise[data-track="neruda"] .thematic-source-badge {
  background: rgba(80,40,120,0.10);
  color: #6b3fa0;
  border-color: rgba(80,40,120,0.20);
}
.thematic-exercise[data-track="minke"] .thematic-source-badge {
  background: rgba(30,90,40,0.10);
  color: #2d6a35;
  border-color: rgba(30,90,40,0.20);
}
.grammar-passage {
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 17px;
  line-height: 1.9;
}
/* Thematic exercises may contain inline glosses — give extra line height */
.thematic-exercise .grammar-passage {
  line-height: 2.6;
}
.thematic-exercise .grammar-passage .word-wrapper {
  margin-bottom: 0;
}
.grammar-passage .grammar-highlight {
  background: rgba(139,69,19,0.15);
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
  color: var(--accent);
}
.grammar-passage .grammar-blank {
  display: inline-block;
  min-width: 80px;
  border-bottom: 2px dashed var(--accent);
  padding: 0 4px;
  color: var(--accent);
  font-weight: 600;
  text-align: center;
}
.grammar-passage-ref {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: var(--text-muted);
  font-style: italic;
}
.grammar-rule-statement {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(139,69,19,0.04);
  border-left: 3px solid var(--accent);
  border-radius: 0 4px 4px 0;
  font-size: 13px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text);
}
.grammar-paradigm-toggle {
  display: inline-block;
  padding: 5px 12px;
  font-size: 11px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--white);
  color: var(--text-muted);
  margin-bottom: 16px;
  transition: all 0.15s;
}
.grammar-paradigm-toggle:hover { border-color: var(--accent); color: var(--accent); }
.grammar-paradigm-panel {
  display: none;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.grammar-paradigm-panel.visible { display: block; }
.grammar-paradigm-panel h4 {
  font-size: 12px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent);
  margin-bottom: 10px;
}
/* Paradigm table */
.paradigm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
.paradigm-table th, .paradigm-table td {
  padding: 6px 12px;
  border: 1px solid var(--border);
  text-align: left;
}
.paradigm-table th {
  background: var(--sidebar-bg);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}
.paradigm-table td.paradigm-current {
  background: rgba(139,69,19,0.1);
  font-weight: 600;
  color: var(--accent);
}
.paradigm-table td.paradigm-correct {
  background: rgba(45,106,45,0.1);
  font-weight: 600;
  color: var(--success);
}
.grammar-question {
  margin-bottom: 16px;
  font-size: 14px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
}
.grammar-question strong { color: var(--accent); }
.grammar-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}
.grammar-option-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 16px;
  font-size: 13px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--white);
  color: var(--text);
  transition: all 0.15s;
}
.grammar-option-btn:hover:not(:disabled) { border-color: var(--accent); background: rgba(139,69,19,0.03); }
.grammar-option-btn.selected { border-color: var(--accent); background: rgba(139,69,19,0.08); font-weight: 600; }
.grammar-option-btn.correct { border-color: var(--success); background: rgba(45,106,45,0.08); color: var(--success); font-weight: 600; }
.grammar-option-btn.incorrect { border-color: var(--error); background: rgba(139,26,26,0.06); color: var(--error); text-decoration: line-through; }
.grammar-option-btn:disabled { cursor: default; opacity: 0.85; }
.grammar-production-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  font-family: 'Georgia', serif;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--white);
  color: var(--text);
  margin-bottom: 12px;
}
.grammar-production-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(59,111,160,0.2); }
.grammar-production-input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.grammar-production-input:disabled { background: var(--bg); }
.grammar-action-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.grammar-feedback {
  display: none;
  padding: 16px 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 13px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.65;
}
.grammar-feedback.visible { display: block; }
.grammar-feedback.correct-feedback {
  background: rgba(45,106,45,0.08);
  border: 1px solid rgba(45,106,45,0.2);
  color: var(--success);
}
.grammar-feedback.incorrect-feedback {
  background: rgba(139,26,26,0.08);
  border: 1px solid rgba(139,26,26,0.2);
}
.grammar-feedback h4 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
/* Stats panel */
.grammar-stats-panel {
  margin-top: 24px;
  padding: 16px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.grammar-stats-panel h4 {
  font-size: 12px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent);
  margin-bottom: 10px;
}
.grammar-stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
.grammar-stats-table th, .grammar-stats-table td {
  padding: 5px 10px;
  border: 1px solid var(--border);
  text-align: center;
}
.grammar-stats-table th {
  background: var(--sidebar-bg);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}
.grammar-stats-table td:first-child { text-align: left; font-weight: 500; }
.grammar-no-exercises {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 13px;
  line-height: 1.7;
}
/* Progression info box */
.progression-info {
  margin: 20px auto;
  max-width: 540px;
  padding: 14px 18px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-muted);
  text-align: left;
}
.progression-info h4 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text);
  margin-bottom: 8px;
}
.progression-info p { margin-bottom: 6px; }
.progression-info p:last-child { margin-bottom: 0; }
/* Active selection indicator */
.grammar-active-selection {
  margin-bottom: 16px;
  padding: 8px 12px;
  background: var(--sidebar-bg);
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: var(--text-muted);
}
/* Unit progress bar (sidebar) */
.unit-progress-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  margin: 4px 12px 2px 24px;
  overflow: hidden;
}
.unit-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}
/* Lesson status badges in sidebar */
.lesson-status {
  display: inline-block;
  font-size: 9px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: auto;
  flex-shrink: 0;
}
.lesson-status.new { background: var(--border); color: var(--text-muted); }
.lesson-status.started { background: rgba(139,69,19,0.12); color: var(--accent); }
.lesson-status.mastered { background: rgba(40,120,60,0.12); color: #287c3c; }
/* Unit overview panel */
.unit-overview {
  margin: 0 auto;
  max-width: 900px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
.unit-overview h2 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--text);
}
.unit-overview .unit-description {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 16px;
}
/* Lesson card (unit overview) */
.unit-lesson-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.unit-lesson-card:hover { border-color: var(--accent); }
.unit-lesson-card .lesson-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--border);
  color: var(--text-muted);
}
.unit-lesson-card .lesson-num.done {
  background: rgba(40,120,60,0.15);
  color: #287c3c;
}
.unit-lesson-card .lesson-num.active {
  background: var(--accent);
  color: var(--white);
}
.unit-lesson-card .lesson-info {
  flex: 1;
  min-width: 0;
}
.unit-lesson-card .lesson-info strong {
  display: block;
  font-size: 13px;
  color: var(--text);
}
.unit-lesson-card .lesson-info span {
  font-size: 11px;
  color: var(--text-muted);
}
/* Review mode config panel */
.review-config {
  margin: 20px auto;
  max-width: 600px;
  padding: 20px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
.review-config h3 {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.review-config label {
  display: block;
  font-size: 13px;
  margin-bottom: 8px;
  cursor: pointer;
}
.review-config label input { margin-right: 6px; }
.review-start-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: var(--accent);
  color: var(--white);
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-weight: 600;
  cursor: pointer;
}
.review-start-btn:hover { opacity: 0.9; }
/* Welcome screen path roadmap */
.path-roadmap {
  margin: 20px auto;
  max-width: 700px;
}
.path-unit-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-left: 3px solid var(--border);
  margin-bottom: 2px;
  font-size: 12px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  cursor: pointer;
  transition: background 0.1s;
}
.path-unit-row:hover { background: var(--sidebar-bg); }
.path-unit-row.current { border-left-color: var(--accent); background: rgba(139,69,19,0.04); }
.path-unit-row.completed { border-left-color: #287c3c; }
.path-unit-pct {
  width: 40px;
  text-align: right;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 11px;
}
.path-unit-name { flex: 1; color: var(--text); }
.path-unit-lessons { color: var(--text-muted); font-size: 11px; }
.grammar-active-selection strong { color: var(--text); }
/* Lesson panel (rendered inside grammar-content) */
.grammar-lesson-panel { padding: 24px; background: var(--white); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 20px; }
.grammar-lesson-section { margin-bottom: 20px; }
.grammar-lesson-section:last-child { margin-bottom: 0; }
.grammar-lesson-section h3 { font-size: 14px; font-weight: 700; color: var(--accent); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.grammar-lesson-section p { font-size: 14px; line-height: 1.7; color: var(--text); }
.grammar-lesson-keypoints { list-style: disc; padding-left: 20px; font-size: 14px; line-height: 1.7; }
.grammar-lesson-keypoints li { margin-bottom: 6px; }
.grammar-lesson-comparison { background: #f0f4f8; padding: 16px; border-radius: 4px; font-size: 14px; line-height: 1.7; color: var(--text); }
.grammar-lesson-historical { border-left: 3px solid var(--accent); padding-left: 16px; font-style: italic; font-size: 13px; line-height: 1.7; color: var(--text-muted); }
```

---

## Grammar data structures

### Representative `GRAMMAR_LESSONS` row — all fields (app.js:14697–14828)

```javascript
// First entry of GRAMMAR_LESSONS, showing the complete object shape.
// All 70 entries follow the same schema.
{
  category: "ch1",                          // string — unit key (ch1–ch15)
  pattern: "cognates_definition",           // string — unique lesson ID, used as storage key prefix
  description: "Cognates—Definition",       // string — display name in sidebar and overview cards
  rule: "Cognates are words descended...",  // string — one-sentence rule displayed in lesson header
  lessonContent: {
    introduction: "Cognates represent...",  // string — multi-paragraph lesson prose
    keyPoints: [                            // string[] — bullet points
      "True cognates (nación/nation, ...) derive from shared Latin roots...",
      "Cognate recognition follows predictable phonological patterns...",
      "Spanish's unique linguistic heritage includes approximately 4,000 Arabic loanwords..."
    ],
    comparison: "French cognates are...",   // string — cross-linguistic comparison section
    historicalNote: "The vast Spanish-English cognate inventory..." // string — historical context
  },
  paradigm: {                               // Record<string, string> — form → gloss map rendered in paradigm table
    "nación": "nation (government/people)",
    "universidad": "university (higher education)",
    // ... typically 6–12 entries
  },
  paradigmLabels: {                         // { rows: string[], cols: string[] } — table header labels
    rows: ["Spanish Cognate"],
    cols: ["English Equivalent"]
  },
  stems: {                                  // Record<string, string|null> — stem keys used by generateForms
    "cognate": null
  },
  generateForms: function() { ... },        // () => Record<string, string> — produces paradigm entries
  exercises: [ ... ],                       // exercise objects (see below) — static pre-authored items
  thematicSentences: [ ... ]                // thematic-passage objects linked to this pattern (optional)
}
```

**Exercise object shape** (inside `exercises[]`):
```javascript
{
  id: "ex_cognate_01",                      // string — unique exercise ID for FSRS keying
  type: "paradigm",                         // "paradigm" | "thematic"
  question: "...",                          // string — question text
  options: ["A", "B", "C", "D"],           // string[] — MC options (repetition/cloze phases)
  correctAnswer: "A",                       // string — correct option value
  explanation: "...",                       // string — shown after answer
  feedback: "...",                          // string — extended feedback
  // For thematic exercises only:
  sentence: {
    id: "sent_borges_01",                   // string — FSRS key suffix
    track: "borges",                        // "borges" | "neruda" | "minke"
    sourceLabel: "El jardín...",
    spanish: "La identidad del hombre...",
    clozeDisplay: "La ___ del hombre...",
    clozeAnswer: "identidad",
    targetToken: "identidad",
    identifyQuestion: "...",
    identifyOptions: ["A","B","C","D"],
    identifyAnswer: "A"
  }
}
```

### All 70 lesson patterns with unit assignment

| # | Unit | `category` | `pattern` |
|---|---|---|---|
| 1 | Unit 1 | ch1 | `cognates_definition` |
| 2 | Unit 1 | ch1 | `noun_gender_number` |
| 3 | Unit 1 | ch1 | `possession_de` |
| 4 | Unit 1 | ch1 | `adjectives_cognate_patterns` |
| 5 | Unit 1 | ch1 | `adjective_word_order_agreement` |
| 6 | Unit 1 | ch1 | `cognate_adverbs` |
| 7 | Unit 1 | ch1 | `cognate_verbs_participles` |
| 8 | Unit 1 | ch1 | `ser_personal_pronouns` |
| 9 | Unit 1 | ch1 | `assorted_cognates` |
| 10 | Unit 1 | ch1 | `numbers_1_200` |
| 11 | Unit 1 | ch1 | `prepositions_adverbs_conjunctions` |
| 12 | Unit 2 | ch2 | `estar_dar_verbs` |
| 13 | Unit 2 | ch2 | `present_ar_verbs` |
| 14 | Unit 2 | ch2 | `comparisons_equality` |
| 15 | Unit 2 | ch2 | `superlatives` |
| 16 | Unit 2 | ch2 | `adjectives_as_nouns` |
| 17 | Unit 2 | ch2 | `numbers_200_1000000` |
| 18 | Unit 2 | ch2 | `adverbs_casi_muy_solo_mucho_ademas` |
| 19 | Unit 3 | ch3 | `present_er_ir_verbs` |
| 20 | Unit 3 | ch3 | `ordinal_numbers_1_10` |
| 21 | Unit 3 | ch3 | `verbs_tener_influir` |
| 22 | Unit 3 | ch3 | `possessive_adjectives` |
| 23 | Unit 3 | ch3 | `comparisons_inequality` |
| 24 | Unit 3 | ch3 | `adverbs_prepositions` |
| 25 | Unit 4 | ch4 | `grande_gran_shortened_adjectives` |
| 26 | Unit 4 | ch4 | `estar_past_participle` |
| 27 | Unit 4 | ch4 | `determiners_demonstrative_pronouns` |
| 28 | Unit 4 | ch4 | `comparative_superlative_irregular` |
| 29 | Unit 4 | ch4 | `unequal_comparisons` |
| 30 | Unit 4 | ch4 | `unequal_comparisons_irregular` |
| 31 | Unit 4 | ch4 | `ellipses_pronouns` |
| 32 | Unit 5 | ch5 | `irregular_verbs_stem_changes` |
| 33 | Unit 5 | ch5 | `verb_ir` |
| 34 | Unit 5 | ch5 | `que_conjunction` |
| 35 | Unit 5 | ch5 | `personal_a` |
| 36 | Unit 5 | ch5 | `direct_indirect_object_pronouns` |
| 37 | Unit 5 | ch5 | `reflexive_verbs_uses_se` |
| 38 | Unit 6 | ch6 | `past_participles_adjectives` |
| 39 | Unit 6 | ch6 | `stem_changing_verbs_e_ie` |
| 40 | Unit 6 | ch6 | `relative_pronouns` |
| 41 | Unit 6 | ch6 | `weather_expressions_hacer` |
| 42 | Unit 6 | ch6 | `present_perfect` |
| 43 | Unit 7 | ch7 | `imperfect_tense_regular_irregular` |
| 44 | Unit 7 | ch7 | `present_participle_progressive` |
| 45 | Unit 7 | ch7 | `commands_imperative_regular` |
| 46 | Unit 8 | ch8 | `preterite_regular_verbs` |
| 47 | Unit 8 | ch8 | `negative_words` |
| 48 | Unit 8 | ch8 | `preterite_irregular_u_stem` |
| 49 | Unit 8 | ch8 | `preterite_ser_ir_dar` |
| 50 | Unit 9 | ch9 | `more_irregular_preterite` |
| 51 | Unit 9 | ch9 | `interrogative_pronouns` |
| 52 | Unit 9 | ch9 | `imperfect_vs_preterite_review` |
| 53 | Unit 9 | ch9 | `pluperfect_tense` |
| 54 | Unit 10 | ch10 | `future_tense_formation` |
| 55 | Unit 10 | ch10 | `gustar_indirect_objects` |
| 56 | Unit 10 | ch10 | `future_probability` |
| 57 | Unit 10 | ch10 | `pronouns_after_prepositions` |
| 58 | Unit 11 | ch11 | `conditional_present_past` |
| 59 | Unit 11 | ch11 | `conditional_conjecture_past` |
| 60 | Unit 12 | ch12 | `subjunctive_indirect_commands` |
| 61 | Unit 12 | ch12 | `subjunctive_adverbial_conjunctions` |
| 62 | Unit 12 | ch12 | `present_perfect_subjunctive` |
| 63 | Unit 12 | ch12 | `passive_voice` |
| 64 | Unit 13 | ch13 | `imperative_familiar_commands` |
| 65 | Unit 13 | ch13 | `imperative_polite_commands` |
| 66 | Unit 14 | ch14 | `imperfect_subjunctive_formation` |
| 67 | Unit 14 | ch14 | `imperfect_subjunctive_conditional` |
| 68 | Unit 14 | ch14 | `imperfect_subjunctive_si_clauses` |
| 69 | Unit 14 | ch14 | `pluperfect_subjunctive` |
| 70 | Unit 15 | ch15 | `comprehensive_grammar_review` |

**Unit lesson counts:** ch1=11, ch2=7, ch3=6, ch4=7, ch5=6, ch6=5, ch7=3, ch8=4, ch9=4, ch10=4, ch11=2, ch12=4, ch13=2, ch14=4, ch15=1 → **total 70**

### `taller_grammarProgress` value shape

The runtime key in `this.grammarProgress` is `"${pattern}:${phase}"`.
Persisted to `localStorage.taller_grammarProgress` as a JSON object.

```javascript
// localStorage key: "taller_grammarProgress"
// Value: JSON.stringify(grammarProgress) where grammarProgress is:
{
  // One entry per (pattern × phase) pair that has been practiced
  "cognates_definition:repetition": {
    correct: 3,           // number — cumulative correct answers
    total: 4,             // number — cumulative attempts
    phase: "repetition",  // "repetition" | "cloze" | "production"
    pattern: "cognates_definition",  // string — redundant copy for stats scan
    lastSeen: 1714000000000          // number — Date.now() at last attempt
  },
  "cognates_definition:cloze": { ... },
  "cognates_definition:production": { ... },
  // ...
}
```

**Mastery rule** (`getGrammarLessonStatus`): a lesson is `"mastered"` when entries for all three phases (`repetition`, `cloze`, `production`) exist **and** each has `correct > 0`. Otherwise `"started"` (any entry exists) or `"new"` (no entries).

### `taller_fsrsState` value shape + `ReviewScheduler` interface

The FSRS state backs spaced-repetition scheduling for both vocab and grammar.
Persisted to `localStorage.taller_fsrsState` as a JSON object.

```javascript
// localStorage key: "taller_fsrsState"
// Value: JSON.stringify(fsrsState) where fsrsState is:
{
  // Grammar paradigm entry key: "grammar_${pattern}_${paradigmKey}"
  "grammar_cognates_definition_nación": {
    difficulty: 5.0,       // number — FSRS difficulty (initial 5.0)
    stability: 1.0,        // number — FSRS stability in days
    lastReview: null,      // null | ISO-8601 string — timestamp of last review
    reps: 0,               // number — total review count
    lapses: 0,             // number — number of "again" responses
    scheduledDays: 0,      // number — days until next review
    state: 0               // number — FSRS state: 0=New, 1=Learning, 2=Review, 3=Relearning
  },
  // Grammar thematic sentence key: "grammar_${sentence.id}"
  "grammar_sent_borges_01": { ... },
  // Vocab key: "vocab_${wordKey}"
  "vocab_nación": { ... }
}
```

**`ReviewScheduler` interface** (app.js:26486–26546):

```javascript
class ReviewScheduler {
  getCard(key)              // → card object (creates default if absent)
  record(key, correct)      // schedules via FSRS; correct=true → rating 3, false → rating 1
  retrievability(key)       // → float 0–1 (probability of recall)
  sortByPriority(keys)      // → string[] sorted: overdue (R<0.9) first, then new, then upcoming
  getDueItems(prefix)       // → string[] of seen keys with prefix, sorted by priority
  overdueCount(prefix)      // → number of overdue items (R<0.9) with prefix
}
// Prefixes: "grammar_" for grammar items, "vocab_" for vocab items
```

---

## Storage keys + migration reference

These are the exact `localStorage` key names used by the Spanish app.
The German port must decide whether to share keys (shared-localStorage tab sync) or namespace separately.

| Logical name | `localStorage` key | IDB mirror key | Description |
|---|---|---|---|
| Grammar progress | `taller_grammarProgress` | `taller_grammarProgress` | Per-(pattern×phase) attempt stats |
| FSRS state | `taller_fsrsState` | `taller_fsrsState` | FSRS card objects for all vocab + grammar |
| Vocab mastery | `taller_vocabMastery` | `taller_vocabMastery` | Vocab mastery flags |
| Vocab progress | `taller_vocabProgress` | `taller_vocabProgress` | Vocab attempt stats |
| Gloss seen | `taller_glossSeen.v1` | `taller_glossSeen.v1` | Inline gloss seen tracking |

**Save/load implementation** (app.js:26724–26730):
```javascript
save(key, val) {
  try { localStorage.setItem("taller_" + key, JSON.stringify(val)); } catch(e) {
    if (e.name === 'QuotaExceededError') { alert("Storage limit reached!..."); }
  }
  TallerIDB.set("taller_" + key, val); // IDB mirror for iOS resilience
}
load(key) { try { return JSON.parse(localStorage.getItem("taller_" + key)); } catch(e) { return null; } }
```

**German port migration note**: If the German app uses a different app-name prefix (e.g. `werkstatt_` instead of `taller_`), the IDB restore schema and all `save("grammarProgress", ...)` / `save("fsrsState", ...)` call sites must be updated consistently. The `_idbRestoreSchema` getter (app.js:26732–26759) lists all restorable keys — port that list verbatim, changing only the prefix.

---

## Read-only notice

This file is a **read-only reference extract** created 2026-04-24 from the Spanish app's source at commit `0101e2df2b3de45115e2dc6c31bc68ab801eb1ee`. It exists solely to give the German team a verbatim snapshot of the grammar-tab implementation for use as a parity-port template.

**Do not:**
- Edit this file to fix bugs or improve the Spanish code — changes belong in the Spanish repo.
- Use this file as the running source of truth after beginning implementation — re-read the Spanish repo's current `scripts/app.js` if the Spanish team has made changes.
- Commit changes to the Spanish repo from this extract.

**Source of truth**: `/Volumes/macOS_external/cameronhubbard/Documents/Claude/Projects/Spanish/gh-pages-deploy/scripts/app.js`
