import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { type, to, userName, overduePlans, reminderTime } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    let subject = "";
    let html = "";

    if (type === "journal_reminder") {
      subject = "✍️ Time to write in your journal";
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Daily Journal Reminder</title>
          </head>
          <body style="margin:0;padding:0;background:#faf7f0;font-family:'Georgia',serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e8e0d4;overflow:hidden;max-width:560px;">
                    <!-- Header strip -->
                    <tr>
                      <td style="background:#5c3d2e;padding:16px 28px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <span style="color:#f5f0e8;font-size:16px;font-weight:600;letter-spacing:0.5px;">Rootline</span>
                            </td>
                            <td align="right">
                              <span style="color:rgba(245,240,232,0.6);font-size:12px;font-style:italic;">Daily Reminder</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Red margin line -->
                    <tr>
                      <td style="padding:0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="40" style="background:#faf7f0;border-right:2px solid rgba(192,57,43,0.35);padding:32px 0;">&nbsp;</td>
                            <td style="padding:32px 28px;">
                              <p style="margin:0 0 8px 0;font-size:22px;font-weight:600;color:#2c1810;line-height:1.3;">
                                Hey${userName ? ` ${userName}` : ""}, time to write ✍️
                              </p>
                              <p style="margin:0 0 20px 0;font-size:14px;color:#7a6a5a;line-height:1.6;">
                                You haven't written a journal entry today. Even a few lines can help you reflect, plan, and stay grounded.
                              </p>
                              <p style="margin:0 0 28px 0;font-size:14px;color:#7a6a5a;line-height:1.6;font-style:italic;border-left:3px solid rgba(192,57,43,0.3);padding-left:14px;">
                                "The act of writing is the act of discovering what you believe." — David Hare
                              </p>
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="background:#5c3d2e;border-radius:8px;padding:12px 24px;">
                                    <a href="https://rootline8823.builtwithrocket.new" style="color:#f5f0e8;font-size:14px;font-weight:600;text-decoration:none;display:block;">
                                      Open my journal →
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#faf7f0;border-top:1px solid #e8e0d4;padding:16px 28px;">
                        <p style="margin:0;font-size:11px;color:#a89880;text-align:center;">
                          You're receiving this because you enabled daily journal reminders in Rootline.
                          <br />Reminder set for ${reminderTime || "9:00 PM"}.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;
    } else if (type === "overdue_digest") {
      const plans = overduePlans || [];
      const planRows = plans
        .map(
          (p: { title: string; daysOverdue: number; targetDate: string }) => `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f0ebe2;">
              <span style="font-size:13px;font-weight:600;color:#2c1810;">${p.title}</span>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #f0ebe2;white-space:nowrap;">
              <span style="font-size:12px;color:#7a6a5a;">${p.targetDate || "—"}</span>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #f0ebe2;white-space:nowrap;">
              <span style="font-size:12px;font-weight:700;color:#c0392b;">+${p.daysOverdue}d</span>
            </td>
          </tr>
        `
        )
        .join("");

      subject = `⚠️ ${plans.length} overdue plan${plans.length > 1 ? "s" : ""} need your attention`;
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Overdue Plan Digest</title>
          </head>
          <body style="margin:0;padding:0;background:#faf7f0;font-family:'Georgia',serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e8e0d4;overflow:hidden;max-width:560px;">
                    <!-- Header strip -->
                    <tr>
                      <td style="background:#5c3d2e;padding:16px 28px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <span style="color:#f5f0e8;font-size:16px;font-weight:600;letter-spacing:0.5px;">Rootline</span>
                            </td>
                            <td align="right">
                              <span style="color:rgba(245,240,232,0.6);font-size:12px;font-style:italic;">Plan Digest</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="40" style="background:#faf7f0;border-right:2px solid rgba(192,57,43,0.35);padding:32px 0;">&nbsp;</td>
                            <td style="padding:32px 28px;">
                              <p style="margin:0 0 6px 0;font-size:22px;font-weight:600;color:#2c1810;line-height:1.3;">
                                Your overdue plans
                              </p>
                              <p style="margin:0 0 24px 0;font-size:14px;color:#7a6a5a;line-height:1.6;">
                                ${plans.length} plan${plans.length > 1 ? "s have" : " has"} passed ${plans.length > 1 ? "their" : "its"} target date. Review and update ${plans.length > 1 ? "them" : "it"} to keep your commitments on track.
                              </p>

                              <!-- Plans table -->
                              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e0d4;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                                <thead>
                                  <tr style="background:#faf7f0;">
                                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#7a6a5a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e8e0d4;">Plan</th>
                                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#7a6a5a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e8e0d4;">Target date</th>
                                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#7a6a5a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e8e0d4;">Overdue</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${planRows}
                                </tbody>
                              </table>

                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="background:#5c3d2e;border-radius:8px;padding:12px 24px;">
                                    <a href="https://rootline8823.builtwithrocket.new/plans-dashboard" style="color:#f5f0e8;font-size:14px;font-weight:600;text-decoration:none;display:block;">
                                      Review plans →
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#faf7f0;border-top:1px solid #e8e0d4;padding:16px 28px;">
                        <p style="margin:0;font-size:11px;color:#a89880;text-align:center;">
                          You're receiving this because you enabled plan digest emails in Rootline.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;
    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
