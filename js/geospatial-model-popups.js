(function () {
  "use strict";

  const popup = document.getElementById("modelPopup");
  const backdrop = document.getElementById("modelPopupBackdrop");
  const closeBtn = document.getElementById("modelPopupClose");
  const tagNode = document.getElementById("modelPopupTag");
  const titleNode = document.getElementById("modelPopupTitle");
  const introNode = document.getElementById("modelPopupIntro");
  const bodyNode = document.getElementById("modelPopupBody");
  const triggers = Array.from(document.querySelectorAll(".model-q-btn"));

  if (!popup || !titleNode || !introNode || !bodyNode || triggers.length === 0) {
    return;
  }

  const topics = {
    spglm_math: {
      tag: "spGLM Math",
      title: "Detailed Mathematical Modeling: spGLM",
      intro: "spGLM keeps spatial dependence in a dense Gaussian process and links it to binomial outcomes through logistic regression.",
      body: `
        <div class="eq-block">
          <p class="eq-title">Observation model</p>
          <div class="eq-math">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <mrow>
                <msub><mi>Y</mi><mi>i</mi></msub>
                <mo>|</mo>
                <msub><mi>p</mi><mi>i</mi></msub>
                <mo>&sim;</mo>
                <mi>Binomial</mi><mo>(</mo><msub><mi>n</mi><mi>i</mi></msub><mo>,</mo><msub><mi>p</mi><mi>i</mi></msub><mo>)</mo>
              </mrow>
            </math>
          </div>
        </div>
        <div class="eq-block">
          <p class="eq-title">Linear predictor</p>
          <div class="eq-math">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <mrow>
                <mi>logit</mi><mo>(</mo><msub><mi>p</mi><mi>i</mi></msub><mo>)</mo>
                <mo>=</mo>
                <msup><msub><mi>x</mi><mi>i</mi></msub><mi>T</mi></msup><mi>&beta;</mi>
                <mo>+</mo><mi>w</mi><mo>(</mo><msub><mi>s</mi><mi>i</mi></msub><mo>)</mo>
                <mo>+</mo><msub><mi>u</mi><mrow><mtext>state</mtext><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msub>
                <mo>+</mo><msub><mi>u</mi><mrow><mtext>district</mtext><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msub>
              </mrow>
            </math>
          </div>
        </div>
        <div class="eq-block">
          <p class="eq-title">Mat&eacute;rn covariance in GP form</p>
          <div class="eq-math">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <mrow>
                <mi>Cov</mi><mo>(</mo><mi>w</mi><mo>(</mo><msub><mi>s</mi><mi>i</mi></msub><mo>)</mo><mo>,</mo><mi>w</mi><mo>(</mo><msub><mi>s</mi><mi>j</mi></msub><mo>)</mo><mo>)</mo>
                <mo>=</mo>
                <msup><mi>&sigma;</mi><mn>2</mn></msup>
                <mfrac>
                  <msup><mn>2</mn><mrow><mn>1</mn><mo>-</mo><mi>&nu;</mi></mrow></msup>
                  <mi>&Gamma;</mi><mo>(</mo><mi>&nu;</mi><mo>)</mo>
                </mfrac>
                <msup>
                  <mrow><mo>(</mo><mi>&kappa;</mi><msub><mi>d</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>)</mo></mrow>
                  <mi>&nu;</mi>
                </msup>
                <msub><mi>K</mi><mi>&nu;</mi></msub><mo>(</mo><mi>&kappa;</mi><msub><mi>d</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>)</mo>
              </mrow>
            </math>
          </div>
        </div>
        <p>Interpretation: spGLM estimates vaccination risk by jointly learning fixed effects and a smooth spatial random field over cluster coordinates.</p>
      `
    },
    spglm_strengths: {
      tag: "spGLM Tradeoffs",
      title: "Strengths and Limits: spGLM",
      intro: "spGLM is theoretically rich but computationally heavier as data scale grows.",
      body: `
        <ul>
          <li><strong>Strength:</strong> Explicit covariance modeling gives high control over spatial structure.</li>
          <li><strong>Strength:</strong> Strong generative interpretation for distance-decay behavior.</li>
          <li><strong>Limit:</strong> Dense covariance operations become expensive with many clusters.</li>
          <li><strong>Limit:</strong> Repeated model runs across vaccines, MR settings, and states can be slow.</li>
        </ul>
        <p>Use spGLM when you need covariance-level interpretability and can tolerate higher compute cost.</p>
      `
    },
    inla_math: {
      tag: "INLA-SPDE Math",
      title: "Detailed Mathematical Modeling: INLA-SPDE",
      intro: "INLA-SPDE approximates a Mat&eacute;rn Gaussian field on a triangulated mesh and computes posterior marginals quickly.",
      body: `
        <div class="eq-block">
          <p class="eq-title">Observation model</p>
          <div class="eq-math">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <mrow>
                <msub><mi>Y</mi><mi>i</mi></msub>
                <mo>|</mo>
                <msub><mi>&eta;</mi><mi>i</mi></msub>
                <mo>&sim;</mo>
                <mi>Binomial</mi>
                <mo>(</mo>
                <msub><mi>n</mi><mi>i</mi></msub>
                <mo>,</mo>
                <msup><mi>logit</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mo>(</mo><msub><mi>&eta;</mi><mi>i</mi></msub><mo>)</mo>
                <mo>)</mo>
              </mrow>
            </math>
          </div>
        </div>
        <div class="eq-block">
          <p class="eq-title">Latent predictor with mesh projection</p>
          <div class="eq-math">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <mrow>
                <msub><mi>&eta;</mi><mi>i</mi></msub>
                <mo>=</mo>
                <msup><msub><mi>x</mi><mi>i</mi></msub><mi>T</mi></msup><mi>&beta;</mi>
                <mo>+</mo>
                <msub><mi>A</mi><mrow><mi>i</mi><mo>&#183;</mo></mrow></msub><mi>&omega;</mi>
                <mo>+</mo><msub><mi>u</mi><mrow><mtext>state</mtext><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msub>
                <mo>+</mo><msub><mi>u</mi><mrow><mtext>district</mtext><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msub>
              </mrow>
            </math>
          </div>
        </div>
        <div class="eq-block">
          <p class="eq-title">SPDE and basis expansion</p>
          <div class="eq-math">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <mrow>
                <msup><mrow><mo>(</mo><msup><mi>&kappa;</mi><mn>2</mn></msup><mo>-</mo><mi>&Delta;</mi><mo>)</mo></mrow><mrow><mi>&alpha;</mi><mo>/</mo><mn>2</mn></mrow></msup>
                <mo>(</mo><mi>&tau;</mi><mi>w</mi><mo>(</mo><mi>s</mi><mo>)</mo><mo>)</mo>
                <mo>=</mo>
                <mi>W</mi><mo>(</mo><mi>s</mi><mo>)</mo>
                <mo>,</mo>
                <mi>w</mi><mo>(</mo><mi>s</mi><mo>)</mo><mo>&asymp;</mo>
                <munderover><mo>&sum;</mo><mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow><mi>K</mi></munderover>
                <msub><mi>&psi;</mi><mi>k</mi></msub><mo>(</mo><mi>s</mi><mo>)</mo><msub><mi>&omega;</mi><mi>k</mi></msub>
              </mrow>
            </math>
          </div>
        </div>
        <p>Interpretation: INLA-SPDE preserves Bayesian uncertainty while making large-scale geospatial inference computationally practical.</p>
      `
    },
    inla_strengths: {
      tag: "INLA-SPDE Tradeoffs",
      title: "Strengths and Limits: INLA-SPDE",
      intro: "INLA-SPDE is optimized for scalable spatial Bayesian inference on large domains.",
      body: `
        <ul>
          <li><strong>Strength:</strong> Sparse precision matrices allow faster computation over large geographies.</li>
          <li><strong>Strength:</strong> Produces full posterior summaries (mean, SD, quantiles) for uncertainty mapping.</li>
          <li><strong>Limit:</strong> Approximation quality depends on mesh design and prior setup.</li>
          <li><strong>Limit:</strong> Poorly tuned mesh can over-smooth or under-smooth local effects.</li>
        </ul>
        <p>Use INLA-SPDE when repeated scenario analysis and uncertainty-aware mapping are central deliverables.</p>
      `
    },
    compare_why: {
      tag: "Comparison Logic",
      title: "Why Compare spGLM and INLA-SPDE?",
      intro: "Comparison is not redundant. It is a robustness diagnostic for both statistical structure and operational decisions.",
      body: `
        <ul>
          <li><strong>Cross-validation of findings:</strong> if both methods flag the same coldspots, confidence rises.</li>
          <li><strong>Sensitivity detection:</strong> disagreement reveals model-sensitive areas needing cautious interpretation.</li>
          <li><strong>Operational confidence:</strong> policy action can be prioritized where model agreement and low uncertainty coincide.</li>
          <li><strong>Method transparency:</strong> separates data-driven patterns from method-driven artifacts.</li>
        </ul>
        <p>In this project, method comparison is a decision-quality layer, not only a technical benchmark.</p>
      `
    },
    compare_interpret: {
      tag: "Interpretation Rule",
      title: "How to Interpret Agreement vs Disagreement",
      intro: "Use model agreement as a confidence signal and disagreement as an uncertainty signal.",
      body: `
        <div class="eq-block">
          <p class="eq-title">Simple agreement check</p>
          <div class="eq-math">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <mrow>
                <mi>&Delta;</mi><msub><mi>p</mi><mi>g</mi></msub>
                <mo>=</mo>
                <mo>|</mo><msub><mover><mi>p</mi><mo>^</mo></mover><mrow><mi>g</mi><mo>,</mo><mtext>INLA</mtext></mrow></msub>
                <mo>-</mo>
                <msub><mover><mi>p</mi><mo>^</mo></mover><mrow><mi>g</mi><mo>,</mo><mtext>spGLM</mtext></mrow></msub><mo>|</mo>
              </mrow>
            </math>
          </div>
        </div>
        <ul>
          <li><strong>Low &Delta;p and low uncertainty:</strong> high-confidence hotspots for intervention prioritization.</li>
          <li><strong>High &Delta;p or high uncertainty:</strong> investigate with field validation before scaling interventions.</li>
          <li><strong>Persistent agreement across NFHS rounds:</strong> strong evidence of structural immunization inequity.</li>
        </ul>
      `
    }
  };

  function openPopup(topicKey) {
    const topic = topics[topicKey];
    if (!topic) return;

    tagNode.textContent = topic.tag;
    titleNode.textContent = topic.title;
    introNode.textContent = topic.intro;
    bodyNode.innerHTML = topic.body;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    document.body.classList.add("popup-open");
  }

  function closePopup() {
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    document.body.classList.remove("popup-open");
  }

  triggers.forEach(function (button) {
    button.addEventListener("click", function () {
      openPopup(button.dataset.topic);
    });
  });

  if (backdrop) backdrop.addEventListener("click", closePopup);
  if (closeBtn) closeBtn.addEventListener("click", closePopup);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && popup.classList.contains("is-open")) {
      closePopup();
    }
  });
})();
