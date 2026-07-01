"""
Fetches music events in Chile from Ticketmaster Discovery API
and upserts them into the Supabase `concerts` table.

Required env vars:
  TICKETMASTER_KEY      — from developer.ticketmaster.com (free)
  SUPABASE_URL          — https://outtzlwgzijxtxehqjgz.supabase.co
  SUPABASE_SERVICE_KEY  — service_role key from Supabase → Settings → API
"""

import os
import sys
import requests
from datetime import datetime, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
TM_KEY          = os.environ["TICKETMASTER_KEY"]
SUPABASE_URL    = os.environ["SUPABASE_URL"]
SUPABASE_KEY    = os.environ["SUPABASE_SERVICE_KEY"]
CREATED_BY      = "ticketmaster_auto"
TM_BASE         = "https://app.ticketmaster.com/discovery/v2/events.json"
SUPA_CONCERTS   = f"{SUPABASE_URL}/rest/v1/concerts"

SUPA_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# Mapeo ciudad → alias de región usado en la app
CITY_MAP = {
    "santiago":       "santiago",
    "pudahuel":       "santiago",
    "las condes":     "santiago",
    "providencia":    "santiago",
    "ñuñoa":          "santiago",
    "maipú":          "santiago",
    "valparaíso":     "valparaiso",
    "valparaiso":     "valparaiso",
    "viña del mar":   "vina del mar",
    "vina del mar":   "vina del mar",
    "concepción":     "concepcion",
    "concepcion":     "concepcion",
    "biobío":         "biobio",
    "talcahuano":     "concepcion",
    "temuco":         "temuco",
    "antofagasta":    "antofagasta",
    "iquique":        "iquique",
    "la serena":      "la serena",
    "coquimbo":       "coquimbo",
    "rancagua":       "rancagua",
    "talca":          "talca",
    "chillán":        "chillan",
    "chillan":        "chillan",
    "puerto montt":   "puerto montt",
    "valdivia":       "valdivia",
    "coyhaique":      "coyhaique",
    "punta arenas":   "punta arenas",
    "arica":          "arica",
    "copiapó":        "copiapo",
}

def normalize(text):
    import unicodedata
    return unicodedata.normalize("NFD", (text or "").lower()).encode("ascii","ignore").decode()


def fetch_ticketmaster_events():
    events = []
    params = {
        "apikey":             TM_KEY,
        "countryCode":        "CL",
        "classificationName": "music",
        "size":               200,
        "sort":               "date,asc",
        "page":               0,
    }
    while True:
        r = requests.get(TM_BASE, params=params, timeout=20)
        r.raise_for_status()
        body = r.json()
        page_events = body.get("_embedded", {}).get("events", [])
        events.extend(page_events)
        page_info = body.get("page", {})
        total_pages = page_info.get("totalPages", 1)
        current     = page_info.get("number", 0)
        print(f"  Página {current+1}/{total_pages} — {len(page_events)} eventos")
        if current + 1 >= total_pages:
            break
        params["page"] = current + 1
    return events


