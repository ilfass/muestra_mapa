async function geocodeUniversities(data) {
    const geocoded = [];

    for (const entry of data) {
        const name = entry["Universidad"];
        if (!name) continue;

        const cached = localStorage.getItem(name);
        if (cached) {
            entry.coords = JSON.parse(cached);
        } else {
            const coords = await geocodeName(name);
            if (coords) {
                entry.coords = coords;
                localStorage.setItem(name, JSON.stringify(coords));
            }
        }

        if (entry.coords) geocoded.push(entry);
    }

    return geocoded;
}

async function geocodeName(name) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`;
    try {
        const res = await fetch(url);
        const json = await res.json();
        if (json && json[0]) {
            return {
                lat: parseFloat(json[0].lat),
                lon: parseFloat(json[0].lon)
            };
        }
    } catch (err) {
        console.warn("Error geocodificando", name, err);
    }
    return null;
}

// 📍 Geocodifica con cache
