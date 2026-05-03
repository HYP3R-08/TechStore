const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customerEmail, customerName, orderId, trackingUrl } = await req.json();

    const shortId = orderId.slice(0, 8).toUpperCase();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#000000;padding:32px 40px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:300;letter-spacing:1px;">TechStore</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;">Order #${shortId}</p>
              <h1 style="margin:0 0 24px;font-size:28px;font-weight:300;color:#000;letter-spacing:-0.5px;">Your order is on its way!</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#555;line-height:1.6;">
                Hi ${customerName || 'there'},<br/><br/>
                Great news — your order has been shipped and is heading your way.
                You can track your package using the link below.
              </p>

              <!-- Tracking button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#000;border-radius:8px;">
                    <a href="${trackingUrl}" target="_blank"
                      style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;text-decoration:none;letter-spacing:0.5px;">
                      Track your order →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${trackingUrl}" style="color:#000;word-break:break-all;">${trackingUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f5;padding:24px 40px;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
                © 2026 TechStore · This is a demo project
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TechStore <orders@techstore.com>',
        to: [customerEmail],
        subject: `Your order #${shortId} has been shipped!`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
