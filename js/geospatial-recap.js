(function () {
  "use strict";

  const board = document.getElementById("factBubbleBoard");
  const popup = document.getElementById("factPopup");
  const popupBackdrop = document.getElementById("factPopupBackdrop");
  const popupClose = document.getElementById("factPopupClose");
  const popupTag = document.getElementById("factPopupTag");
  const popupTitle = document.getElementById("factPopupTitle");
  const popupPrompt = document.getElementById("factPopupPrompt");
  const popupOptions = document.getElementById("factPopupOptions");
  const popupResult = document.getElementById("factPopupResult");
  const popupAnswer = document.getElementById("factPopupAnswer");
  const popupText = document.getElementById("factPopupText");
  const popupBullets = document.getElementById("factPopupBullets");

  const quizProgress = document.getElementById("quizProgress");
  const quizQuestion = document.getElementById("quizQuestion");
  const quizOptions = document.getElementById("quizOptions");
  const quizFeedback = document.getElementById("quizFeedback");
  const quizNext = document.getElementById("quizNext");
  const quizRestart = document.getElementById("quizRestart");

  if (!board || !popup || !popupTitle || !popupPrompt || !popupOptions || !popupAnswer || !popupText || !popupBullets) {
    return;
  }

  const categoryLabel = {
    basic: "Basic",
    method: "Method",
    interpretation: "Interpretation"
  };

  const highlightPhrases = [
    "maternal recall",
    "immunization coverage",
    "vaccination cards",
    "card records",
    "MR=0",
    "MR=1",
    "card-only",
    "card plus recall",
    "hyper-local",
    "uncertainty",
    "coldspots",
    "dropout",
    "NFHS-4",
    "NFHS-5",
    "administrative reports",
    "survey estimates",
    "Bayesian",
    "policy"
  ].sort(function (a, b) {
    return b.length - a.length;
  });

  const facts = [
    {
      chip: "Recall or reality?",
      category: "basic",
      prompt: "Can missing card records distort local coverage estimates?",
      options: ["Yes, often", "No, not really"],
      correct: 0,
      answer: "In countries like India, maternal recall is not a secondary detail. It directly affects estimated immunization coverage in places where vaccination cards are missing or poorly retained.",
      bullets: [
        "Card retention varies across states and districts.",
        "Recall can prevent exclusion of low-documentation households.",
        "MR=0 vs MR=1 separates documentation effects from delivery gaps."
      ]
    },
    {
      chip: "Cards everywhere?",
      category: "basic",
      prompt: "Is immunization card availability uniform across India?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "Card availability is uneven, which is why recall often becomes a major source of observed vaccine status."
    },
    {
      chip: "Averages enough?",
      category: "interpretation",
      prompt: "Do state averages alone capture local risk pockets?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "State and national averages can mask local inequities that only appear in hyper-local mapping."
    },
    {
      chip: "MR=0 equals MR=1?",
      category: "method",
      prompt: "Will MR=0 and MR=1 always give the same map?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "Card-only and card-plus-recall scenarios can produce meaningfully different spatial estimates."
    },
    {
      chip: "Why two NFHS rounds?",
      category: "method",
      prompt: "Is one survey round enough for trend interpretation?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "Using NFHS-4 and NFHS-5 supports temporal comparison to identify persistent versus improving gaps."
    },
    {
      chip: "What gets mapped?",
      category: "method",
      prompt: "Does the pipeline output only one map?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "The pipeline outputs coverage surfaces, uncertainty layers, dropout maps, and scenario contrast summaries."
    },
    {
      chip: "Why uncertainty?",
      category: "method",
      prompt: "Can we rely on point estimates alone?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "Uncertainty layers identify where predictions are stable versus fragile before policy action."
    },
    {
      chip: "Who is missed?",
      category: "interpretation",
      prompt: "Are all communities equally served?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "Migrant, tribal, and geographically isolated populations are often concentrated in localized low-coverage pockets."
    },
    {
      chip: "Admin vs survey?",
      category: "interpretation",
      prompt: "Do administrative and survey numbers always match?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "Dual-scenario modeling helps explain divergence by quantifying recall sensitivity and local uncertainty."
    },
    {
      chip: "Novel contribution?",
      category: "method",
      prompt: "Is this only routine mapping?",
      options: ["Yes", "No"],
      correct: 1,
      answer: "The framework combines spatial-temporal Bayesian modeling, explicit recall sensitivity, and high-resolution dropout analysis."
    },
    {
      chip: "Policy takeaway?",
      category: "interpretation",
      prompt: "Can this guide targeted interventions?",
      options: ["Yes", "No"],
      correct: 0,
      answer: "Localized, uncertainty-calibrated outputs support better resource allocation and sharper delivery-versus-demand targeting."
    }
  ];

  const quiz = [
    {
      q: "What is MR=0?",
      options: ["Card-only evidence", "Card + recall", "No vaccine data"],
      answer: 0,
      why: "MR=0 is the strict card-only scenario."
    },
    {
      q: "Why compare MR=0 and MR=1?",
      options: ["To see recall sensitivity", "To remove uncertainty maps", "To replace field checks"],
      answer: 0,
      why: "It quantifies how recall changes local estimates."
    },
    {
      q: "Why hyper-local maps?",
      options: ["They reveal hidden local gaps", "They make uncertainty unnecessary", "They ignore clusters"],
      answer: 0,
      why: "Local service gaps are often hidden in aggregate averages."
    },
    {
      q: "Core outputs include?",
      options: ["Coverage, uncertainty, dropout, scenario contrast", "Only national averages", "Only a single vaccine map"],
      answer: 0,
      why: "The pipeline is multi-output and decision-oriented."
    }
  ];

  let questionIndex = 0;
  let score = 0;
  let answered = false;

  buildFactBubbles();
  bindPopupEvents();
  bindQuiz();
  renderQuizQuestion();

  function buildFactBubbles() {
    board.innerHTML = "";

    facts.forEach(function (fact, index) {
      const bubble = document.createElement("button");
      bubble.type = "button";
      bubble.className = "fact-bubble fact-bubble--" + fact.category;
      bubble.textContent = fact.chip;
      bubble.title = "Click to answer and reveal explanation";
      bubble.setAttribute("aria-label", fact.chip + ". Click to answer and reveal explanation.");
      bubble.style.setProperty("--bubble-delay", (index * 0.11).toFixed(2) + "s");
      bubble.style.setProperty("--bubble-duration", (5.1 + (index % 6) * 0.42).toFixed(2) + "s");
      bubble.style.setProperty("--tilt", (((index % 5) - 2) * 0.55).toFixed(2) + "deg");
      bubble.addEventListener("click", function () {
        openPopup(index);
      });
      board.appendChild(bubble);
    });
  }

  function openPopup(index) {
    const fact = facts[index];

    Array.from(board.children).forEach(function (node, idx) {
      node.classList.toggle("active", idx === index);
    });

    popupTag.textContent = categoryLabel[fact.category] + " Insight";
    popupTitle.textContent = "Q. " + fact.chip;
    popupPrompt.textContent = fact.prompt;

    popupOptions.innerHTML = "";
    popupResult.textContent = "";
    popupText.innerHTML = "";
    popupBullets.innerHTML = "";
    popupAnswer.hidden = true;

    fact.options.forEach(function (label, idx) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "fact-popup-option";
      option.textContent = label;
      option.addEventListener("click", function () {
        handlePopupAnswer(fact, idx);
      });
      popupOptions.appendChild(option);
    });

    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    document.body.classList.add("popup-open");
  }

  function handlePopupAnswer(fact, selectedIndex) {
    const nodes = Array.from(popupOptions.children);
    const correctIndex = fact.correct;
    const isCorrect = selectedIndex === correctIndex;

    nodes.forEach(function (node, idx) {
      node.disabled = true;
      if (idx === correctIndex) {
        node.classList.add("correct");
      }
      if (idx === selectedIndex && idx !== correctIndex) {
        node.classList.add("wrong");
      }
    });

    popupResult.textContent = isCorrect ? "Good call. Now see why:" : "Close. Correct answer highlighted. Why:";
    popupText.innerHTML = "A. " + highlightText(fact.answer);

    const bullets = Array.isArray(fact.bullets) ? fact.bullets : [];
    bullets.forEach(function (point) {
      const li = document.createElement("li");
      li.innerHTML = highlightText(point);
      popupBullets.appendChild(li);
    });

    popupAnswer.hidden = false;
  }

  function closePopup() {
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    document.body.classList.remove("popup-open");
  }

  function bindPopupEvents() {
    if (popupBackdrop) {
      popupBackdrop.addEventListener("click", closePopup);
    }
    if (popupClose) {
      popupClose.addEventListener("click", closePopup);
    }

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && popup.classList.contains("is-open")) {
        closePopup();
      }
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(value) {
    let html = escapeHtml(value);
    highlightPhrases.forEach(function (phrase) {
      const pattern = new RegExp(escapeRegExp(phrase), "gi");
      html = html.replace(pattern, function (match) {
        return "<strong>" + match + "</strong>";
      });
    });
    return html;
  }

  function bindQuiz() {
    if (!quizProgress || !quizQuestion || !quizOptions || !quizFeedback || !quizNext || !quizRestart) {
      return;
    }

    quizNext.addEventListener("click", function () {
      if (!answered) {
        return;
      }

      if (questionIndex === quiz.length - 1) {
        showQuizResult();
        return;
      }

      questionIndex += 1;
      renderQuizQuestion();
    });

    quizRestart.addEventListener("click", function () {
      questionIndex = 0;
      score = 0;
      answered = false;
      quizRestart.hidden = true;
      quizNext.hidden = false;
      quizNext.textContent = "Next";
      renderQuizQuestion();
    });
  }

  function renderQuizQuestion() {
    if (!quizProgress || !quizQuestion || !quizOptions || !quizFeedback || !quizNext) {
      return;
    }

    const item = quiz[questionIndex];
    answered = false;

    quizProgress.textContent = "Question " + (questionIndex + 1) + " of " + quiz.length;
    quizQuestion.textContent = item.q;
    quizFeedback.textContent = "";
    quizOptions.innerHTML = "";

    item.options.forEach(function (label, idx) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "quiz-option";
      option.textContent = label;
      option.addEventListener("click", function () {
        scoreOption(idx);
      });
      quizOptions.appendChild(option);
    });

    quizNext.disabled = true;
    quizNext.textContent = questionIndex === quiz.length - 1 ? "See Result" : "Next";
  }

  function scoreOption(selectedIndex) {
    if (answered || !quizOptions || !quizFeedback || !quizNext) {
      return;
    }

    answered = true;

    const item = quiz[questionIndex];
    const isCorrect = selectedIndex === item.answer;

    Array.from(quizOptions.children).forEach(function (node, idx) {
      node.disabled = true;
      if (idx === item.answer) {
        node.classList.add("correct");
      }
      if (idx === selectedIndex && !isCorrect) {
        node.classList.add("wrong");
      }
    });

    if (isCorrect) {
      score += 1;
    }

    quizFeedback.textContent = (isCorrect ? "Correct. " : "Not quite. ") + item.why;
    quizNext.disabled = false;
  }

  function showQuizResult() {
    if (!quizProgress || !quizQuestion || !quizOptions || !quizFeedback || !quizNext || !quizRestart) {
      return;
    }

    quizProgress.textContent = "Quiz Complete";
    quizQuestion.textContent = "Score: " + score + " / " + quiz.length;
    quizOptions.innerHTML = "";

    let closing;
    if (score === quiz.length) {
      closing = "Excellent. You got the core logic perfectly.";
    } else if (score >= Math.ceil(quiz.length * 0.6)) {
      closing = "Good run. Re-open a few bubbles for full recall and uncertainty framing.";
    } else {
      closing = "Revisit the bubbles once and retry. Focus on MR=0 vs MR=1 and local coldspot logic.";
    }

    quizFeedback.textContent = closing;
    quizNext.hidden = true;
    quizRestart.hidden = false;
  }
})();
