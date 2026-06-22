import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();

  const [agreed, setAgreed] = useState(false);

  const handleAgree = () => {
    localStorage.setItem("road3_terms_accepted", "true");
    setAgreed(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">利用規約</h2>

        <div className="terms-box">
          <h3>ROAD3利用規約</h3>

          <p>
            ROAD3は、ユーザー同士が交流し、
            情報発信やコミュニケーションを行うためのSNSサービスです。
          </p>

          <p>
            他者への誹謗中傷、なりすまし、
            スパム行為などは禁止します。
          </p>

          <p>
            ROAD3にはR18専用スペースがあります。
            ROAD3 for R18については18歳未満の方の利用を禁止します。
          </p>

          <p>
            運営は必要に応じて規約を変更することがあります。
          </p>

          <h3>プライバシーポリシー</h3>

          <p>
            ROAD3はサービス提供に必要な範囲で利用者情報を取得します。
          </p>

          <p>
            取得した情報は、
            アカウント管理、
            サービス提供、
            不正利用対策、
            お問い合わせ対応に利用します。
          </p>

          <p>
            法令に基づく場合を除き、
            第三者へ販売・提供することはありません。
          </p>
        </div>

        {!agreed ? (
          <button
            className="auth-primary"
            type="button"
            onClick={handleAgree}
          >
            利用規約に同意する
          </button>
        ) : (
          <button
            className="auth-primary"
            type="button"
            onClick={() => navigate("/login")}
          >
            登録へ進む
          </button>
        )}

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
