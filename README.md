# L'Equazione del Tempo (Equation of Time) - Astrofili Ponte di Piave

*Disponibile in Italiano ed English.*

Un'applicazione web didattica interattiva premium per spiegare le cause astronomiche e geometriche dell'**Equazione del Tempo** (la differenza tra il tempo solare vero segnato dalle meridiane e il tempo medio dei nostri orologi).

Sviluppato da **Roberto** per **Astrofili Ponte di Piave** ([www.astrofilipontedipiave.it](https://www.astrofilipontedipiave.it)).

---

## 🇮🇹 Versione Italiana

### Panoramica
Il simulatore scompone e illustra graficamente le due cause principali della discrepanza temporale annuale (fino a circa +14 e -16 minuti):
1. **L'eccentricità orbitale terrestre (1ª e 2ª Legge di Keplero)**: La Terra accelera al perielio e rallenta all'afelio, variando la velocità del Sole vero.
2. **L'obliquità dell'asse terrestre rispetto all'eclittica**: La proiezione del moto solare sull'equatore celeste accelera ai solstizi e rallenta agli equinozi.

### Caratteristiche Principali
* **Pannello di Controllo Interattivo**: Consente di variare il giorno dell'anno tramite slider o calendario, regolare la velocità della simulazione e passare dalla modalità orbitale "didattica" (eccentricità accentuata a 0.25) a quella "reale" (eccentricità a 0.0167).
* **Quattro Quadranti Didattici in Canvas**:
  1. **Eccentricità dell'Orbita**: Orbita ellittica con il Sole nel fuoco corretto, vettore velocità orbitale ($\vec{v}$) dinamico e visualizzazione dell'Area Spazzata in Tempo Costante (Keplero 2).
  2. **Obliquità dell'Asse (Modello Sfera Celeste 3D-Like)**: Una simulazione 3D interattiva ruotabile (click & drag) e zoomabile (rotella mouse) della sfera celeste con equatore, eclittica e proiezioni del Sole. Include un **inset della meridiana solare** a mezzogiorno, che proietta un'ombra dinamica ad alto contrasto con deviazione orizzontale reale (asse X) calcolata in base all'EoT corrente.
  3. **Curve dell'Equazione del Tempo**: Grafico dinamico delle due componenti (sinusoide annuale per l'eccentricità, sinusoide semestrale per l'obliquità) e della curva risultante (oro). Interattivo al click/trascinamento.
  4. **L'Analemma Solare**: La tipica curva ad "otto" proiettata nel cielo con indicatore luminoso della data corrente.
* **Supporto Multilingua Integrato**: Selezione istantanea della lingua (Italiano/Inglese) tramite bandierine in alto a destra, che aggiorna istantaneamente tutti i testi della pagina e i Canvas.
* **Grafica Premium**: Tema scuro astronomico ("Deep Space"), font moderni (*Outfit* e *JetBrains Mono*), responsività completa e ottimizzazione HiDPI/Retina.

---

## 🇬🇧 English Version

### Overview
This premium interactive educational web application explains the astronomical and geometric causes behind the **Equation of Time** (the difference between the apparent solar time shown by sundials and the mean time shown by clocks).

### Key Features
* **Interactive Control Panel**: Allows changing the day of the year via slider or datepicker, adjusting simulation speed, and switching between "didactic" mode (exaggerated eccentricity at 0.25) and "real" mode (eccentricity at 0.0167).
* **Four Educational Canvas Quadrants**:
  1. **Orbit Eccentricity**: Elliptical orbit with the Sun in the correct focus, dynamic velocity vector ($\vec{v}$), and swept area sector to demonstrate Kepler's 2nd Law (Law of Equal Areas).
  2. **Axial Obliquity (3D-Like Celestial Sphere)**: An interactive 3D simulation of the celestial sphere (rotate with click & drag, zoom with mouse wheel) showing the Equator, Ecliptic, and Sun projections. Includes a **noon sundial inset** showing a high-contrast dynamic shadow with realistic horizontal (X-axis) deflection calculated based on the current Equation of Time.
  3. **Equation of Time Curves**: Dynamic chart showing the two components (annual wave for eccentricity, semi-annual wave for obliquity) and the combined resultant curve (gold). Fully interactive via click/drag.
  4. **The Analemma**: The characteristic figure-eight shape mapped in the sky with a glowing indicator of the current date.
* **Integrated Multilingual Support**: Instant language selection (Italian/English) via flag buttons in the header, immediately updating all page text and canvas annotations.
* **Premium Aesthetics**: Dark astronomical theme ("Deep Space"), modern typography (*Outfit* and *JetBrains Mono*), fully responsive layout, and HiDPI/Retina high-definition canvas rendering.

---

## 🛠️ Tecnologie Utilizzate / Tech Stack
* **HTML5 & CSS3**: Struttura semantica, layout Flexbox e Grid responsivi, variabili CSS (`:root`), font Google (*Outfit*, *JetBrains Mono*).
* **Pure JavaScript (ES6+)**: Logica di simulazione orbitale (risolutore Keplero con Newton-Raphson), rendering dinamico Canvas 2D, proiezioni trigonometriche 3D personalizzate e motore di internazionalizzazione (i18n) lato client.

## 🚀 Come Eseguire / How to Run
È sufficiente aprire il file `index.html` in un qualsiasi browser moderno (Chrome, Firefox, Safari, Edge). Non è richiesto alcun server web o dipendenza esterna.

*Simply open `index.html` in any modern web browser. No web server or external dependencies are required.*
