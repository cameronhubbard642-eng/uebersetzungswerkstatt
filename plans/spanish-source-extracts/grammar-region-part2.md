# Spanish Grammar-Tab Source Extract — Part 2

> **READ-ONLY REFERENCE** — See §Read-only notice at bottom of file.

---

## Source attribution

| Field | Value |
|---|---|
| Spanish repo | `gh-pages-deploy` |
| Commit SHA | `0101e2df2b3de45115e2dc6c31bc68ab801eb1ee` |
| Commit date | 2026-04-21 |
| Commit message | `feat(WP-AUD-2 PR-1): extract inline scripts; drop script-src 'unsafe-inline' (#35)` |
| Primary source file | `scripts/app.js` (32,791 lines) |
| CSS source file | `index.html` |

### Line ranges extracted

| Symbol | File | Lines |
|---|---|---|
| `generateGrammarExercises` | `scripts/app.js` | 29206–29303 |
| `renderThematicExercise` | `scripts/app.js` | 30997–31053 |
| `renderRepetitionPhase` | `scripts/app.js` | 31055–31078 |
| `renderClozePhase` | `scripts/app.js` | 31080–31103 |
| `renderProductionPhase` | `scripts/app.js` | 31105–31127 |
| `_getEffectiveThematicSubtype` | `scripts/app.js` | 31709–31729 |
| `_getEffectiveParadigmPhase` | `scripts/app.js` | 31731–31735 |
| `renderParadigmTable` | `scripts/app.js` | 31152–31201 |
| `bindGrammarEvents` | `scripts/app.js` | 31322–31402 |
| `bindGrammarReviewEvents` | `scripts/app.js` | 30733–30762 |

---

## Render functions

### `generateGrammarExercises` — app.js:29206–29303

```javascript
// app.js:29206–29303
  generateGrammarExercises() {
    const profile = this.grammarSelectedProfile;
    if (!profile) { this.grammarExercises = []; return; }
    this.grammarSessionId = Date.now();
    // Feature 2: reset per-session thematic demotion state
    this._thematicSessionDemotions = {};
    this._thematicSessionFailures = {};

    const paradigm = profile.paradigm || {};
    const entries = Object.entries(paradigm);
    const _hasThematic = Object.values(profile.thematicSentences || {}).some(arr => arr.length > 0);
    if (entries.length === 0 && !_hasThematic) { this.grammarExercises = []; return; }

    let exercises = [];

    // --- B7/C7: Thematic sentence exercises (contextual, track-specific) ---
    // In review mode, include all tracks; in normal mode, use current track only
    const track = this.currentTextId || "borges";
    let thematicPool;
    if (this.grammarReviewMode) {
      // C7: Collect sentences from all tracks for review
      thematicPool = [];
      for (const arr of Object.values(profile.thematicSentences || {})) {
        thematicPool.push(...arr);
      }
    } else {
      thematicPool = (profile.thematicSentences || {})[track] || [];
    }
    const shuffledThematic = [...thematicPool];
    for (let i = shuffledThematic.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledThematic[i], shuffledThematic[j]] = [shuffledThematic[j], shuffledThematic[i]];
    }
    for (const s of shuffledThematic) {
      const subtypes = s.exerciseTypes && s.exerciseTypes.length > 0 ? s.exerciseTypes : ["cloze"];
      const subtype = subtypes[Math.floor(Math.random() * subtypes.length)];
      exercises.push({ type: "thematic", subtype, sentence: s, profile });
    }

    // --- Paradigm exercises fill remaining slots ---
    // Build paradigm exercises (shuffle first for distractor variety)
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    exercises.push(...shuffled.map(([key, value]) => ({
      type: "paradigm",
      profile: profile,
      paradigmKey: key,
      paradigmValue: value,
      paradigm: paradigm
    })));

    // Pad to at least 8 with a second shuffled pass
    if (exercises.length < 8) {
      const extra = [...shuffled];
      for (let i = extra.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [extra[i], extra[j]] = [extra[j], extra[i]];
      }
      for (const [key, value] of extra) {
        exercises.push({ type: "paradigm", profile, paradigmKey: key, paradigmValue: value, paradigm });
      }
    }

    // B9/C7: re-order by FSRS priority for grammar practice/review modes
    // Paradigm key: "grammar_<pattern>_<paradigmKey>"; Thematic key: "grammar_<sentence.id>"
    function _grammarFsrsKey(ex) {
      if (ex.type === "paradigm" && ex.paradigmKey) {
        return "grammar_" + ex.profile.pattern + "_" + ex.paradigmKey;
      } else if (ex.type === "thematic" && ex.sentence && ex.sentence.id) {
        return "grammar_" + ex.sentence.id;
      }
      return null;
    }
    const _gmap = {};
    exercises.forEach(ex => {
      const k = _grammarFsrsKey(ex);
      if (k) {
        if (!_gmap[k]) _gmap[k] = [];
        _gmap[k].push(ex);
      }
    });
    const _uniqueKeys = [...new Set(exercises.map(ex => _grammarFsrsKey(ex)).filter(Boolean))];
    const _sortedKeys = this.scheduler.sortByPriority(_uniqueKeys);
    const _reordered = [];
    _sortedKeys.forEach(k => { if (_gmap[k]) _reordered.push(..._gmap[k]); });
    // append any exercises without valid FSRS keys
    exercises.forEach(ex => {
      const k = _grammarFsrsKey(ex);
      if (!k || !_sortedKeys.includes(k)) _reordered.push(ex);
    });
    exercises = _reordered;

    this.grammarExercises = exercises.slice(0, 20);
  }
```

