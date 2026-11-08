import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, LayoutDashboard, Users, Trophy, Megaphone, Radio, LogOut, Plus, Pencil, RefreshCw, ShieldCheck, LockKeyhole, ImagePlus, X, Save } from 'lucide-react';
import { api, hasSupabaseConfig, NovaUser } from '../lib/supabase';

type Props = { user: NovaUser | null; role: string | null; organizerStatus: string | null; onBack: () => void; onLogin: () => void; onLogout: () => void; authError: string; canManage: boolean; onRefresh: () => Promise<void> };
const blankTeam = { name: '', team_tag: '', game_id: '', description: '', logo_url: '' };
const blankTournament = { title: '', game_id: '', summary: '', description: '', banner_url: '', starts_at: '', team_size: '4', max_entries: '32' };

export function Dashboard({ user, role, organizerStatus, onBack, onLogin, onLogout, authError, canManage, onRefresh }: Props) {
  const [tab, setTab] = useState('overview');
  const [games, setGames] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [organizer, setOrganizer] = useState<any>(null);
  const [team, setTeam] = useState(blankTeam);
  const [event, setEvent] = useState(blankTournament);
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });
  const [post, setPost] = useState({ content: '', media_url: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [g, t, e, a, p, o] = await Promise.all([
      api<any[]>('games', { select: 'id,name,publisher', is_active: 'eq.true', order: 'name.asc' }).catch(() => []),
      api<any[]>('teams', { select: '*,game:games(name)', order: 'created_at.desc' }).catch(() => []),
      api<any[]>('tournaments', { select: '*,game:games(name)', order: 'created_at.desc' }).catch(() => []),
      api<any[]>('announcements', { select: '*', order: 'created_at.desc' }).catch(() => []),
      api<any[]>('social_posts', { select: '*', order: 'created_at.desc' }).catch(() => []),
      api<any[]>('organizers', { select: 'id,organization_name,status,user_id', user_id: \`eq.\${user.id}\` }).catch(() => []),
    ]);
    setGames(g); setTeams(t); setTournaments(e); setAnnouncements(a); setPosts(p); setOrganizer(o[0] || null);
    if (!team.game_id && g[0]) setTeam(v => ({ ...v, game_id: g[0].id }));
    if (!event.game_id && g[0]) setEvent(v => ({ ...v, game_id: g[0].id }));
  };
  useEffect(() => { load(); }, [user?.id]);

  const run = async (fn: () => Promise<any>, message: string) => {
    setBusy(true); setNotice('');
    try { await fn(); setNotice(message); await load(); await onRefresh(); }
    catch (error: any) { setNotice(error.message || 'Unable to save this change.'); }
    finally { setBusy(false); }
  };

  const saveTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (editing) {
      await run(() => api('teams', { id: \`eq.\${editing}\` }, { method: 'PATCH', body: { name: team.name, team_tag: team.team_tag, description: team.description, logo_url: team.logo_url, updated_at: new Date().toISOString() }, prefer: 'return=minimal' }), 'Team profile updated.');
    } else {
      await run(() => api('teams', {}, { method: 'POST', body: { ...team, owner_id: user!.id, is_public: true, status: 'active' }, prefer: 'return=minimal' }), 'Team profile created.');
    }
    setTeam(blankTeam); setEditing(null);
  };

  const saveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizer?.id) { setNotice('Your organizer profile is not linked. Ask a platform admin to approve your organizer account.'); return; }
    const modes = await api<any[]>('game_modes', { select: 'id', game_id: \`eq.\${event.game_id}\`, is_active: 'eq.true', limit: '1' }).catch(() => []);
    if (!modes[0]?.id) { setNotice('No active game mode exists for this game yet.'); return; }
    const slug = event.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-5);
    await run(() => api('tournaments', {}, { method: 'POST', body: { organizer_id: organizer.id, game_id: event.game_id, game_mode_id: modes[0].id, title: event.title, slug, summary: event.summary, description: event.description, banner_url: event.banner_url || null, starts_at: event.starts_at ? new Date(event.starts_at).toISOString() : null, team_size: Number(event.team_size), max_entries: Number(event.max_entries), entry_type: 'free', status: 'draft', format: 'custom' }, prefer: 'return=minimal' }), 'Tournament saved as draft.');
    setEvent(blankTournament);
  };

  const saveAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    await run(() => api('announcements', {}, { method: 'POST', body: { ...announcement, audience: 'all', status: 'published', published_at: new Date().toISOString(), created_by: user!.id }, prefer: 'return=minimal' }), 'Announcement published.');
    setAnnouncement({ title: '', body: '' });
  };

  const savePost = async (e: FormEvent) => {
    e.preventDefault();
    await run(() => api('social_posts', {}, { method: 'POST', body: { author_id: user!.id, content: post.content, media_url: post.media_url || null, media_type: post.media_url ? 'image' : null, is_published: true }, prefer: 'return=minimal' }), 'Community update published.');
    setPost({ content: '', media_url: '' });
  };

  const nav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'teams', label: 'Team profiles', icon: Users },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'updates', label: 'Social updates', icon: Radio },
  ];

  if (!hasSupabaseConfig()) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo">N</div><span className="admin-kicker">NOVA ORIGIN / SETUP</span><h1>Connect your<br/><em>command center.</em></h1><p>Add the Supabase project URL and publishable key as environment variables to activate the website and control room.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Back to website</button></div></div>;
  if (!user) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo">N</div><span className="admin-kicker">NOVA ORIGIN / SECURE ACCESS</span><h1>Enter the<br/><em>control room.</em></h1><p>Sign in with your authorized NOVA Origin account. Only approved platform administrators and organizers can manage content.</p>{authError && <div className="admin-error">{authError}</div>}<button className="admin-signin" onClick={onLogin}><ShieldCheck size={18}/> Continue with Google</button><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Back to website</button></div></div>;
  if (!canManage) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo"><LockKeyhole/></div><span className="admin-kicker">ACCESS NOT YET APPROVED</span><h1>Almost<br/><em>there.</em></h1><p>Signed in as <b>{user.email}</b>. Your account does not currently have an approved management role.</p><div className="access-status"><span>Platform role</span><b>{role || 'No role assigned'}</b><span>Organizer status</span><b>{organizerStatus || 'Not registered'}</b></div><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Back to website</button><button className="admin-back" onClick={onLogout}><LogOut size={16}/> Sign out</button></div></div>;

  return <div className="admin-layout">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="admin-logo small">N</span><span><b>NOVA</b><small>ORIGIN CONTROL</small></span></div><div className="admin-nav-label">WORKSPACE</div><nav>{nav.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon size={17}/>{item.label}</button>)}</nav><div className="admin-sidebar-bottom"><div className="admin-user-dot">{(user.user_metadata?.full_name || user.email || 'N').slice(0, 1).toUpperCase()}</div><div className="admin-user-info"><b>{user.user_metadata?.full_name || user.email}</b><small>{role?.replace('_', ' ')}</small></div><button onClick={onLogout} title="Sign out"><LogOut size={17}/></button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><button className="admin-back-link" onClick={onBack}><ArrowLeft size={16}/> Website</button><div className="admin-top-right"><span className="admin-live"><i className="live-dot"/> SYSTEM ONLINE</span><button onClick={load} title="Refresh"><RefreshCw size={16}/></button></div></header>
      <div className="admin-content"><div className="admin-page-heading"><div><span className="admin-kicker">NOVA ORIGIN / MANAGEMENT</span><h1>{nav.find(n => n.id === tab)?.label}</h1><p>Manage your public website and competitive ecosystem.</p></div><span className="admin-date">{new Date().toLocaleDateString()}</span></div>
        {notice && <div className="admin-notice">{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
        {tab === 'overview' && <><div className="admin-stats"><div><span>TEAM PROFILES</span><b>{teams.length}</b><Users/></div><div><span>TOURNAMENTS</span><b>{tournaments.length}</b><Trophy/></div><div><span>ANNOUNCEMENTS</span><b>{announcements.length}</b><Megaphone/></div><div><span>COMMUNITY POSTS</span><b>{posts.length}</b><Radio/></div></div><div className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">QUICK ACCESS</span><h2>Keep NOVA moving.</h2></div><span className="panel-live"><i className="live-dot"/> CONNECTED</span></div><div className="quick-grid">{nav.slice(1).map(n => <button key={n.id} onClick={() => setTab(n.id)}><n.icon/><b>{n.label}</b><span>Manage content</span></button>)}</div></div></>}
        {tab === 'teams' && <div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">ROSTER BUILDER</span><h2>{editing ? 'Edit team profile' : 'Add a team'}</h2></div><Users/></div><form className="admin-form" onSubmit={saveTeam}><label>Team name<input required value={team.name} onChange={e => setTeam({...team, name: e.target.value})} placeholder="NOVA Alpha"/></label><div className="form-row"><label>Team tag<input required maxLength={12} value={team.team_tag} onChange={e => setTeam({...team, team_tag: e.target.value.toUpperCase()})} placeholder="NVA"/></label><label>Game<select required value={team.game_id} onChange={e => setTeam({...team, game_id: e.target.value})}><option value="">Choose game</option>{games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label></div><label>Team description<textarea rows={3} value={team.description} onChange={e => setTeam({...team, description: e.target.value})} placeholder="Tell the community about this team."/></label><label>Team logo image URL<div className="input-icon"><ImagePlus size={16}/><input value={team.logo_url} onChange={e => setTeam({...team, logo_url: e.target.value})} placeholder="https://..."/></div><small>Paste a hosted image URL. File uploads need Storage setup.</small></label><button className="admin-submit" disabled={busy}><Save size={16}/>{editing ? 'Save team profile' : 'Create team profile'}</button>{editing && <button type="button" className="admin-cancel" onClick={() => {setEditing(null);setTeam(blankTeam);}}>Cancel edit</button>}</form></section><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">TEAM DIRECTORY</span><h2>Team profiles <small>{teams.length}</small></h2></div></div><div className="admin-record-list">{teams.map(t => <div className="admin-record" key={t.id}><div className="record-avatar">{t.logo_url ? <img src={t.logo_url} alt=""/> : t.team_tag?.slice(0,2)}</div><div className="record-main"><b>{t.name}</b><small>{t.team_tag} · {t.game?.name || 'Game'}</small></div><button onClick={() => {setEditing(t.id);setTeam({name:t.name,team_tag:t.team_tag,game_id:t.game_id,description:t.description||'',logo_url:t.logo_url||''});}} title="Edit"><Pencil size={15}/></button></div>)}{teams.length === 0 && <div className="admin-empty">No team profiles yet. Create your first one.</div>}</div></section></div>}
        {tab === 'tournaments' && <div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">EVENT BUILDER</span><h2>Create tournament</h2></div><Trophy/></div><form className="admin-form" onSubmit={saveEvent}><label>Tournament title<input required value={event.title} onChange={e => setEvent({...event,title:e.target.value})} placeholder="NOVA Open Series"/></label><label>Game<select required value={event.game_id} onChange={e => setEvent({...event,game_id:e.target.value})}><option value="">Choose game</option>{games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Short description<input value={event.summary} onChange={e => setEvent({...event,summary:e.target.value})} placeholder="Intro for the event card"/></label><label>Full details<textarea rows={3} value={event.description} onChange={e => setEvent({...event,description:e.target.value})}/></label><label>Banner image URL<input value={event.banner_url} onChange={e => setEvent({...event,banner_url:e.target.value})} placeholder="https://..."/></label><div className="form-row"><label>Start date<input type="datetime-local" value={event.starts_at} onChange={e => setEvent({...event,starts_at:e.target.value})}/></label><label>Team size<input type="number" min="1" max="10" value={event.team_size} onChange={e => setEvent({...event,team_size:e.target.value})}/></label></div><label>Maximum teams<input type="number" min="2" value={event.max_entries} onChange={e => setEvent({...event,max_entries:e.target.value})}/></label><button className="admin-submit" disabled={busy}><Plus size={16}/> Save as draft</button></form></section><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">EVENT PIPELINE</span><h2>All tournaments</h2></div></div><div className="admin-record-list">{tournaments.map(t => <div className="admin-record" key={t.id}><div className="record-avatar"><Trophy size={17}/></div><div className="record-main"><b>{t.title}</b><small>{t.game?.name || 'Game'} · {t.status}</small></div></div>)}{tournaments.length === 0 && <div className="admin-empty">No tournaments created yet.</div>}</div></section></div>}
        {tab === 'announcements' && <div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">BROADCAST CENTER</span><h2>Publish announcement</h2></div><Megaphone/></div><form className="admin-form" onSubmit={saveAnnouncement}><label>Headline<input required value={announcement.title} onChange={e => setAnnouncement({...announcement,title:e.target.value})}/></label><label>Message<textarea rows={6} required value={announcement.body} onChange={e => setAnnouncement({...announcement,body:e.target.value})}/></label><button className="admin-submit" disabled={busy}><Plus size={16}/> Publish announcement</button></form></section><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">LATEST BROADCASTS</span><h2>Published messages</h2></div></div><div className="admin-record-list">{announcements.map(a => <div className="admin-record" key={a.id}><div className="record-avatar"><Megaphone size={16}/></div><div className="record-main"><b>{a.title}</b><small>{a.status} · {new Date(a.created_at).toLocaleDateString()}</small></div></div>)}{announcements.length === 0 && <div className="admin-empty">No announcements yet.</div>}</div></section></div>}
        {tab === 'updates' && <div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">COMMUNITY FEED</span><h2>Share an update</h2></div><Radio/></div><form className="admin-form" onSubmit={savePost}><label>Post content<textarea rows={6} required value={post.content} onChange={e => setPost({...post,content:e.target.value})}/></label><label>Image URL (optional)<input value={post.media_url} onChange={e => setPost({...post,media_url:e.target.value})} placeholder="https://..."/></label><button className="admin-submit" disabled={busy}><Plus size={16}/> Publish update</button></form></section><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">RECENT POSTS</span><h2>Community updates</h2></div></div><div className="admin-record-list">{posts.map(p => <div className="admin-record" key={p.id}><div className="record-avatar"><Radio size={16}/></div><div className="record-main"><b>{p.content.slice(0,64)}</b><small>{p.is_published ? 'Published' : 'Draft'} · {new Date(p.created_at).toLocaleDateString()}</small></div></div>)}{posts.length === 0 && <div className="admin-empty">No community updates yet.</div>}</div></section></div>}
      </div>
    </main>
  </div>;
}
