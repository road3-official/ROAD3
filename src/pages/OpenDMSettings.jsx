import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./OpenDMSettings.css";

function OpenDMSettings() {
  const navigate = useNavigate();
  const [receiveSetting, setReceiveSetting] = useState("followers");

  useEffect(() => {
    const saved = localStorage.getItem("dmReceiveSetting");
    if (saved) {
      setReceiveSetting(saved);
    }
  }, []);

  const handleChangeSetting = (value) => {
    setReceiveSetting(value);
    localStorage.setItem("dmReceiveSetting", value);
  };

  const handleMarkAllRead = () => {
    const savedChats = JSON.parse(localStorage.getItem("dmChats") || "[]");

    const updatedChats = savedChats.map((chat) => ({
      ...chat,
      unread: 0,
      messages: (chat.messages || []).map((msg) =>
        msg.sender === "me"
          ? { ...msg, isRead: true }
          : msg
      ),
    }));

    localStorage.setItem("dmChats", JSON.stringify(updatedChats));
    alert("すべて既読にしました");
  };

  return (
    <div className="dmsettings-page">
      <div className="dmsettings-header">
        <button type="button" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2>DM設定</h2>
        <div className="dmsettings-header-space"></div>
      </div>

      <div className="dmsettings-section">
        <h3>受け取り設定</h3>

        <button
          type="button"
          className={`dmsettings-item ${
            receiveSetting === "everyone" ? "active" : ""
          }`}
          onClick={() => handleChangeSetting("everyone")}
        >
          全員から受け取る
        </button>

        <button
          type="button"
          className={`dmsettings-item ${
            receiveSetting === "followers" ? "active" : ""
          }`}
          onClick={() => handleChangeSetting("followers")}
        >
          フォロワーから受け取る
        </button>

        <button
          type="button"
          className={`dmsettings-item ${
            receiveSetting === "mutual" ? "active" : ""
          }`}
          onClick={() => handleChangeSetting("mutual")}
        >
          相互フォローのみ
        </button>
      </div>

      <div className="dmsettings-section">
        <h3>その他</h3>

        <button
          type="button"
          className="dmsettings-item"
          onClick={handleMarkAllRead}
        >
          すべて既読にする
        </button>
      </div>
    </div>
  );
}

export default OpenDMSettings;