def map_event(ev):
    venues = ev.get("_embedded", {}).get("venues", [{}])
    venue  = venues[0] if venues else {}

    city_raw = venue.get("city", {}).get("name", "")
    city_key = CITY_MAP.get(normalize(city_raw), normalize(city_raw)) or "santiago"

    loc = venue.get("location", {})
    try:
        lat = float(loc.get("latitude",  -33.45))
        lng = float(loc.get("longitude", -70.66))
    except (TypeError, ValueError):
        lat, lng = -33.45, -70.66

    start = ev.get("dates", {}).get("start", {})
    starts_iso = start.get("dateTime") or f"{start.get('localDate','2099-01-01')}T21:00:00Z"
    try:
        dt_start = datetime.fromisoformat(starts_iso.replace("Z", "+00:00"))
        dt_end   = dt_start + timedelta(hours=3)
        ends_iso = dt_end.isoformat()
    except Exception:
        ends_iso = starts_iso

    images  = sorted(ev.get("images", []), key=lambda i: -(i.get("width", 0)))
    poster  = images[0]["url"] if images else None

    priceRanges = ev.get("priceRanges", [])
    price_note  = None
    if priceRanges:
        mn = priceRanges[0].get("min")
        mx = priceRanges[0].get("max")
        cur = priceRanges[0].get("currency","CLP")
        if mn and mx:
            price_note = f"Desde ${int(mn):,} hasta ${int(mx):,} {cur}".replace(",",".")
        elif mn:
            price_note = f"Desde ${int(mn):,} {cur}".replace(",",".")

    return {
        "name":       ev.get("name", "Sin nombre"),
        "venue":      venue.get("name", "Por confirmar"),
        "city":       city_key,
        "address":    venue.get("address", {}).get("line1"),
        "lat":        lat,
        "lng":        lng,
        "starts_at":  starts_iso,
        "ends_at":    ends_iso,
        "ticket_url": ev.get("url") or None,
        "price_note": price_note,
        "poster_url": poster,
        "created_by": CREATED_BY,
    }


def delete_old_auto_concerts():
    """Elimina los conciertos ya pasados importados automáticamente."""
    now = datetime.utcnow().isoformat() + "Z"
    r = requests.delete(
        SUPA_CONCERTS,
        headers=SUPA_HEADERS,
        params={
            "created_by": f"eq.{CREATED_BY}",
            "ends_at":    f"lt.{now}",
        },
        timeout=20,
    )
    if r.status_code not in (200, 204):
        print(f"  Advertencia al limpiar pasados: {r.status_code} {r.text[:200]}")
    else:
        print("  Conciertos pasados eliminados.")


def get_existing_keys():
    """Retorna set de (name, starts_at) ya en la BD para evitar duplicados."""
    r = requests.get(
        SUPA_CONCERTS,
        headers={**SUPA_HEADERS, "Prefer": ""},
        params={"created_by": f"eq.{CREATED_BY}", "select": "name,starts_at"},
        timeout=20,
    )
    r.raise_for_status()
    return {(row["name"], row["starts_at"][:16]) for row in r.json()}


def insert_concerts(concerts):
    if not concerts:
        return
    r = requests.post(SUPA_CONCERTS, headers=SUPA_HEADERS, json=concerts, timeout=30)
    if r.status_code not in (200, 201):
        print(f"  Error al insertar: {r.status_code} {r.text[:300]}")
        sys.exit(1)


def main():
    print("=== Radar de Conciertos — sincronización automática ===")
    print(f"Fecha: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC\n")

    print("1. Eliminando conciertos pasados...")
    delete_old_auto_concerts()

    print("\n2. Obteniendo eventos de Ticketmaster Chile...")
    raw_events = fetch_ticketmaster_events()
    print(f"   Total obtenidos: {len(raw_events)}")

    print("\n3. Verificando duplicados en Supabase...")
    existing = get_existing_keys()
    print(f"   Ya en BD: {len(existing)}")

    mapped = []
    skipped = 0
    for ev in raw_events:
        try:
            concert = map_event(ev)
            key = (concert["name"], concert["starts_at"][:16])
            if key in existing:
                skipped += 1
                continue
            mapped.append(concert)
        except Exception as e:
            print(f"  Advertencia: no se pudo mapear evento — {e}")

    print(f"   Nuevos a insertar: {len(mapped)}  |  Duplicados omitidos: {skipped}")

    if not mapped:
        print("\nNada nuevo que insertar. Todo al día.")
        return

    print(f"\n4. Insertando {len(mapped)} conciertos en Supabase...")
    # Insertar en lotes de 50 para evitar timeouts
    batch_size = 50
    for i in range(0, len(mapped), batch_size):
        batch = mapped[i:i+batch_size]
        insert_concerts(batch)
        print(f"   Lote {i//batch_size + 1}: {len(batch)} insertados")

    print(f"\n✅ Sincronización completa — {len(mapped)} conciertos nuevos agregados.")


if __name__ == "__main__":
    main()
