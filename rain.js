(function(root) {
  "use strict";
  class HoneyMeadowsRain {
    constructor(width, height, surfaces = []) {
      this.width = width;
      this.height = height;
      this.time = 0;
      this.surfaces = surfaces;
      this.drops = Array.from({ length: 420 }, (_, i) => ({ x: Math.random() * width, y: Math.random() * height, layer: i % 3, speed: 480 + Math.random() * 470, length: 10 + Math.random() * 18 }));
      this.splashes = Array.from({ length: 48 }, () => this.makeSplash(true));
    }
    makeSplash(initial = false) {
      const water = [[432, 801], [459, 876], [565, 866], [384, 795], [598, 777], [601, 814], [413, 870]], pool = Math.random() < 0.3 ? water : this.surfaces;
      const p = pool.length ? pool[Math.floor(Math.random() * pool.length)] : [this.width / 2, this.height / 2];
      return { x: p[0], y: p[1], age: initial ? Math.random() * 0.75 : 0, life: 0.4 + Math.random() * 0.4 };
    }
    advance(dt) {
      dt = Math.min(Math.max(dt, 0), 0.05);
      this.time += dt;
      for (const drop of this.drops) {
        drop.y += drop.speed * dt;
        drop.x -= drop.speed * 0.29 * dt;
        if (drop.y > this.height + 30) {
          drop.y = -30;
          drop.x = Math.random() * (this.width + 90);
        }
        if (drop.x < -30) drop.x = this.width + 30;
      }
      this.splashes = this.splashes.map((s) => {
        s.age += dt;
        return s.age >= s.life ? this.makeSplash() : s;
      });
    }
    draw(ctx) {
      ctx.save();
      ctx.lineCap = "square";
      for (let layer = 0; layer < 3; layer++) {
        ctx.strokeStyle = ["rgba(180,215,237,.17)", "rgba(200,227,244,.3)", "rgba(223,241,255,.48)"][layer];
        ctx.lineWidth = layer === 2 ? 2 : 1;
        ctx.beginPath();
        for (const d of this.drops) {
          if (d.layer !== layer) continue;
          const x = Math.round(d.x), y = Math.round(d.y);
          ctx.moveTo(x, y);
          ctx.lineTo(Math.round(x + d.length * 0.29), Math.round(y - d.length));
        }
        ctx.stroke();
      }
      for (const s of this.splashes) {
        const t = s.age / s.life, r = 1 + t * 5;
        ctx.strokeStyle = "rgba(193,224,244," + (1 - t) * 0.42 + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(Math.round(s.x), Math.round(s.y), r, r * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (t < 0.2) {
          ctx.fillStyle = "#c8e9f280";
          ctx.fillRect(Math.round(s.x), Math.round(s.y) - 3, 1, 2);
        }
      }
      ctx.restore();
    }
  }
  root.HoneyMeadowsRain = HoneyMeadowsRain;
})(typeof window === "undefined" ? globalThis : window);
