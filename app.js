const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const today = () => new Date().toISOString().slice(0, 10);
const dayMs = 86400000;

const data = {};
let route = "home";
let vocabPage = 1;
let phrasePage = 1;
let writingPage = 1;
let reviewDeck = [];
let reviewIndex = 0;
let answerVisible = false;
let sessionStarted = Date.now();

const blankState = () => ({
  version: 1,
  created: today(),
  dailyGoal: 20,
  words: {},
  masteredPhrases: [],
  learnedSentences: [],
  favoriteSentences: [],
  activity: {},
  totalMinutes: 0
});

let state = loadState();
function loadState() {
  try {
    return {...blankState(), ...JSON.parse(localStorage.getItem("word-orbit-progress") || "{}")};
  } catch {
    return blankState();
  }
}
function saveState() {
  localStorage.setItem("word-orbit-progress", JSON.stringify(state));
  updateChrome();
}
function activityToday() {
  return state.activity[today()] || {reviews: 0, phrases: 0, sentences: 0, minutes: 0};
}
function addActivity(field, amount = 1) {
  const key = today();
  state.activity[key] ||= {reviews: 0, phrases: 0, sentences: 0, minutes: 0};
  state.activity[key][field] = (state.activity[key][field] || 0) + amount;
}
function streak() {
  let count = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    const item = state.activity[key];
    if (!item || !(item.reviews || item.phrases || item.sentences || item.minutes)) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
function masteredWords() {
  return Object.values(state.words).filter(item => item.reps >= 3 && item.interval >= 7).length;
}
function dueWords() {
  const now = Date.now();
  return data.words.filter(word => state.words[word.id] && state.words[word.id].due <= now);
}
function newWords() {
  return data.words.filter(word => !state.words[word.id]);
}
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
}
function speak(text, lang = "en-US") {
  if (!("speechSynthesis" in window)) return toast("当前浏览器未提供本地语音朗读");
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = .82;
  speechSynthesis.speak(utterance);
}
function updateChrome() {
  $("#side-streak").textContent = streak();
  $("#today-minutes").textContent = (activityToday().minutes || 0) + " 分钟";
}

function navTo(next) {
  location.hash = next;
}
function setRoute() {
  route = (location.hash || "#home").slice(1);
  if (!["home","learn","vocab","phrases","writing","progress","about"].includes(route)) route = "home";
  $$(".main-nav button").forEach(button => button.classList.toggle("active", button.dataset.nav === route));
  $(".sidebar").classList.remove("open");
  render();
  $("#view").focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: "smooth"});
}

function homeView() {
  const act = activityToday();
  const completed = act.reviews || 0;
  const percent = Math.min(100, Math.round(completed / state.dailyGoal * 100));
  const known = masteredWords();
  const phraseCount = state.masteredPhrases.length;
  const sentenceCount = state.learnedSentences.length;
  return `
    <section class="page">
      <div class="hero">
        <div>
          <div class="eyebrow">TODAY'S ORBIT · ${esc(today())}</div>
          <h1>晚上好，学习者。<br>今天再点亮一小片星图。</h1>
          <p class="lead">先完成到期复习，再认识新词。每次主动回忆，都比重复浏览更接近真正掌握。</p>
          <div class="hero-actions">
            <button class="primary-btn" data-action="start-review">开始今日学习　→</button>
            <button class="secondary-btn" data-nav="progress">查看成长轨迹</button>
          </div>
        </div>
        <div class="goal-ring" style="--progress:${percent}%">
          <div class="ring-inner"><strong>${percent}%</strong><span>今日 ${completed} / ${state.dailyGoal} 词</span></div>
        </div>
      </div>
      <div class="section-head"><div><h2>选择学习轨道</h2><p>词、块、句三个层级相互连接</p></div><span class="eyebrow">本地进度已自动保存</span></div>
      <div class="planet-grid">
        <article class="planet-card" data-nav="learn"><span class="count">3500</span><div class="planet"></div><h3>高考核心词汇</h3><p>音形义、词形、词族与语境记忆，按到期时间自动安排复习。</p></article>
        <article class="planet-card" data-nav="phrases"><span class="count">300</span><div class="planet sand"></div><h3>高频词块</h3><p>按 2021–2025 学习优先级整理，配中文与主动造句方法。</p></article>
        <article class="planet-card" data-nav="writing"><span class="count">200</span><div class="planet teal"></div><h3>读后续写句舱</h3><p>不只背句子：看亮点、记骨架，再用自己的情节完成仿写。</p></article>
      </div>
      <div class="section-head"><div><h2>学习概览</h2><p>所有数据都来自这台设备</p></div></div>
      <div class="stats-grid">
        <div class="stat-card"><span>已掌握单词</span><strong>${known}</strong><small>占词库 ${(known/35).toFixed(1)}%</small></div>
        <div class="stat-card"><span>待复习单词</span><strong>${dueWords().length}</strong><small>按记忆间隔自动到期</small></div>
        <div class="stat-card"><span>已掌握短语</span><strong>${phraseCount}</strong><small>共 300 条</small></div>
        <div class="stat-card"><span>已学续写句</span><strong>${sentenceCount}</strong><small>共 200 句</small></div>
      </div>
    </section>`;
}

