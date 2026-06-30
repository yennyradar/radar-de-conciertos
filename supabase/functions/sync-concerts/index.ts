import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://esm.sh/node-html-parser@6";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const SECRET   = Deno.env.get("SYNC_SECRET")!;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
};

/* ═══ MAPAS ═══ */
const CITY_MAP: Record<string,string> = {
  "santiago":"santiago","santiago centro":"santiago","providencia":"santiago",
  "las condes":"santiago","nunoa":"santiago","ñuñoa":"santiago","recoleta":"santiago",
  "maipu":"santiago","maipú":"santiago","la florida":"santiago","vitacura":"santiago",
  "macul":"santiago","independencia":"santiago","quinta normal":"santiago",
  "huechuraba":"santiago","pudahuel":"santiago","lo barnechea":"santiago",
  "san miguel":"santiago","peñalolen":"santiago","penalolen":"santiago",
  "el bosque":"santiago","la cisterna":"santiago","cerrillos":"santiago",
  "valparaíso":"valparaiso","valparaiso":"valparaiso","playa ancha":"valparaiso",
  "quilpué":"quilpue","quilpue":"quilpue",
  "villa alemana":"villa alemana","limache":"limache","quillota":"quillota",
  "san antonio":"san antonio","cartagena":"san antonio","el quisco":"san antonio",
  "casablanca":"casablanca","concón":"concon","concon":"concon",
  "viña del mar":"vina del mar","vina del mar":"vina del mar","viña":"vina del mar",
  "concepción":"concepcion","concepcion":"concepcion","talcahuano":"concepcion",
  "hualpen":"concepcion","hualpén":"concepcion","coronel":"concepcion","lota":"concepcion",
  "temuco":"temuco","padre las casas":"temuco",
  "antofagasta":"antofagasta","calama":"antofagasta",
  "iquique":"iquique","alto hospicio":"iquique",
  "la serena":"la serena","coquimbo":"coquimbo","ovalle":"la serena",
  "rancagua":"rancagua","talca":"talca","curicó":"talca","curico":"talca",
  "chillán":"chillan","chillan":"chillan",
  "osorno":"osorno",
  "puerto montt":"puerto montt","puerto varas":"puerto montt",
  "castro":"castro","ancud":"castro","chiloe":"castro","chiloé":"castro",
  "valdivia":"valdivia",
  "punta arenas":"punta arenas","puerto natales":"punta arenas",
  "arica":"arica","copiapó":"copiapo","copiapo":"copiapo","coyhaique":"coyhaique",
};

const VENUE_COORDS: Record<string,[number,number]> = {
  "movistar arena":[-33.4580,-70.6560],"claro arena":[-33.4580,-70.6560],
  "teatro caupolicán":[-33.4570,-70.6480],"teatro caupolican":[-33.4570,-70.6480],
  "teatro coliseo":[-33.4390,-70.6440],"estadio nacional":[-33.4648,-70.6095],
  "espacio riesco":[-33.3930,-70.7780],"arena monticello":[-33.9830,-70.9330],
  "parque o'higgins":[-33.4610,-70.6680],"estadio monumental":[-33.4970,-70.6148],
  "club hipico":[-33.4660,-70.6760],"estadio santa laura":[-33.4380,-70.6560],
  "teatro municipal":[-33.4420,-70.6520],"teatro nescafe":[-33.4250,-70.6100],
  "centro arte alameda":[-33.4580,-70.6430],"ex vertice":[-33.4350,-70.6280],
  "teatro trotamundos":[-33.0490,-71.6180],"trotamundos":[-33.0490,-71.6180],
  "club segundo piso":[-33.0460,-71.6140],"segundo piso":[-33.0460,-71.6140],
  "teatro mauri":[-33.0455,-71.6195],"sala rivoli":[-33.0465,-71.6160],
  "vtp":[-33.0380,-71.6280],"teatro del puerto":[-33.0380,-71.6280],
  "teatro municipal de valparaiso":[-33.0472,-71.6127],
  "anfiteatro viña":[-33.0153,-71.5500],"estadio sausalito":[-33.0310,-71.5500],
  "enjoy viña":[-33.0240,-71.5530],"enjoy casino":[-33.0240,-71.5530],
  "estadio regional":[-36.8270,-73.0500],"teatro concepcion":[-36.8265,-73.0490],
  "teatro regional temuco":[-38.7359,-72.5904],
  "teatro municipal osorno":[-40.5740,-73.1340],
  "teatro regional puerto montt":[-41.4720,-72.9360],
  "teatro municipal antofagasta":[-23.6500,-70.3980],
  "teatro municipal iquique":[-20.2133,-70.1503],
  "teatro municipal la serena":[-29.9027,-71.2519],
  "teatro municipal rancagua":[-34.1708,-70.7444],
  "teatro municipal valdivia":[-39.8140,-73.2460],
  "teatro municipal punta arenas":[-53.1548,-70.9116],
};

