import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';

type Purpose = 'chat' | 'recommendations';
type ProviderName = 'anthropic' | 'openrouter';
type ModelInstance = Parameters<typeof streamText>[0]['model'];
type Message = NonNullable<Parameters<typeof streamText>[0]['messages']>[number];

type ProviderCandidate = {
  createModel: () => ModelInstance;
  modelId: string;
  provider: ProviderName;
};

type StreamWithFallbackOptions = {
  messages: Message[];
  purpose: Purpose;
  system: string;
};

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_OPENROUTER_CHAT_MODEL = 'openrouter/auto';
const DEFAULT_OPENROUTER_RECOMMENDATIONS_MODEL = 'openrouter/auto';

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getProviderOrder(): ProviderName[] {
  const parsed = (getEnv('AI_PROVIDER_ORDER') ?? 'anthropic,openrouter')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ProviderName => {
      return value === 'anthropic' || value === 'openrouter';
    });

  return parsed.length > 0 ? parsed : ['anthropic', 'openrouter'];
}

function getOpenRouterProvider() {
  const apiKey = getEnv('OPENROUTER_API_KEY');
  if (!apiKey) {
    return null;
  }

  return createOpenAICompatible({
    apiKey,
    baseURL: getEnv('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer':
        getEnv('OPENROUTER_SITE_URL') ?? 'https://app.partenaire.io',
      'X-OpenRouter-Title': getEnv('OPENROUTER_APP_NAME') ?? 'Partenaire.io',
    },
    name: 'openrouter',
  });
}

function getCandidates(purpose: Purpose): ProviderCandidate[] {
  const openrouter = getOpenRouterProvider();
  const candidatesByProvider: Record<ProviderName, ProviderCandidate | null> = {
    anthropic: getEnv('ANTHROPIC_API_KEY')
      ? {
          createModel: () =>
            anthropic(
              getEnv('ANTHROPIC_MODEL') ??
                getEnv('ANTHROPIC_CHAT_MODEL') ??
                DEFAULT_ANTHROPIC_MODEL,
            ),
          modelId:
            getEnv('ANTHROPIC_MODEL') ??
            getEnv('ANTHROPIC_CHAT_MODEL') ??
            DEFAULT_ANTHROPIC_MODEL,
          provider: 'anthropic',
        }
      : null,
    openrouter: openrouter
      ? {
          createModel: () =>
            openrouter.chatModel(
              purpose === 'recommendations'
                ? getEnv('OPENROUTER_RECOMMENDATIONS_MODEL') ??
                    DEFAULT_OPENROUTER_RECOMMENDATIONS_MODEL
                : getEnv('OPENROUTER_CHAT_MODEL') ??
                    DEFAULT_OPENROUTER_CHAT_MODEL,
            ) as ModelInstance,
          modelId:
            purpose === 'recommendations'
              ? getEnv('OPENROUTER_RECOMMENDATIONS_MODEL') ??
                DEFAULT_OPENROUTER_RECOMMENDATIONS_MODEL
              : getEnv('OPENROUTER_CHAT_MODEL') ?? DEFAULT_OPENROUTER_CHAT_MODEL,
          provider: 'openrouter',
        }
      : null,
  };

  return getProviderOrder()
    .map((provider) => candidatesByProvider[provider])
    .filter((candidate): candidate is ProviderCandidate => candidate !== null);
}

async function* streamFromIterator(
  firstChunk: Awaited<ReturnType<AsyncIterator<string>['next']>>,
  iterator: AsyncIterator<string>,
) {
  if (!firstChunk.done) {
    yield firstChunk.value;
  }

  while (true) {
    const nextChunk = await iterator.next();
    if (nextChunk.done) {
      return;
    }

    yield nextChunk.value;
  }
}

function unavailableResponse() {
  return new Response(
    "L'assistant est temporairement indisponible. Reessayez dans quelques instants.",
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
      status: 503,
    },
  );
}

export async function streamWithFallback({
  messages,
  purpose,
  system,
}: StreamWithFallbackOptions) {
  const candidates = getCandidates(purpose);
  if (candidates.length === 0) {
    console.error('[ai] No configured providers are available.');
    return unavailableResponse();
  }

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const result = streamText({
        maxRetries: 0,
        messages,
        model: candidate.createModel(),
        system,
      });

      const iterator = result.textStream[Symbol.asyncIterator]();
      const firstChunk = await iterator.next();
      if (firstChunk.done) {
        throw new Error(
          `Provider ended the stream before yielding text: ${candidate.provider}:${candidate.modelId}`,
        );
      }
      const encoder = new TextEncoder();

      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamFromIterator(firstChunk, iterator)) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            } catch (error) {
              console.error(
                `[ai] ${candidate.provider}:${candidate.modelId} stream failed after it started.`,
                error,
              );
              controller.error(error);
            }
          },
        }),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-AI-Model': candidate.modelId,
            'X-AI-Provider': candidate.provider,
          },
        },
      );
    } catch (error) {
      lastError = error;
      console.error(
        `[ai] ${candidate.provider}:${candidate.modelId} failed before streaming.`,
        error,
      );
    }
  }

  console.error('[ai] All providers failed.', lastError);
  return unavailableResponse();
}
