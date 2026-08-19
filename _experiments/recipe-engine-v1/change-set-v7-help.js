(() => {
  "use strict";

  const HELP = {
    character: {
      label: "想把人物換成什麼？",
      placeholder: "例如：AA 改成白髮男性、琥珀眼；BB 保持原樣。",
      hint: "直接寫最後想看到的人物設定就好，不用重寫原句，也不用整理成完整 Prompt。",
    },
    wardrobe_props: {
      label: "想把衣著／小道具換成什麼？",
      placeholder: "例如：AA 改穿象牙白西裝；BB 手上改拿黑色長柄傘。",
      hint: "只寫新的結果就好；沒提到的衣著和小道具，小精靈不加戲。",
    },
    dynamic: {
      label: "想把動作／互動改成什麼？",
      placeholder: "例如：BB 從背後抱住 AA，AA 回頭看向 BB；保留風吹髮絲。",
      hint: "可以直接用一句自然中文或英文描述動作，小精靈會拿它替換剛剛撈出的動態片段。",
    },
    background: {
      label: "想把背景換去哪裡？",
      placeholder: "例如：改成台灣夜市街道，保留人物原本的動作與服裝。",
      hint: "寫地點、空間或想保留的背景條件即可，不必把人物設定再寫一次。",
    },
    camera: {
      label: "想把鏡頭改成什麼？",
      placeholder: "例如：4:5 直幅、三分之四身、略低角度；不要看鏡頭。",
      hint: "景別、視角、焦段、比例或構圖都可以直接寫結果；不懂攝影術語也沒關係。",
    },
    filter: {
      label: "想換成什麼畫面感？",
      placeholder: "例如：暖色底片感、柔和自然光、低飽和；保留寫實質感。",
      hint: "畫風、光線、色調或質感都可以用日常語言描述，不需要自己拼關鍵詞。",
    },
  };

  function decorateCard(card) {
    const id = card.dataset.v7Preview;
    const config = HELP[id];
    const field = card.querySelector(".fairy-replacement-field");
    const textarea = field?.querySelector("[data-v7-replacement]");
    const label = field?.querySelector(":scope > span");
    if (!config || !field || !textarea || !label) return;

    const refMode = id === "character" && Boolean(card.querySelector(".fairy-ref-note"));
    if (refMode) {
      label.textContent = "參考圖之外，還想補充什麼？（選填）";
      textarea.placeholder = "例如：保留左耳單圈耳環、右手食指戒指。";
    } else {
      label.textContent = config.label;
      textarea.placeholder = config.placeholder;
    }

    let hint = field.querySelector(".fairy-input-hint");
    if (!hint) {
      hint = document.createElement("small");
      hint.className = "fairy-input-hint";
      field.append(hint);
    }
    hint.textContent = refMode
      ? "參考圖已負責主要外觀；這裡只補充參考圖不一定能說清楚的固定特徵，不用重寫整個人物。"
      : config.hint;
  }

  function decorateHowTo(stack) {
    if (!stack || stack.querySelector(":scope > .fairy-fill-guide")) return;
    if (!stack.querySelector(".fairy-preview-card")) return;
    const guide = document.createElement("div");
    guide.className = "fairy-fill-guide";
    guide.innerHTML = "<strong>怎麼填？</strong><span>直接告訴小精靈最後想看到的結果就好。可以寫自然中文或英文，不用複製原句，也不用自己改成 Prompt 格式。</span>";
    stack.prepend(guide);
  }

  function apply() {
    const stack = document.querySelector(".workspace-page [data-v7-preview-stack]");
    decorateHowTo(stack);
    document.querySelectorAll(".workspace-page .fairy-preview-card[data-v7-preview]").forEach(decorateCard);
  }

  const app = document.getElementById("app");
  if (!app) return;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  window.addEventListener("hashchange", schedule);
  schedule();
})();
