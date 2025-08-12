// src/bot/index.ts
import { intents } from './intents';
import type { BotResponse } from './types';

export async function responder(input: string): Promise<BotResponse> {
  const inputLower = input.toLowerCase();

  for (const intent of intents) {
    if (intent.patterns.some(p => inputLower.includes(p))) {
      return await intent.handler(input);
    }
  }

  return {
    type: 'text',
    text: 'Desculpe, não entendi sua solicitação. Por favor, tente novamente.',
  };
}