const VENUE_TO_CITY: Record<string,string> = {
  "trotamundos":"valparaiso","teatro trotamundos":"valparaiso",
  "segundo piso":"valparaiso","teatro mauri":"valparaiso","sala rivoli":"valparaiso",
  "vtp":"valparaiso","teatro del puerto":"valparaiso","teatro municipal de valparaiso":"valparaiso",
  "anfiteatro viña":"vina del mar","estadio sausalito":"vina del mar","enjoy viña":"vina del mar",
  "estadio regional concepcion":"concepcion","teatro regional temuco":"temuco",
};

/* ═══ UTILIDADES ═══ */
function norm(s:string):string {
  return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();
}

function venueCoords(v:string):[number,number] {
  const n=norm(v);
  for (const [k,c] of Object.entries(VENUE_COORDS))
    if (n.includes(norm(k))) return c;
  return [-33.4489,-70.6693];
}

function cityFromText(text:string):string {
  const n=norm(text);
  for (const [k,v] of Object.entries(CITY_MAP))
    if (n.includes(norm(k))) return v;
  return "santiago";
}

function cityFromVenue(v:string):string|null {
  const n=norm(v);
  for (const [k,c] of Object.entries(VENUE_TO_CITY))
    if (n.includes(norm(k))) return c;
  return null;
}

