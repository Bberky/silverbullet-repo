import { z } from "zod";
import { index } from "@silverbulletmd/silverbullet/syscalls";
import { CAL_DEFAULT_FILE, CAL_DEFAULT_NAME } from "./constants";

export const objectValueSchema = z.object({
  ref: z.string(),
  tag: z.string(),
  range: z.tuple([z.number(), z.number()]).optional(),
  tags: z.string().array().optional(),
  itags: z.string().array().optional(),
}) satisfies z.ZodType<
  Awaited<ReturnType<typeof index.queryLuaObjects<unknown>>>[number]
>;

export type ObjectValue = z.infer<typeof objectValueSchema>;

export const taskSchema = z
  .object({
    name: z.string(),
    done: z.boolean(),
  })
  .extend(objectValueSchema.shape);

export type Task = z.infer<typeof taskSchema>;

const durationPattern =
  /^(?:[1-9]\d*d(?:\s+[1-9]\d*h)?(?:\s+[1-9]\d*m)?|[1-9]\d*h(?:\s+[1-9]\d*m)?|[1-9]\d*m)$/;

export const durationSchema = z
  .string()
  .trim()
  .regex(
    durationPattern,
    "Duration must contain positive day, hour, or minute components in descending order (for example, '4d 2h 43m').",
  )
  .refine(
    (duration) =>
      Array.from(duration.matchAll(/(\d+)[dhm]/g)).every((match) =>
        Number.isSafeInteger(Number(match[1])),
      ),
    "Duration components must be safe integers.",
  );

export const eventSchema = z
  .object({
    date: z.iso.date(),
    time: z.iso.time({ precision: -1 }).optional(),
    place: z.string().optional(),
    duration: durationSchema.optional(),
  })
  .extend(taskSchema.shape)
  .refine((event) => event.duration === undefined || event.time !== undefined, {
    message: "Duration cannot be specified without a time.",
    path: ["duration"],
  });

export type Event = z.infer<typeof eventSchema>;

export const configSchema = z.object({
  name: z.string().nonempty().default(CAL_DEFAULT_NAME),
  outputFile: z.string().nonempty().default(CAL_DEFAULT_FILE),
  autoSync: z.number().optional(),
});

export type Config = z.infer<typeof configSchema>;
