export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 400 };
  }
  if (!payload || payload.form_name !== "recado") return { statusCode: 200 };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RECADO_EMAIL;
  if (!apiKey || !to) {
    console.error("Recado sem aviso: RESEND_API_KEY ou RECADO_EMAIL ausente");
    return { statusCode: 200 };
  }

  const data = payload.data || {};
  const nome = String(data.nome || "Convidado").slice(0, 80);
  const presente = String(data.presente || "").slice(0, 120);
  const mensagem = String(data.mensagem || "").slice(0, 1000);

  const text = [
    `Nome: ${nome}`,
    presente ? `Presente: ${presente}` : "Presente: não informado",
    "",
    mensagem,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Site Giovana e Vitor <onboarding@resend.dev>",
      to: [to],
      subject: `Nova mensagem de ${nome}`,
      text,
    }),
  });

  if (!response.ok) {
    console.error("Resend", response.status, await response.text().catch(() => ""));
  }
  return { statusCode: 200 };
};
