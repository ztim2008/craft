(function () {
  var dataEl = document.getElementById("craft-canvas-data");
  var data = {};
  try {
    data = JSON.parse((dataEl && dataEl.textContent) || "{}") || {};
  } catch (err) {
    data = {};
  }
  var ids = data.ids || [];
  var labels = data.labels || {};
  var types = data.types || {};
  var quiet = {};
  (data.quiet || []).forEach(function (id) {
    quiet[id] = 1;
  });
  ids.forEach(function (id) {
    var n = document.getElementById(id);
    if (n) n.setAttribute("data-craft-field", "1");
  });
  function wrapInserts() {
    var root = document.body;
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    var starts = [];
    while (walker.nextNode()) {
      var v = walker.currentNode.nodeValue || "";
      if (/^craft-section:/.test(v.trim())) starts.push(walker.currentNode);
    }
    starts.forEach(function (start) {
      var id = (start.nodeValue || "").trim().replace(/^craft-section:/, "");
      var wrap = document.createElement("div");
      wrap.setAttribute("data-craft-insert", id);
      var node = start.nextSibling;
      while (node && !(node.nodeType === 8 && String(node.nodeValue || "").trim().indexOf("/craft-section:" + id) === 0)) {
        var next = node.nextSibling;
        wrap.appendChild(node);
        node = next;
      }
      start.parentNode.insertBefore(wrap, start.nextSibling);
    });
  }
  function mountBars() {
    wrapInserts();
    document.querySelectorAll("[data-craft-hidden]").forEach(function (n) {
      n.removeAttribute("hidden");
      n.classList.add("craft-sec-hidden");
    });
    var nodes = Array.prototype.slice.call(document.querySelectorAll("section.cli-block[id], [data-craft-insert], [data-craft-html-block]"));
    nodes.forEach(function (sec) {
      if (sec.firstElementChild && sec.firstElementChild.classList.contains("craft-sec-bar")) return;
      var htmlBlock = sec.hasAttribute("data-craft-html-block");
      var insert = sec.hasAttribute("data-craft-insert");
      var id = htmlBlock ? sec.getAttribute("data-craft-html-block") : insert ? sec.getAttribute("data-craft-insert") : sec.id;
      var isHtmlSection = !htmlBlock && !insert && ((sec.className || "").indexOf("cli-html") >= 0 || quiet[id]);
      if (isHtmlSection) {
        sec.classList.add("craft-html-quiet");
        return;
      }
      sec.classList.add("craft-sec");
      var bar = document.createElement("div");
      bar.className = "craft-sec-bar";
      var title = document.createElement("span");
      title.textContent = labels[id] || (htmlBlock ? "HTML-блок" : insert ? "Вставка HTML" : id);
      bar.appendChild(title);
      function btn(act, text) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-act", act);
        b.textContent = text;
        bar.appendChild(b);
      }
      btn("up", "↑");
      btn("down", "↓");
      if (!insert || htmlBlock) {
        btn("hide", sec.classList.contains("craft-sec-hidden") ? "Показать" : "Скрыть");
      }
      btn("remove", "Удалить");
      if (!htmlBlock) btn("insert", "+ HTML");
      if (!htmlBlock && !insert && sec.querySelector && sec.querySelector('[data-type="code"]')) btn("editcode", "Код");
      bar.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var t = e.target;
        if (!t || !t.getAttribute) return;
        var act = t.getAttribute("data-act");
        if (!act) return;
        if (htmlBlock) parent.postMessage({ source: "craft-canvas", htmlBlockAction: { id: id, action: act } }, "*");
        else parent.postMessage({ source: "craft-canvas", sectionAction: { id: id, action: act, insert: insert } }, "*");
        postOutline({ id: id, insert: insert || htmlBlock }, false);
      });
      sec.insertBefore(bar, sec.firstChild);
    });
  }
  function sectionRef(el) {
    while (el && el !== document.documentElement) {
      if (el.getAttribute && el.getAttribute("data-craft-html-block")) return { id: el.getAttribute("data-craft-html-block"), insert: true };
      if (el.getAttribute && el.getAttribute("data-craft-insert")) return { id: el.getAttribute("data-craft-insert"), insert: true };
      if (el.tagName === "SECTION" && el.id && (el.className || "").indexOf("cli-block") !== -1) return { id: el.id, insert: false };
      el = el.parentElement;
    }
    return null;
  }
  function postOutline(ref, spy) {
    if (!ref || !ref.id) return;
    parent.postMessage({ source: "craft-canvas", outline: { id: ref.id, insert: !!ref.insert, spy: !!spy } }, "*");
  }
  function applyFocus(msg) {
    var mode = "";
    var keep = {};
    if (msg && typeof msg === "object") {
      mode = msg.mode || "";
      (msg.keepIds || []).forEach(function (id) {
        if (id) keep[id] = 1;
      });
    } else if (typeof msg === "string") mode = msg;
    document.documentElement.setAttribute("data-craft-focus", mode || "");
    document.querySelectorAll("section.cli-block").forEach(function (sec) {
      var cls = " " + (sec.className || "") + " ";
      var match = !mode;
      if (mode === "header") match = cls.indexOf(" cli-header ") >= 0 || cls.indexOf(" cli-sticky ") >= 0;
      if (mode === "footer") match = cls.indexOf(" cli-footer ") >= 0;
      if (mode === "html") match = cls.indexOf(" cli-html ") >= 0 || cls.indexOf(" craft-html-quiet ") >= 0 || quiet[sec.id];
      if (mode === "widget") match = cls.indexOf(" pic") >= 0 || (sec.getAttribute && sec.getAttribute("data-custom-class"));
      var isPop =
        cls.indexOf(" cli-popup ") >= 0 || (sec.getAttribute && sec.getAttribute("data-popup") === "true");
      if (isPop) {
        sec.classList.remove("craft-focus-out");
        return;
      }
      if (keep[sec.id]) match = true;
      if (match) sec.classList.remove("craft-focus-out");
      else sec.classList.add("craft-focus-out");
    });
    if (mode) {
      window.scrollTo(0, 0);
      document.querySelectorAll("section.cli-popup.show, [data-popup='true'].show").forEach(function (n) {
        n.classList.remove("show");
      });
      var first = document.querySelector("section.cli-block:not(.craft-focus-out):not(.cli-popup)");
      if (first) first.scrollIntoView({ block: "start" });
    }
  }
  function revealSection(id, insert) {
    document.querySelectorAll(".craft-sec-on").forEach(function (n) {
      n.classList.remove("craft-sec-on");
    });
    var el = null;
    if (insert) {
      var sid = String(id).split('"').join("");
      el = document.querySelector('[data-craft-insert="' + sid + '"]') || document.querySelector('[data-craft-html-block="' + sid + '"]');
    } else el = document.getElementById(id);
    if (!el) el = document.getElementById(id);
    if (isPopup(el)) {
      showPopup(el);
      return;
    }
    if (!el || el.classList.contains("craft-focus-out")) return;
    el.classList.add("craft-sec-on");
    el.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function isPopup(el) {
    if (!el) return false;
    return el.getAttribute("data-popup") === "true" || (" " + (el.className || "") + " ").indexOf(" cli-popup ") >= 0;
  }
  function popupFromHref(href) {
    var m = String(href || "").match(/#(n-[0-9a-f-]{36})\b/i);
    if (!m) return null;
    var el = document.getElementById(m[1]);
    return isPopup(el) ? el : null;
  }
  function hidePopup(el) {
    if (!el) return;
    el.classList.remove("show");
  }
  function showPopup(el) {
    if (!el) return;
    document.querySelectorAll("section.cli-popup.show, [data-popup='true'].show").forEach(function (n) {
      if (n !== el) n.classList.remove("show");
    });
    el.classList.remove("craft-focus-out");
    el.classList.add("show");
  }
  function boot() {
    mountBars();
    var spyTimer = 0;
    function spyOutline() {
      if (spyTimer) return;
      spyTimer = setTimeout(function () {
        spyTimer = 0;
        var nodes = document.querySelectorAll(".craft-sec");
        var pick = null,
          best = 1e9;
        for (var i = 0; i < nodes.length; i++) {
          var r = nodes[i].getBoundingClientRect();
          if (r.bottom < 8 || r.top > window.innerHeight * 0.5) continue;
          var d = Math.abs(r.top - 16);
          if (d < best) {
            best = d;
            pick = nodes[i];
          }
        }
        if (pick) postOutline(sectionRef(pick), true);
      }, 140);
    }
    window.addEventListener("scroll", spyOutline, true);
    function isTextField(el) {
      if (!el) return false;
      if (el.tagName === "IMG") return false;
      if ((types[el.id] || "") === "image") return false;
      var nested = el.querySelector("[data-craft-field]");
      if (nested && nested !== el) return false;
      if ((types[el.id] || "") === "html") return false;
      return true;
    }
    function readText(el) {
      return String(el.innerText || el.textContent || "").replace(new RegExp("\\n+$"), "");
    }
    function stopEdit(el) {
      if (!el) return;
      el.removeAttribute("contenteditable");
      el.removeAttribute("data-craft-editing");
    }
    function startEdit(el) {
      document.querySelectorAll("[data-craft-editing]").forEach(function (n) {
        if (n !== el) stopEdit(n);
      });
      document.querySelectorAll(".craft-hit").forEach(function (n) {
        n.classList.remove("craft-hit");
      });
      el.classList.add("craft-hit");
      parent.postMessage({ source: "craft-canvas", nodeId: el.id }, "*");
      if (!isTextField(el)) return;
      if (el.getAttribute("data-craft-editing")) return;
      try {
        el.contentEditable = "plaintext-only";
      } catch (err) {
        el.contentEditable = "true";
      }
      if (el.contentEditable !== "plaintext-only" && types[el.id] === "textarea") el.contentEditable = "true";
      el.setAttribute("data-craft-editing", "1");
      el.focus();
    }
    function placeCaret(el, e) {
      var range = null;
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(e.clientX, e.clientY);
      else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(e.clientX, e.clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      if (!range || !el.contains(range.startContainer)) return;
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.addEventListener(
      "click",
      function (e) {
        if (e.target && e.target.closest && e.target.closest(".craft-sec-bar")) return;
        var closer = e.target && e.target.closest && e.target.closest("[data-popup-close]");
        if (closer) {
          e.preventDefault();
          e.stopPropagation();
          var closed = closer.closest('[data-popup="true"]') || closer.closest("section.cli-popup");
          hidePopup(closed);
          return;
        }
        if (e.target && e.target.getAttribute && e.target.getAttribute("data-popup") === "true") {
          e.preventDefault();
          e.stopPropagation();
          hidePopup(e.target);
          return;
        }
        var link = e.target && e.target.closest && e.target.closest("a[href]");
        var pop = link ? popupFromHref(link.getAttribute("href") || "") : null;
        if (pop) {
          e.preventDefault();
          e.stopPropagation();
          showPopup(pop);
          var refPop = sectionRef(e.target);
          if (refPop) postOutline(refPop, false);
          if (link.getAttribute && link.getAttribute("data-craft-field")) {
            startEdit(link);
            placeCaret(link, e);
          } else {
            parent.postMessage({ source: "craft-canvas", nodeId: link.id }, "*");
          }
          return;
        }
        if (e.target && e.target.closest && e.target.closest("[data-craft-editing]")) {
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        var ref = sectionRef(e.target);
        if (ref) postOutline(ref, false);
        var el = e.target;
        while (el && el !== document.documentElement) {
          if (el.getAttribute && el.getAttribute("data-craft-field")) {
            startEdit(el);
            placeCaret(el, e);
            return;
          }
          el = el.parentElement;
        }
      },
      true,
    );
    document.addEventListener(
      "input",
      function (e) {
        var el = e.target;
        if (!el || !el.getAttribute || !el.getAttribute("data-craft-editing")) return;
        var patch = { value: readText(el) };
        var href = el.getAttribute("href");
        if (href) patch.href = href;
        parent.postMessage({ source: "craft-canvas", nodeId: el.id, patch: patch }, "*");
      },
      true,
    );
    document.addEventListener(
      "keydown",
      function (e) {
        if ((e.key || "") === "Escape") {
          var on = document.querySelector("[data-craft-editing]");
          if (on) {
            stopEdit(on);
            on.blur();
          }
        }
      },
      true,
    );
    document.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
      },
      true,
    );
    document.addEventListener(
      "keydown",
      function (e) {
        var key = (e.key || "").toLowerCase();
        if (!e.ctrlKey && !e.metaKey) return;
        if (key === "z") {
          e.preventDefault();
          parent.postMessage({ source: "craft-canvas", history: e.shiftKey ? "redo" : "undo" }, "*");
        } else if (key === "y") {
          e.preventDefault();
          parent.postMessage({ source: "craft-canvas", history: "redo" }, "*");
        }
      },
      true,
    );
    window.addEventListener("message", function (e) {
      if (!e.data || e.data.source !== "craft-host") return;
      if (e.data.sectionChrome) document.documentElement.classList.add("craft-chrome");
      if (e.data.focus !== undefined) applyFocus(e.data.focus);
      if (e.data.revealSection && e.data.revealSection.id) {
        revealSection(e.data.revealSection.id, e.data.revealSection.insert);
      }
      if (e.data.openPopup) {
        var opened = document.getElementById(e.data.openPopup);
        if (isPopup(opened)) showPopup(opened);
      }
      if (e.data.highlight) {
        document.querySelectorAll(".craft-hit").forEach(function (n) {
          n.classList.remove("craft-hit");
        });
        var hit = document.getElementById(e.data.highlight);
        if (hit) {
          hit.classList.add("craft-hit");
          if (!hit.getAttribute("data-craft-editing")) hit.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
      if (e.data.patch && e.data.nodeId) {
        var n = document.getElementById(e.data.nodeId);
        if (!n || n.getAttribute("data-craft-editing")) return;
        var p = e.data.patch;
        if (p.href != null) n.setAttribute("href", p.href);
        if (p.target) n.setAttribute("target", p.target);
        else if (p.target === "") n.removeAttribute("target");
        if (p.rel) n.setAttribute("rel", p.rel);
        else if (p.rel === "") n.removeAttribute("rel");
        if (p.download) n.setAttribute("download", "");
        else if (p.download === false) n.removeAttribute("download");
        if (n.tagName === "IMG" && (p.src != null || p.value != null)) n.setAttribute("src", p.src || p.value);
        else if (p.value != null) {
          var hasEl = false;
          for (var i = 0; i < n.childNodes.length; i++) {
            if (n.childNodes[i].nodeType === 1) {
              hasEl = true;
              break;
            }
          }
          if (!hasEl) n.textContent = p.value;
          else {
            for (var j = 0; j < n.childNodes.length; j++) {
              if (n.childNodes[j].nodeType === 3 && n.childNodes[j].textContent.trim()) {
                n.childNodes[j].textContent = p.value;
                break;
              }
            }
          }
        }
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
