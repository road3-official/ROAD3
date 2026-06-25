import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const CURRENT_ACCOUNT_ID_KEY = "currentAccountId";
const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export default function Login() {
  const navigate = useNavigate();

  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const doLogin = () => {
    const inputHandle = handle.trim().replace(/^@/, "");
    const inputPassword = password.trim();

    if (!inputHandle || !inputPassword) {
      setError("IDとパスワードを入力してね。");
      return;
    }

    const personalAccount =
  safeParse(localStorage.getItem("personalAccount"), null) ||
  safeParse(localStorage.getItem("closedSharedAccount"), null);

    if (!personalAccount) {
      setError("登録情報が見つかりません。先に新規登録してください。");
      return;
    }

    const savedHandle =
     String(personalAccount.handle || localStorage.getItem("road3_login_handle") || "")
      .replace(/^@/, "");

    const savedPassword =
     String(personalAccount.password || localStorage.getItem("road3_user_password") || "");

    if (inputHandle !== savedHandle || inputPassword !== savedPassword) {
      setError("IDまたはパスワードが違います。");
      return;
    }

    const openGroupAccounts = safeParse(
      localStorage.getItem("openGroupAccounts"),
      []
    );

    const firstOpenGroupAccount = Array.isArray(openGroupAccounts)
      ? openGroupAccounts[0]
      : null;

    if (firstOpenGroupAccount?.id) {
      localStorage.setItem(
        CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY,
        String(firstOpenGroupAccount.id)
      );
      localStorage.setItem(
        CURRENT_ACCOUNT_ID_KEY,
        String(firstOpenGroupAccount.id)
      );
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("lastLoginAt", String(Date.now()));

    localStorage.removeItem("currentAccount");
    localStorage.removeItem("currentOpenGroupAccount");
    localStorage.removeItem("accounts");

    navigate("/personal", { replace: true });
  };

  const demoLogin = () => {
    const personalAccount = safeParse(
      localStorage.getItem("personalAccount"),
      null
    );

    if (!personalAccount) {
      setError("デモログイン用の登録情報がありません。先に新規登録してください。");
      return;
    }

    const openGroupAccounts = safeParse(
      localStorage.getItem("openGroupAccounts"),
      []
    );

    const firstOpenGroupAccount = Array.isArray(openGroupAccounts)
      ? openGroupAccounts[0]
      : null;

    if (firstOpenGroupAccount?.id) {
      localStorage.setItem(
        CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY,
        String(firstOpenGroupAccount.id)
      );
      localStorage.setItem(
        CURRENT_ACCOUNT_ID_KEY,
        String(firstOpenGroupAccount.id)
      );
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("lastLoginAt", String(Date.now()));

    navigate("/personal", { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-topcopy">ROAD3はいつでも帰ってこられる場所</p>
        <h1 className="auth-logo">ROAD3</h1>

        <p className="auth-comment">おかえりなさい</p>

        <label className="auth-label">ID</label>
        <input
          className="auth-input"
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value);
            setError("");
          }}
          placeholder="例：road3"
          autoComplete="username"
        />

        <label className="auth-label">パスワード</label>
        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="パスワード"
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") doLogin();
          }}
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-primary" type="button" onClick={doLogin}>
          ログイン
        </button>

        <button className="auth-ghost" type="button" onClick={demoLogin}>
          登録済みアカウントでデモログイン
        </button>

        <button
          className="auth-secondary"
          type="button"
          onClick={() => navigate("/signup")}
        >
          新規登録へ
        </button>

        <button
          className="auth-secondary"
          type="button"
          onClick={() => navigate("/")}
        >
          戻る
        </button>
      </div>
    </div>
  );
}
