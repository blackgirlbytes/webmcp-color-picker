# WebMCP Color Picker Demo

A simple demo showing how to build a WebMCP-enabled website.

**Live Demo:** https://blackgirlbytes.github.io/webmcp-color-picker/  
**Tutorial:** https://blackgirlbytes.github.io/webmcp-color-picker/tutorial.html

---

## What is WebMCP?

WebMCP is a proposed web standard from Google/Chrome that allows websites to expose **structured tools** to AI agents. Instead of AI "screen scraping" and guessing how to interact with your UI, you tell it exactly what actions are available.

### MCP vs WebMCP - What's the Difference?

|                     | MCP                                  | WebMCP                          |
|---------------------|--------------------------------------|---------------------------------|
| **Where it runs**   | Server-side                          | Client-side (browser)           |
| **Who builds it**   | You deploy & maintain a server       | Website adds some JS/HTML       |
| **Access**          | Need API keys, auth, infrastructure  | Just visit the website          |
| **Updates**         | You update your server               | Website owner updates their site|

### The Real Value of WebMCP

1. **Websites expose their own tools** - With MCP, if you want AI to book a flight on United.com, *you* have to build a server that scrapes/automates their site. With WebMCP, United builds it once and every AI agent can use it.

2. **No middle-man**
   ```
   MCP:     AI → Your MCP Server → Website
   WebMCP:  AI → Website (directly)
   ```

3. **The website knows best** - Who knows better how to book a flight on United.com - you, or United? WebMCP lets the website author define exactly what's possible.

4. **Scales to the whole web** - Imagine if every website had WebMCP tools:
   - Amazon: `add_to_cart`, `checkout`
   - Gmail: `send_email`, `search_inbox`
   - Banks: `transfer_money`, `check_balance`

**TL;DR:** With MCP, you build tools for websites. With WebMCP, websites build tools for you.

---

## Requirements

### 1. Chrome Canary (version 146+)
Download from https://www.google.com/chrome/canary/

### 2. Enable the WebMCP Flag
1. Go to `chrome://flags/#enable-webmcp-testing`
2. Set to **Enabled**
3. Relaunch Chrome

### 3. (Optional) Install the Model Context Tool Inspector Extension
https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd

This lets you see registered tools on a page and test them manually.

---

## Connecting External Agents (like Goose)

To connect an external AI agent to WebMCP sites, you need a bridge. Use **Chrome DevTools MCP**:

### Setup

Add this to your goose config (`~/.config/goose/config.yaml`):

```yaml
extensions:
  chrome-devtools:
    enabled: true
    type: stdio
    name: Chrome DevTools
    description: Chrome DevTools for AI agents
    cmd: npx
    args:
      - chrome-devtools-mcp@latest
      - --autoConnect
      - --channel=canary
    timeout: 300
```

### Available Flags

| Flag | Description |
|------|-------------|
| `--autoConnect` | Automatically connects to running Chrome (easiest) |
| `--channel=canary` | Use Chrome Canary instead of stable |
| `--channel=stable` | Use stable Chrome (default) |
| `--channel=beta` | Use Chrome Beta |
| `--channel=dev` | Use Chrome Dev |
| `--executable-path=/path/to/chrome` | Custom Chrome binary path |

### Example Prompts

```
Go to https://blackgirlbytes.github.io/webmcp-color-picker/ and change the background to coral
```

```
Navigate to the WebMCP color picker demo and make it forest green
```

---

## How This Demo Works

### Project Structure

```
webmcp-color-picker/
├── index.html      # The demo page
├── style.css       # Styling
├── webmcp.js       # WebMCP tool registration
└── tutorial.html   # Step-by-step tutorial
```

### The WebMCP Tool Registration

```javascript
if (window.navigator.modelContext) {
  window.navigator.modelContext.registerTool({
    name: "set_background_color",
    description: "Changes the background color of the page. Accepts any valid CSS color (hex, rgb, named colors like 'coral', 'forestgreen', etc.)",
    inputSchema: {
      type: "object",
      properties: {
        color: {
          type: "string",
          description: "The color to set. Can be a hex code (#ff5733), RGB (rgb(255,87,51)), or named color (coral, navy, forestgreen)"
        }
      },
      required: ["color"]
    },
    execute: ({ color }) => {
      setBackgroundColor(color, true); // true = called by AI

      return {
        content: [{
          type: "text",
          text: `Background color changed to ${color}`
        }]
      };
    }
  });
}
```

### Anatomy of a Tool

| Property | Purpose |
|----------|---------|
| `name` | The tool's identifier - AI calls this name to invoke the tool |
| `description` | Tells AI *what* the tool does and *when* to use it |
| `inputSchema` | JSON Schema defining parameters, types, and requirements |
| `execute` | The function that runs when AI calls the tool |

---

## Two Ways to Build WebMCP Sites

### 1. Imperative API (JavaScript)

Register tools programmatically - best for complex logic or React/Vue/Angular apps:

```javascript
window.navigator.modelContext.registerTool({
  name: "my_tool",
  description: "Does something useful",
  inputSchema: { ... },
  execute: (params) => { ... }
});
```

### 2. Declarative API (HTML attributes)

Just add attributes to existing forms - no JavaScript required:

```html
<form
  toolname="book_table"
  tooldescription="Creates a dining reservation"
>
  <input
    type="text"
    name="name"
    toolparamdescription="Customer's full name"
  />
  <button type="submit">Book</button>
</form>
```

| Attribute | Where | Purpose |
|-----------|-------|---------|
| `toolname` | `<form>` | The tool's name AI will call |
| `tooldescription` | `<form>` | What the tool does |
| `toolparamdescription` | `<input>`, `<select>`, etc. | Describes each parameter |
| `toolautosubmit` | `<form>` | Auto-submit without user clicking |

---

## Resources

- [WebMCP Early Preview Docs](https://docs.google.com/document/d/1rtU1fRPS0bMqd9abMG_hc6K9OAI6soUy3Kh00toAgyk/edit)
- [WebMCP GitHub (proposed standard)](https://github.com/webmachinelearning/webmcp)
- [Chrome DevTools MCP](https://github.com/anthropics/anthropic-tools/tree/main/chrome-devtools-mcp)
- [Google's WebMCP Demo Tools](https://github.com/anthropics/anthropic-tools/tree/main/chrome-devtools-mcp)
- [Travel Demo (Imperative)](https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/)
- [Le Petit Bistro Demo (Declarative)](https://googlechromelabs.github.io/webmcp-tools/demos/french-bistro/)
