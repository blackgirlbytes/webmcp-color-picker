# 🍜 Midnight Eats — WebMCP Food Demo: How It All Works

A deep dive into how an AI agent (goose) interacted with the **Midnight Eats** food delivery demo app using **WebMCP** — adding Japchae and Korean Fried Chicken to a cart without clicking a single button.

---

## What is WebMCP?

WebMCP is a **browser-native protocol** (behind `chrome://flags/#enable-webmcp-testing`) that lets a **webpage register tools directly in the browser**, and lets an **AI agent call those tools via JavaScript** — without any server, API key, or external MCP server. Everything lives in the page itself.

There are **two APIs** in play:

| API | Who uses it | Purpose |
|---|---|---|
| `navigator.modelContext` | The **website** | Registers tools the agent can call |
| `navigator.modelContextTesting` | The **agent** | Lists and executes those tools |

---

## 🗺️ The Exact Tool Call Chain

Here's exactly what happened, step by step:

### Step 1 — Navigate
```
navigate_page → file:///...food-app.html
```
The page loaded and its JavaScript ran, executing:
```js
navigator.modelContext.registerTool({ name: "search_restaurants", ... })
navigator.modelContext.registerTool({ name: "get_menu", ... })
navigator.modelContext.registerTool({ name: "add_to_cart", ... })
// ...6 more tools
```
At this point **9 tools were silently registered in Chrome's browser layer** — the page "published" its capabilities.

---

### Step 2 — Take Snapshot
```
take_snapshot → a11y tree
```
The agent read the page visually to understand the UI (Seoul Kitchen, cart empty, etc.). But to actually *act*, it needed to go through WebMCP, not click buttons.

---

### Step 3 — `listTools()` — Discovery
```js
navigator.modelContextTesting.listTools()
```
This returned all **9 registered tools** with their full JSON schemas — names, descriptions, parameter types, required fields. This is equivalent to MCP's `tools/list`. The agent could see:
- `get_menu` requires `restaurant_id`
- `add_to_cart` requires `restaurant_id` + `item_id`
- `checkout` is a **declarative form tool** (more on this below)

---

### Step 4 — `get_menu("seoul_kitchen")` — Lookup
```js
navigator.modelContextTesting.executeTool("get_menu", JSON.stringify({ restaurant_id: "seoul_kitchen" }))
```
This called the `execute()` function registered by the page, which:
1. Found Seoul Kitchen in the `RESTAURANTS` data array
2. Called `showMenu("seoul_kitchen")` → **navigated the UI** to that restaurant's page
3. Returned a JSON payload with all 6 menu items and their IDs

From the response the agent extracted:
- `japchae` → id: `"japchae"`, $12.00
- Korean Fried Chicken → id: `"kfc_korean"`, $13.50

---

### Step 5 — Two `add_to_cart` calls
```js
executeTool("add_to_cart", { restaurant_id: "seoul_kitchen", item_id: "japchae" })
executeTool("add_to_cart", { restaurant_id: "seoul_kitchen", item_id: "kfc_korean" })
```
Each call triggered the page's `addToCart()` function which:
1. Mutated the `state.cart` array
2. Called `updateCartUI()` → re-rendered the cart drawer
3. Called `pulseBadge()` → animated the cart badge
4. Called `renderMenu()` → updated the ✓ ×1 button state on the menu items
5. Called `agentLog()` → updated the bottom status bar

Each returned a success payload confirming the item name, price, and new cart totals.

**Final cart:**
- 🍜 Japchae — $12.00
- 🍗 Korean Fried Chicken — $13.50
- **Total: $28.99** (+ $3.49 delivery)

---

## 🔌 The Two Tool Registration Styles

### 1. Imperative Tools (8 of them)

Registered via JavaScript:
```js
navigator.modelContext.registerTool({
  name: "add_to_cart",
  description: "Add a menu item to the cart. Get restaurant_id and item_id from get_menu first.",
  inputSchema: {
    type: "object",
    properties: {
      restaurant_id: { type: "string", description: "Restaurant ID the item belongs to" },
      item_id: { type: "string", description: "Menu item ID to add" },
      quantity: { type: "number", description: "How many to add (default 1)" },
      special_instructions: { type: "string", description: "Optional: 'no onions', 'extra spicy', etc." }
    },
    required: ["restaurant_id", "item_id"]
  },
  execute: ({ restaurant_id, item_id, quantity, special_instructions }) => {
    // runs in the page context, mutates state, updates DOM
    addToCart(restaurant_id, item_id, quantity || 1, special_instructions || '');
    return { content: [{ type: "text", text: JSON.stringify(result) }] }
  }
});
```

The `execute()` function runs **synchronously in the page's JavaScript context** — it has full access to `state`, `RESTAURANTS`, and the DOM. The return format is **MCP-compatible**: `{ content: [{ type: "text", text: "..." }] }`.

**All 8 imperative tools:**

