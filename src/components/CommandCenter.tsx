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
import { api, hasSupabaseConfig, mediaPublicUrl, uploadMediaFile, deleteMediaFile, createPlayerAccount, type NovaUser } from '../lib/supabase';

type Props = { user: NovaUser | null; role: string | null; organizerStatus: string | null; onBack: () => void; onPasswordLogin: (email: string, password: string) => Promise<void>; onLogout: () => void; authError: string; canManage: boolean; onRefresh: () => Promise<void> };
type Field = { key: string; label: string; type?: 'text'|'textarea'|'number'|'date'|'datetime-local'|'url'|'boolean'|'select'|'relation'; options?: string[]; relation?: string; required?: boolean; hint?: string };
type Module = { id: string; label: string; group: string; icon: any; table?: string; fields?: Field[]; readOnly?: boolean; canCreate?: boolean; description?: string; order?: string; statusField?: string; statusValues?: string[] };
const modules: Module[] = [
  {id:'overview',label:'Overview',group:'COMMAND',icon:LayoutDashboard},
  {id:'builder',label:'Website Builder',group:'WEBSITE',icon:Compass,table:'site_pages',order:'updated_at',fields:[{key:'title',label:'Page title',required:true},{key:'slug',label:'URL slug',required:true},{key:'excerpt',label:'Short description',type:'textarea'},{key:'content_markdown',label:'Page content (Markdown)',type:'textarea'},{key:'status',label:'Status',type:'select',options:['draft','published','archived']},{key:'seo_title',label:'SEO title'},{key:'seo_description',label:'SEO description',type:'textarea'}],statusField:'status',statusValues:['draft','published','archived'],description:'Create, edit and publish standalone pages. Published pages appear on the public website at their slug URL.'},
  {id:'homepage',label:'Homepage Manager',group:'WEBSITE',icon:Home,table:'homepage_sections',order:'display_order',fields:[{key:'section_key',label:'Section key',required:true},{key:'title',label:'Heading',required:true},{key:'subtitle',label:'Subheading'},{key:'body',label:'Body content',type:'textarea'},{key:'image_url',label:'Image URL',type:'url'},{key:'button_label',label:'Button label'},{key:'button_url',label:'Button URL',type:'url'},{key:'display_order',label:'Display order',type:'number'},{key:'is_visible',label:'Visible',type:'boolean'}],statusField:'is_visible',description:'Manage homepage content, visibility and order. Visible sections are rendered on the public homepage.'},
  {id:'header',label:'Header & Navigation',group:'WEBSITE',icon:PanelLeftOpen,table:'site_navigation',order:'display_order',fields:[{key:'label',label:'Navigation label',required:true},{key:'href',label:'Destination URL',required:true},{key:'display_order',label:'Display order',type:'number'},{key:'is_visible',label:'Visible',type:'boolean'},{key:'open_in_new_tab',label:'Open in new tab',type:'boolean'}],statusField:'is_visible',description:'Manage public navigation labels, destinations, visibility and order.'},
  {id:'seo',label:'SEO Manager',group:'WEBSITE',icon:Globe,table:'seo_metadata',order:'updated_at',fields:[{key:'route_path',label:'Page route',required:true},{key:'page_title',label:'SEO title',required:true},{key:'meta_description',label:'Meta description',type:'textarea'},{key:'canonical_url',label:'Canonical URL',type:'url'},{key:'og_image_url',label:'Social preview image',type:'url'},{key:'robots_index',label:'Allow indexing',type:'boolean'}],description:'Manage page titles and descriptions used by public-page metadata.'},
  {id:'games',label:'Games Manager',group:'COMPETITION',icon:Gamepad2,table:'games',order:'created_at',fields:[{key:'name',label:'Game name',required:true},{key:'slug',label:'Slug',required:true,hint:'Unique public URL slug'},{key:'publisher',label:'Publisher'},{key:'is_active',label:'Active',type:'boolean'}],statusField:'is_active',description:'Manage the game catalogue using the existing games schema. Game art, category, platform and game-specific SEO fields are not present in this database table.'},
  {id:'game-modes',label:'Game Modes',group:'COMPETITION',icon:SlidersHorizontal,table:'game_modes',order:'name',fields:[{key:'game_id',label:'Game',type:'relation',relation:'games',required:true},{key:'name',label:'Mode name',required:true},{key:'slug',label:'Slug',required:true},{key:'team_size',label:'Team size',type:'number'},{key:'is_active',label:'Active',type:'boolean'}],statusField:'is_active'},
  {id:'teams',label:'Teams Manager',group:'COMPETITION',icon:Users,table:'teams',order:'created_at',fields:[{key:'name',label:'Team name',required:true},{key:'team_tag',label:'Team tag',required:true},{key:'game_id',label:'Game',type:'relation',relation:'games',required:true},{key:'description',label:'Description',type:'textarea'},{key:'logo_url',label:'Logo URL',type:'url'},{key:'is_public',label:'Public',type:'boolean'},{key:'status',label:'Status',type:'select',options:['active','inactive','suspended']}],statusField:'status',statusValues:['active','inactive','suspended'],description:'Create and manage teams. Owner is set to the signed-in admin automatically. Assign or remove roster members in Team Members using the player selector. The current teams table has no banner, achievements, social links or captain columns.'},
  {id:'team-members',label:'Team Members',group:'COMPETITION',icon:Users,table:'team_members',order:'joined_at',fields:[{key:'team_id',label:'Team',type:'relation',relation:'teams',required:true},{key:'user_id',label:'Player',type:'relation',relation:'players',required:true},{key:'team_role',label:'Team role',type:'select',options:['captain','igl','rusher','support','assault','player']} ]},
  {id:'player-stats',label:'Player Game Stats',group:'COMPETITION',icon:BarChart3,table:'player_game_stats',order:'updated_at',fields:[{key:'player_id',label:'Player',type:'relation',relation:'players',required:true},{key:'game_id',label:'Game',type:'relation',relation:'games',required:true},{key:'kd_ratio',label:'K/D ratio',type:'number'},{key:'average_damage',label:'Average damage',type:'number'},{key:'matches_played',label:'Matches played',type:'number'},{key:'wins',label:'Wins',type:'number'},{key:'eliminations',label:'Eliminations',type:'number'},{key:'source_label',label:'Data source',type:'select',options:['unverified','organizer_import','verified']} ]},
  {id:'players',label:'Players Manager',group:'COMPETITION',icon:Zap,table:'profiles',order:'created_at',canCreate:true,description:'Invite a new player by email. NOVA creates the linked account and profile securely; the player receives an email invitation to set their password. Upload their portrait after creation.',fields:[{key:'email',label:'Player email',required:true,hint:'player@example.com'},{key:'username',label:'Username',required:true},{key:'display_name',label:'Display name',required:true},{key:'avatar_url',label:'Avatar URL',type:'url'},{key:'bio',label:'Bio',type:'textarea'},{key:'country_code',label:'Country code'}]},
  {id:'match-participants',label:'Match Participants',group:'COMPETITION',icon:Users,table:'match_participants',order:'created_at',fields:[{key:'match_id',label:'Match',type:'relation',relation:'matches',required:true},{key:'team_id',label:'Team',type:'relation',relation:'teams'},{key:'player_id',label:'Player',type:'relation',relation:'players'},{key:'seed',label:'Seed'},{key:'created_at',label:'Added at'}],description:'Admin-managed match roster assignments. Changes are restricted to platform admins.'},
  {id:'player-match-stats',label:'Player Match Stats',group:'COMPETITION',icon:BarChart3,table:'player_match_stats',order:'created_at',fields:[{key:'match_id',label:'Match',type:'relation',relation:'matches',required:true},{key:'player_id',label:'Player',type:'relation',relation:'players',required:true},{key:'eliminations',label:'Eliminations',type:'number'},{key:'assists',label:'Assists',type:'number'},{key:'deaths',label:'Deaths',type:'number'},{key:'damage',label:'Damage',type:'number'},{key:'placement',label:'Placement',type:'number'},{key:'survival_seconds',label:'Survival seconds',type:'number'},{key:'objective_points',label:'Objective points',type:'number'},{key:'verified',label:'Verified',type:'boolean'},{key:'source_label',label:'Source'}],description:'Manage match-level player performance and verification status. Verify values against official match evidence before publishing.'},
  {id:'match-checkins',label:'Match Check-ins',group:'COMPETITION',icon:Check,table:'match_checkins',order:'checked_in_at',readOnly:true,fields:[{key:'match_id',label:'Match',type:'relation',relation:'matches'},{key:'user_id',label:'Player',type:'relation',relation:'players'},{key:'checked_in_at',label:'Checked in at'}],description:'PENDING — check-ins are generated by the tournament flow; manual override needs a dedicated audited action.'},
  {id:'tournaments',label:'Tournaments Manager',group:'COMPETITION',icon:Trophy,table:'tournaments',order:'created_at',fields:[{key:'title',label:'Tournament name',required:true},{key:'slug',label:'Slug',required:true},{key:'game_id',label:'Game',type:'relation',relation:'games',required:true},{key:'game_mode_id',label:'Game mode',type:'relation',relation:'game-modes',required:true},{key:'organizer_id',label:'Organizer',type:'relation',relation:'organizers',required:true},{key:'sponsor_id',label:'Sponsor',type:'relation',relation:'sponsors'},{key:'summary',label:'Summary',type:'textarea'},{key:'description',label:'Rules / details',type:'textarea'},{key:'banner_url',label:'Banner URL',type:'url'},{key:'format',label:'Format',type:'select',options:['battle_royale','clash_squad','classic','knockout','league','custom']},{key:'team_size',label:'Team size',type:'number'},{key:'max_entries',label:'Max entries',type:'number',required:true},{key:'entry_type',label:'Entry type',type:'select',options:['free','paid']},{key:'prize_description',label:'Prize information',type:'textarea'},{key:'registration_opens_at',label:'Registration opens',type:'datetime-local'},{key:'registration_closes_at',label:'Registration closes',type:'datetime-local'},{key:'starts_at',label:'Starts at',type:'datetime-local'},{key:'ends_at',label:'Ends at',type:'datetime-local'},{key:'status',label:'Status',type:'select',options:['draft','pending_review','published','registration_open','registration_closed','live','completed','cancelled','under_review']}],statusField:'status',statusValues:['draft','pending_review','published','registration_open','registration_closed','live','completed','cancelled','under_review'],description:'Manage tournament lifecycle and registration windows. Select related games, modes, organizers and sponsors from the available lists.'},
  {id:'matches',label:'Match Center',group:'COMPETITION',icon:Swords,table:'matches',order:'scheduled_at',fields:[{key:'tournament_id',label:'Tournament',type:'relation',relation:'tournaments',required:true},{key:'match_number',label:'Match number',type:'number',required:true},{key:'stage',label:'Stage'},{key:'round_name',label:'Round'},{key:'scheduled_at',label:'Scheduled at',type:'datetime-local'},{key:'status',label:'Status',type:'select',options:['scheduled','live','completed','cancelled']},{key:'result_status',label:'Result status',type:'select',options:['not_submitted','pending','verified','rejected']}],statusField:'status',statusValues:['scheduled','live','completed','cancelled'],description:'Schedule and manage matches under an existing tournament. The current matches table stores stage, round and schedule; scores are managed in Results & Standings.'},
  {id:'results',label:'Results & Standings',group:'COMPETITION',icon:BarChart3,table:'match_results',order:'created_at',fields:[{key:'match_id',label:'Match',type:'relation',relation:'matches',required:true},{key:'team_id',label:'Team',type:'relation',relation:'teams'},{key:'player_id',label:'Player',type:'relation',relation:'players'},{key:'placement',label:'Placement',type:'number'},{key:'eliminations',label:'Eliminations',type:'number'},{key:'points',label:'Points',type:'number'},{key:'status',label:'Status',type:'select',options:['pending','submitted','verified','rejected']},{key:'notes',label:'Verification notes',type:'textarea'}],description:'Record match scores and verification notes. Standings are not auto-calculated in the current schema; points and placement are stored per result row.'},
  {id:'news',label:'News & Announcements',group:'PUBLISHING',icon:Newspaper,table:'announcements',order:'created_at',fields:[{key:'title',label:'Title',required:true},{key:'body',label:'Content',type:'textarea',required:true},{key:'audience',label:'Audience',type:'select',options:['all','players','organizers']},{key:'status',label:'Status',type:'select',options:['draft','published','archived']},{key:'published_at',label:'Publish date',type:'datetime-local'}],statusField:'status',statusValues:['draft','published','archived']},
  {id:'community',label:'Community & Social Posts',group:'PUBLISHING',icon:MessageSquare,table:'social_posts',order:'created_at',fields:[{key:'content',label:'Post caption',type:'textarea',required:true},{key:'media_url',label:'Media URL',type:'url'},{key:'media_type',label:'Media type',type:'select',options:['image','video']},{key:'is_published',label:'Published',type:'boolean'}],statusField:'is_published'},
  {id:'media',label:'Media Library',group:'PUBLISHING',icon:FileImage,table:'media_assets',order:'created_at',readOnly:true,description:'Upload and manage images, videos and documents in the NOVA media library.'},
  {id:'sponsors',label:'Sponsors & Partners',group:'PUBLISHING',icon:Sparkles,table:'sponsors',order:'created_at',fields:[{key:'name',label:'Sponsor name',required:true},{key:'logo_url',label:'Logo URL',type:'url'},{key:'website_url',label:'Website URL',type:'url'},{key:'description',label:'Description',type:'textarea'},{key:'status',label:'Status',type:'select',options:['pending','active','paused','ended']}],statusField:'status',statusValues:['pending','active','paused','ended']},
  ,
  {id:'organizers',label:'Organizer Applications',group:'PEOPLE',icon:ShieldCheck,table:'organizers',order:'created_at',canCreate:false,fields:[{key:'user_id',label:'Account',type:'relation',relation:'players',required:true},{key:'organization_name',label:'Organization',required:true},{key:'contact_email',label:'Contact email'},{key:'logo_url',label:'Logo URL',type:'url'},{key:'status',label:'Review status',type:'select',options:['pending','approved','rejected','suspended']}],statusField:'status',statusValues:['pending','approved','rejected','suspended'],description:'Review organizer applications and approve, reject or suspend access.'},
  {id:'applications',label:'Forms & Applications',group:'PEOPLE',icon:BookOpen,table:'registrations',order:'created_at',canCreate:false,fields:[{key:'tournament_id',label:'Tournament',type:'relation',relation:'tournaments'},{key:'team_id',label:'Team',type:'relation',relation:'teams'},{key:'player_id',label:'Player',type:'relation',relation:'players'},{key:'status',label:'Application status',type:'select',options:['pending','confirmed','approved','rejected','cancelled','waitlisted']}],description:'Review tournament registrations and update their application status. Registration creation is handled by the public tournament flow.'},{id:'inquiries',label:'Public Inquiries',group:'PEOPLE',icon:LifeBuoy,table:'public_inquiries',order:'created_at',fields:[{key:'name',label:'Name',required:true},{key:'email',label:'Email',required:true},{key:'enquiry_type',label:'Enquiry type',required:true},{key:'message',label:'Message',type:'textarea',required:true},{key:'status',label:'Status',type:'select',options:['new','in_review','responded','closed']}],statusField:'status',statusValues:['new','in_review','responded','closed'],description:'Review website contact, player, team and partnership enquiries.'},
  {id:'members',label:'Members & Users',group:'PEOPLE',icon:Users,table:'profiles',order:'created_at',readOnly:true,fields:[{key:'username',label:'Username'},{key:'display_name',label:'Display name'},{key:'country_code',label:'Country'},{key:'created_at',label:'Joined'}]},
  {id:'roles',label:'Roles & Permissions',group:'PEOPLE',icon:Shield,table:'user_roles',order:'created_at',readOnly:true,fields:[{key:'role',label:'Role'}],description:'PENDING — secure server-side role grant/revoke workflow is not available yet. This section stays read-only to prevent privilege escalation.'},
  {id:'notifications',label:'Notifications',group:'PEOPLE',icon:Bell,table:'notifications',order:'created_at',fields:[{key:'user_id',label:'Recipient',type:'relation',relation:'players',required:true},{key:'title',label:'Title',required:true},{key:'body',label:'Message',type:'textarea',required:true},{key:'notification_type',label:'Type',type:'select',options:['general','system','tournament','team','security']},{key:'link_path',label:'Link path',type:'text'}],description:'Send a notification to a registered member. Select the recipient from registered player profiles.'},
  {id:'security',label:'Security & Audit Logs',group:'SYSTEM',icon:Lock,table:'audit_logs',order:'created_at',readOnly:true,fields:[{key:'action',label:'Action'},{key:'entity_type',label:'Entity'},{key:'created_at',label:'Timestamp'}],description:'Read-only audit history. Logs are immutable by design.'},
  {id:'settings',label:'System Settings',group:'SYSTEM',icon:Settings,table:'site_settings',order:'updated_at',fields:[{key:'setting_key',label:'Setting key',required:true,hint:'e.g. contact_email'},{key:'setting_value',label:'Setting value',type:'textarea',required:true},{key:'description',label:'Description',type:'textarea'}],description:'Manage non-secret NOVA site configuration values. Never store passwords, API keys or private tokens here.'}
];

