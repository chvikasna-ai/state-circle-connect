export type LocalRoom = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  state_code: string;
  created_at: string;
  sort_order: number;
  isLocal: true;
};

export type LocalMessage = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  display_name: string;
  liked_by: string[];
};

const ROOMS_KEY = "state-circle-local-rooms";
const stateRoomsKey = (stateCode: string) => `state-circle-local-rooms-${stateCode}`;
const messagesKey = (stateCode: string, roomId: string) => `state-circle-local-room-messages-${stateCode}-${roomId}`;

const STARTER_ROOMS = [
  { name: "Welcome", slug: "welcome", description: "Meet neighbors in your state." },
  { name: "Neighborhood help", slug: "neighborhood-help", description: "Ask for practical help nearby." },
  { name: "Jokes", slug: "jokes", description: "Share clean jokes and light moments." },
  { name: "School and family", slug: "school-and-family", description: "Talk about school, family, and local support." },
];

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

export const roomSlug = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `chat-${Date.now()}`;
};

const starterRoomsForState = (stateCode: string): LocalRoom[] =>
  STARTER_ROOMS.map((room, index) => ({
    ...room,
    id: `${stateCode}-starter-${room.slug}`,
    state_code: stateCode,
    created_at: new Date(0).toISOString(),
    sort_order: index,
    isLocal: true,
  }));

const readSavedRooms = (key: string): LocalRoom[] => {
  if (!canUseStorage()) return [];
  const saved = window.localStorage.getItem(key);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as LocalRoom[];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
};

export const getLocalRooms = (stateCode?: string): LocalRoom[] => {
  if (!stateCode) return [];
  const key = stateRoomsKey(stateCode);
  const savedRooms = readSavedRooms(key);
  const legacyRooms = readSavedRooms(ROOMS_KEY).map(room => ({ ...room, state_code: stateCode }));
  const savedSlugs = new Set(savedRooms.map(room => room.slug));
  const starterRooms = starterRoomsForState(stateCode).filter(room => !savedSlugs.has(room.slug));
  return [...starterRooms, ...savedRooms, ...legacyRooms].sort((a, b) => a.sort_order - b.sort_order);
};

export const saveLocalRoom = (stateCode: string, room: Omit<LocalRoom, "id" | "state_code" | "created_at" | "sort_order" | "isLocal">) => {
  const rooms = getLocalRooms(stateCode);
  const existingSlugs = new Set(rooms.map(r => r.slug));
  let slug = room.slug;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${room.slug}-${suffix}`;
    suffix += 1;
  }
  const nextRoom: LocalRoom = {
    ...room,
    slug,
    state_code: stateCode,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    sort_order: rooms.length + 1000,
    isLocal: true,
  };
  const savedRooms = readSavedRooms(stateRoomsKey(stateCode));
  window.localStorage.setItem(stateRoomsKey(stateCode), JSON.stringify([...savedRooms, nextRoom]));
  return nextRoom;
};

export const findLocalRoom = (slug: string, stateCode?: string) =>
  getLocalRooms(stateCode).find(room => room.slug === slug) ?? null;

export const getLocalMessages = (stateCode: string, roomId: string): LocalMessage[] => {
  if (!canUseStorage()) return [];
  const saved = window.localStorage.getItem(messagesKey(stateCode, roomId));
  if (!saved) return [];
  try {
    return JSON.parse(saved) as LocalMessage[];
  } catch {
    window.localStorage.removeItem(messagesKey(stateCode, roomId));
    return [];
  }
};

export const saveLocalMessage = (stateCode: string, roomId: string, message: Omit<LocalMessage, "id" | "created_at">) => {
  const messages = getLocalMessages(stateCode, roomId);
  const nextMessage: LocalMessage = {
    ...message,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  window.localStorage.setItem(messagesKey(stateCode, roomId), JSON.stringify([...messages, nextMessage]));
  return nextMessage;
};

export const toggleLocalMessageLike = (stateCode: string, roomId: string, messageId: string, userId: string) => {
  const messages = getLocalMessages(stateCode, roomId);
  const nextMessages = messages.map(message => {
    if (message.id !== messageId) return message;
    const likedBy = message.liked_by ?? [];
    const liked = likedBy.includes(userId);
    return {
      ...message,
      liked_by: liked ? likedBy.filter(id => id !== userId) : [...likedBy, userId],
    };
  });
  window.localStorage.setItem(messagesKey(stateCode, roomId), JSON.stringify(nextMessages));
  return nextMessages;
};
