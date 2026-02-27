(function () {
  "use strict";

  const board = document.getElementById("factBubbleBoard");
  const popup = document.getElementById("factPopup");
  const popupBackdrop = document.getElementById("factPopupBackdrop");
  const popupClose = document.getElementById("factPopupClose");
  const popupTag = document.getElementById("factPopupTag");
  const popupTitle = document.getElementById("factPopupTitle");
  const popupText = document.getElementById("factPopupText");
  const popupMedia = document.getElementById("factPopupMedia");
  const popupImage = document.getElementById("factPopupImage");
  const popupCaption = document.getElementById("factPopupCaption");
  const popupBullets = document.getElementById("factPopupBullets");

  const quizProgress = document.getElementById("quizProgress");
  const quizQuestion = document.getElementById("quizQuestion");
  const quizOptions = document.getElementById("quizOptions");
  const quizFeedback = document.getElementById("quizFeedback");
  const quizNext = document.getElementById("quizNext");
  const quizRestart = document.getElementById("quizRestart");

  if (!board || !popup || !popupTitle || !popupText || !popupBullets) {
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
      answer: "In countries like India, maternal recall is not a secondary detail. It directly affects estimated immunization coverage in places where vaccination cards are missing or poorly retained.",
      bullets: [
        "Card retention varies across states and districts.",
        "Recall can prevent systematic exclusion of low-documentation households.",
        "MR assumptions can shift local hotspot and coldspot ranking.",
        "MR=0 vs MR=1 comparison separates documentation effects from service gaps."
      ]
    },
    {
      chip: "Cards everywhere?",
      category: "basic",
      answer: "No. Card availability is uneven, which is why recall often becomes a major source of observed vaccine status in household surveys."
    },
    {
      chip: "Averages enough?",
      category: "interpretation",
      answer: "Not for action. State and national averages can mask local inequities that only appear in hyper-local mapping."
    },
    {
      chip: "MR=0 equals MR=1?",
      category: "method",
      answer: "No. Card-only and card-plus-recall scenarios produce different estimates in many places, especially where documentation is sparse."
    },
    {
      chip: "Why two NFHS rounds?",
      category: "method",
      answer: "Using NFHS-4 and NFHS-5 allows temporal comparison to see which gaps persist and which improve over time."
    },
    {
      chip: "What gets mapped?",
      category: "method",
      answer: "Coverage surfaces, uncertainty layers, dropout maps, and scenario contrasts are generated from cluster-to-grid Bayesian predictions."
    },
    {
      chip: "Why uncertainty maps?",
      category: "method",
      answer: "They show where estimates are stable versus fragile, so decisions are not made from point estimates alone."
    },
    {
      chip: "Who is often missed?",
      category: "interpretation",
      answer: "Migrant, tribal, and geographically isolated communities are often concentrated in local pockets that require targeted outreach."
    },
    {
      chip: "Admin vs survey mismatch?",
      category: "interpretation",
      answer: "Dual-scenario modeling helps explain mismatches by quantifying the role of recall assumptions and local uncertainty."
    },
    {
      chip: "Novel contribution?",
      category: "method",
      answer: "The pipeline combines spatial-temporal Bayesian modeling, explicit recall sensitivity, and high-resolution dropout analysis in one framework."
    },
    {
      chip: "Policy takeaway?",
      category: "interpretation",
      answer: "Use localized, uncertainty-calibrated maps to prioritize delivery versus demand interventions where they are most needed."
    }
  ];

  const quiz = [
    {
      q: "What is MR=0?",
      options: [
        "Card-only evidence",
        "Card + recall",
        "No vaccine data"
      ],
      answer: 0,
      why: "MR=0 is the strict card-only scenario."
    },
    {
      q: "Why compare MR=0 and MR=1?",
      options: [
        "To see recall sensitivity",
        "To remove uncertainty maps",
        "To replace field checks"
      ],
      answer: 0,
      why: "It quantifies how recall changes local estimates."
    },
    {
      q: "Why hyper-local maps?",
      options: [
        "They reveal hidden local gaps",
        "They make uncertainty unnecessary",
        "They ignore clusters"
      ],
      answer: 0,
      why: "Local service gaps are often hidden in aggregate averages."
    },
    {
      q: "Core outputs include?",
      options: [
        "Coverage, uncertainty, dropout, scenario contrast",
        "Only national averages",
        "Only a single vaccine map"
      ],
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
      bubble.title = "Click to open answer popup";
      bubble.setAttribute("aria-label", fact.chip + ". Click to open answer popup.");
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
    popupText.innerHTML = "A. " + highlightText(fact.answer);

    if (fact.image && popupMedia && popupImage && popupCaption) {
      popupImage.src = fact.image.src;
      popupImage.alt = fact.image.alt || "";
      popupCaption.textContent = fact.image.caption || "";
      popupMedia.hidden = false;
    } else if (popupMedia && popupImage && popupCaption) {
      popupImage.src = "";
      popupImage.alt = "";
      popupCaption.textContent = "";
      popupMedia.hidden = true;
    }

    popupBullets.innerHTML = "";
    const bullets = Array.isArray(fact.bullets) ? fact.bullets : [];
    bullets.forEach(function (point) {
      const li = document.createElement("li");
      li.innerHTML = highlightText(point);
      popupBullets.appendChild(li);
    });

    popup.hidden = false;
    document.body.classList.add("popup-open");
  }

  function closePopup() {
    popup.hidden = true;
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
      if (evt.key === "Escape" && !popup.hidden) {
        closePopup();
      }
    });
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

  function renderQuizQuestion() {
    if (!quizProgress || !quizQuestion || !quizOptions || !quizFeedback || !quizNext || !quizRestart) {
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
