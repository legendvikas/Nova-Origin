import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, ChevronRight, CirclePlay, Crown, Gamepad2, Instagram, Menu, Radio, Search, ShieldCheck, Sparkles, Swords, Trophy, Users, Youtube, X, Zap } from 'lucide-react';

type Props = {
  data: { games: any[]; tournaments: any[]; teams: any[]; announcements: any[]; posts: any[] };
  loading: boolean;
  onAdmin: () => void;
};

function formatCountdown(target?: string | null, now = Date.now()) {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function HomeDashboard({ data, loading, onAdmin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextEvent = useMemo(() => data.tournaments
    .filter((event: any) => event.starts_at && new Date(event.starts_at).getTime() > now)
    .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0], [data.tournaments, now]);
  const countdown = formatCountdown(nextEvent?.starts_at, now);
  const updates = [
    ...data.announcements.map((item: any) => ({ id: 'a-' + item.id, type: 'ANNOUNCEMENT', title: item.title, body: item.body, date: item.published_at || item.created_at })),
    ...data.posts.map((item: any) => ({ id: 'p-' + item.id, type: 'COMMUNITY', title: item.content?.slice(0, 68) || 'Community update', body: item.content, date: item.created_at })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 4);

  return (
    <div className="nova-home">
      <div className="nova-topline"><span className="nova-live-dot"/> NOVA ORIGIN <span className="nova-top-divider">/</span> THE ESPORTS NETWORK <span className="nova-top-right">INDIA · GLOBAL <span className="nova-live-dot"/></span></div>
      <header className="nova-header">
        <a className="nova-brand" href="#top" aria-label="NOVA Origin home"><span className="nova-brand-mark">N<span>✳</span></span><span><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></span></a>
        <nav className={menuOpen ? 'nova-nav is-open' : 'nova-nav'}>
          <a href="#arena" onClick={() => setMenuOpen(false)}>Arena</a>
          <a href="#squads" onClick={() => setMenuOpen(false)}>Squads</a>
          <a href="#events" onClick={() => setMenuOpen(false)}>Tournaments</a>
          <a href="#feed" onClick={() => setMenuOpen(false)}>Community</a>
        </nav>
        <div className="nova-header-actions"><span className="nova-online"><i/> NETWORK ONLINE</span><button className="nova-control-btn" onClick={onAdmin}>CONTROL ROOM <ArrowUpRight size={15}/></button><button className="nova-menu-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation">{menuOpen ? <X/> : <Menu/>}</button></div>
      </header>

      <main id="top">
        <section className="nova-dashboard-hero">
          <div className="nova-hero-grid"/>
          <div className="nova-hero-glow"/>
          <div className="nova-hero-copy">
            <div className="nova-kicker"><span/> YOUR ARENA. YOUR LEGACY. <span/></div>
            <h1>PLAY<br/><em>BEYOND</em><br/>LIMITS<span className="nova-period">.</span></h1>
            <p>One network. Countless contenders. Discover squads, follow the competition and find your place in the NOVA universe.</p>
            <div className="nova-hero-buttons"><a className="nova-btn-primary" href="#arena">ENTER THE ARENA <ArrowUpRight size={17}/></a><a className="nova-btn-quiet" href="#squads">EXPLORE SQUADS <ArrowRight size={16}/></a></div>
            <div className="nova-hero-meta"><span><i/> BUILT FOR COMPETITION</span><span>EST. 2024</span><span>NO LIMITS / ONE ORIGIN</span></div>
          </div>
          <div className="nova-hero-visual" aria-label="NOVA Origin emblem"><div className="nova-orbit orbit-one"/><div className="nova-orbit orbit-two"/><div className="nova-orbit orbit-three"/><div className="nova-big-n">N<span>✳</span></div><div className="nova-visual-tag tag-top">NOVA NETWORK / 001</div><div className="nova-visual-tag tag-bottom">DISCOVER · COMPETE · EVOLVE</div><div className="nova-visual-cross">＋</div></div>
          <div className="nova-hero-bottom"><span>SCROLL TO EXPLORE</span><b/></div>
        </section>

        <section className="nova-metrics" aria-label="Platform statistics">
          <div><b>{String(data.teams.length).padStart(2, '0')}</b><span>PUBLIC SQUADS</span></div>
          <div><b>{String(data.tournaments.length).padStart(2, '0')}</b><span>TOURNAMENTS</span></div>
          <div><b>{String(data.games.length).padStart(2, '0')}</b><span>GAME TITLES</span></div>
          <div className="nova-metric-note"><span className="nova-live-dot"/> LIVE FROM THE NOVA NETWORK</div>
        </section>

        <section className="nova-section nova-arena" id="arena">
          <div className="nova-section-heading"><div><div className="nova-section-kicker">01 / YOUR COMMAND CENTER</div><h2>THE <em>ARENA.</em></h2></div><p>Everything happening across the NOVA competitive universe, all in one place.</p></div>
          <div className="nova-arena-grid">
            <article className="nova-feature-card">
              <div className="nova-feature-top"><span><Radio size={14}/> NEXT UP</span><span>{nextEvent ? 'SCHEDULED EVENT' : 'EVENT RADAR'}</span></div>
              <div className="nova-feature-art"><div className="nova-feature-rings"/><Trophy size={65}/><span className="nova-feature-watermark">NOVA</span></div>
              <div className="nova-feature-info"><small>{nextEvent?.game?.name || 'NOVA COMPETITIVE CIRCUIT'}</small><h3>{nextEvent?.title || 'THE NEXT BIG MOMENT.'}</h3><p>{nextEvent?.summary || 'Upcoming tournaments and competitive events will appear here as soon as they are announced.'}</p></div>
              <div className="nova-feature-foot"><span>{nextEvent?.starts_at ? new Date(nextEvent.starts_at).toLocaleString() : 'SCHEDULE TO BE ANNOUNCED'}</span><a href="#events">VIEW EVENTS <ArrowUpRight size={15}/></a></div>
            </article>
            <article className="nova-count-card">
              <div className="nova-count-top"><span className="nova-section-kicker">EVENT COUNTDOWN</span><CalendarDays size={18}/></div>
              <div className="nova-count-title">{nextEvent ? nextEvent.title : 'YOUR NEXT CHALLENGE AWAITS.'}</div>
              {countdown ? <div className="nova-count-digits"><div><b>{String(countdown.days).padStart(2, '0')}</b><small>DAYS</small></div><i>:</i><div><b>{String(countdown.hours).padStart(2, '0')}</b><small>HOURS</small></div><i>:</i><div><b>{String(countdown.minutes).padStart(2, '0')}</b><small>MINS</small></div><i>:</i><div><b>{String(countdown.seconds).padStart(2, '0')}</b><small>SECS</small></div></div> : <div className="nova-count-empty"><Zap size={26}/><b>COUNTING DOWN TO THE UNKNOWN.</b><small>New event schedule will appear here.</small></div>}
              <a href="#events" className="nova-count-link">EXPLORE TOURNAMENTS <ArrowUpRight size={15}/></a>
            </article>
            <article className="nova-quick-card"><div className="nova-quick-icon"><Gamepad2 size={21}/></div><div><small>DISCOVER YOUR GAME</small><b>{data.games.length} GAME TITLES</b></div><a href="#games" aria-label="Explore games"><ArrowUpRight/></a></article>
            <article className="nova-quick-card"><div className="nova-quick-icon"><Users size={21}/></div><div><small>FIND YOUR SQUAD</small><b>{data.teams.length} PUBLIC TEAMS</b></div><a href="#squads" aria-label="Explore teams"><ArrowUpRight/></a></article>
          </div>
        </section>

        <section className="nova-section nova-games-section" id="games">
          <div className="nova-section-heading"><div><div className="nova-section-kicker">02 / CHOOSE YOUR BATTLEGROUND</div><h2>GAME <em>ON.</em></h2></div><p>Different games. One competitive spirit.</p></div>
          <div className="nova-game-grid">
            {data.games.map((game: any, i: number) => <article className={'nova-game-tile game-tone-' + (i % 4)} key={game.id}><div className="nova-game-tile-top"><span>GAME / {String(i + 1).padStart(2, '0')}</span><Gamepad2 size={19}/></div><div className="nova-game-symbol"><Swords size={42}/></div><div className="nova-game-tile-foot"><div><h3>{game.name}</h3><small>{game.publisher || 'COMPETITIVE TITLE'}</small></div><ArrowUpRight/></div></article>)}
            {!loading && data.games.length === 0 && <div className="nova-empty">No games published yet. Game titles added in the Control Room will appear here.</div>}
            {loading && <div className="nova-empty">Loading the arena…</div>}
          </div>
        </section>

        <section className="nova-squad-section" id="squads"><div className="nova-section nova-section-inner">
          <div className="nova-section-heading"><div><div className="nova-section-kicker">03 / THE PEOPLE BEHIND THE TAGS</div><h2>FIND YOUR <em>SQUAD.</em></h2></div><p>Meet the teams building their name in the NOVA network.</p></div>
          <div className="nova-squad-list">
            {data.teams.map((team: any, i: number) => <article className="nova-squad-row" key={team.id}><span className="nova-squad-number">{String(i + 1).padStart(2, '0')}</span><div className="nova-squad-logo">{team.logo_url ? <img src={team.logo_url} alt={team.name + ' logo'}/> : <b>{team.team_tag?.slice(0, 3) || team.name?.slice(0, 2) || 'N'}</b>}</div><div className="nova-squad-name"><small>{team.team_tag || 'NOVA SQUAD'} / {team.game?.name || 'ESPORTS'}</small><h3>{team.name}</h3><p>{team.description || 'A team in the NOVA competitive network.'}</p></div><span className="nova-squad-state"><i/> {team.status || 'ACTIVE'}</span><ArrowUpRight className="nova-squad-arrow"/></article>)}
            {!loading && data.teams.length === 0 && <div className="nova-empty">No public squads yet. Approved public teams will appear here.</div>}
            {loading && <div className="nova-empty">Loading squads…</div>}
          </div>
        </div></section>

        <section className="nova-section nova-events-section" id="events">
          <div className="nova-section-heading"><div><div className="nova-section-kicker">04 / THE COMPETITIVE CIRCUIT</div><h2>MAKE IT <em>COUNT.</em></h2></div><p>Track upcoming tournaments and stay ready for the next drop.</p></div>
          <div className="nova-event-grid">
            {data.tournaments.slice(0, 3).map((event: any) => <article className="nova-event-card" key={event.id}><div className="nova-event-art" style={event.banner_url ? { backgroundImage: 'linear-gradient(180deg, #10140d22, #10140d), url(' + event.banner_url + ')' } : undefined}><span><i/> {(event.status || 'UPCOMING').replaceAll('_', ' ')}</span><Trophy size={44}/><small>{event.format?.replaceAll('_', ' ') || 'TOURNAMENT'}</small></div><div className="nova-event-body"><small>{event.game?.name || 'NOVA CIRCUIT'}</small><h3>{event.title}</h3><p>{event.summary || 'The next competitive challenge is here.'}</p><div className="nova-event-foot"><span>{event.starts_at ? new Date(event.starts_at).toLocaleDateString() : 'DATE TBA'}</span><span>{event.team_size || '—'} PLAYER FORMAT</span></div></div></article>)}
            {!loading && data.tournaments.length === 0 && <div className="nova-empty">No tournaments published yet. Official events will show up here.</div>}
          </div>
        </section>

        <section className="nova-feed-section" id="feed"><div className="nova-section nova-section-inner"><div className="nova-section-heading"><div><div className="nova-section-kicker">05 / SIGNAL FROM THE COMMUNITY</div><h2>THE <em>FEED.</em></h2></div><p>Announcements and community updates from across NOVA Origin.</p></div><div className="nova-feed-grid">
          {updates.map(item => <article className="nova-feed-card" key={item.id}><div className="nova-feed-meta"><span>{item.type === 'ANNOUNCEMENT' ? <Bell size={13}/> : <Radio size={13}/>} {item.type}</span><small>{item.date ? new Date(item.date).toLocaleDateString() : 'NOVA ORIGIN'}</small></div><h3>{item.title}</h3><p>{item.body}</p><span className="nova-feed-bottom">NOVA NETWORK <ArrowUpRight size={14}/></span></article>)}
          {!loading && updates.length === 0 && <div className="nova-empty">The feed is quiet for now. New announcements and community posts will appear here.</div>}
        </div></div></section>

        <section className="nova-join"><div className="nova-join-glow"/><div className="nova-section-kicker">YOUR NEXT CHAPTER STARTS HERE</div><h2>THIS IS YOUR<br/><em>ORIGIN.</em></h2><p>Ready to compete, create or build a squad?</p><a className="nova-btn-primary" href="mailto:hello@novaorigin.gg">CONNECT WITH NOVA <ArrowUpRight size={17}/></a></section>
      </main>

      <footer className="nova-footer"><a className="nova-brand" href="#top"><span className="nova-brand-mark">N<span>✳</span></span><span><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></span></a><div className="nova-footer-copy">© 2026 NOVA ORIGIN. ALL SYSTEMS NOMINAL.</div><div className="nova-footer-social"><a href="https://www.instagram.com/" aria-label="Instagram"><Instagram size={17}/></a><a href="https://www.youtube.com/" aria-label="YouTube"><Youtube size={17}/></a><a href="#feed" aria-label="Community"><Radio size={17}/></a></div><button onClick={onAdmin}>CONTROL ROOM <ArrowUpRight size={14}/></button></footer>
    </div>
  );
}