### `renderThematicExercise` — app.js:30997–31053

```javascript
// app.js:30997–31053
  renderThematicExercise(ex) {
    const s = ex.sentence;
    const trackLabel = { borges: "Borges", neruda: "Neruda", minke: "Minke" }[s.track] || s.track;
    const tierLabel = { repetition: "Recognition", cloze: "Cloze", production: "Production" }[ex.subtype] || "";
    let html = `<div class="thematic-exercise" data-track="${this.escapeHtml(s.track)}">`;
    html += `<div class="thematic-source-badge">${this.escapeHtml(trackLabel)} — ${this.escapeHtml(s.sourceLabel)}<span class="thematic-tier-badge">${tierLabel}</span></div>`;

    // Helper: render clozeDisplay with blank and inline glosses
    const _glossedClozePassage = () => {
      const parts = s.clozeDisplay.split("___");
      return parts.map(p => this._renderGlossedPassage(p, s.targetToken)).join('<span class="grammar-blank">___</span>');
    };

    if (ex.subtype === "cloze") {
      html += `<div class="grammar-rule-statement">${this.escapeHtml(ex.profile.rule)}</div>`;
      html += `<div class="grammar-passage">${_glossedClozePassage()}</div>`;
      html += `<div class="grammar-question">Select the correct form for the blank:</div>`;
      // Build shuffled options from pre-authored answer + distractors
      const opts = [s.clozeAnswer, ...s.clozeDistractors];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      html += `<div class="grammar-options" id="grammar-options">`;
      for (const opt of opts) {
        html += `<button class="grammar-option-btn" data-value="${this.escapeHtml(opt)}">${this.escapeHtml(opt)}</button>`;
      }
      html += `</div>`;
    } else if (ex.subtype === "production") {
      // Feature 2: production mode — free-type the blank using cloze data
      html += `<div class="grammar-rule-statement">${this.escapeHtml(ex.profile.rule)}</div>`;
      html += `<div class="grammar-passage">${_glossedClozePassage()}</div>`;
      html += `<div class="grammar-question">Type the correct form for the blank:</div>`;
      html += `<input type="text" class="grammar-production-input" id="grammar-production-input" aria-label="Type your answer" placeholder="Type your answer..." autocomplete="off" autocorrect="off" autocapitalize="off">`;
      html += `<div class="grammar-action-row">`;
      html += `<button class="action-btn" id="grammar-submit-btn" style="background:var(--accent);color:white;">Submit</button>`;
      html += `</div>`;
    } else {
      // identify / repetition subtype
      html += `<div class="grammar-rule-statement">${this.escapeHtml(ex.profile.rule)}</div>`;
      html += `<div class="grammar-passage">${this._renderGlossedPassage(s.spanishShort, s.targetToken)}</div>`;
      html += `<div class="grammar-question">${this.escapeHtml(s.identifyQuestion)}</div>`;
      const opts = [...s.identifyOptions];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      html += `<div class="grammar-options" id="grammar-options">`;
      for (const opt of opts) {
        html += `<button class="grammar-option-btn" data-value="${this.escapeHtml(opt)}">${this.escapeHtml(opt)}</button>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }
