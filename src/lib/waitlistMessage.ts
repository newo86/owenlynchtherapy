// The waiting-list message Owen sends from the dashboard ("Email the waiting
// list"). Shared by the browser (editing and preview) and the server
// (rendering), so it must stay free of server-only imports.
//
// The message is plain text. Two placeholders:
//   [first name]  replaced with each person's first name
//   [buttons]     where the "Yes, keep me on the list" / "No, please take me
//                 off" buttons go. Without it, no buttons are added.

export const DEFAULT_WAITLIST_SUBJECT = 'Are you still looking for therapy?';

export const DEFAULT_WAITLIST_MESSAGE = `Hi [first name],

You added your name to my waiting list a while ago, and I wanted to say thank you for your patience.

I'm getting in touch to check whether you're still looking for therapy. Things change, and it's completely fine if you've found support elsewhere or don't need it any more. Just let me know either way by tapping one of the buttons below.

[buttons]

If you'd like to stay on the list, I'll be in touch as soon as a space opens up. If I don't hear back, I'll keep you on it for now.

If things feel very hard in the meantime, please don't wait for a space with me. You can call Samaritans any time, free, on 116 123, or talk to your GP.

Best wishes,
Owen`;

export const MAX_SUBJECT = 150;
export const MAX_MESSAGE = 5000;

export type MessageBlock = { kind: 'text'; lines: string[] } | { kind: 'buttons' };

/** Split the message into paragraphs (blank-line separated), with the
 *  [buttons] marker as its own block. [first name] is filled in. Returns
 *  plain text: the caller escapes it for HTML. */
export function messageBlocks(message: string, firstName: string): MessageBlock[] {
  const name = firstName.trim() || 'there';
  const blocks: MessageBlock[] = [];
  for (const para of message.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const text = para.trim();
    if (!text) continue;
    if (/^\[buttons\]$/i.test(text)) { blocks.push({ kind: 'buttons' }); continue; }
    blocks.push({ kind: 'text', lines: text.replace(/\[first name\]/gi, name).split('\n') });
  }
  return blocks;
}

export function hasButtons(message: string): boolean {
  return /(^|\n)\s*\[buttons\]\s*(\n|$)/i.test(message);
}
