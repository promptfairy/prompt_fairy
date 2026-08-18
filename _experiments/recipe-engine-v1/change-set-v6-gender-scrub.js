(() => {
  "use strict";

  let rewriting = false;

  function countMatches(text, pattern) {
    return (String(text || "").match(pattern) || []).length;
  }

  function scrubSourceGenderBranches(source) {
    let text = String(source || "");
    let removed = 0;

    const sectionPatterns = [
      /\n?\[\d+\.\s*(?:여성|남성)\s*타깃용\]\s*\n[\s\S]*?(?=\n\[\d+\.\s*|$)/gi,
      /\n?\[\d+\.\s*(?:female|male)(?:\s+target)?[^\]]*\]\s*\n[\s\S]*?(?=\n\[\d+\.\s*|$)/gi,
      /\n?\[\d+\.\s*(?:女性|男性)(?:目標|目标|對象|对象|用)?[^\]]*\]\s*\n[\s\S]*?(?=\n\[\d+\.\s*|$)/gi
    ];

    sectionPatterns.forEach((pattern) => {
      removed += countMatches(text, pattern);
      text = text.replace(pattern, "\n");
    });

    const linePatterns = [
      /^.*(?:익명의\s*성인동반자|반대되는\s*이성으로\s*생성).*$\n?/gmi,
      /^.*(?:anonymous\s+adult\s+companion).*(?:opposite[- ]?sex|opposite\s+gender).*$\n?/gmi,
      /^.*(?:匿名.*(?:異性|异性)|(?:異性|异性).*匿名).*$\n?/gmi,
      /^\s*\d+\.\s*여성[·\/]남성\s*분기를[^\n]*\n?/gmi
    ];

    linePatterns.forEach((pattern) => {
      removed += countMatches(text, pattern);
      text = text.replace(pattern, "");
    });

    const sentencePatterns = [
      /성별\s*표현이\s*불명확하면[^.。]*(?:[.。]|$)/gi,
      /if\s+(?:the\s+)?gender(?:\s+expression)?\s+is\s+(?:unclear|ambiguous)[^.]*\.?/gi,
      /(?:若|如果).{0,12}(?:性別|性别).{0,12}(?:不明確|不明确|模糊)[^.。]*(?:[.。]|$)/gi
    ];

    sentencePatterns.forEach((pattern) => {
      removed += countMatches(text, pattern);
      text = text.replace(pattern, "");
    });

    text = text
      .replace(/\n[ \t]+\n/g, "\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    return { text, removed };
  }

  function transformOutput(value) {
    const input = String(value || "");
    if (!input.includes("[SOURCE PROMPT]")) return null;

    const appearanceActive = input.includes("Identity / appearance override:");
    const hasTwoReferenceSlots = input.includes("[AA] = reference image") && input.includes("[BB] = reference image");
    if (!appearanceActive && !hasTwoReferenceSlots) return null;

    const marker = "[SOURCE PROMPT]\n";
    const start = input.indexOf(marker);
    if (start < 0) return null;
    const bodyStart = start + marker.length;
    const generatedMarkers = [
      "\n\n[ADDITIONAL SAFE MATERIAL]",
      "\n\n[IDENTITY PATCH]",
      "\n\n[CHANGE PATCH]",
      "\n\n[STYLE AUTHORITY"
    ];
    const ends = generatedMarkers
      .map((token) => input.indexOf(token, bodyStart))
      .filter((index) => index >= 0);
    const bodyEnd = ends.length ? Math.min(...ends) : input.length;

    const source = input.slice(bodyStart, bodyEnd);
    const scrubbed = scrubSourceGenderBranches(source);
    if (!scrubbed.removed && !/gender branch:/i.test(input)) return null;

    let output = input.slice(0, bodyStart) + scrubbed.text + input.slice(bodyEnd);

    output = output.replace(/^\[A[AB]\]\s+gender branch:\s*(?:female|male)\s*$\n?/gmi, "");

    if (output.includes("[IDENTITY PATCH]")) {
      output = output.replace(
        "[IDENTITY PATCH]\n",
        "[IDENTITY PATCH]\nSource gender-conditioned branches were removed before generation. Static identity comes from the assigned reference images and Identity Anchors. Keep each reference subject's actual hair length and silhouette; apply only the source's dynamic hair movement, expression, pose and interaction.\n"
      );
    }

    return { output, removed: scrubbed.removed };
  }

  document.addEventListener("input", (event) => {
    if (rewriting || event.target?.id !== "outputPrompt") return;
    const transformed = transformOutput(event.target.value);
    if (!transformed) return;

    rewriting = true;
    event.target.value = transformed.output;
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
    rewriting = false;

    requestAnimationFrame(() => {
      const aside = document.querySelector(".output-workspace .output-aside");
      if (!aside) return;
      aside.querySelector("[data-v6-gender-note]")?.remove();
      const note = document.createElement("div");
      note.className = "notice success";
      note.dataset.v6GenderNote = "true";
      note.innerHTML = `<strong>已清除來源性別分支</strong><span>Reference-first 模式下，來源角色的男女條件不再與 [AA] / [BB] 身份競爭。</span><small></small>`;
      note.querySelector("small").textContent = `本次移除 ${transformed.removed} 組來源性別條件／分支；保留姿勢、表情、動態髮絲、構圖與畫風。`;
      aside.prepend(note);
    });
  }, true);
})();