const chartData = [{day:'Mon',value:0},{day:'Tue',value:0},{day:'Wed',value:0},{day:'Thu',value:0},{day:'Fri',value:0},{day:'Sat',value:0},{day:'Sun',value:0}];
const pretty = (v:any) => v === null || v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
const toInput = (v:any, type?:string) => type === 'datetime-local' && v ? (()=>{const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)})() : v ?? (type === 'boolean' ? false : '');
const toPayload = (value:any, fields:Field[]) => Object.fromEntries(fields.filter(f => value[f.key] !== '' && value[f.key] !== undefined).map(f => [f.key, f.type === 'number' ? Number(value[f.key]) : f.type === 'datetime-local' && value[f.key] ? new Date(value[f.key]).toISOString() : value[f.key]]));

export function Dashboard(props: Props) {
  const {user,role,organizerStatus,onBack,onLogout,authError,canManage,onRefresh} = props;
  const [tab,setTab] = useState('overview');
  const [records,setRecords] = useState<Record<string,any[]>>({});
  const [counts,setCounts] = useState<Record<string,number|null>>({});
  const [moduleErrors,setModuleErrors] = useState<Record<string,string>>({});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [query,setQuery] = useState('');
  const [statusFilter,setStatusFilter] = useState('all');
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
  const [loginEmail,setLoginEmail] = useState('');
  const [loginPassword,setLoginPassword] = useState('');
  const [pageNo,setPageNo] = useState(0);
  const [mediaCategory,setMediaCategory] = useState('general');
  const [selectedIds,setSelectedIds] = useState<string[]>([]);
  const [sortRules,setSortRules] = useState<{key:string;direction:'asc'|'desc'}[]>([]);
  const [bulkStatus,setBulkStatus] = useState('');


  const uploadPlayerPhoto = async (player:any, file?:File) => {
    if(!file || !isAdmin) return;
    if(!file.type.startsWith('image/')) { setError('Player photo ke liye JPG, PNG, WEBP ya GIF image select karo.'); return; }
    if(file.size > 10*1024*1024) { setError('Player photo 10 MB se chhoti honi chahiye.'); return; }
    setBusy(true); setError(''); setNotice('');
    let uploadedPath='';
    try {
      const safeName=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-80)||'portrait';
      uploadedPath='player/'+player.id+'/'+Date.now()+'-'+safeName;
      await uploadMediaFile(file,uploadedPath);
      const url=mediaPublicUrl(uploadedPath);
      await api('profiles',{id:'eq.'+player.id},{method:'PATCH',body:{avatar_url:url},prefer:'return=minimal'});
      try { await api('media_assets',{}, {method:'POST',body:{bucket_id:'nova-media',object_path:uploadedPath,file_name:file.name,mime_type:file.type,file_size:file.size,category:'player',uploaded_by:user!.id},prefer:'return=minimal'}); } catch { /* The profile image is already saved; the Media Library metadata can be reconciled later. */ }
      setNotice('Player photo saved and linked to the profile.');
      await load();
    } catch(e:any) {
      if(uploadedPath) { try { await deleteMediaFile(uploadedPath); } catch { /* Keep the original profile update error. */ } }
      setError(e.message||'Player photo upload failed.');
    } finally { setBusy(false); }
  };

  const uploadMedia = async (file?: File) => {
    if(!file || !isAdmin) return;
    const allowed=['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf'];
    if(!allowed.includes(file.type)){setError('Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4, WEBM or PDF.');return;}
    if(file.size>50*1024*1024){setError('File is larger than the 50 MB limit.');return;}
    setBusy(true);setError('');setNotice('');
    let uploadedPath='';
    try{
      const safeName=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-100)||'asset';
      const path=mediaCategory+'/'+Date.now()+'-'+safeName;
      uploadedPath=path;
      await uploadMediaFile(file,path);
      await api('media_assets',{}, {method:'POST',body:{bucket_id:'nova-media',object_path:path,file_name:file.name,mime_type:file.type,file_size:file.size,category:mediaCategory,uploaded_by:user!.id},prefer:'return=minimal'});
      setNotice('File uploaded successfully.');await load();
    }catch(e:any){if(uploadedPath){try{await deleteMediaFile(uploadedPath);}catch{/* Preserve the original upload error; cleanup can be retried from Storage. */}}setError(e.message||'Upload failed.');}
    finally{setBusy(false);}
  };
  const removeMedia = async (row:any) => {
    if(!isAdmin || !window.confirm('Delete this media file permanently?')) return;
    setBusy(true);setError('');setNotice('');
    try{
      await deleteMediaFile(row.object_path);
      await api('media_assets',{id:'eq.'+row.id},{method:'DELETE',prefer:'return=minimal'});
      setNotice('Media file deleted.');await load();
    }catch(e:any){setError(e.message||'Media deletion failed.');}
    finally{setBusy(false);}
  };
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
  useEffect(()=>{setQuery('');setStatusFilter('all');setPageNo(0);setSelectedIds([]);setSortRules([]);setBulkStatus('');setEditor(false);setEditing(null);setMobileOpen(false);},[tab]);

  const active = modules.find(m=>m.id===tab) || modules[0];
  const activeRows = records[tab] || [];
  const filtered = useMemo(()=>{
    const rows=activeRows.filter(row=>(!query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))&&(statusFilter==='all'||String(row[active.statusField||'status'])===statusFilter));
    if(!sortRules.length)return rows;
    return [...rows].sort((a,b)=>{for(const rule of sortRules){const av=a[rule.key],bv=b[rule.key];const cmp=av==null?(bv==null?0:-1):bv==null?1:typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});if(cmp)return rule.direction==='asc'?cmp:-cmp;}return 0;});
  },[activeRows,query,statusFilter,active.statusField,sortRules]);
  const paged = filtered.slice(pageNo*pageSize,(pageNo+1)*pageSize);
  const toggleSort=(key:string,additive=false)=>setSortRules(current=>{const found=current.find(x=>x.key===key);if(!additive)return [{key,direction:found&&found.direction==='asc'?'desc':'asc'}];if(!found)return [...current,{key,direction:'asc'}];return current.map(x=>x.key===key?{...x,direction:x.direction==='asc'?'desc':'asc'}:x);});
  const exportRows=(rows:any[])=>{if(!rows.length){setError('There are no records to export.');return;}const keys=Array.from(new Set(['id',...(active.fields||[]).map(field=>field.key)]));const quote=(value:any)=>{const v=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);return '"'+v.replace(/"/g,'""')+'"';};const csv=[keys.map(quote).join(','),...rows.map(row=>keys.map(key=>quote(row[key])).join(','))].join('\\r\\n');const blob=new Blob(['\\uFEFF',csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='nova-'+active.id+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);};
  const bulkUpdateStatus=async()=>{if(!active.table||!active.statusField||!selectedIds.length||!isAdmin||bulkStatus==='')return;if(!window.confirm('Update '+selectedIds.length+' selected records?'))return;setBusy(true);setError('');try{await Promise.all(selectedIds.map(id=>api(active.table!,{id:'eq.'+id},{method:'PATCH',body:{[active.statusField!]:bulkStatus==='true'?true:bulkStatus==='false'?false:bulkStatus},prefer:'return=minimal'})));setNotice(selectedIds.length+' records updated.');setSelectedIds([]);setBulkStatus('');await load();await onRefresh();}catch(e:any){setError(e.message||'Bulk update failed. Some records may need review; refresh before retrying.');await load();}finally{setBusy(false);}};
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
      for(const field of active.fields){const value=form[field.key];if(field.required&&(value===undefined||value===null||String(value).trim()===''))throw new Error(field.label+' is required.');if(field.type==='number'&&value!==''&&value!==undefined&&!Number.isFinite(Number(value)))throw new Error(field.label+' must be a valid number.');if(field.type==='url'&&value){try{const parsed=new URL(String(value));if(!['http:','https:'].includes(parsed.protocol))throw new Error();}catch{throw new Error(field.label+' must be a valid http/https URL.');}}}
      if(active.id==='players' && !editing){
        const result=await createPlayerAccount({email:String(form.email||''),username:String(form.username||''),display_name:String(form.display_name||''),bio:String(form.bio||''),country_code:String(form.country_code||'')});
        setNotice(result.message);
        setEditor(false);setEditing(null);await load();await onRefresh();return;
      }
      if(active.id==='settings'){payload.updated_by=user!.id;payload.updated_at=new Date().toISOString();}
      if(['homepage','header','seo','builder'].includes(active.id)){payload.updated_by=user!.id;payload.updated_at=new Date().toISOString();}
      if(active.id==='builder'){payload.updated_at=new Date().toISOString();if(payload.status==='published'&&!editing?.published_at)payload.published_at=new Date().toISOString();}
      if(active.id==='organizers'){payload.reviewed_by=user!.id;payload.reviewed_at=new Date().toISOString();}
      if(active.id==='notifications' && !editing) payload.notification_type=payload.notification_type||'general';
      if(active.id==='news'&&payload.status==='published'&&!payload.published_at)payload.published_at=new Date().toISOString();
      if(active.id==='news'&&payload.status!=='published')payload.published_at=null;
      if(!editing && active.id==='teams') payload.owner_id=user!.id;
      if(['teams','tournaments','matches','profiles','site_pages','homepage','header','seo','community'].includes(active.id)) payload.updated_at=new Date().toISOString();
      if(active.id==='results' && payload.status==='verified'){payload.verified_by=user!.id;payload.verified_at=new Date().toISOString();}
      if(!editing && active.id==='community') payload.author_id=user!.id;
      if(!editing && active.id==='news') payload.created_by=user!.id;
      if(editing) await api(active.table,{id:'eq.'+editing.id},{method:'PATCH',body:payload,prefer:'return=minimal'});
      else await api(active.table,{}, {method:'POST',body:payload,prefer:'return=minimal'});
      try{await api('audit_logs',{}, {method:'POST',body:{actor_id:user!.id,action:editing?'update':'create',entity_type:active.id,entity_id:editing?.id||null,metadata:{fields:Object.keys(payload)}},prefer:'return=minimal'});}catch{}
      setNotice(editing?'Record updated successfully.':'Record created successfully.');
      setEditor(false);setEditing(null);await load();await onRefresh();
    } catch(e:any){setError(e.message||'Save failed. Database security policies may have rejected this action.');}
    finally{setBusy(false);}
  };
  const toggleStatus = async (row:any) => {
    if(!active.table || !active.statusField) return;
    const key=active.statusField; const current=row[key];
    const booleanField = typeof current === 'boolean' || ['is_active','is_public','is_published','is_visible','robots_index'].includes(key);
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
    try{
      if(active.id==='games'){
        const dependencies = await Promise.all(['game_modes','teams','tournaments'].map(async table => {
          const rows = await api<any[]>(table,{select:'id',game_id:'eq.'+row.id,limit:'1'});
          return rows?.length ? table : null;
        }));
        const linked = dependencies.filter(Boolean);
        if(linked.length){
          const labels:Record<string,string>={game_modes:'game modes',teams:'teams',tournaments:'tournaments'};
          setError('This game is still in use by '+linked.map(x=>labels[x!]||x).join(', ')+'. Delete or reassign those linked records first. You can also switch this game to inactive instead of deleting it.');
          return;
        }
      }
      await api(active.table,{id:'eq.'+row.id},{method:'DELETE',prefer:'return=minimal'});
      try{await api('audit_logs',{}, {method:'POST',body:{actor_id:user!.id,action:'delete',entity_type:active.id,entity_id:row.id,metadata:{}},prefer:'return=minimal'});}catch{}
      setNotice('Record deleted.');await load();await onRefresh();
    }
    catch(e:any){
      const msg=String(e.message||'');
      if(msg.includes('23503')||msg.toLowerCase().includes('foreign key')||msg.toLowerCase().includes('still referenced')){
        setError('This record is linked to other data and cannot be deleted yet. Remove or reassign the linked records first; if you only want to hide it, change its status to inactive.');
      } else setError(msg||'Delete rejected by database policies.');
    }
    finally{setBusy(false);}
  };
  const nav = (items:Module[]) => items.filter(m=>m.label.toLowerCase().includes(navQuery.toLowerCase()));
  const visibleGroups = grouped.map(g=>({name:g,items:nav(modules.filter(m=>m.group===g))})).filter(g=>g.items.length);
  const statModules = [{id:'members',label:'Registered members',icon:Users,accent:'lime'},{id:'teams',label:'Teams',icon:ShieldCheck,accent:'violet'},{id:'players',label:'Player profiles',icon:Zap,accent:'cyan'},{id:'tournaments',label:'Tournaments',icon:Trophy,accent:'lime'},{id:'matches',label:'Matches',icon:Swords,accent:'violet'},{id:'applications',label:'Registrations',icon:BookOpen,accent:'cyan'}];

  if(!hasSupabaseConfig()) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo">N</div><span className="admin-kicker">NOVA ORIGIN / CONNECTION REQUIRED</span><h1>Connect the<br/><em>control center.</em></h1><p>Supabase URL and publishable key are missing from this deployment. Add the existing project's browser-safe variables to Vercel.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Website</button></div></div>;
  if(!user) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo">N</div><span className="admin-kicker">NOVA ORIGIN / SECURE ACCESS</span><h1>Enter the<br/><em>command center.</em></h1><p>Owner and approved platform admins only. Sign in using your registered email and password.</p>{authError&&<div className="admin-error">{authError}</div>}<div className="admin-login-divider"><span>ADMIN CREDENTIALS</span></div><form className="admin-email-login" onSubmit={e=>{e.preventDefault();if(loginEmail.trim()&&loginPassword) void props.onPasswordLogin(loginEmail,loginPassword);}}><input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="Admin email address" autoComplete="username" required/><input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required/><button className="admin-signin" type="submit"><ShieldCheck size={18}/> Sign in to command center</button></form><small className="admin-login-note">Only an existing Supabase account with an approved platform role can enter. Public signups are disabled.</small><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Back to website</button></div></div>;
  if(!canManage) return <div className="admin-screen"><div className="admin-login-card"><div className="admin-logo"><Lock/></div><span className="admin-kicker">ACCESS NOT APPROVED</span><h1>Access<br/><em>restricted.</em></h1><p>Signed in as <b>{user.email}</b>. Your account does not currently have an approved platform role.</p><div className="access-status"><span>Platform role</span><b>{role||'No role assigned'}</b><span>Organizer status</span><b>{organizerStatus||'Not registered'}</b></div><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Website</button><button className="admin-back" onClick={onLogout}><LogOut size={16}/> Sign out</button></div></div>;

  const renderOverview=()=> <div className="nc-overview">
    <div className="nc-welcome"><div><span className="nc-kicker"><span className="nc-pulse"/> PRIVATE OPERATIONS / NOVA ORIGIN</span><h1>Command <em>Center.</em></h1><p>All systems in one place. Your competitive ecosystem, at a glance.</p></div><div className="nc-welcome-actions"><button className="nc-btn ghost" onClick={()=>load()}><RefreshCw size={15}/> Refresh data</button><button className="nc-btn primary" onClick={()=>choose('tournaments')}><Plus size={15}/> Create event</button></div></div>
    <div className="nc-stat-grid">{statModules.map((s)=> <button className={'nc-stat '+s.accent} key={s.id} onClick={()=>choose(s.id)}><span className="nc-stat-icon"><s.icon size={18}/></span><span className="nc-stat-label">{s.label}</span><strong>{loading?'…':total(s.id)===null?'—':total(s.id)}</strong><small>Live database records <ArrowUpRight size={12}/></small></button>)}</div>
    <div className="nc-overview-grid"><section className="nc-panel nc-chart-panel"><div className="nc-panel-head"><div><span className="nc-kicker">DATABASE SNAPSHOT</span><h2>Current record counts</h2></div><span className="nc-chip">REAL DATA</span></div><div className="nc-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={statModules.map(s=>({day:s.label.split(' ')[0],value:total(s.id)??null}))}><defs><linearGradient id="novaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b7f56a" stopOpacity={0.3}/><stop offset="100%" stopColor="#b7f56a" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="day" tick={{fill:'#7f8a86',fontSize:10}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'#7f8a86',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#111a1b',border:'1px solid #34443a',borderRadius:12,color:'#eff6e9'}}/><Area type="monotone" dataKey="value" stroke="#b7f56a" strokeWidth={2} fill="url(#novaFill)"/></AreaChart></ResponsiveContainer></div><p className="nc-footnote">Current row counts from the connected database; this is not a historical activity chart.</p></section>
    <section className="nc-panel"><div className="nc-panel-head"><div><span className="nc-kicker">SYSTEM STATUS</span><h2>Infrastructure</h2></div><Activity size={18}/></div><div className="nc-health"><div><span className="nc-health-dot ok"/><span>Supabase API</span><b>Connected</b></div><div><span className="nc-health-dot ok"/><span>Role gate</span><b>Enforced</b></div><div><span className="nc-health-dot ok"/><span>Media Storage</span><b>Configured</b></div><div><span className="nc-health-dot warn"/><span>Visitor analytics</span><b>Not configured</b></div></div><div className="nc-note">Some advanced modules require additional schema or trusted server-side workflows. They are marked clearly instead of showing sample data.</div></section></div>
    <div className="nc-overview-grid lower"><section className="nc-panel"><div className="nc-panel-head"><div><span className="nc-kicker">RECENT ADMIN EVENTS</span><h2>Activity timeline</h2></div><button className="nc-link" onClick={()=>choose('security')}>View logs <ArrowUpRight size={13}/></button></div>{(records.security||[]).slice(0,6).map((r:any)=><div className="nc-activity" key={r.id}><span className="nc-activity-icon"><Activity size={14}/></span><div><b>{r.action}</b><small>{r.entity_type||'System'} · {new Date(r.created_at).toLocaleString()}</small></div></div>)}{!(records.security||[]).length&&<div className="nc-empty">No admin activity records available yet.</div>}</section><section className="nc-panel"><div className="nc-panel-head"><div><span className="nc-kicker">QUICK ACCESS</span><h2>Launch a manager</h2></div><Command size={18}/></div><div className="nc-quick-grid">{['games','teams','players','tournaments','matches','news'].map(id=>{const m=modules.find(x=>x.id===id)!;return <button key={id} onClick={()=>choose(id)}><m.icon size={16}/><span>{m.label}</span><ChevronRight size={13}/></button>})}</div></section></div>
  </div>;

  const renderManager=()=> <div className="nc-manager">
    <div className="nc-manager-head"><div><span className="nc-kicker">{active.group} / CONTENT CONTROL</span><h1>{active.label}</h1><p>{active.description || 'Manage records stored in your NOVA Origin database.'}</p></div><div className="nc-manager-actions"><button className="nc-btn ghost" onClick={()=>load()}><RefreshCw size={14}/> Refresh</button>{active.table&&active.fields&&!active.readOnly&&active.canCreate!==false&&<button className="nc-btn primary" onClick={openCreate}><Plus size={15}/> Add new</button>}</div></div>
    {active.description&&<div className="nc-capability"><AlertCircle size={17}/><div><b>Manager notes</b><p>{active.description}</p></div></div>}
    {editor&&active.fields&&<section className="nc-panel nc-editor"><div className="nc-panel-head"><div><span className="nc-kicker">{editing?'UPDATE RECORD':'NEW RECORD'}</span><h2>{editing?'Edit':'Create'} {active.label}</h2></div><button className="nc-icon-btn" onClick={()=>setEditor(false)}><X size={17}/></button></div><form onSubmit={save} className="nc-form">{active.fields.filter(f=>!(active.id==='players'&&editing&&(f.key==='id'||f.key==='email'))).map(f=><label key={f.key} className={f.type==='textarea'?'wide':''}><span>{f.label}{f.required?' *':''}</span>{f.type==='textarea'?<textarea required={f.required} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>:f.type==='select'?<select required={f.required} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})}><option value="">Choose…</option>{f.options?.map(o=><option key={o} value={o}>{o}</option>)}</select>:f.type==='relation'?<select required={f.required} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})}><option value="">Choose {f.label.toLowerCase()}…</option>{(records[f.relation||'']||[]).map((item:any)=><option key={item.id} value={item.id}>{item.name||item.title||item.display_name||item.username||item.organization_name||item.slug||item.id}</option>)}</select>:f.type==='boolean'?<input type="checkbox" checked={!!form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.checked})}/>:<><input required={f.required} type={f.type||'text'} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.hint||f.label}/>{['image_url','logo_url','avatar_url','banner_url','og_image_url','media_url'].includes(f.key)&&form[f.key]&&/^https?:\/\//i.test(String(form[f.key]))&&<img className="nc-form-image-preview" src={String(form[f.key])} alt={f.label+' preview'} loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>}</>}</label>)}<div className="nc-form-actions"><button type="button" className="nc-btn ghost" onClick={()=>setEditor(false)}>Cancel</button><button className="nc-btn primary" disabled={busy}><Check size={15}/>{busy?'Saving…':'Save record'}</button></div></form></section>}
    {active.id==='players'&&<section className="nc-panel">
      <div className="nc-panel-head"><div><span className="nc-kicker">PLAYER PROFILE / PORTRAITS</span><h2>Upload roster photos</h2><p>Choose a profile below and upload its portrait. The photo is saved to Storage and linked to that player's profile.</p></div><Users size={20}/></div>
      <div className="nc-media-grid">{activeRows.map((player:any)=><article className="nc-media-card" key={player.id}>
        {player.avatar_url?<img src={player.avatar_url} alt={player.display_name||player.username||'Player'} loading="lazy"/>:<div className="nc-media-file"><Users size={28}/><span>No profile photo</span></div>}
        <b>{player.display_name||player.username||'Player'}</b><small>@{player.username||'no-username'}</small>
        <label className="nc-btn ghost"><Upload size={14}/> {player.avatar_url?'Replace photo':'Upload photo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy||!isAdmin} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPlayerPhoto(player,file);e.currentTarget.value='';}} hidden/></label>
      </article>)}{!activeRows.length&&<div className="nc-empty">{loading?'Loading player profiles…':'No player profiles found yet.'}</div>}</div>
    </section>}
    {active.id==='media'&&<section className="nc-panel">
      <div className="nc-panel-head"><div><span className="nc-kicker">NOVA STORAGE / ASSETS</span><h2>Upload media</h2><p>Files are publicly viewable; only platform admins can upload or delete.</p></div><FileImage size={20}/></div>
      <div className="nc-form">
        <label><span>Asset category</span><select value={mediaCategory} onChange={e=>setMediaCategory(e.target.value)}><option value="general">General</option><option value="brand">Brand</option><option value="player">Player</option><option value="team">Team</option><option value="tournament">Tournament</option><option value="news">News</option><option value="homepage">Homepage</option><option value="document">Document</option><option value="video">Video</option></select></label>
        <label className="wide"><span>Choose file (max 50 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf" disabled={busy||!isAdmin} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadMedia(file);e.currentTarget.value='';}}/></label>
      </div>
      <div className="nc-media-grid">{paged.map((row:any)=><article className="nc-media-card" key={row.id}>
        {row.mime_type?.startsWith('image/')?<img src={mediaPublicUrl(row.object_path)} alt={row.alt_text||row.file_name}/>:<div className="nc-media-file"><FileText size={28}/><span>{row.mime_type}</span></div>}
        <b>{row.file_name}</b><small>{row.category} · {Math.max(1,Math.round(row.file_size/1024))} KB</small>
        <div className="nc-row-actions"><button className="nc-icon-btn" onClick={()=>navigator.clipboard?.writeText(mediaPublicUrl(row.object_path))} title="Copy public URL"><ArrowUpRight size={14}/></button><button className="nc-icon-btn danger" disabled={busy} onClick={()=>removeMedia(row)} title="Delete media"><Archive size={14}/></button></div>
      </article>)}{!paged.length&&<div className="nc-empty">{loading?'Loading media…':'No media uploaded yet.'}</div>}</div>
    </section>}
    {active.table&&active.id!=='media'&&<section className="nc-panel"><div className="nc-list-toolbar"><div className="nc-search"><Search size={15}/><input value={query} onChange={e=>{setQuery(e.target.value);setPageNo(0);setSelectedIds([])}} placeholder={'Search '+active.label.toLowerCase()+'…'}/></div><div className="nc-toolbar-right"><button className="nc-btn ghost" onClick={()=>exportRows(filtered)} disabled={!filtered.length}>Export CSV</button>{active.statusField&&<select aria-label="Filter by status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPageNo(0)}}><option value="all">All statuses</option>{(active.statusValues||active.fields?.find(f=>f.key===active.statusField)?.options||[]).map(v=><option key={v} value={v}>{v}</option>)}{typeof activeRows[0]?.[active.statusField]==="boolean"&&<><option value="true">Active</option><option value="false">Inactive</option></>}</select>}<span>{filtered.length} records</span><button className="nc-icon-btn" onClick={()=>setPageSize(pageSize===10?25:10)} title="Change page size"><ArrowDownUp size={15}/></button></div></div><div className="nc-table-wrap"><table className="nc-table"><thead><tr><th><input aria-label="Select all visible records" type="checkbox" checked={paged.length>0&&paged.every((row:any)=>selectedIds.includes(row.id))} onChange={e=>setSelectedIds(e.target.checked?Array.from(new Set([...selectedIds,...paged.map((row:any)=>row.id)])):selectedIds.filter(id=>!paged.some((row:any)=>row.id===id)))} /></th><th>Record</th>{(active.fields||[]).slice(0,4).map(f=><th key={f.key}><button className="nc-table-sort" onClick={e=>toggleSort(f.key,e.shiftKey)}>{f.label}{sortRules.some(x=>x.key===f.key)?(sortRules.find(x=>x.key===f.key)?.direction==='asc'?' ↑':' ↓'):''}</button></th>)}<th>Status</th><th>Actions</th></tr></thead><tbody>{paged.map((row:any)=><tr key={row.id}><td><input aria-label="Select record" type="checkbox" checked={selectedIds.includes(row.id)} onChange={e=>setSelectedIds(e.target.checked?[...selectedIds,row.id]:selectedIds.filter(id=>id!==row.id))}/></td><td><b>{row.name||row.title||row.display_name||row.username||row.content?.slice(0,36)||'Record'}</b></td>{(active.fields||[]).slice(0,4).map(f=><td key={f.key}>{f.type==='relation'?((records[f.relation||'']||[]).find((item:any)=>item.id===row[f.key])?.name||(records[f.relation||'']||[]).find((item:any)=>item.id===row[f.key])?.title||(records[f.relation||'']||[]).find((item:any)=>item.id===row[f.key])?.display_name||(records[f.relation||'']||[]).find((item:any)=>item.id===row[f.key])?.username||'—'):pretty(row[f.key])}</td>)}<td><span className="nc-status">{pretty(active.statusField?row[active.statusField]:row.status||row.is_published)}</span></td><td><div className="nc-row-actions">{!active.readOnly&&<button className="nc-icon-btn" onClick={()=>openEdit(row)} title="Edit"><SlidersHorizontal size={14}/></button>}{active.statusField&&(active.statusValues||['is_active','is_public','is_published'].includes(active.statusField))&&<button className="nc-icon-btn" onClick={()=>toggleStatus(row)} title="Change status"><ArrowDownUp size={14}/></button>}{isAdmin&&!active.readOnly&&<button className="nc-icon-btn danger" onClick={()=>remove(row)} title="Delete"><Archive size={14}/></button>}</div></td></tr>)}{!paged.length&&<tr><td colSpan={(active.fields?.length||0)+3}><div className="nc-empty">{loading?'Loading records…':(moduleErrors[tab] ? 'Records unavailable: '+moduleErrors[tab] : 'No records found. Add a record or adjust your search.')}</div></td></tr>}</tbody></table></div>{selectedIds.length>0&&<div className="nc-bulk-bar"><b>{selectedIds.length} selected</b>{active.statusField&&isAdmin&&<><select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}><option value="">Choose bulk status…</option>{(active.statusValues||[]).map((v:string)=><option key={v} value={v}>{v}</option>)}{['is_active','is_public','is_published','is_visible','robots_index'].includes(active.statusField)&&<><option value="true">Active / On</option><option value="false">Inactive / Off</option></>}</select><button className="nc-btn primary" disabled={busy||!bulkStatus} onClick={bulkUpdateStatus}>Apply to selected</button></>}<button className="nc-btn ghost" onClick={()=>exportRows(filtered.filter(row=>selectedIds.includes(row.id)))}>Export selected</button><button className="nc-btn ghost" onClick={()=>setSelectedIds([])}>Clear</button></div>}<div className="nc-pagination"><span>Showing {filtered.length? pageNo*pageSize+1:0}–{Math.min((pageNo+1)*pageSize,filtered.length)} of {filtered.length}</span><div><button className="nc-icon-btn" disabled={pageNo===0} onClick={()=>setPageNo(v=>Math.max(0,v-1))}><ChevronLeft size={15}/></button><button className="nc-icon-btn" disabled={(pageNo+1)*pageSize>=filtered.length} onClick={()=>setPageNo(v=>v+1)}><ChevronRight size={15}/></button></div></div></section>}
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
