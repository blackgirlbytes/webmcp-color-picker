# WebMCP Notes

Notes from researching and building a WebMCP demo.

---

## What is WebMCP?

WebMCP is a **proposed web standard** from Google/Chrome that lets websites expose structured tools to AI agents. Instead of AI "screen scraping" and guessing how to interact with a page, websites explicitly declare what actions are available.

**Think of it like this:** Without WebMCP, AI has to guess what buttons do. With WebMCP, your site provides an API that AI can call directly.

---

## MCP vs WebMCP

| | MCP | WebMCP |
|---|-----|--------|
| **Where it runs** | Server-side | Client-side (browser) |
| **Who builds it** | You deploy & maintain a server | Website adds some JS/HTML |
| **Access** | Need API keys, auth, infrastructure | Just visit the website |
| **Updates** | You update your server | Website owner updates their site |

### Why WebMCP matters

1. **Websites expose their own tools** - With MCP, if you want AI to book a flight on United.com, *you* have to build a server that scrapes/automates their site, maintain it when their site changes, and handle auth and rate limits. With WebMCP, **United builds it once** and every AI agent can use it.

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

## Setup Requirements

### 1. Chrome Canary (version 146+)

Download: https://www.google.com/chrome/canary/

### 2. Enable the WebMCP Flag

1. Open `chrome://flags/#enable-webmcp-testing`
2. Set to **Enabled**
3. Relaunch Chrome

### 3. Enable Remote Debugging

1. Open `chrome://inspect/#remote-debugging`
2. Wait for it to show which server it's running on (e.g., `localhost:9222`)
3. This allows external agents to connect to Chrome

### 4. (Optional) Model Context Tool Inspector Extension

Install: https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd

