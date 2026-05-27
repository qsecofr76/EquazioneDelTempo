/**
 * L'Equazione del Tempo - Laboratorio Astronomico Interattivo
 * 
 * Un'applicazione interattiva e ad alte prestazioni per visualizzare e spiegare 
 * le componenti dell'Equazione del Tempo: Eccentricità Orbitale ed Obliquità dell'Asse.
 */

// --- CONFIGURAZIONE E STATO DELL'APPLICAZIONE ---
const state = {
    dayOfYear: 147,          // Giorno corrente (default 27 Maggio)
    isPlaying: false,        // Stato dell'animazione
    speedFactor: 0.5,        // Moltiplicatore di velocità dell'animazione
    orbitMode: 'didactic',   // 'didactic' (e=0.25 per fini espositivi) o 'real' (e=0.0167)
    lastTimestamp: 0,        // Per il calcolo del delta time nell'animazione
    
    // Costanti astronomiche
    obliquity: 23.44 * Math.PI / 180, // Inclinazione asse terrestre in radianti
    perihelionDay: 3,                 // Giorno del perielio (circa 3 Gennaio)
    vernalEquinoxDay: 81,             // Giorno dell'equinozio di primavera (21 Marzo)
    
    // Rotazione e Zoom 3D per la Sfera Celeste (Quadrante 2)
    viewYaw: 0.8,                     // Yaw orizzontale in radianti
    viewPitch: -0.3,                  // Pitch verticale in radianti
    viewZoom: 1.0,                    // Zoom tridimensionale
};

// Mesi dell'anno per la conversione del giorno in data
const months = [
    { name: "Gennaio", days: 31 },
    { name: "Febbraio", days: 28 },
    { name: "Marzo", days: 31 },
    { name: "Aprile", days: 30 },
    { name: "Maggio", days: 31 },
    { name: "Giugno", days: 30 },
    { name: "Luglio", days: 31 },
    { name: "Agosto", days: 31 },
    { name: "Settembre", days: 30 },
    { name: "Ottobre", days: 31 },
    { name: "Novembre", days: 30 },
    { name: "Dicembre", days: 31 }
];

// --- FONT E COLORI ESTRATTI DA style.css ---
const colors = {
    bgDark: "#07060e",
    textPrimary: "#f0f0f7",
    textMuted: "#a0a0c0",
    textDark: "#626280",
    sun: "#ffd000",
    sunGlow: "rgba(255, 208, 0, 0.25)",
    earth: "#00d2ff",
    earthGlow: "rgba(0, 210, 255, 0.25)",
    ecc: "#00f0ff",
    obl: "#f000ff",
    eot: "#ffaa00",
    grid: "rgba(255, 255, 255, 0.05)",
    plus: "#00ff88",
    minus: "#ff3366",
    whiteTrans: "rgba(255, 255, 255, 0.08)",
    whiteTransBold: "rgba(255, 255, 255, 0.25)"
};

// --- FUNZIONI DI SUPPORTO DATE E UTILS ---

/**
 * Trasforma il giorno dell'anno in una data civile (Giorno, Mese, Anno 2026)
 */
function dayToDate(day) {
    let d = Math.floor(day);
    if (d < 1) d = 1;
    if (d > 365) d = 365;
    
    let accumulated = 0;
    for (let i = 0; i < months.length; i++) {
        if (d <= accumulated + months[i].days) {
            const dayOfMonth = d - accumulated;
            return {
                day: dayOfMonth,
                monthName: months[i].name,
                monthIndex: i
            };
        }
        accumulated += months[i].days;
    }
    return { day: 31, monthName: "Dicembre", monthIndex: 11 };
}

/**
 * Converte una data YYYY-MM-DD nel giorno dell'anno (1-365)
 */
function dateToDayOfYear(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 147;
    
    // Calcoliamo la differenza di giorni dal 1° Gennaio dello stesso anno
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    let day = Math.floor(diff / oneDay);
    if (day < 1) day = 1;
    if (day > 365) day = 365;
    return day;
}

/**
 * Converte il giorno dell'anno in una stringa di data standard YYYY-MM-DD (per il date picker)
 */
function dayToDatePickerVal(day) {
    const dateInfo = dayToDate(day);
    const year = 2026; // Anno non bisestile
    const month = String(dateInfo.monthIndex + 1).padStart(2, '0');
    const dayStr = String(dateInfo.day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
}

/**
 * Formatta un valore di tempo in minuti e secondi
 */
function formatMinutesSeconds(totalMinutes) {
    const sign = totalMinutes >= 0 ? "+" : "-";
    const absVal = Math.abs(totalMinutes);
    const mins = Math.floor(absVal);
    const secs = Math.floor((absVal - mins) * 60);
    return `${sign}${mins}m ${secs}s`;
}

/**
 * Configura un canvas per display ad alta densità (HiDPI / Retina) per contorni nitidi
 */
function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    
    return {
        width: rect.width,
        height: rect.height,
        ctx: ctx
    };
}

// --- LOGICA MATEMATICA E FISICA ASTRONOMICA ---

/**
 * Calcola l'angolo B utilizzato nelle formule approssimate dell'Equazione del Tempo
 */
function getB(day) {
    // B = 360/365 * (N - 81) in gradi
    return (360 / 365) * (day - state.vernalEquinoxDay) * (Math.PI / 180); // in radianti
}

/**
 * Calcola le componenti dell'Equazione del Tempo e i relativi scarti di durata del giorno
 */
function calculateEoT(day) {
    const B = getB(day);
    
    // Componente di Obliquità (semi-annuale) in minuti
    // Eo = 9.87 * sin(2B)
    const eobl = 9.87 * Math.sin(2 * B);
    
    // Componente di Eccentricità (annuale) in minuti
    // Ee = -7.67 * sin(B + 78.7°)
    const angleEcc = B + (78.7 * Math.PI / 180);
    const eecc = -7.67 * Math.sin(angleEcc);
    
    // Equazione del tempo totale (somma algebrica delle due)
    const total = eobl + eecc;
    
    // Variazioni giornaliere della durata del giorno (secondi al giorno)
    // Ricavate matematicamente dalla derivata delle componenti EoT riscalate
    const deltaDayEcc = 7.92 * Math.cos(angleEcc);
    const deltaDayObl = -20.37 * Math.cos(2 * B);
    const deltaDayTotal = deltaDayEcc + deltaDayObl;
    
    // Declinazione solare (in gradi)
    // delta = 23.44 * sin(B)
    const declination = 23.44 * Math.sin(B);
    
    return {
        obliquityComponent: eobl,
        eccentricityComponent: eecc,
        totalEoT: total,
        deltaDayEcc: deltaDayEcc,
        deltaDayObl: deltaDayObl,
        deltaDayTotal: deltaDayTotal,
        declination: declination
    };
}

/**
 * Risolve l'equazione di Keplero: M = E - e * sin(E)
 * Trova l'anomalia eccentrica E a partire dall'anomalia media M
 */
function solveKepler(M, e) {
    let E = M; // Stima iniziale
    const tolerance = 1e-6;
    const maxIterations = 100;
    
    for (let i = 0; i < maxIterations; i++) {
        const delta = E - e * Math.sin(E) - M;
        if (Math.abs(delta) < tolerance) break;
        E = E - delta / (1 - e * Math.cos(E));
    }
    return E;
}