function prepareDeck(force = false) {
  if (reviewDeck.length && !force) return;
  const due = dueWords();
  const fresh = newWords().slice(0, Math.max(8, state.dailyGoal - due.length));
  reviewDeck = [...due, ...fresh].slice(0, Math.max(state.dailyGoal, 12));
  if (!reviewDeck.length) reviewDeck = data.words.slice(0, state.dailyGoal);
  reviewIndex = 0;
  answerVisible = false;
}
function formLabel(key) {
  return ({singular:"单数",plural:"复数",base:"原形",past:"过去式",pastParticiple:"过去分词",ing:"现在分词",thirdPerson:"第三人称单数",comparative:"比较级",superlative:"最高级"})[key] || key;
}
function answerHTML(word) {
  const meanings = word.meanings.map(item => `<li><b>${esc(item.pos)}</b>　${esc(item.cn)}</li>`).join("");
  const forms = Object.entries(word.forms || {}).map(([k,v]) => `<span class="chip">${formLabel(k)} · ${esc(v)}</span>`).join("");
  const family = word.family?.slice(0,8).map(item => `<span class="chip">${esc(item.word)} ${item.pos ? "· "+esc(item.pos) : ""}</span>`).join("") || "暂无可靠词族记录";
  const examples = word.examples?.length ? word.examples.map(item => `<div class="example">${esc(item.en)}<em>${esc(item.cn)}</em></div>`).join("") : `<p>试着用“人物 + 动作 + 结果”给这个词造一个自己的句子。</p>`;
  const prep = word.preposition ? `<div class="answer-box"><h4>介词用法</h4><p>${esc(word.preposition.usage)}</p><div class="chip-list">${word.preposition.collocations.map(x => `<span class="chip">${esc(x.phrase)} · ${esc(x.translation)}</span>`).join("")}</div></div>` : "";
  return `
    <div class="answer">
      <h3>${esc(word.translation)}</h3>
      <div class="answer-grid">
        <div class="answer-box"><h4>核心义项</h4><ul>${meanings}</ul></div>
        <div class="answer-box"><h4>词形变化</h4><div class="chip-list">${forms || "此词无常用屈折变化"}</div></div>
        <div class="answer-box"><h4>语境例句</h4>${examples}</div>
        <div class="answer-box"><h4>词族 / 派生</h4><div class="chip-list">${family}</div><h4 style="margin-top:15px">记忆钩子</h4><p>${esc(word.memory)}</p></div>
        ${prep}
      </div>
    </div>`;
}
function learnView() {
  prepareDeck();
  const word = reviewDeck[reviewIndex];
  if (!word) return `<section class="page"><div class="learn-card empty-state"><h2>本轮完成</h2><p>你已经完成这组主动回忆。</p><button class="primary-btn" data-action="new-deck">再来一组</button></div></section>`;
  const progress = Math.round(reviewIndex / reviewDeck.length * 100);
  return `
    <section class="page">
      <div class="page-head"><div><span class="eyebrow">ACTIVE RECALL</span><h1>单词学习</h1><p class="lead">先尝试回忆，再翻开答案。评分不是考试，而是在告诉系统下次什么时候再见。</p></div><button class="secondary-btn" data-nav="vocab">打开完整词库</button></div>
      <div class="learn-layout">
        <article class="learn-card">
          <div class="learn-top"><span>本轮 ${reviewIndex+1} / ${reviewDeck.length}</span><span>${esc(word.level)}</span></div>
          <div class="progress-line"><i style="width:${progress}%"></i></div>
          <div class="word-stage">
            <h2>${esc(word.word)}</h2>
            <div class="phonetics">
              <button class="voice-btn" data-speak="${esc(word.word)}" data-lang="en-GB">🔊 英 /${esc(word.pronunciation.uk)}/</button>
              <button class="voice-btn" data-speak="${esc(word.word)}" data-lang="en-US">🔊 美 /${esc(word.pronunciation.us)}/</button>
            </div>
            ${answerVisible ? answerHTML(word) : `<div class="reveal-wrap"><p class="lead">闭上眼睛：它是什么词性？你能说出一个意思或搭配吗？</p><button class="primary-btn" data-action="reveal">翻开答案</button></div>`}
            ${answerVisible ? `<div class="ratings">
              <button class="rating-btn" data-rating="again">忘记了<span>很快再见</span></button>
              <button class="rating-btn" data-rating="hard">有点难<span>2 天后</span></button>
              <button class="rating-btn" data-rating="good">想起来了<span>按间隔复习</span></button>
              <button class="rating-btn" data-rating="easy">非常熟<span>拉长间隔</span></button>
            </div>` : ""}
          </div>
        </article>
        <aside class="side-panel">
          <div class="stat-card"><span>今日已学</span><strong>${activityToday().reviews || 0}</strong><small>目标 ${state.dailyGoal} 词</small></div>
          <div class="stat-card"><span>今日到期</span><strong>${dueWords().length}</strong><small>先复习，再学新词</small></div>
          <div class="quote-card"><small>记忆建议</small><p>“不要重读答案。先逼自己从空白中把它找回来。”</p><small>主动回忆原则</small></div>
        </aside>
      </div>
    </section>`;
}
function rateWord(rating) {
  const word = reviewDeck[reviewIndex];
  const previous = state.words[word.id] || {reps:0, interval:0, ease:2.5};
  const config = {
    again: {factor:0, ease:-.2, minimum:0},
    hard: {factor:1.2, ease:-.1, minimum:2},
    good: {factor:2.2, ease:0, minimum:3},
    easy: {factor:3.2, ease:.12, minimum:5}
  }[rating];
  const reps = rating === "again" ? 0 : previous.reps + 1;
  const interval = rating === "again" ? 0 : Math.max(config.minimum, Math.round((previous.interval || 1) * config.factor));
  state.words[word.id] = {reps, interval, ease:Math.max(1.3, previous.ease + config.ease), due:Date.now() + (rating === "again" ? 10*60*1000 : interval*dayMs), lastRating:rating, lastReviewed:Date.now()};
  addActivity("reviews");
  saveState();
  reviewIndex++;
  answerVisible = false;
  render();
}

