(function() {
  "use strict";
  var btn = document.getElementById("charsToggle"), box = document.getElementById("charsBody");
  if (!btn || !box) return;
  var GROUPS = [
    { title: "The Family", people: [["Hayden", "companion_avatar", 52, 84, 112], ["Annie", "player_avatar", 52, 84, 104], ["Riley", "dog_sprite", 72, 72, 62], ["Theo", "cat_sprite", 72, 72, 54]] },
    { title: "Ralph & Alisa", people: [["Ralph", "npc_blue", 64, 96, 112], ["Alisa", "npc_sun", 64, 96, 108]] },
    { title: "Madi, Blair & Nick", people: [["Madi", "npc_long", 64, 96, 108], ["Blair", "npc_kid", 64, 96, 80], ["Nick", "npc_beard", 64, 96, 112]] }
  ];
  var built = false;
  function card(p) {
    var fig = document.createElement("figure");
    fig.className = "charCard";
    var cv = document.createElement("canvas");
    var img = new Image();
    img.onload = function() {
      var bx = 0, by = 0, bw = p[2], bh = p[3];
      try {
        var t = document.createElement("canvas");
        t.width = p[2];
        t.height = p[3];
        var tg = t.getContext("2d");
        tg.drawImage(img, 0, 0, p[2], p[3], 0, 0, p[2], p[3]);
        var d = tg.getImageData(0, 0, p[2], p[3]).data, x0 = p[2], y0 = p[3], x1 = -1, y1 = -1;
        for (var y = 0; y < p[3]; y++) for (var x = 0; x < p[2]; x++) if (d[(y * p[2] + x) * 4 + 3] > 40) {
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
      g.imageSmoothingEnabled = false;
      g.drawImage(img, bx, by, bw, bh, 0, 0, w, h);
    };
    img.src = "assets/" + p[1] + ".png";
    var cap = document.createElement("figcaption");
    cap.textContent = p[0];
    var art = document.createElement("div");
    art.className = "charArt";
    art.appendChild(cv);
    fig.appendChild(art);
    fig.appendChild(cap);
    return fig;
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
        row.appendChild(card(p));
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
  };
})();
