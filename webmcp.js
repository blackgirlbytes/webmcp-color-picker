// WebMCP Color Picker Tool Registration

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
      // Set the background color
      document.body.style.backgroundColor = color;

      // Update the display
      document.getElementById("colorName").textContent = color;

      // Return success message
      return {
        content: [{
          type: "text",
          text: `Background color changed to ${color}`
        }]
      };
    }
  });

  console.log("✅ WebMCP tool 'set_background_color' registered!");
} else {
  console.log("⚠️ WebMCP not available - enable chrome://flags/#enable-webmcp-testing");
}