function parseDate(s:string):string|null {
  if (!s) return null;
  const months:Record<string,string>={
    "ene":"01","feb":"02","mar":"03","abr":"04","may":"05","jun":"06",
    "jul":"07","ago":"08","sep":"09","oct":"10","nov":"11","dic":"12",
    "enero":"01","febrero":"02","marzo":"03","abril":"04","mayo":"05","junio":"06",
    "julio":"07","agosto":"08","septiembre":"09","octubre":"10","noviembre":"11","diciembre":"12",
  };
  const n=norm(s);
  const m=n.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})(?:[^0-9](\d{2}:\d{2}))?/);
  if (m) {
    const day=m[1].padStart(2,"0");
    const mon=months[m[2].slice(0,3).replace(/[^a-z]/g,"")]??"01";
    const year=m[3], time=m[4]??"20:00";
    return `${year}-${mon}-${day}T${time}:00`;
  }
  const m2=n.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}T20:00:00`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.length===10?`${s}T20:00:00`:s;
  return null;
}

function addHours(iso:string, h:number):string {
  return new Date(new Date(iso).getTime()+h*3600000).toISOString();
}

/* ═══ FILTRO MÚSICA ═══ */
const NON_MUSIC=[
  /\bvs\.?\s+/i,               // partidos deportivos: "equipo vs equipo"
  /copa chile/i,
  /\bcampeonato nacional\b/i,
  /monster truck/i,
  /hot wheels/i,
  /disney on ice/i,
  /\bcomic.?con\b/i,
  /^copy of /i,                 // duplicados de Eventbrite
  /^\s*taller:/i,               // talleres y workshops
  /\bmba tour\b/i,
  /dinner meet/i,
  /dinner with new/i,
  /\bfoodies\b/i,
  /expo colo.?colo/i,
  /\bcoolslide\b/i,
  /invierno m[aá]gico/i,
  /proyecto de t[ií]tulo danza/i,
  /\bcirco pastelito\b/i,
  /\bcirque du soleil\b/i,
  /\bbarra libre\b/i,           // fiestas con trago libre — no son conciertos
  /\bescuela de teatro\b/i,     // producciones de escuelas de teatro
  /cities project.*dinner/i,    // meetups de networking
];
function isMusicEvent(name:string):boolean{
  return !NON_MUSIC.some(re=>re.test(name));
}

const HOME_URLS=[
  /^https?:\/\/www\.puntoticket\.com\/?$/,
  /^https?:\/\/www\.puntoticket\.com\/categoria/,
  /^https?:\/\/www\.eventbrite\.cl\/d\//,
  /^https?:\/\/www\.eventbrite\.cl\/?$/,
  /^https?:\/\/passline\.com\/eventos?\/?$/,
  /^https?:\/\/passline\.com\/?$/,
  /^https?:\/\/www\.portalticket\.cl\/?$/,
  /^https?:\/\/www\.portalticket\.cl\/eventos?\/?$/,
  /^https?:\/\/www\.portalticket\.cl\/conciertos?\/?$/,
  /^https?:\/\/www\.portalticket\.cl\/musica\/?$/,
];
function validEventUrl(url:string):string {
  if(!url) return "";
  if(HOME_URLS.some(p=>p.test(url))) return "";
  return url;
}

function extractJsonLD(html:string):any[] {
  const out:any[]=[];
  const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while((m=re.exec(html))!==null){
    try{ const j=JSON.parse(m[1]); out.push(j); }catch{}
  }
  return out;
}

interface Concert {
  name:string; venue:string; city:string; address:string|null;
  lat:number; lng:number; starts_at:string; ends_at:string;
  ticket_url:string; price_note:string|null; poster_url:string|null;
  created_by:string;
}

async function fetchPage(url:string):Promise<string|null> {
  try{
    const r=await fetch(url,{headers:HEADERS});
    if(!r.ok){ console.log(`HTTP ${r.status} → ${url}`); return null; }
    return await r.text();
  }catch(e){ console.error(`Fetch error ${url}:`,e); return null; }
}

/* ═══════════════════════════════
   SCRAPER 0: PUNTOTICKET (conciertos comerciales)
════════════════════════════════ */
async function scrapePuntoTicket():Promise<Concert[]> {
  const concerts:Concert[]=[];
  const urls=[
    "https://www.puntoticket.com",
    "https://www.puntoticket.com/categoria/musica",
    "https://www.puntoticket.com/categoria/conciertos",
    "https://www.puntoticket.com/categoria/festivales",
  ];
  for(const url of urls){
    const html=await fetchPage(url);
    if(!html) continue;
    console.log(`PuntoTicket ${url}: ${html.length} chars`);
    const jsonLDs=extractJsonLD(html);
    for(const ld of jsonLDs){
      const events:any[]=
        ld["@type"]==="Event"?[ld]:
        ld["@type"]==="ItemList"?(ld.itemListElement||[]).map((e:any)=>e.item||e):
        Array.isArray(ld)?ld.filter((e:any)=>e["@type"]==="Event"):[];
      for(const ev of events){
        if(!ev.name||!ev.startDate) continue;
        const venueName=ev.location?.name||"Por confirmar";
        const cityRaw=ev.location?.address?.addressLocality||"";
        const city=cityFromVenue(venueName)||cityFromText(cityRaw)||"santiago";
        const [lat,lng]=venueCoords(venueName);
        const startsAt=ev.startDate.length===10?`${ev.startDate}T20:00:00`:ev.startDate;
        const img=Array.isArray(ev.image)?ev.image[0]:ev.image||null;
        concerts.push({
          name:ev.name, venue:venueName, city,
          address:ev.location?.address?.streetAddress||null,
          lat, lng, starts_at:startsAt, ends_at:ev.endDate||addHours(startsAt,3),
          ticket_url:validEventUrl(ev.url||""), price_note:null,
          poster_url:typeof img==="string"?img:img?.url||null,
          created_by:"puntoticket_auto",
        });
      }
    }
    // HTML fallback
    const doc=parse(html);
    const cards=Array.from(doc.querySelectorAll("a")).filter((a:any)=>a.querySelector("h3")&&a.querySelector("img"));
    for(const card of cards.slice(0,60)){
      const name=(card.querySelector("h3")?.text||"").trim();
      if(!name||name.length<3) continue;
      const href=card.getAttribute("href")||"";
      const ticketUrl=href.startsWith("http")?href:href?`https://www.puntoticket.com${href}`:url;
      const paras=Array.from(card.querySelectorAll("p")).map((p:any)=>p.text.trim()).filter((t:string)=>t.length>1);
      const dateText=paras.find((t:string)=>/\d/.test(t))||"";
      const locationText=paras.find((t:string)=>!/\d{4}/.test(t)&&t.length>2)||"";
      const img=card.querySelector("img")?.getAttribute("src")||null;
      const city=cityFromText(locationText)||"santiago";
      const [lat,lng]=venueCoords(locationText);
      const startsAt=parseDate(dateText)||addHours(new Date().toISOString(),720);
      concerts.push({
        name, venue:locationText||"Por confirmar", city,
        address:null, lat, lng,
        starts_at:startsAt, ends_at:addHours(startsAt,3),
        ticket_url:validEventUrl(ticketUrl), price_note:null,
        poster_url:img?.startsWith("http")?img:null,
        created_by:"puntoticket_auto",
      });
    }
  }
  return concerts;
}

