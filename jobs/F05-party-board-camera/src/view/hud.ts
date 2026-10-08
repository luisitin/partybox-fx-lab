// The DOM layer over the 3D board. TV: header, turn banner, roll prompt, player panels, bubbles over tokens,
// the overview caption with name tags, and (outside kiosk mode) a small demo toolbar. Phone: header, the island
// map with a "You" pin, your card, and one big Roll button. Text never comes from outside the page.
import type { Stage } from '../core/stage.ts';
import { RULES } from '../core/rules.ts';
import type { World } from './world.ts';

export interface HudActions {
  roll(): void;
  overview(): void;
  focusNext(): void;
  toggleAuto(): void;
  toggleMotion(): void;
}

const SVG = 'http://www.w3.org/2000/svg';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function svg(viewBox: string, body: string, cls: string): SVGSVGElement {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', cls);
  // body is a constant from this file, never user text
  s.innerHTML = body;
  return s;
}

/** PartyBox mark: an original party box with a pop of confetti. */
export function markSvg(): SVGSVGElement {
  return svg(
    '0 0 48 48',
    `<rect x="7" y="17" width="34" height="24" rx="7" fill="var(--pb-accent)"/>
     <rect x="4" y="12" width="40" height="9" rx="4.5" fill="var(--pb-accent-2)"/>
     <rect x="21" y="12" width="6" height="29" fill="var(--pb-on-accent)" opacity=".18"/>
     <circle cx="14" cy="6" r="2.6" fill="var(--pb-accent-3)"/><circle cx="25" cy="4" r="2.2" fill="var(--pb-info)"/>
     <circle cx="35" cy="7" r="2.6" fill="var(--pb-accent-2)"/>
     <circle cx="18" cy="29" r="2.2" fill="var(--pb-on-accent)"/><circle cx="30" cy="29" r="2.2" fill="var(--pb-on-accent)"/>
     <path d="M19 34 q5 4 10 0" stroke="var(--pb-on-accent)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    'mark',
  );
}

const EYES = (y: number) =>
  `<ellipse cx="19" cy="${y}" rx="3.4" ry="4.4" fill="#fff"/><ellipse cx="29" cy="${y}" rx="3.4" ry="4.4" fill="#fff"/>
   <ellipse cx="19.4" cy="${y + 0.6}" rx="2.1" ry="2.8" fill="#1b1d3a"/><ellipse cx="29.4" cy="${y + 0.6}" rx="2.1" ry="2.8" fill="#1b1d3a"/>
   <path d="M20.5 ${y + 6} q3.5 3 7 0" stroke="#1b1d3a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

/** Each token's silhouette as a small portrait. */
export function avatarSvg(player: number, color: string): SVGSVGElement {
  const bodies = [
    `<path d="M10 40 C10 22 15 12 24 12 C33 12 38 22 38 40 Z" fill="${color}"/>
     <path d="M24 12 v-4" stroke="#3f8f3a" stroke-width="2"/><ellipse cx="20" cy="7" rx="4.5" ry="2" fill="#5cc356"/><ellipse cx="28" cy="7" rx="4.5" ry="2" fill="#5cc356"/>${EYES(25)}`,
    `<path d="M24 5 C30 14 37 22 37 30 C37 37 31 41 24 41 C17 41 11 37 11 30 C11 22 18 14 24 5 Z" fill="${color}"/>
     <ellipse cx="24" cy="29" rx="19" ry="5" fill="none" stroke="#fff3c4" stroke-width="2"/>${EYES(27)}`,
    `<circle cx="13" cy="13" r="5.5" fill="${color}"/><circle cx="35" cy="13" r="5.5" fill="${color}"/>
     <circle cx="24" cy="26" r="15" fill="${color}"/>${EYES(25)}`,
    `<rect x="12" y="11" width="24" height="31" rx="12" fill="${color}"/><path d="M24 11 v-5" stroke="#dfe7ff" stroke-width="2"/>
     <circle cx="24" cy="5" r="2.6" fill="#ffd166"/><rect x="14" y="18" width="20" height="12" rx="6" fill="#1d2a52"/>${EYES(24)}`,
  ];
  return svg('0 0 48 46', bodies[player % 4]!, 'avatar-svg');
}

export const STAR_PATH =
  'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

function starIcon(): SVGSVGElement {
  return svg('0 0 24 24', `<path d="${STAR_PATH}" fill="var(--pb-accent-2)" stroke="#b07a00" stroke-width="1.2" stroke-linejoin="round"/>`, 'icon');
}

function coinIcon(): HTMLElement {
  return el('span', 'coin');
}

interface Bubble {
  node: HTMLElement;
  player: number;
  t0: number;
}

interface PlayerCard {
  root: HTMLElement;
  coins: HTMLElement;
  stars: HTMLElement;
  shown: { coins: number; stars: number; tick: number };
}

export class Hud {
  readonly root: HTMLElement;
  private header: HTMLElement;
  private status: HTMLElement;
  private banner: HTMLElement;
  private bannerAt = -10;
  private prompt: HTMLElement;
  private caption: HTMLElement;
  private captionTitle: HTMLElement;
  private captionSub: HTMLElement;
  private tags: HTMLElement[] = [];
  private bubbles: Bubble[] = [];
  private bubbleLayer: HTMLElement;
  private cards: PlayerCard[] = [];
  private toolbar: HTMLElement | null = null;
  private autoBtn: HTMLButtonElement | null = null;
  private motionBtn: HTMLButtonElement | null = null;
  // phone
  private pin: HTMLElement | null = null;
  private rollBtn: HTMLButtonElement | null = null;
  private turnLine: HTMLElement | null = null;
  private toStar: HTMLElement | null = null;
  readonly mapHost: HTMLElement | null = null;
  private live: HTMLElement;
  /** The TV scale (1 at 1920 x 1080), kept in step with the --u custom property. */
  scale = 1;

  constructor(
    host: HTMLElement,
    private stage: Stage,
    private world: World,
    private opts: { view: 'tv' | 'phone'; kiosk: boolean; you: number; actions: HudActions },
  ) {
    this.root = el('div', `hud hud-${opts.view}`);
    host.append(this.root);
    this.live = el('div', 'sr-only');
    this.live.setAttribute('aria-live', 'polite');
    this.root.append(this.live);

    // header: mark + "/ Party Board" left, small status right
    this.header = el('header', 'pb-header');
    const brand = el('div', 'brand');
    brand.append(markSvg(), el('span', 'brand-name', 'PartyBox'), el('span', 'brand-game', '/ Party Board'));
    this.status = el('div', 'status', 'Round 1');
    this.header.append(brand, this.status);
    this.root.append(this.header);

    this.bubbleLayer = el('div', 'bubbles');
    this.banner = el('div', 'turn-banner');
    this.prompt = el('div', 'prompt');
    this.caption = el('div', 'caption');
    this.captionTitle = el('div', 'caption-title', 'The whole island');
    this.captionSub = el('div', 'caption-sub', '');
    this.caption.append(this.captionTitle, this.captionSub);

    if (opts.view === 'tv') {
      this.root.append(el('div', 'vignette'), this.bubbleLayer, this.banner, this.prompt, this.caption);
      for (const t of stage.tokens) {
        const tag = el('div', 'tag');
        tag.style.setProperty('--c', t.color);
        tag.textContent = t.name;
        this.tags.push(tag);
        this.bubbleLayer.append(tag);
      }
      const bar = el('div', `players n${stage.tokens.length}`);
      for (const t of stage.tokens) {
        const card = el('div', 'player');
        card.style.setProperty('--c', t.color);
        const av = el('div', 'avatar');
        av.append(avatarSvg(t.player, t.color));
        const info = el('div', 'info');
        const name = el('div', 'name', t.name);
        const row = el('div', 'counts');
        const coins = el('span', 'n', String(t.coins));
        const stars = el('span', 'n', String(t.stars));
        const c1 = el('span', 'count');
        c1.append(coinIcon(), coins);
        const c2 = el('span', 'count');
        c2.append(starIcon(), stars);
        row.append(c2, c1);
        info.append(name, row);
        card.append(av, info);
        bar.append(card);
        this.cards.push({ root: card, coins, stars, shown: { coins: t.coins, stars: t.stars, tick: 0 } });
      }
      this.root.append(bar);
      if (!opts.kiosk) this.buildToolbar();
    } else {
      const you = stage.tokens[opts.you]!;
      const map = el('section', 'map-card');
      map.setAttribute('aria-label', 'Island map');
      const label = el('div', 'map-label', 'Island map');
      this.pin = el('div', 'pin', 'You');
      this.pin.style.setProperty('--c', you.color);
      map.append(label, this.bubbleLayer, this.pin);
      (this as { mapHost: HTMLElement | null }).mapHost = map;
      const card = el('section', 'you-card');
      card.style.setProperty('--c', you.color);
      const av = el('div', 'avatar');
      av.append(avatarSvg(you.player, you.color));
      const info = el('div', 'info');
      const who = el('div', 'name', `You are ${you.name}`);
      const row = el('div', 'counts');
      const coins = el('span', 'n', String(you.coins));
      const stars = el('span', 'n', String(you.stars));
      const c1 = el('span', 'count');
      c1.append(coinIcon(), coins);
      const c2 = el('span', 'count');
      c2.append(starIcon(), stars);
      row.append(c2, c1);
      this.toStar = el('div', 'to-star', '');
      info.append(who, row, this.toStar);
      card.append(av, info);
      this.cards.push({ root: card, coins, stars, shown: { coins: you.coins, stars: you.stars, tick: 0 } });
      this.turnLine = el('div', 'turn-line', '');
      this.rollBtn = el('button', 'roll', 'Roll the die');
      this.rollBtn.type = 'button';
      this.rollBtn.addEventListener('click', () => opts.actions.roll());
      this.root.append(map, card, this.turnLine, this.rollBtn);
    }
  }

  private buildToolbar(): void {
    const a = this.opts.actions;
    const bar = el('nav', 'toolbar');
    bar.setAttribute('aria-label', 'Demo controls');
    const btn = (label: string, key: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', 'tool');
      b.type = 'button';
      b.append(el('span', 'tool-label', label), el('kbd', '', key));
      b.addEventListener('click', fn);
      bar.append(b);
      return b;
    };
    btn('Roll', 'Space', a.roll);
    btn('Whole island', 'O', a.overview);
    btn('Next player', 'F', a.focusNext);
    this.autoBtn = btn('Auto-play', 'A', a.toggleAuto);
    this.motionBtn = btn('Calm motion', 'M', a.toggleMotion);
    this.toolbar = bar;
    this.root.append(bar);
  }

  announce(text: string): void {
    this.live.textContent = text;
  }

  // ---------- stage events ----------
  onEvent(name: string, d: Record<string, unknown>): void {
    const s = this.stage;
    if (name === 'turn') {
      const p = d.player as number;
      const t = s.tokens[p]!;
      this.banner.replaceChildren();
      this.banner.style.setProperty('--c', t.color);
      const av = el('span', 'avatar');
      av.append(avatarSvg(p, t.color));
      const you = this.opts.view === 'phone' && p === this.opts.you;
      this.banner.append(av, el('span', '', you ? 'Your turn!' : `${t.name}'s turn`));
      this.bannerAt = s.now;
      this.announce(`${t.name}'s turn`);
    }
    if (name === 'roll') this.announce(`${s.tokens[d.player as number]!.name} rolled ${d.value as number}`);
    if (name === 'effect') {
      const kind = d.kind as string;
      const p = d.player as number;
      let text = '';
      let cls = kind;
      if (kind === 'gain') text = '+3 coins';
      if (kind === 'lose') text = (d.coins as number) < 0 ? `${d.coins as number} coins`.replace('-', '−') : 'No coins to lose';
      if (kind === 'star') text = 'Star!';
      if (kind === 'event') {
        text = (d.gust as number) > 0 ? 'Tailwind! +2' : 'Breezy!';
        cls = 'event';
      }
      if (text) this.bubble(p, text, cls);
      this.announce(`${s.tokens[p]!.name}: ${text}`);
    }
  }

  private bubble(player: number, text: string, cls: string): void {
    const node = el('div', `bubble ${cls}`, text);
    this.bubbleLayer.append(node);
    this.bubbles.push({ node, player, t0: this.stage.now });
  }

  // ---------- per frame ----------
  update(reduced: boolean, auto: boolean): void {
    const s = this.stage;
    const now = s.now;
    const tv = this.opts.view === 'tv';
    this.status.textContent = s.phase === 'host' ? 'Host mode' : `Round ${s.round}`;
    // turn banner: in 300 ms, hold, out
    const bt = now - this.bannerAt;
    const showBanner = bt >= 0 && bt < 1.7 && s.phase !== 'host';
    this.banner.classList.toggle('on', showBanner);
    // prompt
    if (tv) {
      const promptOn = s.phase === 'prompt' || s.phase === 'roll';
      this.prompt.classList.toggle('on', promptOn && !s.overviewActive);
      const want = s.phase === 'roll' ? 'rolling' : auto ? 'auto' : 'press';
      if (this.prompt.dataset.mode !== want) {
        this.prompt.dataset.mode = want;
        this.prompt.replaceChildren();
        if (want === 'press') {
          this.prompt.append(el('span', '', 'Press'), el('kbd', '', 'Space'), el('span', '', 'to roll'));
        } else this.prompt.append(el('span', '', want === 'rolling' ? 'Rolling…' : 'Rolling for you…'));
      }
    }
    // overview caption and name tags
    const ov = s.overviewActive;
    if (tv) {
      this.caption.classList.toggle('on', ov);
      if (ov) {
        const lead = [...s.tokens].sort((a, b) => b.stars - a.stars || b.coins - a.coins || a.player - b.player)[0]!;
        this.captionSub.textContent =
          s.phase === 'round' ? `Round ${s.round} next · ${lead.name} leads` : `${s.tokens.length} players on 40 spaces`;
      }
      // tokens sharing a space get one stack of tags above the space
      const stacks = new Map<number, number>();
      this.tags.forEach((tag, i) => {
        const t = s.tokens[i]!;
        tag.classList.toggle('on', ov);
        if (!ov) return;
        const k = stacks.get(t.space) ?? 0;
        stacks.set(t.space, k + 1);
        const c = s.spaces[t.space]!.position;
        const p = this.world.project([c[0], c[1] + RULES.tokenHeight + 0.35, c[2]]);
        const y = p.y - k * 46 * this.scale;
        tag.style.transform = `translate(${p.x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      });
    }
    // bubbles over tokens
    this.bubbles = this.bubbles.filter((b) => {
      const age = now - b.t0;
      if (age > 1.6 || age < 0) {
        b.node.remove();
        return false;
      }
      const t = s.tokens[b.player]!;
      const p = this.world.project([t.ground[0], t.ground[1] + t.lift + RULES.tokenHeight + 0.5, t.ground[2]]);
      const rise = reduced ? 0 : -46 * Math.min(1, age / 1.2);
      const fade = age < 0.15 ? age / 0.15 : age > 1.25 ? Math.max(0, 1 - (age - 1.25) / 0.35) : 1;
      b.node.style.opacity = fade.toFixed(3);
      b.node.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y + rise).toFixed(1)}px) translate(-50%, -100%)`;
      return true;
    });
    // player panels: count coins up or down one at a time
    const list = tv ? s.tokens : [s.tokens[this.opts.you]!];
    list.forEach((t, i) => {
      const c = this.cards[i];
      if (!c) return;
      c.root.classList.toggle('active', tv && t.player === s.active && s.phase !== 'intro');
      if (reduced) c.shown.coins = t.coins;
      else if (c.shown.coins !== t.coins && now - c.shown.tick >= 0.08) {
        c.shown.coins += Math.sign(t.coins - c.shown.coins);
        c.shown.tick = now;
      }
      if (c.shown.stars !== t.stars) {
        c.shown.stars = t.stars;
        c.stars.parentElement?.classList.add('bump');
      }
      c.coins.textContent = String(c.shown.coins);
      c.stars.textContent = String(c.shown.stars);
    });
    if (this.autoBtn) this.autoBtn.setAttribute('aria-pressed', String(auto));
    if (this.motionBtn) this.motionBtn.setAttribute('aria-pressed', String(reduced));
    if (!tv) this.updatePhone(auto);
  }

  private updatePhone(auto: boolean): void {
    const s = this.stage;
    const you = s.tokens[this.opts.you]!;
    const act = s.tokens[s.active]!;
    if (this.pin) {
      const p = this.world.project([you.ground[0], you.ground[1] + you.lift + RULES.tokenHeight + 0.2, you.ground[2]]);
      this.pin.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    const n = s.stepsToStar(this.opts.you);
    if (this.toStar) this.toStar.textContent = n === 1 ? 'The star is 1 space ahead' : `The star is ${n} spaces ahead`;
    const yourTurn = s.active === this.opts.you && s.phase !== 'intro' && s.phase !== 'host';
    if (this.turnLine) {
      this.turnLine.textContent =
        s.phase === 'intro' ? 'Getting the island ready…' : s.phase === 'host' ? 'The host is moving tokens' : yourTurn ? 'Your turn!' : `${act.name}'s turn`;
      this.turnLine.style.setProperty('--c', act.color);
    }
    if (this.rollBtn) {
      const can = yourTurn && s.phase === 'prompt' && !auto;
      this.rollBtn.disabled = !can;
      this.rollBtn.textContent = can
        ? 'Roll the die'
        : yourTurn && (s.phase === 'roll' || s.phase === 'move')
          ? 'Hop hop hop…'
          : auto
            ? 'Auto-play is on'
            : yourTurn
              ? 'Get ready…'
              : `Waiting for ${act.name}`;
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