```

### `renderRepetitionPhase` — app.js:31055–31078

```javascript
// app.js:31055–31078
  renderRepetitionPhase(ex) {
    let html = "";
    if (ex.type === "paradigm") {
      html += `<div class="grammar-rule-statement">${ex.profile.rule}</div>`;
      html += `<div class="grammar-question">Identify the correct description for: <strong>${ex.paradigmKey}</strong></div>`;
      const options = this.generateParadigmOptions(ex, "values");
      html += `<div class="grammar-options" id="grammar-options">`;
      for (const opt of options) {
        html += `<button class="grammar-option-btn" data-value="${this.escapeHtml(opt)}">${opt}</button>`;
      }
      html += `</div>`;
    } else {
      html += this.renderPassageWithHighlight(ex);
      html += `<div class="grammar-rule-statement">${ex.profile.rule}</div>`;
      html += `<div class="grammar-question">Identify the form: <strong>${ex.correctForm}</strong></div>`;
      html += `<div class="grammar-options" id="grammar-options">`;
      const options = Object.entries(ex.profile.paradigm || {});
      for (const [label, form] of options) {
        html += `<button class="grammar-option-btn" data-value="${label}">${label}: ${form}</button>`;
      }
      html += `</div>`;
    }
    return html;
  }
```

### `renderClozePhase` — app.js:31080–31103

```javascript
// app.js:31080–31103
  renderClozePhase(ex) {
    let html = "";
    if (ex.type === "paradigm") {
      html += `<div class="grammar-rule-statement">${ex.profile.rule}</div>`;
      html += `<div class="grammar-question">Select the correct Spanish form for: <strong>${ex.paradigmValue}</strong></div>`;
      const options = this.generateParadigmOptions(ex, "keys");
      html += `<div class="grammar-options" id="grammar-options">`;
      for (const opt of options) {
        html += `<button class="grammar-option-btn" data-value="${this.escapeHtml(opt)}">${opt}</button>`;
      }
      html += `</div>`;
    } else {
      html += this.renderPassageWithBlank(ex);
      html += `<div class="grammar-rule-statement">${ex.profile.rule}</div>`;
      html += `<div class="grammar-question">Select the correct form for the blank:</div>`;
      const options = this.generateClozeOptions(ex);
      html += `<div class="grammar-options" id="grammar-options">`;
      for (const opt of options) {
        html += `<button class="grammar-option-btn" data-value="${opt}">${opt}</button>`;
      }
      html += `</div>`;
    }
    return html;
  }
```

### `renderProductionPhase` — app.js:31105–31127

```javascript
// app.js:31105–31127
  renderProductionPhase(ex) {
    let html = "";
    if (ex.type === "paradigm") {
      html += `<div class="grammar-rule-statement">${ex.profile.rule}</div>`;
      html += `<div class="grammar-question">Type the correct Spanish form for: <strong>${ex.paradigmValue}</strong></div>`;
      html += `<input type="text" class="grammar-production-input" id="grammar-production-input" aria-label="Type your grammar answer" placeholder="Type your answer..." autocomplete="off">`;
      html += `<div class="grammar-action-row">`;
      html += `<button class="action-btn" id="grammar-submit-btn" style="background:var(--accent);color:white;">Submit</button>`;
      html += `</div>`;
    } else {
      html += this.renderPassageWithBlank(ex);
      if ((ex.profile.category === "verb" || ex.profile.category === "modal") && ex.infinitive && ex.person) {
        html += `<div class="grammar-question">Conjugate <strong>${ex.infinitive}</strong> in the <strong>${ex.person}</strong> form:</div>`;
      } else {
        html += `<div class="grammar-question">Type the correct form for the blank position:</div>`;
      }
      html += `<input type="text" class="grammar-production-input" id="grammar-production-input" aria-label="Type your grammar answer" placeholder="Type your answer..." autocomplete="off">`;
      html += `<div class="grammar-action-row">`;
      html += `<button class="action-btn" id="grammar-submit-btn" style="background:var(--accent);color:white;">Submit</button>`;
      html += `</div>`;
    }
    return html;
  }