/* ═══════════════════════════════
   SCRAPER 1: EVENTBRITE
════════════════════════════════ */
async function scrapeEventbrite():Promise<Concert[]> {
  const concerts:Concert[]=[];
  const urls=[
    "https://www.eventbrite.cl/d/chile/concerts/",
    "https://www.eventbrite.cl/d/chile--santiago/concerts/",
    "https://www.eventbrite.cl/d/chile--valparaiso/concerts/",
    "https://www.eventbrite.cl/d/chile--concepcion/concerts/",
    "https://www.eventbrite.cl/d/chile/music/",
    "https://www.eventbrite.cl/d/chile/festivals/",
  ];

  for (const url of urls) {
    const html=await fetchPage(url);
    if(!html) continue;
    console.log(`Eventbrite ${url}: ${html.length} chars`);

    // Intentar JSON-LD primero
    const jsonLDs=extractJsonLD(html);
    for (const ld of jsonLDs) {
      const events:any[]=
        ld["@type"]==="Event" ? [ld] :
        ld["@type"]==="ItemList" ? (ld.itemListElement||[]).map((e:any)=>e.item||e) :
        Array.isArray(ld) ? ld.filter((e:any)=>e["@type"]==="Event") : [];

      for (const ev of events) {
        if(!ev.name||!ev.startDate) continue;
        const venueName=ev.location?.name||"Por confirmar";
        const cityRaw=ev.location?.address?.addressLocality||ev.location?.address?.addressRegion||"";
        const city=cityFromVenue(venueName)||cityFromText(cityRaw)||"santiago";
        const [lat,lng]=venueCoords(venueName);
        const startsAt=ev.startDate.length===10?`${ev.startDate}T20:00:00`:ev.startDate;
        const endsAt=ev.endDate?ev.endDate:addHours(startsAt,3);
        const img=Array.isArray(ev.image)?ev.image[0]:ev.image||null;
        concerts.push({
          name:ev.name, venue:venueName, city,
          address:ev.location?.address?.streetAddress||null,
          lat, lng, starts_at:startsAt, ends_at:endsAt,
          ticket_url:validEventUrl(ev.url||""),
          price_note:null,
          poster_url:typeof img==="string"?img:img?.url||null,
          created_by:"eventbrite_auto",
        });
      }
    }

    // Si no hay JSON-LD, parsear HTML
    if(jsonLDs.length===0){
      const doc=parse(html);
      const cards=doc.querySelectorAll("[data-testid='event-card'],article,.event-card,.eds-event-card");
      console.log(`  HTML fallback: ${cards.length} cards`);
      for(const card of Array.from(cards).slice(0,40)){
        const name=(card.querySelector("h2,h3,.eds-event-card__formatted-name")?.text||"").trim();
        if(!name||name.length<3) continue;
        const link=card.querySelector("a")?.getAttribute("href")||url;
        const ticketUrl=link.startsWith("http")?link:`https://www.eventbrite.cl${link}`;
        const dateText=(card.querySelector("time,.eds-text-bs--fixed,.event-card__clamp-line--one")?.text||"").trim();
        const locationText=(card.querySelector("[data-testid='event-card-venue'],.card-text--truncated__one")?.text||"").trim();
        const img=card.querySelector("img")?.getAttribute("src")||null;
        const city=cityFromText(locationText)||"santiago";
        const [lat,lng]=venueCoords(locationText);
        const startsAt=parseDate(dateText)||addHours(new Date().toISOString(),720);
        concerts.push({
          name, venue:locationText||"Por confirmar", city,
          address:null, lat, lng,
          starts_at:startsAt, ends_at:addHours(startsAt,3),
          ticket_url:validEventUrl(ticketUrl), price_note:null,
          poster_url:img?.startsWith("http")?img:null,
          created_by:"eventbrite_auto",
        });
      }
    }
  }
  return concerts;
}

