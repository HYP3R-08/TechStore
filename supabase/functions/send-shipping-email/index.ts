/**
 * Sends the "your order has shipped" email. Admin only.
 *
 * The caller has to be an admin, and every value in the email is read from the
 * order itself — the request body only says *which* order.
 *
 * Both rules matter here. Supabase's built-in JWT check is satisfied by the anon
 * key, which ships in the public browser bundle, so "the JWT is valid" is not an
 * authorization decision. And an endpoint that takes a recipient and a link from
 * its caller is a phishing relay wearing our own domain.
 */
import { preflight, json, fail } from '../_shared/cors.ts';
import { adminClient, getCaller, isAdmin } from '../_shared/auth.ts';

// Resend only sends from a domain you have verified with them. The default here
// is their test sender, which works out of the box; point EMAIL_FROM at a
// verified domain once there is one.
const FROM = Deno.env.get('EMAIL_FROM') ?? 'TechStore <onboarding@resend.dev>';

/** Anything interpolated into the template is untrusted until it goes through here. */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

/**
 * The tracking URL ends up inside an href. Without a scheme check, `javascript:`
 * and `data:` are perfectly valid URLs and would ship inside our own template.
 */
function safeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function template(customerName: string, shortId: string, trackingUrl: string): string {
  const name = escapeHtml(customerName);
  const href = escapeHtml(trackingUrl);
  return `<!DOCTYPE html>
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
          <tr>
            <td style="background:#000000;padding:32px 40px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:300;letter-spacing:1px;">TechStore</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;">Order #${shortId}</p>
              <h1 style="margin:0 0 24px;font-size:28px;font-weight:300;color:#000;letter-spacing:-0.5px;">Your order is on its way!</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#555;line-height:1.6;">
                Hi ${name},<br/><br/>
                Great news — your order has been shipped and is heading your way.
                You can track your package using the link below.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#000;border-radius:8px;">
                    <a href="${href}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;text-decoration:none;letter-spacing:0.5px;">
                      Track your order →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${href}" style="color:#000;word-break:break-all;">${href}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5f5f5;padding:24px 40px;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
                TechStore · This is a demo project
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const caller = await getCaller(req);
  if (!caller) return fail(req, 'Unauthorized', 401);
  if (!(await isAdmin(caller.id))) return fail(req, 'Forbidden', 403);

  const body = await req.json().catch(() => null);
  const orderId = body?.orderId;
  if (typeof orderId !== 'string' || !orderId) {
    return fail(req, 'orderId is required', 400);
  }

  const db = adminClient();

  const { data: order, error } = await db
    .from('orders')
    .select('id, tracking_url, shipping_address, profiles:user_id (email, full_name)')
    .eq('id', orderId)
    .single();

  if (error || !order) return fail(req, 'Order not found', 404, error);

  const shipping = order.shipping_address as { name?: string; email?: string } | null;
  const profile = order.profiles as unknown as { email?: string; full_name?: string } | null;

  const recipient = shipping?.email ?? profile?.email;
  if (!recipient) return fail(req, 'This order has no email address to send to', 422);

  if (!order.tracking_url) {
    return fail(req, 'Set a tracking URL on the order before sending', 422);
  }

  const trackingUrl = safeUrl(order.tracking_url);
  if (!trackingUrl) return fail(req, 'The tracking URL is not a valid http(s) link', 422);

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return fail(req, 'Email is not configured', 500, 'RESEND_API_KEY is missing');

  const shortId = order.id.slice(0, 8).toUpperCase();
  const customerName = shipping?.name ?? profile?.full_name ?? 'there';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [recipient],
      subject: `Your order #${shortId} has been shipped!`,
      html: template(customerName, shortId, trackingUrl),
    }),
  });

  if (!response.ok) {
    return fail(req, 'The email provider rejected the message', 502, await response.text());
  }

  return json(req, { ok: true });
});
