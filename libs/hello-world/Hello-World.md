---
name: Library/Bberky/HelloWorld
tags: meta/library
---
This is a simple library to get hands-on experience with SilverBullet library development

# Configuration
There is only one configuration option and that is your name. When set, you will be greeted using your name, otherwise a _mysterious stranger_ will be used.

Example configuration:
```lua
config.set("helloWorld.name", "Adam Berkes")
```

# Implementation

## Configuration
```space-lua
-- priority: 100
config.define("helloWorld", {
    type = "object",
    properties = {
        name = schema.string()
    }
})
```

## Commands
```space-lua
helloWorld = {}

command.define {
    name = "HelloWorld: Greet",
    run = function()
      editor.flashNotification "Hello there!"
    end
}
```