/**
 * 通关庆祝粒子动画
 * 在 Canvas 上渲染五彩纸屑效果
 */
class Confetti {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.particles = [];
    this.running = false;
    this.startTime = 0;
    this.duration = 2500; // 动画持续2.5秒

    // 五彩颜色
    this.colors = [
      '#6BCB77', '#FFD93D', '#FF6B6B', '#4D96FF',
      '#FF8C32', '#C56CF0', '#17C3B2', '#FF6B81'
    ];
  }

  start() {
    this.particles = [];
    this.running = true;
    this.startTime = Date.now();

    // 生成60个粒子，从顶部两侧喷出
    for (let i = 0; i < 60; i++) {
      const fromLeft = i % 2 === 0;
      this.particles.push({
        x: fromLeft ? this.width * 0.2 : this.width * 0.8,
        y: this.height * 0.3,
        vx: (fromLeft ? 1 : -1) * (Math.random() * 4 + 2),
        vy: -(Math.random() * 6 + 3),
        size: Math.random() * 6 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.12 + Math.random() * 0.08,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
  }

  stop() {
    this.running = false;
    this.particles = [];
  }

  draw() {
    if (!this.running || this.particles.length === 0) return false;

    const elapsed = Date.now() - this.startTime;
    if (elapsed > this.duration) {
      this.running = false;
      this.particles = [];
      return false;
    }

    // 前500ms淡入，后500ms淡出
    let alpha = 1;
    if (elapsed < 500) alpha = elapsed / 500;
    else if (elapsed > this.duration - 500) alpha = (this.duration - elapsed) / 500;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    for (const p of this.particles) {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation * Math.PI / 180);
      this.ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    this.ctx.restore();
    return true; // 还在播放
  }
}

module.exports = Confetti;
