import { config, editor } from "@silverbulletmd/silverbullet/syscalls";
import { getEvents } from "./event";
import { createICS, getEventUIDs, parseICSFile, writeICSFile } from "./ics";
import {
  CAL_CONFIG_KEY,
  CAL_DEFAULT_FILE,
  CAL_DEFAULT_NAME,
} from "./constants";
import { Config, configSchema } from "./schema";

const getConfig = async () => {
  const configRaw = await config.get<Config>(CAL_CONFIG_KEY, {
    name: CAL_DEFAULT_NAME,
    outputFile: CAL_DEFAULT_FILE,
  });

  return configSchema.parse(configRaw);
};

export const publishCalendar = async (flashNotification = true) => {
  const events = await getEvents();
  const { name, outputFile } = await getConfig();

  const prevEvents = getEventUIDs(await parseICSFile(outputFile));
  const ics = createICS(name, events);
  const currEvents = getEventUIDs(ics);
  await writeICSFile(outputFile, ics.toString());

  if (flashNotification) {
    const removedCount = prevEvents.filter(
      (p) => !currEvents.includes(p),
    ).length;
    const addedCount = currEvents.filter((c) => !prevEvents.includes(c)).length;
    await editor.flashNotification(
      `Published ${addedCount}; removed ${removedCount} event${addedCount === 1 ? "" : "s"}`,
    );
  }
};

export const insertEvent = async () => {
  const TAG = "#event";
  await editor.insertAtCursor(`* [ ]  ${TAG}`);
  const cursorPos = await editor.getCursor();
  await editor.moveCursor(cursorPos - TAG.length - 1);
};

export const autoSync = (() => {
  let lastSync = Date.now();

  return async () => {
    const { autoSync } = await getConfig();

    if (!autoSync) {
      return;
    }

    const now = Date.now();
    const syncMs = autoSync * 60 * 1000;
    if (now - lastSync >= syncMs) {
      lastSync = now;
      await publishCalendar(false);
    }
  };
})();
