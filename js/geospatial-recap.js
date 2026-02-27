(function () {
  "use strict";

  const board = document.getElementById("factBubbleBoard");
  const detailTitle = document.getElementById("factDetailTitle");
  const detailText = document.getElementById("factDetailText");
  const factMediaWrap = document.getElementById("factMediaWrap");
  const factImage = document.getElementById("factImage");
  const factImageCaption = document.getElementById("factImageCaption");
  const factBulletList = document.getElementById("factBulletList");

  const quizProgress = document.getElementById("quizProgress");
  const quizQuestion = document.getElementById("quizQuestion");
  const quizOptions = document.getElementById("quizOptions");
  const quizFeedback = document.getElementById("quizFeedback");
  const quizNext = document.getElementById("quizNext");
  const quizRestart = document.getElementById("quizRestart");

  if (!board || !detailTitle || !detailText || !quizQuestion || !quizOptions || !quizNext || !quizRestart) {
    return;
  }

  const facts = [
    {
      chip: "Do you know why maternal recall matters most here?",
      title: "Maternal recall is central in India-like settings",
      text: "In countries like India, maternal recall is not a secondary detail. It directly affects estimated immunization coverage in places where vaccination cards are missing or poorly retained.",
      image: {
        src: "https://upload.wikimedia.org/wikipedia/commons/4/45/Babyimmunization.jpg",
        alt: "Mother holding a child during an immunization session",
        caption: "Mother-child immunization interaction. Image source: Wikimedia Commons."
      },
      bullets: [
        "Card availability varies across states and districts, so recall often fills major documentation gaps.",
        "Including recall prevents exclusion of hard-to-reach households from coverage estimation.",
        "Recall assumptions can shift local coldspot identification and district ranking.",
        "Comparing MR=0 and MR=1 separates documentation effects from true service-delivery gaps.",
        "This is critical for campaigns targeting underserved populations in India."
      ]
    },
    {
      chip: "Do you think national averages are enough for planning?",
      title: "Scale and policy setting",
      text: "India's NFHS and UIP operate at national scale, and UIP targets more than 27 million children annually. Even at this scale, district and state averages can hide local inequities, so planning needs finer geographic intelligence."
    },
    {
      chip: "Do you know the biggest data challenge in coverage measurement?",
      title: "Card records vs maternal recall",
      text: "In household surveys, vaccination status comes from cards when available, otherwise from maternal recall. This creates a tradeoff between larger sample coverage and measurement reliability."
    },
    {
      chip: "Do you think card availability is uniform across India?",
      title: "Documentation is uneven",
      text: "Vaccination cards are critical for correct dose tracking and avoiding both missed and unnecessary doses. Card availability varies substantially across states and union territories."
    },
    {
      chip: "Do you know recall can both help and bias estimates?",
      title: "Recall quality is not uniform",
      text: "Past studies report mixed recall accuracy; for example, evidence from Senegal showed maternal recall can underestimate coverage relative to documented records."
    },
    {
      chip: "Do you know how the cluster-to-grid pipeline works?",
      title: "Cluster-to-grid Bayesian system",
      text: "The pipeline trains on DHS or NFHS cluster points and predicts on raster grids with spatial Bayesian models to generate high-resolution coverage and uncertainty surfaces."
    },
    {
      chip: "Do you know what outcomes and years are modeled?",
      title: "What is modeled",
      text: "Primary targets are BCG, DPT, and MCV outcomes across NFHS-4 (2015-2016) and NFHS-5 (2019-2021), enabling structured cross-round comparison."
    },
    {
      chip: "Do you think MR=0 and MR=1 will give the same map?",
      title: "Recall impact is modeled explicitly",
      text: "Two regimes are estimated side-by-side: MR=0 (card only) and MR=1 (card plus maternal recall). This exposes where recall materially shifts spatial estimates."
    },
    {
      chip: "Do you know why spatial modeling is essential here?",
      title: "Beyond averages",
      text: "Hierarchical spatial models with structured random effects capture sub-national correlation and heterogeneity, revealing local coldspots and multi-dose dropout pockets."
    },
    {
      chip: "Do you think all communities are equally covered?",
      title: "Who benefits most",
      text: "Hyper-local maps improve targeting for underserved groups such as migrant, tribal, and geographically isolated populations often prioritized in Mission Indradhanush programs."
    },
    {
      chip: "Do you know how this supports real campaign operations?",
      title: "Operational planning use",
      text: "The output supports campaign monitoring and microplanning for large initiatives, including Intensified Mission Indradhanush. IMI 5.0 phase windows in 2023 (August, September, October) underscore why time-sensitive local intelligence is needed."
    },
    {
      chip: "Do you think admin and survey numbers always agree?",
      title: "Why deeper investigation is needed",
      text: "Administrative reporting suggested gains after early Mission Indradhanush rounds, while NFHS-4 still showed weaker movement in states such as Tamil Nadu, Haryana, Himachal Pradesh, Uttarakhand, and Maharashtra. This mismatch requires uncertainty-aware local diagnostics."
    },
    {
      chip: "Do you know what helps resolve those contradictions?",
      title: "Admin vs survey gaps",
      text: "Dual-scenario modeling helps explain why administrative reports and household survey estimates diverge by quantifying uncertainty and recall sensitivity in each region."
    },
    {
      chip: "Do you know what is novel in this project design?",
      title: "What is new in this work",
      text: "The project combines spatial-temporal Bayesian modeling, explicit recall assumption testing, high-resolution mapping, multi-dose dropout analysis, and NFHS cross-round comparison in one pipeline."
    },
    {
      chip: "Do you know the final policy contribution?",
      title: "Decision-ready outcome",
      text: "The result is localized, uncertainty-calibrated evidence that supports better resource allocation, sharper intervention targeting, and more defensible immunization policy decisions."
    }
  ];

  const quiz = [
    {
      q: "What core measurement issue motivates the dual-scenario model?",
      options: [
        "Absence of card records forces reliance on maternal recall",
        "NFHS does not contain vaccine outcomes",
        "Spatial methods cannot model uncertainty"
      ],
      answer: 0,
      why: "Correct. The central challenge is balancing sample completeness with documentation reliability when cards are missing."
    },
    {
      q: "What does MR=0 represent in this project?",
      options: [
        "Card-only vaccination evidence",
        "Card plus maternal recall evidence",
        "No child-level vaccine data"
      ],
      answer: 0,
      why: "MR=0 is the strict documentation scenario using only card evidence."
    },
    {
      q: "Why are hyper-local maps preferred over only state averages?",
      options: [
        "They reveal local coldspots and dropout pockets hidden in aggregates",
        "They remove all uncertainty automatically",
        "They avoid using cluster coordinates"
      ],
      answer: 0,
      why: "Coldspots and service gaps are often localized and can be masked by broader averages."
    },
    {
      q: "Which outcomes are primary targets in this pipeline?",
      options: [
        "BCG, DPT, and MCV dose outcomes",
        "Only MCV",
        "Only full immunization without dose-level detail"
      ],
      answer: 0,
      why: "The study explicitly models BCG, DPT, and MCV dose outcomes across two NFHS rounds."
    },
    {
      q: "What policy value comes from comparing MR=0 vs MR=1?",
      options: [
        "It identifies regions where recall strongly changes estimated coverage",
        "It removes the need for uncertainty maps",
        "It replaces all field verification"
      ],
      answer: 0,
      why: "Scenario comparison quantifies recall sensitivity and helps prioritize where further verification and targeted action are needed."
    }
  ];

  let activeFact = 0;
  let questionIndex = 0;
  let score = 0;
  let answered = false;

  buildFactBubbles();
  setActiveFact(0);
  bindQuiz();
  renderQuizQuestion();

  function buildFactBubbles() {
    board.innerHTML = "";

    facts.forEach(function (fact, index) {
      const bubble = document.createElement("button");
      bubble.type = "button";
      bubble.className = "fact-bubble";
      bubble.textContent = fact.chip;
      bubble.title = "Click to reveal answer";
      bubble.setAttribute("aria-label", fact.chip + " Click to reveal answer");
      bubble.style.setProperty("--bubble-delay", (index * 0.14).toFixed(2) + "s");
      bubble.style.setProperty("--bubble-duration", (5.4 + (index % 5) * 0.45).toFixed(2) + "s");
      bubble.addEventListener("click", function () {
        setActiveFact(index);
      });
      board.appendChild(bubble);
    });
  }

  function setActiveFact(index) {
    activeFact = index;
    const fact = facts[index];

    Array.from(board.children).forEach(function (node, idx) {
      node.classList.toggle("active", idx === index);
    });

    detailTitle.textContent = "Q. " + fact.chip;
    detailText.textContent = "A. " + fact.text;

    if (factMediaWrap && factImage && factImageCaption) {
      if (fact.image && fact.image.src) {
        factImage.src = fact.image.src;
        factImage.alt = fact.image.alt || "";
        factImageCaption.textContent = fact.image.caption || "";
        factMediaWrap.hidden = false;
      } else {
        factImage.src = "";
        factImage.alt = "";
        factImageCaption.textContent = "";
        factMediaWrap.hidden = true;
      }
    }

    if (factBulletList) {
      factBulletList.innerHTML = "";
      const bullets = Array.isArray(fact.bullets) ? fact.bullets : [];
      bullets.forEach(function (point) {
        const li = document.createElement("li");
        li.textContent = point;
        factBulletList.appendChild(li);
      });
    }
  }

  function bindQuiz() {
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
    if (answered) {
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
    quizProgress.textContent = "Quiz Complete";
    quizQuestion.textContent = "Score: " + score + " / " + quiz.length;
    quizOptions.innerHTML = "";

    let closing;
    if (score === quiz.length) {
      closing = "Excellent. You captured the full analytical logic and policy framing of the project.";
    } else if (score >= Math.ceil(quiz.length * 0.6)) {
      closing = "Good. The key structure is clear; revisit bubbles on recall sensitivity and coldspot interpretation for full alignment.";
    } else {
      closing = "Review the fact bubbles once and retake. Focus on card-versus-recall modeling and hyper-local policy use.";
    }

    quizFeedback.textContent = closing;
    quizNext.hidden = true;
    quizRestart.hidden = false;
  }
})();
