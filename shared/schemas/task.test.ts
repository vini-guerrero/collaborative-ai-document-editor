import { describe, expect, it } from 'vitest';
import { AI_TASKS, AiRequestSchema, AiResponseSchemas, AiTaskSchema } from './task';

describe('AiRequestSchema (T5)', () => {
  it('selects the request schema by task', () => {
    const analyze = { task: 'analyze', paragraph: 'Text.' };
    const rewrite = {
      task: 'rewrite',
      paragraph: 'Text.',
      quote: 'Text',
      tone: 'neutral',
      length: 'same',
      instructions: '',
    };
    const restructure = {
      task: 'restructure',
      action: 'merge',
      section: 0,
      sections: [{ heading: 'A', body: 'b' }],
    };
    expect(AiRequestSchema.safeParse(analyze).success).toBe(true);
    expect(AiRequestSchema.safeParse(rewrite).success).toBe(true);
    expect(AiRequestSchema.safeParse(restructure).success).toBe(true);
  });

  it('rejects an unknown task', () => {
    const input: unknown = { task: 'chat', paragraph: 'Text.' };
    expect(AiRequestSchema.safeParse(input).success).toBe(false);
    expect(AiTaskSchema.safeParse('chat').success).toBe(false);
  });

  it('rejects a request whose fields belong to another task', () => {
    const input: unknown = { task: 'analyze', paragraph: 'Text.', tone: 'formal' };
    expect(AiRequestSchema.safeParse(input).success).toBe(false);
  });

  it('has one response schema per task', () => {
    expect(Object.keys(AiResponseSchemas).sort()).toEqual([...AI_TASKS].sort());
  });
});
