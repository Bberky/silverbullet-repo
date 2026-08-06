---
name: Library/Bberky/Calendar
tags: meta/library
files:
- calendar.plug.js
---
This plug publishes tasks tagged with `#event` to an iCalendar file.

## Events

Add the `#event` tag and a `date` attribute to a task:

```markdown
- [ ] Public holiday #event [date: 2026-08-20]
- [ ] Dentist #event [date: 2026-08-12] [time: 09:30] [duration: 45m] [place: Clinic]
```

Supported attributes:

- `date` is required and uses `YYYY-MM-DD`.
- `time` is optional and uses `HH:MM`. Without it, the event lasts all day.
- `duration` is optional and requires `time`. It accepts positive days, hours,
  and minutes in descending order, for example `2m`, `3h`, or `4d 2h 43m`.
  Timed events without a duration last one hour.
- `place` is optional and becomes the event location.

Run the `Calendar: Publish` command to write the configured iCalendar file.

## Configuration

```space-lua
-- priority: 100
config.define("calendar", {
  type = "object",
  properties = {
    name = schema.string(),
    outputFile = schema.string(),
    autoSync = schema.number(),
  },
})

tag.define {
  name = "event",
  schema = {
    type = "object",
    properties = {
      date = schema.string(),
      time = schema.string(),
      duration = schema.string(),
      place = schema.string(),
    },
    required = { "date" },
  },
}
```
