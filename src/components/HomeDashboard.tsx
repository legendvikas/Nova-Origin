import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BadgeCheck, Instagram, Menu, ShieldCheck, X, Youtube, Mail, Sparkles } from 'lucide-react';

type Props = {
  data: { games: any[]; tournaments: any[]; teams: any[]; announcements: any[]; posts: any[]; players: any[] };
  loading: boolean;
  onAdmin: () => void;
};

export function HomeDashboard({ data, loading, onAdmin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const teams = data.teams.slice(0, 6);
  const featuredGames = data.games.filter((game: any) => /^(bgmi|battlegrounds mobile india|free fire india)$/i.test(String(game.name || '').trim()));
  const players = data.teams.flatMap((team: any) => {
    const members = Array.isArray(team.members) ? team.members : [];
    return members.map((member: any) => ({ ...member, teamName: team.name, teamTag: team.team_tag }));
  }).slice(0, 6);

  return (
    <div className="nova-origin">
      <div className="origin-strip"><span><i/> NOVA ORIGIN</span><span>INDIA · ESPORTS</span></div>
      <header className="origin-header">
        <a className="origin-logo" href="#origin-home" aria-label="NOVA Origin home"><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></a>
        <span className="origin-official"><BadgeCheck size={16}/> OFFICIAL</span>
        <nav className={menuOpen ? 'origin-nav open' : 'origin-nav'}>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#players" onClick={() => setMenuOpen(false)}>Players</a>
          <a href="#teams" onClick={() => setMenuOpen(false)}>Teams</a>
          <a href="#events" onClick={() => setMenuOpen(false)}>Events</a>
          <a href="#news" onClick={() => setMenuOpen(false)}>News</a>
          <button onClick={() => { setMenuOpen(false); onAdmin(); }}>Control Room <ArrowUpRight size={15}/></button>
        </nav>
        <button className="origin-menu" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button>
      </header>

      <main id="origin-home">
        <section className="origin-hero">
          <div className="origin-grid"/>
          <div className="origin-glow"/>
          <div className="origin-hero-content">
            <div className="origin-eyebrow"><i/> THE NEXT WAVE OF COMPETITION</div>
            <div className="origin-stamp"><Sparkles size={19}/><span>INDEPENDENT ESPORTS COLLECTIVE / INDIA</span></div>
            <h1>BUILT TO<br/><em>RISE.</em> READY<br/>TO <span className="outline-word">DOMINATE.</span></h1>
            <p>More than a team. A collective of players, creators and competitors building something that lasts.</p>
            <div className="origin-actions"><a className="origin-primary" href="#players">MEET THE ROSTER <ArrowUpRight/></a><a className="origin-secondary" href="#events">EXPLORE EVENTS <ArrowRight/></a></div>
            <div className="origin-meta"><span><i/> COMMUNITY ONLINE</span><span>INDIA / GLOBAL</span><span>EST. NOVA ORIGIN</span></div>
          </div>
          <div className="origin-monogram" aria-hidden="true">N<span>.</span></div>
        </section>

        <section className="origin-players" id="players">
          <div className="origin-section-label"><i/> COMMUNITY / ROSTER</div>
          <div className="origin-section-head"><h2>MEET THE<br/><em>PLAYERS.</em></h2><p>The NOVA Origin squad. Verified competitive records appear separately when available.</p></div>
          {players.length > 0 ? <div className="origin-player-grid">{players.map((player: any, index: number) => <article className="origin-player-card origin-interactive-card" key={player.id || player.user_id || index} role="button" tabIndex={0} onClick={() => setSelectedProfile({kind:"PLAYER",...player})} onKeyDown={e => {if(e.key==="Enter") setSelectedProfile({kind:"PLAYER",...player});}}>
            <div className="origin-player-image">{player.avatar_url || player.photo_url ? <img src={player.avatar_url || player.photo_url} alt={player.display_name || player.username || 'NOVA player'}/> : <div className="origin-player-placeholder">N<span>.</span></div>}<small>PLAYER {String(index + 1).padStart(2, '0')}</small></div>
            <div className="origin-player-role">{player.role || 'NOVA PLAYER'}</div><h3>{player.display_name || player.full_name || player.username || 'NOVA PLAYER'}</h3>
            {player.is_verified && <span className="origin-verified"><BadgeCheck size={19}/></span>}
            <div className="origin-player-tag">{player.teamTag || player.teamName || 'NOVA ORIGIN'}</div>
          </article>)}</div> : <div className="origin-player-empty">{loading ? 'LOADING THE NOVA ROSTER…' : 'PLAYER PROFILES WILL APPEAR HERE WHEN PUBLISHED.'}</div>}
        </section>

        <section className="origin-team-section" id="teams">
          <div className="origin-team-intro"><h2>BUILT AS<br/>ONE.<br/><em>PLAY AS<br/>MANY.</em></h2><p>Every role matters. Every player moves the team forward.</p></div>
          <div className="origin-team-list">
            {teams.map((team: any, index: number) => <article className="origin-team-card origin-interactive-card" key={team.id} role="button" tabIndex={0} onClick={() => setSelectedProfile({kind:"TEAM",...team})} onKeyDown={e => {if(e.key==="Enter") setSelectedProfile({kind:"TEAM",...team});}}>
              <span className="origin-team-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="origin-team-logo">{team.logo_url ? <img src={team.logo_url} alt={team.name + ' logo'}/> : <b>{team.team_tag?.slice(0, 3) || team.name?.slice(0, 2) || 'N'}</b>}</div>
              <div className="origin-team-copy"><h3>{team.name} {team.is_verified && <span className="origin-team-verified"><ShieldCheck size={14}/> VERIFIED</span>}</h3><p>{team.description || team.game?.name || 'NOVA Origin esports team'}</p><small>OWNED BY · {team.owner_name || team.captain_name || 'NOVA ORIGIN'}</small></div>
              <ArrowUpRight className="origin-team-arrow"/>
            </article>)}
            {!loading && teams.length === 0 && <div className="origin-team-empty">APPROVED PUBLIC TEAMS WILL APPEAR HERE.</div>}
          </div>
        </section>

        <section className="origin-events" id="events"><div className="origin-section-label"><i/> COMPETITIVE CIRCUIT</div><h2>READY FOR<br/><em>THE NEXT MATCH?</em></h2><div className="origin-event-list">{data.tournaments.slice(0, 3).map((event: any, index: number) => <article key={event.id}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{event.game?.name || 'NOVA ORIGIN'} · {(event.status || 'UPCOMING').replaceAll('_', ' ')}</small><h3>{event.title}</h3><p>{event.summary || 'Official NOVA Origin competition.'}</p></div><ArrowUpRight/></article>)}{!loading && data.tournaments.length === 0 && <p className="origin-event-empty">UPCOMING OFFICIAL EVENTS WILL BE ANNOUNCED HERE.</p>}</div></section>


        <section className="origin-about" id="about">
          <div className="origin-section-label"><i/> THE ORGANIZATION</div>
          <div className="origin-about-grid"><h2>MORE THAN<br/><em>A NAME.</em></h2><div><p>NOVA ORIGIN is an independent esports collective built around players, teams and competitive communities. Our focus is to create a connected home for competition and growth.</p><div className="origin-about-values"><span>01 / COMMUNITY FIRST</span><span>02 / COMPETE WITH INTEGRITY</span><span>03 / BUILD FOR THE LONG RUN</span></div></div></div>
        </section>

        <section className="origin-games" id="games">
          <div className="origin-section-label"><i/> OUR COMPETITIVE TITLES</div><div className="origin-section-head"><h2>BUILT FOR<br/><em>EVERY GAME.</em></h2><p>Explore the active game communities connected to NOVA Origin.</p></div>
          <div className="origin-game-grid">{featuredGames.map((game: any, index: number) => <article key={game.id} className="origin-game-card"><span>GAME / {String(index+1).padStart(2,'0')}</span><h3>{game.name}</h3><small>{game.publisher || 'COMPETITIVE DIVISION'}</small></article>)}{!loading && featuredGames.length===0 && <div className="origin-empty">Active game divisions will appear here when published.</div>}</div>
        </section>

        <section className="origin-news" id="news">
          <div className="origin-section-label"><i/> FROM THE NETWORK</div><div className="origin-section-head"><h2>THE LATEST<br/><em>FROM NOVA.</em></h2><p>Official announcements and community updates.</p></div>
          <div className="origin-news-grid">
            {[...data.announcements.map((item:any)=>({...item,kind:'ANNOUNCEMENT',copy:item.body})),...data.posts.map((item:any)=>({...item,kind:'COMMUNITY UPDATE',copy:item.content}))].sort((a:any,b:any)=>new Date(b.published_at||b.created_at||0).getTime()-new Date(a.published_at||a.created_at||0).getTime()).slice(0,4).map((item:any,index:number)=><article key={item.id||index}><small>{item.kind}</small><h3>{item.title||item.copy?.slice(0,72)||'NOVA Origin update'}</h3><p>{item.copy||''}</p><time>{item.published_at||item.created_at ? new Date(item.published_at||item.created_at).toLocaleDateString() : 'NOVA ORIGIN'}</time></article>)}
            {!loading && data.announcements.length===0 && data.posts.length===0 && <div className="origin-empty">Official news and media updates will appear here when published.</div>}
          </div>
        </section>

        <section className="origin-partners" id="partners"><div><div className="origin-section-label"><i/> PARTNERSHIPS</div><h2>BUILT ON<br/><em>TRUST.</em></h2><p>We welcome brands and organizations that share our commitment to competitive gaming and community.</p></div><div className="origin-partner-placeholder">PARTNER WITH NOVA ORIGIN <span>COLLABORATIONS / BUSINESS INQUIRIES</span></div></section>
        <section className="origin-join" id="join"><h2>READY TO<br/><em>RISE WITH<br/>US?</em></h2><p>Find your place in the origin.</p><a className="origin-primary" href="#players">JOIN NOVA ORIGIN <ArrowUpRight/></a><a className="origin-secondary" href="mailto:hello@novaorigin.gg">CONTACT THE TEAM <Mail/></a></section>
      </main>

      {selectedProfile && <div className="origin-profile-overlay" role="dialog" aria-modal="true" aria-label={selectedProfile.kind + " profile"} onClick={() => setSelectedProfile(null)}><section className="origin-profile-modal" onClick={e => e.stopPropagation()}><button className="origin-profile-close" onClick={() => setSelectedProfile(null)} aria-label="Close profile"><X/></button><div className="origin-profile-cover">{(selectedProfile.avatar_url || selectedProfile.photo_url || selectedProfile.logo_url) ? <img src={selectedProfile.avatar_url || selectedProfile.photo_url || selectedProfile.logo_url} alt=""/> : <b>N.</b>}<span>{selectedProfile.kind} / NOVA ORIGIN</span></div><div className="origin-profile-details"><span className="origin-section-label"><i/> OFFICIAL DIRECTORY</span><h2>{selectedProfile.display_name || selectedProfile.full_name || selectedProfile.username || selectedProfile.name || "NOVA ORIGIN"}</h2><p>{selectedProfile.bio || selectedProfile.description || "Official NOVA Origin profile. More information will be added as the roster is updated."}</p><div className="origin-profile-meta"><span>{selectedProfile.role || selectedProfile.game?.name || "COMPETITIVE PLAYER"}</span><span>{selectedProfile.teamName || selectedProfile.team_tag || selectedProfile.teamTag || "NOVA ORIGIN"}</span></div>{selectedProfile.is_verified && <span className="origin-verified"><BadgeCheck/> VERIFIED</span>}</div></section></div>}
      <footer className="origin-footer"><div className="origin-footer-brand"><a className="origin-logo" href="#origin-home"><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></a><span className="origin-official"><BadgeCheck size={16}/> OFFICIAL</span><div className="origin-social"><a href="https://www.instagram.com/" aria-label="Instagram"><Instagram/></a><a href="https://www.youtube.com/" aria-label="YouTube"><Youtube/></a></div></div><p>More than a team. A collective built to rise, compete and create what comes next.</p><div className="origin-footer-links"><span>EXPLORE</span><a href="#players">PLAYERS</a><a href="#teams">TEAMS</a><a href="#events">EVENTS</a><a href="#news">NEWS</a><a href="#partners">PARTNERS</a><a href="#join">JOIN NOVA</a><button onClick={onAdmin}>CONTROL ROOM <ArrowUpRight size={14}/></button></div><small className="origin-copyright">© 2026 NOVA ORIGIN. ALL RIGHTS RESERVED.</small></footer>
    </div>
  );
}
