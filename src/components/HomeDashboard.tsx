import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, ChevronDown, Gamepad2, Menu, Search, ShieldCheck, Swords, Trophy, Users, X, Radio, Newspaper, Clock3 } from 'lucide-react';

type Props = {
  data: { games: any[]; tournaments: any[]; teams: any[]; announcements: any[]; posts: any[] };
  loading: boolean;
  onAdmin: () => void;
};
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBA';
const statusLabel = (value?: string) => (value || 'upcoming').replaceAll('_', ' ').toUpperCase();

function SectionTitle({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="nd-section-title"><div><small>{eyebrow}</small><h2>{title}</h2></div>{action && <button onClick={onClick}>{action}<ArrowUpRight size={14}/></button>}</div>;
}

export function HomeDashboard({ data, loading, onAdmin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const nextEvent = useMemo(() => data.tournaments.filter((e:any) => e.starts_at && new Date(e.starts_at).getTime() >= Date.now()).sort((a:any,b:any) => new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime())[0], [data.tournaments]);
  const filteredTeams = data.teams.filter((t:any) => (t.name+' '+(t.team_tag||'')+' '+(t.game?.name||'')).toLowerCase().includes(search.toLowerCase()));
  const filteredGames = data.games.filter((g:any) => g.name?.toLowerCase().includes(search.toLowerCase()));
  const updates = [...data.announcements.map((x:any)=>({...x,kind:'OFFICIAL'})),...data.posts.map((x:any)=>({...x,title:x.content?.slice(0,90)||'Community update',body:x.content,kind:'COMMUNITY'}))].sort((a:any,b:any)=>new Date(b.published_at||b.created_at||0).getTime()-new Date(a.published_at||a.created_at||0).getTime()).slice(0,4);
  const events = data.tournaments.filter((e:any)=>gameFilter==='all'||e.game?.name===gameFilter).slice(0,4);
  const closeMenu = () => setMenuOpen(false);

  return <div className="nova-dashboard" id="top">
    <header className="nd-header">
      <button className="nd-icon-btn nd-menu-btn" onClick={()=>setMenuOpen(v=>!v)} aria-label="Open navigation">{menuOpen?<X size={19}/>:<Menu size={19}/>}</button>
      <a className="nd-brand" href="#top"><span className="nd-brand-mark">N</span><span><b>NOVA ORIGIN</b><small>ESPORTS NETWORK</small></span></a>
      <nav className={menuOpen?'nd-nav is-open':'nd-nav'}>
        <a href="#overview" onClick={closeMenu}>Overview</a><a href="#leaderboard" onClick={closeMenu}>Leaderboard</a><a href="#players" onClick={closeMenu}>Players</a><a href="#teams" onClick={closeMenu}>Teams</a><a href="#tournaments" onClick={closeMenu}>Tournaments</a><a href="#news" onClick={closeMenu}>News</a>
      </nav>
      <div className="nd-header-actions">
        {searchOpen && <input className="nd-header-search" autoFocus placeholder="Search teams and games" value={search} onChange={e=>setSearch(e.target.value)}/>}
        <button className="nd-icon-btn" aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}><Search size={18}/></button>
        <button className="nd-icon-btn nd-notification" aria-label="Updates" onClick={()=>document.getElementById('news')?.scrollIntoView({behavior:'smooth'})}><Bell size={18}/>{updates.length>0&&<i/>}</button>
        <button className="nd-control-btn" onClick={onAdmin}>CONTROL ROOM <ArrowUpRight size={14}/></button>
      </div>
    </header>

    <main className="nd-main">
      <section className="nd-welcome" id="overview">
        <div className="nd-welcome-copy"><div className="nd-overline"><span/> NOVA ORIGIN / COMPETITIVE NETWORK</div><h1>Welcome to <strong>NOVA ORIGIN</strong></h1><p>Your hub for competitive gaming. Discover active teams, explore game communities and stay up to date with upcoming tournaments.</p><div className="nd-welcome-actions"><a className="nd-btn-primary" href="#teams">Explore Teams <ArrowRight size={15}/></a><a className="nd-btn-secondary" href="#players">Explore Players <ArrowRight size={15}/></a></div></div>
        <div className="nd-feature-mini"><div className="nd-feature-mini-head"><span><Trophy size={14}/> FEATURED TOURNAMENT</span><span className="nd-live-tag">{nextEvent?'UPCOMING':'NOVA EVENT'}</span></div><div className="nd-feature-mini-content">{nextEvent?.banner_url?<img src={nextEvent.banner_url} alt="Tournament artwork"/>:<div className="nd-feature-placeholder"><Swords size={28}/></div>}<div><small>{nextEvent?.game?.name||'NOVA ORIGIN'}</small><b>{nextEvent?.title||'The next challenge starts here'}</b><span>{nextEvent?dateLabel(nextEvent.starts_at):'New events will be announced soon'}</span></div></div><a href="#tournaments">View events <ArrowUpRight size={14}/></a></div>
      </section>

      <section className="nd-metrics" aria-label="Platform overview"><div><Gamepad2/><span><b>{data.games.length}</b><small>ACTIVE GAMES</small></span></div><div><Users/><span><b>{data.teams.length}</b><small>PUBLIC TEAMS</small></span></div><div><Trophy/><span><b>{data.tournaments.length}</b><small>TOURNAMENTS</small></span></div><div><Radio/><span><b>{updates.length}</b><small>RECENT UPDATES</small></span></div></section>

      <section className="nd-section" id="leaderboard">
        <SectionTitle eyebrow="COMPETITIVE STANDINGS" title="Leaderboard" action="View all rankings"/>
        <div className="nd-empty-panel"><div className="nd-empty-icon"><Trophy size={22}/></div><div><b>Official rankings are being prepared</b><p>Player ranking records are not currently connected to the public homepage. Verified results will appear here once the leaderboard data source is available.</p></div><span className="nd-data-label">WAITING FOR VERIFIED DATA</span></div>
      </section>

      <section className="nd-section nd-trending" id="trending">
        <SectionTitle eyebrow="WHAT'S ACTIVE" title="Trending on NOVA"/>
        <div className="nd-trending-grid">
          <article className="nd-trend-card nd-trend-games"><div className="nd-trend-heading"><Gamepad2/><b>Popular games</b></div><div className="nd-chip-list">{data.games.slice(0,5).map((g:any)=><span key={g.id}>{g.name}</span>)}{!data.games.length&&<small>No active games published</small>}</div><a href="#games">Browse games <ArrowRight size={13}/></a></article>
          <article className="nd-trend-card"><div className="nd-trend-heading"><Users/><b>Community teams</b></div><strong>{data.teams.length}</strong><p>Public teams in the NOVA network</p><a href="#teams">Explore teams <ArrowRight size={13}/></a></article>
          <article className="nd-trend-card"><div className="nd-trend-heading"><CalendarDays/><b>Next tournament</b></div><strong className="nd-trend-event">{nextEvent?.title||'Coming soon'}</strong><p>{nextEvent?dateLabel(nextEvent.starts_at):'No upcoming event published'}</p><a href="#tournaments">Tournament schedule <ArrowRight size={13}/></a></article>
        </div>
      </section>

      <section className="nd-section" id="players">
        <SectionTitle eyebrow="THE COMMUNITY" title="Featured players"/>
        <div className="nd-empty-panel nd-compact-empty"><div className="nd-empty-icon"><ShieldCheck size={22}/></div><div><b>Player directory connection required</b><p>No public player-profile records are currently exposed by the existing homepage data service. Player cards will populate here when the existing profile source is connected.</p></div></div>
      </section>

      <section className="nd-section" id="teams">
        <SectionTitle eyebrow="SQUADS & ORGANIZATIONS" title="Featured teams" action="Explore teams" onClick={()=>document.getElementById('teams-list')?.scrollIntoView({behavior:'smooth'})}/>
        <div className="nd-team-grid" id="teams-list">{filteredTeams.slice(0,6).map((team:any)=><article className="nd-team-card" key={team.id}><div className="nd-team-card-top"><div className="nd-team-logo">{team.logo_url?<img src={team.logo_url} alt={team.name+' logo'}/>:<b>{team.team_tag?.slice(0,3)||team.name?.slice(0,2)||'N'}</b>}</div><span className="nd-team-state"><i/> ACTIVE</span></div><h3>{team.name}</h3><p>{team.game?.name||'Esports team'}{team.team_tag?' · '+team.team_tag:''}</p><div className="nd-team-card-foot"><span>PUBLIC TEAM</span><span>PROFILE <ArrowUpRight size={13}/></span></div></article>)}{!loading&&filteredTeams.length===0&&<div className="nd-empty-inline">{search?'No teams match your search.':'No public teams have been published yet.'}</div>}{loading&&<div className="nd-empty-inline">Loading teams…</div>}</div>
      </section>

      <section className="nd-section" id="games">
        <SectionTitle eyebrow="FIND YOUR ARENA" title="Games"/>
        <div className="nd-game-grid">{filteredGames.slice(0,8).map((game:any)=><div className="nd-game-card" key={game.id}><span><Gamepad2 size={17}/></span><b>{game.name}</b><small>{game.publisher||'COMPETITIVE TITLE'}</small></div>)}{!loading&&filteredGames.length===0&&<div className="nd-empty-inline">No active games found.</div>}</div>
      </section>

      <section className="nd-section" id="tournaments">
        <SectionTitle eyebrow="COMPETE & PROGRESS" title="Upcoming tournaments"/>
        <div className="nd-filter-row"><label>Filter by game <ChevronDown size={14}/><select value={gameFilter} onChange={e=>setGameFilter(e.target.value)}><option value="all">All games</option>{data.games.map((g:any)=><option key={g.id} value={g.name}>{g.name}</option>)}</select></label></div>
        <div className="nd-tournament-grid">{events.map((event:any)=><article className="nd-tournament-card" key={event.id}><div className="nd-tournament-image">{event.banner_url?<img src={event.banner_url} alt={event.title}/>:<Trophy size={26}/>}<span>{statusLabel(event.status)}</span></div><div className="nd-tournament-info"><small>{event.game?.name||'NOVA CIRCUIT'}</small><h3>{event.title}</h3><p>{event.summary||'Official NOVA Origin tournament.'}</p><div className="nd-event-meta"><span><CalendarDays size={13}/>{dateLabel(event.starts_at)}</span><span>{event.prize_description||'Prize details TBA'}</span></div></div></article>)}{!loading&&events.length===0&&<div className="nd-empty-inline">No tournaments match this filter. Check back for new events.</div>}</div>
      </section>

      <section className="nd-section nd-news-section" id="news">
        <SectionTitle eyebrow="FROM THE NETWORK" title="Latest news & updates"/>
        <div className="nd-news-grid">{updates.map((item:any)=><article className="nd-news-card" key={item.id}><div className="nd-news-meta"><span>{item.kind==='OFFICIAL'?<Newspaper size={13}/>:<Radio size={13}/>} {item.kind}</span><time>{dateLabel(item.published_at||item.created_at)}</time></div><h3>{item.title||'Community update'}</h3><p>{item.body||item.content||'NOVA Origin community update.'}</p></article>)}{!loading&&updates.length===0&&<div className="nd-empty-inline">No news or community updates have been published yet.</div>}</div>
      </section>
    </main>
    <footer className="nd-footer"><a className="nd-brand" href="#top"><span className="nd-brand-mark">N</span><span><b>NOVA ORIGIN</b><small>ESPORTS NETWORK</small></span></a><span>© 2026 NOVA ORIGIN</span><div><a href="#teams">Teams</a><a href="#tournaments">Tournaments</a><a href="#news">Updates</a><button onClick={onAdmin}>Control Room <ArrowUpRight size={13}/></button></div></footer>
  </div>;
}
