async function getAccurateUtcBaseMsUnixSh() {
    const t0 = performance.now();

    const res = await fetch("https://unixtime.sh/api", {
        cache: "no-store",
        signal: AbortSignal.timeout(500)
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
        signal: AbortSignal.timeout(500)
    });
    const data = await res.text();

    const t1 = performance.now();
    const rtt = t1 - t0;

    // actually gives in ms
    // add half RTT to compensate network delay
    return Number(data) + rtt * 0.5;
}
async function getAccurateUtcBaseMs(){
    const functions = [getAccurateUtcBaseMsUnixSh,getAccurateUtcBaseMsPythonAnywhere,Date.now];
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
    const units = [
        { name: "y",ms: 365.2425 * 86400000,color: "#FF0000"},
        { name: "mth",ms: 365.2425 * 86400000 / 12,color: "#ffff00"},
        { name: "d",ms: 86400000,color: "#ff9100"},
        { name: "h",ms: 3600000,color: "#0000FF"},
        { name: "m", ms: 60000,color: "#00FF00"},
        { name: "s", ms: 1000,color: "#FF0000"}
    ];

    if(ms<=0){
        return `<h1 style="color: #FF0000">0s</h1>`;
    }else if(ms>0 && ms<=1000*30){
        return `<h1 style="color: #FF0000">${(ms/1000).toFixed(3)}s</h1>`;
    }

    let result = [];
    for (let i=0;i<units.length;i++) {
        const unit = units[i];

        const value = Math.floor(ms / unit.ms);
        if (value > 0) {
            result.push(`<h1 style="color: ${unit.color}">${value}${unit.name}</h1>`);
            ms -= value * unit.ms;
        }
    }

    const formatted = result.join('');
    return formatted;
}

const TARGET = KST(2026,1,19,8,30,0);
const START = KST(2025,12,22,4,20,0);
const DURATION = TARGET - START;

const output = document.getElementById("time");
const pbar = document.getElementById("progress");
const percentd = document.getElementById("pbarp");
const entireprogress = document.getElementById("entirep");

let baseUtcMs;
let basePerfMs;
let isSyncing = false;
let prevText;
let prevPercent;
let prevPercentDisplay;
let isProgressEnabled = true;

async function resyncTime() {
    if (isSyncing) return;
    isSyncing = true;
    output.textContent = "syncing...";
    percentd.textContent = "syncing...";

    baseUtcMs = await getAccurateUtcBaseMs();
    basePerfMs = performance.now();

    isSyncing = false;
}
function formatTime(ms){
    if(ms<=0){
        return `<h1 style="color: #FF0000">It's time</h1>`;
    }
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
    const diffMs = TARGET - nowUtcMs;
    const formattedTime = formatTime(diffMs);
    if(formattedTime != prevText || forceRefresh){
        output.innerHTML = formattedTime;
        prevText = formattedTime;
        animateTimeChange();
    }

    const elapsedMs = DURATION - diffMs;
    const percentPassed = Math.min(((elapsedMs / DURATION) * 100),100);

    const displayPercentPassed = Math.trunc(percentPassed);
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
