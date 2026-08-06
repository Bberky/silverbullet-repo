import { index } from "@silverbulletmd/silverbullet/syscalls";
import { Event, eventSchema } from "./schema";
import z from "zod";

export const getEvents = async (): Promise<Event[]> => {
  const eventsRaw = await index.queryLuaObjects("event", {});
  const res = z.array(eventSchema).safeParse(eventsRaw);

  if (!res.success) {
    throw new Error("Error parsing events.", res.error);
  }

  return res.data;
};
