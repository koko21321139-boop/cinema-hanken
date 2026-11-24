// README の手順で取得した値に書き換えてください。
// anon key は公開されても問題ない鍵です（データは合言葉でログインしないと読めません）。
window.CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "ここに anon public key",
  LOGIN_EMAIL: "cinema@example.com",   // Supabase に作ったログイン用ユーザーのメール
  MEMBERS: [
    { id: "a", name: "夫" },
    { id: "b", name: "妻" }
  ]
};
