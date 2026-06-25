import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();

  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAgree = () => {
    localStorage.setItem("road3_terms_accepted", "true");
    setAgreed(true);
  };

  const handleSignup = () => {
    const trimmedName = name.trim();
    const trimmedHandle = handle.trim().replace(/^@/, "");
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedHandle || !trimmedPassword) {
      setError("名前、ID、パスワードを入力してね。");
      return;
    }

    const newAccount = {
      id: "personal-main",
      type: "personal_shared",
      name: trimmedName,
      handle: trimmedHandle,
      avatarImage: null,
      password: trimmedPassword,
      createdAt: Date.now(),
    };

    const openGroupAccount = {
      id: "og-1",
      type: "open_group",
      name: trimmedName,
      handle: trimmedHandle,
      avatarImage: null,
    };

    localStorage.setItem("personalAccount", JSON.stringify(newAccount));
    localStorage.setItem("closedSharedAccount", JSON.stringify(newAccount));
    localStorage.setItem("openGroupAccounts", JSON.stringify([openGroupAccount]));
    localStorage.setItem("currentOpenGroupAccountId", "og-1");
    localStorage.setItem("currentAccountId", "og-1");
    localStorage.setItem("road3_login_handle", trimmedHandle);
    localStorage.setItem("road3_user_password", trimmedPassword);
    localStorage.setItem("isLoggedIn", "true");

    navigate("/personal", { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {!agreed ? (
          <>
            <h2 className="auth-title">利用規約</h2>

            <div className="terms-box">
              <h3>ROAD3利用規約</h3>
              <p>ROAD3は、ユーザー同士が交流し、情報発信やコミュニケーションを行うためのSNSサービスです。</p>
              <p>他者への誹謗中傷、なりすまし、スパム行為などは禁止します。</p>
              <p>ROAD3にはR18専用スペースがあります。ROAD3 for R18については18歳未満の方の利用を禁止します。</p>
              <p>運営は必要に応じて規約を変更することがあります。</p>

              <h3>プライバシーポリシー</h3>
              <p>ROAD3はサービス提供に必要な範囲で利用者情報を取得します。</p>
              <p>取得した情報は、アカウント管理、サービス提供、不正利用対策、お問い合わせ対応に利用します。</p>
              <p>法令に基づく場合を除き、第三者へ販売・提供することはありません。</p>
            </div>

            <button className="auth-primary" type="button" onClick={handleAgree}>
              利用規約に同意する
            </button>
          </>
        ) : (
          <>
            <h2 className="auth-title">新規登録</h2>
            <p className="auth-help">ROAD3で使う名前とIDを設定してください。</p>

            <label className="auth-label">名前</label>
            <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ROAD3" />

            <label className="auth-label">ID</label>
            <input className="auth-input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="例：road3" />

            <label className="auth-label">パスワード</label>
            <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="パスワード" />

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-primary" type="button" onClick={handleSignup}>
              登録してはじめる
            </button>

            <button className="auth-ghost" type="button" onClick={() => navigate("/login")}>
              すでに登録済みの方はこちら
            </button>
          </>
        )}

        <button className="auth-secondary" type="button" onClick={() => navigate("/")}>
          戻る
        </button>
      </div>
    </div>
  );
}
