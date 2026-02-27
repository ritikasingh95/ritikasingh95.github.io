(function () {
  "use strict";

  const chipsRoot = document.getElementById("labGuideChips");
  const popup = document.getElementById("labGuidePopup");
  const backdrop = document.getElementById("labGuideBackdrop");
  const closeBtn = document.getElementById("labGuideClose");
  const tagNode = document.getElementById("labGuideTag");
  const titleNode = document.getElementById("labGuideTitle");
  const promptNode = document.getElementById("labGuidePrompt");
  const optionsNode = document.getElementById("labGuideOptions");
  const resultNode = document.getElementById("labGuideResult");
  const answerWrap = document.getElementById("labGuideAnswer");
  const answerText = document.getElementById("labGuideAnswerText");
  const impactList = document.getElementById("labGuideImpactList");

  if (!chipsRoot || !popup || !titleNode || !promptNode || !optionsNode || !answerWrap || !answerText || !impactList) {
    return;
  }

  const categoryTitle = {
    data: "Data Impact",
    model: "Model Impact",
    mesh: "Mesh Impact",
    action: "Action Impact"
  };

  const items = [
    {
      chip: "State switch?",
      category: "data",
      prompt: "What changes first when you switch state?",
      options: ["Boundary and cluster sample", "Only the label"],
      correct: 0,
      answer: "State selection updates both geography and the underlying cluster evidence used for summary and display.",
      impacts: [
        "Cluster count and child totals change.",
        "Point distribution and local coverage pattern change.",
        "Mesh scale context and derived metrics shift."
      ]
    },
    {
      chip: "Survey round?",
      category: "data",
      prompt: "What does changing survey round affect?",
      options: ["Time period and sample", "Nothing substantive"],
      correct: 0,
      answer: "Survey selection switches to a different time window and child sample, so spatial estimates represent different rounds.",
      impacts: [
        "Coverage proportions can move up or down.",
        "Unvaccinated pockets may appear or shrink.",
        "Comparability becomes temporal rather than within-round."
      ]
    },
    {
      chip: "Model family?",
      category: "model",
      prompt: "Why does model family selection matter?",
      options: ["It changes smoothing and fit behavior", "It changes only colors"],
      correct: 0,
      answer: "Model family changes how spatial dependence is represented, which influences expected fit and uncertainty behavior.",
      impacts: [
        "Expected RMSE can shift.",
        "Uncertainty index can tighten or loosen.",
        "Coldspot stability estimates can change."
      ]
    },
    {
      chip: "MR regime?",
      category: "model",
      prompt: "What does MR setting primarily alter?",
      options: ["Evidence source for vaccination status", "Map boundary"],
      correct: 0,
      answer: "MR mode changes how vaccination evidence is counted: documented card evidence only versus card plus maternal recall.",
      impacts: [
        "Vaccinated and unvaccinated counts can shift.",
        "Coverage level and uncertainty can change.",
        "Interpretation of low coverage may differ."
      ]
    },
    {
      chip: "Vaccine choice?",
      category: "data",
      prompt: "What does vaccine selector control?",
      options: ["Which outcome is plotted", "Mesh node generation"],
      correct: 0,
      answer: "Vaccine selection changes the outcome layer, so the same clusters are evaluated against a different immunization endpoint.",
      impacts: [
        "Point colors can reclassify.",
        "Vaccinated versus unvaccinated totals update.",
        "Cluster mean coverage changes by endpoint."
      ]
    },
    {
      chip: "Resolution slider?",
      category: "mesh",
      prompt: "What is the main tradeoff of mesh resolution?",
      options: ["Detail vs computational stability", "State count"],
      correct: 0,
      answer: "Resolution controls node density: finer meshes represent local variation better but can increase complexity.",
      impacts: [
        "Node count increases with finer settings.",
        "Mean edge length decreases.",
        "Uncertainty and fit metrics can shift."
      ]
    },
    {
      chip: "Offset slider?",
      category: "mesh",
      prompt: "What does mesh offset change?",
      options: ["How far mesh domain expands near boundary", "Vaccination labels"],
      correct: 0,
      answer: "Offset expands or contracts the modelling domain around the boundary, affecting edge behavior.",
      impacts: [
        "Boundary node placement changes.",
        "Domain scale annotation updates.",
        "Edge-related uncertainty can move."
      ]
    },
    {
      chip: "Cutoff slider?",
      category: "mesh",
      prompt: "What does cutoff mainly control?",
      options: ["Minimum local spacing of nodes", "Survey year"],
      correct: 0,
      answer: "Cutoff regulates local mesh spacing and can smooth or sharpen how spatial structure is represented.",
      impacts: [
        "Dense versus sparse local triangulation changes.",
        "Expected RMSE and uncertainty may move.",
        "Coldspot stability can vary."
      ]
    },
    {
      chip: "Reset button?",
      category: "action",
      prompt: "What happens when you reset scenario?",
      options: ["Returns controls to baseline", "Deletes selected state"],
      correct: 0,
      answer: "Reset restores baseline control values so all reported deltas are interpreted against a known reference.",
      impacts: [
        "Comparisons become consistent across experiments.",
        "Baseline metric deltas re-anchor.",
        "Reproducibility of scenario checks improves."
      ]
    }
  ];

  buildChips();
  bindPopupEvents();

  function buildChips() {
    chipsRoot.innerHTML = "";

    items.forEach(function (item, index) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "lab-guide-chip lab-guide-chip--" + item.category;
      chip.textContent = item.chip;
      chip.title = "Click to test and reveal impact";
      chip.style.setProperty("--bubble-delay", (index * 0.1).toFixed(2) + "s");
      chip.style.setProperty("--bubble-duration", (5.2 + (index % 4) * 0.5).toFixed(2) + "s");
      chip.style.setProperty("--tilt", (((index % 5) - 2) * 0.45).toFixed(2) + "deg");
      chip.addEventListener("click", function () {
        openItem(item, chip);
      });
      chipsRoot.appendChild(chip);
    });
  }

  function openItem(item, activeChip) {
    Array.from(chipsRoot.children).forEach(function (node) {
      node.classList.toggle("active", node === activeChip);
    });

    tagNode.textContent = categoryTitle[item.category] || "Impact";
    titleNode.textContent = "Q. " + item.chip;
    promptNode.textContent = item.prompt;
    resultNode.textContent = "";
    answerWrap.hidden = true;
    answerText.textContent = "";
    impactList.innerHTML = "";

    optionsNode.innerHTML = "";
    item.options.forEach(function (label, idx) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lab-guide-option";
      btn.textContent = label;
      btn.addEventListener("click", function () {
        scoreItem(item, idx);
      });
      optionsNode.appendChild(btn);
    });

    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    document.body.classList.add("popup-open");
  }

  function scoreItem(item, selectedIdx) {
    const nodes = Array.from(optionsNode.children);
    const correctIdx = item.correct;

    nodes.forEach(function (node, idx) {
      node.disabled = true;
      if (idx === correctIdx) node.classList.add("correct");
      if (idx === selectedIdx && idx !== correctIdx) node.classList.add("wrong");
    });

    const isCorrect = selectedIdx === correctIdx;
    resultNode.textContent = isCorrect ? "Correct. Impact summary:" : "Close. Correct option highlighted. Impact summary:";

    answerText.textContent = item.answer;
    impactList.innerHTML = "";
    item.impacts.forEach(function (row) {
      const li = document.createElement("li");
      li.textContent = row;
      impactList.appendChild(li);
    });
    answerWrap.hidden = false;
  }

  function closePopup() {
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    document.body.classList.remove("popup-open");
  }

  function bindPopupEvents() {
    if (backdrop) backdrop.addEventListener("click", closePopup);
    if (closeBtn) closeBtn.addEventListener("click", closePopup);

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && popup.classList.contains("is-open")) {
        closePopup();
      }
    });
  }
})();
