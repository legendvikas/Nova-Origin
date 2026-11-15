import { Link, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BadgeCheck, CalendarDays, Mail, ShieldCheck, Users, Gamepad2 } from 'lucide-react';

type Props = { page: string; data: any; loading: boolean; onNavigate: (path: string) => void };

const pageInfo: Record<string, {kicker:string; title:string; accent:string; intro:string}> = {
  about:{kicker:'THE ORGANIZATION',title:'MORE THAN A',accent:'NAME.',intro:'NOVA ORIGIN is an independent esports collective built around players, teams and competitive communities. We are creating a connected home for competition and growth.'},
  players:{kicker:'ROSTER DIRECTORY',title:'MEET THE',accent:'PLAYERS.',intro:'Discover the competitors representing NOVA ORIGIN. Only published roster profiles appear in this directory.'},
  teams:{kicker:'COMPETITIVE DIVISIONS',title:'BUILT AS',accent:'ONE.',intro:'Explore the active teams and game divisions connected to NOVA ORIGIN.'},
  events:{kicker:'COMPETITIVE CIRCUIT',title:'THE NEXT',accent:'MATCH.',intro:'Follow published tournaments, schedules and competition updates from the NOVA ORIGIN network.'},
  news:{kicker:'FROM THE NETWORK',title:'LATEST FROM',accent:'NOVA.',intro:'Official organization announcements and community updates.'},
  partners:{kicker:'PARTNERSHIPS',title:'BUILD WITH',accent:'NOVA.',intro:'We welcome brands and organizations that share our commitment to competitive gaming and community.'},
  join:{kicker:'RECRUITMENT',title:'RISE WITH',accent:'US.',intro:'Interested in joining NOVA ORIGIN? Recruitment opportunities and application details will be published here when open.'},
  contact:{kicker:'GET IN TOUCH',title:'START A',accent:'CONVERSATION.',intro:'For organization, media and partnership enquiries, contact the NOVA ORIGIN team through the official channel below.'}
};

export function PublicPage({page,data,loading,onNavigate}:Props){
 const [query,setQuery]=useState('');
 const key=pageInfo[page]?page:'about'; const info=pageInfo[key];
 const players=(data.players||[]).filter((p:any)=>!query||String(p.display_name||p.ign||'').toLowerCase().includes(query.toLowerCase()));
 const cards=(items:any[],kind:string)=>items.length?items.map((item:any,i)=><article className="nova-page-card" key={item.id||i}><span className="nova-page-card-index">{kind} / {String(i+1).padStart(2,'0')}</span>{item.logo_url||item.avatar_url||item.banner_url?<img src={item.logo_url||item.avatar_url||item.banner_url} alt=""/>:<div className="nova-page-card-mark">{(item.team_tag||item.display_name||item.name||item.title||'N').slice(0,3).toUpperCase()}</div>}<div className="nova-page-card-copy"><h2>{item.display_name||item.ign||item.name||item.title||'NOVA ORIGIN'}</h2><p>{item.bio||item.description||item.summary||item.body||item.content||item.role||'Official NOVA ORIGIN listing.'}</p><small>{item.game?.name||item.game_name||item.role||item.status||'NOVA ORIGIN'}</small></div></article>):<div className="nova-page-empty">{loading?'LOADING PUBLISHED INFORMATION…':'NO PUBLISHED INFORMATION YET. CHECK BACK FOR OFFICIAL UPDATES.'}</div>;
 return <div className="nova-public-page">
  <header className="nova-page-top"><button onClick={()=>onNavigate('/')}><ArrowLeft size={17}/> NOVA ORIGIN</button><span>INDIA · ESPORTS</span></header>
  <main className="nova-page-main">
   <div className="nova-page-kicker"><i/>{info.kicker}</div>
   <h1>{info.title}<br/><em>{info.accent}</em></h1>
   <p className="nova-page-intro">{info.intro}</p>
   {page==='about'&&<section className="nova-page-values"><article><b>01</b><h2>COMMUNITY FIRST</h2><p>Build a welcoming and connected competitive ecosystem.</p></article><article><b>02</b><h2>COMPETE WITH INTEGRITY</h2><p>Respect the game, the players and the competition.</p></article><article><b>03</b><h2>BUILD FOR THE LONG RUN</h2><p>Create opportunities for players and teams to grow.</p></article></section>}
   {page==='players'&&<><input className="nova-page-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search published players…"/><div className="nova-page-grid">{cards(players,'PLAYER')}</div></>}
   {page==='teams'&&<div className="nova-page-grid">{cards(data.teams||[],'DIVISION')}</div>}
   {page==='events'&&<div className="nova-page-grid">{cards(data.tournaments||[],'EVENT')}</div>}
   {page==='news'&&<div className="nova-page-grid">{cards([...(data.announcements||[]),...(data.posts||[])].sort((a:any,b:any)=>new Date(b.published_at||b.created_at||0).getTime()-new Date(a.published_at||a.created_at||0).getTime()),'UPDATE')}</div>}
   {page==='partners'&&<section className="nova-page-feature"><BadgeCheck/><h2>PARTNERSHIPS THAT MOVE THE GAME FORWARD.</h2><p>Official partner listings will appear here once confirmed and published by NOVA ORIGIN.</p><a href="mailto:hello@novaorigin.gg">BUSINESS ENQUIRIES <ArrowUpRight size={17}/></a></section>}
   {page==='join'&&<section className="nova-page-feature"><Users/><h2>YOUR NEXT CHAPTER STARTS HERE.</h2><p>Recruitment is managed through official NOVA ORIGIN announcements. No application is submitted from this page yet.</p><a href="mailto:hello@novaorigin.gg?subject=NOVA%20ORIGIN%20Recruitment%20Enquiry">RECRUITMENT ENQUIRY <ArrowUpRight size={17}/></a></section>}
   {page==='contact'&&<section className="nova-page-feature"><Mail/><h2>CONTACT THE ORGANIZATION.</h2><p>For general, media and partnership enquiries, reach out by email.</p><a href="mailto:hello@novaorigin.gg">HELLO@NOVAORIGIN.GG <ArrowUpRight size={17}/></a><small>Replace this placeholder with the organization's verified email before launch.</small></section>}
   <nav className="nova-page-nav"><span>EXPLORE NOVA ORIGIN</span>{Object.keys(pageInfo).map(k=><button key={k} onClick={()=>onNavigate('/'+k)}>{k.toUpperCase()} <ArrowUpRight size={14}/></button>)}</nav>
  </main>
  <footer className="nova-page-footer"><b>NOVA<span>.</span></b><small>© 2026 NOVA ORIGIN ESPORTS</small><button onClick={()=>onNavigate('/')}>BACK TO HOME ↗</button></footer>
 </div>;
}
