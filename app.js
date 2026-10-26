const STORAGE_KEYS = {
  characters: "okaki.characters",
  history: "okaki.history",
  theme: "okaki.theme"
};

const defaults = {
  characters: ["ルシファー", "うちの子", "推しキャラ"],
  expression: ["眠そう", "むすっとしている", "にやり", "びっくり", "やわらかい笑顔", "照れている", "真剣", "無表情"],
  outfit: ["ゆるい部屋着", "シャツ一枚", "黒いタートル", "パーカー", "ジャケット", "制服風", "いつもの服", "少しきれいめ"],
  pose: ["頬杖", "腕組み", "振り向く", "座っている", "寝転がる", "手を伸ばす", "髪をかき上げる", "こちらを見る"],
  composition: ["顔アップ", "胸上", "腰上", "全身", "横顔", "斜め後ろ", "俯瞰", "あおり"],
  bonus: ["眼鏡", "飲み物", "スマホ", "本", "ぬいぐるみ", "手袋", "アクセサリー", "おまけなし"]
};

const easyPools = {
  expression: ["好きな表情", "眠そう", "むすっと", "笑顔"],
  outfit: ["服は適当でOK", "いつもの服"],
  pose: ["顔だけ", "目だけ", "横顔だけ", "手を1個", "棒人間でもOK"],
  composition: ["顔アップ", "バストアップ"],
  bonus: ["おまけなし", "眼鏡だけ", "小物1個"]
};

let state = {
  level: "low",
  characters: load(STORAGE_KEYS.characters, defaults.characters),
  history: load(STORAGE_KEYS.history, []),
  locks: {},
  prompt: {}
};

function load(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function poolFor(key) {
  if (key === "character") return state.characters.length ? state.characters : ["好きなキャラ"];
  if (state.level === "low" && easyPools[key]) return easyPools[key];
  return defaults[key];
}
function rollKey(key) {
  state.prompt[key] = pick(poolFor(key));
  const row = document.querySelector(`.prompt-row[data-key="${key}"]`);
  row.querySelector(".prompt-value").textContent = state.prompt[key];
}
function rollAll() {
  document.querySelectorAll(".prompt-row").forEach(row => {
    const key = row.dataset.key;
    if (!state.locks[key]) rollKey(key);
  });
}
function promptText() {
  const labels = {
    character:"キャラ", expression:"表情", outfit:"服装",
    pose:"ポーズ", composition:"構図", bonus:"おまけ"
  };
  return Object.entries(labels).map(([k,v]) => `${v}：${state.prompt[k] || ""}`).join("\n");
}
function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1600);
}
function renderCharacters() {
  const wrap = document.getElementById("characterList");
  wrap.innerHTML = "";
  state.characters.forEach((name, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `<span>${escapeHtml(name)}</span><button title="削除" data-index="${i}">×</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      state.characters.splice(i,1);
      save(STORAGE_KEYS.characters, state.characters);
      renderCharacters();
      if (!state.characters.length) rollKey("character");
    });
    wrap.appendChild(chip);
  });
}
function renderHistory() {
  const list = document.getElementById("historyList");
  const count = state.history.length;
  document.getElementById("drawCount").textContent = count;

  const now = new Date();
  const thisMonth = state.history.filter(x => {
    const d = new Date(x.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  document.getElementById("monthCount").textContent = thisMonth;

  if (!count) {
    list.innerHTML = `<p class="empty">まだ記録はありません。最初の一枚を描いたらここに残ります。</p>`;
    return;
  }
  list.innerHTML = state.history.slice().reverse().map(item => {
    const d = new Date(item.date);
    const date = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    return `<div class="history-item">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${date}</span>
    </div>`;
  }).join("");
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

document.querySelectorAll(".energy").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".energy").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.level = btn.dataset.level;
    rollAll();
  });
});

document.getElementById("rollAll").addEventListener("click", rollAll);

document.querySelectorAll(".prompt-row").forEach(row => {
  const key = row.dataset.key;
  row.querySelector(".reroll-btn").addEventListener("click", () => rollKey(key));
  row.querySelector(".lock-btn").addEventListener("click", e => {
    state.locks[key] = !state.locks[key];
    e.currentTarget.textContent = state.locks[key] ? "🔒" : "🔓";
    e.currentTarget.classList.toggle("locked", state.locks[key]);
    toast(state.locks[key] ? "この項目を固定しました" : "固定を解除しました");
  });
});

document.getElementById("copyPrompt").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(promptText());
    toast("お題をコピーしました");
  } catch {
    toast("コピーできませんでした");
  }
});

document.getElementById("doneBtn").addEventListener("click", () => {
  const title = `${state.prompt.character || "キャラ"} / ${state.prompt.pose || "お題"}`;
  state.history.push({ date: new Date().toISOString(), title, prompt: {...state.prompt} });
  save(STORAGE_KEYS.history, state.history);
  renderHistory();
  toast("描いた！を記録しました ✦");
});

const dialog = document.getElementById("characterDialog");
document.getElementById("addCharacterBtn").addEventListener("click", () => {
  document.getElementById("characterName").value = "";
  dialog.showModal();
  setTimeout(() => document.getElementById("characterName").focus(), 50);
});
document.getElementById("characterForm").addEventListener("submit", e => {
  const submitter = e.submitter;
  if (submitter && submitter.value === "cancel") return;
  e.preventDefault();
  const input = document.getElementById("characterName");
  const name = input.value.trim();
  if (!name) {
    toast("キャラ名を入力してね");
    return;
  }
  state.characters.push(name);
  save(STORAGE_KEYS.characters, state.characters);
  renderCharacters();
  dialog.close();
  toast(`${name} を追加しました`);
});

document.getElementById("clearHistory").addEventListener("click", () => {
  if (!state.history.length) return;
  if (confirm("描いた記録をすべて消しますか？")) {
    state.history = [];
    save(STORAGE_KEYS.history, state.history);
    renderHistory();
    toast("記録を消しました");
  }
});

document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  document.getElementById("themeBtn").textContent = dark ? "☀" : "☾";
  localStorage.setItem(STORAGE_KEYS.theme, dark ? "dark" : "light");
});

if (localStorage.getItem(STORAGE_KEYS.theme) === "dark") {
  document.body.classList.add("dark");
  document.getElementById("themeBtn").textContent = "☀";
}

renderCharacters();
renderHistory();
rollAll();
