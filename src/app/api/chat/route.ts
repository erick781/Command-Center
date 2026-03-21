import { streamWithFallback } from '@/lib/ai';

export const maxDuration = 120;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const role =
      'role' in entry && typeof entry.role === 'string' ? entry.role : null;
    const content =
      'content' in entry && typeof entry.content === 'string'
        ? entry.content.trim()
        : null;

    if (!role || !content || (role !== 'user' && role !== 'assistant')) {
      return [];
    }

    return [{ content, role }] as const;
  });
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  if (!body || typeof body !== 'object') {
    return errorResponse('Request body must be an object.', 400);
  }

  const rawMessages = 'messages' in body ? body.messages : undefined;
  const normalizedMessages = normalizeMessages(rawMessages);
  const system =
    'system' in body && typeof body.system === 'string' && body.system.trim()
      ? body.system.trim()
      : 'Tu es un strategiste marketing senior chez Partenaire.io.';

  if (normalizedMessages.length === 0) {
    return errorResponse('At least one user or assistant message is required.', 400);
  }

  return streamWithFallback({
    messages: normalizedMessages,
    purpose: 'chat',
    system,
  });
}
