async function getAccurateUtcBaseMsUnixSh() {
    const t0 = performance.now();

    const res = await fetch("https://unixtime.sh/api", {
        cache: "no-store",
        signal: AbortSignal.timeout(800)
    });
    const data = await res.json();

    const t1 = performance.now();
    const rtt = t1 - t0;

    return Number(data.unix.milliseconds) + rtt * 0.5;
}
async function getAccurateUtcBaseMsPythonAnywhere() {
    const t0 = performance.now();

    const res = await fetch("https://dl4194.pythonanywhere.com/time", {
        cache: "no-store",
        signal: AbortSignal.timeout(800)
    });
    const data = await res.text();

    const t1 = performance.now();
    const rtt = t1 - t0;

    // actually gives in ms
    // add half RTT to compensate network delay
    return Number(data) + rtt * 0.5;
}
async function getAccurateUtcBaseMs(){
    const functions = [getAccurateUtcBaseMsUnixSh,Date.now];
    for(const f of functions){
        try{
            return await Promise.resolve(f());
        }catch(err){
            console.error(err);
        }
    }
    throw new Error("Failed to fetch time");
}
function KST(year,month,day,hour,min,sec){
    return Date.UTC(year,month-1,day,hour,min,sec) - 9 * 60 * 60 * 1000;
}
function KST_alt(year,month,day,hour,min,sec){
    return Date.UTC(year,month-1,day,hour-9,min,sec);
}

function formatDurationApprox(ms) {
    const negative = ms < 0;
    ms = Math.abs(ms);

    const units = [
        { name: "y", ms: 365.2425 * 86400000, color: "#FF0000" },
        { name: "d", ms: 86400000, color: "#ff9100" },
        { name: "h", ms: 3600000, color: "#0000FF" },
        { name: "m", ms: 60000, color: "#00FF00" },
        { name: "s", ms: 1000, color: "#FF0000" }
    ];

    if(ms <= 30000){
        return `<h1 style="color:#FF0000">${negative ? "-" : ""}${(ms/1000).toFixed(3)}s</h1>`;
    }

    let result = [];

    if(negative){
        result.push(`<h1 style="color:#FF0000">-</h1>`);
    }

    for(const unit of units){
        const value = Math.floor(ms / unit.ms);
        if(value > 0){
            result.push(`<h1 style="color:${unit.color}">${value}${unit.name}</h1>`);
            ms -= value * unit.ms;
        }
    }

    return result.join('');
}

const DATES = [
    {t: KST(2026,1,19,9,0,0),untilthen: "until school starts",s: KST(2025,12,22,16,0,0)},
    {t: KST(2026,6,4,16,0,0),untilthen: "until break",s: KST(2026,1,19,9,0,0)},
    {t: KST(2026,8,17,9,0,0),untilthen: "until school starts",s: KST(2026,6,4,16,0,0)}
];

// let TARGET = Date.now() + 40000;
// let START = Date.now();
// let DURATION = TARGET - START;
let TARGET, START, DURATION;

const output = document.getElementById("time");
const pbar = document.getElementById("progress");
const percentd = document.getElementById("pbarp");
const entireprogress = document.getElementById("entirep");
const until = document.getElementById("untilthen");

let baseUtcMs = 0;
let basePerfMs = 0;
let isSyncing = false;
let prevText = null;
let prevPercent = null;
let prevPercentDisplay = null;
let isProgressEnabled = true;
let noMoreDates = false;

function setTARGET(tnow){
    for(const date of DATES){
        if(tnow < date.t){
            TARGET = date.t;
            START = date.s;
            until.textContent = date.untilthen;
            DURATION = date.t - date.s;
            return true;
        }
    }

    const date = DATES.at(-1);
    TARGET = date.t;
    START = date.s;
    until.textContent = date.untilthen;
    DURATION = date.t - date.s;

    noMoreDates = true;
    return false;
}
async function resyncTime() {
    if (isSyncing) return;

    isSyncing = true;
    noMoreDates = false;

    output.textContent = "syncing...";
    percentd.textContent = "syncing...";
    until.textContent = "until ---";
    pbar.style.width = "0%";

    baseUtcMs = await getAccurateUtcBaseMs();
    basePerfMs = performance.now();

    setTARGET(baseUtcMs + (performance.now() - basePerfMs));

    isSyncing = false;
}
function formatTime(ms){
    return formatDurationApprox(ms);
}
function animateTimeChange() {
    output.classList.remove("time-anim");
    void output.offsetHeight;
    output.classList.add("time-anim");
}
function update(forceRefresh) {
    if(isSyncing){
        setTimeout(function(){update(true);},100);
        return;
    }
    const nowUtcMs = baseUtcMs + (performance.now() - basePerfMs);
    let diffMs = TARGET - nowUtcMs;
    let negative = diffMs < 0;
    if(diffMs <= 0 && !noMoreDates){
        setTARGET(nowUtcMs);
        diffMs = TARGET - nowUtcMs;
        negative = diffMs < 0;
    }

    const formattedTime = formatTime(diffMs);
    if(formattedTime != prevText || forceRefresh){
        output.innerHTML = formattedTime;
        prevText = formattedTime;
        if(diffMs>30000 || negative){
            animateTimeChange();
        }
    }

    const elapsedMs = DURATION - diffMs;
    const percentPassed = (elapsedMs / DURATION) * 100;

    const displayPercentPassed = Math.round(percentPassed);
    if(displayPercentPassed != prevPercentDisplay || forceRefresh){
        pbar.style.width = `${displayPercentPassed}%`;
        prevPercentDisplay = displayPercentPassed;
    }

    const textPercentPassed = percentPassed.toFixed(3);
    if(textPercentPassed != prevPercent || forceRefresh){
        percentd.textContent = `${textPercentPassed}%`;
        prevPercent = textPercentPassed;
    }

    requestAnimationFrame(function(){
        update(false);
    });
}
output.addEventListener('click',function(){
    isProgressEnabled = !isProgressEnabled;
    if(isProgressEnabled){
        entireprogress.style.display = 'flex';
    }else{
        entireprogress.style.display = 'none';
    }
});

await resyncTime();
update(true);

//debug
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        resyncTime();
    }
});
