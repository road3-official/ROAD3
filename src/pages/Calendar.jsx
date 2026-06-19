import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Calendar.css";
import PersonalFooterNav from "../components/PersonalFooterNav";

const STORAGE_KEY = "road3_calendar_v1";

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// key を安定させる（例: 2026-03-05）
function makeDateKey(year, monthIndex0, day) {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`;
}

export default function Calendar() {
  const navigate = useNavigate();

  const [events, setEvents] = useState(loadEvents());
  const [currentDate, setCurrentDate] = useState(new Date());

  // ▼ 日付クリックで開く「予定一覧ポップアップ」
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [newText, setNewText] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= lastDate; d++) arr.push(d);
    return arr;
  }, [firstDay, lastDate]);

  const changeMonth = (diff) => {
    setCurrentDate(new Date(year, month + diff, 1));
  };

  const today = new Date();
  const isToday = (day) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  // ====== 予定操作 ======
  const addEvent = (key, text) => {
    const t = text.trim();
    if (!t) return;

    setEvents((prev) => {
      const next = { ...prev };
      next[key] = [...(next[key] || []), t];
      return next;
    });
  };

  const deleteEvent = (key, idx) => {
    setEvents((prev) => {
      const next = { ...prev };
      const arr = [...(next[key] || [])];
      arr.splice(idx, 1);
      if (arr.length === 0) {
        delete next[key];
      } else {
        next[key] = arr;
      }
      return next;
    });
  };

  const editEvent = (key, idx) => {
    const currentText = (events[key] || [])[idx];
    if (currentText == null) return;

    const nextText = window.prompt("予定を編集", currentText);
    if (nextText === null) return; // cancel
    if (nextText.trim() === "") return; // 空は編集しない（削除にしない）

    setEvents((prev) => {
      const next = { ...prev };
      const arr = [...(next[key] || [])];
      arr[idx] = nextText.trim();
      next[key] = arr;
      return next;
    });
  };

  // ====== 日付クリック：ポップアップを開く ======
  const handleDayClick = (day) => {
    const key = makeDateKey(year, month, day);
    setActiveKey(key);
    setNewText("");
    setIsDayModalOpen(true);
  };

  const activeEvents = activeKey ? events[activeKey] || [] : [];

  const closeModal = () => {
    setIsDayModalOpen(false);
    setActiveKey(null);
    setNewText("");
  };

  const handleSubmitNew = () => {
    if (!activeKey) return;
    addEvent(activeKey, newText);
    setNewText("");
  };

  const titleForKey = (key) => {
    if (!key) return "";
    // key: YYYY-MM-DD
    const [yy, mm, dd] = key.split("-");
    return `${yy}/${Number(mm)}/${Number(dd)}`;
  };

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <button onClick={() => navigate("/personal")}>← 戻る</button>

        <h2>
          {year} / {month + 1}
        </h2>

        <div>
          <button onClick={() => changeMonth(-1)}>◀</button>
          <button onClick={() => changeMonth(1)}>▶</button>
        </div>
      </header>

      <div className="calendar-grid">
        {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
          <div key={d} className="calendar-dayHeader">
            {d}
          </div>
        ))}

        {days.map((day, i) => {
          if (!day) return <div key={i} className="calendar-cell empty" />;

          const key = makeDateKey(year, month, day);
          const dayEvents = events[key] || [];

          return (
            <div
              key={i}
              className={`calendar-cell ${isToday(day) ? "today" : ""}`}
              onClick={() => handleDayClick(day)}
            >
              <div className="calendar-date">{day}</div>

              {dayEvents.map((e, idx) => (
                <div
                  key={idx}
                  className="calendar-event"
                  // 予定クリック＝編集（今の仕様のまま）
                  onClick={(ev) => {
                    ev.stopPropagation();
                    editEvent(key, idx);
                  }}
                  // 右クリック＝削除（好きなやつ）
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const ok = confirm("この予定を削除する？");
                    if (ok) deleteEvent(key, idx);
                  }}
                  title="クリックで編集 / 右クリックで削除"
                >
                  {e}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ====== 日付ポップアップ ====== */}
      {isDayModalOpen && (
        <div className="calendar-overlay" onClick={closeModal}>
          <div
            className="calendar-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-modalHead">
              <div className="calendar-modalTitle">
                {titleForKey(activeKey)}
              </div>
              <button className="calendar-modalClose" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="calendar-modalList">
              {activeEvents.length === 0 ? (
                <div className="calendar-modalEmpty">予定はまだありません</div>
              ) : (
                activeEvents.map((e, idx) => (
                  <div key={idx} className="calendar-modalItem">
                    <div className="calendar-modalText">{e}</div>

                    <div className="calendar-modalActions">
                      <button
                        type="button"
                        className="calendar-modalBtn"
                        onClick={() => editEvent(activeKey, idx)}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="calendar-modalBtn danger"
                        onClick={() => {
                          const ok = confirm("この予定を削除する？");
                          if (ok) deleteEvent(activeKey, idx);
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="calendar-modalAdd">
              <input
                className="calendar-modalInput"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="予定を追加…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitNew();
                }}
              />
              <button
                className="calendar-modalAddBtn"
                type="button"
                onClick={handleSubmitNew}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
            <PersonalFooterNav
        onOpenLayer={() => navigate("/personal")}
        onOpenAccount={() => navigate("/personal")}
        notifications={[]}
      />
    </div>
  );
}
