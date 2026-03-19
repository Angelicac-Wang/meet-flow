"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Plus, Users, Calendar, User, CalendarCheck, Copy, Check, LogIn } from "lucide-react";
import {
  generateInviteCode,
  saveGroup,
  getGroupByCode,
} from "@/lib/invite";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeSlot = string; // "day-hour", e.g. "0-9" = Monday 9am

type Member = {
  id: string;
  name: string;
  color: string;
  availability: TimeSlot[];
};

type WeekOption = "this" | "next" | "next2";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
const COLORS = [
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

const slot = (day: number, hour: number): TimeSlot => `${day}-${hour}`;

// 取得指定週的日期（回傳該週每天的 月/日）
function getWeekDates(weekOption: WeekOption): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const baseMonday = new Date(now);
  baseMonday.setDate(now.getDate() + mondayOffset);

  const weekOffset =
    weekOption === "this" ? 0 : weekOption === "next" ? 7 : 14;
  const monday = new Date(baseMonday);
  monday.setDate(baseMonday.getDate() + weekOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
}

// ─── Fake initial data ────────────────────────────────────────────────────────

// 假資料：三人皆有「週三 9–11」共同空閒，方便展示
const INITIAL_MEMBERS: Member[] = [
  {
    id: "me",
    name: "我",
    color: "bg-blue-500",
    availability: [
      slot(0, 9), slot(0, 10), slot(0, 11),          // Mon 9–12
      slot(0, 14), slot(0, 15), slot(0, 16),         // Mon 14–17
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(3, 14), slot(3, 15), slot(3, 16),         // Thu 14–17
      slot(4, 9),  slot(4, 10),                      // Fri 9–11
    ],
  },
  {
    id: "xiao-liang",
    name: "小梁",
    color: "bg-green-500",
    availability: [
      slot(0, 9),  slot(0, 10), slot(0, 11),         // Mon 9–12
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(2, 14), slot(2, 15), slot(2, 16),         // Wed 14–17
      slot(4, 9),  slot(4, 10),                      // Fri 9–11
    ],
  },
  {
    id: "lu-lu",
    name: "盧盧",
    color: "bg-purple-500",
    availability: [
      slot(1, 10), slot(1, 11), slot(1, 12),         // Tue 10–13
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(3, 14), slot(3, 15),                      // Thu 14–16
    ],
  },
];

// ─── Schedule Grid Component ──────────────────────────────────────────────────

type DragState = {
  startDay: number;
  startHourIdx: number;
  curDay: number;
  curHourIdx: number;
  filling: boolean; // true = turning slots ON, false = turning OFF
};

function ScheduleGrid({
  availability,
  onBatchToggle,
  emerald = false,
  days,
  hours,
  dayDates,
}: {
  availability: TimeSlot[];
  onBatchToggle?: (slots: TimeSlot[], fill: boolean) => void;
  emerald?: boolean;
  days: string[];
  hours: number[];
  dayDates?: string[];
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragging = useRef(false);

  // Commit the selection when mouse is released anywhere
  useEffect(() => {
    function handleMouseUp() {
      if (!dragging.current || !drag) return;
      const d0 = Math.min(drag.startDay, drag.curDay);
      const d1 = Math.max(drag.startDay, drag.curDay);
      const h0 = Math.min(drag.startHourIdx, drag.curHourIdx);
      const h1 = Math.max(drag.startHourIdx, drag.curHourIdx);
      const selected: TimeSlot[] = [];
      for (let d = d0; d <= d1; d++)
        for (let hi = h0; hi <= h1; hi++)
          selected.push(slot(d, hours[hi]));
      onBatchToggle?.(selected, drag.filling);
      dragging.current = false;
      setDrag(null);
    }
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [drag, onBatchToggle]);

  function inDragRect(d: number, hi: number): boolean {
    if (!drag) return false;
    const d0 = Math.min(drag.startDay, drag.curDay);
    const d1 = Math.max(drag.startDay, drag.curDay);
    const h0 = Math.min(drag.startHourIdx, drag.curHourIdx);
    const h1 = Math.max(drag.startHourIdx, drag.curHourIdx);
    return d >= d0 && d <= d1 && hi >= h0 && hi <= h1;
  }

  return (
    <div className="overflow-x-auto select-none">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="w-14" />
            {days.map((d, i) => (
              <th key={d} className="p-2 text-center font-medium text-sm">
                <div>{d}</div>
                {dayDates && (
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {dayDates[i]}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((h, hi) => (
            <tr key={h}>
              <td className="text-right pr-3 text-muted-foreground text-xs py-0.5 whitespace-nowrap">
                {h}:00
              </td>
              {days.map((_, d) => {
                const s = slot(d, h);
                const active = availability.includes(s);
                const inRect = inDragRect(d, hi);

                let cellClass: string;
                if (inRect) {
                  // Preview: show what the result will be
                  cellClass = drag!.filling
                    ? "bg-primary/60 border-primary/60"
                    : "bg-muted border-border opacity-40";
                } else if (active) {
                  cellClass = emerald
                    ? "bg-emerald-400 border-emerald-400"
                    : "bg-primary border-primary";
                } else {
                  cellClass = "bg-muted border-border hover:bg-muted/60";
                }

                return (
                  <td key={d} className="p-0.5">
                    <div
                      className={`h-8 rounded border transition-colors ${cellClass} ${onBatchToggle ? "cursor-pointer" : "cursor-default"}`}
                      onMouseDown={(e) => {
                        if (!onBatchToggle) return;
                        e.preventDefault();
                        dragging.current = true;
                        setDrag({
                          startDay: d,
                          startHourIdx: hi,
                          curDay: d,
                          curHourIdx: hi,
                          filling: !active,
                        });
                      }}
                      onMouseOver={() => {
                        if (!dragging.current) return;
                        setDrag((prev) =>
                          prev ? { ...prev, curDay: d, curHourIdx: hi } : prev
                        );
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 時間範圍與顯示（緊湊版）───────────────────────────────────────────────────

function TimeDisplaySettings({
  includeWeekend,
  setIncludeWeekend,
  startHour,
  setStartHour,
  endHour,
  setEndHour,
  weekOption,
  setWeekOption,
  dayDates,
}: {
  includeWeekend: boolean;
  setIncludeWeekend: (v: boolean) => void;
  startHour: number;
  setStartHour: (v: number) => void;
  endHour: number;
  setEndHour: (v: number) => void;
  weekOption: WeekOption;
  setWeekOption: (v: WeekOption) => void;
  dayDates: string[];
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-muted/50 px-3 py-2 text-xs">
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={includeWeekend}
          onChange={(e) => setIncludeWeekend(e.target.checked)}
          className="rounded border-input"
        />
        包含週末
      </label>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">時段</span>
        <Input
          type="number"
          min={0}
          max={23}
          value={startHour}
          onChange={(e) => setStartHour(Number(e.target.value) || 0)}
          className="h-7 w-12 px-1.5 text-center"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="number"
          min={0}
          max={24}
          value={endHour}
          onChange={(e) => setEndHour(Number(e.target.value) || 24)}
          className="h-7 w-12 px-1.5 text-center"
        />
        <span className="text-muted-foreground">:00</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">週次</span>
        <div className="flex gap-1">
          {(["this", "next", "next2"] as const).map((opt) => (
            <Button
              key={opt}
              variant={weekOption === opt ? "default" : "outline"}
              size="xs"
              onClick={() => setWeekOption(opt)}
            >
              {opt === "this" ? "本週" : opt === "next" ? "下週" : "下下週"}
            </Button>
          ))}
        </div>
        <span className="text-muted-foreground">
          {dayDates[0]}–{dayDates[dayDates.length - 1]}
        </span>
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex gap-4 mb-5 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function MeetFlow() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState("xiao-liang");

  // 功能一：時間範圍與顯示
  const [includeWeekend, setIncludeWeekend] = useState(false);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [weekOption, setWeekOption] = useState<WeekOption>("this");

  // 功能二：共同空閒成員選擇（預設全選）
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    () => new Set(INITIAL_MEMBERS.map((m) => m.id))
  );

  // 功能三：邀請碼
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");

  const me = members.find((m) => m.id === "me")!;
  const others = members.filter((m) => m.id !== "me");
  const viewing = members.find((m) => m.id === viewId) ?? others[0];

  const days = useMemo(
    () => (includeWeekend ? DAY_LABELS : DAY_LABELS.slice(0, 5)),
    [includeWeekend]
  );
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h < endHour; h++) arr.push(h);
    return arr;
  }, [startHour, endHour]);
  const dayDates = useMemo(() => getWeekDates(weekOption), [weekOption]);

  // 同步 selectedMemberIds 當成員變動時（新成員預設選中，移除的成員取消選中）
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  useEffect(() => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      memberIds.forEach((id) => next.add(id));
      prev.forEach((id) => {
        if (!memberIds.includes(id)) next.delete(id);
      });
      return next;
    });
  }, [memberIds.join(",")]);

  const selectedMembers = useMemo(
    () => members.filter((m) => selectedMemberIds.has(m.id)),
    [members, selectedMemberIds]
  );

  const commonSlots = useMemo(() => {
    if (selectedMembers.length === 0) return [];
    return days
      .map((_, d) =>
        hours
          .filter((h) =>
            selectedMembers.every((m) => m.availability.includes(slot(d, h)))
          )
          .map((h) => slot(d, h))
      )
      .flat();
  }, [days.length, hours, selectedMembers]);

  // 邀請碼：初始化與儲存
  useEffect(() => {
    if (inviteCode) {
      saveGroup(inviteCode, members.map((m) => ({ ...m, availability: m.availability })));
    }
  }, [members, inviteCode]);

  useEffect(() => {
    const stored = localStorage.getItem("meetflow-invite-code");
    if (stored) {
      setInviteCode(stored);
    } else {
      const code = generateInviteCode();
      setInviteCode(code);
      localStorage.setItem("meetflow-invite-code", code);
    }
  }, []);

  function batchToggleMySlots(slots: TimeSlot[], fill: boolean) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id !== "me"
          ? m
          : {
              ...m,
              availability: fill
                ? [...new Set([...m.availability, ...slots])]
                : m.availability.filter((x) => !slots.includes(x)),
            }
      )
    );
  }

  function addMember() {
    const name = newName.trim();
    if (!name) return;
    const color = COLORS[members.length % COLORS.length];
    const newMember: Member = {
      id: `member-${Date.now()}`,
      name,
      color,
      availability: [],
    };
    setMembers((prev) => [...prev, newMember]);
    setSelectedMemberIds((prev) => new Set([...prev, newMember.id]));
    setNewName("");
    setOpen(false);
  }

  function toggleMemberSelection(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCopyInviteCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleJoinGroup() {
    setJoinError("");
    const group = getGroupByCode(joinCodeInput);
    if (!group) {
      setJoinError("邀請碼無效或已過期");
      return;
    }
    setMembers((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const toAdd = group.members
        .filter((m) => !existingIds.has(m.id))
        .map((m) => ({
          ...m,
          id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        })) as Member[];
      return [...prev, ...toAdd];
    });
    setJoinCodeInput("");
    setJoinDialogOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <CalendarCheck className="w-5 h-5" />
          <h1 className="text-lg font-semibold tracking-tight">MeetFlow</h1>
          <Badge variant="secondary" className="text-xs font-normal">
            Beta
          </Badge>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="members">
          <TabsList className="mb-2 h-10">
            <TabsTrigger value="members" className="gap-1.5 text-sm">
              <Users className="w-3.5 h-3.5" />
              成員
            </TabsTrigger>
            <TabsTrigger value="my-schedule" className="gap-1.5 text-sm">
              <User className="w-3.5 h-3.5" />
              我的時間表
            </TabsTrigger>
            <TabsTrigger value="view-member" className="gap-1.5 text-sm">
              <Calendar className="w-3.5 h-3.5" />
              查看成員
            </TabsTrigger>
            <TabsTrigger value="common" className="gap-1.5 text-sm">
              <CalendarCheck className="w-3.5 h-3.5" />
              共同空閒
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Members ── */}
          <TabsContent value="members">
            {/* 功能三：邀請碼 */}
            <Card className="mb-6 gap-2">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">邀請成員加入群組</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  分享邀請碼給其他人，他們輸入後即可加入此群組
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">邀請碼：</span>
                    <code className="text-lg font-mono font-semibold tracking-widest bg-muted px-3 py-1.5 rounded">
                      {inviteCode || "------"}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyInviteCode}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        複製
                      </>
                    )}
                  </Button>
                  <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        <LogIn className="w-4 h-4" />
                        加入群組
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                      <DialogTitle>輸入邀請碼</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                      <Input
                        placeholder="輸入 6 位邀請碼"
                        value={joinCodeInput}
                        onChange={(e) => {
                          setJoinCodeInput(e.target.value.toUpperCase());
                          setJoinError("");
                        }}
                        maxLength={6}
                        className="font-mono tracking-widest text-center"
                      />
                      {joinError && (
                        <p className="text-sm text-destructive">{joinError}</p>
                      )}
                      <Button
                        onClick={handleJoinGroup}
                        disabled={joinCodeInput.length !== 6}
                      >
                        加入
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold">成員列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  共 {members.length} 位成員
                </p>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    加入成員
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>加入新成員</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 mt-2">
                    <Input
                      placeholder="輸入成員名稱"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addMember()}
                      autoFocus
                    />
                    <Button onClick={addMember} disabled={!newName.trim()}>
                      確認加入
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback
                        className={`${m.color} text-white text-sm font-semibold`}
                      >
                        {m.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.availability.length} 個空閒時段
                      </p>
                    </div>
                    {m.id === "me" && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        你
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Tab 2: My Schedule ── */}
          <TabsContent value="my-schedule">
            <TimeDisplaySettings
              includeWeekend={includeWeekend}
              setIncludeWeekend={setIncludeWeekend}
              startHour={startHour}
              setStartHour={setStartHour}
              endHour={endHour}
              setEndHour={setEndHour}
              weekOption={weekOption}
              setWeekOption={setWeekOption}
              dayDates={dayDates}
            />
            <div className="mb-5">
              <h2 className="text-base font-semibold">我的時間表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                點擊或拖曳選取矩形範圍來批次切換空閒時段
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-primary", label: "空閒" },
                    { color: "bg-muted border border-border", label: "忙碌" },
                  ]}
                />
                <ScheduleGrid
                  availability={me.availability}
                  onBatchToggle={batchToggleMySlots}
                  days={days}
                  hours={hours}
                  dayDates={dayDates}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: View Member ── */}
          <TabsContent value="view-member">
            <TimeDisplaySettings
              includeWeekend={includeWeekend}
              setIncludeWeekend={setIncludeWeekend}
              startHour={startHour}
              setStartHour={setStartHour}
              endHour={endHour}
              setEndHour={setEndHour}
              weekOption={weekOption}
              setWeekOption={setWeekOption}
              dayDates={dayDates}
            />
            <div className="mb-5">
              <h2 className="text-base font-semibold">查看成員時間表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                選擇成員來查看他們的空閒時段
              </p>
            </div>

            {others.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">
                尚無其他成員，請先在「成員」頁加入
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {others.map((m) => (
                    <Button
                      key={m.id}
                      variant={viewing?.id === m.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewId(m.id)}
                    >
                      {m.name}
                    </Button>
                  ))}
                </div>

                {viewing && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback
                            className={`${viewing.color} text-white text-xs font-semibold`}
                          >
                            {viewing.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        {viewing.name} 的時間表
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Legend
                        items={[
                          { color: "bg-primary", label: "空閒" },
                          {
                            color: "bg-muted border border-border",
                            label: "忙碌",
                          },
                        ]}
                      />
                      <ScheduleGrid
                        availability={viewing.availability}
                        days={days}
                        hours={hours}
                        dayDates={dayDates}
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab 4: Common Availability ── */}
          <TabsContent value="common">
            <TimeDisplaySettings
              includeWeekend={includeWeekend}
              setIncludeWeekend={setIncludeWeekend}
              startHour={startHour}
              setStartHour={setStartHour}
              endHour={endHour}
              setEndHour={setEndHour}
              weekOption={weekOption}
              setWeekOption={setWeekOption}
              dayDates={dayDates}
            />
            <div className="mb-5">
              <h2 className="text-base font-semibold">共同空閒時間</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                所選 {selectedMembers.length} 位成員都空閒的時段
              </p>
            </div>

            {/* 功能二：成員選擇 */}
            <div className="mb-5">
              <p className="text-sm font-medium mb-2">選擇納入計算的成員（點擊切換）</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const selected = selectedMemberIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMemberSelection(m.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selected
                          ? `${m.color} text-white`
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-emerald-400", label: "共同空閒" },
                    { color: "bg-muted border border-border", label: "非共同" },
                  ]}
                />
                {commonSlots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">
                    目前沒有共同空閒時段
                  </p>
                ) : (
                  <ScheduleGrid
                    availability={commonSlots}
                    emerald
                    days={days}
                    hours={hours}
                    dayDates={dayDates}
                  />
                )}
              </CardContent>
            </Card>

            {commonSlots.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {commonSlots.map((s) => {
                  const [d, h] = s.split("-").map(Number);
                  return (
                    <div
                      key={s}
                      className="text-sm px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
                    >
                      {days[d]} {dayDates[d]} {h}:00–{h + 1}:00
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
