import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import {
  ArrowRight, ArrowUpRight, Menu, X, DoorOpen, Pencil, Camera, BadgeCheck, Instagram, Twitch, Link2, Gamepad2, Trophy, Users, CalendarDays,
  Radio, Youtube, Disc3, ChevronRight, MapPin, Clock3, Shield,
  Swords, Newspaper, Mail, ExternalLink, Crown, Sparkles
} from 'lucide-react';
import { api, currentUser, getValidSession, signInWithEmail, signUpWithEmail, signOut, uploadPlayerAvatar, uploadTeamLogo, type NovaUser } from '../lib/supabase';

type Props = {
  data: { games: any[]; tournaments: any[]; teams: any[]; announcements: any[]; posts: any[] };
  loading: boolean;
  onOpenAdmin: () => void;
};
type ExtraData = { matches: any[]; players: any[]; members: any[]; profiles: any[]; verifiedBadges: any[]; sponsors: any[]; results: any[] };

const NAV = [
  ['HOME', '/'], ['ABOUT', '/about'], ['GAMES', '/games'], ['TOURNAMENTS', '/tournaments'],
  ['MATCHES', '/matches'], ['TEAMS', '/teams'], ['PLAYERS', '/players'], ['NEWS', '/news'],
  ['COMMUNITY', '/community'], ['MY PROFILE', '/account']
] as const;

const clean = (value: unknown) => String(value ?? '').replaceAll('_', ' ');
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'DATE TBA';
const slugOf = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const safeHref = (value?: string) => value && /^https?:\/\//i.test(value) ? value : undefined;

// Restored legacy NOVA roster: public team labels only, with no invented statistics.
const LEGACY_ROSTER = [
  { name: 'VIKAS', tag: 'NOVA VIKAS', role: 'IGL', number: '01', initial: 'V' },
  { name: 'DEEPAK', tag: 'NOVA DEEPAK', role: 'RUSHER', number: '02', initial: 'D' },
  { name: 'SATYAM', tag: 'NOVA SATYAM', role: 'SNIPER', number: '03', initial: 'S' },
  { name: 'ANIKET', tag: 'NOVA ANIKET', role: 'SECONDARY RUSHER', number: '04', initial: 'A' }
];

