import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, CalendarDays, Camera, CheckCircle2, ChevronRight, Gamepad2, LogOut, Medal, Save, ShieldCheck, Swords, Trophy, UserRound, Users, X } from 'lucide-react';
import { api, mediaPublicUrl, NovaUser, signInWithPassword, signOut, uploadMediaFile } from '../lib/supabase';

type Tab = 'overview' | 'profile' | 'team' | 'stats' | 'events' | 'notifications';
type Row = Record<string, any>;

export function PlayerDashboard({ user, onLogin, onLogout, onBack }: { user: NovaUser | null; onLogin: (u: NovaUser) => void; onLogout: () => void; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Row | null>(null);
  const [teams, setTeams] = useState<Row[]>([]);
  const [memberships, setMemberships] = useState<Row[]>([]);
  const [gameStats, setGameStats] = useState<Row[]>([]);
  const [matchStats, setMatchStats] = useState<Row[]>([]);
  const [registrations, setRegistrations] = useState<Row[]>([]);
  const [notifications, setNotifications] = useState<Row[]>([]);
  const [postText, setPostText] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    const safe = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => { try { return await promise; } catch { return fallback; } };
    try {
      const [p, m, gs, ms, regs, notes] = await Promise.all([
        safe(api<Row[]>('profiles', { select: '*', id: 'eq.' + user.id, limit: '1' }), []),
        safe(api<Row[]>('team_members', { select: 'id,team_id,user_id,team_role,joined_at', user_id: 'eq.' + user.id }), []),
        safe(api<Row[]>('player_game_stats', { select: '*', player_id: 'eq.' + user.id, order: 'updated_at.desc' }), []),
        safe(api<Row[]>('player_match_stats', { select: '*', player_id: 'eq.' + user.id, verified: 'eq.true', order: 'created_at.desc', limit: '30' }), []),
        safe(api<Row[]>('registrations', { select: '*', or: '(player_id.eq.' + user.id + ',registered_by.eq.' + user.id + ')', order: 'created_at.desc' }), []),
        safe(api<Row[]>('notifications', { select: '*', user_id: 'eq.' + user.id, order: 'created_at.desc', limit: '30' }), []),
      ]);
      setProfile(p[0] || { id: user.id, username: '', display_name: user.user_metadata?.full_name || user.user_metadata?.name || '', avatar_url: '', bio: '', country_code: '' });
      setMemberships(m); setGameStats(gs); setMatchStats(ms); setRegistrations(regs); setNotifications(notes);
      if (m.length) {
        const ids = [...new Set(m.map(x => x.team_id).filter(Boolean))];
        if (ids.length) {
          const ts = await safe(api<Row[]>('teams', { select: 'id,name,team_tag,description,logo_url,game_id,status,is_public', id: 'in.(' + ids.join(',') + ')' }), []);
          setTeams(ts);
        } else setTeams([]);
      } else setTeams([]);
    } catch (e: any) { setError(e.message || 'Dashboard data could not be loaded.'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const unread = notifications.filter(n => !n.read_at).length;
  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'Player';
  const totalMatches = gameStats.reduce((n, x) => n + Number(x.matches_played || 0), 0);
  const totalWins = gameStats.reduce((n, x) => n + Number(x.wins || 0), 0);
  const totalElims = gameStats.reduce((n, x) => n + Number(x.eliminations || 0), 0);
  const avgKd = gameStats.length ? (gameStats.reduce((n, x) => n + Number(x.kd_ratio || 0), 0) / gameStats.length).toFixed(2) : '—';
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Trophy }, { id: 'profile', label: 'My Profile', icon: UserRound },
    { id: 'team', label: 'My Team', icon: Users }, { id: 'stats', label: 'Performance', icon: Medal },
    { id: 'events', label: 'Tournaments', icon: CalendarDays }, { id: 'notifications', label: 'Inbox', icon: Bell },
  ];

  const saveProfile = async () => {
    if (!user || !profile) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { username: String(profile.username || '').trim() || null, display_name: String(profile.display_name || '').trim() || null, bio: String(profile.bio || '').trim() || null, country_code: String(profile.country_code || '').trim().toUpperCase() || null, updated_at: new Date().toISOString() };
      const existing = await api<Row[]>('profiles', { select: 'id', id: 'eq.' + user.id, limit: '1' });
      if (existing.length) await api('profiles', { id: 'eq.' + user.id }, { method: 'PATCH', body: payload, prefer: 'return=minimal' });
      else await api('profiles', {}, { method: 'POST', body: { id: user.id, display_name: payload.display_name || 'Player', ...payload }, prefer: 'return=minimal' });
      setNotice('Profile saved successfully.'); setEditing(false); await load();
    } catch (e: any) { setError(e.message || 'Profile could not be saved.'); }
    finally { setBusy(false); }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !user || !profile) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose JPG, PNG, WEBP or GIF under 5 MB.'); return; }
    setBusy(true); setError('');
    try {
      const path = 'players/' + user.id + '/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '');
      await uploadMediaFile(file, path);
      const url = mediaPublicUrl(path);
      const existing = await api<Row[]>('profiles', { select: 'id', id: 'eq.' + user.id, limit: '1' });
      if (existing.length) await api('profiles', { id: 'eq.' + user.id }, { method: 'PATCH', body: { avatar_url: url, updated_at: new Date().toISOString() }, prefer: 'return=minimal' });
      else await api('profiles', {}, { method: 'POST', body: { id: user.id, display_name: displayName, avatar_url: url }, prefer: 'return=minimal' });
      setProfile({ ...profile, avatar_url: url }); setNotice('Profile photo updated.');
    } catch (e: any) { setError(e.message || 'Photo upload failed.'); }
    finally { setBusy(false); }
  };

  const publishPost = async () => {
    if (!user || !postText.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('social_posts', {}, { method: 'POST', body: { author_id: user.id, content: postText.trim(), is_published: false }, prefer: 'return=minimal' });
      setPostText(''); setNotice('Your update was saved as a draft for review.'); 
    } catch (e: any) { setError(e.message || 'Could not save your update.'); }
    finally { setBusy(false); }
  };

  const markRead = async (id: string) => {
    try { await api('notifications', { id: 'eq.' + id, user_id: 'eq.' + user?.id }, { method: 'PATCH', body: { read_at: new Date().toISOString() }, prefer: 'return=minimal' }); setNotifications(old => old.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)); }
    catch (e: any) { setError(e.message || 'Could not update notification.'); }
  };

  if (!user) return <div className="player-login-shell"><div className="player-login-card"><a className="player-brand" href="/"><span className="player-brand-mark">N</span><span><b>NOVA</b><small>ORIGIN / PLAYER PORTAL</small></span></a><div className="player-kicker">PLAYER ACCESS / 001</div><h1>ENTER YOUR<br/><em>ARENA.</em></h1><p>Sign in with your NOVA Origin player account to access your profile, team, match records and event activity.</p><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { onLogin(await signInWithPassword(email, password)); } catch (x: any) { setError(x.message || 'Sign in failed.'); } finally { setBusy(false); } }}><label>EMAIL ADDRESS<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required placeholder="player@example.com"/></label><label>PASSWORD<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your account password"/></label>{error && <div className="player-error">{error}</div>}<button className="player-primary" disabled={busy}>{busy ? 'SIGNING IN…' : 'SIGN IN TO PLAYER PANEL'} <ChevronRight size={16}/></button></form><button className="player-back" onClick={onBack}><ArrowLeft size={15}/> Back to NOVA Origin website</button><small className="player-login-foot">Password-based secure sign-in · No public account creation</small></div></div>;

  return <div className="player-app">
    <aside className="player-sidebar">
      <a className="player-brand" href="/"><span className="player-brand-mark">N</span><span><b>NOVA</b><small>ORIGIN / PLAYER</small></span></a>
      <div className="player-side-label">PLAYER SPACE</div>
      <nav>{tabs.map(t => { const Icon = t.icon; return <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><Icon size={17}/>{t.label}{t.id === 'notifications' && unread > 0 && <i>{unread}</i>}</button>; })}</nav>
      <div className="player-side-bottom"><div className="player-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><small>PLAYER ACCOUNT</small></div><button onClick={onLogout} title="Sign out"><LogOut size={17}/></button></div>
    </aside>
    <main className="player-main">
      <header className="player-topbar"><button onClick={onBack}><ArrowLeft size={16}/> MAIN WEBSITE</button><span><i/> PLAYER SESSION ACTIVE</span></header>
      <div className="player-content">
        <div className="player-heading"><div><div className="player-kicker">NOVA ORIGIN / PLAYER PORTAL</div><h1>{tab === 'overview' ? 'PLAYER DASHBOARD' : tabs.find(t => t.id === tab)?.label.toUpperCase()}</h1><p>Welcome back, {displayName}. Your competitive profile at a glance.</p></div><button className="player-refresh" onClick={load}>↻ REFRESH DATA</button></div>
        {error && <div className="player-alert error">{error}<button onClick={() => setError('')}><X size={15}/></button></div>}
        {notice && <div className="player-alert">{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
        {loading && <div className="player-loading">SYNCING PLAYER DATA…</div>}
        {tab === 'overview' && <>
          <div className="player-hero-card"><div><span className="player-kicker">YOUR NEXT LEVEL STARTS HERE</span><h2>{displayName.toUpperCase()}<br/><em>READY TO RISE.</em></h2><p>{profile?.bio || 'Complete your player profile and keep your competitive record up to date.'}</p><button onClick={() => setTab('profile')}>COMPLETE PROFILE <ChevronRight size={15}/></button></div><div className="player-hero-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : displayName.slice(0,1).toUpperCase()}</div><div className="player-hero-index">NOVA / PLAYER / 001</div></div>
          <div className="player-metric-grid"><div><span>MATCHES PLAYED</span><b>{totalMatches}</b><small>Verified game records</small></div><div><span>WINS RECORDED</span><b>{totalWins}</b><small>Across tracked games</small></div><div><span>ELIMINATIONS</span><b>{totalElims}</b><small>Recorded performance</small></div><div><span>AVERAGE K/D</span><b>{avgKd}</b><small>Verified stats only</small></div></div>
          <div className="player-grid-two"><section className="player-panel"><div className="player-panel-head"><div><span>YOUR SQUAD</span><h3>TEAM MEMBERSHIP</h3></div><Users size={19}/></div>{teams.length ? teams.map(t => <div className="player-team-row" key={t.id}><div className="player-team-logo">{t.logo_url ? <img src={t.logo_url} alt=""/> : (t.team_tag || t.name || 'N').slice(0,2)}</div><div><b>{t.name}</b><small>[{t.team_tag || 'NOVA'}] · {memberships.find(m => m.team_id === t.id)?.team_role || 'player'}</small></div><span>{t.status || 'active'}</span></div>) : <div className="player-empty">No team membership linked to this account yet.</div>}</section><section className="player-panel"><div className="player-panel-head"><div><span>RECENT ACTIVITY</span><h3>EVENT REGISTRATIONS</h3></div><Trophy size={19}/></div>{registrations.length ? registrations.slice(0,4).map(r => <div className="player-list-row" key={r.id}><div><b>Registration</b><small>{new Date(r.created_at).toLocaleDateString()}</small></div><span>{r.status || 'pending'}</span></div>) : <div className="player-empty">Your tournament registrations will appear here.</div>}</section></div>
          <section className="player-panel player-post-panel"><div className="player-panel-head"><div><span>COMMUNITY</span><h3>SHARE AN UPDATE</h3></div><Swords size={19}/></div><textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share a team update, achievement or community message…"/><div className="player-post-foot"><small>Updates are saved as drafts and are not published automatically.</small><button onClick={publishPost} disabled={busy || !postText.trim()}><Save size={14}/> SAVE UPDATE</button></div></section>
        </>}
        {tab === 'profile' && profile && <section className="player-panel player-profile-panel"><div className="player-panel-head"><div><span>PLAYER IDENTITY</span><h3>PROFILE DETAILS</h3></div><ShieldCheck size={19}/></div><div className="player-profile-top"><div className="player-profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><small>{user.email}</small><label className="player-upload"><Camera size={14}/> CHANGE PHOTO<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => uploadAvatar(e.target.files?.[0])}/></label></div></div><div className="player-form-grid"><label>DISPLAY NAME<input disabled={!editing} value={profile.display_name || ''} onChange={e => setProfile({...profile,display_name:e.target.value})}/></label><label>PLAYER USERNAME<input disabled={!editing} value={profile.username || ''} onChange={e => setProfile({...profile,username:e.target.value})}/></label><label>COUNTRY CODE<input disabled={!editing} maxLength={2} value={profile.country_code || ''} onChange={e => setProfile({...profile,country_code:e.target.value})} placeholder="IN"/></label><label>ACCOUNT EMAIL<input disabled value={user.email || ''}/></label><label className="wide">BIO<textarea disabled={!editing} value={profile.bio || ''} onChange={e => setProfile({...profile,bio:e.target.value})} placeholder="Tell the NOVA community about your play style…"/></label></div><div className="player-form-actions">{editing ? <><button className="player-secondary" onClick={() => { setEditing(false); load(); }}>CANCEL</button><button className="player-primary" onClick={saveProfile} disabled={busy}><Save size={15}/> SAVE PROFILE</button></> : <button className="player-primary" onClick={() => setEditing(true)}>EDIT PROFILE <ChevronRight size={15}/></button>}</div></section>}
        {tab === 'team' && <section className="player-panel"><div className="player-panel-head"><div><span>ROSTER CONNECTIONS</span><h3>MY TEAMS</h3></div><Users size={19}/></div>{teams.length ? teams.map(t => <div className="player-team-detail" key={t.id}><div className="player-team-logo">{t.logo_url ? <img src={t.logo_url} alt=""/> : (t.team_tag || t.name || 'N').slice(0,2)}</div><div><h3>{t.name}</h3><p>{t.description || 'NOVA Origin competitive roster'}</p><small>{t.game_id ? 'GAME LINKED' : 'TEAM'} · {memberships.find(m => m.team_id === t.id)?.team_role || 'player'}</small></div><span>{t.status || 'active'}</span></div>) : <div className="player-empty">You are not currently assigned to a team. Team invitations and roster assignments will show here once linked by a team manager.</div>}</section>}
        {tab === 'stats' && <><div className="player-metric-grid"><div><span>MATCHES</span><b>{totalMatches}</b></div><div><span>WINS</span><b>{totalWins}</b></div><div><span>ELIMINATIONS</span><b>{totalElims}</b></div><div><span>AVG K/D</span><b>{avgKd}</b></div></div><section className="player-panel"><div className="player-panel-head"><div><span>VERIFIED RECORDS</span><h3>GAME PERFORMANCE</h3></div><Medal size={19}/></div>{gameStats.length ? gameStats.map(s => <div className="player-stat-row" key={s.id}><div><b>{s.game_id ? 'Game record' : 'Player record'}</b><small>{s.source_label || 'verified'}</small></div><strong>{s.kd_ratio ?? '—'} K/D</strong><span>{s.matches_played ?? 0} MATCHES</span><span>{s.wins ?? 0} WINS</span><span>{s.eliminations ?? 0} ELIMS</span></div>) : <div className="player-empty">No verified game stats are available yet. Verified records will appear here after review.</div>}</section><section className="player-panel"><div className="player-panel-head"><div><span>RECENT MATCHES</span><h3>MATCH PERFORMANCE</h3></div><Gamepad2 size={19}/></div>{matchStats.length ? matchStats.map(s => <div className="player-list-row" key={s.id}><div><b>{s.eliminations ?? 0} eliminations · {s.assists ?? 0} assists</b><small>{new Date(s.created_at).toLocaleDateString()} · verified</small></div><span>#{s.placement ?? '—'} PLACE</span></div>) : <div className="player-empty">No verified match records are available yet.</div>}</section></>}
        {tab === 'events' && <section className="player-panel"><div className="player-panel-head"><div><span>COMPETITIVE CIRCUIT</span><h3>MY TOURNAMENTS</h3></div><Trophy size={19}/></div>{registrations.length ? registrations.map(r => <div className="player-list-row" key={r.id}><div><b>Registration record</b><small>{new Date(r.created_at).toLocaleString()}</small></div><span>{r.status || 'pending'}</span></div>) : <div className="player-empty">No tournament registration is linked to your account. When a registration is submitted for you or by you, its status will appear here.</div>}</section>}
        {tab === 'notifications' && <section className="player-panel"><div className="player-panel-head"><div><span>PLAYER COMMUNICATIONS</span><h3>INBOX / {unread} UNREAD</h3></div><Bell size={19}/></div>{notifications.length ? notifications.map(n => <div className={'player-notice-row ' + (n.read_at ? 'read' : '')} key={n.id}><div className="player-notice-icon"><Bell size={16}/></div><div><b>{n.title}</b><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString()}</small></div>{!n.read_at && <button onClick={() => markRead(n.id)}>MARK READ</button>}</div>) : <div className="player-empty">You're all caught up. New account and event notifications will appear here.</div>}</section>}
        <footer className="player-footer">© 2026 NOVA ORIGIN · PLAYER SPACE <span>COMPETE WITH PURPOSE.</span></footer>
      </div>
    </main>
  </div>;
}
