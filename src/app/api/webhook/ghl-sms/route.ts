import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[GHL-SMS-WEBHOOK]", JSON.stringify(body).substring(0, 500));

    const message = (body.message || body.body || body.text || "").trim();

    if (message === "1") {
      await sendGhlSms("Compris! Implementation lancee. SMS quand c'est fait.");
      await fetch("http://127.0.0.1:8080/api/ruflo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type: "implement_finding", context: { approved: true } }),
      }).catch(() => {});
    } else if (message === "2") {
      await sendGhlSms("Note - on garde ca pour plus tard.");
    } else if (message === "3") {
      await sendGhlSms("Ignore.");
    }

    return NextResponse.json({ received: true, choice: message });
  } catch (e) {
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}

async function sendGhlSms(text: string) {
  const apiKey = process.env.GHL_API_KEY || "";
  const contactId = process.env.GHL_CONTACT_ID || "";
  if (!apiKey || !contactId) return;
  await fetch("https://services.leadconnectorhq.com/conversations/messages", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, Version: "2021-07-28", "Content-Type": "application/json" },
    body: JSON.stringify({ type: "SMS", contactId, message: text }),
  }).catch(() => {});
}