| Tool | Description |
|---|---|
| `search_restaurants` | Search by cuisine, name, or dietary tag |
| `get_menu` | Get full menu for a restaurant by ID; also navigates the UI |
| `add_to_cart` | Add a menu item to the cart |
| `remove_from_cart` | Remove one quantity of an item |
| `get_cart` | Read-only view of current cart contents and totals |
| `clear_cart` | Empty the cart and reset promo codes |
| `apply_promo_code` | Apply WELCOME20, FREEDELIVERY, or SAVE5 |
| `get_order_status` | Check status of current order |

---

### 2. Declarative Tool (1 — the checkout form)

Registered via **pure HTML attributes** on a `<form>` — no JavaScript required:

```html
<form
  toolname="checkout"
  tooldescription="Place a food delivery order and complete checkout. Requires a delivery address.
                   Use this tool AFTER items have been added to the cart using the add_to_cart tool."
>
  <input
    name="delivery_address"
    toolparamdescription="Full street delivery address including apartment or unit number"
  />
  <textarea
    name="delivery_instructions"
    toolparamdescription="Optional delivery instructions for the driver"
  ></textarea>
  <select name="tip_amount" toolparamdescription="Dollar tip amount for the delivery driver">
    <option value="0">No tip</option>
    <option value="5" selected>$5.00</option>
    ...
  </select>
  <select name="payment_method" toolparamdescription="Payment method to charge.">
    <option value="visa_4242">Visa ···4242</option>
    ...
  </select>
  <button type="submit">Place Order</button>
</form>
```

Chrome's WebMCP runtime **reads the DOM** to construct the tool schema automatically. When an agent calls it, Chrome **auto-fills the form fields** and programmatically submits it. The submit handler detects `e.agentInvoked === true` to distinguish agent vs. human submissions, and calls `e.respondWith(Promise)` to send back the result:

```js
$('#checkout-form').addEventListener('submit', (e) => {
  e.preventDefault();
  // ... build order object ...
  if (e.agentInvoked) {
    e.respondWith(Promise.resolve({ success: true, message: `Order ${order.id} placed`, order }));
  }
});
```

There are also special CSS pseudo-classes for visual feedback:
```css
/* Chrome highlights the active form/button when agent is using it */
form:tool-form-active   { outline: orange dashed 2px; }
button:tool-submit-active { outline: green dashed 2px; }
```

---

## 📡 The Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        goose (agent)                        │
│                                                             │
│  evaluate_script() ──────────────────────────────────────┐  │
│                                                          │  │
└──────────────────────────────────────────────────────────┼──┘
                                                           │
                          Chrome DevTools Protocol (CDP)   │
                                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Browser                           │
│                                                             │
│  navigator.modelContextTesting.executeTool(...)             │
│         │                                                   │
│         ▼  (WebMCP internal routing)                        │
│  navigator.modelContext  ←── registered tools               │
│         │                                                   │
│         ▼                                                   │
│  tool.execute({ restaurant_id, item_id })                   │
│         │                                                   │
│         ▼                                                   │
│  Page JavaScript: state.cart, DOM updates, UI render        │
│         │                                                   │
│         ▼                                                   │
│  return { content: [{ type: "text", text: JSON }] }         │
│         │                                                   │
│         ▼  (CDP response back to agent)                     │
└─────────────────────────────────────────────────────────────┘
```

There is **no network involved** — no HTTP calls to a backend API. The entire interaction happens inside Chrome's process via CDP. The data (`RESTAURANTS`, `state`) lives in the page's JS memory.

---

## 🔑 Key Architectural Insights

| Aspect | Detail |
|---|---|
| **Transport** | Chrome DevTools Protocol (CDP) via `evaluate_script` |
| **Tool registry** | Chrome's WebMCP layer (between page JS and `modelContextTesting`) |
| **State** | Entirely in-page JS (`state` object) — no server |
| **Schema format** | JSON Schema (same as standard MCP) |
| **Response format** | MCP content blocks: `{ content: [{ type, text }] }` |
| **Side effects** | Tools mutate the live DOM — UI updates happen in real-time |
| **Agent events** | `toolactivated` / `toolcancel` custom events fire on `window` |

---

## 🌟 Why This Is Elegant

The page author only had to write **standard HTML + JS**. The WebMCP runtime in Chrome bridged it to the agent automatically — no SDK, no server, no API keys.

It's MCP, but *in the browser*:

- **Websites become agentic interfaces** just by registering tools
- **Agents can drive any WebMCP-enabled page** without scraping or clicking
- **Declarative tools from HTML** means even non-JS-heavy pages can expose capabilities
- **Real-time UI feedback** — the cart badge pulsed, buttons updated, the menu re-rendered as the agent acted

---

## Requirements

- Chrome 146+
- `chrome://flags/#enable-webmcp-testing` enabled
- Model Context Tool Inspector Extension (optional, for debugging)

---

*Generated from a live goose agent session on 2026-02-26*
