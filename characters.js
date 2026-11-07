(function() {
  "use strict";
  var btn = document.getElementById("charsToggle"), box = document.getElementById("charsBody");
  if (!btn || !box) return;
  var GROUPS = [
    { title: "The Family", people: [["Hayden", "companion_avatar", 52, 84, 112, ["bikes/ride_hayden", 83, 99, 2]], ["Annie", "player_avatar", 52, 84, 104, ["bikes/ride_annie", 83, 103, 2]], ["Riley", "dog_sprite", 72, 72, 62], ["Theo", "cat_sprite", 72, 72, 54]] },
    { title: "Ralph, Alisa, Maggie & Sophie", people: [["Ralph", "npc_blue", 64, 96, 112, ["bikes/ride_ralph", 66, 101, 1]], ["Alisa", "npc_sun", 64, 96, 108, ["bikes/ride_alisa", 66, 101, 1]], ["Maggie", "dogs/maggie", 58, 53, 66, null, "dogs/maggie_portrait"], ["Sophie", "dogs/sophie", 42, 45, 70, null, "dogs/sophie_portrait"]] },
    { title: "Madi, Blair, Nick, Sadie & Mylo", people: [["Madi", "npc_long", 64, 96, 108, ["bikes/ride_madi", 72, 103, 1]], ["Blair", "npc_kid", 64, 96, 80], ["Nick", "npc_beard", 64, 96, 112, ["bikes/ride_nick", 66, 100, 1]], ["Sadie", "dogs/sadie", 60, 52, 66, null, "dogs/sadie_portrait"], ["Mylo", "dogs/mylo", 43, 42, 70, null, "dogs/mylo_portrait"]] },
    { title: "Bailey & Dakota", people: [["Bailey", "npc_jones_f", 64, 96, 112, ["bikes/ride_jones_f", 74, 101, 1], "portrait_jones_f"], ["Dakota", "npc_jones_m", 64, 96, 120, ["bikes/ride_jones_m", 74, 101, 1], "portrait_jones_m"]] }
  ];
  var built = false;
  function card(p) {
    var fig = document.createElement("figure");
    fig.className = "charCard";
    var cv = document.createElement("canvas");
    var img = new Image();
    img.onload = function() {
      var fw = p[6] ? img.naturalWidth : p[2], fh = p[6] ? img.naturalHeight : p[3];
      var bx = 0, by = 0, bw = fw, bh = fh;
      try {
        var t = document.createElement("canvas");
        t.width = fw;
        t.height = fh;
        var tg = t.getContext("2d");
        tg.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);
        var d = tg.getImageData(0, 0, fw, fh).data, x0 = fw, y0 = fh, x1 = -1, y1 = -1;
        for (var y = 0; y < fh; y++) for (var x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
        if (x1 >= 0) {
          bx = x0;
          by = y0;
          bw = x1 - x0 + 1;
          bh = y1 - y0 + 1;
        }
      } catch (e) {
      }
      var h = p[4], w = Math.round(bw / bh * h);
      cv.width = w;
      cv.height = h;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      var g = cv.getContext("2d");
      g.imageSmoothingEnabled = !!p[6];
      g.drawImage(img, bx, by, bw, bh, 0, 0, w, h);
    };
    img.src = "assets/" + (p[6] || p[1]) + ".png";
    var cap = document.createElement("figcaption");
    cap.textContent = p[0];
    var art = document.createElement("div");
    art.className = "charArt";
    art.appendChild(cv);
    fig.appendChild(art);
    fig.appendChild(cap);
    return fig;
  }
  var animTimer = null;
  function animCanvas(src, cw, ch, row, h, label) {
    var fig = document.createElement("figure");
    fig.className = "charAnim";
    var cv = document.createElement("canvas"), box2 = null;
    cv.width = 1;
    cv.height = h;
    var img = new Image();
    img.onload = function() {
      box2 = { x0: 0, y0: 0, x1: cw, y1: ch };
      try {
        var t = document.createElement("canvas");
        t.width = cw * 4;
        t.height = ch;
        var tg = t.getContext("2d");
        tg.drawImage(img, 0, row * ch, cw * 4, ch, 0, 0, cw * 4, ch);
        var d = tg.getImageData(0, 0, cw * 4, ch).data, x0 = cw, y0 = ch, x1 = -1, y1 = -1;
        for (var y = 0; y < ch; y++) for (var x = 0; x < cw * 4; x++) if (d[(y * cw * 4 + x) * 4 + 3] > 40) {
          var lx = x % cw;
          if (lx < x0) x0 = lx;
          if (lx > x1) x1 = lx;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
        if (x1 >= 0) box2 = { x0, y0, x1: x1 + 1, y1: y1 + 1 };
      } catch (e) {
      }
      var w = Math.round((box2.x1 - box2.x0) / (box2.y1 - box2.y0) * h);
      cv.width = w;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
    };
    img.src = "assets/" + src + ".png";
    cv._draw = function(f) {
      if (!box2) return;
      var g = cv.getContext("2d"), bw = box2.x1 - box2.x0, bh = box2.y1 - box2.y0;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, cv.width, cv.height);
      g.drawImage(img, f % 4 * cw + box2.x0, row * ch + box2.y0, bw, bh, 0, 0, cv.width, cv.height);
    };
    var cap = document.createElement("figcaption");
    cap.textContent = label;
    fig.appendChild(cv);
    fig.appendChild(cap);
    return fig;
  }
  function closeDetail() {
    clearInterval(animTimer);
    animTimer = null;
    var old = box.querySelector(".charDetail");
    if (old) old.parentNode.removeChild(old);
    Array.prototype.forEach.call(box.querySelectorAll(".charCard.pick"), function(c) {
      c.setAttribute("aria-expanded", "false");
    });
  }
  function openDetail(p, sec, fig) {
    var wasOpen = fig.getAttribute("aria-expanded") === "true";
    closeDetail();
    if (wasOpen) return;
    fig.setAttribute("aria-expanded", "true");
    var d = document.createElement("div");
    d.className = "charDetail";
    var b = p[5], H = 150;
    var walk = animCanvas(p[1], p[2], p[3], 0, H, p[0] + " walking");
    var ride = animCanvas(b[0], b[1], b[2], b[3], H, p[0] + " on the bike");
    d.appendChild(walk);
    d.appendChild(ride);
    sec.appendChild(d);
    var f = 0, cvs = [walk.firstChild, ride.firstChild];
    var tick = function() {
      cvs.forEach(function(cv) {
        cv._draw(f);
      });
      f++;
    };
    tick();
    animTimer = setInterval(tick, 160);
  }
  function build() {
    GROUPS.forEach(function(gp) {
      var sec = document.createElement("section");
      sec.className = "charGroup";
      var h = document.createElement("h3");
      h.className = "slabel";
      h.textContent = gp.title;
      sec.appendChild(h);
      var row = document.createElement("div");
      row.className = "charRow";
      gp.people.forEach(function(p) {
        var fig = card(p);
        if (p[5]) {
          fig.className += " pick";
          fig.tabIndex = 0;
          fig.setAttribute("role", "button");
          fig.setAttribute("aria-expanded", "false");
          fig.title = "Show " + p[0] + " on the bike";
          fig.onclick = function() {
            openDetail(p, sec, fig);
          };
          fig.onkeydown = function(e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openDetail(p, sec, fig);
            }
          };
        }
        row.appendChild(fig);
      });
      sec.appendChild(row);
      box.appendChild(sec);
    });
    built = true;
  }
  btn.onclick = function() {
    var open = box.hidden;
    box.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = "👥 Characters " + (open ? "▴" : "▾");
    if (open && !built) build();
    if (!open) closeDetail();
  };
  var jt = document.getElementById("jumpToggle"), jb = document.getElementById("jumpBody");
  if (jt && jb) jt.onclick = function() {
    var open = jb.hidden;
    jb.hidden = !open;
    jt.setAttribute("aria-expanded", String(open));
    jt.textContent = "🕒 Jump to " + (open ? "▴" : "▾");
  };
})();