This lets you:
- See registered tools on a page
- Manually execute tools
- Test with Gemini (needs API key from https://aistudio.google.com/)

---

## Connecting External Agents (like Goose)

WebMCP tools live in the browser. To connect an external agent like Goose, you need a **bridge**.

### Chrome DevTools MCP

The official bridge is `chrome-devtools-mcp` from the ChromeDevTools org:
https://github.com/ChromeDevTools/chrome-devtools-mcp

**Note:** It's NOT `@anthropic/chrome-devtools-mcp` - that doesn't exist!

### Goose Config

Add to `~/.config/goose/config.yaml`:

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

### Key Flags

| Flag | Description |
|------|-------------|
| `--autoConnect` | Automatically connects to running Chrome (easiest - no manual setup) |
| `--channel=canary` | Use Chrome Canary instead of stable |
| `--channel=stable` | Use stable Chrome (default) |
| `--channel=beta` | Use Chrome Beta |
| `--channel=dev` | Use Chrome Dev |
| `--executable-path=/path` | Custom Chrome binary path |

### Two Connection Options

**Option 1: Auto-Connect (Easiest)**
```json
{
  "args": ["chrome-devtools-mcp@latest", "--autoConnect", "--channel=canary"]
}
```
- Just have Chrome running normally
- It will ask for permission via a dialog
- No need to launch Chrome with special flags

**Option 2: Manual Port Forwarding**
```json
{
  "args": ["chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
}
```
Then launch Chrome with:
```bash
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-profile-canary
```

---

## Chrome DevTools MCP vs WebMCP

They're **two different things**:

| Chrome DevTools MCP | WebMCP |
|---------------------|--------|
| Lets an AI control/inspect the browser (screenshots, network, performance, DOM) | Lets websites expose **custom tools** to AI agents |
| Works on **any** website | Only works on sites that **implement WebMCP** |
| Generic browser automation | Structured, site-specific actions |
| Like giving AI access to DevTools | Like giving AI an API to the website |

### On a non-WebMCP site

Chrome DevTools MCP uses generic browser automation:
1. Take a screenshot to "see" the page
2. Find input fields in the DOM
3. Click and type
4. Navigate through UI (dropdowns, date pickers)
5. Hope the page structure doesn't break

### On a WebMCP site

AI sees structured tools and calls them directly:
```javascript
searchFlights({ origin: "LON", destination: "NYC", date: "2026-06-10" })
```
No guessing, no clicking through calendars, no screenshots to interpret.

---

## Example Prompts

For WebMCP demo sites, you need to tell the AI where to go:

```
Go to https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/ 
and search for flights from London to New York leaving June 10th 2026, 
returning June 17th, for 2 passengers
```

```
Navigate to https://blackgirlbytes.github.io/webmcp-color-picker/ 
and change the background to coral
```

---

## Building a WebMCP Site

### Two Approaches

#### 1. Imperative API (JavaScript)

For complex logic, dynamic tools, React/Vue/Angular apps:

```javascript
window.navigator.modelContext.registerTool({
  name: "set_background_color",
  description: "Changes the background color of the page...",
  inputSchema: {
    type: "object",
    properties: {
      color: {
        type: "string",
        description: "The color to set (hex, rgb, or named color)"
      }
    },
    required: ["color"]
  },
  execute: ({ color }) => {
    document.body.style.backgroundColor = color;
    return {
      content: [{ type: "text", text: `Changed to ${color}` }]
    };
  }
});
```

#### 2. Declarative API (HTML attributes)

For simple forms, static HTML sites - no JavaScript required:

```html
<form
  toolname="book_table"
  tooldescription="Creates a dining reservation"
>
  <input
    type="text"
    name="name"
    required
    toolparamdescription="Customer's full name"
  />
  <input
    type="date"
    name="date"
    required
    toolparamdescription="Reservation date (YYYY-MM-DD)"
  />
  <select name="guests" toolparamdescription="Number of people">
    <option value="1">1 Person</option>
    <option value="2">2 People</option>
    <option value="3">3 People</option>
  </select>
  <button type="submit">Book</button>
</form>
```

### Anatomy of a Tool

| Property | Purpose |
|----------|---------|
| `name` | The tool's identifier - AI calls this to invoke the tool |
| `description` | Tells AI *what* the tool does and *when* to use it. Be descriptive! |
| `inputSchema` | JSON Schema defining parameters, types, and which are required |
| `execute` | The function that runs when AI calls the tool |

### Best Practices

1. **Good descriptions** - Include examples like "hex (#ff5733)" or "named color (coral)"
2. **Accept raw user input** - Don't make AI do math or transformations
3. **Return useful results** - AI uses the return value to plan next steps
4. **Check for WebMCP availability** - `if (window.navigator.modelContext) { ... }`

---

## Demo Sites

### Google's Official Demos

- **Travel Demo (Imperative):** https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/
  - Tool: `searchFlights`
  - Note: Only supports LON → NYC round-trips

- **Le Petit Bistro (Declarative):** https://googlechromelabs.github.io/webmcp-tools/demos/french-bistro/
  - Tool: `book_table_le_petit_bistro`

- **Pizza Maker:** https://googlechromelabs.github.io/webmcp-tools/demos/pizza-maker/

### Our Demo

- **WebMCP Color Picker:** https://blackgirlbytes.github.io/webmcp-color-picker/
  - Tool: `set_background_color`
  - Tutorial: https://blackgirlbytes.github.io/webmcp-color-picker/tutorial.html
  - Repo: https://github.com/blackgirlbytes/webmcp-color-picker

---

## Resources

- **WebMCP Early Preview Docs:** https://docs.google.com/document/d/1rtU1fRPS0bMqd9abMG_hc6K9OAI6soUy3Kh00toAgyk/edit
- **WebMCP GitHub (proposed standard):** https://github.com/webmachinelearning/webmcp
- **Chrome DevTools MCP:** https://github.com/ChromeDevTools/chrome-devtools-mcp
- **Google's Demo Tools Repo:** https://github.com/GoogleChromeLabs/webmcp-tools

---

## Quick Reference

### Enable WebMCP
```
chrome://flags/#enable-webmcp-testing → Enabled → Relaunch
```

### Check if WebMCP is available
```javascript
if (window.navigator.modelContext) {
  // WebMCP available
}
```

### Register a tool
```javascript
window.navigator.modelContext.registerTool({ name, description, inputSchema, execute })
```

### Unregister a tool
```javascript
window.navigator.modelContext.unregisterTool("tool_name")
```

### Register multiple tools at once
```javascript
window.navigator.modelContext.provideContext({ tools: [...] })
```

### Clear all tools
```javascript
window.navigator.modelContext.clearContext()
```
