import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateIntakePDF } from '@/lib/generateIntakePDF';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('download-pdf', ip, 20, 60 * 60 * 1000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const submissionId = req.nextUrl.searchParams.get('submission_id');
  if (!submissionId) {
    return new Response(JSON.stringify({ error: 'submission_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('intake_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error || !data) {
    console.error('[download-pdf] Supabase error:', JSON.stringify(error, null, 2));
    return new Response(JSON.stringify({ error: 'Submission not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('[download-pdf] generating PDF for:', data.full_name, '| submitted_at:', data.submitted_at);

  try {
    const pdfBuffer = await generateIntakePDF(data);
    const name = (data.full_name as string).replace(/\s+/g, '-').toLowerCase();
    const date = new Date(data.submitted_at as string).toISOString().split('T')[0];
    const filename = `intake-${name}-${date}.pdf`;

    console.log('[download-pdf] PDF generated, size:', pdfBuffer.length, 'bytes');

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch (err) {
    console.error('[download-pdf] PDF generation error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
