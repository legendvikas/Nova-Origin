import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, ChevronRight, Clock3, Gamepad2, Instagram, Menu, Radio, Search, ShieldCheck, Swords, Trophy, Users, Youtube, X, Zap } from 'lucide-react';

type Props = {
  data: { games: any[]; tournaments: any[]; teams: any[]; announcements: any[]; posts: any[] };
  loading: boolean;
  onAdmin: () => void;
};

function getCountdown(target?: string | null, now = Date.now()) {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'DATE TO BE ANNOUNCED';

export function HomeDashboard({ data, loading, onAdmin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextEvent = useMemo(() => data.tournaments
    .filter((event: any) => event.starts_at && new Date(event.starts_at).getTime() > now)
    .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0], [data.tournaments, now]);
  const countdown = getCountdown(nextEvent?.starts_at, now);
  const filteredGames = data.games.filter((game: any) => game.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredTeams = data.teams.filter((team: any) => (team.name + ' ' + team.team_tag + ' ' + team.game?.name).toLowerCase().includes(search.toLowerCase()));
  const updates = [
    ...data.announcements.map((item: any) => ({ id: 'a-' + item.id, type: 'OFFICIAL ANNOUNCEMENT', title: item.title, body: item.body, date: item.published_at || item.created_at })),
    ...data.posts.map((item: any) => ({ id: 'p-' + item.id, type: 'COMMUNITY UPDATE', title: item.content?.slice(0, 72) || 'Community update', body: item.content, date: item.created_at })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 4);

  return (
    <div className="nova-home-v2">
      <div className="nv-topline"><span className="nv-status-dot"/> NOVA ORIGIN <span className="nv-topline-divider">/</span> COMPETITIVE NETWORK <span className="nv-topline-right">INDIA <i/> NETWORK ONLINE</span></div>
      <header className="nv-header">
        <a className="nv-brand" href="#home" aria-label="NOVA Origin home"><span className="nv-brand-mark">N<span>.</span></span><span><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></span></a>
        <nav className={menuOpen ? 'nv-nav is-open' : 'nv-nav'}>
          <a href="#games" onClick={() => setMenuOpen(false)}>Games</a>
          <a href="#teams" onClick={() => setMenuOpen(false)}>Teams</a>
          <a href="#tournaments" onClick={() => setMenuOpen(false)}>Tournaments</a>
          <a href="#rankings" onClick={() => setMenuOpen(false)}>Rankings</a>
          <a href="#updates" onClick={() => setMenuOpen(false)}>Updates</a>
        </nav>
        <div className="nv-header-actions"><span className="nv-network"><i/> LIVE NETWORK</span><button className="nv-admin-button" onClick={onAdmin}>CONTROL ROOM <ArrowUpRight size={15}/></button><button className="nv-menu-button" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation">{menuOpen ? <X/> : <Menu/>}</button></div>
      </header>

      <main id="home">
        <section className="nv-hero">
          <div className="nv-hero-grid"/>
          <div className="nv-hero-content">
            <div className="nv-eyebrow"><span/> THE NEXT GENERATION OF COMPETITION</div>
            <h1>PLAY<br/><em>WITH</em><br/>PURPOSE<span>.</span></h1>
            <p>One network for players, squads and competition. Discover teams, follow upcoming tournaments and stay connected to the NOVA Origin ecosystem.</p>
            <div className="nv-hero-actions"><a className="nv-primary" href="#tournaments">EXPLORE COMPETITION <ArrowUpRight size={16}/></a><a className="nv-secondary" href="#teams">DISCOVER TEAMS <ArrowRight size={16}/></a></div>
            <div className="nv-hero-foot"><span><i/> BUILT FOR THE COMPETITIVE COMMUNITY</span><span>EST. NOVA ORIGIN</span></div>
          </div>
          <div className="nv-hero-art" aria-hidden="true"><div className="nv-art-frame"><div className="nv-art-label">NOVA / 001</div><div className="nv-art-monogram">N<span>.</span></div><div className="nv-art-baseline">DISCOVER&nbsp; / &nbsp;COMPETE&nbsp; / &nbsp;EVOLVE</div><div className="nv-art-index">NO. 001 — INDIA</div></div></div>
          <div className="nv-hero-index">01 <span/> 04</div>
        </section>

        <section className="nv-stats" aria-label="NOVA Origin platform statistics">
          <div><b>{String(data.games.length).padStart(2, '0')}</b><span>GAME TITLES</span></div>
          <div><b>{String(data.teams.length).padStart(2, '0')}</b><span>PUBLIC TEAMS</span></div>
          <div><b>{String(data.tournaments.length).padStart(2, '0')}</b><span>TOURNAMENTS</span></div>
          <div className="nv-stats-note"><span className="nv-status-dot"/> LIVE PLATFORM DATA</div>
        </section>

        <section className="nv-section nv-discover" id="games">
          <div className="nv-section-head"><div><div className="nv-kicker">01 / DISCOVER THE ECOSYSTEM</div><h2>YOUR <em>ARENA.</em></h2></div><p>Find your game. Find your people. Follow the competition.</p></div>
          <div className="nv-search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search games and teams..." aria-label="Search games and teams"/><span>LIVE SEARCH</span></div>
          <div className="nv-game-grid">
            {filteredGames.map((game: any, i: number) => <article className={'nv-game-card nv-game-' + (i % 3)} key={game.id}><div className="nv-card-top"><span>GAME TITLE / {String(i + 1).padStart(2, '0')}</span><Gamepad2 size={18}/></div><div className="nv-game-icon"><Swords size={38}/></div><div className="nv-card-bottom"><div><h3>{game.name}</h3><small>{game.publisher || 'COMPETITIVE TITLE'}</small></div><span className="nv-arrow"><ArrowUpRight size={19}/></span></div></article>)}
            {!loading && filteredGames.length === 0 && <div className="nv-empty">{search ? 'No game titles match your search.' : 'Game titles published by NOVA Origin will appear here.'}</div>}
            {loading && <div className="nv-empty">Loading game titles…</div>}
          </div>
        </section>

        <section className="nv-event-band" id="tournaments">
          <div className="nv-section nv-event-layout">
            <div className="nv-event-copy"><div className="nv-kicker">02 / THE COMPETITIVE CIRCUIT</div><h2>THE NEXT<br/><em>CHALLENGE.</em></h2><p>Stay ready for the next drop. Official NOVA tournaments and event schedules are published here.</p><a className="nv-secondary" href="#event-list">VIEW TOURNAMENTS <ArrowRight size={16}/></a></div>
            <article className="nv-feature-event">
              <div className="nv-feature-top"><span><Radio size={14}/> FEATURED EVENT</span><span>{nextEvent ? 'UPCOMING' : 'EVENT RADAR'}</span></div>
              <div className="nv-feature-art"><Trophy size={52}/><span>NOVA<br/>CIRCUIT</span></div>
              <div className="nv-feature-body"><small>{nextEvent?.game?.name || 'NOVA ORIGIN / ESPORTS'}</small><h3>{nextEvent?.title || 'A NEW COMPETITIVE SEASON.'}</h3><p>{nextEvent?.summary || 'Published tournament announcements will appear here. Check back for the next official event.'}</p></div>
              <div className="nv-countdown">{countdown ? <><div><b>{String(countdown.days).padStart(2, '0')}</b><small>DAYS</small></div><i>:</i><div><b>{String(countdown.hours).padStart(2, '0')}</b><small>HOURS</small></div><i>:</i><div><b>{String(countdown.minutes).padStart(2, '0')}</b><small>MINUTES</small></div><i>:</i><div><b>{String(countdown.seconds).padStart(2, '0')}</b><small>SECONDS</small></div></> : <div className="nv-count-empty"><Clock3 size={17}/> EVENT DATE TO BE ANNOUNCED</div>}</div>
              <div className="nv-feature-foot"><span>{dateLabel(nextEvent?.starts_at)}</span><a href="#event-list">EVENT DETAILS <ArrowUpRight size={14}/></a></div>
            </article>
          </div>
        </section>

        <section className="nv-section nv-teams" id="teams">
          <div className="nv-section-head"><div><div className="nv-kicker">03 / BUILT BY THE COMMUNITY</div><h2>MEET THE <em>SQUADS.</em></h2></div><p>Public team profiles from across the NOVA network.</p></div>
          <div className="nv-team-list">
            {filteredTeams.map((team: any, i: number) => <article className="nv-team-row" key={team.id}><span className="nv-team-number">{String(i + 1).padStart(2, '0')}</span><div className="nv-team-logo">{team.logo_url ? <img src={team.logo_url} alt={team.name + ' logo'}/> : <b>{team.team_tag?.slice(0, 3) || team.name?.slice(0, 2) || 'N'}</b>}</div><div className="nv-team-main"><small>{team.team_tag || 'NOVA TEAM'} <span>/</span> {team.game?.name || 'ESPORTS'}</small><h3>{team.name}</h3><p>{team.description || 'A team in the NOVA competitive network.'}</p></div><div className="nv-team-status"><i/> {team.status || 'ACTIVE'}</div><ArrowUpRight className="nv-team-arrow" size={21}/></article>)}
            {!loading && filteredTeams.length === 0 && <div className="nv-empty">{search ? 'No teams match your search.' : 'No public teams have been published yet.'}</div>}
            {loading && <div className="nv-empty">Loading public teams…</div>}
          </div>
        </section>

        <section className="nv-section nv-rankings" id="rankings">
          <div className="nv-section-head"><div><div className="nv-kicker">04 / PERFORMANCE TRACKER</div><h2>THE <em>RANKINGS.</em></h2></div><p>Competitive standings belong to verified match records, not made-up numbers.</p></div>
          <div className="nv-ranking-panel"><div className="nv-ranking-icon"><Trophy size={25}/></div><div><b>OFFICIAL LEADERBOARD</b><p>Rankings will appear when verified player results are published by NOVA Origin administrators.</p></div><span className="nv-ranking-state">AWAITING VERIFIED RESULTS</span></div>
        </section>

        <section className="nv-section nv-event-list" id="event-list">
          <div className="nv-section-head"><div><div className="nv-kicker">05 / UPCOMING & PUBLISHED</div><h2>EVENT <em>LOG.</em></h2></div><p>Official tournament information, registration status and schedules.</p></div>
          <div className="nv-tournament-grid">
            {data.tournaments.slice(0, 3).map((event: any) => <article className="nv-tournament-card" key={event.id}><div className="nv-tournament-art" style={event.banner_url ? { backgroundImage: 'linear-gradient(180deg, #17152a22, #11121a), url(' + event.banner_url + ')' } : undefined}><span><i/> {(event.status || 'UPCOMING').replaceAll('_', ' ')}</span><Trophy size={35}/></div><div className="nv-tournament-body"><small>{event.game?.name || 'NOVA CIRCUIT'}</small><h3>{event.title}</h3><p>{event.summary || 'Official competitive event.'}</p><div><span><CalendarDays size={13}/> {dateLabel(event.starts_at)}</span><span>{event.team_size || '—'} PLAYER FORMAT</span></div></div></article>)}
            {!loading && data.tournaments.length === 0 && <div className="nv-empty">No tournaments have been published yet. New events will appear here.</div>}
          </div>
        </section>

        <section className="nv-updates" id="updates"><div className="nv-section"><div className="nv-section-head"><div><div className="nv-kicker">06 / SIGNAL FROM THE NETWORK</div><h2>WHAT'S <em>HAPPENING.</em></h2></div><p>Announcements and community updates from NOVA Origin.</p></div><div className="nv-update-grid">
          {updates.map(item => <article className="nv-update-card" key={item.id}><div className="nv-update-meta"><span>{item.type === 'OFFICIAL ANNOUNCEMENT' ? <Bell size={13}/> : <Radio size={13}/>} {item.type}</span><small>{dateLabel(item.date)}</small></div><h3>{item.title}</h3><p>{item.body}</p><span className="nv-update-foot">NOVA NETWORK <ArrowUpRight size={14}/></span></article>)}
          {!loading && updates.length === 0 && <div className="nv-empty">The network is quiet for now. Official announcements and community posts will show here.</div>}
        </div></div></section>

        <section className="nv-join"><div className="nv-kicker">YOUR NEXT CHAPTER STARTS HERE</div><h2>FIND YOUR<br/><em>PLACE IN NOVA.</em></h2><p>Discover the teams, follow the competition and be part of the network.</p><a className="nv-primary" href="#teams">EXPLORE THE NETWORK <ArrowUpRight size={16}/></a></section>
      </main>

      <footer className="nv-footer"><a className="nv-brand" href="#home"><span className="nv-brand-mark">N<span>.</span></span><span><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></span></a><div className="nv-footer-copy">© 2026 NOVA ORIGIN. ALL RIGHTS RESERVED.</div><div className="nv-footer-social"><a href="https://www.instagram.com/" aria-label="Instagram"><Instagram size={17}/></a><a href="https://www.youtube.com/" aria-label="YouTube"><Youtube size={17}/></a><a href="#updates" aria-label="Community updates"><Radio size={17}/></a></div><button onClick={onAdmin}>CONTROL ROOM <ArrowUpRight size={14}/></button></footer>
    </div>
  );
}