/* ═══════════════════════════════
   SCRAPER 2: PASSLINE
════════════════════════════════ */
async function scrapePassline():Promise<Concert[]> {
  const concerts:Concert[]=[];
  const urls=[
    "https://passline.com/eventos",
    "https://passline.com/eventos?categoria=musica",
    "https://passline.com/eventos?categoria=conciertos",
    "https://passline.com/eventos?ciudad=santiago",
    "https://passline.com/eventos?ciudad=valparaiso",
  ];

  for(const url of urls){
    const html=await fetchPage(url);
    if(!html) continue;
    console.log(`Passline ${url}: ${html.length} chars`);

    // JSON-LD
    const jsonLDs=extractJsonLD(html);
    for(const ld of jsonLDs){
      const events:any[]=
        ld["@type"]==="Event"?[ld]:
        ld["@type"]==="ItemList"?(ld.itemListElement||[]).map((e:any)=>e.item||e):
        Array.isArray(ld)?ld.filter((e:any)=>e["@type"]==="Event"):[];
      for(const ev of events){
        if(!ev.name||!ev.startDate) continue;
        const venueName=ev.location?.name||"Por confirmar";
        const cityRaw=ev.location?.address?.addressLocality||"";
        const city=cityFromVenue(venueName)||cityFromText(cityRaw)||"santiago";
        const [lat,lng]=venueCoords(venueName);
        const startsAt=ev.startDate.length===10?`${ev.startDate}T20:00:00`:ev.startDate;
        const img=Array.isArray(ev.image)?ev.image[0]:ev.image||null;
        concerts.push({
          name:ev.name, venue:venueName, city,
          address:ev.location?.address?.streetAddress||null,
          lat, lng, starts_at:startsAt, ends_at:ev.endDate||addHours(startsAt,3),
          ticket_url:validEventUrl(ev.url||""), price_note:null,
          poster_url:typeof img==="string"?img:img?.url||null,
          created_by:"passline_auto",
        });
      }
    }

    // HTML fallback
    const doc=parse(html);
    const cards=doc.querySelectorAll(".event-card,.evento-card,.card,.event-item,[class*='event']");
    console.log(`  HTML fallback Passline: ${cards.length} cards`);
    for(const card of Array.from(cards).slice(0,60)){
      const name=(card.querySelector("h2,h3,h4,.title,.nombre")?.text||"").trim();
      if(!name||name.length<3) continue;
      const link=card.querySelector("a")?.getAttribute("href")||"";
      const ticketUrl=link.startsWith("http")?link:link?`https://passline.com${link}`:url;
      const dateText=(card.querySelector("time,.fecha,.date")?.text||"").trim();
      const locationText=(card.querySelector(".lugar,.venue,.location,.ciudad")?.text||"").trim();
      const img=card.querySelector("img")?.getAttribute("src")||card.querySelector("img")?.getAttribute("data-src")||null;
      const city=cityFromText(locationText)||"santiago";
      const [lat,lng]=venueCoords(locationText);
      const startsAt=parseDate(dateText)||addHours(new Date().toISOString(),720);
      concerts.push({
        name, venue:locationText||"Por confirmar", city,
        address:null, lat, lng,
        starts_at:startsAt, ends_at:addHours(startsAt,3),
        ticket_url:validEventUrl(ticketUrl), price_note:null,
        poster_url:img?.startsWith("http")?img:null,
        created_by:"passline_auto",
      });
    }
  }
  return concerts;
}

