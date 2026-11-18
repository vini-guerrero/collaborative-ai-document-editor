import { Extension } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { z } from 'zod';
import { RestructureOperationSchema, type RestructureOperation } from '@shared/schemas/restructure';
import { landingSectionIndex } from './landing';
import { bodyBlocksOf, docSections, type DocBlock } from './docSections';
import './restructure.css';

export const restructureKey = new PluginKey<RestructureOperation | null>('aiRestructure');

// Plugin meta arrives as unknown; only the shapes written below are accepted.
const RestructureMetaSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('set'), operation: RestructureOperationSchema }).strict(),
  z.object({ type: z.literal('clear') }).strict(),
]);

const TARGET_CLASS = 'restructure-target';
const GHOST_CLASS = 'restructure-ghost';

// D11: the preview is decorations only. Accent bar (target) at the new place, dashed ghost at the
// old place; the text is never changed before Accept (T3). Indexes that the document does not have
// draw nothing; Accept reports them.
export function restructureDecorations(doc: Node, operation: RestructureOperation): DecorationSet {
  const sections = docSections(doc);
  const section = (index: number): readonly DocBlock[] => sections[index] ?? [];
  const decorated = decorationsFor(operation, sections, section);
  return DecorationSet.create(doc, decorated.flatMap(decorate));
}

interface Marked {
  readonly block: DocBlock | undefined;
  readonly className: string;
}

function decorationsFor(
  operation: RestructureOperation,
  sections: DocBlock[][],
  section: (index: number) => readonly DocBlock[],
): Marked[] {
  switch (operation.op) {
    case 'move': {
      const landing = landingSectionIndex(sections.length, operation.from, operation.to);
      const target = landing === null ? sections.flat().at(-1) : section(landing)[0];
      return [...ghosts(section(operation.from)), { block: target, className: TARGET_CLASS }];
    }
    case 'split': {
      const body = bodyBlocksOf(section(operation.section));
      const cut = body[operation.atParagraph];
      return [
        ...ghosts(body.slice(operation.atParagraph)),
        { block: cut, className: TARGET_CLASS },
      ];
    }
    case 'merge':
      return [
        ...ghosts(section(operation.second)),
        { block: section(operation.first)[0], className: TARGET_CLASS },
      ];
  }
}

function ghosts(blocks: readonly DocBlock[]): Marked[] {
  return blocks.map((block) => ({ block, className: GHOST_CLASS }));
}

function decorate({ block, className }: Marked): Decoration[] {
  if (block === undefined) return [];
  return [Decoration.node(block.pos, block.pos + block.node.nodeSize, { class: className })];
}

// Preview state: at most one pending operation (D11). Any document change makes it stale (D11).
export function createRestructurePreviewProseMirrorPlugin(): Plugin<RestructureOperation | null> {
  return new Plugin<RestructureOperation | null>({
    key: restructureKey,
    state: {
      init: () => null,
      apply: (tr: Transaction, value: RestructureOperation | null): RestructureOperation | null => {
        const meta = RestructureMetaSchema.safeParse(tr.getMeta(restructureKey));
        if (meta.success) {
          return meta.data.type === 'set' ? meta.data.operation : null;
        }
        return tr.docChanged ? null : value;
      },
    },
    props: {
      decorations: (state: EditorState): DecorationSet | null => {
        const operation = restructureKey.getState(state) ?? null;
        return operation === null ? null : restructureDecorations(state.doc, operation);
      },
    },
  });
}

// TipTap wrapper. Not registered in markdown/extensions.ts; EditorSurface wires it later.
export function createRestructurePreviewExtension(): Extension {
  return Extension.create({
    name: 'aiRestructure',
    addProseMirrorPlugins() {
      return [createRestructurePreviewProseMirrorPlugin()];
    },
  });
}

// Preview changes are not undo steps (D17): only Accept is.
export function setRestructureMeta(tr: Transaction, operation: RestructureOperation): Transaction {
  return tr.setMeta(restructureKey, { type: 'set', operation }).setMeta('addToHistory', false);
}

export function clearRestructureMeta(tr: Transaction): Transaction {
  return tr.setMeta(restructureKey, { type: 'clear' }).setMeta('addToHistory', false);
}

export function getRestructurePreview(state: EditorState): RestructureOperation | null {
  return restructureKey.getState(state) ?? null;
}
