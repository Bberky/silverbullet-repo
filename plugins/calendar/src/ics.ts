import { space } from "@silverbulletmd/silverbullet/syscalls";
import { Event } from "./schema";
import ICAL from "ical.js";

const PROD_ID = "-//SilverBullet//Calendar//EN";
const DEFAULT_EVENT_DURATION_SECONDS = 60 * 60;
const durationUnitSeconds = {
  d: 24 * 60 * 60,
  h: 60 * 60,
  m: 60,
} as const;

const parseDuration = (duration: string): ICAL.Duration => {
  const seconds = Array.from(duration.matchAll(/(\d+)([dhm])/g)).reduce(
    (total, [, amount, unit]) =>
      total +
      Number(amount) *
        durationUnitSeconds[unit as keyof typeof durationUnitSeconds],
    0,
  );

  return ICAL.Duration.fromSeconds(seconds);
};

const createEventUid = (event: Event): string =>
  `${event.ref}@${crypto.randomUUID()}`;

const parseEventUid = (uid: string): string =>
  uid.slice(0, uid.lastIndexOf("@"));

export const createICS = (name: string, events: Event[]): ICAL.Component => {
  const calendar = new ICAL.Component("vcalendar");
  calendar.addPropertyWithValue("version", "2.0");
  calendar.addPropertyWithValue("prodid", PROD_ID);
  calendar.addPropertyWithValue("calscale", "GREGORIAN");
  calendar.addPropertyWithValue("name", name);
  calendar.addPropertyWithValue("x-wr-calname", name);

  const generatedAt = ICAL.Time.fromJSDate(new Date(), true);

  for (const event of events) {
    const component = new ICAL.Component("vevent");
    const calendarEvent = new ICAL.Event(component);
    calendarEvent.uid = createEventUid(event);
    calendarEvent.summary = event.name;

    if (event.place !== undefined) {
      calendarEvent.location = event.place;
    }

    if (event.time !== undefined) {
      calendarEvent.startDate = ICAL.Time.fromDateTimeString(
        `${event.date}T${event.time}:00`,
      );
      calendarEvent.duration = event.duration
        ? parseDuration(event.duration)
        : ICAL.Duration.fromSeconds(DEFAULT_EVENT_DURATION_SECONDS);
    } else {
      const start = ICAL.Time.fromDateString(event.date);
      const end = start.clone();
      end.day += 1;

      calendarEvent.startDate = start;
      calendarEvent.endDate = end;
    }

    component.addPropertyWithValue("dtstamp", generatedAt.clone());
    calendar.addSubcomponent(component);
  }

  return calendar;
};

export const parseICSFile = async (name: string): Promise<ICAL.Component> => {
  if (!(await space.fileExists(name))) {
    return new ICAL.Component("vcalendar");
  }

  const icsRaw = await space
    .readFile(name)
    .then((buff) => new TextDecoder().decode(buff));
  const data = ICAL.parse(icsRaw);

  return new ICAL.Component(data);
};

export const getEventUIDs = (cal: ICAL.Component): string[] => {
  const vevents = cal.getAllSubcomponents("vevent");
  const rawUIDs = vevents.map((vevent) => new ICAL.Event(vevent).uid);

  return rawUIDs.map(parseEventUid);
};

export const writeICSFile = async (name: string, content: string) => {
  const buffer = new TextEncoder().encode(content);
  return space.writeFile(name, buffer);
};
