# WebMCP Session Analysis: Why the Agent Failed to Use WebMCP Correctly

## Overview

This document analyzes two failed Goose sessions where the agent was asked to search for flights using WebMCP on the demo site `https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/`. Despite having a `.goosehints` file with WebMCP instructions, the agent failed to use the correct API.

## The User's Prompt

```
Search for flights from London to New York, June 10-17 2026, 2 passengers

https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/
```

## The Problem

The agent **never tried `navigator.modelContextTesting`**. Instead, it:

1. Found `navigator.modelContext` (the website-side API for registering tools)
2. Explored its methods (`clearContext`, `provideContext`, `registerTool`, `unregisterTool`)
3. Looked for non-existent methods like `tools()`, `callTool()`, `invokeTool()`
4. Searched for Chrome AI APIs (`self.ai`, `window.ai`)
5. Analyzed the JavaScript bundle to reverse-engineer how tools work
6. Never once called `navigator.modelContextTesting.listTools()`

## Evidence from Session Logs

### What the agent explored (wrong API):

```javascript
// Agent checked navigator.modelContext
{
  "hasModelContext": true,
  "prototypeKeys": ["clearContext", "provideContext", "registerTool", "unregisterTool", "constructor"]
}
```

### What the agent never tried (correct API):

```javascript
// This was NEVER attempted:
navigator.modelContextTesting.listTools()
navigator.modelContextTesting.executeTool("searchFlights", JSON.stringify({...}))
```

### Grep confirmation:

```bash
$ grep -i "modelContextTesting" session.json
modelContextTesting NOT FOUND in session
```

## The Two WebMCP APIs

| API | Purpose | Who Uses It |
|-----|---------|-------------|
| `navigator.modelContext` | Register tools on a website | Website developers |
| `navigator.modelContextTesting` | Discover and execute tools | AI agents |

The agent confused the website-side API with the agent-side API.

## The Original .goosehints File

```markdown
# WebMCP-Enabled Sites

These sites support WebMCP:
- googlechromelabs.github.io/webmcp-tools/*

When interacting with WebMCP-enabled websites (sites that expose tools via the WebMCP API):

## Discovery & Execution Pattern

```javascript
// 1. List available tools
const tools = await navigator.modelContextTesting.listTools();

// 2. Execute a tool (args must be JSON stringified)
const result = await navigator.modelContextTesting.executeTool("toolName", JSON.stringify({ param: value }));
```

## Key APIs

| API | Purpose |
|-----|---------|
| `navigator.modelContextTesting.listTools()` | Discover available tools and their schemas |
| `navigator.modelContextTesting.executeTool(name, jsonArgs)` | Execute a tool |
| `navigator.modelContext` | Website-side API (for registering tools, not for agents) |

## Workflow

1. Navigate to the WebMCP-enabled site
2. Call `listTools()` to see what's available and get the input schema
3. Call `executeTool()` with the appropriate parameters
4. Check the page for results

## Notes

- Tool arguments must be passed as `JSON.stringify({...})`, not as a plain object
- The `listTools()` response includes `inputSchema` with parameter types and descriptions
- WebMCP replaces screen-scraping with structured tool invocation
```

## Why the Hints Failed

The hints mention both APIs in a table, which may have caused confusion. The agent saw `navigator.modelContext` mentioned and latched onto it, ignoring `modelContextTesting`.

## Recommended Updated .goosehints File

```markdown
# WebMCP-Enabled Sites

These sites support WebMCP:
- googlechromelabs.github.io/webmcp-tools/*

## How to Use WebMCP (IMPORTANT)

On WebMCP sites, use `navigator.modelContextTesting` (NOT `navigator.modelContext`):

```javascript
// Step 1: List tools
const tools = await navigator.modelContextTesting.listTools();

