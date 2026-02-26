// Shared function to change the color
function setBackgroundColor(color, fromAI = false) {
  document.body.style.backgroundColor = color;
  document.getElementById("colorName").textContent = color;
  
  // Sync the color picker if it's a valid hex
  const colorPicker = document.getElementById("colorPicker");
  if (colorPicker && color.startsWith("#") && color.length === 7) {
    colorPicker.value = color;
  }

  // Show/hide AI badge
  const aiBadge = document.getElementById("aiBadge");
  if (aiBadge) {
    if (fromAI) {
      aiBadge.classList.add("show");
      // Hide after 3 seconds
      setTimeout(() => aiBadge.classList.remove("show"), 3000);
    } else {
      aiBadge.classList.remove("show");
    }
  }
}

// Manual color controls
document.addEventListener("DOMContentLoaded", () => {
  const colorPicker = document.getElementById("colorPicker");
  const colorText = document.getElementById("colorText");
  const applyButton = document.getElementById("applyColor");

  // Color picker change
  if (colorPicker) {
    colorPicker.addEventListener("input", (e) => {
      setBackgroundColor(e.target.value, false);
    });
  }

  // Apply button click
  if (applyButton) {
    applyButton.addEventListener("click", () => {
      const color = colorText.value.trim();
      if (color) {
        setBackgroundColor(color, false);
        colorText.value = "";
      }
    });
  }

  // Enter key in text input
  if (colorText) {
    colorText.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const color = colorText.value.trim();
        if (color) {
          setBackgroundColor(color, false);
          colorText.value = "";
        }
      }
    });
  }
});

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
      setBackgroundColor(color, true); // true = from AI

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
