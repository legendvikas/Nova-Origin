import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, AlertCircle, Archive, ArrowDownUp, ArrowLeft, ArrowUpRight, BarChart3, Bell, BookOpen,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command, Compass, Database, FileImage,
  FileText, Gamepad2, Gauge, Globe, Home, Image, LayoutDashboard, LifeBuoy, Lock, LogOut, Menu,
  MessageSquare, Moon, MoreHorizontal, Newspaper, PanelLeftClose, PanelLeftOpen, Plus, Radio,
  RefreshCw, Search, Settings, Shield, ShieldCheck, SlidersHorizontal, Sparkles, Swords, Sun,
  Trophy, Upload, Users, X, Zap
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, hasSupabaseConfig, type NovaUser } from '../lib/supabase';

type Props = { user: NovaUser | null; role: string | null; organizerStatus: string | null; onBack: () => void; onLogin: () => void; onLogout: () => void; authError: string; canManage: boolean; onRefresh: () => Promise<void> };
type Field = { key: string; label: string; type?: 'text'|'textarea'|'number'|'date'|'datetime-local'|'url'|'boolean'|'select'; options?: string[]; required?: boolean; hint?: string };
type Module = { id: string; label: string; group: string; icon: any; table?: string; fields?: Field[]; readOnly?: boolean; description?: string; order?: string; statusField?: string; statusValues?: string[] };
const modules: Module[] = [
  {id:'overview',label:'Overview',group:'COMMAND',icon:LayoutDashboard},
  {id:'builder',label:'Website Builder',group:'WEBSITE',icon:Compass,description:'A visual page builder needs a page/block schema. The current database does not contain one yet.'},
  {id:'homepage',label:'Homepage Manager',group:'WEBSITE',icon:Home,description:'Homepage section content and ordering are not stored in the current schema.'},
  {id:'header',label:'Header & Navigation',group:'WEBSITE',icon:PanelLeftOpen,description:'The live header badge and navigation need a website settings record and public-site binding.'},
  {id:'games',label:'Games Manager',group:'COMPETITION',icon:Gamepad2,table:'games',order:'created_at',fields:[{key:'name',label:'Game name',required:true},{key:'slug',label:'Slug',required:true},{key:'publisher',label:'Publisher'},{key:'is_active',label:'Active',type:'boolean'}],statusField:'is_active'},
  {id:'game-modes',label:'Game Modes',group:'COMPETITION',icon:SlidersHorizontal,table:'game_modes',order:'name',fields:[{key:'game_id',label:'Game ID',required:true},{key:'name',label:'Mode name',required:true},{key:'slug',label:'Slug',required:true},{key:'team_size',label:'Team size',type:'number'},{key:'is_active',label:'Active',type:'boolean'}],statusField:'is_active'},
  {id:'teams',label:'Teams Manager',group:'COMPETITION',icon:Users,table:'teams',order:'created_at',fields:[{key:'name',label:'Team name',required:true},{key:'team_tag',label:'Team tag',required:true},{key:'game_id',label:'Game ID',required:true},{key:'description',label:'Description',type:'textarea'},{key:'logo_url',label:'Logo URL',type:'url'},{key:'is_public',label:'Public',type:'boolean'},{key:'status',label:'Status',type:'select',options:['active','inactive','suspended']}],statusField:'status',statusValues:['active','inactive','suspended']},
  {id:'team-members',label:'Team Members',group:'COMPETITION',icon:Users,table:'team_members',order:'joined_at',fields:[{key:'team_id',label:'Team ID',required:true},{key:'user_id',label:'Player user ID',required:true},{key:'team_role',label:'Team role',type:'select',options:['captain','igl','rusher','support','assault','player']} ]},
  {id:'player-stats',label:'Player Game Stats',group:'COMPETITION',icon:BarChart3,table:'player_game_stats',order:'updated_at',fields:[{key:'player_id',label:'Player ID',required:true},{key:'game_id',label:'Game ID',required:true},{key:'kd_ratio',label:'K/D ratio',type:'number'},{key:'average_damage',label:'Average damage',type:'number'},{key:'matches_played',label:'Matches played',type:'number'},{key:'wins',label:'Wins',type:'number'},{key:'eliminations',label:'Eliminations',type:'number'},{key:'source_label',label:'Data source',type:'select',options:['unverified','organizer_import','verified']} ]},
  {id:'players',label:'Players Manager',group:'COMPETITION',icon:Zap,table:'profiles',order:'created_at',readOnly:true,fields:[{key:'username',label:'Username'},{key:'display_name',label:'Display name'},{key:'avatar_url',label:'Avatar URL',type:'url'},{key:'bio',label:'Bio',type:'textarea'},{key:'country_code',label:'Country code'}]},
  {id:'match-participants',label:'Match Participants',group:'COMPETITION',icon:Users,table:'match_participants',order:'created_at',readOnly:true,fields:[{key:'match_id',label:'Match ID'},{key:'team_id',label:'Team ID'},{key:'player_id',label:'Player ID'},{key:'seed',label:'Seed'},{key:'created_at',label:'Added at'}],description:'Read-only match roster assignments from the existing match participation records.'},
  {id:'player-match-stats',label:'Player Match Stats',group:'COMPETITION',icon:BarChart3,table:'player_match_stats',order:'created_at',readOnly:true,fields:[{key:'match_id',label:'Match ID'},{key:'player_id',label:'Player ID'},{key:'eliminations',label:'Eliminations',type:'number'},{key:'assists',label:'Assists',type:'number'},{key:'deaths',label:'Deaths',type:'number'},{key:'damage',label:'Damage',type:'number'},{key:'placement',label:'Placement',type:'number'},{key:'survival_seconds',label:'Survival seconds',type:'number'},{key:'objective_points',label:'Objective points',type:'number'},{key:'verified',label:'Verified',type:'boolean'},{key:'source_label',label:'Source'}],description:'Match-level player performance and verification status. Read-only to preserve the existing result-verification workflow.'},
  {id:'match-checkins',label:'Match Check-ins',group:'COMPETITION',icon:Check,table:'match_checkins',order:'checked_in_at',readOnly:true,fields:[{key:'match_id',label:'Match ID'},{key:'user_id',label:'Player user ID'},{key:'checked_in_at',label:'Checked in at'}],description:'Live check-in records from the existing tournament match workflow.'},
  {id:'tournaments',label:'Tournaments Manager',group:'COMPETITION',icon:Trophy,table:'tournaments',order:'created_at',fields:[{key:'title',label:'Tournament name',required:true},{key:'slug',label:'Slug',required:true},{key:'game_id',label:'Game ID',required:true},{key:'game_mode_id',label:'Game mode ID',required:true},{key:'organizer_id',label:'Organizer ID',required:true},{key:'summary',label:'Summary',type:'textarea'},{key:'description',label:'Rules / details',type:'textarea'},{key:'banner_url',label:'Banner URL',type:'url'},{key:'format',label:'Format',type:'select',options:['battle_royale','clash_squad','classic','knockout','league','custom']},{key:'team_size',label:'Team size',type:'number'},{key:'max_entries',label:'Max entries',type:'number'},{key:'prize_description',label:'Prize information',type:'textarea'},{key:'registration_opens_at',label:'Registration opens',type:'datetime-local'},{key:'registration_closes_at',label:'Registration closes',type:'datetime-local'},{key:'starts_at',label:'Starts at',type:'datetime-local'},{key:'ends_at',label:'Ends at',type:'datetime-local'},{key:'status',label:'Status',type:'select',options:['draft','pending_review','published','registration_open','registration_closed','live','completed','cancelled','under_review']}],statusField:'status',statusValues:['draft','pending_review','published','registration_open','registration_closed','live','completed','cancelled','under_review']},
  {id:'matches',label:'Match Center',group:'COMPETITION',icon:Swords,table:'matches',order:'scheduled_at',fields:[{key:'tournament_id',label:'Tournament ID',required:true},{key:'match_number',label:'Match number',type:'number',required:true},{key:'stage',label:'Stage'},{key:'round_name',label:'Round'},{key:'scheduled_at',label:'Scheduled at',type:'datetime-local'},{key:'status',label:'Status',type:'select',options:['scheduled','live','completed','cancelled']},{key:'result_status',label:'Result status'}],statusField:'status',statusValues:['scheduled','live','completed','cancelled']},
  {id:'results',label:'Results & Standings',group:'COMPETITION',icon:BarChart3,table:'match_results',order:'created_at',fields:[{key:'match_id',label:'Match ID',required:true},{key:'team_id',label:'Team ID'},{key:'player_id',label:'Player ID'},{key:'placement',label:'Placement',type:'number'},{key:'eliminations',label:'Eliminations',type:'number'},{key:'points',label:'Points',type:'number'},{key:'status',label:'Status'}]},
  {id:'news',label:'News & Announcements',group:'PUBLISHING',icon:Newspaper,table:'announcements',order:'created_at',fields:[{key:'title',label:'Title',required:true},{key:'body',label:'Content',type:'textarea',required:true},{key:'audience',label:'Audience',type:'select',options:['all','players','organizers']},{key:'status',label:'Status',type:'select',options:['draft','published','archived']},{key:'published_at',label:'Publish date',type:'datetime-local'}],statusField:'status',statusValues:['draft','published','archived']},
  {id:'community',label:'Community & Social Posts',group:'PUBLISHING',icon:MessageSquare,table:'social_posts',order:'created_at',fields:[{key:'content',label:'Post caption',type:'textarea',required:true},{key:'media_url',label:'Media URL',type:'url'},{key:'media_type',label:'Media type',type:'select',options:['image','video']},{key:'is_published',label:'Published',type:'boolean'}],statusField:'is_published'},
  {id:'media',label:'Media Library',group:'PUBLISHING',icon:FileImage,description:'Supabase Storage is not enabled in this project. Uploads are unavailable; existing hosted image URLs can be managed in the relevant content records.'},
  {id:'sponsors',label:'Sponsors & Partners',group:'PUBLISHING',icon:Sparkles,table:'sponsors',order:'created_at',fields:[{key:'name',label:'Sponsor name',required:true},{key:'logo_url',label:'Logo URL',type:'url'},{key:'website_url',label:'Website URL',type:'url'},{key:'description',label:'Description',type:'textarea'},{key:'status',label:'Status',type:'select',options:['pending','active','paused','ended']}],statusField:'status',statusValues:['pending','active','paused','ended']},
  {id:'pages',label:'Pages Manager',group:'WEBSITE',icon:FileText,description:'Custom page content, drafts and slugs need a pages table; it is not present in the current schema.'},
  {id:'organizers',label:'Organizer Applications',group:'PEOPLE',icon:ShieldCheck,table:'organizers',order:'created_at',readOnly:true,fields:[{key:'organization_name',label:'Organization'},{key:'contact_email',label:'Contact email'},{key:'status',label:'Review status'},{key:'created_at',label:'Applied at'}],description:'Review queue is read-only until a trusted approval workflow is configured.'},
  {id:'applications',label:'Forms & Applications',group:'PEOPLE',icon:BookOpen,table:'registrations',order:'created_at',readOnly:true,fields:[{key:'tournament_id',label:'Tournament ID'},{key:'team_id',label:'Team ID'},{key:'player_id',label:'Player ID'},{key:'registered_by',label:'Registered by'},{key:'status',label:'Status'}]},
  {id:'members',label:'Members & Users',group:'PEOPLE',icon:Users,table:'profiles',order:'created_at',readOnly:true,fields:[{key:'username',label:'Username'},{key:'display_name',label:'Display name'},{key:'country_code',label:'Country'},{key:'created_at',label:'Joined'}]},
  {id:'roles',label:'Roles & Permissions',group:'PEOPLE',icon:Shield,table:'user_roles',order:'created_at',readOnly:true,fields:[{key:'user_id',label:'User ID'},{key:'role',label:'Role'},{key:'granted_by',label:'Granted by'}],description:'Read-only: role writes are intentionally blocked by the current database security policies. Permission management requires a trusted server-side workflow.'},
  {id:'notifications',label:'Notifications',group:'PEOPLE',icon:Bell,table:'notifications',order:'created_at',readOnly:true,fields:[{key:'user_id',label:'User ID'},{key:'title',label:'Title'},{key:'body',label:'Message'},{key:'notification_type',label:'Type'},{key:'read_at',label:'Read at'}]},
  {id:'analytics',label:'Analytics & Reports',group:'INSIGHTS',icon:Gauge,description:'Database-backed counts are available. Website visitor analytics are not configured, so traffic metrics are not shown.'},
  {id:'seo',label:'SEO Manager',group:'WEBSITE',icon:Globe,description:'Page-specific SEO needs a settings/pages schema and a public website rendering connection.'},
  {id:'theme',label:'Theme & Appearance',group:'WEBSITE',icon:SlidersHorizontal,description:'Admin appearance is local to this control center. Website-wide theme publishing needs a shared settings schema.'},
  {id:'integrations',label:'Integrations',group:'SYSTEM',icon:Database,description:'No external delivery, analytics or media integrations are configured in the current project.'},
  {id:'security',label:'Security & Audit Logs',group:'SYSTEM',icon:Lock,table:'audit_logs',order:'created_at',readOnly:true,fields:[{key:'actor_id',label:'Actor'},{key:'action',label:'Action'},{key:'entity_type',label:'Entity'},{key:'entity_id',label:'Entity ID'},{key:'created_at',label:'Timestamp'}]},
  {id:'settings',label:'System Settings',group:'SYSTEM',icon:Settings,description:'System-level settings require a protected configuration table and server-side settings endpoints.'}
];

