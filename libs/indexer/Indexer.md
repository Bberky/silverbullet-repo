---
name: Library/Bberky/Indexer
tags: meta/library
description: Slash commands for inserting folder indexes.
---

# Index Shortcuts

Adds slash commands for inserting useful indexes into pages.

## `/index`

Inserts a live, alphabetized list of every other direct page in the current
page's folder.

## `/index-nested`

Like `/index`, but also includes pages in nested folders.

```space-lua
-- priority: 0

indexShortcuts = indexShortcuts or {}

function indexShortcuts.folderName(pageName)
  return pageName:match("^(.*)/[^/]+$") or ""
end

function indexShortcuts.folderIndexMarkdown(pageName, includeNested)
  pageName = pageName or editor.getCurrentPage()

  local folderName = indexShortcuts.folderName(pageName)
  local prefix = folderName == "" and "" or folderName .. "/"
  local pages = {}

  for _, page in ipairs(index.pages()) do
    local isInFolder = page.name:sub(1, #prefix) == prefix
    local relativeName = page.name:sub(#prefix + 1)
    local isDirectPage = relativeName:find("/", 1, true) == nil

    if isInFolder
      and page.name ~= pageName
      and (includeNested or isDirectPage)
    then
      table.insert(pages, page)
    end
  end

  table.sort(pages, function(left, right)
    return left.name < right.name
  end)

  if #pages == 0 then
    return "_No other pages in this folder._"
  end

  local items = {}
  for _, page in ipairs(pages) do
    table.insert(items, templates.pageItem(page))
  end
  return table.concat(items)
end

function indexShortcuts.folderIndex(pageName, includeNested)
  return widget.markdown(
    indexShortcuts.folderIndexMarkdown(pageName, includeNested)
  )
end

slashCommand.define {
  name = "index",
  description = "Insert a live index of direct pages in the current folder",
  run = function()
    editor.insertAtCursor(
      "${indexShortcuts.folderIndex()}\n|^|",
      false,
      true
    )
  end
}

slashCommand.define {
  name = "index-nested",
  description = "Insert a live recursive index of the current folder",
  run = function()
    editor.insertAtCursor(
      "${indexShortcuts.folderIndex(nil, true)}\n|^|",
      false,
      true
    )
  end
}
```