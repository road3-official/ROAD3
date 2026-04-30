import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./R18Settings.css";

const R18_ENABLED_KEY = "r18Enabled";
const R18_GATE_KEY = "road3_r18_gate_accepted";

export default function R18Settings() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(
    localStorage.getItem(R18_ENABLED_KEY) === "true"
  );

  useEffect(() => {
    localStorage.setItem(R18_ENABLED_KEY, String(enabled));

    if (!enabled) {
      localStorage.removeItem(R18_GATE_KEY);
    }
  }, [enabled]);

  const handleGoR18 = () => {
    if (!enabled) {
      window.alert("先にR18モードをONにしてね");
      return;
    }
    navigate("/open/r18");
  };

  return (
    <div className="r18-settings-page">
      <header className="r18-settings-header">
        <button
          type="button"
          className="r18-settings-backBtn"
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <h1 className="r18-settings-title">R18設定</h1>
      </header>

      <main className="r18-settings-main">
        <section className="r18-settings-card">
          <div className="r18-settings-cardTop">
            <div>
              <div className="r18-settings-label">R18モード</div>
              <div className="r18-settings-sub">
                ONにするとR18空間への導線と投稿機能が表示されます
              </div>
            </div>

            <label className="r18-settings-switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="r18-settings-slider" />
            </label>
          </div>

          <div className="r18-settings-stateRow">
            <span className={`r18-settings-state ${enabled ? "on" : "off"}`}>
              {enabled ? "ON" : "OFF"}
            </span>
          </div>
        </section>

        <section className="r18-settings-card">
          <div className="r18-settings-noteTitle">注意</div>
          <div className="r18-settings-noteList">
            <div>・R18モードをONにすると専用導線が表示されます</div>
            <div>・R18空間に入る際は年齢確認があります</div>
            <div>・OFFにするとR18導線は非表示になります</div>
            <div>・OFFにすると再度入る時に確認が必要になります</div>
          </div>
        </section>

        <button
          type="button"
          className="r18-settings-enterBtn"
          onClick={handleGoR18}
        >
          R18空間へ進む
        </button>
      </main>
    </div>
  );
}