/* Icons from the approved design (design/pinboard8-source/p7-kit.js IC), one stroke style throughout. */
const PATHS = {
 "today": "<circle cx=\"12\" cy=\"12\" r=\"4.5\"/><path d=\"M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6\"/>",
 "cal": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"3\"/><path d=\"M3.5 10h17M8 3v4M16 3v4\"/>",
 "plus": "<path d=\"M12 5v14M5 12h14\"/>",
 "shelves": "<path d=\"M5 20V5M10 20V8M14.5 20l3-14 2.8.8-3 13.2\"/><path d=\"M3 20h18\"/>",
 "almanac": "<path d=\"M5 4.5h11.5a2.5 2.5 0 0 1 2.5 2.5v12.5H7.5A2.5 2.5 0 0 1 5 17z\"/><path d=\"M5 17a2.5 2.5 0 0 1 2.5-2.5H19M9 8.5h6\"/>",
 "first": "<path d=\"M12 3l2 7h7l-5.6 4 2.1 7L12 16.8 6.5 21l2.1-7L3 10h7z\"/>",
 "gift": "<rect x=\"3.5\" y=\"9\" width=\"17\" height=\"11\" rx=\"2\"/><path d=\"M3.5 13h17M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z\"/>",
 "lock": "<rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"2.5\"/><path d=\"M8 10.5V8a4 4 0 0 1 8 0v2.5\"/>",
 "quiet": "<path d=\"M3 12s3.5-6 9-6c1.8 0 3.3.6 4.6 1.4M21 12s-3.5 6-9 6c-1.8 0-3.3-.6-4.6-1.4M4 4l16 16\"/>",
 "search": "<circle cx=\"10.5\" cy=\"10.5\" r=\"6\"/><path d=\"M15 15l5.5 5.5\"/>",
 "gear": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7\"/>",
 "more": "<circle cx=\"6\" cy=\"12\" r=\"1.3\"/><circle cx=\"12\" cy=\"12\" r=\"1.3\"/><circle cx=\"18\" cy=\"12\" r=\"1.3\"/>",
 "back": "<path d=\"M14.5 5.5L8 12l6.5 6.5\"/>",
 "next": "<path d=\"M9.5 5.5L16 12l-6.5 6.5\"/>",
 "photo": "<rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"13\" rx=\"2.5\"/><circle cx=\"9\" cy=\"10.5\" r=\"1.8\"/><path d=\"M4 17l5-4.5 4 3.5 3-2.5 4 3.5\"/>",
 "down": "<path d=\"M6 9.5l6 6 6-6\"/>",
 "up": "<path d=\"M6 14.5l6-6 6 6\"/>",
 "close": "<path d=\"M6.5 6.5l11 11M17.5 6.5l-11 11\"/>"
} as const;
export type IconName = keyof typeof PATHS;
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: PATHS[name] }} />;
}
