import { randomUUID } from "node:crypto";
import gifts from "../../js/gifts.json" with { type: "json" };

function money(value) {
  return Number(value).toFixed(2);
}

function siteBase() {
  return (process.env.URL || process.env.SITE_URL || "").replace(/\/$/, "");
}

function buildOrder(gift, base) {
  const amount = money(gift.price);
  const order = {
    type: "online",
    processing_mode: "manual",
    total_amount: amount,
    external_reference: gift.id,
    description: `Presente de casamento: ${gift.title}`,
    items: [
      {
        title: gift.title,
        unit_price: amount,
        quantity: 1,
      },
    ],
  };

  if (base.startsWith("https://")) {
    const page = `${base}/`;
    order.config = {
      online: {
        success_url: `${page}?pagamento=aprovado`,
        pending_url: `${page}?pagamento=pendente`,
        failure_url: `${page}?pagamento=recusado`,
        auto_return: "approved",
      },
    };
  }

  return order;
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Método não permitido." }, { status: 405 });
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return Response.json(
      { error: "Pagamento indisponível no momento." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const gift = gifts.find((item) => item.id === body?.id);
  if (!gift || !Number.isFinite(gift.price) || gift.price <= 0) {
    return Response.json({ error: "Presente não encontrado." }, { status: 404 });
  }

  const response = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(buildOrder(gift, siteBase())),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.checkout_url !== "string") {
    const detail = {
      status: response.status,
      message: data.message,
      errors: data.errors,
      cause: data.cause,
    };
    console.error("Mercado Pago", JSON.stringify(detail));
    return Response.json(
      { error: "Não foi possível abrir o checkout." },
      { status: 502 }
    );
  }

  return Response.json({ checkout_url: data.checkout_url });
}
