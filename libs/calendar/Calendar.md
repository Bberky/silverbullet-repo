---
name: Library/Bberky/Calendar
tags: meta/library
description: Publish SilverBullet event tasks as a subscribable iCalendar feed.
---

# Calendar

Publishes tasks marked with `[tag: event]` to a single iCalendar (`.ics`)
file. Subscribe to the generated file from a calendar client to see events from
your SilverBullet space.

Requires SilverBullet 2.10.0 or newer.

## Event syntax

Add event attributes directly to a task:

```markdown
* [ ] Dentist [tag: event] [date: "2026-08-03"] [time: "14:30"] [duration: 58m] [place: Clinic]
* [x] Conference [tag: event] [date: "2026-08-10"] [duration: 2d] [place: Prague]
```

Attributes:

- `date` is required and must use `YYYY-MM-DD`.
- `time` is optional and must use 24-hour `HH:MM`. Without it, the event is
  an all-day event.
- `duration` is optional. It accepts days, hours, and minutes in that order,
  for example `58m`, `7h 30m`, `2d 4h`, or `1d 2h 15m`. A timed event
  defaults to `1h`; an all-day event defaults to `1d`. All-day events can
  only use whole-day durations.
- `place` is optional and becomes the event location.

Timed events use floating local time: `14:30` stays at `14:30` and is
interpreted in the calendar subscriber's local time zone.

Checked and unchecked tasks are both published. Deleting the task removes the
event from the next generated feed. Add a SilverBullet anchor such as
`$dentist-2026-08-03` to an event task when its calendar identity should remain
stable after moving the task; otherwise its position-based task reference is
used.

## Configuration

The defaults are equivalent to:

```lua
config.set("calendar.name", "SilverBullet Events")
config.set("calendar.outputFile", "calendar.ics")
```

`calendar.outputFile` must be a relative, non-hidden path ending in `.ics`.

## Publishing and subscribing

Run ${widgets.commandButton("Calendar: Publish Feed")} to publish immediately.
The library also publishes after page indexing has been quiet for two seconds
and once after the library loads. It avoids rewriting an unchanged feed.

The default subscription URL is:

```text
https://silverbullet.example/.fs/calendar.ics
```

When SilverBullet authentication is enabled, the calendar client must send:

```text
Authorization: Bearer <SB_AUTH_TOKEN>
```

Most simple URL-only calendar subscription dialogs cannot add this header; use
a client or fetch bridge with Bearer-header support. Always use HTTPS when the
feed crosses an untrusted network.

Automatic generation runs in the SilverBullet client, so a SilverBullet tab
must be open for automatic updates. Once generated and synced, the `.ics` file
remains available from the server while no tab is open. Calendar clients decide
how frequently to poll subscribed feeds.