export function PublicSite({ data, loading, onOpenAdmin }: Props) {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [extra, setExtra] = useState<ExtraData>({ matches: [], players: [], members: [], profiles: [], verifiedBadges: [], sponsors: [], results: [] });
  const [extraLoading, setExtraLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authUser, setAuthUser] = useState<NovaUser|null>(null);
  const [myProfile, setMyProfile] = useState<any|null>(null);
  const [badgeApproved, setBadgeApproved] = useState(false);
  const [badgeRequest, setBadgeRequest] = useState<any|null>(null);
  const [badgeDraft, setBadgeDraft] = useState({game_id:'',in_game_name:'',evidence_url:'',note:''});
  const [badgeBusy, setBadgeBusy] = useState(false);
  const [badgeMessage, setBadgeMessage] = useState('');
  const [badgeError, setBadgeError] = useState('');
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [teamDraft, setTeamDraft] = useState({name:'',team_tag:'',game_id:'',description:'',logo_url:'',is_public:true});
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamLogoBusy, setTeamLogoBusy] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [teamMessage, setTeamMessage] = useState('');
  const [profileDraft, setProfileDraft] = useState({username:'',display_name:'',bio:'',avatar_url:''});
  const [socialDraft, setSocialDraft] = useState<Record<string,string>>({instagram:'',youtube:'',twitch:'',discord:'',x:'',website:''});
  const [editOpen, setEditOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'posts'|'verification'>('posts');
  const [cropSource, setCropSource] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropFileName, setCropFileName] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [managedNavigation, setManagedNavigation] = useState<any[]>([]);
  const [managedSeo, setManagedSeo] = useState<any[]>([]);
  const [homepageSections, setHomepageSections] = useState<any[]>([]);
  const [customPages, setCustomPages] = useState<any[]>([]);

  useEffect(() => {
    const onPop = () => { setPath(window.location.pathname.replace(/\/$/, '') || '/'); setMenuOpen(false); };
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('popstate', onPop);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    let live=true;
    Promise.all([
      api<any[]>('site_navigation',{select:'id,label,href,display_order,is_visible,open_in_new_tab',is_visible:'eq.true',order:'display_order.asc'}).catch(()=>[]),
      api<any[]>('seo_metadata',{select:'route_path,page_title,meta_description,canonical_url,og_image_url,robots_index'}).catch(()=>[]),
      api<any[]>('homepage_sections',{select:'id,section_key,title,subtitle,body,image_url,button_label,button_url,display_order,is_visible',is_visible:'eq.true',order:'display_order.asc'}).catch(()=>[]),
      api<any[]>('site_pages',{select:'id,title,slug,excerpt,content_markdown,seo_title,seo_description,published_at',status:'eq.published',order:'published_at.desc'}).catch(()=>[])
    ]).then(([nav,seo,sections,pages])=>{if(live){setManagedNavigation(nav);setManagedSeo(seo);setHomepageSections(sections);setCustomPages(pages);}});
    return ()=>{live=false;};
  }, []);

  useEffect(() => {
    const routeLabel = path.split('/').filter(Boolean).join(' / ').replaceAll('-', ' ');
    const route = path.split('/').filter(Boolean)[0] || 'home';
    const seo: Record<string, [string, string]> = {
      home: ['NOVA ORIGIN — Built to Rise', 'NOVA Origin is an esports collective built around competition, teams, players, tournaments and community.'],
      about: ['About NOVA ORIGIN — Our Story', 'Discover NOVA Origin, our esports vision, competitive values and the community behind the team.'],
      games: ['Games — NOVA ORIGIN Esports', 'Explore the games and competitive titles supported by NOVA Origin.'],
      teams: ['Teams — NOVA ORIGIN Esports', 'Meet NOVA Origin competitive teams, team divisions and active rosters.'],
      players: ['Players — NOVA ORIGIN Esports', 'Discover NOVA Origin players and their verified competitive profiles and statistics.'],
      tournaments: ['Tournaments — NOVA ORIGIN Esports', 'Explore NOVA Origin tournaments, event details, schedules and verified results.'],
      matches: ['Match Center — NOVA ORIGIN Esports', 'Follow NOVA Origin match schedules, live status and verified match results.'],
      news: ['News — NOVA ORIGIN Esports', 'Read official NOVA Origin announcements, esports updates and community news.'],
      community: ['Community — NOVA ORIGIN Esports', 'Connect with the NOVA Origin community and follow official updates.'],
      contact: ['Contact NOVA ORIGIN', 'Contact NOVA Origin for team enquiries, partnerships, media and general questions.'],
      join: ['Join NOVA ORIGIN', 'Send an application enquiry to become part of the NOVA Origin esports community.']
    };
    const [title, description] = seo[route] || [`NOVA ORIGIN — ${routeLabel.toUpperCase()}`, 'Explore this NOVA Origin esports profile, event or update.'];
    const managed = managedSeo.find(item=>item.route_path===path || item.route_path==='/'+route || (route==='home' && item.route_path==='/'));
    const customPage = route !== 'home' && path.split('/').filter(Boolean).length === 1 ? customPages.find((item:any)=>item.slug===route) : null;
    const finalTitle=managed?.page_title || customPage?.seo_title || customPage?.title || title;
    const finalDescription=managed?.meta_description || customPage?.seo_description || customPage?.excerpt || description;
    document.title = finalTitle;
    const setMeta = (selector: string, attr: 'content', value: string, create: () => HTMLElement) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) { el = create() as HTMLMetaElement; document.head.appendChild(el); }
      el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', finalDescription, () => { const e=document.createElement('meta'); e.name='description'; return e; });
    setMeta('meta[property="og:title"]', 'content', finalTitle, () => { const e=document.createElement('meta'); e.setAttribute('property','og:title'); return e; });
    setMeta('meta[property="og:description"]', 'content', finalDescription, () => { const e=document.createElement('meta'); e.setAttribute('property','og:description'); return e; });
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image', () => { const e=document.createElement('meta'); e.name='twitter:card'; return e; });
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = managed?.canonical_url || ('https://nova-origin-esports.vercel.app' + (path === '/' ? '/' : path));
    if (managed?.og_image_url) {
      setMeta('meta[property="og:image"]', 'content', managed.og_image_url, () => { const e=document.createElement('meta'); e.setAttribute('property','og:image'); return e; });
      setMeta('meta[name="twitter:image"]', 'content', managed.og_image_url, () => { const e=document.createElement('meta'); e.name='twitter:image'; return e; });
    }
    setMeta('meta[name="robots"]', 'content', managed?.robots_index === false ? 'noindex, nofollow' : 'index, follow', () => { const e=document.createElement('meta'); e.name='robots'; return e; });
  }, [path, managedSeo, customPages]);

  useEffect(() => {
    let live = true;
    const read = async (table: string, query: Record<string, string>) => {
      try { return await api<any[]>(table, query); } catch { return []; }
    };
    (async () => {
      const [matches, players, members, sponsors, results] = await Promise.all([
        read('matches', { select: 'id,tournament_id,match_number,stage,round_name,scheduled_at,status,result_status,tournament:tournaments(title,game:games(name))', order: 'scheduled_at.asc.nullslast', limit: '12' }),
        read('player_game_stats', { select: 'id,player_id,game_id,kd_ratio,average_damage,matches_played,wins,eliminations,source_label,player:profiles(username,display_name,avatar_url,bio),game:games(name)', source_label: 'eq.verified', order: 'matches_played.desc', limit: '100' }),
        read('team_members', { select: 'id,team_id,user_id,team_role', limit: '250' }),
        read('sponsors', { select: 'id,name,logo_url,website_url,description,status', status: 'eq.active', order: 'created_at.desc', limit: '12' }),
        read('match_results', { select: 'id,match_id,team_id,player_id,placement,eliminations,points,status,verified_at,team:teams(name,team_tag),player:profiles(username,display_name),match:matches(tournament_id,match_number,round_name,scheduled_at)', status: 'eq.verified', order: 'created_at.desc', limit: '30' })
      ]);
      const [profiles, verifiedBadges] = await Promise.all([
        read('profiles', { select: 'id,username,display_name,avatar_url,bio,social_links', order: 'created_at.asc', limit: '100' }),
        read('player_verified_badges', { select: 'player_id,verified_at', limit: '500' })
      ]);
      if (live) { setExtra({ matches, players, members, profiles, verifiedBadges, sponsors, results }); setExtraLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const syncAccount = async () => {
      const session = await getValidSession();
      if (!session) { if (active) setAuthUser(null); return; }
      try { const user = await currentUser(session.access_token); if (active) setAuthUser(user); }
      catch { signOut(); if (active) setAuthUser(null); }
    };
    const onAuthChange = () => { void syncAccount(); };
    void syncAccount();
    window.addEventListener('nova-auth-changed', onAuthChange);
    return () => { active = false; window.removeEventListener('nova-auth-changed', onAuthChange); };
  }, []);

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthNotice(''); setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        const result = await signUpWithEmail(authEmail, authPassword, authName);
        if (result.access_token) {
          const session = await getValidSession();
          if (session) setAuthUser(await currentUser(session.access_token));
          setAuthNotice('Your NOVA account is ready.');
        } else {
          setAuthNotice('Check your email and confirm your address to finish creating your account, then sign in.');
          setAuthMode('signin');
        }
      } else {
        const result = await signInWithEmail(authEmail, authPassword);
        setAuthUser(await currentUser(result.access_token));
        setAuthNotice('You are signed in.');
      }
      setAuthPassword('');
    } catch (error: any) {
      setAuthError(error?.message || 'Could not complete sign in. Please try again.');
    } finally { setAuthBusy(false); }
  };

  useEffect(() => {
    let live = true;
    if (!authUser) { setMyProfile(null); return; }
    Promise.all([
      api<any[]>('profiles',{select:'id,username,display_name,avatar_url,bio,country_code,social_links',id:'eq.'+authUser.id,limit:'1'}),
      api<any[]>('player_badge_requests',{select:'id,status,game_id,in_game_name,evidence_url,note,manager_note,created_at',player_id:'eq.'+authUser.id,order:'created_at.desc',limit:'1'}).catch(() => []),
      api<any[]>('player_verified_badges',{select:'player_id,verified_at',player_id:'eq.'+authUser.id,limit:'1'}).catch(() => [])
    ]).then(([rows, requests, verifiedRows]) => {
      if (!live) return; const p=rows[0] || {id:authUser.id}; setMyProfile(p);
      const latestRequest=requests[0]||null; setBadgeRequest(latestRequest); setBadgeApproved(verifiedRows.length>0);
      setProfileDraft({username:p.username||'',display_name:p.display_name||authUser.user_metadata?.full_name||'',bio:p.bio||'',avatar_url:p.avatar_url||''});
      setSocialDraft({instagram:p.social_links?.instagram||'',youtube:p.social_links?.youtube||'',twitch:p.social_links?.twitch||'',discord:p.social_links?.discord||'',x:p.social_links?.x||'',website:p.social_links?.website||''});
    }).catch(e => { if(live) setProfileError(e.message||'Could not load profile.'); });
    return () => { live=false; };
  }, [authUser?.id]);

  useEffect(() => {
    let live = true;
    if (!authUser) { setMyTeams([]); return; }
    api<any[]>('teams',{select:'id,name,team_tag,game_id,description,logo_url,is_public,status,created_at',owner_id:'eq.'+authUser.id,order:'created_at.desc'})
      .then(rows=>{if(live)setMyTeams(rows);})
      .catch(()=>{if(live)setTeamError('Could not load your teams. Please refresh and try again.');});
    return ()=>{live=false;};
  }, [authUser?.id]);

  const chooseTeamLogo = async (file?: File) => {
    if (!file || !authUser) return;
    setTeamLogoBusy(true); setTeamError('');
    try {
      const url=await uploadTeamLogo(file,authUser.id);
      setTeamDraft(v=>({...v,logo_url:url}));
      setTeamMessage('Team icon uploaded. It will be shown after approval.');
    } catch(error:any) { setTeamError(error?.message||'Could not upload team icon.'); }
    finally { setTeamLogoBusy(false); }
  };

  const createPlayerTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!authUser) { setTeamError('Please sign in first.'); return; }
    setTeamBusy(true); setTeamError(''); setTeamMessage('');
    try {
      const verified=await api<any[]>('player_verified_badges',{select:'player_id',player_id:'eq.'+authUser.id,limit:'1'});
      if (!verified.length) throw new Error('Only players with an active NOVA Verified Badge can apply to create a team. Request verification from your profile first.');
      setBadgeApproved(true);
      const name=teamDraft.name.trim();
      const team_tag=teamDraft.team_tag.trim().toUpperCase();
      if(name.length<2||name.length>48) throw new Error('Team name must be 2–48 characters.');
      if(!/^[A-Z0-9]{2,12}$/.test(team_tag)) throw new Error('Team tag must be 2–12 letters or numbers.');
      if(!teamDraft.game_id) throw new Error('Please select a game.');
      const logo_url=teamDraft.logo_url.trim();
      if(logo_url && !/^https:\/\//i.test(logo_url)) throw new Error('Team icon URL must start with https://');
      const created=await api<any[]>('teams',{}, {method:'POST',body:{owner_id:authUser.id,game_id:teamDraft.game_id,name,team_tag,description:teamDraft.description.trim()||null,logo_url:logo_url||null,is_public:teamDraft.is_public,status:'pending_review',application_submitted_at:new Date().toISOString()},prefer:'return=representation'});
      const team=created?.[0];
      if(!team?.id) throw new Error('Team application could not be confirmed. Please refresh and check My Teams.');
      setMyTeams(rows=>[team,...rows]);
      setTeamDraft({name:'',team_tag:'',game_id:'',description:'',logo_url:'',is_public:true});
      setTeamMessage('Team application submitted. Your team will appear publicly after Admin approval.');
    } catch(error:any) { setTeamError(error?.message||'Could not create your team. Please try again.'); }
    finally { setTeamBusy(false); }
  };

  const saveMyProfile = async (e: FormEvent) => {
    e.preventDefault(); if(!authUser) return; setProfileBusy(true); setProfileError(''); setProfileMessage('');
    try {
      const username=profileDraft.username.trim().toLowerCase();
      if(username && !/^[a-z0-9_.]{3,24}$/.test(username)) throw new Error('Username must be 3–24 characters: letters, numbers, dot or underscore.');
      const social_links=Object.fromEntries(Object.entries(socialDraft).map(([k,v])=>[k,v.trim()]).filter(([,v])=>!!v));
      for (const [key,value] of Object.entries(social_links)) if (!/^https:\/\//i.test(value)) throw new Error('Social links must start with https://');
      const payload={username:username||null,display_name:profileDraft.display_name.trim()||'Player',bio:profileDraft.bio.trim()||null,avatar_url:profileDraft.avatar_url.trim()||null,social_links,updated_at:new Date().toISOString()};
      const existing=await api<any[]>('profiles',{select:'id',id:'eq.'+authUser.id,limit:'1'});
      const rows=existing.length
        ? await api<any[]>('profiles',{id:'eq.'+authUser.id},{method:'PATCH',body:payload,prefer:'return=representation'})
        : await api<any[]>('profiles',{}, {method:'POST',body:{id:authUser.id,...payload},prefer:'return=representation'});
      setMyProfile(rows[0]||{...myProfile,...payload}); setProfileMessage('Profile saved successfully.'); return true;
    } catch(e:any) { setProfileError(e.message||'Could not save profile.'); return false; } finally { setProfileBusy(false); }
  };
  const chooseAvatar = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { setProfileError('Choose an image under 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setCropSource(String(reader.result || '')); setCropFileName(file.name); setCropZoom(1); };
    reader.readAsDataURL(file);
  };
  const saveCroppedAvatar = async () => {
    if (!cropSource || !authUser) return;
    setProfileBusy(true); setProfileError(''); setProfileMessage('');
    try {
      const img = new Image(); img.src = cropSource;
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
      const size = Math.min(img.naturalWidth,img.naturalHeight) / cropZoom;
      const canvas = document.createElement('canvas'); canvas.width=640; canvas.height=640;
      const ctx = canvas.getContext('2d'); if(!ctx) throw new Error('Image crop is unavailable in this browser.');
      ctx.drawImage(img,(img.naturalWidth-size)/2,(img.naturalHeight-size)/2,size,size,0,0,640,640);
      const blob: Blob = await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not crop image.')),'image/jpeg',.9));
      const file = new File([blob],(cropFileName.replace(/\.[^.]+$/,'')||'nova-avatar')+'.jpg',{type:'image/jpeg'});
      const avatar_url = await uploadPlayerAvatar(file,authUser.id);
      setProfileDraft(v=>({...v,avatar_url})); setMyProfile((v:any)=>({...v,avatar_url}));
      const existing=await api<any[]>('profiles',{select:'id',id:'eq.'+authUser.id,limit:'1'});
      const payload={avatar_url,updated_at:new Date().toISOString()};
      if(existing.length) await api('profiles',{id:'eq.'+authUser.id},{method:'PATCH',body:payload,prefer:'return=minimal'});
      else await api('profiles',{}, {method:'POST',body:{id:authUser.id,display_name:profileDraft.display_name.trim()||'Player',...payload},prefer:'return=minimal'});
      setCropSource(''); setProfileMessage('Profile photo updated successfully.');
    } catch(e:any) { setProfileError(e.message||'Profile photo update failed.'); }
    finally { setProfileBusy(false); }
  };
  const submitBadgeRequest = async (e: FormEvent) => {
    e.preventDefault(); if(!authUser) return;
    setBadgeBusy(true); setBadgeError(''); setBadgeMessage('');
    try {
      if(!badgeDraft.game_id) throw new Error('Select the game you compete in.');
      if(!badgeDraft.in_game_name.trim()) throw new Error('Enter your in-game name.');
      if(!/^https:\/\//i.test(badgeDraft.evidence_url.trim())) throw new Error('Add a valid HTTPS evidence link.');
      const rows=await api<any[]>('player_badge_requests',{}, {method:'POST',body:{
        player_id:authUser.id,game_id:badgeDraft.game_id,in_game_name:badgeDraft.in_game_name.trim(),
        evidence_url:badgeDraft.evidence_url.trim(),note:badgeDraft.note.trim()||null,status:'pending'
      },prefer:'return=representation'});
      setBadgeRequest(rows[0]||{status:'pending',...badgeDraft});
      setBadgeMessage('Verification request sent to NOVA managers.');
    } catch(e:any) { setBadgeError(e.message||'Could not submit verification request.'); }
    finally { setBadgeBusy(false); }
  };
  const navigate = (to: string) => {
    const target = new URL(to, window.location.origin);
    window.history.pushState({}, '', target.pathname + target.search + target.hash);
    setPath(target.pathname.replace(/\/$/, '') || '/');
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const link = (to: string, label: string, className = '') => (
    <a className={className} href={to} onClick={e => { e.preventDefault(); navigate(to); }}>{label}</a>
  );

  const activeTeams = data.teams.length;
  const liveEvents = data.tournaments.filter(t => t.status === 'live').length;
  const gamesCount = data.games.length;
  const matchCount = extra.matches.length;
  const route = path.split('/').filter(Boolean);
  const slug = route[1] || '';
  const currentGame = route[0] === 'games' && slug ? data.games.find(x => x.slug === slug || slugOf(x.name) === slug) : null;
  const currentTeam = route[0] === 'teams' && slug ? data.teams.find(x => x.slug === slug || slugOf(x.name) === slug || x.id === slug) : null;
  const currentTournament = route[0] === 'tournaments' && slug ? data.tournaments.find(x => x.slug === slug || x.id === slug) : null;
  const currentPlayerProfile = route[0] === 'players' && slug ? extra.profiles.find((p:any) => p.username === slug || p.id === slug) : null;
  const currentPlayerStats = route[0] === 'players' && slug ? extra.players.find((x:any) => x.player?.username === slug || x.player_id === slug) : null;
  const currentPlayer = currentPlayerStats || (currentPlayerProfile ? { player_id: currentPlayerProfile.id, player: currentPlayerProfile } : null);
  const currentNews = route[0] === 'news' && slug ? data.announcements.find(x => slugOf(x.title) === slug || x.id === slug) : null;
  const currentCustomPage = route.length === 1 ? customPages.find((page:any) => page.slug === route[0]) : null;

  const sectionTitle = (index: string, kicker: string, first: string, accent: string, copy: string) => (
    <div className="no-section-head">
      <div><span className="no-kicker">{index} / {kicker}</span><h2>{first}<br/><em>{accent}</em></h2></div>
      <p>{copy}</p>
    </div>
  );

  const gameCards = (items = data.games) => (
    <div className="no-game-grid">
      {items.map((game: any, i: number) => {
        const artKey = slugOf(game.slug || game.name);
        const mark = artKey === 'bgmi' ? 'BGMI' : artKey === 'free-fire-max' ? 'FREE FIRE' : artKey === 'pubg-mobile' ? 'PUBG' : String(game.name || 'NOVA').toUpperCase();
        const subMark = artKey === 'free-fire-max' ? 'MAX' : artKey === 'pubg-mobile' ? 'MOBILE' : artKey === 'bgmi' ? 'MOBILE INDIA' : 'COMPETITIVE TITLE';
        return <a className="no-game-card" href={'/games/' + (game.slug || slugOf(game.name))} key={game.id} onClick={e => { e.preventDefault(); navigate('/games/' + (game.slug || slugOf(game.name))); }}>
          <div className={'no-game-art no-game-art-' + artKey}>
            <div className="no-game-art-top"><span>{game.publisher || 'NOVA ARENA'}</span><span>0{i + 1} / 0{items.length}</span></div>
            <div className="no-game-art-rings"><i/><i/><i/></div>
            <div className="no-game-landscape"><i/><i/><i/><b/></div>
            <div className="no-game-brand">
              <span className="no-game-brand-kicker">NOVA ORIGIN / GAME DIVISION</span>
              <strong>{mark}</strong>
              <em>{subMark}</em>
            </div>
            <div className="no-game-art-bottom"><span>OFFICIAL GAME TITLE</span><span>EXPLORE <ArrowUpRight size={13}/></span></div>
          </div>
          <div className="no-card-foot"><div><small>{game.publisher || 'COMPETITIVE TITLE'}</small><h3>{game.name}</h3></div><ArrowUpRight/></div>
        </a>;
      })}
      {!loading && !items.length && <Empty text="Game titles will appear here once they are published."/>}
    </div>
  );

  const teamCards = (items = data.teams) => (
    <div className="no-team-list">
      {items.map((team: any, i: number) => {
        const count = extra.members.filter(m => m.team_id === team.id).length;
        return <a className="no-team-row" key={team.id} href={'/teams/' + (team.slug || slugOf(team.name))} onClick={e => { e.preventDefault(); navigate('/teams/' + (team.slug || slugOf(team.name))); }}>
          <span className="no-row-num">0{i + 1}</span><span className="no-team-logo">{team.logo_url ? <img src={team.logo_url} alt=""/> : (team.team_tag || 'N').slice(0, 3)}</span>
          <span className="no-team-name"><b>{team.name}</b><small>{team.description || 'NOVA ORIGIN COMPETITIVE ROSTER'}</small></span>
          <span className="no-team-meta">{team.game?.name || data.games.find(g => g.id === team.game_id)?.name || 'ESPORTS'}<small>{count ? count + ' PLAYERS' : 'ROSTER'}</small></span>
          <span className="no-team-tag">{team.team_tag || 'NOVA'}</span><ArrowUpRight className="no-row-arrow"/>
        </a>;
      })}
      {!loading && !items.length && <Empty text="The roster is being prepared. Team profiles will appear here soon."/>}
    </div>
  );

  const eventCards = (items = data.tournaments) => (
    <div className="no-event-grid">
      {items.map((event: any) => <article className="no-event-card" key={event.id}>
        <div className="no-event-art" style={safeHref(event.banner_url) ? { backgroundImage: 'linear-gradient(180deg,#080a0988,#080a09dd),url(' + event.banner_url + ')' } : undefined}>
          <span className={'no-event-status ' + (event.status === 'live' ? 'is-live' : '')}><i/> {clean(event.status)}</span><Trophy size={38}/><span className="no-event-format">{clean(event.format || 'TOURNAMENT')}</span>
        </div>
        <div className="no-event-body"><small>{event.game?.name || 'NOVA COMPETITION'}</small><h3>{event.title}</h3><p>{event.summary || 'The next challenge starts here.'}</p><div className="no-event-foot"><span>{dateLabel(event.starts_at)}</span><b>{event.prize_description || (event.team_size ? event.team_size + ' PLAYER FORMAT' : 'DETAILS INSIDE')}</b></div><div className="no-event-meta"><span>{event.max_entries} MAX ENTRIES</span><span>{clean(event.entry_type || 'free')} ENTRY</span><span>{clean(event.game_mode?.name || event.format || 'TOURNAMENT')}</span></div>
          <button onClick={() => navigate('/tournaments/' + (event.slug || event.id))}>VIEW EVENT <ArrowUpRight size={15}/></button>
        </div>
      </article>)}
      {!loading && !items.length && <Empty text="No published tournaments yet. Check back for the next event."/>}
    </div>
  );

  const playerCards = (items = extra.players) => (
    <div className="no-player-grid">
      {extra.profiles.map((profile: any, index: number) => {
        const displayName = profile.display_name || profile.username || 'NOVA PLAYER';
        const legacy = LEGACY_ROSTER.find(player => {
          const expected = player.name.toLowerCase();
          const display = String(profile.display_name || '').trim().toLowerCase();
          const username = String(profile.username || '').trim().toLowerCase();
          return display === expected || username === expected || username.startsWith(expected + '_') || username.startsWith(expected + '-') || display.startsWith(expected + ' ');
        });
        const photo = safeHref(profile.avatar_url);
        const verified = extra.verifiedBadges.some((badge:any) => badge.player_id === profile.id);
        return <article className="no-player-card no-legacy-player-card" key={profile.id || profile.username || index}>
          <div className="no-player-photo no-legacy-player-photo">{photo ? <img src={photo} alt={displayName + ' player portrait'} loading="lazy" referrerPolicy="no-referrer"/> : <strong>{displayName.slice(0,1).toUpperCase()}</strong>}<span>PLAYER {String(index + 1).padStart(2,'0')}</span></div>
          <small>{legacy?.role || 'NOVA PLAYER'}</small><h3>{displayName} {verified && <BadgeCheck className="no-verified-tick" aria-label="NOVA verified player"/>}</h3>
          <div className="no-legacy-player-tag">{legacy?.tag || (profile.username ? '@' + profile.username : 'NOVA ORIGIN')}</div>
        </article>;
      })}
      {items.map((stat: any) => <a className="no-player-card" href={'/players/' + (stat.player?.username || stat.player_id)} key={stat.id} onClick={e => { e.preventDefault(); navigate('/players/' + (stat.player?.username || stat.player_id)); }}>
        <div className="no-player-photo">{stat.player?.avatar_url ? <img src={stat.player.avatar_url} alt=""/> : <Users size={34}/>}<span>VERIFIED</span></div>
        <small>{stat.game?.name || 'NOVA PLAYER'}</small><h3>{stat.player?.display_name || stat.player?.username || 'PLAYER'}</h3>
        <div className="no-player-stats"><span><b>{stat.kd_ratio ?? '—'}</b>K/D</span><span><b>{stat.matches_played ?? '—'}</b>MATCHES</span><span><b>{stat.wins ?? '—'}</b>WINS</span></div>
      </a>)}
    </div>
  );

  const newsCards = () => (
    <div className="no-news-grid">
      {data.announcements.map((item: any) => <a className="no-news-card" href={'/news/' + slugOf(item.title)} key={item.id} onClick={e => { e.preventDefault(); navigate('/news/' + slugOf(item.title)); }}>
        <span className="no-news-label">NOVA TRANSMISSION</span><h3>{item.title}</h3><p>{item.body}</p><div><small>{dateLabel(item.published_at || item.created_at)}</small><b>READ STORY <ArrowUpRight size={14}/></b></div>
      </a>)}
      {!loading && !data.announcements.length && <Empty text="No public announcements yet."/>}
    </div>
  );

  const matchCards = () => (
    <div className="no-match-list">
      {extra.matches.map((match: any) => {
        const sides = [...new Set(extra.results.filter((r: any) => r.match_id === match.id).map((r: any) => r.team?.name || r.player?.display_name || r.player?.username).filter(Boolean))];
        return <article className="no-match-card" key={match.id}>
          <div><small>{match.tournament?.title || 'NOVA MATCH CENTER'}</small><h3>{match.round_name || match.stage || 'MATCH ' + match.match_number}</h3><span>{dateLabel(match.scheduled_at)}</span></div>
          <div className="no-match-versus">{sides.length ? sides.slice(0,2).map((side: string, i: number) => <span className="no-match-side" key={side}>{i > 0 && <i>VS</i>}<b>{side}</b></span>) : <b className="no-match-pending">TEAMS TO BE ANNOUNCED</b>}</div>
          <span className={'no-match-status ' + (match.status === 'live' ? 'is-live' : '')}>{clean(match.status)}</span>
        </article>;
      })}
      {!extraLoading && !extra.matches.length && <Empty text="Match schedules will appear here when published."/>}
    </div>
  );

  const sponsors = () => <div className="no-sponsor-grid">{extra.sponsors.map(s => <a key={s.id} href={safeHref(s.website_url) || '#partners'} target={safeHref(s.website_url) ? '_blank' : undefined} rel="noreferrer">{s.logo_url ? <img src={s.logo_url} alt={s.name}/> : <b>{s.name}</b>}</a>)}{!extraLoading && !extra.sponsors.length && <p className="no-muted">Partner announcements coming soon.</p>}</div>;

  const contentPage = () => {
    if (currentGame) {
      const gameTeams = data.teams.filter((t:any) => t.game_id === currentGame.id);
      const gameEvents = data.tournaments.filter((t:any) => t.game_id === currentGame.id);
      const gamePlayers = extra.players.filter((p:any) => p.game_id === currentGame.id);
      const gameMatches = extra.matches.filter((m:any) => m.tournament?.game?.name === currentGame.name);
      return <><DetailShell kicker="GAME PROFILE / COMPETITIVE DIVISION" title={currentGame.name} copy={currentGame.publisher || 'A NOVA ORIGIN competitive title.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem"><Gamepad2 size={70}/></div><div><span className="no-kicker">THE ARENA / {currentGame.slug || slugOf(currentGame.name)}</span><p>Competitive action. Shared purpose. Explore published NOVA teams, verified player records and events for {currentGame.name}.</p><p className="no-muted">{gameTeams.length} public teams · {gamePlayers.length} verified player records · {gameEvents.length} published events</p><button className="no-btn" onClick={() => navigate('/teams')}>VIEW TEAMS <ArrowUpRight size={16}/></button></div></div>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">DIVISION / ACTIVE ROSTERS</span><h2>TEAMS IN<br/><em>THIS ARENA.</em></h2></div><p>Public team profiles for this game.</p></div>{teamCards(gameTeams)}</section>
      <section className="no-band"><div className="no-section"><div className="no-section-head"><div><span className="no-kicker">VERIFIED COMPETITORS</span><h2>PLAYERS<br/><em>ON RECORD.</em></h2></div><p>Player records filtered to this game.</p></div>{playerCards(gamePlayers.slice(0,8))}</div></section>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">THE CIRCUIT</span><h2>TOURNAMENTS<br/><em>& EVENTS.</em></h2></div><p>Published competitions for this game.</p></div>{eventCards(gameEvents)}</section>
      <section className="no-band"><div className="no-section"><div className="no-section-head"><div><span className="no-kicker">MATCH CENTER</span><h2>FIXTURES<br/><em>& RESULTS.</em></h2></div><p>Published schedules connected to this game's tournaments.</p></div><div className="no-match-list">{gameMatches.map((m:any)=><article className="no-match-card" key={m.id}><div><small>{m.tournament?.title || currentGame.name}</small><h3>{m.round_name || m.stage || 'MATCH '+m.match_number}</h3><span>{dateLabel(m.scheduled_at)}</span></div><span className={'no-match-status '+(m.status==='live'?'is-live':'')}>{clean(m.status)}</span></article>)}{!extraLoading&&!gameMatches.length&&<Empty text="No published fixtures are available for this game yet."/>}</div></div></section></>;
    }
    if (currentTeam) {
      const teamResults = extra.results.filter((r:any) => r.team_id === currentTeam.id && r.verified_at);
      const roster = extra.members.filter((m:any) => m.team_id === currentTeam.id).map((m:any) => ({ ...m, profile: extra.profiles.find((p:any) => p.id === m.user_id) })).filter((m:any) => m.profile);
      return <><DetailShell kicker="TEAM PROFILE" title={currentTeam.name} copy={currentTeam.description || 'One roster. One standard. Built to rise.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem">{currentTeam.logo_url ? <img src={currentTeam.logo_url} alt=""/> : <Shield size={70}/>}</div><div><span className="no-kicker">{currentTeam.team_tag || 'NOVA'} / {data.games.find(g => g.id === currentTeam.game_id)?.name || 'ESPORTS'}</span><p>Follow this roster's published appearances and verified competitive results.</p><p className="no-muted">{roster.length} public roster members · {teamResults.length} verified result records</p></div></div>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">TEAM / ROSTER</span><h2>THE PEOPLE<br/><em>BEHIND THE TAG.</em></h2></div><p>Public roster members only.</p></div><div className="no-player-grid">{roster.map((m:any,i:number)=><article className="no-player-card" key={m.id}><div className="no-player-photo">{m.profile.avatar_url ? <img src={m.profile.avatar_url} alt=""/> : <Users size={34}/>}<span>0{i+1}</span></div><small>{clean(m.team_role)}</small><h3>{m.profile.display_name || m.profile.username}</h3>{m.profile.username && <a className="no-section-link" href={'/players/'+m.profile.username} onClick={e=>{e.preventDefault();navigate('/players/'+m.profile.username);}}>PLAYER PROFILE <ArrowUpRight size={14}/></a>}</article>)}{!extraLoading && !roster.length && <Empty text="No public roster members are listed yet."/>}</div></section>
      <section className="no-band"><div className="no-section"><div className="no-section-head"><div><span className="no-kicker">VERIFIED COMPETITIVE HISTORY</span><h2>RESULTS<br/><em>THAT COUNT.</em></h2></div><p>Only result records verified by NOVA Origin.</p></div><div className="no-result-grid">{teamResults.map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={20}/><span>{r.match?.round_name || 'MATCH RESULT'}</span><b>{r.placement?'PLACE #'+r.placement:(r.points??'—')+' PTS'}</b><small>{r.eliminations??0} ELIMINATIONS · VERIFIED</small></article>)}{!extraLoading&&!teamResults.length&&<Empty text="No verified team results have been published yet."/>}</div></div></section></>;
    }
    if (currentTournament) {
      const eventMatches = extra.matches.filter((m:any) => m.tournament_id === currentTournament.id);
      const eventResults = extra.results.filter((r:any) => r.match?.tournament_id === currentTournament.id && r.verified_at);
      return <DetailShell kicker="TOURNAMENT / EVENT" title={currentTournament.title} copy={currentTournament.description || currentTournament.summary || 'The next battle begins.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem">{safeHref(currentTournament.banner_url) ? <img src={currentTournament.banner_url} alt="" /> : <Trophy size={70}/>}</div><div><span className="no-kicker">{clean(currentTournament.status)} / {currentTournament.game?.name || 'NOVA EVENT'}</span><p>{currentTournament.prize_description || 'Event details and schedule will be published here.'}</p><div className="no-tournament-facts"><span><small>GAME MODE</small><b>{currentTournament.game_mode?.name || clean(currentTournament.format || 'TOURNAMENT')}</b></span><span><small>TEAM SIZE</small><b>{currentTournament.team_size || '—'} PLAYERS</b></span><span><small>MAX ENTRIES</small><b>{currentTournament.max_entries || '—'}</b></span><span><small>ENTRY</small><b>{clean(currentTournament.entry_type || 'free')}</b></span><span><small>EVENT START</small><b>{dateLabel(currentTournament.starts_at)}</b></span><span><small>EVENT END</small><b>{dateLabel(currentTournament.ends_at)}</b></span><span><small>REGISTRATION OPENS</small><b>{dateLabel(currentTournament.registration_opens_at)}</b></span><span><small>REGISTRATION CLOSES</small><b>{dateLabel(currentTournament.registration_closes_at)}</b></span></div><p className="no-muted">Registration status: {currentTournament.status === 'registration_open' ? 'Open according to the published event status' : currentTournament.status === 'registration_closed' ? 'Closed' : 'Not currently open'}</p><button className="no-btn" onClick={()=>navigate('/contact?message='+encodeURIComponent('I would like to enquire about tournament: '+currentTournament.title+'. Please share the event and registration details.'))}>EVENT ENQUIRY <ArrowUpRight size={16}/></button></div></div>
        <div className="no-detail-section"><span className="no-kicker">EVENT SCHEDULE / {eventMatches.length.toString().padStart(2,'0')} MATCHES</span><div className="no-match-list">{eventMatches.map((m:any)=><article className="no-match-card" key={m.id}><div><small>{currentTournament.title}</small><h3>{m.round_name || m.stage || 'MATCH '+m.match_number}</h3><span>{dateLabel(m.scheduled_at)}</span></div><span className={'no-match-status '+(m.status==='live'?'is-live':'')}>{clean(m.status)}</span></article>)}{!eventMatches.length && <Empty text="The tournament schedule has not been published yet."/>}</div></div>
        <div className="no-detail-section"><span className="no-kicker">VERIFIED RESULTS / {eventResults.length.toString().padStart(2,'0')}</span><div className="no-result-grid">{eventResults.map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={20}/><span>{r.team?.name || r.player?.display_name || r.player?.username || 'COMPETITOR'}</span><b>{r.placement ? 'PLACE #'+r.placement : (r.points ?? '—')+' PTS'}</b><small>{r.eliminations ?? 0} ELIMINATIONS · VERIFIED</small></article>)}{!eventResults.length && <Empty text="Verified results will appear here when matches are completed and reviewed."/>}</div></div>
      </DetailShell>;
    }
    if (route[0] === 'account') {
      if (!authUser) return <><PageHero kicker="NOVA ID / MEMBER ACCESS" title="SIGN IN TO" accent="YOUR PROFILE." copy="Sign in using the account button in the header to manage your NOVA player profile."/><section className="no-section"><button className="no-btn" onClick={()=>setAuthOpen(true)}>SIGN IN / CREATE ACCOUNT <ArrowUpRight size={15}/></button></section></>;
      const verified=badgeApproved;
      const profileStats=extra.players.filter((p:any)=>p.player_id===authUser.id);
      const socials = [
        {key:'instagram',label:'Instagram',icon:<Instagram size={18}/>},
        {key:'youtube',label:'YouTube',icon:<Youtube size={18}/>},
        {key:'twitch',label:'Twitch',icon:<Twitch size={18}/>},
        {key:'discord',label:'Discord',icon:<Disc3 size={18}/>},
        {key:'x',label:'X',icon:<span className="no-social-x">𝕏</span>},
        {key:'website',label:'Website',icon:<Link2 size={18}/>}
      ];
      return <><section className="no-social-profile">
        <div className="no-social-cover"><span>NOVA ORIGIN / PLAYER ID</span><b>NO</b><div className="no-cover-glow"/></div>
        <div className="no-social-head">
          <button className="no-social-avatar no-avatar-button" onClick={()=>document.getElementById('nova-avatar-file')?.click()} aria-label="Change profile photo">
            {profileDraft.avatar_url ? <img src={profileDraft.avatar_url} alt="Profile"/> : <Users size={48}/>}<span className="no-avatar-camera"><Camera size={16}/></span>
          </button>
          <input id="nova-avatar-file" className="no-visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>chooseAvatar(e.target.files?.[0])}/>
          <button className="no-social-edit no-pencil-edit" onClick={()=>{setEditOpen(true);setProfileError('');setProfileMessage('');}} aria-label="Edit profile"><Pencil size={18}/></button>
          <div className="no-social-name"><h1>{profileDraft.display_name||'NOVA PLAYER'} {verified&&<span className="no-social-verified" title="NOVA verified">✓</span>}</h1><p>@{myProfile?.username||'your_username'}</p></div>
          <p className="no-social-bio">{profileDraft.bio||'Player. Competitor. Part of the NOVA Origin community.'}</p>
          <div className="no-social-stats"><span><b>{profileStats.length}</b> VERIFIED RECORDS</span><span><b>{verified?'VERIFIED':'PLAYER'}</b> STATUS</span><span><b>ORIGIN</b> MEMBER</span></div>
          <div className="no-profile-socials">{socials.filter(item=>safeHref((myProfile?.social_links||{})[item.key])).map(item=><a key={item.key} href={safeHref((myProfile?.social_links||{})[item.key])} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>{item.icon}</a>)}</div>
          <nav className="no-social-tabs"><button className={activeProfileTab==='posts'?'active':''} onClick={()=>setActiveProfileTab('posts')}>PROFILE</button><button className={activeProfileTab==='verification'?'active':''} onClick={()=>setActiveProfileTab('verification')}>VERIFICATION</button><button onClick={()=>navigate('/players')}>DISCOVER PLAYERS</button></nav>
        </div>
        {activeProfileTab==='posts' ? <div className="no-social-content">
          <section className="no-player-team-hub">
            <div className="no-section-head"><div><span className="no-kicker">TEAM COMMAND / PLAYER OWNED</span><h2>BUILD YOUR<br/><em>OWN SQUAD.</em></h2></div><span className="no-team-count">{myTeams.length} CREATED</span></div>
            {myTeams.length>0 && <div className="no-team-list">{myTeams.map(team=><article className="no-team-row no-owned-team" key={team.id}><span className="no-team-logo">{team.logo_url?<img src={team.logo_url} alt=""/>:(team.team_tag||'NO').slice(0,3)}</span><span className="no-team-name"><b>{team.name}</b><small>{data.games.find((g:any)=>g.id===team.game_id)?.name||'GAME'} · {team.status==='active'?'CAPTAIN':'APPLICATION'}</small></span><span className="no-team-tag">{team.team_tag}</span><span className="no-team-status">{team.status==='pending_review'?'PENDING REVIEW':team.status.toUpperCase()}</span></article>)}</div>}
            {!myTeams.length && <p className="no-muted">You haven't submitted a team application yet. Apply to create your squad.</p>}
            {badgeApproved ? <form className="no-team-create-form" onSubmit={createPlayerTeam}>
              <label>TEAM NAME<input value={teamDraft.name} onChange={e=>setTeamDraft(v=>({...v,name:e.target.value}))} minLength={2} maxLength={48} required placeholder="e.g. NOVA RAVENS"/></label>
              <label>TEAM TAG<input value={teamDraft.team_tag} onChange={e=>setTeamDraft(v=>({...v,team_tag:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12)}))} minLength={2} maxLength={12} required placeholder="RAVN"/></label>
              <label>GAME<select value={teamDraft.game_id} onChange={e=>setTeamDraft(v=>({...v,game_id:e.target.value}))} required><option value="">SELECT GAME</option>{data.games.filter((g:any)=>g.is_active!==false).map((g:any)=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
              <label>TEAM DESCRIPTION<textarea value={teamDraft.description} onChange={e=>setTeamDraft(v=>({...v,description:e.target.value}))} maxLength={500} rows={3} placeholder="Tell players what your squad is about."/></label>
              <label>TEAM ICON / LOGO<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>chooseTeamLogo(e.target.files?.[0])} disabled={teamLogoBusy}/><small>{teamLogoBusy?'UPLOADING ICON…':teamDraft.logo_url?'ICON READY ✓':'JPG / PNG / WEBP · MAX 3 MB'}</small><input type="url" value={teamDraft.logo_url.startsWith('https://')?teamDraft.logo_url:''} onChange={e=>setTeamDraft(v=>({...v,logo_url:e.target.value}))} placeholder="Or paste an image URL"/></label>
              <label className="no-team-visibility"><input type="checkbox" checked={teamDraft.is_public} onChange={e=>setTeamDraft(v=>({...v,is_public:e.target.checked}))}/> SHOW TEAM IN PUBLIC DIRECTORY</label>
              {teamError&&<p className="no-auth-error" role="alert">{teamError}</p>}{teamMessage&&<p className="no-auth-notice" role="status">{teamMessage}</p>}
              <button className="no-btn" type="submit" disabled={teamBusy||teamLogoBusy||!data.games.some((g:any)=>g.is_active!==false)}>{teamBusy?'CREATING TEAM…':'SUBMIT TEAM APPLICATION'} <ArrowUpRight size={15}/></button>
            </form> : <div className="no-team-locked"><span className="no-kicker">VERIFIED PLAYERS ONLY</span><h3>TEAM CREATION IS A VERIFIED PRIVILEGE.</h3><p>Only players with an active NOVA Verified Badge can submit a team application. Get your player profile verified first.</p><button className="no-btn" type="button" onClick={()=>setActiveProfileTab('verification')}>REQUEST VERIFIED BADGE <ArrowUpRight size={15}/></button></div>}
          </section>
          <div className="no-profile-preview-card"><span className="no-kicker">PLAYER ID / PUBLIC PROFILE</span><div className="no-profile-preview-row"><div><b>{profileDraft.display_name||'NOVA PLAYER'}</b><small>@{myProfile?.username||'your_username'}</small></div>{verified&&<span className="no-social-verified">✓</span>}</div><p>{profileDraft.bio||'Your player bio will appear here.'}</p><div className="no-profile-preview-footer"><span>COMPETITIVE IDENTITY</span><button onClick={()=>setEditOpen(true)}>EDIT IDENTITY <Pencil size={13}/></button></div></div>
          <div className="no-social-card no-verification-teaser"><span className="no-kicker">NOVA VERIFIED / TRUSTED PLAYER</span><p>{verified?'Your profile carries the official NOVA verified mark.':'Want the NOVA verified mark? Submit your competitive identity for manager review.'}</p><button className="no-btn ghost" onClick={()=>setActiveProfileTab('verification')}>{verified?'VIEW VERIFICATION':'REQUEST VERIFICATION'} <ArrowUpRight size={15}/></button></div>
        </div> : <div className="no-social-content">
          <div className="no-detail-section no-social-card" id="nova-badge-request"><span className="no-kicker">NOVA VERIFIED BADGE</span>
          {verified ? <p className="no-muted">Your player profile is officially verified by NOVA.</p> : badgeRequest?.status==='pending' ? <p className="no-muted">Your verification request is waiting for manager review.</p> : badgeRequest?.status==='rejected' ? <p className="no-muted">Your last request was not approved. {badgeRequest.manager_note||'You can submit an updated request with new evidence.'}</p> : <p className="no-muted">Request a verified tick. NOVA managers will review your in-game identity and evidence before approval.</p>}
          {!verified && badgeRequest?.status!=='pending' && <form className="no-auth-form" onSubmit={submitBadgeRequest}>
            <label>GAME<select value={badgeDraft.game_id} onChange={e=>setBadgeDraft(v=>({...v,game_id:e.target.value}))} required><option value="">SELECT GAME</option>{data.games.map((g:any)=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
            <label>IN-GAME NAME<input value={badgeDraft.in_game_name} onChange={e=>setBadgeDraft(v=>({...v,in_game_name:e.target.value}))} maxLength={80} required placeholder="Your exact in-game name"/></label>
            <label>PROOF / EVIDENCE LINK<input type="url" value={badgeDraft.evidence_url} onChange={e=>setBadgeDraft(v=>({...v,evidence_url:e.target.value}))} required placeholder="https://..."/></label>
            <label>NOTE (OPTIONAL)<textarea value={badgeDraft.note} onChange={e=>setBadgeDraft(v=>({...v,note:e.target.value}))} maxLength={500} rows={2} placeholder="Anything the manager should know"/></label>
            {badgeError&&<p className="no-auth-error" role="alert">{badgeError}</p>}{badgeMessage&&<p className="no-auth-notice" role="status">{badgeMessage}</p>}
            <button className="no-btn" type="submit" disabled={badgeBusy||!data.games.length}>{badgeBusy?'SENDING…':'REQUEST VERIFIED BADGE'} <ArrowUpRight size={15}/></button>
          </form>}
          <button className="no-btn ghost" onClick={()=>navigate('/players')}>VIEW PLAYER DIRECTORY <ArrowUpRight size={15}/></button>
        </div></div>}
      </section>
      {editOpen&&<div className="no-profile-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setEditOpen(false);}}><section className="no-profile-modal" role="dialog" aria-modal="true" aria-labelledby="nova-edit-title"><button className="no-profile-modal-close" onClick={()=>setEditOpen(false)} aria-label="Close editor"><X/></button><span className="no-kicker">NOVA ID / PERSONALISE</span><h2 id="nova-edit-title">EDIT YOUR<br/><em>IDENTITY.</em></h2><form className="no-auth-form" onSubmit={async e=>{const saved=await saveMyProfile(e);if(saved)setEditOpen(false);}}>
        <label>USERNAME<input value={profileDraft.username} onChange={e=>setProfileDraft(v=>({...v,username:e.target.value}))} minLength={3} maxLength={24} placeholder="your_gamer_tag"/></label>
        <label>DISPLAY NAME<input value={profileDraft.display_name} onChange={e=>setProfileDraft(v=>({...v,display_name:e.target.value}))} maxLength={60} required/></label>
        <label>BIO<textarea value={profileDraft.bio} onChange={e=>setProfileDraft(v=>({...v,bio:e.target.value}))} maxLength={240} rows={3} placeholder="Tell the community about your game and role."/></label>
        <div className="no-social-edit-fields"><span className="no-kicker">YOUR SOCIAL LINKS</span>{socials.map(item=><label key={item.key}>{item.label.toUpperCase()} URL<input type="url" value={socialDraft[item.key]||''} onChange={e=>setSocialDraft(v=>({...v,[item.key]:e.target.value}))} placeholder="https://..."/></label>)}</div>
        {profileError&&<p className="no-auth-error" role="alert">{profileError}</p>}{profileMessage&&<p className="no-auth-notice" role="status">{profileMessage}</p>}
        <button className="no-btn" type="submit" disabled={profileBusy}>{profileBusy?'SAVING…':'SAVE PROFILE'} <ArrowUpRight size={15}/></button></form></section></div>}
      {cropSource&&<div className="no-profile-modal-backdrop" role="presentation"><section className="no-crop-modal" role="dialog" aria-modal="true" aria-labelledby="nova-crop-title"><button className="no-profile-modal-close" onClick={()=>setCropSource('')} aria-label="Cancel crop"><X/></button><span className="no-kicker">PLAYER PHOTO / CROP</span><h2 id="nova-crop-title">MAKE IT<br/><em>YOUR ICON.</em></h2><div className="no-crop-stage"><img src={cropSource} style={{transform:'scale('+cropZoom+')'}} alt="Crop preview"/></div><label className="no-crop-zoom">ZOOM <input type="range" min="1" max="3" step=".05" value={cropZoom} onChange={e=>setCropZoom(Number(e.target.value))}/></label><p>Drag is not required — adjust zoom and the centred square crop will be used.</p><button className="no-btn" onClick={saveCroppedAvatar} disabled={profileBusy}>{profileBusy?'UPLOADING…':'USE THIS PHOTO'} <ArrowUpRight size={15}/></button></section></div>}
      </>;

    }
    if (route[0] === 'players' && !slug) {
      return <>
        <PageHero kicker="NOVA ROSTER / PLAYER DIRECTORY" title="MEET THE" accent="PLAYERS." copy="Public NOVA Origin member profiles. Competitive statistics appear only when verified." />
        <section className="no-section">
          <div className="no-player-grid">
            {extra.profiles.map((profile:any) => {
              const stats = extra.players.filter((item:any) => item.player_id === profile.id);
              return <a className="no-player-card" key={profile.id} href={'/players/' + (profile.username || profile.id)} onClick={e => { e.preventDefault(); navigate('/players/' + (profile.username || profile.id)); }}>
                <div className="no-player-photo">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <Users size={34}/>}<span> NOVA MEMBER </span></div>
                <small>PLAYER PROFILE</small><h3>{profile.display_name || profile.username || 'NOVA PLAYER'}</h3>
                {profile.bio && <p>{profile.bio}</p>}
                {stats.length > 0 && <div className="no-player-stats"><span><b>{stats.length}</b>VERIFIED RECORDS</span></div>}
              </a>;
            })}
            {!extraLoading && !extra.profiles.length && <Empty text="No public player profiles are available yet."/>}
          </div>
        </section>
      </>;
    }
    if (currentPlayer) {
      const playerId = currentPlayer.player_id;
      const playerStats = extra.players.filter((p:any) => p.player_id === playerId);
      const playerTeams = extra.members.filter((m:any) => m.user_id === playerId).map((m:any) => ({...m, team:data.teams.find((t:any)=>t.id===m.team_id)})).filter((m:any)=>m.team);
      const playerResults = extra.results.filter((r:any) => r.player_id === playerId && r.verified_at);
      const profile = currentPlayer.player || {};
      return <><DetailShell kicker="PLAYER PROFILE / VERIFIED COMPETITOR" title={profile.display_name || profile.username || 'NOVA PLAYER'} copy={profile.bio || 'A competitor in the NOVA Origin ecosystem. Verified statistics are shown only where official records are available.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : <Users size={70}/>}</div><div><span className="no-kicker">@{profile.username || 'NOVA PLAYER'} / PUBLIC PROFILE</span>{extra.verifiedBadges.some((badge:any)=>badge.player_id===playerId)&&<span className="no-verified-pill"><BadgeCheck size={15}/> NOVA VERIFIED PLAYER</span>}<p>{profile.bio || 'Player biography has not been published.'}</p><p className="no-muted">{playerTeams.length} public team memberships · {playerStats.length} verified game stat records</p><div className="no-profile-socials">{[{key:'instagram',icon:<Instagram/>},{key:'youtube',icon:<Youtube/>},{key:'twitch',icon:<Twitch/>},{key:'discord',icon:<Disc3/>},{key:'x',icon:<span className="no-social-x">𝕏</span>},{key:'website',icon:<Link2/>}].filter(item=>safeHref(profile.social_links?.[item.key])).map(item=><a key={item.key} href={safeHref(profile.social_links[item.key])} target="_blank" rel="noreferrer">{item.icon}</a>)}</div></div></div>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">COMPETITIVE RECORD</span><h2>VERIFIED<br/><em>STATISTICS.</em></h2></div><p>Only verified records from NOVA Origin data are displayed.</p></div>
        <div className="no-player-grid">{playerStats.map((stat:any)=><article className="no-player-card" key={stat.id}><small>{stat.game?.name || 'COMPETITIVE GAME'}</small><div className="no-player-stats"><span><b>{stat.kd_ratio ?? '—'}</b>K/D</span><span><b>{stat.matches_played ?? '—'}</b>MATCHES</span><span><b>{stat.wins ?? '—'}</b>WINS</span></div><p className="no-muted">{stat.eliminations ?? '—'} verified eliminations · {stat.average_damage ?? '—'} average damage</p></article>)}{!playerStats.length && <Empty text="No verified game statistics have been published for this player yet."/>}</div>
      </section>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">TEAM AFFILIATION</span><h2>THE SQUAD<br/><em>CONNECTION.</em></h2></div><p>Public teams this player is listed with.</p></div><div className="no-team-list">{playerTeams.map((m:any)=><a className="no-team-row" key={m.id} href={'/teams/'+(m.team.slug||slugOf(m.team.name))} onClick={e=>{e.preventDefault();navigate('/teams/'+(m.team.slug||slugOf(m.team.name)));}}><span className="no-row-num">↗</span><span className="no-team-logo">{m.team.logo_url?<img src={m.team.logo_url} alt=""/>:(m.team.team_tag||'N').slice(0,3)}</span><span className="no-team-name"><b>{m.team.name}</b><small>{clean(m.team_role)}</small></span><span className="no-team-tag">{m.team.team_tag||'NOVA'}</span><ArrowUpRight className="no-row-arrow"/></a>)}{!playerTeams.length&&<Empty text="No public team affiliation is listed for this player."/>}</div></section>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">COMPETITION HISTORY</span><h2>RESULTS<br/><em>ON RECORD.</em></h2></div><p>Verified player result entries.</p></div><div className="no-result-grid">{playerResults.map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={20}/><span>{r.match?.round_name || 'MATCH RESULT'}</span><b>{r.placement?'PLACE #'+r.placement:(r.points??'—')+' PTS'}</b><small>{r.eliminations??0} ELIMINATIONS · VERIFIED</small></article>)}{!playerResults.length&&<Empty text="No verified match results are listed for this player yet."/>}</div></section></>;
    }
    if (currentNews) {
      const relatedNews = data.announcements.filter((item:any) => item.id !== currentNews.id).slice(0,3);
      const published = currentNews.published_at || currentNews.created_at;
      return <><DetailShell kicker="NOVA TRANSMISSION / OFFICIAL UPDATE" title={currentNews.title} copy="An official update from the NOVA Origin ecosystem.">
        <article className="no-article">
          <div className="no-article-meta"><span><i/> OFFICIAL NOVA UPDATE</span><time>{dateLabel(published)}</time></div>
          <div className="no-article-body">{(currentNews.body || '').split(/\\n{2,}/).map((paragraph:string,i:number)=><p key={i}>{paragraph}</p>)}</div>
          <div className="no-article-end"><span>END OF TRANSMISSION</span><button className="no-btn ghost" onClick={()=>navigate('/news')}>BACK TO ALL NEWS <ArrowUpRight size={15}/></button></div>
        </article>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">MORE TRANSMISSIONS</span><h2>STAY IN<br/><em>THE LOOP.</em></h2></div><p>More official updates from NOVA Origin.</p></div><div className="no-news-grid">{relatedNews.map((item:any)=><a className="no-news-card" href={'/news/'+slugOf(item.title)} key={item.id} onClick={e=>{e.preventDefault();navigate('/news/'+slugOf(item.title));}}><span className="no-news-label">NOVA TRANSMISSION</span><h3>{item.title}</h3><p>{item.body}</p><div><small>{dateLabel(item.published_at||item.created_at)}</small><b>READ STORY <ArrowUpRight size={14}/></b></div></a>)}{!relatedNews.length&&<Empty text="More official updates will appear here when published."/>}</div></section></>;
    }
    if (currentCustomPage) {
      return <><PageHero kicker="NOVA ORIGIN / CUSTOM PAGE" title={currentCustomPage.title} accent="NOVA ORIGIN." copy={currentCustomPage.excerpt || 'Explore this official NOVA Origin page.'}/><section className="no-section"><article className="no-article"><div className="no-article-body">{(currentCustomPage.content_markdown || '').split(/\\n{2,}/).map((block:string,i:number)=>{const value=block.trim();if(!value)return null;if(value.startsWith('### '))return <h3 key={i}>{value.slice(4)}</h3>;if(value.startsWith('## '))return <h2 key={i}>{value.slice(3)}</h2>;if(value.startsWith('# '))return <h2 key={i}>{value.slice(2)}</h2>;if(value.split('\\n').every((line:string)=>/^[-*]\\s+/.test(line)))return <ul key={i}>{value.split('\\n').map((line:string,j:number)=><li key={j}>{line.replace(/^[-*]\\s+/,'')}</li>)}</ul>;return <p key={i}>{value.split('\\n').map((line:string,j:number)=><span key={j}>{j>0&&<br/>}{line}</span>)}</p>;})}</div></article></section></>;
    }
    const pages: Record<string, { kicker: string; title: string; accent: string; copy: string }> = {
      about: { kicker: 'THE NOVA STORY', title: 'MORE THAN', accent: 'A MOVEMENT.', copy: 'We are a collective of players, creators and competitors building a culture around commitment, community and competition.' },
      games: { kicker: 'OUR ARENA', title: 'THE GAMES', accent: 'WE PLAY.', copy: 'Different battlegrounds. One standard: excellence.' },
      teams: { kicker: 'THE COLLECTIVE', title: 'BUILT AS ONE.', accent: 'PLAY AS MANY.', copy: 'Every role matters. Every player moves the team forward.' },
      players: { kicker: 'THE ROSTER', title: 'MEET THE', accent: 'PLAYERS.', copy: 'The NOVA Origin team roster, alongside verified competitive statistics.' },
      tournaments: { kicker: 'THE CIRCUIT', title: 'THE NEXT', accent: 'BATTLE BEGINS.', copy: 'Discover upcoming and live competitions from the NOVA ecosystem.' },
      matches: { kicker: 'LIVE COMPETITION', title: 'MATCH', accent: 'CENTER.', copy: 'Schedules and confirmed match status from the competition database.' },
      news: { kicker: 'TRANSMISSIONS', title: 'LATEST', accent: 'INTELLIGENCE.', copy: 'Official announcements and updates from across NOVA Origin.' },
      community: { kicker: 'THE COLLECTIVE', title: 'FIND YOUR', accent: 'PLACE HERE.', copy: 'Join the conversation and follow NOVA Origin across our community channels.' },
      contact: { kicker: 'MAKE CONTACT', title: 'LET’S BUILD', accent: 'WHAT’S NEXT.', copy: 'For team enquiries, partnerships, media and general questions.' },
      join: { kicker: 'YOUR NEXT CHAPTER', title: 'RISE WITH', accent: 'NOVA ORIGIN.', copy: 'Tell us how you would like to be part of the NOVA Origin community.' }
    };
    const page = pages[route[0] || ''] || pages.about;
    return <><PageHero {...page}/>{route[0] === 'games' && gameCards()}{route[0] === 'teams' && teamCards()}{route[0] === 'players' && playerCards()}{route[0] === 'tournaments' && eventCards()}{route[0] === 'matches' && matchCards()}{route[0] === 'news' && newsCards()}{route[0] === 'about' && <AboutStory/>}{route[0] === 'community' && <CommunityBlock posts={data.posts} navigate={navigate} />}{route[0] === 'contact' && <ContactBlock/>}{route[0] === 'join' && <ContactBlock join/>}</>;
  };

  const home = () => <>
    <section className="no-hero">
      <div className="no-hero-grid"/><div className="no-hero-glow"/><div className="no-hero-geometry"><span/><span/><span/><b>N</b></div>
      <div className="no-hero-content"><span className="no-kicker"><i/> THE NEXT WAVE OF COMPETITION</span><div className="no-hero-badge"><Sparkles size={12}/> INDEPENDENT ESPORTS COLLECTIVE / INDIA</div>
        <h1>BUILT TO<br/><em>RISE.</em> READY<br/>TO <span>DOMINATE.</span></h1>
        <p>More than a team. A collective of players, creators and competitors building something that lasts.</p>
        <div className="no-hero-actions"><button className="no-btn" onClick={() => navigate('/teams')}>MEET THE ROSTER <ArrowUpRight size={16}/></button><button className="no-btn ghost" onClick={() => navigate('/tournaments')}>EXPLORE EVENTS <ArrowRight size={16}/></button></div>
        <div className="no-hero-meta"><span><i/> COMMUNITY ONLINE</span><span>INDIA / GLOBAL</span><span>EST. 2024</span></div>
      </div>
      <div className="no-hero-index"><span>NO / 001</span><b>26°50' N<br/>80°56' E</b><small>SCROLL TO EXPLORE ↓</small></div>
    </section>
    <section className="no-stats">{[{value:activeTeams,label:'PUBLIC TEAMS'},{value:liveEvents,label:'LIVE EVENTS'},{value:gamesCount,label:'GAME TITLES'},{value:matchCount,label:'SCHEDULED MATCHES'}].filter(item=>item.value>0).map(item=><div key={item.label}><b>{item.value.toString().padStart(2,'0')}</b><span>{item.label}</span></div>)}</section>
    {homepageSections.map((section:any) => <section className="no-section" key={section.id}>
      <div className="no-section-head"><div><span className="no-kicker">{clean(section.section_key).toUpperCase()} / NOVA ORIGIN</span><h2>{section.title}</h2></div><p>{section.subtitle}</p></div>
      {section.image_url && safeHref(section.image_url) && <div className="no-detail-emblem"><img src={section.image_url} alt={section.title}/></div>}
      {section.body && <article className="no-article"><div className="no-article-body">{section.body.split(/\\n{2,}/).map((paragraph:string,i:number)=><p key={i}>{paragraph}</p>)}</div></article>}
      {section.button_label && section.button_url && <div className="no-section-link">{link(section.button_url,section.button_label)}<ArrowUpRight size={15}/></div>}
    </section>)}
    <section className="no-section">{sectionTitle('01','OUR ARENA','THE GAMES','WE PLAY.','Different battlegrounds. One standard: excellence.')}{gameCards(data.games.slice(0,3))}<div className="no-section-link">{link('/games','EXPLORE ALL GAMES')}<ArrowUpRight size={15}/></div></section>
    <section className="no-band"><div className="no-section">{sectionTitle('02','THE CIRCUIT','THE NEXT','BATTLE BEGINS.','Follow the action, find your next challenge and stay in the loop.')}{eventCards(data.tournaments.slice(0,3))}<div className="no-section-link">{link('/tournaments','ALL TOURNAMENTS')}<ArrowUpRight size={15}/></div></div></section>
    <section className="no-section">{sectionTitle('03','MATCH CENTER','THE GAME','IS ON.','Schedules and confirmed status. No invented live scores.')}{matchCards()}</section>
    <section className="no-band"><div className="no-section">{sectionTitle('04','THE COLLECTIVE','BUILT AS ONE.','PLAY AS MANY.','Every role matters. Every player moves the team forward.')}{teamCards(data.teams.slice(0,5))}<div className="no-section-link">{link('/teams','VIEW THE FULL ROSTER')}<ArrowUpRight size={15}/></div></div></section>
    <section className="no-band"><div className="no-section">{sectionTitle('05','THE ROSTER','MEET THE','PLAYERS.','The NOVA Origin squad. Verified competitive records appear separately when available.')}{playerCards(extra.players.slice(0,4))}</div></section>
    <section className="no-band"><div className="no-section">{sectionTitle('06','VERIFIED RESULTS','THE TROPHY','ROOM.','Milestones from verified match records only.')}
      <div className="no-result-grid">{extra.results.filter((r:any)=>r.verified_at).slice(0,6).map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={22}/><span>{r.team?.name || r.player?.display_name || r.player?.username || 'COMPETITOR'}</span><b>{r.placement ? 'PLACE #' + r.placement : (r.points ?? '—') + ' PTS'}</b><small>{r.eliminations ?? 0} ELIMINATIONS · VERIFIED</small></article>)}{!extraLoading && !extra.results.some((r:any)=>r.verified_at) && <Empty text="Verified achievements will appear here once match results are approved."/>}</div>
    </div></section>
    <section className="no-band"><div className="no-section">{sectionTitle('07','TRANSMISSIONS','LATEST','UPDATES.','Official announcements and community highlights.')}{newsCards()}</div></section>
    <section className="no-section no-partners">{sectionTitle('08','BACKED BY','OUR','PARTNERS.','The organisations helping the NOVA journey move forward.')}{sponsors()}</section>
    <section className="no-join"><span className="no-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h2>READY TO<br/><em>RISE WITH US?</em></h2><p>Find your place in the origin.</p><div><button className="no-btn" onClick={() => navigate('/join')}>JOIN NOVA ORIGIN <ArrowUpRight size={16}/></button><button className="no-btn ghost" onClick={() => navigate('/contact')}>CONTACT THE TEAM <Mail size={16}/></button></div></section>
  </>;

  return <div className="nova-public">
    <div className="no-topline"><span><i/> NOVA ORIGIN</span><span>BUILT FOR THE NEXT LEVEL</span><span>INDIA · ESPORTS</span></div>
    <header className={'no-header ' + (scrolled ? 'is-scrolled' : '')}>
      <button className="no-brand" onClick={() => navigate('/')} aria-label="NOVA Origin home"><span className="no-brand-wordmark"><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></span><span className="no-brand-official"><BadgeCheck size={13}/> OFFICIAL</span></button>
      <nav className={menuOpen ? 'no-nav open' : 'no-nav'}>{(managedNavigation.length ? managedNavigation.map(item=>({label:item.label,href:item.href,external:!!item.open_in_new_tab})) : NAV.map(([label,href])=>({label,href,external:false}))).map(item => <a key={item.href} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noreferrer' : undefined} className={path === item.href ? 'active' : ''} onClick={e => {if(!item.external){e.preventDefault();navigate(item.href);}}}>{item.label}</a>)}</nav>
      <div className="no-header-actions"><span className="no-open-badge"><i/> OPEN TO COMPETE</span><button className="no-community-btn" onClick={() => navigate('/community')}>COMMUNITY <ArrowUpRight size={14}/></button>{menuOpen && <button className="no-session-door" aria-label={authUser ? 'Sign out' : 'Sign in'} title={authUser ? 'SIGN OUT' : 'SIGN IN'} onClick={() => { if (authUser) { signOut(); setAuthUser(null); setMyProfile(null); setAuthOpen(false); } else { setAuthMode('signin'); setAuthOpen(true); setAuthError(''); setAuthNotice(''); } setMenuOpen(false); }}><DoorOpen size={23}/></button>}<button className="no-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X/> : <Menu/>}</button></div>
    </header>
    <main>{path === '/' ? home() : contentPage()}</main>
    {authOpen && <div className="no-auth-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false);}}>
      <section className="no-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="no-auth-title">
        <button className="no-auth-close" onClick={()=>setAuthOpen(false)} aria-label="Close sign in"><X size={20}/></button>
        {authUser ? <>
          <span className="no-kicker">NOVA ID / ACCOUNT</span><h2 id="no-auth-title">WELCOME<br/><em>BACK.</em></h2>
          <p className="no-auth-copy">{authUser.email || 'Signed-in NOVA member'}</p>
          <button className="no-btn" onClick={()=>{setAuthOpen(false);navigate('/account');}}>MANAGE MY PROFILE <ArrowUpRight size={15}/></button>
          <button className="no-auth-switch" onClick={()=>{signOut();setAuthUser(null);setAuthOpen(false);}}>SIGN OUT</button>
        </> : <>
          <span className="no-kicker">NOVA ID / PLAYER ACCESS</span><h2 id="no-auth-title">{authMode==='signin'?'SIGN IN TO':'CREATE YOUR'}<br/><em>NOVA ID.</em></h2>
          <p className="no-auth-copy">Use your email to access your NOVA Origin account. Tournament entry is subject to each event's published rules.</p>
          <form className="no-auth-form" onSubmit={submitAuth}>
            {authMode==='signup' && <label>DISPLAY NAME<input value={authName} onChange={e=>setAuthName(e.target.value)} required minLength={2} maxLength={60} autoComplete="name"/></label>}
            <label>EMAIL ADDRESS<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required autoComplete="email"/></label>
            <label>PASSWORD<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} required minLength={8} autoComplete={authMode==='signin'?'current-password':'new-password'}/></label>
            {authError && <p className="no-auth-error" role="alert">{authError}</p>}
            {authNotice && <p className="no-auth-notice" role="status">{authNotice}</p>}
            <button className="no-btn" type="submit" disabled={authBusy}>{authBusy?'PLEASE WAIT…':authMode==='signin'?'SIGN IN':'CREATE ACCOUNT'} <ArrowUpRight size={15}/></button>
          </form>
          <button className="no-auth-switch" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setAuthError('');setAuthNotice('');}}>{authMode==='signin'?'NEW TO NOVA? CREATE AN ACCOUNT':'ALREADY HAVE AN ACCOUNT? SIGN IN'}</button>
        </>}
      </section>
    </div>}
    <footer className="no-footer"><div className="no-footer-main"><button className="no-brand" onClick={() => navigate('/')} aria-label="NOVA Origin home"><span className="no-brand-wordmark"><b>NOVA<span>.</span></b><small>ORIGIN ESPORTS</small></span><span className="no-brand-official"><BadgeCheck size={13}/> OFFICIAL</span></button><p>More than a team. A collective built to rise, compete and create what comes next.</p><div className="no-footer-social"><a href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Social" aria-label="Social enquiries"><Instagram/></a><a href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Media" aria-label="Media enquiries"><Youtube/></a><a href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Community" aria-label="Community enquiries"><Disc3/></a></div></div><div className="no-footer-links"><div><b>EXPLORE</b>{NAV.slice(1,6).map(([label,to]) => <a key={to} href={to} onClick={e=>{e.preventDefault();navigate(to);}}>{label}</a>)}</div><div><b>COMPETE</b>{NAV.slice(6).map(([label,to]) => <a key={to} href={to} onClick={e=>{e.preventDefault();navigate(to);}}>{label}</a>)}</div><div><b>CONTACT</b><a href="mailto:hello@novaorigin.gg">hello@novaorigin.gg</a><button onClick={onOpenAdmin}>ADMIN ACCESS <ArrowUpRight size={13}/></button></div></div><div className="no-footer-bottom"><span>© {new Date().getFullYear()} NOVA ORIGIN. ALL SYSTEMS NOMINAL.</span><span>THE NEXT WAVE OF COMPETITION.</span></div></footer>
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="no-empty">{text}</div>; }
function PageHero({ kicker, title, accent, copy }: { kicker: string; title: string; accent: string; copy: string }) { return <section className="no-page-hero"><span className="no-kicker">{kicker}</span><h1>{title}<br/><em>{accent}</em></h1><p>{copy}</p></section>; }
function DetailShell({ kicker, title, copy, children }: { kicker: string; title: string; copy: string; children: ReactNode }) { return <><PageHero kicker={kicker} title={title} accent="" copy={copy}/><section className="no-section">{children}</section></>; }
function AboutStory() { return <section className="no-section no-about-grid"><div><span className="no-kicker">OUR PHILOSOPHY / 001</span><h2>MORE THAN A NAME.<br/><em>A MOVEMENT.</em></h2></div><div><p>We believe competition is stronger when community comes first. NOVA Origin brings players, creators and supporters together around a shared standard: show up, improve, respect the game and build something that lasts.</p><div className="no-values"><span><b>01</b> DISCIPLINE</span><span><b>02</b> UNITY</span><span><b>03</b> EVOLUTION</span></div></div></section>; }
function CommunityBlock({ posts, navigate }: { posts: any[]; navigate: (to:string)=>void }) { return <section className="no-section"><div className="no-community-panel"><span className="no-kicker">FIND YOUR PLACE IN THE ORIGIN</span><h2>THE ORIGIN<br/><em>IS EVERYONE.</em></h2><p>Follow the journey, share the moments and meet the people behind the tag.</p><div><a className="no-btn" href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Community">JOIN THE COMMUNITY <Mail size={15}/></a><a className="no-btn ghost" href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Updates">FOLLOW UPDATES <Mail size={15}/></a></div></div><h3 className="no-subhead">COMMUNITY TRANSMISSIONS</h3><div className="no-news-grid">{posts.map(p=><article className="no-news-card" key={p.id}><span className="no-news-label">COMMUNITY UPDATE</span><p>{p.content}</p><small>{dateLabel(p.created_at)}</small></article>)}{!posts.length && <Empty text="Community posts will appear here when published."/>}</div></section>; }
function ContactBlock({ join = false }: { join?: boolean }) {
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [kind,setKind]=useState(join?'Player application':'General enquiry');
  const [message,setMessage]=useState(()=>new URLSearchParams(window.location.search).get('message') || '');
  const [website,setWebsite]=useState('');
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const submit=async(e:FormEvent)=>{
    e.preventDefault(); setError('');
    if(website.trim()) return;
    if(name.trim().length<2||!/^\S+@\S+\.\S+$/.test(email.trim())||message.trim().length<10){setError('Enter your name, a valid email and a message of at least 10 characters.');return;}
    setSending(true);
    try {
      await api('public_inquiries',{}, {method:'POST',body:{name:name.trim(),email:email.trim().toLowerCase(),enquiry_type:kind,message:message.trim()},prefer:'return=minimal'});
      setSent(true); setName(''); setEmail(''); setMessage(''); setWebsite('');
    } catch { setError('Submission could not be saved. Please try again in a moment.'); }
    finally { setSending(false); }
  };
  return <section className="no-section"><form className="no-contact-form" onSubmit={submit}>
    <div><span className="no-kicker">{join?'APPLICATION ENQUIRY':'CONTACT NOVA ORIGIN'}</span><h2>{join?'TELL US YOUR':'START THE'}<br/><em>{join?'STORY.':'CONVERSATION.'}</em></h2><p>Your enquiry is securely submitted to NOVA Origin. We only collect the details needed to respond to your message.</p>{sent&&<p className="no-form-success" role="status">ENQUIRY RECEIVED — THANK YOU. YOUR MESSAGE HAS BEEN SAVED.</p>}</div>
    <div className="no-form-fields">
      <label>YOUR NAME<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name"/></label>
      <label>EMAIL ADDRESS<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={160} autoComplete="email"/></label>
      <label>ENQUIRY TYPE<select value={kind} onChange={e=>setKind(e.target.value)}><option>Player application</option><option>Team application</option><option>Partnership inquiry</option><option>General enquiry</option></select></label>
      <label>YOUR MESSAGE<textarea rows={5} value={message} onChange={e=>setMessage(e.target.value)} required minLength={10} maxLength={2000}/></label>
      <label className="no-honeypot" aria-hidden="true">WEBSITE<input value={website} onChange={e=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"/></label>
      {error&&<span className="no-form-error" role="alert">{error}</span>}
      <button className="no-btn" type="submit" disabled={sending}>{sending?'SENDING…':sent?'SEND ANOTHER ENQUIRY':'SUBMIT ENQUIRY'} <ArrowUpRight size={16}/></button>
    </div>
  </form></section>;
}
