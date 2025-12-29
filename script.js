async function getAccurateUtcBaseMsWorldTimeAPI() {
    const t0 = performance.now();

    const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", {
        cache: "no-store"
    });
    const data = await res.json();

    const t1 = performance.now();
    const rtt = t1 - t0;

    // worldtimeapi gives seconds resolution
    // add half RTT to compensate network delay
    return data.unixtime * 1000 + rtt * 0.5;
}
async function getAccurateUtcBaseMsRapidAPI() {
    const t0 = performance.now();

    // to. whoever is reading this
    // please dont abuse my api key
    // i was too lazy here
    // please forgive me
    const res = await fetch("https://world-time-api3.p.rapidapi.com/timezone/Etc/UTC", {
        cache: "no-store",
        method: "GET",
        headers: {
            'x-rapidapi-key': '901679ce64mshacc13cf79343a3fp183518jsn1a222b1548df',
            'x-rapidapi-host': 'world-time-api3.p.rapidapi.com'
        }
    });
    const data = await res.json();

    const t1 = performance.now();
    const rtt = t1 - t0;

    // this gives seconds resolution
    // add half RTT to compensate network delay
    return data.unixtime * 1000 + rtt * 0.5;
}
async function getAccurateUtcBaseMsCloudflareTrace() { // do not use this
    const t0 = performance.now();
    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
        cache: "no-store"
    });
    const text = await res.text();
    const t1 = performance.now();

    const rtt = t1 - t0;

    const match = text.match(/ts=([0-9.]+)/);
    const seconds = Number(match[1]);

    return seconds * 1000 + rtt * 0.5;
}

function KST_alt(year,month,day,hour,min,sec){
    return Date.UTC(year,month-1,day,hour,min,sec) - 9 * 60 * 60 * 1000;
}

function KST(year,month,day,hour,min,sec){
    return Date.UTC(year,month-1,day,hour-9,min,sec);
}

function formatDurationApprox(ms) {
    if(ms<=0){
        return `<h1 style="color: #FF0000">0s</h1>`;
    }

    const units = [
        { name: "y",ms: 365.2425 * 86400000,color: "#FF0000"},
        { name: "mth",ms: 365.2425 * 86400000 / 12,color: "#ffff00"},
        { name: "d",ms: 86400000,color: "#ff9100"},
        { name: "h",ms: 3600000,color: "#0000FF"},
        { name: "m", ms: 60000,color: "#00FF00"},
        { name: "s", ms: 1000,color: "#FF0000"}
    ];

    let result = [];
    for (let i=0;i<units.length;i++) {
        const unit = units[i];

        const value = Math.floor(ms / unit.ms);
        if (value > 0) {
            result.push(`<h1 style="color: ${unit.color}">${value}${unit.name}</h1>`);
            ms -= value * unit.ms;
        }
    }

    const formatted = result.join(" ");
    return formatted;
}

const TARGET = KST(2026,1,19,8,25,0);
const START = KST(2025,12,22,4,20,0);
const DURATION = TARGET - START;

const output = document.getElementById("time");
const pbar = document.getElementById("progress");
const percentd = document.getElementById("pbarp");

let displayMode = 6;
let baseUtcMs = await getAccurateUtcBaseMsRapidAPI();
let basePerfMs = performance.now();
let isSyncing = false;
let prevText;
let prevPercent;

function setProgress(percent) {
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    pbar.style.width = percent.toString() + "%";
    percentd.textContent = percent.toString() + "%";
}

async function resyncTime(){
    isSyncing = true;
    output.textContent = "syncing...";

    baseUtcMs = await getAccurateUtcBaseMsRapidAPI();
    basePerfMs = performance.now();

    isSyncing = false;
}

function formatTime(ms){
    if(ms<0){
        ms = 0;
    }
    switch (displayMode) {
        case 0:
            return `${(ms / 1000).toFixed(3)} seconds`;
        case 1:
            return `${(ms / (1000 * 60)).toFixed(3)} minutes`;
        case 2:
            return `${(ms / (1000 * 60 * 60)).toFixed(3)} hours`;
        case 3:
            return `${(ms / (1000 * 60 * 60 * 24)).toFixed(3)} days`;
        case 4:
            return `${(ms / (1000 * 60 * 60 * 24 * 7)).toFixed(3)} weeks`;
        case 5:
            return `${(ms / (1000 * 60 * 60 * 24 * 365.2425 / 12)).toFixed(3)} months`;
        case 6:
            return formatDurationApprox(ms);
    }
    return "";
}

function update(forceRefresh) {
    if(isSyncing){
        setTimeout(update,20,true);
        return;
    }
    const nowUtcMs = baseUtcMs + (performance.now() - basePerfMs);
    const diffMs = TARGET - nowUtcMs;
    const formattedTime = formatTime(diffMs);
    if(formattedTime != prevText || forceRefresh){
        output.innerHTML = formattedTime;
        prevText = formattedTime;
    }

    const elapsedMs = DURATION - diffMs;
    const percentPassed = (elapsedMs / DURATION) * 100;
    if(percentPassed.toFixed(3) != prevPercent || forceRefresh){
        setProgress(percentPassed.toFixed(3));
        prevPercent = percentPassed.toFixed(3);
    }

    requestAnimationFrame(function(){
        update(false);
    });
}

output.addEventListener('click',function(){
    displayMode = (displayMode+1) % 7;
});

update(true);

//debug
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !isSyncing) {
        resyncTime();
    }
});
