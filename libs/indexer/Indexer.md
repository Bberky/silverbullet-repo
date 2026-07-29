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

function indexShortcuts.folderIndexMarkdown(pageName, includeNested)
  pageName = pageName or editor.getCurrentPage()

  local prefix = pageName .. "/"
  local indexedPages = query[[
    from page = index.pages()
    select page
  ]]
  local pages = {}

  for _, page in ipairs(indexedPages) do
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
    return "_No child pages._"
  end

  local items = {}
  for _, page in ipairs(pages) do
    local indentation = ""

    if includeNested then
      local relativeName = page.name:sub(#prefix + 1)
      local depth = 1
      for _ in relativeName:gmatch("/") do
        depth = depth + 1
      end
      indentation = string.rep("  ", depth - 1)
    end

    table.insert(items, indentation .. templates.pageItem(page))
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
  description = "Insert a live index of the current page's direct children",
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
  description = "Insert an indented live index of all child pages",
  run = function()
    editor.insertAtCursor(
      "${indexShortcuts.folderIndex(nil, true)}\n|^|",
      false,
      true
    )
  end
}
```