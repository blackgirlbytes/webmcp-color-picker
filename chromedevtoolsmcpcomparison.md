# Chrome DevTools MCP Server: On Its Own vs. as a Bridge to WebMCP

---

## Q: So it seems like I'm able to use the Chrome DevTools MCP server as a bridge to WebMCP or something like that?

Yes, that's exactly right! The Chrome DevTools extension gives you the ability to interact with web pages that support **WebMCP** — a browser-based API that lets AI agents call tools exposed by websites directly from the browser.

### The Flow

```
You (goose)
    → chromedevtools (evaluate_script)
        → navigator.modelContextTesting (WebMCP API in browser)
            → Website's exposed tools
```

### Key Points

1. **`navigator.modelContextTesting`** is the WebMCP agent API available on supported pages
   - `listTools()` — discovers what tools the page exposes
   - `executeTool(name, jsonStringifiedArgs)` — calls a tool on the page

2. **The bridge pattern** uses `chromedevtools__evaluate_script` to run JavaScript that calls the WebMCP API, and the results come back as JSON

### Example Usage

```javascript
// List available tools on the page
const tools = await navigator.modelContextTesting.listTools();

// Call a specific tool
const result = await navigator.modelContextTesting.executeTool(
  "toolName",
  JSON.stringify({ param: "value" })
);
```

---

## Q: Chrome DevTools MCP server on its own — how does it act? And then with WebMCP-enabled stuff — how does that change it? What's the difference?

### Chrome DevTools MCP Server (On Its Own)

This gives goose the ability to **control and inspect a browser** like a human developer would using DevTools:

- 🖱️ **Interact with pages** — click, fill forms, type, hover, drag
- 📸 **Observe pages** — take screenshots, read the DOM via snapshots (a11y tree)
- 🌐 **Navigate** — go to URLs, go back/forward, reload
- 🔍 **Debug** — read console logs, inspect network requests
- ⚡ **Run JavaScript** — execute arbitrary JS on the page via `evaluate_script`
- 📊 **Profile** — performance traces, memory heap snapshots

**Think of it as:** goose is acting like a **human user + developer** sitting at a browser. It can see the page, click things, and run JS in the console.

### Example Commands (DevTools Alone)

**Navigate to a page:**
```
chromedevtools__navigate_page(url: "https://example.com")
```

**Read what's on the page (DOM scraping):**
```
chromedevtools__take_snapshot()
```

**Click a button found in the snapshot:**
```
chromedevtools__click(uid: "btn-42")
```

**Fill out a form field:**
```
chromedevtools__fill(uid: "input-7", value: "hello world")
```

**Run arbitrary JS to extract data:**
```
chromedevtools__evaluate_script(
  function: "() => document.querySelector('#result').innerText"
)
```

**Check what network requests fired:**
```
chromedevtools__list_network_requests()
```

> 🔴 **Problem:** goose is guessing at the UI structure. It finds a button, clicks it, hopes it does what it thinks. If the page redesigns, uid references break.

---

### With WebMCP-Enabled Sites — What Changes

WebMCP adds a **second layer**: websites can now **expose structured tools** directly to AI agents via `navigator.modelContextTesting`.

**Without WebMCP:**
- goose interacts with the page **indirectly** — clicking buttons, reading text, scraping the DOM
- goose has to *figure out* what the page can do by looking at it
- Fragile — if the UI changes, automation breaks

**With WebMCP:**
- The **website explicitly tells goose** what tools it has (`listTools()`)
- goose calls those tools **directly** with structured inputs/outputs (`executeTool()`)
- No need to simulate a human clicking through UI
- Results come back as **clean JSON**, not scraped HTML

### Example Commands (DevTools + WebMCP)

**Discover what tools the page exposes:**
```
chromedevtools__evaluate_script(
  function: "async () => await navigator.modelContextTesting.listTools()"
)
```
Returns something like:
```json
[
  { "name": "search", "description": "Search for items", "inputSchema": { "query": "string" } },
  { "name": "addToCart", "description": "Add item to cart", "inputSchema": { "itemId": "string", "qty": "number" } }
]
```

**Call a tool directly — no clicking required:**
```
chromedevtools__evaluate_script(
  function: "async () => await navigator.modelContextTesting.executeTool(
    'search',
    JSON.stringify({ query: 'red sneakers' })
  )"
)
```
Returns clean JSON:
```json
{ "results": [{ "id": "123", "name": "Air Max Red", "price": 89.99 }] }
```

**Another tool call — add to cart:**
```
chromedevtools__evaluate_script(
  function: "async () => await navigator.modelContextTesting.executeTool(
    'addToCart',
    JSON.stringify({ itemId: '123', qty: 1 })
  )"
)
```

> ✅ **Benefit:** No scraping, no fragile uid clicking. The page *tells goose* its capabilities and goose calls them like an API.

---

### Side-by-Side Comparison

| Task | DevTools Alone | DevTools + WebMCP |
|---|---|---|
| **Find what page can do** | `take_snapshot()` → read DOM visually | `listTools()` → structured JSON list |
| **Search for something** | `fill(uid, "query")` → `click(submit-btn)` → `take_snapshot()` | `executeTool("search", '{"query":"..."}')` |
| **Get results** | Parse DOM text from snapshot | Clean JSON response |
| **Resilience to UI changes** | ❌ Breaks if uid changes | ✅ Tool API stays stable |
| **Know what inputs are valid** | ❌ Guess from HTML attributes | ✅ Defined in `inputSchema` |
| **Underlying mechanism** | Native MCP tools | `evaluate_script` → `navigator.modelContextTesting` |

