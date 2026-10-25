let subjects = {};
let searchTerm = "";
let selectedSubject = "All";
let selectedStatus = "All";

let progress = JSON.parse(localStorage.getItem("jeeProgress") || "{}");
let goals = JSON.parse(localStorage.getItem("jeeGoals") || "[]");

let timerSeconds = 0;
let timerInterval = null;
let timerRunning = false;

const targetDate = new Date("2027-01-20T00:00:00");

function chapterKey(subject, chapter) {
    return `${subject}-${chapter}`;
}

function getStatus(subject, chapter) {
    return progress[chapterKey(subject, chapter)] || 0;
}

function statusClass(status) {
    return ["", "read", "practice", "revised", "complete"][status];
}

function cycleStatus(subject, chapter) {
    const id = chapterKey(subject, chapter);

    progress[id] = (getStatus(subject, chapter) + 1) % 5;

    localStorage.setItem("jeeProgress", JSON.stringify(progress));
    render();
}

function render() {
    const container = document.getElementById("subjects");

    if (!container) return;

    container.innerHTML = "";

    for (const [subject, chapters] of Object.entries(subjects)) {
        if (selectedSubject !== "All" && subject !== selectedSubject) {
            continue;
        }

        const section = document.createElement("section");
        section.className = "subject";

        const completed = chapters.filter(
            chapter => getStatus(subject, chapter) === 4
        ).length;

        const percentage = Math.round(
            (completed / chapters.length) * 100
        );

        const visibleChapters = chapters.filter(chapter => {
            const matchesSearch = chapter
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            const matchesStatus =
                selectedStatus === "All" ||
                String(getStatus(subject, chapter)) === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        section.innerHTML = `
            <div class="subject-title">
                <h2>${subject}</h2>
                <span>${percentage}%</span>
            </div>

            <div class="labels">
                <span>Chapter</span>
                <span>Study stages</span>
                <span>Goal</span>
                <span>Status</span>
            </div>
        `;

        visibleChapters.forEach(chapter => {
            const status = getStatus(subject, chapter);
            const id = chapterKey(subject, chapter);

            const row = document.createElement("div");
            row.className = "chapter-row";

            row.innerHTML = `
                <strong>${chapter}</strong>

                <div class="stages">
                    ${[1, 2, 3, 4].map(stage => `
                        <button
                            class="stage ${
                                status >= stage
                                    ? statusClass(stage)
                                    : ""
                            }"
                            onclick="cycleStatus(
                                '${subject}',
                                '${chapter}'
                            )">
                            ${status >= stage ? "✓" : ""}
                        </button>
                    `).join("")}
                </div>

                <label class="goal-select">
                    <input
                        type="checkbox"
                        ${goals.includes(id) ? "checked" : ""}
                        onchange="toggleGoal(
                            '${subject}',
                            '${chapter}'
                        )">
                </label>

                <span class="date">
                    ${
                        status === 0
                            ? "Not started"
                            : status === 4
                                ? "Completed"
                                : "In progress"
                    }
                </span>
            `;

            section.appendChild(row);
        });

        container.appendChild(section);
    }

    updateOverallProgress();
    updateProgressChart();
    updateDashboard();
}

function updateOverallProgress() {
    const allChapters = Object.entries(subjects).flatMap(
        ([subject, chapters]) =>
            chapters.map(chapter => getStatus(subject, chapter))
    );

    const completed = allChapters.filter(
        status => status === 4
    ).length;

    const percentage = allChapters.length
        ? Math.round((completed / allChapters.length) * 100)
        : 0;

    document.getElementById("overall-progress").textContent =
        `${percentage}%`;

    document.getElementById("overall-bar").style.width =
        `${percentage}%`;
}

function toggleGoal(subject, chapter) {
    const id = chapterKey(subject, chapter);

    if (goals.includes(id)) {
        goals = goals.filter(goal => goal !== id);
    } else {
        goals.push(id);
    }

    localStorage.setItem("jeeGoals", JSON.stringify(goals));

    updateProgressChart();
    updateDashboard();
}

function updateProgressChart() {
    const legend = document.getElementById("subject-legend");
    const circle = document.getElementById("progress-circle");

    if (!legend || !circle) return;

    const completedGoals = goals.filter(id => {
        const separator = id.indexOf("-");
        const subject = id.slice(0, separator);
        const chapter = id.slice(separator + 1);

        return getStatus(subject, chapter) === 4;
    }).length;

    const percentage = goals.length
        ? Math.round((completedGoals / goals.length) * 100)
        : 0;

    circle.style.setProperty(
        "--completion",
        `${percentage * 3.6}deg`
    );

    document.getElementById("circle-percent").textContent =
        `${percentage}%`;

    if (!goals.length) {
        legend.innerHTML = "<p>No goal chapters selected.</p>";
        return;
    }

    legend.innerHTML = goals.map(id => {
        const separator = id.indexOf("-");
        const subject = id.slice(0, separator);
        const chapter = id.slice(separator + 1);
        const completed = getStatus(subject, chapter) === 4;

        return `
            <div class="legend-row">
                <span>${completed ? "✓" : "○"} ${chapter}</span>
                <small>${subject}</small>
            </div>
        `;
    }).join("");
}