/**
 * Calcola la fisica dell'orbita terrestre per un dato giorno
 */
function calculateOrbit(day, e) {
    // L'orbita dura 365 giorni. L'anomalia media M è 0 al perielio (circa 3 Gennaio)
    const M = (day - state.perihelionDay) * (2 * Math.PI / 365);
    
    // Risolviamo l'equazione di Keplero per trovare l'anomalia eccentrica E
    const E = solveKepler(M, e);
    
    // Anomalia vera theta (angolo reale visto dal Sole)
    const theta = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    
    // Distanza Terra-Sole r in Unità Astronomiche (UA)
    // In coordinate ellittiche: r = a * (1 - e * cos(E)) dove assumiamo il semiasse maggiore a = 1 UA
    const r = 1.0 - e * Math.cos(E);
    
    // Velocità orbitale (rispetto alla velocità media riscalata)
    // Dalla conservazione del momento angolare (Keplero 2): v è inversamente proporzionale a r
    // O dalla formula Vis-Viva: v = sqrt(2/r - 1)
    const v = Math.sqrt(2.0 / r - 1.0);
    
    return {
        meanAnomaly: M,
        eccentricAnomaly: E,
        trueAnomaly: theta,
        radius: r,
        velocity: v
    };
}

// --- MOTORI DI RENDERING DEI CANVAS (I 4 QUADRANTI) ---

/**
 * QUADRANTE 1: Rendering dell'Orbita ed Eccentricità
 */
