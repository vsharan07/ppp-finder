// Shared by the finder, the site update form, and the staff screen. scripts/build.py pastes this file into each page.
const PP={
  // How long an enrollment answer counts before the finder stops showing it, and how often the rest of a
  // listing should be re-checked. Both are starting proposals for Parent Possible to set.
  STALE_DAYS:45,
  DETAILS_STALE_DAYS:180,
  DUE_SOON_DAYS:10,
  DRAFT_KEY:'ppFinderDraft', REQ_KEY:'ppFinderRequests',
  INBOX:'[Parent Possible intake inbox]',
  AGES:['Prenatal','Birth to 1','1 to 2','2 to 3','3 to 4','4 to 5','5 and older'],
  STATUSES:['enrolling','waitlist','closed'],
  STATUS_LABEL:{enrolling:'Taking new families',waitlist:'Waitlist',closed:'Not taking new families',unknown:'Not confirmed'},
  // Details that belong to the whole organization, so one edit changes the listing in every county it serves.
  FIELDS:{name:'Program name',contactName:'Referral contact',email:'Referral email',phone:'Phone',website:'Website',
    address:'Office address',city:'Office city',zip:'Office ZIP',languages:'Languages',ages:'Ages served',counties:'Counties served'},

  iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
  today(){return PP.iso(new Date())},
  daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return PP.iso(d)},
  parse(iso){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null},
  daysSince(iso){const d=PP.parse(iso);if(!d)return Infinity;const n=new Date();n.setHours(0,0,0,0);return Math.round((n-d)/864e5)},
  fmtDate(iso,locale){const d=PP.parse(iso);return d?d.toLocaleDateString(locale||'en-US',{month:'short',day:'numeric',year:'numeric'}):''},

  // Enrollment for one site in one county. Enrollment is stored per county because a site can be open in one
  // county and full in the next. An answer that is missing or too old comes back as 'unknown', never as 'closed'.
  status(site,county){
    const e=(site.enrollment||{})[county];
    if(!e||!PP.STATUSES.includes(e.status))return {status:'unknown',confirmed:''};
    if(PP.daysSince(e.confirmed)>PP.STALE_DAYS)return {status:'unknown',confirmed:e.confirmed,was:e.status};
    return {status:e.status,confirmed:e.confirmed};
  },
  // Where an "I'm interested" request should go. Empty means it goes to Parent Possible to forward.
  referralEmail(site){return site.emailBounced?'':(site.email||'')},

  read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v==null?fallback:v}catch(e){return fallback}},
  write(key,v){try{if(v==null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(v));return true}catch(e){return false}},
  copy(o){return JSON.parse(JSON.stringify(o))},
  same(a,b){return JSON.stringify(a)===JSON.stringify(b)},
  slug(t){return t.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')},
  esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))},
  // Same order as scripts/clean.py: by program, then by name.
  sortSites(list){const cmp=(x,y)=>x<y?-1:x>y?1:0;list.sort((a,b)=>cmp(a.program,b.program)||cmp(a.name,b.name));list.forEach((s,i)=>{s.id=i});return list},
  toast(msg){
    const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=msg;
    document.body.append(el);setTimeout(()=>el.remove(),2400);
  },

  // What differs between two versions of a listing, as a list of single changes.
  diff(a,b){
    const out=[];
    Object.keys(PP.FIELDS).forEach(f=>{
      const blank=Array.isArray(a[f])||Array.isArray(b[f])?[]:'';
      const x=a[f]==null?blank:a[f],y=b[f]==null?blank:b[f];
      if(!PP.same(x,y))out.push({field:f,from:x,to:y});
    });
    (b.counties||[]).forEach(c=>{
      const x=(a.enrollment||{})[c]||{},y=(b.enrollment||{})[c]||{};
      if((x.status||'unknown')!==(y.status||'unknown')||(x.confirmed||'')!==(y.confirmed||''))
        out.push({field:'enrollment',county:c,from:x.status||'unknown',to:y.status||'unknown',confirmed:y.confirmed||''});
    });
    return out;
  },
  // Apply one change to a listing. `date` is the day the site confirmed it.
  apply(site,ch,date){
    if(ch.field==='enrollment'){
      site.enrollment=site.enrollment||{};
      if(ch.to==='unknown')delete site.enrollment[ch.county];
      else site.enrollment[ch.county]={status:ch.to,confirmed:ch.confirmed||date};
      if(!Object.keys(site.enrollment).length)delete site.enrollment;
      return;
    }
    site[ch.field]=PP.copy(ch.to);
    if(ch.field==='email')delete site.emailBounced;
    if(ch.field==='counties'){
      site.counties.sort();
      Object.keys(site.enrollment||{}).forEach(c=>{if(!site.counties.includes(c))delete site.enrollment[c]});
    }
  },
  // Words for a change, for the review step and the staff screen.
  show(v){return Array.isArray(v)?(v.join(', ')||'None listed'):(v||'Blank')},
  label(ch){return ch.field==='enrollment'?'Enrollment':PP.FIELDS[ch.field]},
  scope(ch,site){
    if(ch.field==='enrollment')return ch.county+' County only';
    const n=((site&&site.counties)||[]).length;
    return n>1?'All '+n+' counties':'Whole listing';
  },
  fromTo(ch){
    if(ch.field==='enrollment')return [PP.STATUS_LABEL[ch.from]||ch.from,PP.STATUS_LABEL[ch.to]||ch.to];
    return [PP.show(ch.from),PP.show(ch.to)];
  },

  // Update requests travel as a short code so one can be pasted from an email into the staff screen.
  encode(o){return 'PP-UPDATE:'+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))+':END'},
  decode(text){
    const m=/PP-UPDATE:([A-Za-z0-9+\/=\s]+?):END/.exec(text||'');if(!m)return null;
    try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(m[1].replace(/\s+/g,'')),c=>c.charCodeAt(0))))}catch(e){return null}
  },
  async clip(text){
    try{await navigator.clipboard.writeText(text);return true}catch(e){}
    const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.append(ta);ta.select();
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}
    ta.remove();return ok;
  },
};

// One change as a row: what changed, how far it reaches, and before and after. Used on the update form and the staff screen.
PP.changeRow=function(ch,site,lead){
  const e=PP.esc,[from,to]=PP.fromTo(ch),enr=ch.field==='enrollment';
  let ft;
  if(enr){
    const pill=`<span class="st ${e(ch.to)}">${e(to)}</span>`;
    ft=ch.from===ch.to?`${pill} <span class="note">No change, confirmed again</span>`:`<span class="from">${e(from)}</span><span class="arrow">→</span>${pill}`;
  }else if(Array.isArray(ch.to)){
    const add=ch.to.filter(x=>!(ch.from||[]).includes(x)),drop=(ch.from||[]).filter(x=>!ch.to.includes(x));
    ft=`<span class="to">${e(to)}</span> <span class="note">${e([add.length?'Adds '+add.join(', '):'',drop.length?'Removes '+drop.join(', '):''].filter(Boolean).join('. '))}</span>`;
  }else if(!ch.from)ft=`<span class="note">Add</span> <span class="to">${e(to)}</span>`;
  else if(!ch.to)ft=`<span class="note">Remove</span> <span class="from">${e(from)}</span>`;
  else ft=`<span class="from">${e(from)}</span><span class="arrow">→</span><span class="to">${e(to)}</span>`;
  return `<div class="chg"><span class="what">${lead||''}${e(PP.label(ch))}${enr?' in '+e(ch.county)+' County':''}</span><span class="where${enr?' one':''}">${e(PP.scope(ch,site))}</span><span class="ft">${ft}</span></div>`;
};
