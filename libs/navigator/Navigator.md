---
name: Library/Bberky/Navigator
tags: meta/library
description: Hierarchical parent and child page navigation from the top bar.
---

# Navigator

Adds two buttons to SilverBullet's top bar:

- The up arrow navigates to the current page's existing parent page.
- The down chevron opens a searchable picker containing the current page's
  direct children.

Both buttons stay visible in the mobile top bar. They are backed by the
`Navigate: Parent Page` and `Navigate: Child Page Picker` commands, so you can
assign shortcuts under **Configuration → Key Bindings**. The library does not
assign default shortcuts.

Only existing pages are navigation targets. Missing parents, pages without a
parent, and pages without direct children produce a warning; this library never
creates pages.

Requires SilverBullet 2.7 or newer.

```space-lua
navigator = navigator or {}

function navigator.parentPageName(pageName)
  if not pageName then
    return nil
  end

  return pageName:match("^(.*)/[^/]+$")
end

function navigator.directChildren(pageName)
  local prefix = pageName .. "/"
  local indexedPages = query[[
    from page = index.pages()
    select page
  ]]
  local children = {}

  for _, page in ipairs(indexedPages) do
    if page.name:sub(1, #prefix) == prefix then
      local relativeName = page.name:sub(#prefix + 1)

      if relativeName ~= "" and relativeName:find("/", 1, true) == nil then
        table.insert(children, {
          name = relativeName,
          description = page.name,
          value = page.name,
        })
      end
    end
  end

  table.sort(children, function(left, right)
    return left.name < right.name
  end)

  return children
end

function navigator.goToParent()
  local currentPage = editor.getCurrentPage()
  local parentPage = navigator.parentPageName(currentPage)

  if not parentPage or parentPage == "" then
    editor.flashNotification(
      "This page does not have a parent page.",
      "warning"
    )
    return
  end

  if not space.pageExists(parentPage) then
    editor.flashNotification(
      "Parent page does not exist: " .. parentPage,
      "warning"
    )
    return
  end

  editor.navigate(parentPage)
end

function navigator.openChildPicker()
  local currentPage = editor.getCurrentPage()
  local children = navigator.directChildren(currentPage)

  if #children == 0 then
    editor.flashNotification(
      "This page does not have any direct child pages.",
      "warning"
    )
    return
  end

  local selected = editor.filterBox(
    "Child pages",
    children,
    "Select a direct child of " .. currentPage,
    "Filter child pages..."
  )

  if not selected then
    return
  end

  local targetPage = selected.value
  if not targetPage or not space.pageExists(targetPage) then
    editor.flashNotification(
      "The selected child page no longer exists.",
      "warning"
    )
    return
  end

  editor.navigate(targetPage)
end

command.define {
  name = "Navigate: Parent Page",
  run = navigator.goToParent,
}

command.define {
  name = "Navigate: Child Page Picker",
  run = navigator.openChildPicker,
}

actionButton.define {
  icon = "arrow-up",
  description = "Go to parent page",
  command = "Navigate: Parent Page",
  priority = 2.9,
  dropdown = false,
}

actionButton.define {
  icon = "chevron-down",
  description = "Open direct child page",
  command = "Navigate: Child Page Picker",
  priority = 2.8,
  dropdown = false,
}
```
