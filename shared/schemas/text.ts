import { z } from 'zod';

// Bounds on text crossing the client/server boundary (T5, T7). Lengths count UTF-16 code
// units, which is what zod measures. The server config may enforce tighter limits (T7).
export const MAX_PARAGRAPH_CHARS = 4000;
export const MAX_HEADING_CHARS = 200;
export const MAX_INSTRUCTION_CHARS = 500;
export const MAX_ANSWER_CHARS = 500;
export const MAX_SECTIONS = 50;
export const MAX_SECTION_CHARS = 4000;
export const MAX_MESSAGE_CHARS = 200;

export const ParagraphSchema = z.string().min(1).max(MAX_PARAGRAPH_CHARS);

// A heading may be empty: text before the first heading is a section with no title.
export const HeadingSchema = z.string().max(MAX_HEADING_CHARS);
