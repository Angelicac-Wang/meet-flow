// 邀請碼字元（排除易混淆：0、O、1、I）
const INVITE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
}

const STORAGE_KEY = "meetflow-groups";

export type StoredGroup = {
  inviteCode: string;
  members: Array<{ id: string; name: string; color: string; availability: string[] }>;
  createdAt: number;
};

export function saveGroup(inviteCode: string, members: StoredGroup["members"]): void {
  if (typeof window === "undefined") return;
  const groups = getStoredGroups();
  groups[inviteCode] = { inviteCode, members, createdAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export function getGroupByCode(code: string): StoredGroup | null {
  if (typeof window === "undefined") return null;
  const groups = getStoredGroups();
  const normalized = code.trim().toUpperCase();
  return groups[normalized] ?? null;
}

function getStoredGroups(): Record<string, StoredGroup> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