function vocabView() {
  const query = ($("#vocab-search")?.value || "").trim().toLowerCase();
  const part = $("#vocab-part")?.value || "all";
  const filtered = data.words.filter(word => (!query || word.word.includes(query) || word.translation.includes(query)) && (part === "all" || word.parts.includes(part)));
  const perPage = 60;
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  vocabPage = Math.min(vocabPage, pages);
  const slice = filtered.slice((vocabPage-1)*perPage, vocabPage*perPage);
  return `
    <section class="page">
      <div class="page-head"><div><span class="eyebrow">FROZEN CORPUS · EXACTLY 3500</span><h1>高考 3500 词库</h1><p class="lead">点击任一词条查看音标、释义、词形、词族、介词搭配与例句。数据口径可在“内容说明”中审计。</p></div><button class="primary-btn" data-action="start-review">开始记忆训练</button></div>
      <div class="toolbar">
        <label class="input-wrap"><span>⌕</span><input id="vocab-search" value="${esc(query)}" placeholder="搜索英文或中文" autocomplete="off"></label>
        <select id="vocab-part"><option value="all">全部词性</option>${[["n","名词"],["v","动词"],["adj","形容词"],["adv","副词"],["prep","介词"]].map(([v,l]) => `<option value="${v}" ${part===v?"selected":""}>${l}</option>`).join("")}</select>
      </div>
      <div class="list-panel">${slice.map(word => `
        <div class="word-row" data-word-id="${word.id}" tabindex="0">
          <span class="rank">#${String(word.rank).padStart(4,"0")}</span><strong>${esc(word.word)}</strong><p>${esc(word.translation)}</p><span class="tag">${esc(word.parts.join(" / "))}</span><button class="voice-btn" data-speak="${esc(word.word)}" data-lang="en-US" aria-label="朗读">🔊</button>
        </div>`).join("") || `<div class="empty-state">没有找到匹配词条</div>`}
        <div class="pagination"><button class="soft-btn" data-page="${Math.max(1,vocabPage-1)}">上一页</button><span>${vocabPage} / ${pages} · 共 ${filtered.length} 词</span><button class="soft-btn" data-page="${Math.min(pages,vocabPage+1)}">下一页</button></div>
      </div>
    </section>`;
}
function phrasesView() {
  const query = ($("#phrase-search")?.value || "").trim().toLowerCase();
  const filtered = data.phrases.filter(item => !query || item.phrase.includes(query) || item.translation.includes(query));
  const perPage = 50, pages = Math.max(1, Math.ceil(filtered.length/perPage));
  phrasePage = Math.min(phrasePage,pages);
  const slice = filtered.slice((phrasePage-1)*perPage,phrasePage*perPage);
  return `<section class="page">
    <div class="page-head"><div><span class="eyebrow">2021–2025 STUDY PRIORITY · EXACTLY 300</span><h1>高频短语轨道</h1><p class="lead">这是透明标注的学习优先级，不冒充考试院官方出现次数。掌握一个短语的标准，是能在新语境里自己造句。</p></div><span class="tag">已掌握 ${state.masteredPhrases.length} / 300</span></div>
    <div class="toolbar"><label class="input-wrap"><span>⌕</span><input id="phrase-search" value="${esc(query)}" placeholder="搜索短语或中文"></label></div>
    <div class="list-panel">${slice.map(item => {
      const done = state.masteredPhrases.includes(item.rank);
      return `<div class="phrase-row">
        <span class="rank">#${String(item.rank).padStart(3,"0")}</span>
        <strong>${esc(item.phrase)}</strong><p>${esc(item.translation)} · ${esc(item.note)}</p>
        <span class="tag">${esc(item.band)}</span>
        <button class="master-btn ${done?"done":""}" data-phrase-rank="${item.rank}">${done?"已掌握":"标记掌握"}</button>
      </div>`;
    }).join("")}
      <div class="pagination"><button class="soft-btn" data-phrase-page="${Math.max(1,phrasePage-1)}">上一页</button><span>${phrasePage} / ${pages} · 共 ${filtered.length} 条</span><button class="soft-btn" data-phrase-page="${Math.min(pages,phrasePage+1)}">下一页</button></div>
    </div>
  </section>`;
}
function writingView() {
  const category = $("#writing-category")?.value || "all";
  const categories = [...new Set(data.writing.map(item => item.category))];
  const filtered = data.writing.filter(item => category==="all" || item.category===category);
  const perPage = 20, pages = Math.max(1,Math.ceil(filtered.length/perPage));
  writingPage = Math.min(writingPage,pages);
  const slice = filtered.slice((writingPage-1)*perPage,writingPage*perPage);
  return `<section class="page">
    <div class="page-head"><div><span class="eyebrow">ORIGINAL CONTINUATION WRITING · EXACTLY 200</span><h1>读后续写句舱</h1><p class="lead">“万能”不是到处硬套。先看句式为何有效，再用你的情节替换人物、动作和主题。</p></div><span class="tag">已学 ${state.learnedSentences.length} / 200</span></div>
    <div class="toolbar"><select id="writing-category"><option value="all">全部情境</option>${categories.map(c => `<option ${category===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
    <div class="writing-grid">${slice.map(item => {
      const learned = state.learnedSentences.includes(item.id), fav = state.favoriteSentences.includes(item.id);
      return `<article class="sentence-card">
        <div class="meta"><span>${esc(item.category)} · ${esc(item.technique)}</span><span>${item.id.toUpperCase()}</span></div>
        <blockquote>${esc(item.sentence)}</blockquote><p class="translation">${esc(item.translation)}</p>
        <details><summary>为什么好 · 如何仿写</summary><p><b>亮点：</b>${esc(item.whyItWorks)}</p><p><b>公式：</b>${esc(item.buildYourOwn)}</p><p><b>记忆：</b>${esc(item.memory)}</p></details>
        <div class="card-actions"><button class="soft-btn" data-speak="${esc(item.sentence)}" data-lang="en-US">🔊 朗读</button><button class="soft-btn" data-favorite="${item.id}">${fav?"★ 已收藏":"☆ 收藏"}</button><button class="master-btn ${learned?"done":""}" data-sentence="${item.id}">${learned?"已学会":"完成学习"}</button></div>
      </article>`;
    }).join("")}</div>
    <div class="pagination"><button class="soft-btn" data-writing-page="${Math.max(1,writingPage-1)}">上一页</button><span>${writingPage} / ${pages}</span><button class="soft-btn" data-writing-page="${Math.min(pages,writingPage+1)}">下一页</button></div>
  </section>`;
}
function progressView() {
  const days = Array.from({length:7},(_,i) => { const d=new Date(); d.setDate(d.getDate()-6+i); return d.toISOString().slice(0,10); });
  const max = Math.max(1,...days.map(key => state.activity[key]?.reviews || 0));
  return `<section class="page">
    <div class="page-head"><div><span class="eyebrow">LOCAL LEARNING ANALYTICS</span><h1>学习数据</h1><p class="lead">记录每一次坚持，看见你真实的成长。换网址或设备前，请先导出进度 JSON。</p></div><div class="hero-actions"><button class="secondary-btn" id="progress-export">导出进度</button><button class="secondary-btn" data-action="reset-progress">清空进度</button></div></div>
    <div class="stats-grid">
      <div class="stat-card"><span>累计接触单词</span><strong>${Object.keys(state.words).length}</strong><small>词库共 3500</small></div>
      <div class="stat-card"><span>稳定掌握</span><strong>${masteredWords()}</strong><small>至少复习 3 次且间隔 ≥ 7 天</small></div>
      <div class="stat-card"><span>连续学习</span><strong>${streak()} 天</strong><small>保持节奏比冲刺更重要</small></div>
      <div class="stat-card"><span>学习项目</span><strong>${Object.keys(state.words).length+state.masteredPhrases.length+state.learnedSentences.length}</strong><small>词 + 短语 + 续写句</small></div>
    </div>
    <div class="section-head"><div><h2>近 7 天主动回忆</h2><p>按单词评分次数统计</p></div></div>
    <div class="chart-panel">
      <div class="about-card"><div class="bar-chart">${days.map(key => { const value=state.activity[key]?.reviews||0; return `<div class="bar-col"><i style="--h:${Math.round(value/max*100)}%"></i><span>${key.slice(5)}<br>${value}</span></div>`; }).join("")}</div></div>
      <div class="about-card"><h2>掌握结构</h2><p>已接触 ${Object.keys(state.words).length} 词，其中 ${masteredWords()} 词进入稳定间隔；${dueWords().length} 词已经到期等待复习。</p><div class="progress-line"><i style="width:${Math.min(100,masteredWords()/35)}%"></i></div><p><strong>建议：</strong>如果到期词很多，先把每日新词目标调低，直到复习量恢复平稳。</p></div>
    </div>
  </section>`;
}
function aboutView() {
  const meta = data.meta;
  return `<section class="page">
    <div class="page-head"><div><span class="eyebrow">CONTENT & ACCESS NOTES</span><h1>内容与使用说明</h1><p class="lead">这里公开数据口径、技术边界和大陆访问条件。漂亮的界面不应该掩盖内容事实。</p></div></div>
    <article class="about-card"><h2>3500 词是什么口径？</h2><p>${esc(meta.wordScope.method)}</p><p><strong>重要边界：</strong>${esc(meta.wordScope.importantLimit)}</p><p><strong>词形与派生：</strong>${esc(meta.wordScope.forms)}</p><p><strong>发音：</strong>${esc(meta.wordScope.pronunciation)}</p></article>
    <article class="about-card"><h2>短语排名是否为官方榜？</h2><p>${esc(meta.phraseScope.method)}</p><p><strong>重要边界：</strong>${esc(meta.phraseScope.importantLimit)}</p></article>
    <article class="about-card"><h2>200 个续写句怎样使用？</h2><p>${esc(meta.writingScope.method)}</p><p><strong>重要边界：</strong>${esc(meta.writingScope.importantLimit)}</p></article>
    <article class="about-card"><h2>中国大陆访问与隐私</h2><p>本网站代码没有 Google Fonts、海外 CDN、登录、后端或境外 API；单词朗读使用浏览器本地语音，进度写入 localStorage。代码层面适合大陆直连，但<strong>最终能否保证所有学生打开</strong>仍取决于你选择的域名、托管商、备案状态和真实网络验证。发布后必须用大陆网络测试真实网址，不能只凭平台名称作保证。</p><ul><li>换域名或设备前先导出进度，浏览器数据不会自动跨域同步。</li><li>静态站点无需学生注册，也不采集姓名、邮箱或学习记录。</li><li>生成日期：${esc(meta.generated)}；当前计数：${meta.counts.words} / ${meta.counts.phrases} / ${meta.counts.writing}。</li></ul></article>
  </section>`;
}
function render() {
  const views = {home:homeView,learn:learnView,vocab:vocabView,phrases:phrasesView,writing:writingView,progress:progressView,about:aboutView};
  $("#view").innerHTML = views[route]();
}

function showWord(id) {
  const word = data.words.find(item => item.id === id);
  if (!word) return;
  $("#word-dialog-body").innerHTML = `
    <div class="detail-title"><div><span class="eyebrow">#${String(word.rank).padStart(4,"0")} · ${esc(word.level)}</span><h2>${esc(word.word)}</h2></div><div class="phonetics"><button class="voice-btn" data-speak="${esc(word.word)}" data-lang="en-GB">英 /${esc(word.pronunciation.uk)}/</button><button class="voice-btn" data-speak="${esc(word.word)}" data-lang="en-US">美 /${esc(word.pronunciation.us)}/</button></div></div>
    ${answerHTML(word)}
  `;
  $("#word-dialog").showModal();
}
function openSearch() {
  $("#search-dialog").showModal();
  $("#dialog-search-input").value = "";
  renderSearchResults("");
  setTimeout(() => $("#dialog-search-input").focus(), 20);
}
function renderSearchResults(query) {
  const q = query.trim().toLowerCase();
  const matches = (q ? data.words.filter(word => word.word.includes(q) || word.translation.includes(q)) : data.words.slice(0,12)).slice(0,40);
  $("#dialog-search-results").innerHTML = matches.map(word => `<button class="dialog-result" data-word-id="${word.id}"><strong>${esc(word.word)}</strong><span>${esc(word.translation)}</span></button>`).join("") || `<div class="empty-state">没有找到匹配词条</div>`;
}
function exportProgress() {
  const blob = new Blob([JSON.stringify({...state, exportedAt:new Date().toISOString()}, null, 2)], {type:"application/json"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `word-orbit-progress-${today()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
  toast("进度已导出，请妥善保存");
}
async function importProgress(file) {
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== "object" || !parsed.words) throw new Error("invalid");
    state = {...blankState(), ...parsed};
    saveState(); render(); toast("进度导入成功");
  } catch { toast("无法识别这个进度文件"); }
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-nav]");
  if (nav) return navTo(nav.dataset.nav);
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "start-review") { prepareDeck(true); navTo("learn"); }
  if (action === "new-deck") { prepareDeck(true); render(); }
  if (action === "reveal") { answerVisible = true; render(); }
  if (action === "reset-progress") {
    if (confirm("确定清空全部本地学习进度吗？此操作不能撤销。")) { state=blankState(); saveState(); render(); toast("学习进度已清空"); }
  }
  const rating = event.target.closest("[data-rating]")?.dataset.rating;
  if (rating) rateWord(rating);
  const voice = event.target.closest("[data-speak]");
  if (voice) { event.stopPropagation(); speak(voice.dataset.speak, voice.dataset.lang); }
  const wordRow = event.target.closest("[data-word-id]");
  if (wordRow && !event.target.closest("[data-speak]")) { $("#search-dialog").close(); showWord(wordRow.dataset.wordId); }
  const page = event.target.closest("[data-page]")?.dataset.page;
  if (page) { vocabPage=Number(page); render(); }
  const phrasePageNext = event.target.closest("[data-phrase-page]")?.dataset.phrasePage;
  if (phrasePageNext) { phrasePage=Number(phrasePageNext); render(); }
  const writingPageNext = event.target.closest("[data-writing-page]")?.dataset.writingPage;
  if (writingPageNext) { writingPage=Number(writingPageNext); render(); }
  const phrase = event.target.closest("[data-phrase-rank]");
  if (phrase) {
    const rank=Number(phrase.dataset.phraseRank), has=state.masteredPhrases.includes(rank);
    state.masteredPhrases = has ? state.masteredPhrases.filter(x=>x!==rank) : [...state.masteredPhrases,rank];
    if (!has) addActivity("phrases");
    saveState(); render();
  }
  const sentence = event.target.closest("[data-sentence]");
  if (sentence) {
    const id=sentence.dataset.sentence, has=state.learnedSentences.includes(id);
    state.learnedSentences = has ? state.learnedSentences.filter(x=>x!==id) : [...state.learnedSentences,id];
    if (!has) addActivity("sentences");
    saveState(); render();
  }
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    const id=favorite.dataset.favorite, has=state.favoriteSentences.includes(id);
    state.favoriteSentences = has ? state.favoriteSentences.filter(x=>x!==id) : [...state.favoriteSentences,id];
    saveState(); render();
  }
});
document.addEventListener("input", event => {
  if (event.target.id === "vocab-search") { vocabPage=1; render(); setTimeout(() => { const input=$("#vocab-search"); input.focus(); input.setSelectionRange(input.value.length,input.value.length); },0); }
  if (event.target.id === "phrase-search") { phrasePage=1; render(); setTimeout(() => { const input=$("#phrase-search"); input.focus(); input.setSelectionRange(input.value.length,input.value.length); },0); }
  if (event.target.id === "dialog-search-input") renderSearchResults(event.target.value);
});
document.addEventListener("change", event => {
  if (event.target.id === "vocab-part") { vocabPage=1; render(); }
  if (event.target.id === "writing-category") { writingPage=1; render(); }
});
document.addEventListener("keydown", event => {
  if (event.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); openSearch(); }
  if (event.key === "Enter" && event.target.matches(".word-row")) showWord(event.target.dataset.wordId);
});
$("#menu-btn").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#global-search-btn").addEventListener("click", openSearch);
$("#export-btn").addEventListener("click", exportProgress);
$("#import-input").addEventListener("change", event => event.target.files[0] && importProgress(event.target.files[0]));
document.addEventListener("click", event => { if (event.target.id === "progress-export") exportProgress(); });
window.addEventListener("hashchange", setRoute);

async function boot() {
  try {
    const [words,phrases,writing,meta] = await Promise.all(["words.json","phrases.json","writing.json","content-meta.json"].map(name => fetch("./public/data/"+name).then(response => {
      if (!response.ok) throw new Error(name);
      return response.json();
    })));
    Object.assign(data,{words,phrases,writing,meta});
    $("#app").hidden = false;
    updateChrome();
    setRoute();
    $("#boot").style.opacity = "0";
    setTimeout(() => $("#boot").remove(), 500);
  } catch (error) {
    $("#boot").innerHTML = "<h2>内容加载失败</h2><p>请通过静态服务器或部署网址打开本项目，而不是直接双击本地 HTML 文件。</p>";
    console.error(error);
  }
}
setInterval(() => {
  if (document.hidden) return;
  const elapsed = Math.floor((Date.now()-sessionStarted)/60000);
  if (elapsed <= (activityToday().minutes || 0)) return;
  state.totalMinutes = Math.max(state.totalMinutes || 0, elapsed);
  state.activity[today()] ||= {reviews:0,phrases:0,sentences:0,minutes:0};
  state.activity[today()].minutes = elapsed;
  saveState();
},60000);
boot();