function drawOrbitQuadrant(canvas, data, orbitData, e) {
    const { width, height, ctx } = setupCanvas(canvas);
    
    // Sfondo scuro e griglia orbitale di riferimento
    ctx.fillStyle = colors.bgDark;
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Parametri ellisse per il disegno (semiasse maggiore a e semiasse minore b)
    const a = Math.min(width, height) * 0.38;
    const b = a * Math.sqrt(1 - e * e);
    
    // Distanza centro-fuoco (Sole)
    const c = a * e;
    
    // Spostiamo l'origine del disegno nel centro dell'ellisse per tracciare l'orbita
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Orientiamo l'orbita in modo che il perielio (Sole a destra, Terra a destra) sia sull'asse X
    // Rotazione orbitale standard
    
    // 1. Tracciamento dell'orbita (ellisse di base)
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Disegniamo gli assi di simmetria dell'ellisse
    ctx.beginPath();
    ctx.moveTo(-a - 10, 0); ctx.lineTo(a + 10, 0);
    ctx.moveTo(0, -b - 10); ctx.lineTo(0, b + 10);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Annotazioni degli estremi: Perielio e Afelio
    ctx.font = "10px Outfit";
    ctx.fillStyle = colors.textDark;
    ctx.textAlign = "center";
    ctx.fillText("AFELIO (Inizio Luglio - Lenta)", -a - 25, 15);
    ctx.fillText("PERIELIO (Inizio Gennaio - Veloce)", a + 30, 15);
    
    // 2. Posizione del Sole nel Fuoco destro F1 (c, 0)
    const sunX = c;
    const sunY = 0;
    
    // 3. Calcolo posizione della Terra nel piano orbitale
    // x = a * cos(E), y = b * sin(E)
    const earthX = a * Math.cos(orbitData.eccentricAnomaly);
    const earthY = b * Math.sin(orbitData.eccentricAnomaly);
    
    // 4. Visualizzazione della Seconda Legge di Keplero (Area Spazzata in tempo costante)
    // Generiamo un settore di area a cavallo del giorno corrente (es. ±12 giorni)
    const deltaDays = 12;
    const tCurrent = state.dayOfYear;
    
    ctx.fillStyle = "rgba(0, 210, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(sunX, sunY); // Parte dal Sole
    
    // Tracciamo l'arco dell'orbita da t-delta a t+delta
    for (let d = -deltaDays; d <= deltaDays; d++) {
        const tTemp = (tCurrent + d + 365) % 365;
        const oTemp = calculateOrbit(tTemp, e);
        const ex = a * Math.cos(oTemp.eccentricAnomaly);
        const ey = b * Math.sin(oTemp.eccentricAnomaly);
        ctx.lineTo(ex, ey);
    }
    ctx.closePath();
    ctx.fill();
    
    // Contorno del settore di area kepleriano
    ctx.strokeStyle = "rgba(0, 210, 255, 0.25)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    const oStart = calculateOrbit((tCurrent - deltaDays + 365) % 365, e);
    ctx.lineTo(a * Math.cos(oStart.eccentricAnomaly), b * Math.sin(oStart.eccentricAnomaly));
    ctx.moveTo(sunX, sunY);
    const oEnd = calculateOrbit((tCurrent + deltaDays + 365) % 365, e);
    ctx.lineTo(a * Math.cos(oEnd.eccentricAnomaly), b * Math.sin(oEnd.eccentricAnomaly));
    ctx.stroke();
    
    // 5. Linea di raggio vettore Terra-Sole r
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(earthX, earthY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 6. Vettore Velocità orbitale (tangenziale)
    // d(pos)/dt = (-a*sin(E)*dE/dt, b*cos(E)*dE/dt). La direzione tangenziale è (-a*sin E, b*cos E)
    const vx = -a * Math.sin(orbitData.eccentricAnomaly);
    const vy = b * Math.cos(orbitData.eccentricAnomaly);
    const vMag = Math.sqrt(vx*vx + vy*vy);
    
    // Moltiplichiamo la direzione normalizzata per la velocità orbitale calcolata per visualizzare il vettore
    const scaleV = 35 * orbitData.velocity;
    const velVecX = (vx / vMag) * scaleV;
    const velVecY = (vy / vMag) * scaleV;
    
    ctx.beginPath();
    ctx.moveTo(earthX, earthY);
    ctx.lineTo(earthX + velVecX, earthY + velVecY);
    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Punta della freccia del vettore velocità
    const angleV = Math.atan2(velVecY, velVecX);
    ctx.fillStyle = "#ff0055";
    ctx.beginPath();
    ctx.moveTo(earthX + velVecX, earthY + velVecY);
    ctx.lineTo(earthX + velVecX - 8 * Math.cos(angleV - Math.PI/6), earthY + velVecY - 8 * Math.sin(angleV - Math.PI/6));
    ctx.lineTo(earthX + velVecX - 8 * Math.cos(angleV + Math.PI/6), earthY + velVecY - 8 * Math.sin(angleV + Math.PI/6));
    ctx.closePath();
    ctx.fill();
    
    // Ripristiniamo l'origine per tracciare elementi assoluti
    ctx.restore();
    
    // 7. Disegno fisico del Sole (Glow + Cerchio dorato nel fuoco)
    ctx.save();
    ctx.translate(centerX + sunX, centerY + sunY);
    
    const gradSun = ctx.createRadialGradient(0, 0, 3, 0, 0, 18);
    gradSun.addColorStop(0, "#ffffff");
    gradSun.addColorStop(0.2, colors.sun);
    gradSun.addColorStop(0.7, "rgba(255, 170, 0, 0.2)");
    gradSun.addColorStop(1, "transparent");
    ctx.fillStyle = gradSun;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = colors.sun;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
    
    // 8. Disegno fisico della Terra (Glow + Cerchio azzurro)
    ctx.save();
    ctx.translate(centerX + earthX, centerY + earthY);
    
    const gradEarth = ctx.createRadialGradient(0, 0, 2, 0, 0, 10);
    gradEarth.addColorStop(0, "#ffffff");
    gradEarth.addColorStop(0.3, colors.earth);
    gradEarth.addColorStop(0.8, "rgba(0, 210, 255, 0.25)");
    gradEarth.addColorStop(1, "transparent");
    ctx.fillStyle = gradEarth;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = colors.earth;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
    
    // 9. Legenda ed etichette informative nell'angolo superiore sinistro
    ctx.font = "11px Outfit";
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = "left";
    
    ctx.fillText("Vettore Velocità orbitale (Keplero 2)", 12, 22);
    ctx.beginPath();
    ctx.moveTo(215, 18); ctx.lineTo(235, 18);
    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    ctx.fillStyle = colors.textMuted;
    ctx.fillText("Area spazzata (Legge delle Aree)", 12, 38);
    ctx.fillStyle = "rgba(0, 210, 255, 0.15)";
    ctx.fillRect(215, 30, 20, 10);
    ctx.strokeStyle = "rgba(0, 210, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(215, 30, 20, 10);
    
    // Legenda valori numerici in basso a sinistra
    ctx.font = "10px JetBrains Mono";
    ctx.fillStyle = colors.textPrimary;
    ctx.fillText(`Distanza r: ${orbitData.radius.toFixed(4)} UA`, 12, height - 38);
    ctx.fillText(`Velocità v: ${(orbitData.velocity * 29.78).toFixed(2)} km/s`, 12, height - 24);
    ctx.fillText(`Scarto Giorno (Ecc): ${data.deltaDayEcc >= 0 ? "+" : ""}${data.deltaDayEcc.toFixed(1)}s/giorno`, 12, height - 10);
}

/**
 * QUADRANTE 2: Proiezione dell'Obliquità (Sfera Celeste 3D-Like)
 */
function drawObliquityQuadrant(canvas, data, orbitData) {
    const { width, height, ctx } = setupCanvas(canvas);
    
    ctx.fillStyle = colors.bgDark;
    ctx.fillRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2 + 10;
    const baseR = Math.min(width, height) * 0.32; // Raggio di base della sfera
    const R = baseR * state.viewZoom;             // Raggio scalato dallo zoom
    
    // Funzione di proiezione 3D prospettica ortografica con rotazione Pitch/Yaw
    function project3D(x, y, z) {
        // 1. Rotazione attorno all'asse Y (Yaw)
        let x1 = x * Math.cos(state.viewYaw) - z * Math.sin(state.viewYaw);
        let z1 = x * Math.sin(state.viewYaw) + z * Math.cos(state.viewYaw);
        let y1 = y;

        // 2. Rotazione attorno all'asse X (Pitch)
        let x2 = x1;
        let y2 = y1 * Math.cos(state.viewPitch) - z1 * Math.sin(state.viewPitch);
        let z2 = y1 * Math.sin(state.viewPitch) + z1 * Math.cos(state.viewPitch);

        return {
            x: cx + x2,
            y: cy - y2, // Inverted to make positive Y point UP in canvas
            z: z2 // z-depth per il z-sorting
        };
    }
    
    // Raggio terrestre nel disegno
    const earthRadius = R * 0.16;
    
    // -------------------------------------------------------------
    // FUNZIONI DI TRACCIAMENTO DEI SEGMENTI CON Z-SORTING
    // Dividiamo qualsiasi cerchio/linea in segmenti 3D e li disegniamo
    // in base al fatto che siano in secondo piano (z < 0) o primo piano (z >= 0)
    // -------------------------------------------------------------
    
    function draw3DPath(points, color, lineWidth, isDashed = false, layer = 'all') {
        ctx.beginPath();
        let active = false;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            
            const proj1 = project3D(p1.x, p1.y, p1.z);
            const proj2 = project3D(p2.x, p2.y, p2.z);
            
            // Calcoliamo la profondità media del segmento
            const avgZ = (proj1.z + proj2.z) / 2;
            
            // Controlliamo il filtro del layer:
            // 'back': disegna solo segmenti dietro l'asse medio della sfera terrestre (avgZ < -earthRadius)
            // 'front': disegna solo segmenti davanti (avgZ >= -earthRadius)
            // 'all': disegna tutto
            let shouldDraw = false;
            if (layer === 'back') {
                shouldDraw = avgZ < -earthRadius;
            } else if (layer === 'front') {
                shouldDraw = avgZ >= -earthRadius;
            } else {
                shouldDraw = true;
            }
            
            if (shouldDraw) {
                if (!active) {
                    ctx.beginPath();
                    ctx.moveTo(proj1.x, proj1.y);
                    active = true;
                }
                ctx.lineTo(proj2.x, proj2.y);
            } else {
                if (active) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    if (isDashed) ctx.setLineDash([4, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    active = false;
                }
            }
        }
        
        if (active) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            if (isDashed) ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // -------------------------------------------------------------
    // GENERAZIONE DEI PUNTI 3D PER LE DIVERSE GEOMETRIE
    // -------------------------------------------------------------
    
    // 1. Cerchio Equatore Celeste (sul piano X-Z, y = 0)
    const equatorPoints = [];
    for (let a = 0; a <= 2 * Math.PI + 0.05; a += 0.05) {
        equatorPoints.push({ x: R * Math.cos(a), y: 0, z: R * Math.sin(a) });
    }
    
    // 2. Cerchio Eclittica (inclinata di obliquità attorno all'asse X)
    const eclipticPoints = [];
    const eps = state.obliquity;
    for (let a = 0; a <= 2 * Math.PI + 0.05; a += 0.05) {
        eclipticPoints.push({
            x: R * Math.cos(a),
            y: R * Math.sin(a) * Math.sin(eps),
            z: R * Math.sin(a) * Math.cos(eps)
        });
    }
    
    // 3. Meridiani della Sfera Celeste (fili di griglia per dare profondità)
    const meridiansList = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
    
    // 4. Asse di rotazione celeste (verticale passante per i poli)
    const topAxis = { x: 0, y: R * 1.15, z: 0 };
    const bottomAxis = { x: 0, y: -R * 1.15, z: 0 };
    const axisTopPoints = [{ x: 0, y: earthRadius, z: 0 }, topAxis];
    const axisBotPoints = [bottomAxis, { x: 0, y: -earthRadius, z: 0 }];

    // -------------------------------------------------------------
    // FASE DI RENDERING STRATIFICATO (Z-SORTING)
    // -------------------------------------------------------------
    
    // --- STRATO 1: ELEMENTI DI SFONDO (Z < -earthRadius) ---
    
    // Bordo sferico esterno (guscio di fondo)
    ctx.fillStyle = "rgba(20, 18, 50, 0.2)";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fill();
    
    // Disegna la metà posteriore dell'Equatore Celeste (grigio tratteggiato)
    draw3DPath(equatorPoints, "rgba(255, 255, 255, 0.12)", 1, true, 'back');
    
    // Disegna la metà posteriore dell'Eclittica (viola tratteggiato)
    draw3DPath(eclipticPoints, "rgba(240, 0, 255, 0.18)", 1.2, true, 'back');
    
    // Disegna la metà posteriore dell'Asse celeste
    draw3DPath(axisTopPoints, "rgba(255, 255, 255, 0.08)", 1, true, 'back');
    draw3DPath(axisBotPoints, "rgba(255, 255, 255, 0.08)", 1, true, 'back');
    
    // Disegna griglie sferiche posteriori
    meridiansList.forEach(mAngle => {
        const meridianPoints = [];
        for (let phi = 0; phi <= 2 * Math.PI + 0.05; phi += 0.05) {
            meridianPoints.push({
                x: R * Math.sin(phi) * Math.cos(mAngle),
                y: R * Math.cos(phi),
                z: R * Math.sin(phi) * Math.sin(mAngle)
            });
        }
        draw3DPath(meridianPoints, "rgba(255, 255, 255, 0.03)", 0.8, false, 'back');
    });

    // --- STRATO 2: IL CORPO CELESTE CENTRALE (LA TERRA a Z = 0) ---
    ctx.save();
    ctx.translate(cx, cy);
    
    // Sfera terrestre con gradiente per effetto 3D
    const earthGrad = ctx.createRadialGradient(-earthRadius * 0.2, -earthRadius * 0.2, earthRadius * 0.1, 0, 0, earthRadius);
    earthGrad.addColorStop(0, "#4cd6ff");
    earthGrad.addColorStop(0.3, "#0066ff");
    earthGrad.addColorStop(0.7, "#030225");
    earthGrad.addColorStop(1, "#01010c");
    
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(0, 0, earthRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
    
    // Disegna asse di rotazione della Terra sulla superficie
    const poleN = project3D(0, earthRadius, 0);
    const poleS = project3D(0, -earthRadius, 0);
    ctx.beginPath();
    ctx.moveTo(poleN.x, poleN.y);
    ctx.lineTo(poleS.x, poleS.y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    
    // Disegna equatore terrestre sulla superficie (fronte)
    const earthEquatorPoints = [];
    for (let a = 0; a <= 2 * Math.PI + 0.05; a += 0.05) {
        earthEquatorPoints.push({ x: earthRadius * Math.cos(a), y: 0, z: earthRadius * Math.sin(a) });
    }
    draw3DPath(earthEquatorPoints, "rgba(255, 255, 255, 0.3)", 0.8, false, 'front');

    // --- STRATO 3: ELEMENTI DI PRIMO PIANO (Z >= -earthRadius) ---
    
    // Disegna la metà anteriore dell'Equatore Celeste (bianco solido)
    draw3DPath(equatorPoints, "rgba(255, 255, 255, 0.35)", 1.5, false, 'front');
    
    // Disegna la metà anteriore dell'Eclittica (viola brillante solido)
    draw3DPath(eclipticPoints, colors.obl, 2, false, 'front');
    
    // Disegna la metà anteriore dell'Asse celeste
    draw3DPath(axisTopPoints, "rgba(255, 255, 255, 0.4)", 1.5, false, 'front');
    draw3DPath(axisBotPoints, "rgba(255, 255, 255, 0.4)", 1.5, false, 'front');
    
    // Disegna griglie sferiche anteriori
    meridiansList.forEach(mAngle => {
        const meridianPoints = [];
        for (let phi = 0; phi <= 2 * Math.PI + 0.05; phi += 0.05) {
            meridianPoints.push({
                x: R * Math.sin(phi) * Math.cos(mAngle),
                y: R * Math.cos(phi),
                z: R * Math.sin(phi) * Math.sin(mAngle)
            });
        }
        draw3DPath(meridianPoints, "rgba(255, 255, 255, 0.05)", 0.8, false, 'front');
    });
    
    // Bordo sferico esterno (profilo di luce 3D)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();

    // -------------------------------------------------------------
    // IL SOLE VERO, IL SOLE PROIETTATO E IL MERIDIANO DI CONVERSIONE
    // -------------------------------------------------------------
    
    // Angolo orbitale del Sole sull'eclittica (lambda)
    const lambda = getB(state.dayOfYear);
    
    // Coordinata 3D del Sole Vero
    const sun3D = {
        x: R * Math.cos(lambda),
        y: R * Math.sin(lambda) * Math.sin(eps),
        z: R * Math.sin(lambda) * Math.cos(eps)
    };
    
    // Proiezione 2D del Sole Vero
    const sunProj = project3D(sun3D.x, sun3D.y, sun3D.z);
    
    // Coordinata 3D del Sole Proiettato sull'equatore celeste (Right Ascension alpha)
    const alpha = Math.atan2(Math.sin(lambda) * Math.cos(eps), Math.cos(lambda));
    const proj3D = {
        x: R * Math.cos(alpha),
        y: 0,
        z: R * Math.sin(alpha)
    };
    
    // Proiezione 2D del Sole Proiettato
    const eqProj = project3D(proj3D.x, proj3D.y, proj3D.z);
    
    // Disegna l'arco del meridiano celeste che collega il Sole all'Equatore
    const meridianArcPoints = [];
    const solDecRad = Math.asin(Math.sin(lambda) * Math.sin(eps)); // declinazione in radianti
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
        const decStep = solDecRad * (i / steps);
        meridianArcPoints.push({
            x: R * Math.cos(decStep) * Math.cos(alpha),
            y: R * Math.sin(decStep),
            z: R * Math.cos(decStep) * Math.sin(alpha)
        });
    }
    
    // Disegna il meridiano di connessione (luminoso, tratteggiato)
    draw3DPath(meridianArcPoints, "rgba(255, 255, 255, 0.4)", 1.2, true, 'all');
    
    // Disegna il vettore raggio sole-centro
    const sunBeamPoints = [{ x: 0, y: 0, z: 0 }, sun3D];
    draw3DPath(sunBeamPoints, "rgba(255, 208, 0, 0.25)", 1.2, false, 'all');

    // -------------------------------------------------------------
    // RENDERING DEL SOLE VERO E DEL SOLE PROIETTATO
    // -------------------------------------------------------------
    
    // 1. Sole Vero (sfera gialla brillante con glow)
    ctx.save();
    const sunGlowRadius = 14 * state.viewZoom;
    const sunCoreRadius = 6 * state.viewZoom;
    
    const gradSun = ctx.createRadialGradient(sunProj.x, sunProj.y, 1, sunProj.x, sunProj.y, sunGlowRadius);
    gradSun.addColorStop(0, "#ffffff");
    gradSun.addColorStop(0.3, colors.sun);
    gradSun.addColorStop(0.8, "rgba(255, 170, 0, 0.2)");
    gradSun.addColorStop(1, "transparent");
    ctx.fillStyle = gradSun;
    ctx.beginPath();
    ctx.arc(sunProj.x, sunProj.y, sunGlowRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = colors.sun;
    ctx.beginPath();
    ctx.arc(sunProj.x, sunProj.y, sunCoreRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    
    // 2. Sole Proiettato (cerchietto viola sull'Equatore Celeste)
    ctx.save();
    const projRadius = 4 * state.viewZoom;
    ctx.fillStyle = colors.obl;
    ctx.beginPath();
    ctx.arc(eqProj.x, eqProj.y, projRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // -------------------------------------------------------------
    // ANNOTAZIONI TESTUALI 3D (Posizionate dinamicamente nello spazio)
    // -------------------------------------------------------------
    ctx.font = "10px Outfit";
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = "center";
    
    // Etichette dei Poli Celesti proiettati
    const labelTopP = project3D(0, R * 1.15, 0);
    ctx.fillText("POLO NORD (PC)", labelTopP.x, labelTopP.y - 6);
    
    // Annotazioni degli Equinozi e Solstizi principali
    const labelSpring = project3D(R, 0, 0);
    ctx.fillStyle = colors.textDark;
    ctx.fillText("γ (21 MAR)", labelSpring.x + 12, labelSpring.y + 12);
    
    const labelSummer = project3D(0, R * Math.sin(eps), R * Math.cos(eps));
    ctx.fillStyle = colors.obl;
    ctx.fillText("Solstizio Estate", labelSummer.x, labelSummer.y - 12);

    // Indicatori fisici nel quadrante
    ctx.font = "10px JetBrains Mono";
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = "left";
    ctx.fillText(`Inclinazione Asse: ${(state.obliquity * 180 / Math.PI).toFixed(2)}°`, 12, height - 38);
    ctx.fillText(`Declinazione Solare: ${data.declination >= 0 ? "+" : ""}${data.declination.toFixed(2)}°`, 12, height - 24);
    ctx.fillText(`Scarto Giorno (Obl): ${data.deltaDayObl >= 0 ? "+" : ""}${data.deltaDayObl.toFixed(1)}s/giorno`, 12, height - 10);
    
    // Suggerimento interattivo nell'angolo in alto a destra
    ctx.font = "9px Outfit";
    ctx.fillStyle = colors.textDark;
    ctx.textAlign = "right";
    ctx.fillText("Trascina per RUOTARE | Rotella per ZOOM", width - 12, 22);

    // --- INSET: MERIDIANA A MEZZOGIORNO SOLARE ---
    const insetW = 120;
    const insetH = 90;
    const padding = 15;
    const inX = width - insetW - padding;
    const inY = height - insetH - padding;
    
    // Sfondo dell'inset
    ctx.fillStyle = "rgba(10, 10, 25, 0.85)";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(inX, inY, insetW, insetH, 6);
    } else {
        ctx.rect(inX, inY, insetW, insetH);
    }
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Titolo inset
    ctx.font = "9px Outfit";
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = "center";
    ctx.fillText("MERIDIANA (Ore 12:00)", inX + insetW / 2, inY + 14);
    
    // Dati fisici
    const latitude = 45.7; // Ponte di Piave
    const sunAltRad = (90 - latitude + data.declination) * Math.PI / 180;
    
    // Geometria
    const gX = inX + insetW / 2;
    const gBottomY = inY + insetH - 22;
    const gH = 30; // Altezza gnomone
    const gTopY = gBottomY - gH;
    
    // Piano prospettico (ellisse)
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.ellipse(gX, gBottomY, 45, 16, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Linea meridiana (12:00 solare - Nord/Sud)
    ctx.beginPath();
    ctx.moveTo(gX, gBottomY - 16);
    ctx.lineTo(gX, gBottomY + 16);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.stroke();
    
    // Linee ausiliarie delle ore (11:00 a Ovest, 13:00 a Est)
    ctx.beginPath();
    ctx.moveTo(gX, gBottomY);
    ctx.lineTo(gX - 11, gBottomY - 14);
    ctx.moveTo(gX, gBottomY);
    ctx.lineTo(gX + 11, gBottomY - 14);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.stroke();
    
    // Punti cardinali
    ctx.font = "8px JetBrains Mono";
    ctx.fillStyle = colors.textDark;
    ctx.fillText("N", gX, gBottomY - 18);
    ctx.fillText("S", gX, gBottomY + 22);
    ctx.fillText("E", gX + 50, gBottomY + 3);
    ctx.fillText("W", gX - 50, gBottomY + 3);
    
    // Calcolo ombra
    const perspectiveY = 16 / 45; // Schiacciamento prospettico
    const shadowL = gH / Math.tan(sunAltRad);
    const shadowVisualL = shadowL * perspectiveY;
    
    // Scostamento orizzontale (X) dovuto all'Equazione del Tempo
    // Se EoT > 0 (anticipo), il sole è già passato a Ovest (sinistra), l'ombra cade a Est (destra)
    // Se EoT < 0 (ritardo), il sole è ancora a Est (destra), l'ombra cade a Ovest (sinistra)
    const shadowVisualX = data.totalEoT * 1.3; // 1.3 pixel per ogni minuto di scarto
    
    const shadowEndX = gX + shadowVisualX;
    const shadowEndY = gBottomY - shadowVisualL;
    
    // Disegno ombra - Strato 1: Penombra (sfumata e ampia)
    ctx.beginPath();
    ctx.moveTo(gX, gBottomY);
    ctx.lineTo(shadowEndX, shadowEndY);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 6.0;
    ctx.lineCap = "round";
    ctx.stroke();
    
    // Disegno ombra - Strato 2: Umbra (scura e nitida per massimo contrasto)
    ctx.beginPath();
    ctx.moveTo(gX, gBottomY);
    ctx.lineTo(shadowEndX, shadowEndY);
    ctx.strokeStyle = "rgba(5, 5, 15, 0.95)";
    ctx.lineWidth = 3.0;
    ctx.lineCap = "round";
    ctx.stroke();
    
    // Raggio di luce
    ctx.beginPath();
    ctx.moveTo(gX, gTopY);
    ctx.lineTo(shadowEndX, shadowEndY);
    ctx.strokeStyle = "rgba(255, 208, 0, 0.65)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Gnomone
    ctx.beginPath();
    ctx.moveTo(gX, gBottomY);
    ctx.lineTo(gX, gTopY);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.0;
    ctx.lineCap = "round";
    ctx.stroke();
    
    // Punta dorata dello gnomone
    ctx.fillStyle = colors.sun;
    ctx.beginPath();
    ctx.arc(gX, gTopY, 1.5, 0, 2 * Math.PI);
    ctx.fill();
}

/**
 * QUADRANTE 3: Grafico Interattivo delle Curve dell'Equazione del Tempo
 */
function drawChartQuadrant(canvas, data) {
    const { width, height, ctx } = setupCanvas(canvas);
    
    ctx.fillStyle = colors.bgDark;
    ctx.fillRect(0, 0, width, height);
    
    // Dimensioni area del grafico
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;
    
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    
    // Calcoliamo la coordinata Y per il valore 0 dell'EoT (centro del grafico)
    const zeroY = paddingTop + chartH / 2;
    
    // Limiti del grafico: Y da -20 a +20 minuti
    const yMax = 20; // minuti
    
    // 1. Tracciamento della griglia orizzontale (asse Y)
    const yLines = [-15, -10, -5, 0, 5, 10, 15];
    ctx.font = "9px JetBrains Mono";
    ctx.textAlign = "right";
    
    yLines.forEach(yVal => {
        const y = zeroY - (yVal / yMax) * (chartH / 2);
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        
        if (yVal === 0) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1.2;
            ctx.fillStyle = colors.textPrimary;
        } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 0.8;
            ctx.fillStyle = colors.textDark;
        }
        ctx.stroke();
        
        // Etichetta minuti
        ctx.fillText(`${yVal >= 0 ? "+" : ""}${yVal}m`, paddingLeft - 8, y + 3);
    });
    
    // 2. Griglia verticale per i mesi (asse X)
    const monthLengths = months.map(m => m.days);
    let currentAccum = 0;
    
    ctx.font = "9px Outfit";
    ctx.textAlign = "center";
    
    months.forEach((month, idx) => {
        const xStart = paddingLeft + (currentAccum / 365) * chartW;
        const xEnd = paddingLeft + ((currentAccum + month.days) / 365) * chartW;
        const xMid = (xStart + xEnd) / 2;
        
        // Linea verticale divisoria del mese
        ctx.beginPath();
        ctx.moveTo(xStart, paddingTop);
        ctx.lineTo(xStart, paddingTop + chartH);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        
        // Etichetta abbreviata del mese
        ctx.fillStyle = colors.textMuted;
        ctx.fillText(month.name.substring(0, 3).toUpperCase(), xMid, paddingTop + chartH + 15);
        
        currentAccum += month.days;
    });
    
    // 3. Tracciamento delle tre curve dell'EoT per tutti i 365 giorni dell'anno
    const drawCurve = (color, widthCurve, evalFunc) => {
        ctx.beginPath();
        for (let day = 1; day <= 365; day++) {
            const val = evalFunc(day);
            const x = paddingLeft + ((day - 1) / 364) * chartW;
            const y = zeroY - (val / yMax) * (chartH / 2);
            
            if (day === 1) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = widthCurve;
        ctx.stroke();
    };
    
    // Curva 1: Eccentricità (Azzurra)
    drawCurve(colors.ecc, 1.2, (d) => calculateEoT(d).eccentricityComponent);
    
    // Curva 2: Obliquità (Viola)
    drawCurve(colors.obl, 1.2, (d) => calculateEoT(d).obliquityComponent);
    
    // Curva 3: Risultante Equazione del Tempo Totale (Oro spessa)
    drawCurve(colors.eot, 2.5, (d) => calculateEoT(d).totalEoT);
    
    // 4. Tracciamento della barra del GIORNO SELEZIONATO
    const currentX = paddingLeft + ((state.dayOfYear - 1) / 364) * chartW;
    ctx.beginPath();
    ctx.moveTo(currentX, paddingTop);
    ctx.lineTo(currentX, paddingTop + chartH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 5. Cerchi d'intersezione sulle tre curve al giorno selezionato
    const drawIntersectionDot = (val, color, r = 4) => {
        const y = zeroY - (val / yMax) * (chartH / 2);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(currentX, y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
    };
    
    drawIntersectionDot(data.eccentricityComponent, colors.ecc);
    drawIntersectionDot(data.obliquityComponent, colors.obl);
    drawIntersectionDot(data.totalEoT, colors.eot, 5.5);
    
    // Legenda interattiva sul grafico nell'angolo in alto a destra
    ctx.font = "9px Outfit";
    ctx.textAlign = "left";
    
    ctx.fillStyle = colors.ecc;
    ctx.fillText(`● Eccentricità: ${data.eccentricityComponent >= 0 ? "+" : ""}${data.eccentricityComponent.toFixed(1)}m`, paddingLeft + 15, paddingTop + 12);
    
    ctx.fillStyle = colors.obl;
    ctx.fillText(`● Obliquità: ${data.obliquityComponent >= 0 ? "+" : ""}${data.obliquityComponent.toFixed(1)}m`, paddingLeft + 140, paddingTop + 12);
    
    ctx.fillStyle = colors.eot;
    ctx.fillText(`● Totale EoT: ${data.totalEoT >= 0 ? "+" : ""}${data.totalEoT.toFixed(1)}m`, paddingLeft + 250, paddingTop + 12);
    
    // Salviamo le coordinate del grafico nello stato del canvas per consentire l'interattività via drag
    canvas.chartArea = {
        left: paddingLeft,
        right: width - paddingRight,
        width: chartW
    };
}

/**
 * QUADRANTE 4: Rendering dell'Analemma (La figura a 8)
 */
function drawAnalemmaQuadrant(canvas, data) {
    const { width, height, ctx } = setupCanvas(canvas);
    
    ctx.fillStyle = colors.bgDark;
    ctx.fillRect(0, 0, width, height);
    
    // Dimensioni area utile
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 25;
    
    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;
    
    // Limiti degli assi dell'analemma:
    // Asse X: Equazione del Tempo in minuti da -20 a +20
    const xMax = 20;
    // Asse Y: Declinazione solare in gradi da -25 a +25
    const yMax = 25;
    
    const zeroX = paddingLeft + plotW / 2;
    const zeroY = paddingTop + plotH / 2;
    
    // 1. Disegniamo le griglie dell'asse X (Equazione del Tempo in minuti)
    const xLines = [-15, -10, -5, 0, 5, 10, 15];
    ctx.font = "9px JetBrains Mono";
    ctx.textAlign = "center";
    
    xLines.forEach(xVal => {
        const x = zeroX + (xVal / xMax) * (plotW / 2);
        
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, paddingTop + plotH);
        
        if (xVal === 0) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1.2;
            ctx.fillStyle = colors.textPrimary;
        } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 0.8;
            ctx.fillStyle = colors.textDark;
        }
        ctx.stroke();
        
        ctx.fillText(`${xVal > 0 ? "+" : ""}${xVal}m`, x, paddingTop + plotH + 12);
    });
    
    // Etichetta dell'asse X in basso a destra
    ctx.font = "9px Outfit";
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = "right";
    ctx.fillText("RITARDO ◀  EoT (minuti)  ▶ ANTICIPO", width - paddingRight, paddingTop + plotH - 6);
    
    // 2. Disegniamo le griglie dell'asse Y (Declinazione Solare in gradi)
    const yLines = [-20, -10, 0, 10, 20];
    ctx.font = "9px JetBrains Mono";
    ctx.textAlign = "right";
    
    yLines.forEach(yVal => {
        const y = zeroY - (yVal / yMax) * (plotH / 2);
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(paddingLeft + plotW, y);
        
        if (yVal === 0) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1.2;
            ctx.fillStyle = colors.textPrimary;
        } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 0.8;
            ctx.fillStyle = colors.textDark;
        }
        ctx.stroke();
        
        ctx.fillText(`${yVal > 0 ? "+" : ""}${yVal}°`, paddingLeft - 6, y + 3);
    });
    
    // Etichetta dell'asse Y ruotata
    ctx.save();
    ctx.translate(12, zeroY);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "9px Outfit";
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = "center";
    ctx.fillText("◀ SUD  Declinazione Solare (gradi)  NORD ▶", 0, 0);
    ctx.restore();
    
    // 3. Tracciamento dell'Analemma completo (curva ad 8) per l'intero anno
    ctx.beginPath();
    for (let day = 1; day <= 365; day++) {
        const dayData = calculateEoT(day);
        const x = zeroX + (dayData.totalEoT / xMax) * (plotW / 2);
        const y = zeroY - (dayData.declination / yMax) * (plotH / 2);
        
        if (day === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Disegniamo una sfumatura al neon sull'analemma per farlo risplendere
    ctx.beginPath();
    for (let day = 1; day <= 365; day++) {
        const dayData = calculateEoT(day);
        const x = zeroX + (dayData.totalEoT / xMax) * (plotW / 2);
        const y = zeroY - (dayData.declination / yMax) * (plotH / 2);
        if (day === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 170, 0, 0.15)";
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // 4. Marcatori temporali chiave dell'anno sull'analemma (Equinozi e Solstizi)
    const drawMilestone = (day, label, align = "left", offsetX = 8, offsetY = 3) => {
        const mData = calculateEoT(day);
        const x = zeroX + (mData.totalEoT / xMax) * (plotW / 2);
        const y = zeroY - (mData.declination / yMax) * (plotH / 2);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.font = "8px Outfit";
        ctx.fillStyle = colors.textDark;
        ctx.textAlign = align;
        ctx.fillText(label, x + offsetX, y + offsetY);
    };
    
    drawMilestone(1, "1 GEN", "left", 6, 8);
    drawMilestone(81, "γ (21 MAR)", "left", 8, -2);
    drawMilestone(172, "SOL. ESTATE (21 GIU)", "center", 0, -8);
    drawMilestone(264, "23 SET", "right", -8, 2);
    drawMilestone(355, "SOL. INVERNO (21 DIC)", "center", 0, 10);
    
    // 5. Evidenziazione della POSIZIONE ATTUALE (Sole orbitante)
    const currentX = zeroX + (data.totalEoT / xMax) * (plotW / 2);
    const currentY = zeroY - (data.declination / yMax) * (plotH / 2);
    
    // Glow dorato ad anello attorno al Sole dell'analemma
    const glowSun = ctx.createRadialGradient(currentX, currentY, 1, currentX, currentY, 12);
    glowSun.addColorStop(0, "#ffffff");
    glowSun.addColorStop(0.3, colors.eot);
    glowSun.addColorStop(0.8, "rgba(255, 170, 0, 0.2)");
    glowSun.addColorStop(1, "transparent");
    ctx.fillStyle = glowSun;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = colors.eot;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 5.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// --- CICLO PRINCIPALE DI AGGIORNAMENTO E GESTIONE INTERATTIVITÀ ---

/**
 * Aggiorna tutti gli elementi dell'interfaccia utente (HTML metrics + canvas)
 */
function updateUI() {
    // 1. Calcoli astronomici
    const data = calculateEoT(state.dayOfYear);
    
    // Coefficiente di eccentricità per Keplero
    const e = state.orbitMode === 'didactic' ? 0.25 : 0.0167;
    const orbitData = calculateOrbit(state.dayOfYear, e);
    
    // 2. Aggiornamento elementi di testo e grafici HTML
    const dateInfo = dayToDate(state.dayOfYear);
    document.getElementById('day-display').textContent = `Giorno ${Math.floor(state.dayOfYear)} (${dateInfo.day} ${dateInfo.monthName})`;
    document.getElementById('day-slider').value = Math.floor(state.dayOfYear);
    document.getElementById('date-picker').value = dayToDatePickerVal(state.dayOfYear);
    
    // Aggiornamento dei Badge Metrics del pannello di riepilogo superiore
    document.getElementById('val-eot').textContent = formatMinutesSeconds(data.totalEoT);
    
    // Colora in verde se in anticipo (+), rosso in ritardo (-)
    const eotMetricCard = document.getElementById('val-eot');
    if (data.totalEoT >= 0) {
        eotMetricCard.className = "summary-value plus";
    } else {
        eotMetricCard.className = "summary-value minus";
    }
    
    // Metrica Variazione Giorno Solare
    const formattedDelta = `${data.deltaDayTotal >= 0 ? "+" : ""}${data.deltaDayTotal.toFixed(1)}s`;
    const dayLenMetric = document.getElementById('val-daylen');
    dayLenMetric.textContent = formattedDelta;
    dayLenMetric.className = `summary-value ${data.deltaDayTotal >= 0 ? "plus" : "minus"}`;
    
    // Distanza Terra-Sole ed Inclinazione
    document.getElementById('val-distance').textContent = `${orbitData.radius.toFixed(4)} UA`;
    document.getElementById('val-declination').textContent = `${data.declination >= 0 ? "+" : ""}${data.declination.toFixed(1)}°`;
    
    // Metriche dei singoli quadranti (Badges)
    const badgeEcc = document.getElementById('badge-val-ecc-day');
    badgeEcc.textContent = `${data.deltaDayEcc >= 0 ? "+" : ""}${data.deltaDayEcc.toFixed(1)}s`;
    badgeEcc.className = `badge-value ${data.deltaDayEcc >= 0 ? "plus" : "minus"}`;
    
    const badgeObl = document.getElementById('badge-val-obl-day');
    badgeObl.textContent = `${data.deltaDayObl >= 0 ? "+" : ""}${data.deltaDayObl.toFixed(1)}s`;
    badgeObl.className = `badge-value ${data.deltaDayObl >= 0 ? "plus" : "minus"}`;
    
    document.getElementById('badge-val-eot-tot').textContent = `${data.totalEoT >= 0 ? "+" : ""}${data.totalEoT.toFixed(1)} m`;
    document.getElementById('badge-val-analemma').textContent = `${data.totalEoT >= 0 ? "+" : ""}${data.totalEoT.toFixed(1)}m, ${data.declination >= 0 ? "+" : ""}${data.declination.toFixed(1)}°`;
    
    // 3. Rendering dei 4 Quadranti grafici sui rispettivi Canvas
    drawOrbitQuadrant(document.getElementById('canvas-orbit'), data, orbitData, e);
    drawObliquityQuadrant(document.getElementById('canvas-obliquity'), data, orbitData);
    drawChartQuadrant(document.getElementById('canvas-chart'), data);
    drawAnalemmaQuadrant(document.getElementById('canvas-analemma'), data);
}

/**
 * Loop dell'animazione
 */
function animationLoop(timestamp) {
    if (!state.isPlaying) {
        state.lastTimestamp = 0;
        return;
    }
    
    if (!state.lastTimestamp) state.lastTimestamp = timestamp;
    const deltaMs = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;
    
    // Calcoliamo l'incremento di giorni basandoci sul tempo trascorso e il fattore velocità
    // 1 secondo reale = speedFactor * 10 giorni
    const daysPerSecond = state.speedFactor * 18;
    const dayIncrement = (deltaMs / 1000) * daysPerSecond;
    
    state.dayOfYear = (state.dayOfYear + dayIncrement) % 365;
    if (state.dayOfYear <= 0) state.dayOfYear += 365;
    
    updateUI();
    
    requestAnimationFrame(animationLoop);
}

// --- CONFIGURAZIONE DEGLI EVENT LISTENERS (INTERATTIVITÀ) ---

function initEventHandlers() {
    const daySlider = document.getElementById('day-slider');
    const datePicker = document.getElementById('date-picker');
    const playBtn = document.getElementById('play-btn');
    const playText = document.getElementById('play-text');
    const playIcon = document.getElementById('play-icon');
    const speedSelect = document.getElementById('speed-select');
    const btnModeDidactic = document.getElementById('btn-mode-didactic');
    const btnModeReal = document.getElementById('btn-mode-real');
    const chartCanvas = document.getElementById('canvas-chart');
    
    // 1. Slider interattivo della data
    daySlider.addEventListener('input', (e) => {
        state.isPlaying = false;
        playBtn.classList.remove('playing');
        playText.textContent = "Avvia";
        playIcon.textContent = "▶";
        
        state.dayOfYear = parseFloat(e.target.value);
        updateUI();
    });
    
    // 2. Date picker classico (Calendario)
    datePicker.addEventListener('change', (e) => {
        state.isPlaying = false;
        playBtn.classList.remove('playing');
        playText.textContent = "Avvia";
        playIcon.textContent = "▶";
        
        state.dayOfYear = dateToDayOfYear(e.target.value);
        updateUI();
    });
    
    // 3. Play / Pause Animazione
    playBtn.addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        
        if (state.isPlaying) {
            playBtn.classList.add('playing');
            playText.textContent = "Pausa";
            playIcon.textContent = "❚❚";
            state.lastTimestamp = performance.now();
            requestAnimationFrame(animationLoop);
        } else {
            playBtn.classList.remove('playing');
            playText.textContent = "Avvia";
            playIcon.textContent = "▶";
        }
    });
    
    // 4. Selettore velocità
    speedSelect.addEventListener('change', (e) => {
        state.speedFactor = parseFloat(e.target.value);
    });
    
    // 5. Toggle eccentricità dell'orbita
    btnModeDidactic.addEventListener('click', () => {
        btnModeDidactic.classList.add('active');
        btnModeReal.classList.remove('active');
        state.orbitMode = 'didactic';
        updateUI();
    });
    
    btnModeReal.addEventListener('click', () => {
        btnModeReal.classList.add('active');
        btnModeDidactic.classList.remove('active');
        state.orbitMode = 'real';
        updateUI();
    });
    
    // 6. Interazione drag & click sul Quadrante del Grafico EoT
    let isDraggingChart = false;
    
    function handleChartInteraction(e) {
        const rect = chartCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        if (chartCanvas.chartArea) {
            const area = chartCanvas.chartArea;
            // Proiettiamo la coordinata X del mouse nel range dei 365 giorni dell'anno
            let fraction = (mouseX - area.left) / area.width;
            fraction = Math.max(0, Math.min(1, fraction));
            
            state.isPlaying = false;
            playBtn.classList.remove('playing');
            playText.textContent = "Avvia";
            playIcon.textContent = "▶";
            
            state.dayOfYear = 1 + fraction * 364;
            updateUI();
        }
    }
    
    chartCanvas.addEventListener('mousedown', (e) => {
        isDraggingChart = true;
        handleChartInteraction(e);
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isDraggingChart) {
            handleChartInteraction(e);
        }
    });
    
    window.addEventListener('mouseup', () => {
        isDraggingChart = false;
    });
    
    // Gestione dei touch event per schermi mobili e tablet
    chartCanvas.addEventListener('touchstart', (e) => {
        isDraggingChart = true;
        if (e.touches.length > 0) {
            handleChartInteraction(e.touches[0]);
        }
    });
    
    chartCanvas.addEventListener('touchmove', (e) => {
        if (isDraggingChart && e.touches.length > 0) {
            handleChartInteraction(e.touches[0]);
            e.preventDefault(); // Previene lo scroll della pagina durante il drag grafico
        }
    });
    
    window.addEventListener('touchend', () => {
        isDraggingChart = false;
    });
    
    // 7. Interazione 3D (Trascina e Zoom) sul Quadrante dell'Obliquità
    const obliquityCanvas = document.getElementById('canvas-obliquity');
    let isDraggingObliquity = false;
    let startObliquityX = 0;
    let startObliquityY = 0;
    let startYaw = 0;
    let startPitch = 0;

    obliquityCanvas.addEventListener('mousedown', (e) => {
        isDraggingObliquity = true;
        startObliquityX = e.clientX;
        startObliquityY = e.clientY;
        startYaw = state.viewYaw;
        startPitch = state.viewPitch;
        e.preventDefault(); // Previene comportamenti indesiderati del cursore
    });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingObliquity) {
            const dx = e.clientX - startObliquityX;
            const dy = e.clientY - startObliquityY;
            
            // Sensibilità di rotazione
            state.viewYaw = startYaw - dx * 0.007;
            state.viewPitch = startPitch - dy * 0.007;
            
            // Limiti verticali per non capovolgere completamente la sfera celeste
            const limit = Math.PI / 2 - 0.05;
            state.viewPitch = Math.max(-limit, Math.min(limit, state.viewPitch));
            
            updateUI();
        }
    });

    window.addEventListener('mouseup', () => {
        isDraggingObliquity = false;
    });

    // Zoom con la rotella del mouse
    obliquityCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        state.viewZoom -= e.deltaY * 0.001;
        state.viewZoom = Math.max(0.5, Math.min(2.5, state.viewZoom));
        updateUI();
    }, { passive: false });

    // Touch events per rotazione su dispositivi mobili
    obliquityCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDraggingObliquity = true;
            startObliquityX = e.touches[0].clientX;
            startObliquityY = e.touches[0].clientY;
            startYaw = state.viewYaw;
            startPitch = state.viewPitch;
        }
    });

    obliquityCanvas.addEventListener('touchmove', (e) => {
        if (isDraggingObliquity && e.touches.length === 1) {
            const dx = e.touches[0].clientX - startObliquityX;
            const dy = e.touches[0].clientY - startObliquityY;
            
            state.viewYaw = startYaw - dx * 0.01;
            state.viewPitch = startPitch - dy * 0.01;
            
            const limit = Math.PI / 2 - 0.05;
            state.viewPitch = Math.max(-limit, Math.min(limit, state.viewPitch));
            
            updateUI();
            e.preventDefault(); // Impedisce lo scroll di pagina durante la rotazione
        }
    }, { passive: false });

    obliquityCanvas.addEventListener('touchend', () => {
        isDraggingObliquity = false;
    });

    // 8. Ridimensionamento dinamico del layout responsivo dei Canvas
    window.addEventListener('resize', () => {
        updateUI();
    });
}

// --- AVVIO DELL'APPLICAZIONE ---
window.addEventListener('DOMContentLoaded', () => {
    initEventHandlers();
    
    // Impostiamo la data odierna come giorno di partenza predefinito
    const today = new Date();
    // Calcoliamo il giorno dell'anno corrente per la sincronizzazione iniziale
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const currentDay = Math.floor(diff / oneDay);
    
    state.dayOfYear = currentDay >= 1 && currentDay <= 365 ? currentDay : 147;
    
    // Inizializziamo l'interfaccia utente
    updateUI();
});
