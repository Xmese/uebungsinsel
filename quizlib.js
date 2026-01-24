// quizlib.js — tiny helper library for Übungsinsel quizzes
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function choice(arr) {
  return arr[randInt(0, arr.length - 1)];
}
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function norm(s) {
  return (s ?? "").toString().trim().replace(/\s+/g, " ").toLowerCase();
}
export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

/**
 * Build a standard quiz page inside a container.
 * Questions format:
 * { id, promptHtml, type: "num"|"text"|"select"|"pair"|"multi",
 *   options?: [{v,label}], answer, explain?: string }
 */
export function renderQuiz({ mount, title, subtitle, questions }) {
  mount.innerHTML = "";

  const resultBox = el("div", { class: "result", id: "resultBox" }, ["Noch nicht geprüft."]);
  const list = el("div", {});

  for (const q of questions) {
    const qWrap = el("div", { class: "q", "data-qid": q.id, "data-type": q.type, "data-answer": q.answer });

    const prompt = el("div", {});
    prompt.innerHTML = q.promptHtml;
    qWrap.appendChild(prompt);

    let inputEl;

    if (q.type === "num" || q.type === "text") {
      inputEl = el("input", {
        type: "text",
        inputmode: q.type === "num" ? "numeric" : "text",
        placeholder: q.type === "num" ? "Zahl" : "Antwort",
      });
      qWrap.appendChild(inputEl);
    }

    if (q.type === "select") {
      const sel = el("select", {});
      sel.appendChild(el("option", { value: "" }, ["— wählen —"]));
      for (const o of q.options ?? []) sel.appendChild(el("option", { value: o.v }, [o.label]));
      inputEl = sel;
      qWrap.appendChild(sel);
    }

    if (q.type === "pair") {
      const grid = el("div", { class: "inline2" }, [
        el("input", { type: "text", inputmode: "numeric", placeholder: "Teil 1" }),
        el("input", { type: "text", inputmode: "numeric", placeholder: "Teil 2" }),
      ]);
      qWrap.appendChild(grid);
    }

    if (q.type === "multi") {
      const wants = (q.options ?? []);
      for (const o of wants) {
        const lab = el("label", {}, [
          el("input", { type: "checkbox", value: o.v }),
          document.createTextNode(" " + o.label),
        ]);
        qWrap.appendChild(lab);
      }
    }

    if (q.explain) qWrap.appendChild(el("div", { class: "hint" }, [q.explain]));
    list.appendChild(qWrap);
  }

  mount.appendChild(list);
  mount.appendChild(resultBox);

  function getAnswer(qWrap) {
    const type = qWrap.dataset.type;
    if (type === "num" || type === "text") return norm(qWrap.querySelector("input").value);
    if (type === "select") return norm(qWrap.querySelector("select").value);
    if (type === "pair") {
      const inps = qWrap.querySelectorAll("input");
      return `${norm(inps[0].value)}|${norm(inps[1].value)}`;
    }
    if (type === "multi") {
      const checked = Array.from(qWrap.querySelectorAll("input[type=checkbox]:checked"))
        .map(cb => norm(cb.value)).sort().join(",");
      return checked;
    }
    return "";
  }

  function isCorrect(qWrap) {
    const type = qWrap.dataset.type;
    const want = norm(qWrap.dataset.answer);
    const got = getAnswer(qWrap);
    if (type === "multi") return got === want.split(",").map(norm).sort().join(",");
    return got === want;
  }

  function check() {
    const qWraps = Array.from(mount.querySelectorAll(".q"));
    let ok = 0;
    const lines = [];
    for (const qw of qWraps) {
      const good = isCorrect(qw);
      if (good) ok++;
      lines.push(good ? "✓ richtig" : "✗ falsch");
    }
    resultBox.innerHTML = `<b>${ok}/${qWraps.length}</b> richtig<br>` + lines.join("<br>");
    resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function reset() {
    mount.querySelectorAll("input").forEach(i => {
      if (i.type === "checkbox") i.checked = false;
      else i.value = "";
    });
    mount.querySelectorAll("select").forEach(s => (s.value = ""));
    resultBox.textContent = "Noch nicht geprüft.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSolutions() {
    const qWraps = Array.from(mount.querySelectorAll(".q"));
    for (const qw of qWraps) {
      const type = qw.dataset.type;
      const ans = qw.dataset.answer;

      if (type === "num" || type === "text") qw.querySelector("input").value = ans;
      if (type === "select") qw.querySelector("select").value = ans;
      if (type === "pair") {
        const [a, b] = ans.split("|");
        const inps = qw.querySelectorAll("input");
        inps[0].value = a;
        inps[1].value = b;
      }
      if (type === "multi") {
        const wants = ans.split(",").map(norm);
        qw.querySelectorAll("input[type=checkbox]").forEach(cb => (cb.checked = wants.includes(norm(cb.value))));
      }
    }
    check();
  }

  return { check, reset, showSolutions };
}
