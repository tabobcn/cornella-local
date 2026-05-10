// ==============================================
// SUPABASE EDGE FUNCTION: SEND EMAIL
// ==============================================
// Envía emails usando Resend API
// Deploy: supabase functions deploy send-email
// ==============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const ALLOWED_EMAIL_TYPES = new Set([
  'new_budget_request',
  'budget_response',
  'new_job_application',
  'application_status_change',
  'new_offer_favorite',
]);

const ALLOWED_APP_ORIGINS = new Set([
  'https://cornellalocal.es',
  'https://www.cornellalocal.es',
]);

interface EmailPayload {
  type: 'new_budget_request' | 'budget_response' | 'new_job_application' | 'application_status_change' | 'new_offer_favorite';
  to: string;
  data: any;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));
}

function sanitizeData(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeData(item)]));
  }
  if (typeof value === 'string') return escapeHtml(value);
  return value;
}

function normalizeAppUrl(value: unknown): string {
  try {
    const url = new URL(String(value || 'https://cornellalocal.es'));
    return ALLOWED_APP_ORIGINS.has(url.origin) ? url.origin : 'https://cornellalocal.es';
  } catch {
    return 'https://cornellalocal.es';
  }
}

function isValidEmail(value: unknown): boolean {
  return typeof value === 'string'
    && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Templates de email
const getEmailTemplate = (type: string, data: any) => {
  const baseStyle = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
      .container { max-width: 600px; margin: 0 auto; background-color: white; }
      .header { background: linear-gradient(135deg, #567ac7 0%, #405b94 100%); color: white; padding: 40px 20px; text-align: center; }
      .content { padding: 40px 20px; }
      .button { display: inline-block; background-color: #567ac7; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 20px 0; }
      .footer { background-color: #f9f9f9; padding: 30px 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e5e5e5; }
      .badge { display: inline-block; background-color: #f0f4ff; color: #567ac7; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    </style>
  `;

  const templates = {
    new_budget_request: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">💼 Nueva Solicitud de Presupuesto</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">¡Hola <strong>${data.business_name}</strong>!</p>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Has recibido una nueva solicitud de presupuesto en <strong>CornellaLocal</strong>.
          </p>

          <div style="background-color: #f9fafb; border-left: 4px solid #567ac7; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">CATEGORÍA</p>
            <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: bold; color: #333;">${data.category}</p>

            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">DESCRIPCIÓN</p>
            <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.5;">${data.description}</p>
          </div>

          ${data.urgency ? `<p><span class="badge">⚡ ${data.urgency === 'urgent' ? 'URGENTE' : 'NORMAL'}</span></p>` : ''}

          <a href="${data.app_url}/incoming-budget-requests" class="button">
            Ver Solicitud Completa
          </a>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Responde rápido para aumentar tus posibilidades de conseguir el trabajo.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>CornellaLocal</strong> - Tu comercio local conectado
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Cornellà de Llobregat, Barcelona
          </p>
        </div>
      </div>
    `,

    budget_response: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">📋 Respuesta a tu Solicitud</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">¡Buenas noticias!</p>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            <strong>${data.business_name}</strong> ha respondido a tu solicitud de presupuesto en <strong>CornellaLocal</strong>.
          </p>

          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px; font-weight: bold;">PRESUPUESTO ESTIMADO</p>
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #0c4a6e;">${data.estimated_price}€</p>
          </div>

          ${data.notes ? `
            <div style="background-color: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">NOTAS DEL PROFESIONAL</p>
              <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.5;">${data.notes}</p>
            </div>
          ` : ''}

          <a href="${data.app_url}/budget-request" class="button">
            Ver Respuesta Completa
          </a>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Puedes contactar directamente con el profesional para más detalles.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>CornellaLocal</strong> - Tu comercio local conectado
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Cornellà de Llobregat, Barcelona
          </p>
        </div>
      </div>
    `,

    new_job_application: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">👤 Nueva Candidatura</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">¡Hola <strong>${data.business_name}</strong>!</p>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Has recibido una nueva candidatura para tu oferta de empleo en <strong>CornellaLocal</strong>.
          </p>

          <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">PUESTO</p>
            <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: bold; color: #333;">${data.job_title}</p>

            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">CANDIDATO</p>
            <p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #333;">${data.candidate_name}</p>
            <p style="margin: 0; color: #666; font-size: 14px;">
              📧 ${data.candidate_email} | 📱 ${data.candidate_phone}
            </p>
          </div>

          ${data.message ? `
            <div style="background-color: #fffbeb; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: bold;">MENSAJE DEL CANDIDATO</p>
              <p style="margin: 0; font-size: 16px; color: #78350f; line-height: 1.5;">${data.message}</p>
            </div>
          ` : ''}

          <a href="${data.app_url}/business-candidates" class="button">
            Ver Candidatura Completa
          </a>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Revisa el perfil y contacta al candidato para programar una entrevista.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>CornellaLocal</strong> - Tu comercio local conectado
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Cornellà de Llobregat, Barcelona
          </p>
        </div>
      </div>
    `,

    application_status_change: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">
            ${data.status === 'hired' ? '🎉 ¡Felicidades!' : '📢 Actualización de tu Candidatura'}
          </h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Hola <strong>${data.candidate_name}</strong>,</p>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Tu candidatura para <strong>${data.job_title}</strong> en <strong>${data.business_name}</strong> ha sido actualizada.
          </p>

          <div style="background-color: ${
            data.status === 'hired' ? '#f0fdf4' :
            data.status === 'shortlisted' ? '#eff6ff' :
            data.status === 'reviewed' ? '#fefce8' : '#fef2f2'
          }; padding: 30px; margin: 20px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">NUEVO ESTADO</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${
              data.status === 'hired' ? '#16a34a' :
              data.status === 'shortlisted' ? '#2563eb' :
              data.status === 'reviewed' ? '#ca8a04' : '#dc2626'
            };">
              ${
                data.status === 'hired' ? '✅ CONTRATADO' :
                data.status === 'shortlisted' ? '📋 PRESELECCIONADO PARA ENTREVISTA' :
                data.status === 'reviewed' ? '👀 EN REVISIÓN' : '❌ NO SELECCIONADO'
              }
            </p>
          </div>

          ${data.status === 'hired' ? `
            <p style="font-size: 16px; color: #333; line-height: 1.6; background-color: #fef3c7; padding: 15px; border-radius: 8px;">
              🎊 <strong>¡Enhorabuena!</strong> La empresa se pondrá en contacto contigo pronto para los siguientes pasos.
            </p>
          ` : ''}

          ${data.status === 'shortlisted' ? `
            <p style="font-size: 16px; color: #333; line-height: 1.6; background-color: #dbeafe; padding: 15px; border-radius: 8px;">
              📅 <strong>¡Gran noticia!</strong> Has sido preseleccionado. La empresa te contactará para programar una entrevista.
            </p>
          ` : ''}

          ${data.interview_date ? `
            <div style="background-color: #f0f9ff; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px; font-weight: bold;">FECHA DE ENTREVISTA</p>
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0c4a6e;">${new Date(data.interview_date).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
            </div>
          ` : ''}

          <a href="${data.app_url}/profile" class="button">
            Ver Mis Candidaturas
          </a>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>CornellaLocal</strong> - Tu comercio local conectado
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Cornellà de Llobregat, Barcelona
          </p>
        </div>
      </div>
    `,

    new_offer_favorite: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">❤️ Nueva Oferta de tu Favorito</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">¡Hola!</p>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            <strong>${data.business_name}</strong>, uno de tus negocios favoritos, acaba de publicar ${data.type === 'job' ? 'una oferta de empleo' : 'una nueva oferta'}.
          </p>

          <div style="background-color: #f9fafb; border-left: 4px solid #ec4899; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 15px 0; font-size: 20px; font-weight: bold; color: #333;">${data.title}</p>

            ${data.discount ? `
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #ec4899;">
                ${data.discount}
              </p>
            ` : ''}

            ${data.description ? `
              <p style="margin: 15px 0 0 0; color: #666; font-size: 14px; line-height: 1.5;">
                ${data.description}
              </p>
            ` : ''}
          </div>

          <a href="${data.app_url}/${data.type === 'job' ? 'job-detail' : 'coupon'}?id=${data.item_id}" class="button">
            ${data.type === 'job' ? 'Ver Oferta de Empleo' : 'Ver Oferta'}
          </a>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ¿No quieres recibir estos emails? Puedes gestionar tus notificaciones en tu perfil.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>CornellaLocal</strong> - Tu comercio local conectado
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Cornellà de Llobregat, Barcelona
          </p>
        </div>
      </div>
    `,
  };

  return templates[type] || templates.new_budget_request;
};

const getEmailSubject = (type: string, data: any) => {
  const subjects = {
    new_budget_request: `💼 Nueva solicitud de presupuesto - CornellaLocal`,
    budget_response: `📋 Respuesta a tu presupuesto de ${data.business_name}`,
    new_job_application: `👤 Nueva candidatura para ${data.job_title}`,
    application_status_change:
      data.status === 'hired' ? `🎉 ¡Felicidades! Has sido contratado` :
      data.status === 'shortlisted' ? `📋 Preseleccionado para entrevista - ${data.job_title}` :
      `📢 Actualización de tu candidatura - ${data.job_title}`,
    new_offer_favorite: `❤️ ${data.business_name} tiene ${data.type === 'job' ? 'un empleo' : 'una oferta'} para ti`,
  };

  return subjects[type] || 'Notificación de CornellaLocal';
};

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!SUPABASE_SERVICE_KEY || bearer !== SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parsear payload
    const payload: EmailPayload = await req.json();
    const { type, to } = payload;
    const data = sanitizeData(payload.data || {});
    data.app_url = normalizeAppUrl(payload.data?.app_url);

    console.log(`[SEND-EMAIL] Sending ${type} to ${to}`);

    // Validar
    if (!isValidEmail(to) || !ALLOWED_EMAIL_TYPES.has(type)) {
      return new Response(JSON.stringify({ error: 'Invalid email payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      console.error('[SEND-EMAIL] RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Preparar email
    const subject = getEmailSubject(type, data);
    const html = getEmailTemplate(type, data);

    // Enviar email con Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'CornellaLocal <noreply@cornellalocal.es>', // Cambiar cuando tengas dominio verificado
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[SEND-EMAIL] Resend API error:', resendData);
      return new Response(JSON.stringify({
        error: 'Failed to send email'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[SEND-EMAIL] Email sent successfully:`, resendData);

    return new Response(JSON.stringify({
      success: true,
      emailId: resendData.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SEND-EMAIL] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
