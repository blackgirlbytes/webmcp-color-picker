# What Went Wrong: WebMCP Flight Search Session Analysis

## Session Overview

**Date:** February 26, 2026  
**Task:** Search for flights from London to New York on a WebMCP-enabled demo page  
**Outcome:** Eventually successful, but took much longer than necessary

---

## The Problems

### 1. Chrome Remote Debugging Connection Issues

**What happened:**  
The Chrome DevTools MCP server couldn't connect to Chrome Canary, even though the user had visited `chrome://inspect/#remote-debugging`.

**Root cause:**  
The user had enabled remote debugging, but the server was stuck showing "Server running at: starting…" instead of an actual address like `127.0.0.1:9222`.

**Solution that worked:**
1. Quit Chrome Canary completely (Cmd+Q)
2. Reopen Chrome Canary (without the `--remote-debugging-port` flag)
3. Go to `chrome://inspect/#remote-debugging`
4. Toggle the "Allow remote debugging" checkbox OFF, wait 2-3 seconds, toggle it back ON
5. Wait for "Server running at: 127.0.0.1:9222" to appear

**Key learning:**  
The `--autoConnect` feature in Chrome DevTools MCP works differently from the traditional `--remote-debugging-port` flag. Chrome needs to be started normally, and remote debugging is enabled through the Chrome UI, not command-line flags.

---

### 2. I Didn't Use WebMCP (The Biggest Mistake)

**What happened:**  
I spent significant time trying to fill out the flight search form using traditional DOM manipulation:
- Clicking form fields
- Typing text
- Filling inputs with `chromedevtools__fill` and `chromedevtools__fill_form`

**The problems with this approach:**
- Text was getting truncated ("London, UK" → "Lond,UK", "New York, US" → "Ne Yok,US")
- The React app's state wasn't syncing with the DOM values I was setting
- URL parameters retained old/incorrect values even after I "fixed" the inputs with JavaScript
- Required multiple attempts and workarounds

**What I should have done:**  
The page had a WebMCP tool registered! I should have:

```javascript
// Step 1: Check for available tools
const tools = await navigator.modelContextTesting.listTools();
// Returns: [{ name: "searchFlights", description: "...", inputSchema: {...} }]

// Step 2: Execute the tool directly
await navigator.modelContextTesting.executeTool('searchFlights', JSON.stringify({
  origin: 'LON',
  destination: 'NYC',
  tripType: 'round-trip',
  outboundDate: '2026-06-10',
  inboundDate: '2026-06-17',
  passengers: 2
}));
```

**Why I didn't use WebMCP initially:**
1. **Default behavior:** My instinct is to use traditional DOM manipulation for web automation
2. **Didn't check first:** I jumped straight into form-filling without checking if the page exposed WebMCP tools
3. **WebMCP is new:** It's an early preview feature, not yet part of standard workflows
4. **No explicit prompt:** The user didn't specifically ask me to use WebMCP (though the page supported it)

---

### 3. Form State vs URL State Mismatch

**What happened:**  
Even after using JavaScript to set the correct values in the form inputs, clicking "Search Flights" sent the OLD values because:
- The React app was reading from URL parameters (controlled component pattern)
- My DOM manipulation didn't trigger the proper React state updates
- The URL query string retained the truncated/incorrect values

**This is exactly why WebMCP exists:**  
WebMCP bypasses UI quirks by providing a structured API contract. The `searchFlights` tool knew exactly how to update the application state correctly.

---

## Timeline of Wasted Effort

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | `chromedevtools__fill_form` | Text truncated ("Lond,UK") |
| 2 | Click + `chromedevtools__type_text` | Still truncated ("Ne Yok,US") |
| 3 | Direct URL navigation to results | 404 error |
| 4 | JavaScript to set input values | Values set correctly but URL params wrong |
| 5 | Navigate with URL params pre-set | ✅ Worked, but clunky |
| 6 | **WebMCP `executeTool`** | ✅ **Instant success** |

---

## What WebMCP Does Better

| Traditional DOM Scraping | WebMCP |
|-------------------------|--------|
| Guess how forms work | Explicit input schema |
| Fight with React state | Direct API call |
| Multiple click/type operations | Single tool execution |
| Fragile (UI changes break it) | Robust (contract-based) |
| Slow (multiple round-trips) | Fast (one call) |
| Error-prone | Validated inputs |

---

## How to Prompt AI Agents to Use WebMCP

If a page supports WebMCP, use these prompts:

```
"Use WebMCP to search for flights..."

"Check for WebMCP tools first, then use them"

"This page supports WebMCP - use the registered tools"

"Use the page's structured API, not form filling"

"Don't scrape the UI, use navigator.modelContextTesting"
```

---

## Checklist for Future WebMCP Sessions

### Before Starting
- [ ] Chrome Canary (v146+) is installed
- [ ] Chrome Canary is running
- [ ] `chrome://inspect/#remote-debugging` shows "Server running at: 127.0.0.1:XXXX"
- [ ] Chrome DevTools MCP server is configured with `--autoConnect` and `--channel=canary`

### When Automating a Page
- [ ] **FIRST:** Check if WebMCP tools are available:
  ```javascript
  const tools = await navigator.modelContextTesting.listTools();
  ```
- [ ] If tools exist, use `executeTool()` instead of DOM manipulation
- [ ] Pass arguments as a **JSON string** (not an object):
  ```javascript
  await navigator.modelContextTesting.executeTool('toolName', JSON.stringify({ ... }));
  ```

### If WebMCP Isn't Available
- [ ] Fall back to traditional DOM automation
- [ ] Consider suggesting the site implement WebMCP

---

## Key Takeaways

1. **Always check for WebMCP tools first** on sites that might support it
2. **WebMCP is the future** of AI agent web interaction - it replaces brittle screen-scraping with robust APIs
3. **Chrome remote debugging setup** with `--autoConnect` requires the Chrome UI toggle, not command-line flags
4. **The agent API is `navigator.modelContextTesting`**, not `navigator.modelContext` (that's for websites to register tools)
5. **Arguments must be JSON-stringified** when calling `executeTool()`

---

## References

- [WebMCP Early Preview Documentation](https://developer.chrome.com/docs/devtools/webmcp)
- [Chrome DevTools MCP Server](https://github.com/anthropics/anthropic-quickstarts/tree/main/chrome-devtools-mcp)
- [WebMCP Demo - Flight Search](https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/)

---

*This document was created after a debugging session where WebMCP would have saved 15+ minutes of troubleshooting DOM automation issues.*