```

### `renderParadigmTable` — app.js:31152–31201

```javascript
// app.js:31152–31201
  renderParadigmTable(ex, correctKey) {
    const profile = ex.profile;
    let html = `<h4>${profile.description}</h4>`;

    if (ex.type === "paradigm") {
      // Paradigm-based exercise
      html += `<table class="paradigm-table"><thead><tr><th>${profile.paradigmLabels ? profile.paradigmLabels.rows : "Form"}</th><th>${profile.paradigmLabels ? profile.paradigmLabels.cols : "Meaning"}</th></tr></thead><tbody>`;
      for (const [key, val] of Object.entries(profile.paradigm || {})) {
        const isMatch = key === ex.paradigmKey;
        html += `<tr><th>${key}</th><td class="${isMatch ? "paradigm-correct" : ""}">${val}</td></tr>`;
      }
      html += `</tbody></table>`;
    } else if (profile.paradigmGrid) {
      // Grid-based paradigm (articles)
      const grid = profile.paradigmGrid;
      html += `<table class="paradigm-table"><thead><tr><th></th>`;
      for (const col of grid.cols) html += `<th>${col}</th>`;
      html += `</tr></thead><tbody>`;
      for (let r = 0; r < grid.rows.length; r++) {
        html += `<tr><th>${grid.rows[r]}</th>`;
        for (let c = 0; c < grid.cols.length; c++) {
          const cellVal = grid.cells[r][c];
          const isCurrent = correctKey && cellVal.toLowerCase() === ex.correctForm.toLowerCase();
          html += `<td class="${isCurrent ? "paradigm-correct" : ""}">${cellVal}</td>`;
        }
        html += `</tr>`;
      }
      html += `</tbody></table>`;
    } else {
      // Key-value paradigm (verbs, nouns)
      html += `<table class="paradigm-table"><thead><tr><th>${profile.paradigmLabels.rows}</th><th>${profile.paradigmLabels.cols}</th></tr></thead><tbody>`;
      for (const [key, val] of Object.entries(profile.paradigm || {})) {
        const isMatch = correctKey === key;
        html += `<tr><th>${key}</th><td class="${isMatch ? "paradigm-correct" : ""}">${val}</td></tr>`;
      }
      html += `</tbody></table>`;
      // If we have actual generated forms for this exercise, show them too
      if (ex.allForms && ex.infinitive && (ex.profile.category === "verb" || ex.profile.category === "modal")) {
        html += `<h4 style="margin-top:12px">${ex.infinitive} — Conjugated Forms</h4>`;
        html += `<table class="paradigm-table"><thead><tr><th>Person</th><th>Form</th></tr></thead><tbody>`;
        for (const [person, form] of Object.entries(ex.allForms || {})) {
          const isMatch = form.toLowerCase() === ex.correctForm.toLowerCase();
          html += `<tr><th>${person}</th><td class="${isMatch ? "paradigm-correct" : ""}">${form}</td></tr>`;
        }
        html += `</tbody></table>`;
      }
    }

    return html;
  }
```

---

## CSS additions

Source: `index.html` — additions to grammar CSS (not in part 1)

```css
/* FSRS tier badge on thematic exercises */
.thematic-tier-badge {
  display: inline-block;
  font-size: 10px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
  margin-left: 8px;
  vertical-align: middle;
  background: rgba(59,111,160,0.10);
  color: var(--accent);
  border: 1px solid rgba(59,111,160,0.18);
}

/* Thematic exercises: track-specific color variants */
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

/* Thematic passages: extra line height for glosses */
.thematic-exercise .grammar-passage {
  line-height: 2.6;
}

/* Paradigm table: current and correct form highlighting */
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
```

---

## Event-binding functions

### `bindGrammarEvents` — app.js:31322–31402

```javascript
// app.js:31322–31402
  bindGrammarEvents(ex) {
    // View mode buttons (Lesson/Practice)
    document.querySelectorAll("[data-viewmode]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._stopAllTTS();
        this.grammarViewMode = btn.dataset.viewmode;
        this.renderGrammarContent();
      });
    });

    // Phase buttons
    document.querySelectorAll(".grammar-phase-btn[data-phase]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.grammarPhase = btn.dataset.phase;
        this.grammarParadigmVisible = false;
        this.renderGrammarContent();
      });
    });

    // Paradigm toggle
    const pToggle = document.getElementById("grammar-paradigm-toggle");
    if (pToggle) {
      pToggle.addEventListener("click", () => {
        this.grammarParadigmVisible = !this.grammarParadigmVisible;
        const panel = document.getElementById("grammar-paradigm-panel");
        panel.classList.toggle("visible", this.grammarParadigmVisible);
        pToggle.textContent = this.grammarParadigmVisible ? "Hide Paradigm Table" : "Show Paradigm Table";
      });
    }

    // Next button
    const nextBtn = document.getElementById("grammar-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.grammarRetrying = false;
        this.grammarCurrentIdx++;
        this.grammarParadigmVisible = false;
        if (this.grammarCurrentIdx >= this.grammarExercises.length) {
          this.renderGrammarContent(); // will show completion
        } else {
          this.renderGrammarContent();
        }
      });
    }

    // Option buttons (repetition, cloze, and thematic non-production)
    if ((ex.type === "thematic" && ex.subtype !== "production") || this.grammarPhase === "repetition" || this.grammarPhase === "cloze") {
      document.querySelectorAll(".grammar-option-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          this.handleGrammarOptionClick(btn, ex);
        });
      });
    }

    // Production submit (paradigm exercises)
    if (ex.type !== "thematic" && this.grammarPhase === "production") {
      const submitBtn = document.getElementById("grammar-submit-btn");
      const input = document.getElementById("grammar-production-input");
      if (submitBtn && input) {
        submitBtn.addEventListener("click", () => this.handleProductionSubmit(ex));
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") this.handleProductionSubmit(ex);
        });
        input.focus();
      }
    }

    // Feature 2: thematic production submit
    if (ex.type === "thematic" && ex.subtype === "production") {
      const submitBtn = document.getElementById("grammar-submit-btn");
      const input = document.getElementById("grammar-production-input");
      if (submitBtn && input) {
        submitBtn.addEventListener("click", () => this.handleThematicProductionSubmit(ex));
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") this.handleThematicProductionSubmit(ex);
        });
        input.focus();
      }
    }
  }