---

## Q: What do you mean "I have to figure out what the page can do by looking at it" — do you mean a screenshot?

Yes, but more specifically through the **snapshot** (a11y tree) rather than a screenshot. Here's the distinction:

### The Two Ways goose "Looks" at a Page

**1. `take_screenshot()` — Visual**
Returns a **pixel image** of the page. goose can see it like a human would visually, but it's harder to extract structured info from. Good for visual debugging but not ideal for finding clickable elements.

**2. `take_snapshot()` — Structured DOM (what goose actually uses)**
Returns the **accessibility tree** — a structured text representation of every element on the page with unique IDs (`uid`). This is what goose uses to find things to interact with.

Example snapshot output:
```
button "Submit Order" [uid: btn-42]
input "Search" [uid: input-7]
link "Home" [uid: link-3]
heading "Product Results" [uid: h-1]
  text "Air Max Red - $89.99" [uid: txt-22]
```

### Why "Figuring Out" is the Problem

When goose takes a snapshot, it sees the elements — but has to **infer intent**:

- It sees a `button "Submit"` — but is that for a form? A search? A payment?
- It sees an `input` — what format does it expect? A date? A product ID? Free text?
- It sees 3 buttons — which one does what is actually needed?

goose is reading the UI **the same way a human reads a webpage** — making guesses based on labels and layout.

```
take_snapshot() →
  "I see a button labeled 'Go' next to an input...
   I'll assume that's a search bar and try clicking it"
```

vs. WebMCP:

```
listTools() →
  { name: "search", description: "Search the product catalog",
    inputSchema: { query: "string", category: "optional string" } }
```

No guessing. The page **explicitly documents itself** to goose.

### Analogy

| Method | Like... |
|---|---|
| `take_screenshot()` | Looking at a printed flyer |
| `take_snapshot()` | Reading the HTML source |
| `listTools()` (WebMCP) | Reading the API docs |

The screenshot/snapshot tell goose **what it looks like**. WebMCP tells goose **what it does and how to use it**.

---

## Q: Can you create two scenarios — give an idea so a person understands the difference?

### Meet Sally

---

### Scenario 1: Sally wants to fill out a contact form on a regular website

Sally asks goose: *"Fill out the contact form on this company's website and submit it."*

The site is a **normal website** — no WebMCP support. So goose uses **Chrome DevTools alone**:

1. goose navigates to the page
2. goose calls `take_snapshot()` to "read" the page — it finds a form with fields labeled "Name", "Email", "Message"
3. goose **infers** — *"that input near the label 'Name' is probably where I type the name"*
4. goose calls `fill(uid: "input-3", value: "Sally")`, `fill(uid: "input-4", value: "sally@email.com")` etc.
5. goose finds a button that looks like a submit button and calls `click(uid: "btn-7")`
6. goose takes another snapshot to check if a success message appeared

> goose is essentially **pretending to be a human user** — reading the page visually, guessing at what things do, and clicking through the UI. If the website redesigns their form and the uids change, goose would have to re-figure it all out.

---

### Scenario 2: Sally wants to search a product catalog, filter results, and add something to her cart

Sally asks goose: *"Find me red sneakers under $100 and add the best rated one to my cart."*

This site **supports WebMCP**. Sally's setup uses **Chrome DevTools as a bridge to WebMCP**:

- Chrome DevTools is still the foundation — it's what gives goose access to the browser at all
- But instead of scraping the UI, goose runs `evaluate_script` to reach into the page and call `navigator.modelContextTesting`
- This is the "bridge" moment — goose is using the browser like a tunnel to reach the website's AI-facing tool layer

Here's how goose behaves:

1. goose calls `evaluate_script` → `listTools()` — the site responds: *"I have tools: `searchProducts`, `filterByPrice`, `getReviews`, `addToCart`"*
2. goose calls `executeTool("searchProducts", { query: "red sneakers" })` — gets back clean JSON with results
3. goose calls `executeTool("filterByPrice", { max: 100 })` — narrows it down
4. goose calls `executeTool("getReviews", { itemId: "123" })` — finds the best rated one
5. goose calls `executeTool("addToCart", { itemId: "123", qty: 1 })` — done

> goose never had to look at the page visually, guess at button labels, or find uids. The website **told goose exactly what it could do and how**, and goose called those capabilities directly like an API. Chrome DevTools was the bridge that let goose reach that API from inside the browser.

---

### The Core Difference

| | Scenario 1 (Sally + Contact Form) | Scenario 2 (Sally + Shopping) |
|---|---|---|
| **Site type** | Regular website | WebMCP-enabled site |
| **How goose understands the page** | Reads DOM / snapshots, infers intent | Site declares its tools explicitly |
| **How goose acts** | Simulates a human clicking through UI | Calls structured tools like an API |
| **Fragility** | Breaks if UI changes | Stable — tool contract doesn't change with UI |
| **Chrome DevTools role** | The whole toolbox | The bridge to something deeper |
