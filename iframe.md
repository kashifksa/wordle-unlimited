# WordPress Iframe Embedding Guide

To embed the **Wordle Unlimited** game seamlessly on `todaywordlehint.com` without double scrollbars or overflow layout issues on mobile devices, use the code block below.

Paste this into a **Custom HTML** block in your WordPress editor (or theme page layout builder):

```html
<!-- The Game Iframe -->
<iframe id="wordle-game-frame" 
        src="https://todaywordlehint.com/WordleUnlimited/" 
        style="width: 100%; border: none; overflow: hidden; transition: height 0.2s ease;" 
        scrolling="no">
</iframe>

<!-- The Responsive Resize Script -->
<script>
    window.addEventListener('message', function(event) {
        // Ensure the message is coming from our game resize trigger
        if (event.data && event.data.type === 'wordle-resize') {
            const iframe = document.getElementById('wordle-game-frame');
            if (iframe) {
                // Set the iframe height dynamically to match the content height
                iframe.style.height = event.data.height + 'px';
            }
        }
    });
</script>
```

## How It Works:
1. The **Wordle Unlimited** game automatically detects if it is running inside an iframe.
2. In embedded mode, it hides the giant header logo and reduces the header footprint to save vertical space.
3. Every time the layout changes (modals pop up, grid renders, hint banner displays), the game sends a `postMessage` event named `wordle-resize` containing its current document height.
4. The JavaScript listener in WordPress catches this event and resizes the iframe height dynamically.