```

### `bindGrammarReviewEvents` — app.js:30733–30762

```javascript
// app.js:30733–30762
  bindGrammarReviewEvents(container) {
    // Viewmode buttons
    container.querySelectorAll("[data-viewmode]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._stopAllTTS();
        this.grammarViewMode = btn.dataset.viewmode;
        this.reviewSessionActive = false;
        this.renderGrammarContent();
      });
    });

    // Start review button
    const startBtn = container.querySelector("#review-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        const selectedPatterns = [this.grammarSelectedProfile.pattern];
        container.querySelectorAll(".review-include-cb").forEach(cb => {
          if (cb.checked) selectedPatterns.push(cb.value);
        });
        const countSel = container.querySelector("#review-count-select");
        const count = countSel ? parseInt(countSel.value) : 15;
        this.startReviewSession(selectedPatterns, count);
      });
    }

    // Active review session events
    if (this.reviewSessionActive) {
      this.bindReviewSessionEvents(container);
    }
  }
```

### Helper functions: `_getEffectiveThematicSubtype` & `_getEffectiveParadigmPhase`

```javascript
// app.js:31709–31735
  _getEffectiveThematicSubtype(ex) {
    if (!ex.sentence || !ex.sentence.id) return ex.subtype;
    const fsrsKey = "grammar_" + ex.sentence.id;
    const s = ex.sentence;
    const hasCloze = !!(s.clozeDisplay && s.clozeAnswer);
    const hasIdentify = !!(s.identifyQuestion && s.identifyOptions && s.identifyAnswer);

    // Session demotion overrides FSRS tier
    const demoted = this._thematicSessionDemotions[fsrsKey];
    if (demoted) {
      if (demoted === "repetition" && hasIdentify) return "repetition";
      if (demoted === "cloze" && hasCloze) return "cloze";
      // Demoted tier not available — fall through to FSRS
    }

    const tier = this._getThematicTier(fsrsKey);
    if (tier === "repetition") return hasIdentify ? "repetition" : (hasCloze ? "cloze" : "production");
    if (tier === "cloze")      return hasCloze ? "cloze" : (hasIdentify ? "repetition" : "production");
    // production
    return hasCloze ? "production" : (hasIdentify ? "repetition" : "cloze");
  }

  _getEffectiveParadigmPhase(ex) {
    if (!ex.profile || !ex.paradigmKey) return "repetition";
    const fsrsKey = "grammar_" + ex.profile.pattern + "_" + ex.paradigmKey;
    return this._getThematicTier(fsrsKey);
  }
```

---

## Read-only notice

This file is a **read-only reference extract** created 2026-04-24 from the Spanish app's source at commit `0101e2df2b3de45115e2dc6c31bc68ab801eb1ee`. It exists solely to give the German team a verbatim snapshot of the grammar-tab render and event-binding implementations for use as a parity-port template.

**Do not:**
- Edit this file to fix bugs or improve the Spanish code — changes belong in the Spanish repo.
- Use this file as the running source of truth after beginning implementation — re-read the Spanish repo's current `scripts/app.js` if the Spanish team has made changes.
- Commit changes to the Spanish repo from this extract.

**Source of truth**: `/Volumes/macOS_external/cameronhubbard/Documents/Claude/Projects/Spanish/gh-pages-deploy/scripts/app.js`
