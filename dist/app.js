const STORAGE_KEY = "ht-gestion-render-data-v1";
const COLORS = ["#155eef", "#7656cc", "#d9536f", "#178f72", "#d17b18", "#2672a8"];
const STATUSES = ["unmarked", "present", "absent", "late", "excused"];
const ACTIVITY_STATUSES = ["present", "late", "absent", "justified"];
const MONTHLY_CONTRIBUTION = 1000;

const seedMembers = [
  createMember({
    matricule: "ND-001",
    nom: "El Mansouri",
    prenom: "Amine",
    sexe: "Homme",
    birthDate: "1997-04-18",
    address: "Touba",
    phone: "77 000 00 01",
    email: "amine@daara.sn",
    profession: "Etudiant",
    daaraSector: "Animation culturelle",
    magalSector: "Accueil",
    culturalSpace: "ECH",
    kourel: "Nourou Dareyni"
  }),
  createMember({
    matricule: "MB-001",
    nom: "Diop",
    prenom: "Awa",
    sexe: "Femme",
    birthDate: "1999-09-08",
    address: "Dakar",
    phone: "77 000 00 02",
    email: "awa@daara.sn",
    profession: "Commercante",
    daaraSector: "Organisation",
    magalSector: "Restauration",
    culturalSpace: "ECF",
    kourel: "Mafatikhoul Bisri"
  }),
  createMember({
    matricule: "AD-001",
    nom: "Sarr",
    prenom: "Mouhamed",
    sexe: "Homme",
    birthDate: "2008-02-12",
    address: "Mbacke",
    phone: "77 000 00 03",
    email: "mouhamed@daara.sn",
    profession: "Eleve",
    daaraSector: "Kourel adolescent",
    magalSector: "Orientation",
    culturalSpace: "ECE",
    kourel: "Adolescent"
  })
];

const seedActivities = [
  {
    id: crypto.randomUUID(),
    type: "Repetition kourel",
    scope: "kourel",
    kourel: "Nourou Dareyni",
    date: "",
    startTime: "17:00",
    endTime: "",
    place: "Daara",
    attendance: {}
  },
  {
    id: crypto.randomUUID(),
    type: "Gouddi Aldiouma",
    scope: "kourel",
    kourel: "Tous",
    date: "",
    startTime: "21:00",
    endTime: "",
    place: "Daara",
    attendance: {}
  }
];

let state = loadState();
let currentView = "rehearsals";
let editingMemberId = null;
let editingActivityId = null;

const el = id => document.getElementById(id);
const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
el("attendanceDate").value = localToday;
el("kourelSessionDate").value = localToday;
el("generalSessionDate").value = localToday;
el("kourelHistoryDate").value = localToday;
el("generalHistoryDate").value = localToday;
el("statsMonth").value = localToday.slice(0, 7);
el("statsYear").value = localToday.slice(0, 4);
el("socialContributionMonth").value = localToday.slice(0, 7);
el("solidarityDeliveryDate").value = localToday;
el("cashMovementDate").value = localToday;

function createMember(data = {}) {
  const nameParts = (data.name || "").trim().split(/\s+/).filter(Boolean);
  const prenom = data.prenom || nameParts.slice(0, -1).join(" ") || data.name || "";
  const nom = data.nom || nameParts.slice(-1).join(" ") || "";
  const registrationDate = data.registrationDate || localDateFallback();
  const registrationYear = Number(registrationDate.slice(0, 4)) || new Date().getFullYear();
  const renewals = Array.isArray(data.renewals) && data.renewals.length
    ? data.renewals.map(item => ({ year: Number(item.year), date: item.date || "" })).filter(item => item.year)
    : [{ year: registrationYear, date: registrationDate }];
  return {
    id: data.id || crypto.randomUUID(),
    matricule: data.matricule || data.id || `M-${Date.now().toString().slice(-5)}`,
    nom,
    prenom,
    sexe: data.sexe || "",
    birthDate: data.birthDate || "",
    address: data.address || "",
    phone: data.phone || "",
    email: data.email || "",
    profession: data.profession || data.role || "",
    daaraSector: data.daaraSector || data.role || "",
    magalSector: data.magalSector || "",
    culturalSpace: data.culturalSpace || "",
    kourel: data.kourel || data.role || "",
    registrationDate,
    renewals
  };
}

function localDateFallback() {
  const value = new Date();
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidState(saved)) {
      const solidarityEvents = Array.isArray(saved.solidarityEvents) ? saved.solidarityEvents.map(normalizeSolidarityEvent) : [];
      return {
        members: saved.members.map(createMember),
        attendance: saved.attendance || {},
        activities: Array.isArray(saved.activities) ? saved.activities.map(normalizeActivity) : seedActivities,
        solidarityEvents,
        socialContributions: saved.socialContributions || migrateSocialContributions(solidarityEvents),
        socialTransactions: Array.isArray(saved.socialTransactions) ? saved.socialTransactions : migrateSocialTransactions(solidarityEvents)
      };
    }
  } catch (_) {}
  return { members: seedMembers, attendance: {}, activities: seedActivities, solidarityEvents: [], socialContributions: {}, socialTransactions: [] };
}

function normalizeActivity(activity = {}) {
  return {
    id: activity.id || crypto.randomUUID(),
    type: activity.type || "Animation",
    scope: activity.scope || (activity.kourel && activity.kourel !== "Tous" ? "kourel" : "general"),
    kourel: activity.kourel || "Tous",
    date: activity.date || "",
    startTime: activity.startTime || activity.time || "",
    endTime: activity.endTime || "",
    place: activity.place || "",
    eventName: activity.eventName || "",
    melodies: Array.isArray(activity.melodies) ? activity.melodies : String(activity.melodies || "").split(/[,\n]/).map(item => item.trim()).filter(Boolean),
    attendance: activity.attendance || {}
  };
}

function normalizeSolidarityEvent(event = {}) {
  return {
    id: event.id || crypto.randomUUID(),
    memberId: event.memberId || "",
    type: event.type || "Baptême",
    month: event.month || (event.deliveryDate || localDateFallback()).slice(0, 7),
    date: event.date || event.deliveryDate || localDateFallback(),
    expenseAmount: Number(event.expenseAmount || (event.delivered ? event.deliveredAmount : 0) || 0),
    kourelPerformance: Boolean(event.kourelPerformance),
    note: event.note || "",
    contributions: event.contributions || {}
  };
}

