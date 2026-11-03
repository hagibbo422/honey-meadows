(function() {
  "use strict";
  var EP = window.Element && Element.prototype;
  if (EP && !EP.replaceChildren) {
    EP.replaceChildren = function() {
      while (this.firstChild) this.removeChild(this.firstChild);
      for (var i = 0; i < arguments.length; i++) {
        var n = arguments[i];
        this.appendChild(typeof n === "string" ? document.createTextNode(n) : n);
      }
    };
  }
  if (!Object.fromEntries) {
    Object.fromEntries = function(it) {
      var o = {};
      Array.from(it).forEach(function(kv) {
        o[kv[0]] = kv[1];
      });
      return o;
    };
  }
  if (window.NodeList && !NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;
  if (!Array.prototype.flat) {
    Array.prototype.flat = function() {
      return [].concat.apply([], this);
    };
  }
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function(f, t) {
      return [].concat.apply([], this.map(f, t));
    };
  }
  var cqOK = window.CSS && CSS.supports && CSS.supports("width", "1cqw");
  var arOK = window.CSS && CSS.supports && CSS.supports("aspect-ratio", "1/1");
  if (cqOK && arOK) return;
  document.documentElement.classList.add("no-cq");
  var RATIOS = { hqArt: 1536 / 1024, bkShelf: 1536 / 1024 };
  function fit() {
    var els = document.querySelectorAll(".hqArt,.bkShelf,.rbArt");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], w = el.getBoundingClientRect().width;
      if (!w) continue;
      el.style.setProperty("--cq", w / 100 + "px");
      if (!arOK) {
        var r = RATIOS[el.className.split(" ")[0]];
        if (!r && el.style.aspectRatio) {
          var p = el.style.aspectRatio.split("/");
          r = parseFloat(p[0]) / parseFloat(p[1]);
        }
        if (!r && el.dataset.ratio) r = parseFloat(el.dataset.ratio);
        if (r) el.style.height = w / r + "px";
      }
    }
  }
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", function() {
    setTimeout(fit, 300);
  });
  new MutationObserver(function() {
    fit();
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.HMFit = fit;
})();
