import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./FileList.css";

function formatDateTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${y}/${m}/${d} ${h}:${min}`;
}

function FileList() {
  const navigate = useNavigate();
  const { friendId } = useParams();

  const friends = useMemo(() => {
    return JSON.parse(localStorage.getItem("closedFriends") || "[]");
  }, []);

  const friendInfo =
    friends.find((friend) => String(friend.id) === String(friendId)) || {
      name: "友達",
    };

  const messages = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem("chatMessages") || "{}");
    return stored[friendId] || [];
  }, [friendId]);

  const fileItems = useMemo(() => {
    return messages
      .filter((msg) => msg.type === "file")
      .map((msg) => ({
        id: msg.id,
        text: msg.text || "ファイル",
        fileName: msg.fileName || msg.text || "ファイル",
        fileUrl: msg.fileUrl || "",
        time: msg.timestamp || msg.time || "",
        sender: msg.sender || "",
      }))
      .reverse();
  }, [messages]);

  return (
    <div className="file-list-page">
      <header className="file-list-header">
        <button
          className="file-list-back"
          onClick={() => navigate(-1)}
          aria-label="戻る"
          title="戻る"
        >
          ←
        </button>

        <div className="file-list-header-text">
          <h2>ファイル</h2>
          <p>{friendInfo.name}とのトーク</p>
        </div>
      </header>

      <main className="file-list-content">
        {fileItems.length === 0 ? (
          <div className="file-list-empty">
            <p>まだファイルはありません</p>
          </div>
        ) : (
          <div className="file-list-items">
            {fileItems.map((item) => (
              <div key={item.id} className="file-list-card">
                <div className="file-list-icon">📄</div>

                <div className="file-list-main">
                  <div className="file-list-meta">
                    <span className="file-list-name">{item.fileName}</span>
                    <span className="file-list-time">
                      {formatDateTime(item.time)}
                    </span>
                  </div>

                  <p className="file-list-sender">{item.sender}</p>

                  {item.fileUrl ? (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="file-list-link"
                    >
                      ファイルを開く
                    </a>
                  ) : (
                    <p className="file-list-note">
                      ファイル情報のみ保存されています
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default FileList;