// src/utils/activityStore.js
const KEY = "road3_activity_v1";

// 安全に読む
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// payload 例:
// { type: "like"|"save"|"notify", byAccountId, byAccountName, targetAccountId?, postId?, message?, snapshot? }
export function addActivity(payload) {
  const list = load();
  const item = {
    id: String(Date.now()) + "_" + Math.random().toString(16).slice(2),
    createdAt: Date.now(),
    ...payload,
  };
  const next = [item, ...list];
  save(next);
  return item;
}

export function getActivities() {
  return load();
}

export function clearActivities() {
  save([]);
}

export function removeActivity(id) {
  const list = load();
  const next = list.filter((x) => x.id !== id);
  save(next);
}

export function filterActivities({ type, byAccountId } = {}) {
  let list = load();
  if (type) list = list.filter((x) => x.type === type);
  if (byAccountId) list = list.filter((x) => String(x.byAccountId) === String(byAccountId));
  return list;
}