The implementation uses SilverBullet's [file API](https://silverbullet.md/API/space),
[sync API](https://silverbullet.md/API/sync), and authenticated
[`/.fs/*` endpoint](https://silverbullet.md/HTTP%20API). The generated format
follows [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545).

Invalid events are omitted. The manual publish command reports how many events
were published and skipped; detailed validation messages are written to the
SilverBullet log.

## Configuration and schema

```space-lua
-- priority: 100
config.define("calendar", {
  type = "object",
  properties = {
    name = {
      type = "string",
      default = "SilverBullet Events",
    },
    outputFile = {
      type = "string",
      default = "calendar.ics",
    },
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

## Feed generation

```space-lua
-- priority: 10
calendar = calendar or {}

calendar.publishing = false
calendar.dirtyAt = calendar.dirtyAt or os.time()

function calendar.parseDate(value)
  if type(value) ~= "string" then
    return nil, "date must be a string in YYYY-MM-DD format"
  end

  local yearText, monthText, dayText = value:match(
    "^(%d%d%d%d)%-(%d%d)%-(%d%d)$"
  )
  if not yearText then
    return nil, "date must use YYYY-MM-DD"
  end

  local year = tonumber(yearText)
  local month = tonumber(monthText)
  local day = tonumber(dayText)
  local timestamp = os.time {
    year = year,
    month = month,
    day = day,
  }
  if os.date("%Y-%m-%d", timestamp) ~= value then
    return nil, "date is not a real calendar date"
  end

  return yearText .. monthText .. dayText
end

function calendar.parseTime(value)
  if value == nil then
    return nil
  end
  if type(value) ~= "string" then
    return nil, "time must be a string in HH:MM format"
  end

  local hourText, minuteText = value:match("^(%d%d):(%d%d)$")
  if not hourText then
    return nil, "time must use 24-hour HH:MM"
  end

  local hour = tonumber(hourText)
  local minute = tonumber(minuteText)
  if hour > 23 or minute > 59 then
    return nil, "time must use 00:00 through 23:59"
  end

  return hourText .. minuteText .. "00"
end

function calendar.parseDuration(value, allDay)
  if value == nil then
    if allDay then
      return "P1D"
    end
    return "PT1H"
  end
  if type(value) ~= "string" then
    return nil, "duration must be a string such as 58m or 7h 30m"
  end

  local remaining = value:trim()
  if remaining == "" then
    return nil, "duration cannot be empty"
  end

  local unitOrder = { d = 1, h = 2, m = 3 }
  local unitMinutes = { d = 1440, h = 60, m = 1 }
  local lastOrder = 0
  local totalMinutes = 0
  local components = 0

  while remaining ~= "" do
    local amountText, unit, nextPosition = remaining:match(
      "^(%d+)([dhm])()"
    )
    if not amountText then
      return nil, "duration must contain ordered d, h, and m components"
    end

    local order = unitOrder[unit]
    if order <= lastOrder then
      return nil, "duration units must be unique and ordered d, h, then m"
    end

    totalMinutes = totalMinutes + tonumber(amountText) * unitMinutes[unit]
    components = components + 1
    lastOrder = order
    remaining = remaining:sub(nextPosition):trimStart()
  end

  if components == 0 or totalMinutes <= 0 then
    return nil, "duration must be greater than zero"
  end
  if allDay and totalMinutes % 1440 ~= 0 then
    return nil, "an all-day event duration must use whole days"
  end

  local days = math.floor(totalMinutes / 1440)
  local afterDays = totalMinutes % 1440
  local hours = math.floor(afterDays / 60)
  local minutes = afterDays % 60
  local result = "P"

  if days > 0 then
    result = result .. days .. "D"
  end
  if hours > 0 or minutes > 0 then
    result = result .. "T"
    if hours > 0 then
      result = result .. hours .. "H"
    end
    if minutes > 0 then
      result = result .. minutes .. "M"
    end
  end

  return result
end

function calendar.validateOutputFile(path)
  if type(path) ~= "string" then
    return nil, "calendar.outputFile must be a string"
  end

  path = path:trim()
  if path == "" then
    return nil, "calendar.outputFile cannot be empty"
  end
  if path:sub(1, 1) == "/" or path:find("\\", 1, true) then
    return nil, "calendar.outputFile must be a relative forward-slash path"
  end
  if path:find(":", 1, true) or path:find("//", 1, true) then
    return nil, "calendar.outputFile contains an invalid path segment"
  end
  if path:lower():sub(-4) ~= ".ics" then
    return nil, "calendar.outputFile must end in .ics"
  end

  local segmentCount = 0
  for segment in path:gmatch("[^/]+") do
    segmentCount = segmentCount + 1
    if segment == "." or segment == ".." or segment:sub(1, 1) == "." then
      return nil, "calendar.outputFile cannot contain hidden or traversal segments"
    end
  end
  if segmentCount == 0 then
    return nil, "calendar.outputFile must name a file"
  end

  return path
end

function calendar.escapeText(value)
  value = value:gsub("\\", "\\\\")
  value = value:gsub("\r\n", "\n")
  value = value:gsub("\r", "\n")
  value = value:gsub("\n", "\\n")
  value = value:gsub(";", "\\;")
  value = value:gsub(",", "\\,")
  return value
end

local function utf8Length(value)
  return encoding.utf8Encode(value).length
end

local function nextCharacter(value, position)
  local width = 1
  local first = string.byte(value, position)
  if first >= 55296 and first <= 56319 and position < #value then
    local second = string.byte(value, position + 1)
    if second >= 56320 and second <= 57343 then
      width = 2
    end
  end
  return value:sub(position, position + width - 1), width
end

function calendar.foldLine(line)
  local folded = {}
  local current = ""
  local currentBytes = 0
  local position = 1

  while position <= #line do
    local character, width = nextCharacter(line, position)
    local characterBytes = utf8Length(character)

    if current ~= "" and currentBytes + characterBytes > 75 then
      table.insert(folded, current)
      current = " "
      currentBytes = 1
    end

    current = current .. character
    currentBytes = currentBytes + characterBytes
    position = position + width
  end

  table.insert(folded, current)
  return table.concat(folded, "\r\n")
end

local function addLine(lines, line)
  table.insert(lines, calendar.foldLine(line))
end

function calendar.formatTimestamp(value)
  if type(value) == "number" then
    if value > 100000000000 then
      value = math.floor(value / 1000)
    end
    return os.date("!%Y%m%dT%H%M%SZ", value)
  end

  if type(value) == "string" then
    local year, month, day, hour, minute, second = value:match(
      "^(%d%d%d%d)%-(%d%d)%-(%d%d)T(%d%d):(%d%d):(%d%d)"
    )
    if year then
      return year .. month .. day .. "T" .. hour .. minute .. second .. "Z"
    end
  end

  return "19700101T000000Z"
end

function calendar.isTaskObject(source)
  -- [tag: event] replaces the primary tag but preserves task metadata.
  return type(source.state) == "string" and type(source.done) == "boolean"
end

function calendar.validateEvent(source)
  local ref = tostring(source.ref or "unknown")
  if not calendar.isTaskObject(source) then
    return nil, ref .. " is tagged as event but is not a task"
  end
  if type(source.name) ~= "string" or source.name:trim() == "" then
    return nil, ref .. " has no event title"
  end

  local dateValue, dateError = calendar.parseDate(source.date)
  if not dateValue then
    return nil, ref .. ": " .. dateError
  end

  local timeValue, timeError = calendar.parseTime(source.time)
  if timeError then
    return nil, ref .. ": " .. timeError
  end

  local durationValue, durationError = calendar.parseDuration(
    source.duration,
    timeValue == nil
  )
  if not durationValue then
    return nil, ref .. ": " .. durationError
  end

  if source.place ~= nil and type(source.place) ~= "string" then
    return nil, ref .. ": place must be a string"
  end

  return {
    ref = ref,
    name = source.name:trim(),
    date = dateValue,
    time = timeValue,
    duration = durationValue,
    place = source.place,
    timestamp = calendar.formatTimestamp(source.pageLastModified),
  }
end

function calendar.collectEvents()
  local validEvents = {}
  local validationErrors = {}
  -- index.objects returns a query collection in SilverBullet 2.10.
  local sources = query [[from source = index.objects("event")]]

  for _, source in ipairs(sources) do
    local event, validationError = calendar.validateEvent(source)
    if event then
      table.insert(validEvents, event)
    else
      table.insert(validationErrors, validationError)
      print("Calendar: skipping " .. validationError)
    end
  end

  table.sort(validEvents, function(left, right)
    local leftKey = left.date .. (left.time or "") .. left.ref
    local rightKey = right.date .. (right.time or "") .. right.ref
    return leftKey < rightKey
  end)

  return validEvents, validationErrors
end

function calendar.renderFeed(events, calendarName)
  local lines = {}
  addLine(lines, "BEGIN:VCALENDAR")
  addLine(lines, "VERSION:2.0")
  addLine(lines, "PRODID:-//Bberky//SilverBullet Calendar//EN")
  addLine(lines, "CALSCALE:GREGORIAN")
  addLine(lines, "X-WR-CALNAME:" .. calendar.escapeText(calendarName))

  for _, event in ipairs(events) do
    addLine(lines, "BEGIN:VEVENT")
    addLine(lines, "UID:" .. calendar.escapeText(event.ref .. "@silverbullet"))
    addLine(lines, "DTSTAMP:" .. event.timestamp)
    addLine(lines, "LAST-MODIFIED:" .. event.timestamp)
    addLine(lines, "SUMMARY:" .. calendar.escapeText(event.name))
    if event.time then
      addLine(lines, "DTSTART:" .. event.date .. "T" .. event.time)
    else
      addLine(lines, "DTSTART;VALUE=DATE:" .. event.date)
    end
    addLine(lines, "DURATION:" .. event.duration)
    if event.place and event.place ~= "" then
      addLine(lines, "LOCATION:" .. calendar.escapeText(event.place))
    end
    addLine(
      lines,
      "X-SILVERBULLET-REF:" .. calendar.escapeText(event.ref)
    )
    addLine(lines, "END:VEVENT")
  end

  addLine(lines, "END:VCALENDAR")
  return table.concat(lines, "\r\n") .. "\r\n"
end

local function publishUnlocked()
  local outputFile, pathError = calendar.validateOutputFile(
    config.get("calendar.outputFile", "calendar.ics")
  )
  if not outputFile then
    error(pathError)
  end

  local calendarName = config.get("calendar.name", "SilverBullet Events")
  if type(calendarName) ~= "string" or calendarName:trim() == "" then
    error("calendar.name must be a non-empty string")
  end

  local events, validationErrors = calendar.collectEvents()
  local content = calendar.renderFeed(events, calendarName:trim())
  local changed = true

  if space.fileExists(outputFile) then
    local existing = encoding.utf8Decode(space.readFile(outputFile))
    changed = existing ~= content
  end

  local syncError
  if changed then
    space.writeFile(outputFile, encoding.utf8Encode(content))
    local synced, message = pcall(function()
      sync.performFileSync(outputFile)
    end)
    if not synced then
      syncError = tostring(message)
      print("Calendar: feed written locally but sync failed: " .. syncError)
    end
  end

  return {
    outputFile = outputFile,
    published = #events,
    skipped = #validationErrors,
    changed = changed,
    syncError = syncError,
  }
end

function calendar.publish()
  if calendar.publishing then
    return {
      busy = true,
      published = 0,
      skipped = 0,
      changed = false,
    }
  end

  calendar.publishing = true
  local ok, result = pcall(publishUnlocked)
  calendar.publishing = false
  if not ok then
    error(result)
  end
  return result
end

command.define {
  name = "Calendar: Publish Feed",
  run = function()
    local ok, result = pcall(calendar.publish)
    if not ok then
      editor.flashNotification(
        "Calendar feed publication failed: " .. tostring(result),
        "error"
      )
      return
    end
    if result.busy then
      editor.flashNotification(
        "Calendar feed publication is already running.",
        "warning"
      )
      return
    end

    local message = "Published " .. result.published .. " calendar event"
    if result.published ~= 1 then
      message = message .. "s"
    end
    if result.skipped > 0 then
      message = message .. "; skipped " .. result.skipped
    end
    if not result.changed then
      message = message .. " (feed unchanged)"
    end

    if result.syncError then
      editor.flashNotification(
        message .. "; server sync failed: " .. result.syncError,
        "warning"
      )
    elseif result.skipped > 0 then
      editor.flashNotification(message, "warning")
    else
      editor.flashNotification(message)
    end
  end,
}
```

## Automatic refresh

```space-lua
-- priority: 0
event.listen {
  name = "page:index",
  run = function()
    calendar.dirtyAt = os.time()
  end,
}

event.listen {
  name = "cron:secondPassed",
  run = function()
    if not calendar.dirtyAt or calendar.publishing then
      return
    end
    if os.time() - calendar.dirtyAt < 2 then
      return
    end

    calendar.dirtyAt = nil
    local ok, result = pcall(calendar.publish)
    if not ok then
      print("Calendar: automatic feed publication failed: " .. tostring(result))
    elseif result.syncError then
      print("Calendar: automatic feed sync failed: " .. result.syncError)
    end
  end,
}
```