const chartData = [{day:'Mon',value:0},{day:'Tue',value:0},{day:'Wed',value:0},{day:'Thu',value:0},{day:'Fri',value:0},{day:'Sat',value:0},{day:'Sun',value:0}];
const pretty = (v:any) => v === null || v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
const toInput = (v:any, type?:string) => type === 'datetime-local' && v ? new Date(v).toISOString().slice(0,16) : v ?? (type === 'boolean' ? false : '');
const toPayload = (value:any, fields:Field[]) => Object.fromEntries(fields.filter(f => value[f.key] !== '' && value[f.key] !== undefined).map(f => [f.key, f.type === 'number' ? Number(value[f.key]) : f.type === 'datetime-local' && value[f.key] ? new Date(value[f.key]).toISOString() : value[f.key]]));

export function Dashboard(props: Props) {
  const {user,role,organizerStatus,onBack,onLogin,onLogout,authError,canManage,onRefresh} = props;
  const [tab,setTab] = useState('overview');
  const [records,setRecords] = useState<Record<string,any[]>>({});
  const [counts,setCounts] = useState<Record<string,number|null>>({});
  const [moduleErrors,setModuleErrors] = useState<Record<string,string>>({});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [query,setQuery] = useState('');
  const [globalQuery,setGlobalQuery] = useState('');
  const [navQuery,setNavQuery] = useState('');
  const [collapsed,setCollapsed] = useState(false);
  const [mobileOpen,setMobileOpen] = useState(false);
  const [light,setLight] = useState(false);
  const [editor,setEditor] = useState(false);
  const [editing,setEditing] = useState<any|null>(null);
  const [form,setForm] = useState<Record<string,any>>({});
  const [busy,setBusy] = useState(false);
  const [pageSize,setPageSize] = useState(10);
  const [pageNo,setPageNo] = useState(0);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    const targets = modules.filter(m => m.table);
    const next:Record<string,any[]> = {}; const nextCounts:Record<string,number|null> = {}; const nextErrors:Record<string,string> = {};
    const settled = await Promise.all(targets.map(async m => {
      try {
        const rows = await api<any[]>(m.table!,{select:'*',order:(m.order || 'created_at')+'.desc.nullslast',limit:'100'});
        next[m.id] = rows || []; nextCounts[m.id] = rows?.length || 0;
      } catch (e:any) { next[m.id] = []; nextCounts[m.id] = null; nextErrors[m.id] = e.message || 'Access denied or records unavailable.'; }
    }));
    setRecords(next); setCounts(nextCounts); setModuleErrors(nextErrors); setLoading(false);
  };
  useEffect(()=>{load();},[user?.id]);
  useEffect(()=>{setQuery('');setPageNo(0);setEditor(false);setEditing(null);setMobileOpen(false);},[tab]);

  const active = modules.find(m=>m.id===tab) || modules[0];
  const activeRows = records[tab] || [];
  const filtered = useMemo(()=>activeRows.filter(row=>!query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),[activeRows,query]);
  const paged = filtered.slice(pageNo*pageSize,(pageNo+1)*pageSize);
  const total = (id:string)=>counts[id] ?? null;
  const isAdmin = role === 'super_admin' || role === 'platform_admin';
  const grouped = ['WEBSITE','COMPETITION','PUBLISHING','PEOPLE','INSIGHTS','SYSTEM'];
  const choose = (id:string)=>{setTab(id);setMobileOpen(false);};
  const openCreate = ()=>{setEditing(null);setForm({});setEditor(true);};
  const openEdit = (row:any)=>{setEditing(row);setForm(Object.fromEntries((active.fields||[]).map(f=>[f.key,toInput(row[f.key],f.type)])));setEditor(true);};

  const save = async (e:FormEvent) => {
    e.preventDefault(); if(!active.table || !active.fields) return;
    setBusy(true);setNotice('');setError('');
    try {
      const payload=toPayload(form,active.fields);
      if(!editing && active.id==='teams') payload.owner_id=user!.id;
      if(!editing && active.id==='community') payload.author_id=user!.id;
      if(!editing && active.id==='news') payload.created_by=user!.id;
      if(editing) await api(active.table,{id:'eq.'+editing.id},{method:'PATCH',body:payload,prefer:'return=minimal'});
      else await api(active.table,{}, {method:'POST',body:payload,prefer:'return=minimal'});
      setNotice(editing?'Record updated successfully.':'Record created successfully.');
      setEditor(false);setEditing(null);await load();await onRefresh();
    } catch(e:any){setError(e.message||'Save failed. Database security policies may have rejected this action.');}
    finally{setBusy(false);}
  };
  const toggleStatus = async (row:any) => {
    if(!active.table || !active.statusField) return;
    const key=active.statusField; const current=row[key];
    const booleanField = ['is_active','is_public','is_published'].includes(key);
    if(!booleanField && (!active.statusValues || active.statusValues.length===0)) return;
    const next=booleanField ? !current : active.statusValues![(active.statusValues!.indexOf(current)+1)%active.statusValues!.length];
    if(!window.confirm('Change status for this record?')) return;
    setBusy(true);setError('');
    try{await api(active.table,{id:'eq.'+row.id},{method:'PATCH',body:{[key]:next},prefer:'return=minimal'});setNotice('Status updated.');await load();await onRefresh();}
    catch(e:any){setError(e.message||'Status update rejected by database policies.');}
    finally{setBusy(false);}
  };
  const remove = async (row:any) => {
    if(!active.table || !isAdmin || !window.confirm('Permanently delete this record? This cannot be undone.')) return;
    setBusy(true);setError('');
    try{await api(active.table,{id:'eq.'+row.id},{method:'DELETE',prefer:'return=minimal'});setNotice('Record deleted.');await load();await onRefresh();}
    catch(e:any){setError(e.message||'Delete rejected by database policies.');}
    finally{setBusy(false);}
  };
  const nav = (items:Module[]) => items.filter(m=>m.label.toLowerCase().includes(navQuery.toLowerCase()));
  const visibleGroups = grouped.map(g=>({name:g,items:nav(modules.filter(m=>m.group===g))})).filter(g=>g.items.length);
  const statModules = [{id:'members',label:'Registered members',icon:Users,accent:'lime'},{id:'teams',label:'Teams',icon:ShieldCheck,accent:'violet'},{id:'players',label:'Player profiles',icon:Zap,accent:'cyan'},{id:'tournaments',label:'Tournaments',icon:Trophy,accent:'lime'},{id:'matches',label:'Matches',icon:Swords,accent:'violet'},{id:'applications',label:'Registrations',icon:BookOpen,accent:'cyan'}];

  if(!hasSupabaseConfig()) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo">N</div><span className="admin-kicker">NOVA ORIGIN / CONNECTION REQUIRED</span><h1>Connect the<br/><em>control center.</em></h1><p>Supabase URL and publishable key are missing from this deployment. Add the existing project's browser-safe variables to Vercel.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Website</button></div></div>;
  if(!user) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo">N</div><span className="admin-kicker">NOVA ORIGIN / SECURE ACCESS</span><h1>Enter the<br/><em>command center.</em></h1><p>Sign in with an authorized NOVA Origin account. Access is checked against existing Supabase roles and RLS policies.</p>{authError&&<div className="admin-error">{authError}</div>}<button className="admin-signin" onClick={onLogin}><ShieldCheck size={18}/> Continue with Google</button><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Back to website</button></div></div>;
  if(!canManage) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo"><Lock/></div><span className="admin-kicker">ACCESS NOT APPROVED</span><h1>Access<br/><em>restricted.</em></h1><p>Signed in as <b>{user.email}</b>. Your account does not currently have an approved platform role.</p><div className="access-status"><span>Platform role</span><b>{role||'No role assigned'}</b><span>Organizer status</span><b>{organizerStatus||'Not registered'}</b></div><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Website</button><button className="admin-back" onClick={onLogout}><LogOut size={16}/> Sign out</button></div></div>;

  const renderOverview=()=> <div className="nc-overview">
    <div className="nc-welcome"><div><span className="nc-kicker"><span className="nc-pulse"/> PRIVATE OPERATIONS / NOVA ORIGIN</span><h1>Command <em>Center.</em></h1><p>All systems in one place. Your competitive ecosystem, at a glance.</p></div><div className="nc-welcome-actions"><button className="nc-btn ghost" onClick={()=>load()}><RefreshCw size={15}/> Refresh data</button><button className="nc-btn primary" onClick={()=>choose('tournaments')}><Plus size={15}/> Create event</button></div></div>
    <div className="nc-stat-grid">{statModules.map((s)=> <button className={'nc-stat '+s.accent} key={s.id} onClick={()=>choose(s.id)}><span className="nc-stat-icon"><s.icon size={18}/></span><span className="nc-stat-label">{s.label}</span><strong>{loading?'…':total(s.id)===null?'—':total(s.id)}</strong><small>Live database records <ArrowUpRight size={12}/></small></button>)}</div>
    <div className="nc-overview-grid"><section className="nc-panel nc-chart-panel"><div className="nc-panel-head"><div><span className="nc-kicker">DATABASE SNAPSHOT</span><h2>Current record counts</h2></div><span className="nc-chip">REAL DATA</span></div><div className="nc-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={statModules.map(s=>({day:s.label.split(' ')[0],value:total(s.id)??null}))}><defs><linearGradient id="novaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b7f56a" stopOpacity={0.3}/><stop offset="100%" stopColor="#b7f56a" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="day" tick={{fill:'#7f8a86',fontSize:10}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'#7f8a86',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#111a1b',border:'1px solid #34443a',borderRadius:12,color:'#eff6e9'}}/><Area type="monotone" dataKey="value" stroke="#b7f56a" strokeWidth={2} fill="url(#novaFill)"/></AreaChart></ResponsiveContainer></div><p className="nc-footnote">Current row counts from the connected database; this is not a historical activity chart.</p></section>
    <section className="nc-panel"><div className="nc-panel-head"><div><span className="nc-kicker">SYSTEM STATUS</span><h2>Infrastructure</h2></div><Activity size={18}/></div><div className="nc-health"><div><span className="nc-health-dot ok"/><span>Supabase API</span><b>Connected</b></div><div><span className="nc-health-dot ok"/><span>Role gate</span><b>Enforced</b></div><div><span className="nc-health-dot warn"/><span>Media Storage</span><b>Not configured</b></div><div><span className="nc-health-dot warn"/><span>Visitor analytics</span><b>Not configured</b></div></div><div className="nc-note">Some advanced modules require additional schema or trusted server-side workflows. They are marked clearly instead of showing sample data.</div></section></div>
    <div className="nc-overview-grid lower"><section className="nc-panel"><div className="nc-panel-head"><div><span className="nc-kicker">RECENT ADMIN EVENTS</span><h2>Activity timeline</h2></div><button className="nc-link" onClick={()=>choose('security')}>View logs <ArrowUpRight size={13}/></button></div>{(records.security||[]).slice(0,6).map((r:any)=><div className="nc-activity" key={r.id}><span className="nc-activity-icon"><Activity size={14}/></span><div><b>{r.action}</b><small>{r.entity_type||'System'} · {new Date(r.created_at).toLocaleString()}</small></div></div>)}{!(records.security||[]).length&&<div className="nc-empty">No admin activity records available yet.</div>}</section><section className="nc-panel"><div className="nc-panel-head"><div><span className="nc-kicker">QUICK ACCESS</span><h2>Launch a manager</h2></div><Command size={18}/></div><div className="nc-quick-grid">{['games','teams','players','tournaments','matches','news'].map(id=>{const m=modules.find(x=>x.id===id)!;return <button key={id} onClick={()=>choose(id)}><m.icon size={16}/><span>{m.label}</span><ChevronRight size={13}/></button>})}</div></section></div>
  </div>;

  const renderManager=()=> <div className="nc-manager">
    <div className="nc-manager-head"><div><span className="nc-kicker">{active.group} / CONTENT CONTROL</span><h1>{active.label}</h1><p>{active.description || 'Manage records stored in your NOVA Origin database.'}</p></div><div className="nc-manager-actions"><button className="nc-btn ghost" onClick={()=>load()}><RefreshCw size={14}/> Refresh</button>{active.table&&active.fields&&!active.readOnly&&<button className="nc-btn primary" onClick={openCreate}><Plus size={15}/> Add new</button>}</div></div>
    {active.description&&<div className="nc-capability"><AlertCircle size={17}/><div><b>Configuration requirement</b><p>{active.description}</p></div></div>}
    {editor&&active.fields&&<section className="nc-panel nc-editor"><div className="nc-panel-head"><div><span className="nc-kicker">{editing?'UPDATE RECORD':'NEW RECORD'}</span><h2>{editing?'Edit':'Create'} {active.label}</h2></div><button className="nc-icon-btn" onClick={()=>setEditor(false)}><X size={17}/></button></div><form onSubmit={save} className="nc-form">{active.fields.map(f=><label key={f.key} className={f.type==='textarea'?'wide':''}><span>{f.label}{f.required?' *':''}</span>{f.type==='textarea'?<textarea required={f.required} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>:f.type==='select'?<select required={f.required} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})}><option value="">Choose…</option>{f.options?.map(o=><option key={o} value={o}>{o}</option>)}</select>:f.type==='boolean'?<input type="checkbox" checked={!!form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.checked})}/>:<input required={f.required} type={f.type||'text'} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.hint||f.label}/>}</label>)}<div className="nc-form-actions"><button type="button" className="nc-btn ghost" onClick={()=>setEditor(false)}>Cancel</button><button className="nc-btn primary" disabled={busy}><Check size={15}/>{busy?'Saving…':'Save record'}</button></div></form></section>}
    {active.table&&<section className="nc-panel"><div className="nc-list-toolbar"><div className="nc-search"><Search size={15}/><input value={query} onChange={e=>{setQuery(e.target.value);setPageNo(0)}} placeholder={'Search '+active.label.toLowerCase()+'…'}/></div><div className="nc-toolbar-right"><span>{filtered.length} records</span><button className="nc-icon-btn" onClick={()=>setPageSize(pageSize===10?25:10)} title="Change page size"><ArrowDownUp size={15}/></button></div></div><div className="nc-table-wrap"><table className="nc-table"><thead><tr><th>Record</th>{(active.fields||[]).slice(0,4).map(f=><th key={f.key}>{f.label}</th>)}<th>Status</th><th>Actions</th></tr></thead><tbody>{paged.map((row:any)=><tr key={row.id}><td><b>{row.name||row.title||row.display_name||row.username||row.content?.slice(0,36)||row.id?.slice(0,8)||'Record'}</b><small>{row.id?.slice(0,12)}</small></td>{(active.fields||[]).slice(0,4).map(f=><td key={f.key}>{pretty(row[f.key])}</td>)}<td><span className="nc-status">{pretty(active.statusField?row[active.statusField]:row.status||row.is_published)}</span></td><td><div className="nc-row-actions">{!active.readOnly&&<button className="nc-icon-btn" onClick={()=>openEdit(row)} title="Edit"><SlidersHorizontal size={14}/></button>}{active.statusField&&(active.statusValues||['is_active','is_public','is_published'].includes(active.statusField))&&<button className="nc-icon-btn" onClick={()=>toggleStatus(row)} title="Change status"><ArrowDownUp size={14}/></button>}{isAdmin&&!active.readOnly&&<button className="nc-icon-btn danger" onClick={()=>remove(row)} title="Delete"><Archive size={14}/></button>}</div></td></tr>)}{!paged.length&&<tr><td colSpan={(active.fields?.length||0)+3}><div className="nc-empty">{loading?'Loading records…':(moduleErrors[tab] ? 'Records unavailable: '+moduleErrors[tab] : 'No records found. Add a record or adjust your search.')}</div></td></tr>}</tbody></table></div><div className="nc-pagination"><span>Showing {filtered.length? pageNo*pageSize+1:0}–{Math.min((pageNo+1)*pageSize,filtered.length)} of {filtered.length}</span><div><button className="nc-icon-btn" disabled={pageNo===0} onClick={()=>setPageNo(v=>Math.max(0,v-1))}><ChevronLeft size={15}/></button><button className="nc-icon-btn" disabled={(pageNo+1)*pageSize>=filtered.length} onClick={()=>setPageNo(v=>v+1)}><ChevronRight size={15}/></button></div></div></section>}
    {!active.table&&<section className="nc-panel nc-placeholder"><div className="nc-placeholder-icon"><active.icon size={27}/></div><h2>{active.label}</h2><p>{active.description}</p><div className="nc-requirement">No unsupported save controls are shown. This section becomes editable once the required database schema and public-site integration are implemented.</div></section>}
    {active.readOnly&&<div className="nc-note bottom-note"><ShieldCheck size={15}/> Read-only view. Database permissions and RLS determine what can be changed; this screen does not grant additional privileges.</div>}
  </div>;

  return <div className={'nova-command '+(light?'light':'')}>
    <aside className={'nc-sidebar '+(collapsed?'collapsed':'')+(mobileOpen?' mobile-open':'')}>
      <div className="nc-brand"><div className="nc-mark">N<span>✳</span></div>{!collapsed&&<div><b>NOVA ORIGIN</b><small>ULTIMATE CONTROL</small></div>}<button className="nc-collapse" onClick={()=>setCollapsed(v=>!v)} title="Collapse sidebar"><PanelLeftClose size={16}/></button></div>
      {!collapsed&&<div className="nc-workspace"><span className="nc-workspace-dot"/><span>ORIGIN WORKSPACE</span><ChevronDown size={13}/></div>}
      {!collapsed&&<div className="nc-nav-search"><Search size={14}/><input value={navQuery} onChange={e=>setNavQuery(e.target.value)} placeholder="Find a section…"/><kbd>⌘ K</kbd></div>}
      <nav className="nc-nav"><button className={'nc-nav-item '+(tab==='overview'?'active':'')} onClick={()=>choose('overview')} title="Overview"><LayoutDashboard size={17}/>{!collapsed&&<span>Overview</span>}{!collapsed&&tab==='overview'&&<i/>}</button>{visibleGroups.map(group=><div className="nc-nav-group" key={group.name}>{!collapsed&&<small>{group.name}</small>}{group.items.map(m=><button key={m.id} className={'nc-nav-item '+(tab===m.id?'active':'')} onClick={()=>choose(m.id)} title={m.label}><m.icon size={16}/>{!collapsed&&<span>{m.label}</span>}{!collapsed&&tab===m.id&&<i/>}</button>)}</div>)}</nav>
      <div className="nc-sidebar-foot">{!collapsed&&<div className="nc-secure"><ShieldCheck size={15}/><span><b>Protected session</b><small>Supabase role verified</small></span></div>}<button className="nc-user" onClick={onLogout}><span className="nc-avatar">{(user.user_metadata?.full_name||user.email||'N').slice(0,1).toUpperCase()}</span>{!collapsed&&<span><b>{user.user_metadata?.full_name||user.email}</b><small>{role?.replaceAll('_',' ')}</small></span>}<LogOut size={15}/></button></div>
    </aside>
    {mobileOpen&&<button className="nc-scrim" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"/>}
    <main className="nc-main"><header className="nc-topbar"><div className="nc-top-left"><button className="nc-mobile-menu" onClick={()=>setMobileOpen(v=>!v)}><Menu size={19}/></button><span className="nc-breadcrumb">NOVA <ChevronRight size={12}/> CONTROL CENTER <ChevronRight size={12}/> <b>{active.label}</b></span></div><div className="nc-top-actions"><div className="nc-global-search"><Search size={15}/><input value={globalQuery} onChange={e=>{setGlobalQuery(e.target.value);setQuery(e.target.value)}} placeholder="Search workspace…"/><kbd>⌘ K</kbd></div><button className="nc-icon-btn" onClick={()=>setLight(v=>!v)} title="Toggle appearance">{light?<Moon size={16}/>:<Sun size={16}/>}</button><button className="nc-icon-btn" onClick={()=>choose('notifications')} title="Notifications"><Bell size={16}/><i className="nc-unread"/></button><a className="nc-preview" href="https://nova-origin-esports.vercel.app/" target="_blank" rel="noreferrer"><Globe size={15}/> Website <ArrowUpRight size={12}/></a></div></header>
      {(error||notice)&&<div className={'nc-flash '+(error?'error':'success')}>{error||notice}<button onClick={()=>{setError('');setNotice('')}}><X size={14}/></button></div>}
      <div className="nc-content">{tab==='overview'?renderOverview():renderManager()}</div><footer className="nc-footer"><span>NOVA ORIGIN / PRIVATE OPERATIONS</span><span><span className="nc-pulse"/> SECURE CONTROL SESSION</span></footer>
    </main>
  </div>;
}
