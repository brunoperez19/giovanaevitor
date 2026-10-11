const { randomUUID } = require("node:crypto");
const gifts = require("../js/gifts.json");

function money(value) {
  return Number(value).toFixed(2);
}

function siteBase() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) return "";
  return `https://${String(host).replace(/^https?:\/\//, "")}`;
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
        unit_measure: "unit",
        total_amount: amount,
      },
    ],
  };

  if (base.startsWith("https://")) {
    const page = `${base}/site.html`;
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

function readId(body) {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      return JSON.parse(body).id;
    } catch {
      return "";
    }
  }
  return body.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    res.status(503).json({ error: "Pagamento indisponível no momento." });
    return;
  }

  const gift = gifts.find((item) => item.id === readId(req.body));
  if (!gift || !Number.isFinite(gift.price) || gift.price <= 0) {
    res.status(404).json({ error: "Presente não encontrado." });
    return;
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
    console.error("Mercado Pago", response.status);
    res.status(502).json({ error: "Não foi possível abrir o checkout." });
    return;
  }

  res.status(200).json({ checkout_url: data.checkout_url });
};

module.exports.buildOrder = buildOrder;
module.exports.siteBase = siteBase;