/* ═══════════════════════════════
   SCRAPER 3: PORTALTICKET
════════════════════════════════ */
async function scrapePortalTicket():Promise<Concert[]> {
  const concerts:Concert[]=[];
  const urls=[
    "https://www.portalticket.cl",
    "https://www.portalticket.cl/eventos",
    "https://www.portalticket.cl/conciertos",
    "https://www.portalticket.cl/musica",
  ];

  for(const url of urls){
    const html=await fetchPage(url);
    if(!html) continue;
    console.log(`PortalTicket ${url}: ${html.length} chars`);

    // JSON-LD
    const jsonLDs=extractJsonLD(html);
    for(const ld of jsonLDs){
      const events:any[]=
        ld["@type"]==="Event"?[ld]:
        ld["@type"]==="ItemList"?(ld.itemListElement||[]).map((e:any)=>e.item||e):
        Array.isArray(ld)?ld.filter((e:any)=>e["@type"]==="Event"):[];
      for(const ev of events){
        if(!ev.name||!ev.startDate) continue;
        const venueName=ev.location?.name||"Por confirmar";
        const cityRaw=ev.location?.address?.addressLocality||"";
        const city=cityFromVenue(venueName)||cityFromText(cityRaw)||"santiago";
        const [lat,lng]=venueCoords(venueName);
        const startsAt=ev.startDate.length===10?`${ev.startDate}T20:00:00`:ev.startDate;
        const img=Array.isArray(ev.image)?ev.image[0]:ev.image||null;
        concerts.push({
          name:ev.name, venue:venueName, city,
          address:ev.location?.address?.streetAddress||null,
          lat, lng, starts_at:startsAt, ends_at:ev.endDate||addHours(startsAt,3),
          ticket_url:validEventUrl(ev.url||""), price_note:null,
          poster_url:typeof img==="string"?img:img?.url||null,
          created_by:"portalticket_auto",
        });
      }
    }

    // HTML fallback
    const doc=parse(html);
    const cards=doc.querySelectorAll("a").filter((a:any)=>{
      const h=a.querySelector("h2,h3,h4");
      const img=a.querySelector("img");
      return h&&img;
    });
    console.log(`  HTML fallback PortalTicket: ${cards.length} cards`);
    for(const card of Array.from(cards).slice(0,60)){
      const name=(card.querySelector("h2,h3,h4")?.text||"").trim();
      if(!name||name.length<3) continue;
      const href=card.getAttribute("href")||"";
      const ticketUrl=href.startsWith("http")?href:href?`https://www.portalticket.cl${href}`:url;
      const paras=Array.from(card.querySelectorAll("p,span")).map((n:any)=>n.text.trim()).filter((t:string)=>t.length>1);
      const dateText=paras.find((t:string)=>/\d{1,2}.*\d{4}|\/\d{2}\//.test(t))||"";
      const locationText=paras.find((t:string)=>!(/\d{4}/.test(t))&&t.length>2)||"";
      const img=card.querySelector("img")?.getAttribute("src")||null;
      const city=cityFromText(locationText)||"santiago";
      const [lat,lng]=venueCoords(locationText);
      const startsAt=parseDate(dateText)||addHours(new Date().toISOString(),720);
      concerts.push({
        name, venue:locationText||"Por confirmar", city,
        address:null, lat, lng,
        starts_at:startsAt, ends_at:addHours(startsAt,3),
        ticket_url:validEventUrl(ticketUrl), price_note:null,
        poster_url:img?.startsWith("http")?img:null,
        created_by:"portalticket_auto",
      });
    }
  }
  return concerts;
}

/* ═══════════════════════════════
   SCRAPER 4: TICKETMASTER CHILE
════════════════════════════════ */
async function scrapeTicketmasterCL():Promise<Concert[]>{
  const concerts:Concert[]=[];
  const urls=[
    "https://www.ticketmaster.cl/musica",
    "https://www.ticketmaster.cl/conciertos",
    "https://www.ticketmaster.cl",
  ];
  for(const url of urls){
    const html=await fetchPage(url);
    if(!html) continue;
    console.log(`Ticketmaster CL ${url}: ${html.length} chars`);
    const jsonLDs=extractJsonLD(html);
    for(const ld of jsonLDs){
      const events:any[]=
        ld["@type"]==="Event"?[ld]:
        ld["@type"]==="ItemList"?(ld.itemListElement||[]).map((e:any)=>e.item||e):
        Array.isArray(ld)?ld.filter((e:any)=>e["@type"]==="Event"):[];
      for(const ev of events){
        if(!ev.name||!ev.startDate) continue;
        const venueName=ev.location?.name||"Por confirmar";
        const cityRaw=ev.location?.address?.addressLocality||"";
        const city=cityFromVenue(venueName)||cityFromText(cityRaw)||"santiago";
        const [lat,lng]=venueCoords(venueName);
        const startsAt=ev.startDate.length===10?`${ev.startDate}T20:00:00`:ev.startDate;
        const img=Array.isArray(ev.image)?ev.image[0]:ev.image||null;
        concerts.push({
          name:ev.name, venue:venueName, city,
          address:ev.location?.address?.streetAddress||null,
          lat, lng, starts_at:startsAt, ends_at:ev.endDate||addHours(startsAt,3),
          ticket_url:validEventUrl(ev.url||""), price_note:null,
          poster_url:typeof img==="string"?img:img?.url||null,
          created_by:"ticketmaster_auto",
        });
      }
    }
    const doc=parse(html);
    const cards=Array.from(doc.querySelectorAll("a")).filter((a:any)=>a.querySelector("h2,h3,h4")&&a.querySelector("img"));
    for(const card of cards.slice(0,60)){
      const name=(card.querySelector("h2,h3,h4")?.text||"").trim();
      if(!name||name.length<3) continue;
      const href=card.getAttribute("href")||"";
      const ticketUrl=href.startsWith("http")?href:href?`https://www.ticketmaster.cl${href}`:"";
      const dateText=(card.querySelector("time,.date,.fecha")?.text||"").trim();
      const locationText=(card.querySelector(".venue,.lugar,.location")?.text||"").trim();
      const img=card.querySelector("img")?.getAttribute("src")||null;
      const city=cityFromText(locationText)||"santiago";
      const [lat,lng]=venueCoords(locationText);
      const startsAt=parseDate(dateText)||addHours(new Date().toISOString(),720);
      concerts.push({
        name, venue:locationText||"Por confirmar", city,
        address:null, lat, lng,
        starts_at:startsAt, ends_at:addHours(startsAt,3),
        ticket_url:validEventUrl(ticketUrl), price_note:null,
        poster_url:img?.startsWith("http")?img:null,
        created_by:"ticketmaster_auto",
      });
    }
  }
  return concerts;
}

/* ═══ DEDUPLICAR ═══ */
function dedup(concerts:Concert[]):Concert[]{
  const now=new Date();
  const seen=new Set<string>();
  return concerts.filter(c=>{
    if(new Date(c.starts_at)<=now) return false;
    if(!isMusicEvent(c.name)) return false;
    const key=`${norm(c.name)}||${c.starts_at.slice(0,10)}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ═══ SERVIDOR ═══ */
Deno.serve(async(req:Request)=>{
  const url=new URL(req.url);
  if(url.searchParams.get("secret")!==SECRET)
    return new Response("Unauthorized",{status:401});

  const supa=createClient(SUPA_URL,SUPA_KEY);
  const log:string[]=[];

  try{
    // Limpiar eventos auto anteriores
    const AUTO=["eventbrite_auto","passline_auto","portalticket_auto","puntoticket_auto","predicthq_auto","ticketmaster_auto","bandsintown_auto","community","ticketmaster_cl_auto"];
    for(const src of AUTO){
      await supa.from("concerts").delete().eq("created_by",src);
    }
    log.push("✓ Limpieza de eventos anteriores");

    // Correr los 4 scrapers en paralelo
    log.push("Scraping 5 fuentes...");
    const [ptt,eb,pl,pt,tm]=await Promise.all([
      scrapePuntoTicket().catch(e=>{log.push(`PuntoTicket error: ${e}`);return[];}),
      scrapeEventbrite().catch(e=>{log.push(`Eventbrite error: ${e}`);return[];}),
      scrapePassline().catch(e=>{log.push(`Passline error: ${e}`);return[];}),
      scrapePortalTicket().catch(e=>{log.push(`PortalTicket error: ${e}`);return[];}),
      scrapeTicketmasterCL().catch(e=>{log.push(`Ticketmaster CL error: ${e}`);return[];}),
    ]);

    log.push(`PuntoTicket: ${ptt.length} | Eventbrite: ${eb.length} | Passline: ${pl.length} | PortalTicket: ${pt.length} | Ticketmaster CL: ${tm.length}`);

    const all=dedup([...ptt,...eb,...pl,...pt,...tm]);
    log.push(`Total sin duplicados y futuros: ${all.length}`);

    if(all.length===0){
      log.push("⚠️ Sin resultados. Los sitios pueden tener protección anti-bot.");
      return new Response(JSON.stringify({ok:false,log}),{headers:{"Content-Type":"application/json"}});
    }

    let inserted=0;
    for(let i=0;i<all.length;i+=50){
      const {error}=await supa.from("concerts").insert(all.slice(i,i+50));
      if(error){ log.push(`Error lote ${i}: ${error.message}`); break; }
      inserted+=Math.min(50,all.length-i);
    }

    log.push(`✅ ${inserted} eventos insertados`);
    return new Response(JSON.stringify({ok:true,inserted,log}),{headers:{"Content-Type":"application/json"}});

  }catch(err){
    return new Response(JSON.stringify({ok:false,error:String(err),log}),{
      status:500,headers:{"Content-Type":"application/json"},
    });
  }
});