function migrateSocialContributions(events) {
  const contributions = {};
  events.forEach(event => {
    Object.entries(event.contributions || {}).forEach(([memberId, contribution]) => {
      if (!contribution?.paid) return;
      contributions[event.month] ||= {};
      contributions[event.month][memberId] ||= {
        paid: true,
        amount: Number(contribution.amount || MONTHLY_CONTRIBUTION),
        date: `${event.month}-01`
      };
    });
  });
  return contributions;
}

function migrateSocialTransactions(events) {
  return events.filter(event => event.expenseAmount > 0).map(event => ({
    id: crypto.randomUUID(),
    type: "expense",
    date: event.date,
    label: `${event.type} - aide sociale`,
    amount: event.expenseAmount,
    eventId: event.id
  }));
}

function isValidState(data) {
  return data && Array.isArray(data.members) && data.attendance && typeof data.attendance === "object";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function memberFullName(member = {}) {
  return `${member.prenom || ""} ${member.nom || ""}`.trim() || member.name || "Sans nom";
}

function initials(member) {
  return memberFullName(member).split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function calculateAge(birthDate) {
  if (!birthDate) return "";
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : "";
}

function selectedDate() {
  return el("attendanceDate").value || localToday;
}

function dateRecords() {
  const date = selectedDate();
  state.attendance[date] ||= {};
  return state.attendance[date];
}

function memberRecord(id) {
  const records = dateRecords();
  records[id] ||= { status: "unmarked", time: "", note: "" };
  return records[id];
}

function statusLabel(status) {
  return { unmarked: "Non marque", present: "Present", absent: "Absent", late: "En retard", excused: "Excuse" }[status] || "Non marque";
}

function activityStatusLabel(status) {
  return { present: "Present", late: "Present retard", absent: "Absent", justified: "Absent justifie" }[status] || "Absent";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function formatDate() {
  const date = new Date(`${selectedDate()}T12:00:00`);
  el("formattedDate").textContent = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function memberSearchText(member) {
  return [
    member.matricule,
    memberFullName(member),
    member.sexe,
    member.address,
    member.phone,
    member.email,
    member.profession,
    member.daaraSector,
    member.magalSector,
    member.culturalSpace,
    member.kourel
  ].join(" ").toLowerCase();
}

function renderAttendance() {
  const query = el("searchInput").value.trim().toLowerCase();
  const members = state.members.filter(member => memberSearchText(member).includes(query));
  const tbody = el("attendanceBody");
  tbody.innerHTML = members.map((member, index) => {
    const record = memberRecord(member.id);
    const fullName = memberFullName(member);
    return `<tr>
      <td><strong>${escapeHtml(member.matricule)}</strong></td>
      <td><div class="member-cell"><div class="member-avatar" style="background:${COLORS[index % COLORS.length]}">${initials(member)}</div><div><strong>${escapeHtml(fullName)}</strong><small>${escapeHtml(member.phone || member.email || "Contact non renseigne")}</small></div></div></td>
      <td><span class="role-badge">${escapeHtml(member.kourel || "Kourel non renseigne")}</span><small class="muted-line">${escapeHtml(member.culturalSpace || "Espace non renseigne")}</small></td>
      <td><select class="status-select ${record.status}" data-id="${member.id}" data-field="status" aria-label="Statut de ${escapeHtml(fullName)}">
        ${STATUSES.map(status => `<option value="${status}" ${record.status === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
      </select></td>
      <td><input class="time-input" type="time" data-id="${member.id}" data-field="time" value="${escapeHtml(record.time)}" aria-label="Heure d'arrivee de ${escapeHtml(fullName)}"></td>
      <td><input class="note-input" data-id="${member.id}" data-field="note" value="${escapeHtml(record.note)}" placeholder="Ajouter une note..." aria-label="Note pour ${escapeHtml(fullName)}"></td>
      <td class="row-actions"><button class="icon-button" data-edit="${member.id}" title="Modifier le membre">✎</button><button class="icon-button danger" data-delete="${member.id}" title="Supprimer le membre">×</button></td>
    </tr>`;
  }).join("");
  el("attendanceEmpty").style.display = members.length ? "none" : "block";
  updateStats();
  renderDailyPresenceLists();
}

function updateStats() {
  const records = dateRecords();
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  state.members.forEach(member => {
    const status = records[member.id]?.status;
    if (counts[status] !== undefined) counts[status]++;
  });
  const total = state.members.length;
  const percent = value => total ? Math.round(value / total * 100) : 0;

  el("totalMembers").textContent = total;
  el("presentCount").textContent = counts.present;
  el("absentCount").textContent = counts.absent;
  el("lateCount").textContent = counts.late;
  el("presentRate").textContent = `${percent(counts.present)}% aujourd'hui`;
  el("absentRate").textContent = `${percent(counts.absent)}% aujourd'hui`;
  el("lateRate").textContent = `${percent(counts.late)}% aujourd'hui`;
  el("reportPresent").textContent = counts.present;
  el("reportAbsent").textContent = counts.absent;
  el("reportLate").textContent = counts.late;
  el("reportExcused").textContent = counts.excused;
  el("reportRate").textContent = `${percent(counts.present)}%`;
  el("reportCircle").setAttribute("stroke-dasharray", `${percent(counts.present) * 3.02} 302`);
}

function memberDaaraStats(memberId) {
  let marked = 0;
  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;
  Object.values(state.attendance).forEach(records => {
    const status = records?.[memberId]?.status;
    if (!status || status === "unmarked") return;
    marked++;
    if (status === "present") present++;
    if (status === "late") late++;
    if (status === "absent") absent++;
    if (status === "excused") excused++;
  });
  state.activities.forEach(activity => {
    const status = activity.attendance?.[memberId];
    if (!status) return;
    marked++;
    if (status === "present") present++;
    if (status === "late") late++;
    if (status === "absent") absent++;
    if (status === "justified") excused++;
  });
  const attendanceRate = marked ? Math.round((present + late) / marked * 100) : 0;
  return { marked, present, late, absent, excused, attendanceRate };
}

function renderDailyPresenceLists() {
  const records = dateRecords();
  const presentMembers = state.members.filter(member => ["present", "late"].includes(records[member.id]?.status));
  const absentMembers = state.members.filter(member => ["absent", "excused"].includes(records[member.id]?.status));
  renderCompactMemberList("presentMembersList", presentMembers, member => statusLabel(records[member.id]?.status));
  renderCompactMemberList("absentMembersList", absentMembers, member => statusLabel(records[member.id]?.status));
}

function renderCompactMemberList(targetId, members, metaFactory) {
  el(targetId).innerHTML = members.length ? members.map(member => `
    <article class="compact-list-item">
      <strong>${escapeHtml(member.matricule)} · ${escapeHtml(memberFullName(member))}</strong>
      <span>${escapeHtml(metaFactory(member))} · ${escapeHtml(member.kourel || "Kourel non renseigne")}</span>
    </article>`).join("") : `<div class="empty-state history-empty" style="display:block"><h3>Aucun membre</h3><p>Aucune donnée enregistrée pour cette liste.</p></div>`;
}

function renderMembers() {
  const query = el("memberSearch").value.trim().toLowerCase();
  const members = state.members.filter(member => memberSearchText(member).includes(query));
  const year = new Date().getFullYear();
  el("memberGrid").innerHTML = members.length ? `<div class="member-list-header"><span>Matricule et membre</span><span>Contact</span><span>Kourel / espace</span><span>Inscription ${year}</span><span>Présence</span><span>Actions</span></div>${members.map((member, index) => {
    const stats = memberDaaraStats(member.id);
    const renewal = member.renewals.find(item => Number(item.year) === year);
    return `
    <article class="member-row">
      <div class="member-identity"><div class="member-avatar" style="background:${COLORS[index % COLORS.length]}">${initials(member)}</div><div><strong>${escapeHtml(member.matricule)}</strong><span>${escapeHtml(memberFullName(member))} · ${escapeHtml(calculateAge(member.birthDate) || "-")} ans</span></div></div>
      <div><strong>${escapeHtml(member.phone || "Téléphone non renseigné")}</strong><span>${escapeHtml(member.profession || member.email || "Profession non renseignée")}</span></div>
      <div><strong>${escapeHtml(member.kourel || "Kourel non renseigné")}</strong><span>${escapeHtml(member.culturalSpace || "Espace non renseigné")}</span></div>
      <div><span class="renewal-badge ${renewal ? "active" : "due"}">${renewal ? "Renouvelé" : "À renouveler"}</span><span>${renewal?.date ? escapeHtml(renewal.date) : `Inscrit le ${escapeHtml(member.registrationDate)}`}</span><span>Historique : ${member.renewals.map(item => item.year).sort().join(", ")}</span></div>
      <div><strong>${stats.attendanceRate}%</strong><span>${stats.present + stats.late} présence(s) · ${stats.absent + stats.excused} absence(s)</span></div>
      <div class="member-row-actions">
        <button class="secondary-button small-button" data-renew="${member.id}">Renouveler</button>
        <button class="icon-button" data-edit="${member.id}" title="Modifier">✎</button>
        <button class="icon-button danger" data-delete="${member.id}" title="Supprimer">×</button>
      </div>
    </article>`;
  }).join("")}` : `<div class="empty-state" style="display:block"><h3>Aucun membre</h3><p>Ajoutez votre premier membre.</p></div>`;
}

function renderActivities() {
  renderActivityHistory({
    targetId: "kourelActivityList",
    scope: "kourel",
    date: el("kourelHistoryDate").value
  });
  renderActivityHistory({
    targetId: "generalActivityList",
    scope: "general",
    date: el("generalHistoryDate").value
  });
}

function renderActivityStatistics() {
  const typeSelect = el("statsActivityType");
  const selectedType = typeSelect.value;
  const activityTypes = [...new Set(state.activities.map(activity => activity.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  typeSelect.innerHTML = `<option value="">Tous les types</option>${activityTypes.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
  if (activityTypes.includes(selectedType)) typeSelect.value = selectedType;

  const mode = el("statsPeriodMode").value;
  const period = mode === "month" ? el("statsMonth").value : el("statsYear").value;
  const requestedType = typeSelect.value;
  const filteredActivities = state.activities.filter(activity => {
    const matchesPeriod = mode === "month" ? activity.date?.startsWith(period) : activity.date?.startsWith(String(period));
    return matchesPeriod && (!requestedType || activity.type === requestedType);
  });
  const displayedTypes = requestedType ? [requestedType] : activityTypes.filter(type => filteredActivities.some(activity => activity.type === type));
  const rows = [];
  let totalRecords = 0;
  const globalCounts = { present: 0, late: 0, absent: 0, justified: 0 };

  state.members.forEach(member => {
    displayedTypes.forEach(type => {
      const counts = { present: 0, late: 0, absent: 0, justified: 0 };
      filteredActivities.filter(activity => activity.type === type).forEach(activity => {
        const status = activity.attendance?.[member.id];
        if (counts[status] === undefined) return;
        counts[status]++;
        globalCounts[status]++;
        totalRecords++;
      });
      const sessions = counts.present + counts.late + counts.absent + counts.justified;
      const rate = sessions ? Math.round((counts.present + counts.late) / sessions * 100) : 0;
      rows.push({ member, type, sessions, rate, ...counts });
    });
  });

  el("memberActivityStatsBody").innerHTML = rows.map(row => `<tr>
    <td data-label="Matricule"><strong>${escapeHtml(row.member.matricule)}</strong></td>
    <td data-label="Membre">${escapeHtml(memberFullName(row.member))}</td>
    <td data-label="Type"><span class="role-badge">${escapeHtml(row.type)}</span></td>
    <td data-label="Séances">${row.sessions}</td>
    <td data-label="Présent"><strong class="stat-value present">${row.present}</strong></td>
    <td data-label="Retard"><strong class="stat-value late">${row.late}</strong></td>
    <td data-label="Absent"><strong class="stat-value absent">${row.absent}</strong></td>
    <td data-label="Justifié"><strong class="stat-value justified">${row.justified}</strong></td>
    <td data-label="Taux"><strong>${row.rate}%</strong></td>
  </tr>`).join("");
  el("memberActivityStatsEmpty").style.display = rows.length ? "none" : "block";
  const attended = globalCounts.present + globalCounts.late;
  el("statsSessionCount").textContent = filteredActivities.length;
  el("statsRecordCount").textContent = totalRecords;
  el("statsGlobalRate").textContent = `${totalRecords ? Math.round(attended / totalRecords * 100) : 0}%`;
}

function renderActivityHistory({ targetId, scope, date }) {
  const activities = state.activities
    .filter(activity => activity.scope === scope)
    .filter(activity => !date || activity.date === date)
    .sort((a, b) => `${b.date || "0000"} ${b.startTime || ""}`.localeCompare(`${a.date || "0000"} ${a.startTime || ""}`));

  el(targetId).innerHTML = activities.length ? activities.map(renderActivityPresenceCard).join("")
    : `<div class="empty-state history-empty" style="display:block"><h3>Aucune présence trouvée</h3><p>Modifiez les filtres ou enregistrez une nouvelle activité.</p></div>`;
}

function renderActivityPresenceCard(activity) {
  const date = activity.date
    ? new Date(`${activity.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Date à préciser";
  const totals = activityTotals(activity);
  const expectedMembers = activity.scope === "general"
    ? state.members
    : state.members.filter(member => member.kourel === activity.kourel);
  const displayStatuses = activity.scope === "general" ? ["present", "absent"] : ACTIVITY_STATUSES;
  const normalizedStatus = member => {
    const status = activity.attendance?.[member.id];
    if (activity.scope !== "general") return status;
    return { present: "present", late: "present", absent: "absent", justified: "absent" }[status] || status;
  };
  const unmarkedMembers = expectedMembers.filter(member => !normalizedStatus(member));

  return `<article class="activity-presence-card">
    <div class="activity-presence-header">
      <div>
        <strong>${escapeHtml(activity.type)}</strong>
        <span>${escapeHtml(activity.scope === "general" ? "Tous les membres" : activity.kourel)} · ${escapeHtml(date)}</span>
        <p>${escapeHtml(activity.place || "Lieu non renseigné")}${activity.startTime ? ` · ${escapeHtml(activity.startTime)}` : ""}${activity.endTime ? ` à ${escapeHtml(activity.endTime)}` : ""}</p>
        ${activity.eventName ? `<p><strong>Évènement :</strong> ${escapeHtml(activity.eventName)}</p>` : ""}
        ${activity.melodies?.length ? `<p><strong>Mélodies :</strong> ${activity.melodies.map(escapeHtml).join(" · ")}</p>` : ""}
      </div>
      <div class="activity-card-actions"><button class="secondary-button small-button" data-edit-activity="${activity.id}">Modifier la fiche</button><button class="icon-button danger" data-delete-activity="${activity.id}" title="Supprimer l'activité">×</button></div>
    </div>
    <div class="activity-summary ${activity.scope === "general" ? "two-statuses" : ""}">
      ${activity.scope === "general"
        ? `<span>${expectedMembers.filter(member => normalizedStatus(member) === "present").length} présent(s)</span><span>${expectedMembers.filter(member => normalizedStatus(member) === "absent").length} absent(s)</span>`
        : `<span>${totals.present} présent(s)</span><span>${totals.late} retard(s)</span><span>${totals.absent} absent(s)</span><span>${totals.justified} justifié(s)</span>`}
    </div>
    <div class="activity-presence-lists">
      ${displayStatuses.map(status => renderActivityMemberList(activityStatusGroupLabel(status), expectedMembers.filter(member => normalizedStatus(member) === status), activity, status)).join("")}
      ${unmarkedMembers.length ? renderActivityMemberList("Non pointés", unmarkedMembers, activity, "") : ""}
    </div>
  </article>`;
}

function activityStatusGroupLabel(status) {
  return { present: "Présents", late: "Présents en retard", absent: "Absents", justified: "Absents justifiés" }[status] || "Non pointés";
}

function renderActivityMemberList(title, members, activity, displayedStatus) {
  return `<section class="activity-member-list"><h3>${title}</h3>${members.length ? members.map(member => `
    <div><strong>${escapeHtml(member.matricule)}</strong><span>${escapeHtml(memberFullName(member))}</span><em>${escapeHtml(displayedStatus ? activityStatusLabel(displayedStatus) : "Non pointé")}</em></div>
  `).join("") : `<p class="muted-copy">Aucun membre dans cette liste.</p>`}</section>`;
}

function activityTotals(activity) {
  const totals = { present: 0, late: 0, absent: 0, justified: 0 };
  Object.values(activity.attendance || {}).forEach(status => {
    if (totals[status] !== undefined) totals[status]++;
  });
  return totals;
}

function membersForKourelSession() {
  const kourel = el("kourelSessionKourel").value;
  return state.members.filter(member => member.kourel === kourel);
}

function updateKourelActivityFields() {
  const isPerformance = el("kourelActivityType").value === "Prestation";
  el("kourelEventNameField").hidden = !isPerformance;
  el("kourelEventName").required = isPerformance;
  if (!isPerformance) el("kourelEventName").value = "";
}

function renderSessionRosters() {
  const editedActivity = state.activities.find(activity => activity.id === editingActivityId);
  renderRoster("kourelRoster", membersForKourelSession(), "kourel", editedActivity?.scope === "kourel" ? editedActivity.attendance : {});
  renderRoster("generalRoster", state.members, "general", editedActivity?.scope === "general" ? editedActivity.attendance : {});
}

function renderRoster(targetId, members, prefix, attendance = {}) {
  const statuses = prefix === "general" ? ["present", "absent"] : ACTIVITY_STATUSES;
  el(targetId).innerHTML = members.length ? `
    <div class="table-wrap">
      <table class="session-table ${prefix}-session-table">
        <thead><tr><th>Matricule</th><th>Prénom et nom</th>${prefix === "general" ? "<th>Espace culturel</th>" : ""}<th>Présence</th></tr></thead>
        <tbody>
          ${members.map(member => {
            const recordedStatus = attendance[member.id];
            const selectedStatus = prefix === "general"
              ? ({ present: "present", late: "present", absent: "absent", justified: "absent" }[recordedStatus] || "")
              : recordedStatus;
            return `
            <tr>
              <td><strong>${escapeHtml(member.matricule)}</strong></td>
              <td>${escapeHtml(memberFullName(member))}</td>
              ${prefix === "general" ? `<td><span class="role-badge">${escapeHtml(member.culturalSpace || "Non renseigné")}</span></td>` : ""}
              <td><div class="presence-checks ${prefix === "general" ? "two-options" : ""}">${statuses.map(status => `<label class="presence-check ${status}"><input type="radio" name="${prefix}-status-${member.id}" value="${status}" data-session="${prefix}" data-member-id="${member.id}" ${selectedStatus === status ? "checked" : ""}><span>${activityStatusLabel(status)}</span></label>`).join("")}</div></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>` : `<div class="empty-state history-empty" style="display:block"><h3>Aucun membre</h3><p>Aucun membre ne correspond a cette selection.</p></div>`;
}

function renderHistory() {
  const dates = Object.keys(state.attendance)
    .filter(date => Object.keys(state.attendance[date] || {}).length)
    .sort((a, b) => b.localeCompare(a));
  el("historyList").innerHTML = dates.length ? dates.map(date => {
    const records = state.attendance[date] || {};
    const present = state.members.filter(member => records[member.id]?.status === "present").length;
    const late = state.members.filter(member => records[member.id]?.status === "late").length;
    const absent = state.members.filter(member => records[member.id]?.status === "absent").length;
    const label = new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return `<button class="history-item" data-history-date="${date}">
      <strong>${label}</strong>
      <span>${present} presents · ${late} retards · ${absent} absents</span>
    </button>`;
  }).join("") : `<div class="empty-state history-empty" style="display:block"><h3>Aucun historique</h3><p>Les journees marquees apparaitront ici.</p></div>`;
}

function renderSolidarityMemberOptions() {
  el("solidarityMember").innerHTML = state.members.length ? state.members.map(member => `
    <option value="${member.id}">${escapeHtml(member.matricule)} - ${escapeHtml(memberFullName(member))}</option>
  `).join("") : `<option value="">Aucun membre</option>`;
}

function renderSolidarity() {
  renderSolidarityMemberOptions();
  const month = el("socialContributionMonth").value || localToday.slice(0, 7);
  const monthlyContributions = state.socialContributions[month] || {};
  const paidCount = state.members.filter(member => monthlyContributions[member.id]?.paid).length;
  el("socialContributionList").innerHTML = state.members.length ? state.members.map(member => {
    const contribution = monthlyContributions[member.id] || {};
    return `<div class="social-contribution-row">
      <label><input type="checkbox" data-monthly-contribution="${member.id}" ${contribution.paid ? "checked" : ""}> <strong>${escapeHtml(member.matricule)}</strong> · ${escapeHtml(memberFullName(member))}</label>
      <span>${MONTHLY_CONTRIBUTION.toLocaleString("fr-FR")} FCFA</span>
      <input type="date" data-monthly-contribution-date="${member.id}" value="${escapeHtml(contribution.date || (contribution.paid ? `${month}-01` : ""))}" ${contribution.paid ? "" : "disabled"}>
    </div>`;
  }).join("") : `<div class="empty-state history-empty" style="display:block"><h3>Aucun membre</h3><p>Ajoutez des membres pour suivre les cotisations.</p></div>`;

  const totals = socialCashTotals();
  el("socialIncome").textContent = `${totals.income.toLocaleString("fr-FR")} FCFA`;
  el("socialExpenses").textContent = `${totals.expenses.toLocaleString("fr-FR")} FCFA`;
  el("socialBalance").textContent = `${totals.balance.toLocaleString("fr-FR")} FCFA`;
  el("socialMonthProgress").textContent = `${paidCount} / ${state.members.length}`;
  el("socialBalance").closest(".social-stat").classList.toggle("deficit", totals.balance < 0);
  el("socialDeficitAlert").hidden = totals.balance >= 0;
  el("socialDeficitAlert").textContent = totals.balance < 0 ? `Alerte : la caisse présente un déficit de ${Math.abs(totals.balance).toLocaleString("fr-FR")} FCFA.` : "";

  renderCashLedger();
  const events = [...state.solidarityEvents].sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
  el("solidarityEvents").innerHTML = events.length ? events.map(event => {
    const member = state.members.find(item => item.id === event.memberId);
    return `<article class="solidarity-event">
      <div class="solidarity-event-header">
        <div>
          <strong>${escapeHtml(event.type)} · ${escapeHtml(member ? memberFullName(member) : "Membre supprime")}</strong>
          <span>${escapeHtml(event.date)} · Sortie : ${Number(event.expenseAmount || 0).toLocaleString("fr-FR")} FCFA · Prestation du kourel : ${event.kourelPerformance ? "Oui" : "Non"}</span>
          ${event.note ? `<p>${escapeHtml(event.note)}</p>` : ""}
        </div>
        <button class="icon-button danger" data-delete-solidarity="${event.id}" title="Supprimer le suivi">×</button>
      </div>
    </article>`;
  }).join("") : `<div class="empty-state history-empty" style="display:block"><h3>Aucun évènement</h3><p>Créez un évènement social pour commencer le suivi.</p></div>`;
}

function socialCashTotals() {
  let contributionIncome = 0;
  Object.values(state.socialContributions).forEach(month => Object.values(month).forEach(contribution => {
    if (contribution?.paid) contributionIncome += Number(contribution.amount || MONTHLY_CONTRIBUTION);
  }));
  const transactionIncome = state.socialTransactions.filter(item => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = state.socialTransactions.filter(item => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return { income: contributionIncome + transactionIncome, expenses, balance: contributionIncome + transactionIncome - expenses };
}

function renderCashLedger() {
  const contributionRows = [];
  Object.entries(state.socialContributions).forEach(([month, records]) => Object.entries(records).forEach(([memberId, contribution]) => {
    if (!contribution?.paid) return;
    const member = state.members.find(item => item.id === memberId);
    contributionRows.push({ type: "income", date: contribution.date || `${month}-01`, label: `Cotisation ${month} - ${member ? memberFullName(member) : "Membre supprimé"}`, amount: Number(contribution.amount || MONTHLY_CONTRIBUTION) });
  }));
  const rows = [...contributionRows, ...state.socialTransactions].sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
  el("cashLedger").innerHTML = rows.length ? rows.map(item => `<div class="cash-ledger-row ${item.type}"><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.date || "Date non renseignée")}</span></div><strong>${item.type === "income" ? "+" : "-"}${Number(item.amount || 0).toLocaleString("fr-FR")} FCFA</strong>${item.id ? `<button class="icon-button danger" data-delete-transaction="${item.id}" title="Supprimer">×</button>` : ""}</div>`).join("") : `<div class="empty-state history-empty" style="display:block"><h3>Aucun mouvement</h3><p>Les cotisations et opérations apparaîtront ici.</p></div>`;
}

function renderAll() {
  formatDate();
  renderAttendance();
  renderMembers();
  renderSessionRosters();
  renderActivities();
  renderActivityStatistics();
  renderSolidarity();
  renderHistory();
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function deleteMember(id) {
  const member = state.members.find(item => item.id === id);
  if (!member || !confirm(`Supprimer ${memberFullName(member)} de la liste ?`)) return;
  state.members = state.members.filter(item => item.id !== id);
  Object.values(state.attendance).forEach(records => delete records[id]);
  saveState();
  renderAll();
  showToast("Membre supprime");
}

function openMemberDialog(member = null, options = {}) {
  editingMemberId = member?.id || null;
  el("memberForm").reset();
  el("dialogTitle").textContent = member ? "Modifier un membre" : "Ajouter un membre";
  el("dialogSubtitle").textContent = member ? "Mettez a jour les informations du membre." : "Renseignez les informations du nouveau membre.";
  el("saveMemberButton").textContent = member ? "Enregistrer" : "Ajouter le membre";
  el("memberMatricule").value = member?.matricule || "";
  el("memberNom").value = member?.nom || "";
  el("memberPrenom").value = member?.prenom || "";
  el("memberSexe").value = member?.sexe || "";
  el("memberBirthDate").value = member?.birthDate || "";
  el("memberAge").value = calculateAge(member?.birthDate);
  el("memberAddress").value = member?.address || "";
  el("memberPhone").value = member?.phone || "";
  el("memberEmail").value = member?.email || "";
  el("memberProfession").value = member?.profession || "";
  el("memberDaaraSector").value = member?.daaraSector || "";
  el("memberMagalSector").value = member?.magalSector || "";
  el("memberCulturalSpace").value = member?.culturalSpace || "";
  el("memberKourel").value = member?.kourel || "";
  el("memberRegistrationDate").value = member?.registrationDate || localToday;
  el("memberRenewalYear").value = new Date().getFullYear();
  el("memberRenewalDate").value = localToday;
  el("memberRenewalConfirm").checked = !member || Boolean(options.renew);
  el("memberMatricule").readOnly = Boolean(member);
  if (options.renew) {
    el("dialogTitle").textContent = "Renouveler l'inscription";
    el("dialogSubtitle").textContent = "Actualisez les informations variables et confirmez le renouvellement annuel.";
    el("saveMemberButton").textContent = "Enregistrer le renouvellement";
  }
  el("memberDialog").showModal();
  setTimeout(() => el("memberMatricule").focus(), 50);
}

function memberPayloadFromForm() {
  return {
    matricule: el("memberMatricule").value.trim(),
    nom: el("memberNom").value.trim(),
    prenom: el("memberPrenom").value.trim(),
    sexe: el("memberSexe").value,
    birthDate: el("memberBirthDate").value,
    address: el("memberAddress").value.trim(),
    phone: el("memberPhone").value.trim(),
    email: el("memberEmail").value.trim(),
    profession: el("memberProfession").value.trim(),
    daaraSector: el("memberDaaraSector").value.trim(),
    magalSector: el("memberMagalSector").value.trim(),
    culturalSpace: el("memberCulturalSpace").value,
    kourel: el("memberKourel").value,
    registrationDate: el("memberRegistrationDate").value
  };
}

function downloadText(filename, content, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  currentView = button.dataset.view;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  el(`${currentView}View`).classList.add("active");
  const titles = {
    members: ["Fichier des membres", "Matricule, identité, kourel et secteurs d'activité."],
    rehearsals: ["Répétition / Prestation", "Enregistrez et consultez les présences des membres du kourel."],
    daaraActivities: ["Activités de la Daara", "Gérez les présences aux activités réunissant tous les membres."],
    solidarity: ["Gestion sociale", "Suivez les événements, les participations mensuelles et les remises."],
    reports: ["Rapports de présence", "Analysez et exportez vos données de présence."]
  };
  [el("pageTitle").textContent, el("pageSubtitle").textContent] = titles[currentView];
  document.querySelector(".global-attendance-date").hidden = currentView !== "reports";
  el("sidebar").classList.remove("open");
  updateStats();
}));

function openSocialPage(view) {
  const titles = {
    socialContributions: ["Cotisations mensuelles", "Suivez les versements mensuels de 1 000 FCFA par membre."],
    socialEvent: ["Nouvel évènement social", "Enregistrez l'évènement, l'aide accordée et la prestation du kourel."],
    socialCash: ["Mouvement de caisse", "Renseignez les entrées et les sorties de la caisse sociale."]
  };
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  el(`${view}View`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === "solidarity"));
  [el("pageTitle").textContent, el("pageSubtitle").textContent] = titles[view];
  document.querySelector(".global-attendance-date").hidden = true;
  el("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

el("attendanceDate").addEventListener("change", renderAll);
el("searchInput").addEventListener("input", renderAttendance);
el("memberSearch").addEventListener("input", renderMembers);
el("kourelSessionKourel").addEventListener("change", renderSessionRosters);
el("kourelActivityType").addEventListener("change", updateKourelActivityFields);
el("socialContributionMonth").addEventListener("change", renderSolidarity);
["kourelHistoryDate", "generalHistoryDate"].forEach(id => {
  el(id).addEventListener("change", renderActivities);
});
["statsMonth", "statsYear", "statsActivityType"].forEach(id => el(id).addEventListener("change", renderActivityStatistics));
el("statsPeriodMode").addEventListener("change", () => {
  const byMonth = el("statsPeriodMode").value === "month";
  el("statsMonthField").hidden = !byMonth;
  el("statsYearField").hidden = byMonth;
  renderActivityStatistics();
});
el("memberBirthDate").addEventListener("input", () => {
  el("memberAge").value = calculateAge(el("memberBirthDate").value);
});
el("menuButton").addEventListener("click", () => el("sidebar").classList.toggle("open"));

el("attendanceBody").addEventListener("input", event => {
  const target = event.target;
  if (!target.dataset.id || !target.dataset.field) return;
  memberRecord(target.dataset.id)[target.dataset.field] = target.value;
  if (target.dataset.field === "status") target.className = `status-select ${target.value}`;
  saveState();
  updateStats();
});

document.addEventListener("click", event => {
  const socialPage = event.target.closest("[data-social-page]")?.dataset.socialPage;
  if (socialPage) openSocialPage(socialPage);

  if (event.target.closest("[data-social-back]")) {
    document.querySelector('[data-view="solidarity"]').click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const id = event.target.dataset.delete;
  if (id) deleteMember(id);

  const editId = event.target.dataset.edit;
  if (editId) {
    const member = state.members.find(item => item.id === editId);
    if (member) openMemberDialog(member);
  }

  const renewId = event.target.dataset.renew;
  if (renewId) {
    const member = state.members.find(item => item.id === renewId);
    if (member) openMemberDialog(member, { renew: true });
  }

  const activityId = event.target.dataset.deleteActivity;
  if (activityId) {
    state.activities = state.activities.filter(activity => activity.id !== activityId);
    saveState();
    renderAll();
    showToast("Activite supprimee");
  }

  const editActivityId = event.target.dataset.editActivity;
  if (editActivityId) openActivityAttendanceSheet(editActivityId);

  const solidarityId = event.target.dataset.deleteSolidarity;
  if (solidarityId) {
    state.solidarityEvents = state.solidarityEvents.filter(item => item.id !== solidarityId);
    state.socialTransactions = state.socialTransactions.filter(item => item.eventId !== solidarityId);
    saveState();
    renderSolidarity();
    showToast("Suivi social supprime");
  }

  const transactionId = event.target.dataset.deleteTransaction;
  if (transactionId) {
    const transaction = state.socialTransactions.find(item => item.id === transactionId);
    if (transaction?.eventId) {
      const socialEvent = state.solidarityEvents.find(item => item.id === transaction.eventId);
      if (socialEvent) socialEvent.expenseAmount = 0;
    }
    state.socialTransactions = state.socialTransactions.filter(item => item.id !== transactionId);
    saveState();
    renderSolidarity();
    showToast("Mouvement supprimé");
  }

  const historyDate = event.target.closest("[data-history-date]")?.dataset.historyDate;
  if (historyDate) {
    el("attendanceDate").value = historyDate;
    renderAll();
  }

});

el("markAllButton").addEventListener("click", () => {
  const now = new Date().toTimeString().slice(0, 5);
  state.members.forEach(member => {
    const record = memberRecord(member.id);
    record.status = "present";
    record.time ||= now;
  });
  saveState();
  renderAttendance();
  showToast("Tous les membres sont marques presents");
});

el("clearDayButton").addEventListener("click", () => {
  if (!confirm("Vider les presences de cette journee ?")) return;
  delete state.attendance[selectedDate()];
  saveState();
  renderAll();
  showToast("Journee videe");
});

el("addMemberButton").addEventListener("click", () => {
  openMemberDialog();
});

el("closeMemberDialog").addEventListener("click", () => el("memberDialog").close());
el("cancelMemberDialog").addEventListener("click", () => el("memberDialog").close());

el("memberForm").addEventListener("submit", event => {
  event.preventDefault();
  const payload = memberPayloadFromForm();
  const duplicate = state.members.find(member => member.matricule === payload.matricule && member.id !== editingMemberId);
  if (duplicate) {
    showToast("Ce matricule existe deja");
    el("memberMatricule").focus();
    return;
  }

  if (editingMemberId) {
    const member = state.members.find(item => item.id === editingMemberId);
    Object.assign(member, payload);
    if (el("memberRenewalConfirm").checked) {
      const year = Number(el("memberRenewalYear").value);
      const renewal = { year, date: el("memberRenewalDate").value };
      const existingIndex = member.renewals.findIndex(item => Number(item.year) === year);
      if (existingIndex >= 0) member.renewals[existingIndex] = renewal;
      else member.renewals.push(renewal);
    }
  } else {
    const member = createMember(payload);
    const year = Number(el("memberRenewalYear").value);
    member.renewals = [{ year, date: el("memberRenewalDate").value }];
    state.members.push(member);
  }
  saveState();
  renderAll();
  el("memberDialog").close();
  showToast(editingMemberId ? "Membre modifie" : "Nouveau membre ajoute");
  editingMemberId = null;
});

function collectSessionAttendance(prefix, members) {
  const attendance = {};
  const missingMembers = [];
  members.forEach(member => {
    const input = document.querySelector(`[data-session="${prefix}"][data-member-id="${member.id}"]:checked`);
    if (input) attendance[member.id] = input.value;
    else missingMembers.push(member);
  });
  return { attendance, missingMembers };
}

function openActivityAttendanceSheet(activityId) {
  const activity = state.activities.find(item => item.id === activityId);
  if (!activity) return;
  editingActivityId = activity.id;
  if (activity.scope === "kourel") {
    el("kourelHistoryDate").value = activity.date;
    el("kourelActivityType").value = activity.type;
    el("kourelSessionKourel").value = activity.kourel;
    el("kourelSessionDate").value = activity.date;
    el("kourelSessionPlace").value = activity.place;
    el("kourelStartTime").value = activity.startTime;
    el("kourelEndTime").value = activity.endTime;
    el("kourelEventName").value = activity.eventName || "";
    el("kourelMelodies").value = (activity.melodies || []).join("\n");
    updateKourelActivityFields();
    renderSessionRosters();
    el("kourelSessionSubmit").textContent = "Mettre à jour cette fiche de présence";
    document.querySelector('[data-view="rehearsals"]').click();
  } else {
    el("generalHistoryDate").value = activity.date;
    el("generalActivityType").value = activity.type;
    el("generalSessionDate").value = activity.date;
    el("generalSessionPlace").value = activity.place;
    el("generalStartTime").value = activity.startTime;
    el("generalEndTime").value = activity.endTime;
    renderSessionRosters();
    el("generalSessionSubmit").textContent = "Mettre à jour cette fiche de présence";
    document.querySelector('[data-view="daaraActivities"]').click();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

el("kourelSessionForm").addEventListener("submit", event => {
  event.preventDefault();
  const members = membersForKourelSession();
  if (!members.length) {
    showToast("Aucun membre dans ce kourel");
    return;
  }
  const type = el("kourelActivityType").value;
  const eventName = el("kourelEventName").value.trim();
  if (type === "Prestation" && !eventName) {
    showToast("Renseignez le nom de l'évènement");
    el("kourelEventName").focus();
    return;
  }
  const presenceSheet = collectSessionAttendance("kourel", members);
  if (presenceSheet.missingMembers.length) {
    showToast(`Pointage incomplet : ${presenceSheet.missingMembers.length} membre(s) sans statut`);
    el("kourelRoster").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const editedIndex = state.activities.findIndex(activity => activity.id === editingActivityId && activity.scope === "kourel");
  const activityPayload = {
    id: editedIndex >= 0 ? editingActivityId : crypto.randomUUID(),
    type,
    scope: "kourel",
    kourel: el("kourelSessionKourel").value,
    date: el("kourelSessionDate").value,
    startTime: el("kourelStartTime").value,
    endTime: el("kourelEndTime").value,
    place: el("kourelSessionPlace").value.trim(),
    eventName,
    melodies: el("kourelMelodies").value.split(/\n|,/).map(item => item.trim()).filter(Boolean),
    attendance: presenceSheet.attendance
  };
  if (editedIndex >= 0) state.activities[editedIndex] = activityPayload;
  else state.activities.push(activityPayload);
  saveState();
  editingActivityId = null;
  el("kourelHistoryDate").value = activityPayload.date;
  el("kourelSessionForm").reset();
  el("kourelSessionDate").value = localToday;
  el("kourelSessionSubmit").textContent = "Enregistrer la fiche de présence";
  updateKourelActivityFields();
  renderAll();
  showToast(editedIndex >= 0 ? "Fiche de présence mise à jour" : "Fiche de présence enregistrée");
});

el("generalSessionForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!state.members.length) {
    showToast("Aucun membre a afficher");
    return;
  }
  const presenceSheet = collectSessionAttendance("general", state.members);
  if (presenceSheet.missingMembers.length) {
    showToast(`Pointage incomplet : ${presenceSheet.missingMembers.length} membre(s) sans statut`);
    el("generalRoster").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const editedIndex = state.activities.findIndex(activity => activity.id === editingActivityId && activity.scope === "general");
  const activityPayload = {
    id: editedIndex >= 0 ? editingActivityId : crypto.randomUUID(),
    type: el("generalActivityType").value,
    scope: "general",
    kourel: "Tous",
    date: el("generalSessionDate").value,
    startTime: el("generalStartTime").value,
    endTime: el("generalEndTime").value,
    place: el("generalSessionPlace").value.trim(),
    attendance: presenceSheet.attendance
  };
  if (editedIndex >= 0) state.activities[editedIndex] = activityPayload;
  else state.activities.push(activityPayload);
  saveState();
  editingActivityId = null;
  el("generalHistoryDate").value = activityPayload.date;
  el("generalSessionForm").reset();
  el("generalSessionDate").value = localToday;
  el("generalSessionSubmit").textContent = "Enregistrer la fiche de présence";
  renderAll();
  showToast(editedIndex >= 0 ? "Fiche de présence mise à jour" : "Fiche de présence enregistrée");
});
el("solidarityForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!state.members.length) {
    showToast("Ajoutez d'abord des membres");
    return;
  }
  const id = crypto.randomUUID();
  const date = el("solidarityDeliveryDate").value;
  const expenseAmount = Number(el("solidarityExpenseAmount").value || 0);
  const socialEvent = {
    id,
    memberId: el("solidarityMember").value,
    type: el("solidarityType").value,
    month: date.slice(0, 7),
    date,
    expenseAmount,
    kourelPerformance: el("solidarityKourelPerformance").checked,
    note: el("solidarityNote").value.trim(),
    contributions: {}
  };
  state.solidarityEvents.push(socialEvent);
  if (expenseAmount > 0) state.socialTransactions.push({ id: crypto.randomUUID(), type: "expense", date, label: `${socialEvent.type} - ${memberFullName(state.members.find(member => member.id === socialEvent.memberId))}`, amount: expenseAmount, eventId: id });
  saveState();
  el("solidarityForm").reset();
  el("solidarityDeliveryDate").value = localToday;
  el("solidarityExpenseAmount").value = 0;
  renderSolidarity();
  showToast("Suivi social cree");
});

el("cashMovementForm").addEventListener("submit", event => {
  event.preventDefault();
  state.socialTransactions.push({
    id: crypto.randomUUID(),
    type: el("cashMovementType").value,
    date: el("cashMovementDate").value,
    label: el("cashMovementLabel").value.trim(),
    amount: Number(el("cashMovementAmount").value || 0)
  });
  saveState();
  el("cashMovementForm").reset();
  el("cashMovementDate").value = localToday;
  renderSolidarity();
  showToast("Mouvement de caisse enregistré");
});

document.addEventListener("change", event => {
  const memberId = event.target.dataset.monthlyContribution;
  if (memberId) {
    const month = el("socialContributionMonth").value;
    state.socialContributions[month] ||= {};
    state.socialContributions[month][memberId] = { paid: event.target.checked, amount: MONTHLY_CONTRIBUTION, date: event.target.checked ? (month === localToday.slice(0, 7) ? localToday : `${month}-01`) : "" };
    saveState();
    renderSolidarity();
    return;
  }
  const dateMemberId = event.target.dataset.monthlyContributionDate;
  if (dateMemberId) {
    const month = el("socialContributionMonth").value;
    state.socialContributions[month] ||= {};
    state.socialContributions[month][dateMemberId] ||= { paid: true, amount: MONTHLY_CONTRIBUTION, date: "" };
    state.socialContributions[month][dateMemberId].date = event.target.value;
    saveState();
  }
});

el("exportButton").addEventListener("click", () => {
  const rows = [["Date", "Matricule", "Prenom", "Nom", "Sexe", "Age", "Telephone", "E-mail", "Profession", "Secteur daara", "Secteur Magal", "Espace culturel", "Kourel", "Statut", "Heure d'arrivee", "Note"]];
  state.members.forEach(member => {
    const record = memberRecord(member.id);
    rows.push([
      selectedDate(),
      member.matricule,
      member.prenom,
      member.nom,
      member.sexe,
      calculateAge(member.birthDate),
      member.phone,
      member.email,
      member.profession,
      member.daaraSector,
      member.magalSector,
      member.culturalSpace,
      member.kourel,
      statusLabel(record.status),
      record.time,
      record.note
    ]);
  });
  const csv = "\uFEFF" + rows.map(row => row.map(value => `"${String(value || "").replaceAll('"', '""')}"`).join(";")).join("\n");
  downloadText(`presences-${selectedDate()}.csv`, csv, "text/csv;charset=utf-8");
  showToast("Rapport CSV exporte");
});

el("printButton").addEventListener("click", () => window.print());

el("backupButton").addEventListener("click", () => {
  const data = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  downloadText(`ht-gestion-membres-sauvegarde-${localToday}.json`, data, "application/json;charset=utf-8");
  showToast("Sauvegarde telechargee");
});

el("restoreButton").addEventListener("click", () => el("restoreInput").click());

el("restoreInput").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!isValidState(imported)) throw new Error("Format invalide");
      state = {
        members: imported.members.map(createMember),
        attendance: imported.attendance,
        activities: Array.isArray(imported.activities) ? imported.activities.map(normalizeActivity) : [],
        solidarityEvents: Array.isArray(imported.solidarityEvents) ? imported.solidarityEvents.map(normalizeSolidarityEvent) : [],
        socialContributions: imported.socialContributions || migrateSocialContributions(Array.isArray(imported.solidarityEvents) ? imported.solidarityEvents.map(normalizeSolidarityEvent) : []),
        socialTransactions: Array.isArray(imported.socialTransactions) ? imported.socialTransactions : migrateSocialTransactions(Array.isArray(imported.solidarityEvents) ? imported.solidarityEvents.map(normalizeSolidarityEvent) : [])
      };
      saveState();
      renderAll();
      showToast("Donnees restaurees");
    } catch (_) {
      showToast("Fichier de sauvegarde invalide");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
});

updateKourelActivityFields();
saveState();
renderAll();