function updateDashboard() {
    const sessions = JSON.parse(
        localStorage.getItem("jeeSessions") || "[]"
    );

    const totalSeconds = sessions.reduce(
        (total, session) => total + Number(session.seconds || 0),
        0
    );

    const allStatuses = Object.entries(subjects).flatMap(
        ([subject, chapters]) =>
            chapters.map(chapter => getStatus(subject, chapter))
    );

    const completed = allStatuses.filter(
        status => status === 4
    ).length;

    const revised = allStatuses.filter(
        status => status >= 3
    ).length;

   const percentage = allStatuses.length
    ? Math.round((completed / allStatuses.length) * 100)
    : 0;

    const daysLeft = Math.max(
        0,
        Math.ceil((targetDate - new Date()) / 86400000)
    );

    document.getElementById("days-card").textContent = daysLeft;
    document.getElementById("progress-card").textContent =
        `${percentage}%`;

    document.getElementById("hours-card").textContent =
        `${(totalSeconds / 3600).toFixed(1)}h`;

    document.getElementById("goals-card").textContent =
        goals.length;

    document.getElementById("revised-card").textContent =
        revised;

    const summary = document.getElementById("subject-summary");

    summary.innerHTML = Object.entries(subjects).map(
        ([subject, chapters]) => {
            const completedSubject = chapters.filter(
                chapter => getStatus(subject, chapter) === 4
            ).length;

            const subjectPercentage = Math.round(
                (completedSubject / chapters.length) * 100
            );

            return `
                <div class="subject-progress-row">
                    <div class="subject-progress-label">
                        <strong>${subject}</strong>
                        <span>
                            ${completedSubject}/${chapters.length}
                        </span>
                    </div>

                    <div class="subject-progress-bar">
                        <span
                            style="width: ${subjectPercentage}%">
                        </span>
                    </div>

                    <small>
                        ${subjectPercentage}% completed
                    </small>
                </div>
            `;
        }
    ).join("");
}

function updateCountdown() {
    const countdown = document.getElementById("countdown");

    if (!countdown) return;

    const difference = targetDate - new Date();

    if (difference <= 0) {
        countdown.textContent = "Target date reached";
        return;
    }

    const days = Math.floor(difference / 86400000);
    const hours = Math.floor((difference / 3600000) % 24);
    const minutes = Math.floor((difference / 60000) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    countdown.textContent =
        `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function loadTimerChapters() {
    const select = document.getElementById("timer-chapter");
    const dateInput = document.getElementById("session-date");

    if (!select || !dateInput) return;

    select.innerHTML = Object.entries(subjects)
        .flatMap(([subject, chapters]) =>
            chapters.map(chapter => `
                <option value="${chapterKey(subject, chapter)}">
                    ${subject} — ${chapter}
                </option>
            `)
        )
        .join("");

    dateInput.value = new Date()
        .toISOString()
        .split("T")[0];
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [hours, minutes, remainingSeconds]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
}

function startTimer() {
    if (timerRunning) return;

    timerRunning = true;

    timerInterval = setInterval(() => {
        timerSeconds++;

        document.getElementById("timer-display").textContent =
            formatTime(timerSeconds);
    }, 1000);
}


function stopTimer() {
    if (!timerRunning || timerSeconds === 0) return;

    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;

    const sessions = JSON.parse(
        localStorage.getItem("jeeSessions") || "[]"
    );

    sessions.push({
    title: document.getElementById("session-title").value.trim()
        || "Untitled session",
    chapter: document.getElementById("timer-chapter").value,
    date: document.getElementById("session-date").value,
    seconds: timerSeconds
});

    localStorage.setItem(
        "jeeSessions",
        JSON.stringify(sessions)
    );

    const title =
    document.getElementById("session-title").value.trim()
    || "Untitled session";

document.getElementById("session-message").textContent =
    `Saved "${title}" — ${formatTime(timerSeconds)}.`;
    timerSeconds = 0;

    
    document.getElementById("timer-display").textContent =
        "00:00:00";

    updateDashboard();
}

function resetProgress() {
    if (!confirm("Reset all progress and goals?")) return;

    progress = {};
    goals = [];

    localStorage.removeItem("jeeProgress");
    localStorage.removeItem("jeeGoals");
    localStorage.removeItem("jeeSessions");

    

    render();

    document.getElementById("session-message").textContent =
        "Progress reset.";
}

async function initializeApp() {
    try {
        const response = await fetch("/api/chapters");

        if (!response.ok) {
            throw new Error("Could not load chapter data.");
        }

        subjects = await response.json();

        loadTimerChapters();
        updateCountdown();
        setInterval(updateCountdown, 1000);
        render();
    } catch (error) {
        console.error(error);

        document.getElementById("subjects").innerHTML =
            "<p>Could not load chapters. Check the Flask terminal.</p>";
    }
}

document.getElementById("chapter-search").addEventListener(
    "input",
    event => {
        searchTerm = event.target.value;
        render();
    }
);

document.getElementById("subject-filter").addEventListener(
    "change",
    event => {
        selectedSubject = event.target.value;
        render();
    }
);

document.getElementById("status-filter").addEventListener(
    "change",
    event => {
        selectedStatus = event.target.value;
        render();
    }
);

initializeApp();