// Step 2: Execute a tool
await navigator.modelContextTesting.executeTool("toolName", JSON.stringify({ param: value }));
```

Do NOT use `navigator.modelContext` - that's for websites to register tools, not for agents to call them.

The agent API is `navigator.modelContextTesting` with two methods:
- `listTools()` - returns available tools with their input schemas
- `executeTool(name, jsonStringifiedArgs)` - executes a tool
```

## Why Listing Known WebMCP Sites Matters

The agent has no way to automatically detect if a site is WebMCP-enabled. Without an explicit list of known WebMCP sites in the goosehints file, the agent might:

1. Not know to check for WebMCP tools at all
2. Default to screen-scraping instead of using the structured API
3. Waste time trying to figure out how to interact with the page

By maintaining a list like:

```markdown
# WebMCP-Enabled Sites

These sites support WebMCP:
- googlechromelabs.github.io/webmcp-tools/*
```

The agent can immediately recognize when it's on a WebMCP-enabled site and use the correct API pattern. As more sites adopt WebMCP, this list can be expanded.

## What the Correct Interaction Should Look Like

### Step 1: Navigate to the page
```javascript
// Tool call: chromedevtools__navigate_page
{ "url": "https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/" }
```

### Step 2: Discover available tools
```javascript
// Tool call: chromedevtools__evaluate_script
const tools = await navigator.modelContextTesting.listTools();
// Returns:
[
  {
    "name": "searchFlights",
    "description": "Searches for flights with the given parameters.",
    "inputSchema": "{\"type\":\"object\",\"properties\":{\"origin\":{\"type\":\"string\"},\"destination\":{\"type\":\"string\"},\"tripType\":{\"type\":\"string\",\"enum\":[\"one-way\",\"round-trip\"]},\"outboundDate\":{\"type\":\"string\"},\"inboundDate\":{\"type\":\"string\"},\"passengers\":{\"type\":\"number\"}},\"required\":[\"origin\",\"destination\",\"tripType\",\"outboundDate\",\"inboundDate\",\"passengers\"]}"
  },
  {
    "name": "listFlights",
    "description": "Returns all flights available.",
    "inputSchema": "{}"
  },
  {
    "name": "setFilters",
    "description": "Sets the filters for flights.",
    "inputSchema": "..."
  },
  {
    "name": "resetFilters",
    "description": "Resets all filters to their default values.",
    "inputSchema": "{}"
  }
]
```

### Step 3: Execute the search
```javascript
// Tool call: chromedevtools__evaluate_script
const result = await navigator.modelContextTesting.executeTool(
  "searchFlights",
  JSON.stringify({
    origin: "LON",
    destination: "NYC",
    tripType: "round-trip",
    outboundDate: "2026-06-10",
    inboundDate: "2026-06-17",
    passengers: 2
  })
);
// Returns: "A new flight search was started."
```

### Step 4: Verify results
The page navigates to the results page with flight listings.

## Total Tool Calls Required

**Ideal case: 3-4 tool calls**
1. Navigate to page
2. List tools (optional if you know the tool name)
3. Execute tool
4. Take snapshot to verify results

**What the agent did: 15+ tool calls** exploring wrong APIs, analyzing JavaScript bundles, and searching for non-existent methods.

## Key Takeaways

1. **`navigator.modelContextTesting`** is the agent API - use `listTools()` and `executeTool()`
2. **`navigator.modelContext`** is the website API - agents should NOT use this
3. The goosehints file needs to **explicitly warn against using the wrong API**
4. Arguments to `executeTool()` must be **JSON stringified**
5. WebMCP eliminates the need to reverse-engineer websites - just call `listTools()` and use what's available

## Session Details

- **Session 1 (flight.zip)**: Chrome connection issues, agent couldn't connect to Chrome Beta
- **Session 2 (flight2.zip)**: Agent connected to Chrome Canary but explored wrong APIs for 51 messages without ever trying `modelContextTesting`
- **Model**: anthropic/claude-sonnet-4.6
- **Provider**: openrouter
